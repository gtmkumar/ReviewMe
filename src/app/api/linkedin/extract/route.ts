import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RequestLogService, CreditService, ServiceType } from '@/lib/services';
import { getDbManager } from '@/lib/database';

interface LinkedInProfile {
  name: string;
  headline: string;
  location: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    field: string;
    years: string;
  }>;
  skills: string[];
  connections: number;
  profileUrl: string;
  imageUrl?: string;
}

interface LinkedInExtractRequest {
  username: string;
}

interface LinkedInExtractResponse {
  success: boolean;
  data?: {
    profile: LinkedInProfile;
    username: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  error?: string;
  requestId?: string;
  creditsUsed?: number;
  remainingCredits?: number;
}

// Calculate LinkedIn profile score
function calculateLinkedInScore(profile: LinkedInProfile): number {
  let score = 0;
  
  // Profile completeness (30 points)
  if (profile.name) score += 5;
  if (profile.headline) score += 5;
  if (profile.location) score += 3;
  if (profile.summary && profile.summary.length > 50) score += 10;
  if (profile.imageUrl) score += 7;
  
  // Experience (25 points)
  if (profile.experience.length > 0) score += 10;
  if (profile.experience.length >= 2) score += 5;
  if (profile.experience.some(exp => exp.description && exp.description.length > 50)) score += 10;
  
  // Education (15 points)
  if (profile.education.length > 0) score += 10;
  if (profile.education.length >= 2) score += 5;
  
  // Skills (15 points)
  if (profile.skills.length >= 5) score += 8;
  if (profile.skills.length >= 10) score += 7;
  
  // Network (15 points)
  if (profile.connections >= 50) score += 5;
  if (profile.connections >= 500) score += 10;
  
  return Math.min(score, 100);
}

// Get profile strengths
function getProfileStrengths(profile: LinkedInProfile): string[] {
  const strengths = [];
  if (profile.headline) strengths.push('Professional headline');
  if (profile.summary && profile.summary.length > 50) strengths.push('Comprehensive summary');
  if (profile.experience.length >= 2) strengths.push('Multiple work experiences');
  if (profile.education.length > 0) strengths.push('Education background provided');
  if (profile.skills.length >= 5) strengths.push('Diverse skill set');
  if (profile.connections >= 100) strengths.push('Strong professional network');
  return strengths;
}

// Get profile weaknesses
function getProfileWeaknesses(profile: LinkedInProfile): string[] {
  const weaknesses = [];
  if (!profile.headline) weaknesses.push('Missing professional headline');
  if (!profile.summary || profile.summary.length < 50) weaknesses.push('Incomplete or missing summary');
  if (profile.experience.length < 2) weaknesses.push('Limited work experience details');
  if (profile.skills.length < 5) weaknesses.push('Few skills listed');
  if (profile.connections < 50) weaknesses.push('Small professional network');
  if (!profile.location) weaknesses.push('Location not specified');
  return weaknesses;
}

// Get profile suggestions
function getProfileSuggestions(profile: LinkedInProfile): string[] {
  const suggestions = [];
  if (!profile.headline) suggestions.push('Add a compelling professional headline that highlights your expertise');
  if (!profile.summary || profile.summary.length < 50) suggestions.push('Write a detailed summary showcasing your professional achievements');
  if (profile.experience.length < 2) suggestions.push('Add more work experience details with specific accomplishments');
  if (profile.skills.length < 10) suggestions.push('Expand your skills section to include more relevant competencies');
  if (profile.connections < 100) suggestions.push('Build your professional network by connecting with colleagues and industry professionals');
  suggestions.push('Keep your profile updated with recent achievements and experiences');
  return suggestions;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await request.json() as LinkedInExtractRequest;
    const { username } = body;

    if (!username?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'LinkedIn username is required'
      }, { status: 400 });
    }

    const userId = session.user.id;
    
    // Check if user has enough credits BEFORE making API call
    const userCredits = await CreditService.getUserCredits(userId);
    const requiredCredits = 15; // LinkedIn service cost
    
    if (userCredits < requiredCredits) {
      return NextResponse.json({
        success: false,
        error: `Insufficient credits. You need ${requiredCredits} credits but only have ${userCredits}.`
      }, { status: 400 });
    }

    const startTime = Date.now();

    try {
      // Call the LinkedIn extraction API FIRST (before deducting credits)
      const response = await fetch(`https://us-central1-ez4cast.cloudfunctions.net/linkedinAutoComplete-autoComplete?=&search=${encodeURIComponent(username.trim())}`, {
        method: 'GET',
        headers: {
          'accept': '*/*',
          'accept-language': 'en-US,en;q=0.9',
          'origin': 'https://redactai.io',
          'priority': 'u=1, i',
          'referer': 'https://redactai.io/',
          'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'cross-site',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to extract profile data from LinkedIn API');
      }

      const data = await response.json();
      
      // Check if the API call was successful
      if (!data.success || data.success !== 1 || !data.results || data.results.length === 0) {
        throw new Error('No profile data found or API request failed');
      }

      // Get the first result from the results array
      const profileData = data.results[0];
      
      // Transform the API response to our format
      const extractedProfile: LinkedInProfile = {
        name: profileData.name || username,
        headline: profileData.sub_title || profileData.title || '',
        location: profileData.location || '',
        summary: '', // API doesn't provide summary, will be empty
        experience: profileData.company_name ? [{
          title: profileData.company_position || 'Current Position',
          company: profileData.company_name,
          duration: 'Current',
          description: profileData.sub_title || ''
        }] : [],
        education: profileData.education ? profileData.education.map((edu: any) => ({
          school: edu.school_name || '',
          degree: edu.degree_name || '',
          field: edu.field_of_study || '',
          years: '' // API doesn't provide years
        })) : [],
        skills: profileData.skills || [],
        connections: profileData.followers_count || 0,
        profileUrl: `https://linkedin.com/in/${profileData.username || username}`,
        imageUrl: profileData.image
      };

      // ONLY deduct credits AFTER successful API response
      const creditCheck = await CreditService.checkAndDeductCredits(
        userId,
        'linkedin' as ServiceType,
        { username: username.trim(), extractedData: true, profileId: profileData.id }
      );

      if (!creditCheck.success) {
        // This shouldn't happen often since we already got data, but handle gracefully
        console.error('Credit deduction failed after successful API call:', creditCheck.error);
        return NextResponse.json({
          success: false,
          error: 'Credit deduction failed. Please contact support.'
        }, { status: 500 });
      }

      const processingTime = Date.now() - startTime;

      // Calculate analysis results
      const score = calculateLinkedInScore(extractedProfile);
      const strengths = getProfileStrengths(extractedProfile);
      const weaknesses = getProfileWeaknesses(extractedProfile);
      const suggestions = getProfileSuggestions(extractedProfile);

      const responseData = {
        profile: extractedProfile,
        username: username.trim(),
        score,
        strengths,
        weaknesses,
        suggestions
      };

      // Update request status to completed
      await RequestLogService.updateRequestStatus(
        creditCheck.requestId!,
        'completed'
      );

      // Log successful response with complete data to history
      await RequestLogService.logResponse(
        userId,
        creditCheck.requestId!,
        'linkedin' as ServiceType,
        responseData,
        {
          score,
          strengths,
          weaknesses,
          suggestions,
          profileCompleteness: {
            hasHeadline: !!extractedProfile.headline,
            hasSummary: !!(extractedProfile.summary && extractedProfile.summary.length > 50),
            experienceCount: extractedProfile.experience.length,
            educationCount: extractedProfile.education.length,
            skillsCount: extractedProfile.skills.length,
            connections: extractedProfile.connections,
            hasImage: !!extractedProfile.imageUrl,
            industry: profileData.industry || ''
          }
        },
        processingTime
      );

      // SAVE PROFILE DATA TO LINKEDIN_PROFILES COLLECTION for future use
      const db = getDbManager(process.env.MONGODB_URI!);
      await db.connect();
      const database = await db.getDb();
      const linkedinProfilesCollection = database.collection('linkedin_profiles');
      
      // Upsert the profile data (update if exists, create if not)
      await linkedinProfilesCollection.updateOne(
        { 
          userId: new (await import('mongodb')).ObjectId(userId),
          username: profileData.username || username.trim()
        },
        {
          $set: {
            profileData: extractedProfile,
            rawApiResponse: profileData,
            analysisResults: {
              score,
              strengths,
              weaknesses,
              suggestions
            },
            lastUpdated: new Date(),
            requestId: creditCheck.requestId
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        data: responseData,
        requestId: creditCheck.requestId,
        creditsUsed: creditCheck.creditsDeducted,
        remainingCredits: creditCheck.remainingCredits
      } as LinkedInExtractResponse);

    } catch (apiError) {
      // API call failed, no credits were deducted, so just return error
      console.error('LinkedIn extraction API failed:', apiError);
      return NextResponse.json({
        success: false,
        error: apiError instanceof Error ? apiError.message : 'Profile extraction failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('LinkedIn extract endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const userId = session.user.id;
    const history = await RequestLogService.getUserRequestHistory(
      userId, 
      'linkedin' as ServiceType, 
      limit
    );

    return NextResponse.json({ 
      success: true, 
      history 
    });
  } catch (error) {
    console.error('Error getting LinkedIn extraction history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}