import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RequestLogService, CreditService, ServiceType } from '@/lib/services';

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

    // Check and deduct credits using the proper service
    const creditCheck = await CreditService.checkAndDeductCredits(
      userId,
      'linkedin' as ServiceType,
      { username: username.trim(), extractedData: true }
    );

    if (!creditCheck.success) {
      return NextResponse.json({
        success: false,
        error: creditCheck.error
      }, { status: 400 });
    }

    const startTime = Date.now();

    try {
      // Call the LinkedIn extraction API
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
      
      // Transform the API response to our format
      const extractedProfile: LinkedInProfile = {
        name: data.name || data.fullName || username,
        headline: data.headline || data.title || '',
        location: data.location || data.geoLocation || '',
        summary: data.summary || data.description || data.about || '',
        experience: data.experience ? data.experience.map((exp: any) => ({
          title: exp.title || exp.position || '',
          company: exp.company || exp.companyName || '',
          duration: exp.duration || exp.period || '',
          description: exp.description || ''
        })) : [],
        education: data.education ? data.education.map((edu: any) => ({
          school: edu.school || edu.institution || '',
          degree: edu.degree || '',
          field: edu.field || edu.fieldOfStudy || '',
          years: edu.years || edu.period || ''
        })) : [],
        skills: data.skills || [],
        connections: data.connectionsCount || data.connections || 0,
        profileUrl: data.linkedInUrl || data.url || `https://linkedin.com/in/${username}`,
        imageUrl: data.profilePicture || data.imageUrl || data.avatar
      };

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
            connections: extractedProfile.connections
          }
        },
        processingTime
      );

      return NextResponse.json({
        success: true,
        data: responseData,
        requestId: creditCheck.requestId,
        creditsUsed: creditCheck.creditsDeducted,
        remainingCredits: creditCheck.remainingCredits
      } as LinkedInExtractResponse);

    } catch (apiError) {
      // Update request status on API failure
      await RequestLogService.updateRequestStatus(
        creditCheck.requestId!,
        'failed',
        apiError instanceof Error ? apiError.message : 'LinkedIn extraction API call failed'
      );

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