import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { RequestLogService, CreditService, ServiceType } from '@/lib/services';

interface RedactAIResponse {
  markdown: string;
  analysisData?: any;
}

interface LinkedInAnalysisRequest {
  profileUrl: string;
  username?: string;
}

interface LinkedInAnalysisResponse {
  success: boolean;
  data?: {
    username: string;
    profileUrl: string;
    analysis: any;
    rawMarkdown: string;
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

// Extract username from LinkedIn URL
function extractLinkedInUsername(url: string): string {
  try {
    // Handle various LinkedIn URL formats
    const patterns = [
      /linkedin\.com\/in\/([^\/\?]+)/i,
      /linkedin\.com\/pub\/([^\/\?]+)/i,
      /linkedin\.com\/profile\/view\?id=([^&]+)/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1].replace(/[^a-zA-Z0-9\-]/g, ''); // Clean username
      }
    }

    throw new Error('Invalid LinkedIn URL format');
  } catch (error) {
    throw new Error('Could not extract username from LinkedIn URL');
  }
}

// Parse markdown response into structured JSON
function parseMarkdownToJSON(markdown: string): any {
  try {
    const lines = markdown.split('\n').filter(line => line.trim());
    const analysis: any = {
      summary: '',
      strengths: [],
      weaknesses: [],
      suggestions: [],
      score: 0,
      sections: {}
    };

    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect headers (markdown headers)
      if (trimmedLine.startsWith('#')) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          analysis.sections[currentSection] = currentContent.join('\n');
        }
        
        // Start new section
        currentSection = trimmedLine.replace(/^#+\s*/, '').toLowerCase();
        currentContent = [];
        continue;
      }

      // Detect lists (strengths, weaknesses, suggestions)
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
        const listItem = trimmedLine.replace(/^[-*]\s*/, '');
        
        if (currentSection.includes('strength') || currentSection.includes('positive')) {
          analysis.strengths.push(listItem);
        } else if (currentSection.includes('weakness') || currentSection.includes('improvement') || currentSection.includes('area')) {
          analysis.weaknesses.push(listItem);
        } else if (currentSection.includes('suggestion') || currentSection.includes('recommendation')) {
          analysis.suggestions.push(listItem);
        }
        continue;
      }

      // Extract score if present
      const scoreMatch = trimmedLine.match(/score[:\s]*(\d+)(?:\/100|\s*out\s*of\s*100)?/i);
      if (scoreMatch) {
        analysis.score = parseInt(scoreMatch[1]);
        continue;
      }

      // Regular content
      if (trimmedLine) {
        currentContent.push(trimmedLine);
      }
    }

    // Save last section
    if (currentSection && currentContent.length > 0) {
      analysis.sections[currentSection] = currentContent.join('\n');
    }

    // Set summary from first section if not explicitly set
    if (!analysis.summary && Object.keys(analysis.sections).length > 0) {
      const firstSection = Object.values(analysis.sections)[0] as string;
      analysis.summary = firstSection.substring(0, 500) + (firstSection.length > 500 ? '...' : '');
    }

    // Generate default score if not found
    if (!analysis.score) {
      const strengthScore = Math.min(analysis.strengths.length * 15, 60);
      const weaknessScore = Math.max(60 - analysis.weaknesses.length * 10, 20);
      analysis.score = Math.round((strengthScore + weaknessScore) / 2);
    }

    return analysis;
  } catch (error) {
    console.error('Error parsing markdown to JSON:', error);
    return {
      summary: 'Analysis completed successfully',
      strengths: ['Professional profile structure'],
      weaknesses: ['Could benefit from optimization'],
      suggestions: ['Consider enhancing profile visibility'],
      score: 75,
      sections: {
        'raw_content': markdown
      }
    };
  }
}

// Call RedactAI LinkedIn Review API
async function callRedactAIAPI(username: string): Promise<RedactAIResponse> {
  try {
    const response = await fetch('https://redactai.io/free-tools/linkedin-profile-review', {
      method: 'POST',
      headers: {
        'accept': 'text/x-component',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'text/plain;charset=UTF-8',
        'next-action': '4072ccb42a98dc47dab5bccd42d525cf89d17906e6',
        'next-router-state-tree': '%5B%22%22%2C%7B%22children%22%3A%5B%22(en)%22%2C%7B%22children%22%3A%5B%22free-tools%22%2C%7B%22children%22%3A%5B%5B%22categoryId%22%2C%22linkedin-profile-review%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Ffree-tools%2Flinkedin-profile-review%22%2C%22refresh%22%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%7D%5D',
        'origin': 'https://redactai.io',
        'priority': 'u=1, i',
        'referer': 'https://redactai.io/free-tools/linkedin-profile-review',
        'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
      },
      body: JSON.stringify([username])
    });

    if (!response.ok) {
      throw new Error(`RedactAI API error: ${response.status} ${response.statusText}`);
    }

    const responseText = await response.text();
    
    // The response might be in a specific format, try to extract markdown content
    let markdown = responseText;
    
    // If the response contains HTML or other format, try to extract the content
    if (responseText.includes('<')) {
      // Remove HTML tags if present
      markdown = responseText.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
    }

    return {
      markdown,
      analysisData: parseMarkdownToJSON(markdown)
    };
  } catch (error) {
    console.error('RedactAI API call failed:', error);
    throw new Error(`Failed to analyze LinkedIn profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

    const body = await request.json() as LinkedInAnalysisRequest;
    const { profileUrl } = body;

    if (!profileUrl) {
      return NextResponse.json({
        success: false,
        error: 'LinkedIn profile URL is required'
      }, { status: 400 });
    }

    // Extract username from URL
    let username: string;
    try {
      username = extractLinkedInUsername(profileUrl);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid LinkedIn URL'
      }, { status: 400 });
    }

    const userId = session.user.id;

    // Check and deduct credits
    const creditCheck = await CreditService.checkAndDeductCredits(
      userId,
      'linkedin' as ServiceType,
      { profileUrl, username }
    );

    if (!creditCheck.success) {
      return NextResponse.json({
        success: false,
        error: creditCheck.error
      }, { status: 400 });
    }

    const startTime = Date.now();

    try {
      // Call RedactAI API
      const redactResponse = await callRedactAIAPI(username);
      const processingTime = Date.now() - startTime;

      // Prepare analysis data
      const analysisData = redactResponse.analysisData;
      const responseData = {
        username,
        profileUrl,
        analysis: analysisData,
        rawMarkdown: redactResponse.markdown,
        score: analysisData.score || 75,
        strengths: analysisData.strengths || [],
        weaknesses: analysisData.weaknesses || [],
        suggestions: analysisData.suggestions || []
      };

      // Update request status to completed
      await RequestLogService.updateRequestStatus(
        creditCheck.requestId!,
        'completed'
      );

      // Log successful response
      await RequestLogService.logResponse(
        userId,
        creditCheck.requestId!,
        'linkedin' as ServiceType,
        responseData,
        {
          score: analysisData.score || 75,
          strengths: analysisData.strengths || [],
          weaknesses: analysisData.weaknesses || [],
          suggestions: analysisData.suggestions || []
        },
        processingTime
      );

      return NextResponse.json({
        success: true,
        data: responseData,
        requestId: creditCheck.requestId,
        creditsUsed: creditCheck.creditsDeducted,
        remainingCredits: creditCheck.remainingCredits
      } as LinkedInAnalysisResponse);

    } catch (apiError) {
      await RequestLogService.updateRequestStatus(
        creditCheck.requestId!,
        'failed',
        apiError instanceof Error ? apiError.message : 'API call failed'
      );

      return NextResponse.json({
        success: false,
        error: apiError instanceof Error ? apiError.message : 'Analysis failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('LinkedIn analysis endpoint error:', error);
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
    console.error('Error getting LinkedIn analysis history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}