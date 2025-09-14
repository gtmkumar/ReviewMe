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

interface LinkedInMockRequest {
  profileUrl: string;
}

interface LinkedInMockResponse {
  success: boolean;
  data?: {
    profile: LinkedInProfile;
    profileUrl: string;
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

    const body = await request.json() as LinkedInMockRequest;
    const { profileUrl } = body;

    if (!profileUrl?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'LinkedIn profile URL is required'
      }, { status: 400 });
    }

    const userId = session.user.id;

    // Check and deduct credits using the proper service
    const creditCheck = await CreditService.checkAndDeductCredits(
      userId,
      'linkedin' as ServiceType,
      { profileUrl: profileUrl.trim(), mockAnalysis: true }
    );

    if (!creditCheck.success) {
      return NextResponse.json({
        success: false,
        error: creditCheck.error
      }, { status: 400 });
    }

    const startTime = Date.now();

    try {
      // Simulate API delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract username from URL for mock data generation
      const username = profileUrl.split('/in/')[1]?.replace('/', '') || 'user';
      
      // Generate mock profile data based on URL
      const mockProfile: LinkedInProfile = {
        name: 'John Doe',
        headline: 'Senior Software Engineer at Tech Company',
        location: 'San Francisco, CA',
        summary: 'Passionate software engineer with 5+ years of experience in full-stack development. Expertise in React, Node.js, and cloud technologies.',
        experience: [
          {
            title: 'Senior Software Engineer',
            company: 'Tech Company',
            duration: 'Jan 2022 - Present',
            description: 'Lead development of scalable web applications using React and Node.js. Mentored junior developers and improved system performance by 40%.'
          },
          {
            title: 'Software Engineer',
            company: 'Startup Inc',
            duration: 'Jun 2019 - Dec 2021',
            description: 'Developed full-stack applications and RESTful APIs. Collaborated with cross-functional teams to deliver high-quality software solutions.'
          }
        ],
        education: [
          {
            school: 'University of Technology',
            degree: 'Bachelor of Science',
            field: 'Computer Science',
            years: '2015 - 2019'
          }
        ],
        skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'MongoDB', 'PostgreSQL'],
        connections: 500,
        profileUrl: profileUrl.trim(),
        imageUrl: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`
      };

      const processingTime = Date.now() - startTime;

      // Calculate analysis results
      const score = calculateLinkedInScore(mockProfile);
      const strengths = getProfileStrengths(mockProfile);
      const weaknesses = getProfileWeaknesses(mockProfile);
      const suggestions = getProfileSuggestions(mockProfile);

      const responseData = {
        profile: mockProfile,
        profileUrl: profileUrl.trim(),
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
            hasHeadline: !!mockProfile.headline,
            hasSummary: !!(mockProfile.summary && mockProfile.summary.length > 50),
            experienceCount: mockProfile.experience.length,
            educationCount: mockProfile.education.length,
            skillsCount: mockProfile.skills.length,
            connections: mockProfile.connections
          },
          mockAnalysis: true // Flag to indicate this was a mock analysis
        },
        processingTime
      );

      return NextResponse.json({
        success: true,
        data: responseData,
        requestId: creditCheck.requestId,
        creditsUsed: creditCheck.creditsDeducted,
        remainingCredits: creditCheck.remainingCredits
      } as LinkedInMockResponse);

    } catch (apiError) {
      // Update request status on failure
      await RequestLogService.updateRequestStatus(
        creditCheck.requestId!,
        'failed',
        apiError instanceof Error ? apiError.message : 'Mock analysis failed'
      );

      return NextResponse.json({
        success: false,
        error: apiError instanceof Error ? apiError.message : 'Profile analysis failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('LinkedIn mock endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}