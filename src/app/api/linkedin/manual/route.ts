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

interface ManualData {
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
  skills: string;
  connections: number;
}

interface LinkedInManualRequest {
  manualData: ManualData;
}

interface LinkedInManualResponse {
  success: boolean;
  data?: {
    profile: LinkedInProfile;
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

    const body = await request.json() as LinkedInManualRequest;
    const { manualData } = body;

    if (!manualData?.name?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Name is required for manual entry'
      }, { status: 400 });
    }

    const userId = session.user.id;

    // Check and deduct credits using the proper service
    const creditCheck = await CreditService.checkAndDeductCredits(
      userId,
      'linkedin' as ServiceType,
      { type: 'manual-entry', name: manualData.name.trim() }
    );

    if (!creditCheck.success) {
      return NextResponse.json({
        success: false,
        error: creditCheck.error
      }, { status: 400 });
    }

    const startTime = Date.now();

    try {
      // Process manual data into LinkedInProfile format
      const manualProfile: LinkedInProfile = {
        name: manualData.name,
        headline: manualData.headline,
        location: manualData.location,
        summary: manualData.summary,
        experience: manualData.experience.filter(exp => exp.title && exp.company),
        education: manualData.education.filter(edu => edu.school && edu.degree),
        skills: manualData.skills.split(',').map(skill => skill.trim()).filter(skill => skill),
        connections: manualData.connections,
        profileUrl: 'manual-entry'
      };

      const processingTime = Date.now() - startTime;

      // Calculate analysis results
      const score = calculateLinkedInScore(manualProfile);
      const strengths = getProfileStrengths(manualProfile);
      const weaknesses = getProfileWeaknesses(manualProfile);
      const suggestions = getProfileSuggestions(manualProfile);

      const responseData = {
        profile: manualProfile,
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
            hasHeadline: !!manualProfile.headline,
            hasSummary: !!(manualProfile.summary && manualProfile.summary.length > 50),
            experienceCount: manualProfile.experience.length,
            educationCount: manualProfile.education.length,
            skillsCount: manualProfile.skills.length,
            connections: manualProfile.connections
          },
          entryType: 'manual'
        },
        processingTime
      );

      return NextResponse.json({
        success: true,
        data: responseData,
        requestId: creditCheck.requestId,
        creditsUsed: creditCheck.creditsDeducted,
        remainingCredits: creditCheck.remainingCredits
      } as LinkedInManualResponse);

    } catch (processingError) {
      // Update request status on failure
      await RequestLogService.updateRequestStatus(
        creditCheck.requestId!,
        'failed',
        processingError instanceof Error ? processingError.message : 'Manual entry processing failed'
      );

      return NextResponse.json({
        success: false,
        error: processingError instanceof Error ? processingError.message : 'Profile processing failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('LinkedIn manual endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}