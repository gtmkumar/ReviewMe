import GitHubService from '@/lib/github-service';
import { Octokit } from '@octokit/rest';

// Mock Octokit
jest.mock('@octokit/rest');
const MockedOctokit = Octokit as jest.MockedClass<typeof Octokit>;

// Mock database
jest.mock('@/lib/database', () => ({
  getDbManager: jest.fn(() => ({
    connect: jest.fn(),
    profiles: {
      updateOne: jest.fn(),
    },
    repositories: {
      deleteMany: jest.fn(),
      insertMany: jest.fn(),
    },
    integrations: {
      findOne: jest.fn(),
      updateOne: jest.fn(),
    },
  })),
}));

describe('GitHubService', () => {
  let githubService: GitHubService;
  let mockOctokit: jest.Mocked<Octokit>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockOctokit = {
      rest: {
        users: {
          getByUsername: jest.fn(),
        },
        repos: {
          listForUser: jest.fn(),
          get: jest.fn(),
          getReadme: jest.fn(),
          listLanguages: jest.fn(),
          listContributors: jest.fn(),
          listCommits: jest.fn(),
          getContent: jest.fn(),
        },
        search: {
          commits: jest.fn(),
        },
      },
    } as any;

    MockedOctokit.mockImplementation(() => mockOctokit);
    githubService = new GitHubService('test-token');
  });

  describe('getUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockProfile = {
        id: 1,
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        company: 'Test Company',
        location: 'Test Location',
        blog: 'https://example.com',
        followers: 100,
        following: 50,
        public_repos: 20,
        public_gists: 5,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockOctokit.rest.users.getByUsername.mockResolvedValue({
        data: mockProfile,
      } as any);

      const result = await githubService.getUserProfile('testuser');

      expect(mockOctokit.rest.users.getByUsername).toHaveBeenCalledWith({
        username: 'testuser',
      });
      expect(result).toEqual(mockProfile);
    });

    it('should handle errors when fetching user profile', async () => {
      mockOctokit.rest.users.getByUsername.mockRejectedValue(
        new Error('API Error')
      );

      await expect(githubService.getUserProfile('testuser')).rejects.toThrow(
        'Failed to fetch GitHub profile'
      );
    });
  });

  describe('getUserRepositories', () => {
    it('should fetch user repositories successfully', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'test-repo',
          full_name: 'testuser/test-repo',
          description: 'Test repository',
          language: 'TypeScript',
          stargazers_count: 10,
          forks_count: 5,
          watchers_count: 8,
          size: 1000,
          open_issues_count: 2,
          default_branch: 'main',
          created_at: '2022-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          pushed_at: '2023-01-01T00:00:00Z',
          topics: ['react', 'typescript'],
          has_wiki: true,
          has_pages: false,
          has_downloads: true,
          archived: false,
          disabled: false,
          visibility: 'public',
        },
      ];

      mockOctokit.rest.repos.listForUser.mockResolvedValue({
        data: mockRepos,
      } as any);

      const result = await githubService.getUserRepositories('testuser');

      expect(mockOctokit.rest.repos.listForUser).toHaveBeenCalledWith({
        username: 'testuser',
        sort: 'updated',
        direction: 'desc',
        page: 1,
        per_page: 100,
      });
      expect(result).toEqual(mockRepos);
    });

    it('should handle pagination', async () => {
      const mockRepos = [{ id: 1, name: 'test-repo' }];

      mockOctokit.rest.repos.listForUser.mockResolvedValue({
        data: mockRepos,
      } as any);

      await githubService.getUserRepositories('testuser', 2, 50);

      expect(mockOctokit.rest.repos.listForUser).toHaveBeenCalledWith({
        username: 'testuser',
        sort: 'updated',
        direction: 'desc',
        page: 2,
        per_page: 50,
      });
    });
  });

  describe('analyzeUserProfile', () => {
    beforeEach(() => {
      // Mock all required methods
      mockOctokit.rest.users.getByUsername.mockResolvedValue({
        data: {
          id: 1,
          login: 'testuser',
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
          bio: 'Test bio',
          company: 'Test Company',
          location: 'Test Location',
          blog: 'https://example.com',
          followers: 100,
          following: 50,
          public_repos: 20,
          public_gists: 5,
          created_at: '2020-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      } as any);

      mockOctokit.rest.repos.listForUser.mockResolvedValue({
        data: [
          {
            id: 1,
            name: 'test-repo',
            full_name: 'testuser/test-repo',
            description: 'Test repository',
            language: 'TypeScript',
            stargazers_count: 10,
            forks_count: 5,
            fork: false,
            archived: false,
            updated_at: '2023-01-01T00:00:00Z',
            pushed_at: '2023-01-01T00:00:00Z',
          },
        ],
      } as any);

      // Mock repository details methods
      mockOctokit.rest.repos.get.mockResolvedValue({
        data: {
          license: { key: 'mit' },
          created_at: '2022-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          description: 'Test repo',
          topics: ['react'],
        },
      } as any);

      mockOctokit.rest.repos.getReadme.mockResolvedValue({
        data: {
          content: Buffer.from('# Test README').toString('base64'),
        },
      } as any);

      mockOctokit.rest.repos.listLanguages.mockResolvedValue({
        data: { TypeScript: 1000, JavaScript: 500 },
      } as any);

      mockOctokit.rest.repos.listContributors.mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }],
      } as any);

      mockOctokit.rest.search.commits.mockResolvedValue({
        data: { total_count: 50 },
      } as any);

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: { type: 'file' },
      } as any);
    });

    it('should analyze user profile and return scores', async () => {
      const result = await githubService.analyzeUserProfile('testuser');

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('activity');
      expect(result).toHaveProperty('quality');
      expect(result).toHaveProperty('collaboration');
      expect(result).toHaveProperty('documentation');
      expect(result).toHaveProperty('consistency');
      expect(result).toHaveProperty('breakdown');

      expect(typeof result.overall).toBe('number');
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });

    it('should handle empty repository list', async () => {
      mockOctokit.rest.repos.listForUser.mockResolvedValue({
        data: [],
      } as any);

      const result = await githubService.analyzeUserProfile('testuser');

      expect(result.breakdown.repositoryCount).toBe(0);
      expect(result.breakdown.averageStars).toBe(0);
    });

    it('should filter out forks and archived repositories', async () => {
      mockOctokit.rest.repos.listForUser.mockResolvedValue({
        data: [
          { id: 1, name: 'repo1', fork: false, archived: false },
          { id: 2, name: 'repo2', fork: true, archived: false }, // Should be filtered
          { id: 3, name: 'repo3', fork: false, archived: true }, // Should be filtered
          { id: 4, name: 'repo4', fork: false, archived: false },
        ],
      } as any);

      const result = await githubService.analyzeUserProfile('testuser');

      expect(result.breakdown.repositoryCount).toBe(2);
    });
  });

  describe('calculateProfileScore', () => {
    it('should calculate profile score correctly', () => {
      const mockProfile = {
        id: 1,
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        company: 'Test Company',
        location: 'Test Location',
        blog: 'https://example.com',
        followers: 10,
        following: 5,
        public_repos: 5,
        public_gists: 2,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      // Access private method for testing
      const score = (githubService as any).calculateProfileScore(mockProfile);

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});