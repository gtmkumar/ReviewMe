import { render, screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import DashboardPage from '@/app/dashboard/page';
import { useSession } from 'next-auth/react';

// Mock dependencies
jest.mock('@tanstack/react-query');
jest.mock('next-auth/react');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated session
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31',
      },
      status: 'authenticated',
    });
  });

  it('should render loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      isError: false,
      isSuccess: false,
    } as any);

    render(<DashboardPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render dashboard with data', async () => {
    const mockDashboardData = {
      profileOverview: {
        overallScore: 85,
        lastUpdated: '2023-01-01T00:00:00Z',
        completionStatus: {
          github: true,
          resume: true,
          linkedin: false,
        },
      },
      github: {
        score: {
          overall: 90,
          activity: 85,
          quality: 95,
          collaboration: 80,
          documentation: 90,
          consistency: 85,
        },
        profile: {
          username: 'testuser',
          name: 'Test User',
          bio: 'Test bio',
          followers: 100,
          publicRepos: 20,
        },
        topRepositories: [
          {
            name: 'test-repo',
            description: 'Test repository',
            language: 'TypeScript',
            stars: 10,
            forks: 5,
          },
        ],
      },
      resume: {
        score: {
          overall: 80,
          ats: 85,
          keywords: 75,
          clarity: 90,
          quantification: 70,
          formatting: 85,
          consistency: 80,
        },
        analysis: {
          wordCount: 500,
          hasContactInfo: true,
          hasExperience: true,
          hasEducation: true,
          hasSkills: true,
        },
      },
      linkedin: null,
      recommendations: [
        {
          id: '1',
          type: 'github',
          priority: 'high',
          title: 'Add README to repositories',
          description: 'Improve documentation',
          impact: 'high',
          effort: 'low',
          category: 'documentation',
        },
      ],
    };

    mockUseQuery.mockReturnValue({
      data: mockDashboardData,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as any);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Professional Profile Dashboard')).toBeInTheDocument();
    });

    // Check profile overview
    expect(screen.getByText('85')).toBeInTheDocument(); // Overall score
    
    // Check GitHub section
    expect(screen.getByText('GitHub Analysis')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument(); // GitHub score
    
    // Check Resume section
    expect(screen.getByText('Resume Analysis')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument(); // Resume score
    
    // Check recommendations
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Add README to repositories')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      error: new Error('API Error'),
      isLoading: false,
      isError: true,
      isSuccess: false,
    } as any);

    render(<DashboardPage />);

    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('should show GitHub integration button when not connected', async () => {
    const mockDashboardData = {
      profileOverview: {
        overallScore: 0,
        lastUpdated: null,
        completionStatus: {
          github: false,
          resume: false,
          linkedin: false,
        },
      },
      github: null,
      resume: null,
      linkedin: null,
      recommendations: [],
    };

    mockUseQuery.mockReturnValue({
      data: mockDashboardData,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as any);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Connect GitHub')).toBeInTheDocument();
    });
  });

  it('should show resume upload section when no resume', async () => {
    const mockDashboardData = {
      profileOverview: {
        overallScore: 45,
        lastUpdated: '2023-01-01T00:00:00Z',
        completionStatus: {
          github: true,
          resume: false,
          linkedin: false,
        },
      },
      github: {
        score: { overall: 90 },
        profile: { username: 'testuser' },
        topRepositories: [],
      },
      resume: null,
      linkedin: null,
      recommendations: [],
    };

    mockUseQuery.mockReturnValue({
      data: mockDashboardData,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as any);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Upload Resume')).toBeInTheDocument();
    });
  });

  it('should redirect to signin when not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    mockUseQuery.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: false,
      isError: false,
      isSuccess: false,
    } as any);

    render(<DashboardPage />);

    // Should show some indication that user needs to sign in
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });
});