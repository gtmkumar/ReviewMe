import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/github/sync/route';
import { getServerSession } from 'next-auth';
import GitHubService from '@/lib/github-service';
import { getDbManager } from '@/lib/database';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/github-service');
jest.mock('@/lib/database');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const MockedGitHubService = GitHubService as jest.MockedClass<typeof GitHubService>;
const mockGetDbManager = getDbManager as jest.MockedFunction<typeof getDbManager>;

describe('/api/github/sync', () => {
  let mockDb: any;
  let mockGitHubService: jest.Mocked<GitHubService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database
    mockDb = {
      connect: jest.fn(),
      getIntegrationsCollection: jest.fn().mockResolvedValue({
        findOne: jest.fn(),
        updateOne: jest.fn(),
      }),
      getProfilesCollection: jest.fn().mockResolvedValue({
        findOne: jest.fn(),
      }),
      getRepositoriesCollection: jest.fn().mockResolvedValue({
        find: jest.fn(() => ({
          sort: jest.fn(() => ({
            limit: jest.fn(() => ({
              toArray: jest.fn(),
            })),
          })),
        })),
      }),
    };

    mockGetDbManager.mockReturnValue(mockDb);

    // Mock GitHub service
    mockGitHubService = {
      syncUserData: jest.fn(),
    } as any;

    MockedGitHubService.mockImplementation(() => mockGitHubService);
  });

  describe('POST /api/github/sync', () => {
    it('should sync GitHub data successfully', async () => {
      const mockSession = {
        user: { id: 'user123' },
        github: { username: 'testuser' },
        accessToken: 'test-token',
      };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      
      const mockIntegrationsCollection = {
        findOne: jest.fn().mockResolvedValue({
          accessToken: 'test-token',
        }),
        updateOne: jest.fn().mockResolvedValue({ acknowledged: true })
      };
      mockDb.getIntegrationsCollection.mockResolvedValue(mockIntegrationsCollection);

      mockGitHubService.syncUserData.mockResolvedValue();

      const request = new NextRequest('http://localhost:3000/api/github/sync', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('GitHub data synced successfully');
      expect(mockGitHubService.syncUserData).toHaveBeenCalledWith(
        'user123',
        'testuser',
        'test-token'
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/github/sync', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 when GitHub account not connected', async () => {
      const mockSession = {
        user: { id: 'user123' },
        // No github data
      };

      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/github/sync', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('GitHub account not connected');
    });

    it('should handle sync errors', async () => {
      const mockSession = {
        user: { id: 'user123' },
        github: { username: 'testuser' },
        accessToken: 'test-token',
      };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      const mockIntegrationsCollection = {
        findOne: jest.fn().mockResolvedValue(null),
        updateOne: jest.fn()
      };
      mockDb.getIntegrationsCollection.mockResolvedValue(mockIntegrationsCollection);
      mockGitHubService.syncUserData.mockRejectedValue(new Error('Sync failed'));

      const request = new NextRequest('http://localhost:3000/api/github/sync', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to sync GitHub data');
    });
  });

  describe('GET /api/github/sync', () => {
    it('should fetch GitHub data successfully', async () => {
      const mockSession = {
        user: { id: 'user123' },
      };

      const mockProfile = {
        github: {
          username: 'testuser',
          score: { overall: 85 },
        },
      };

      const mockIntegration = {
        type: 'github',
        isConnected: true,
        lastSyncedAt: new Date(),
      };

      const mockRepositories = [
        {
          name: 'test-repo',
          stars: 10,
          language: 'TypeScript',
        },
      ];

      mockGetServerSession.mockResolvedValue(mockSession as any);
      
      const mockProfilesCollection = {
        findOne: jest.fn().mockResolvedValue(mockProfile)
      };
      mockDb.getProfilesCollection.mockResolvedValue(mockProfilesCollection);
      
      const mockIntegrationsCollection = {
        findOne: jest.fn().mockResolvedValue(mockIntegration)
      };
      mockDb.getIntegrationsCollection.mockResolvedValue(mockIntegrationsCollection);
      
      const mockRepositoriesCollection = {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue(mockRepositories)
            })
          })
        })
      };
      mockDb.getRepositoriesCollection.mockResolvedValue(mockRepositoriesCollection);

      const request = new NextRequest('http://localhost:3000/api/github/sync', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.profile).toEqual(mockProfile.github);
      expect(data.data.integration).toEqual(mockIntegration);
      expect(data.data.repositories).toEqual(mockRepositories);
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/github/sync', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle database errors', async () => {
      const mockSession = {
        user: { id: 'user123' },
      };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      
      const mockProfilesCollection = {
        findOne: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      mockDb.getProfilesCollection.mockResolvedValue(mockProfilesCollection);

      const request = new NextRequest('http://localhost:3000/api/github/sync', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch GitHub data');
    });
  });
});