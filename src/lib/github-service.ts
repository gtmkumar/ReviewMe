import { Octokit } from '@octokit/rest';
import { getDbManager, GitHubRepositoryDocument } from './database';

export interface GitHubProfile {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  company: string;
  location: string;
  blog: string;
  followers: number;
  following: number;
  public_repos: number;
  public_gists: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  [x: string]: any;
  id: number;
  name: string;
  full_name: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  size: number;
  open_issues_count: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  topics: string[];
  has_wiki: boolean;
  has_pages: boolean;
  has_downloads: boolean;
  archived: boolean;
  disabled: boolean;
  visibility: string;
}

export interface GitHubScore {
  overall: number;
  activity: number;
  quality: number;
  collaboration: number;
  documentation: number;
  consistency: number;
  breakdown: {
    repositoryCount: number;
    averageStars: number;
    totalCommits: number;
    languageDiversity: number;
    readmeQuality: number;
    testCoverage: number;
    collaborationScore: number;
    activityFrequency: number;
  };
}

export class GitHubService {
  private octokit: Octokit;
  private db = getDbManager();

  constructor(accessToken?: string) {
    this.octokit = new Octokit({
      auth: accessToken || process.env.GITHUB_TOKEN,
      userAgent: 'ReviewMe v1.0.0',
      timeZone: 'UTC',
    });
  }

  async getUserProfile(username: string): Promise<GitHubProfile> {
    try {
      const { data } = await this.octokit.rest.users.getByUsername({
        username,
      });
      return data as GitHubProfile;
    } catch (error) {
      console.error('Error fetching GitHub profile:', error);
      throw new Error('Failed to fetch GitHub profile');
    }
  }

  async getUserRepositories(username: string, page = 1, per_page = 100): Promise<GitHubRepository[]> {
    try {
      const { data } = await this.octokit.rest.repos.listForUser({
        username,
        sort: 'updated',
        direction: 'desc',
        page,
        per_page,
      });
      return data as GitHubRepository[];
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error);
      throw new Error('Failed to fetch GitHub repositories');
    }
  }

  async getRepositoryDetails(owner: string, repo: string) {
    try {
      const [repoData, readmeData, languagesData, contributorsData, commitsData] = await Promise.allSettled([
        this.octokit.rest.repos.get({ owner, repo }),
        this.getRepositoryReadme(owner, repo),
        this.octokit.rest.repos.listLanguages({ owner, repo }),
        this.octokit.rest.repos.listContributors({ owner, repo, per_page: 100 }),
        this.getRepositoryCommitCount(owner, repo),
      ]);

      return {
        repository: repoData.status === 'fulfilled' ? repoData.value.data : null,
        readme: readmeData.status === 'fulfilled' ? readmeData.value : null,
        languages: languagesData.status === 'fulfilled' ? languagesData.value.data : {},
        contributors: contributorsData.status === 'fulfilled' ? contributorsData.value.data : [],
        commitCount: commitsData.status === 'fulfilled' ? commitsData.value : 0,
      };
    } catch (error) {
      console.error(`Error fetching repository details for ${owner}/${repo}:`, error);
      return {
        repository: null,
        readme: null,
        languages: {},
        contributors: [],
        commitCount: 0,
      };
    }
  }

  private async getRepositoryReadme(owner: string, repo: string): Promise<string | null> {
    try {
      const { data } = await this.octokit.rest.repos.getReadme({
        owner,
        repo,
      });
      return Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (error) {
      return null;
    }
  }

  private async getRepositoryCommitCount(owner: string, repo: string): Promise<number> {
    try {
      // Get commits from the last year to estimate activity
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        since: oneYearAgo.toISOString(),
        per_page: 1,
      });

      // Use search API for more accurate commit count
      const searchResult = await this.octokit.rest.search.commits({
        q: `repo:${owner}/${repo} author-date:>${oneYearAgo.toISOString().split('T')[0]}`,
        per_page: 1,
      });

      return searchResult.data.total_count;
    } catch (error) {
      return 0;
    }
  }

  async analyzeRepository(owner: string, repo: string): Promise<any> {
    const details = await this.getRepositoryDetails(owner, repo);
    
    if (!details.repository) {
      throw new Error('Repository not found');
    }

    const analysis = {
      hasReadme: !!details.readme,
      readmeLength: details.readme?.length || 0,
      hasLicense: !!details.repository.license,
      hasTests: await this.checkForTests(owner, repo),
      hasDocumentation: await this.checkForDocumentation(owner, repo),
      languageCount: Object.keys(details.languages).length,
      primaryLanguage: details.repository.language,
      collaboratorCount: details.contributors.length,
      recentCommits: details.commitCount,
      codeQualityScore: this.calculateCodeQuality(details),
      documentationScore: this.calculateDocumentationScore(details),
      collaborationScore: this.calculateCollaborationScore(details),
      activityScore: this.calculateActivityScore(details),
    };

    return analysis;
  }

  private async checkForTests(owner: string, repo: string): Promise<boolean> {
    try {
      const testPatterns = [
        'test', 'tests', '__tests__', 'spec', 'specs',
        '.github/workflows', 'jest.config', 'karma.conf',
        'package.json', 'Makefile', 'pytest.ini'
      ];

      for (const pattern of testPatterns) {
        try {
          await this.octokit.rest.repos.getContent({
            owner,
            repo,
            path: pattern,
          });
          return true;
        } catch {
          continue;
        }
      }

      // Check package.json for test scripts
      try {
        const { data } = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path: 'package.json',
        });
        
        if ('content' in data) {
          const packageJson = JSON.parse(Buffer.from(data.content, 'base64').toString());
          return !!(packageJson.scripts?.test || packageJson.devDependencies?.jest || 
                   packageJson.devDependencies?.mocha || packageJson.devDependencies?.jasmine);
        }
      } catch {
        // Ignore error
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private async checkForDocumentation(owner: string, repo: string): Promise<boolean> {
    try {
      const docPatterns = ['docs', 'documentation', 'wiki', 'API.md', 'CONTRIBUTING.md'];
      
      for (const pattern of docPatterns) {
        try {
          await this.octokit.rest.repos.getContent({
            owner,
            repo,
            path: pattern,
          });
          return true;
        } catch {
          continue;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  private calculateCodeQuality(details: any): number {
    let score = 0;
    const repo = details.repository;

    // Repository age and maintenance
    const ageInDays = (new Date().getTime() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceUpdate = (new Date().getTime() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);

    // Stars and engagement
    score += Math.min(repo.stargazers_count * 2, 30); // Max 30 points for stars
    score += Math.min(repo.forks_count * 3, 20); // Max 20 points for forks

    // Code organization
    score += details.languageCount * 5; // 5 points per language (diversity)
    score += details.hasLicense ? 10 : 0;
    score += details.hasTests ? 15 : 0;

    // Recent activity
    if (daysSinceUpdate < 30) score += 15;
    else if (daysSinceUpdate < 90) score += 10;
    else if (daysSinceUpdate < 365) score += 5;

    return Math.min(score, 100);
  }

  private calculateDocumentationScore(details: any): number {
    let score = 0;

    score += details.hasReadme ? 30 : 0;
    score += details.readmeLength > 500 ? 20 : details.readmeLength > 100 ? 10 : 0;
    score += details.hasDocumentation ? 25 : 0;
    score += details.repository.description ? 15 : 0;
    score += details.repository.topics.length * 2; // 2 points per topic

    return Math.min(score, 100);
  }

  private calculateCollaborationScore(details: any): number {
    let score = 0;

    score += Math.min(details.collaboratorCount * 10, 40); // Max 40 for collaborators
    score += Math.min(details.repository.forks_count * 5, 30); // Max 30 for forks
    score += details.repository.open_issues_count > 0 ? 15 : 0; // Active issue tracking
    score += details.repository.has_wiki ? 10 : 0;
    score += details.repository.has_pages ? 5 : 0;

    return Math.min(score, 100);
  }

  private calculateActivityScore(details: any): number {
    let score = 0;
    const repo = details.repository;

    // Recent activity
    const daysSinceUpdate = (new Date().getTime() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    const daysSincePush = (new Date().getTime() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate < 7) score += 30;
    else if (daysSinceUpdate < 30) score += 20;
    else if (daysSinceUpdate < 90) score += 10;

    if (daysSincePush < 7) score += 25;
    else if (daysSincePush < 30) score += 15;
    else if (daysSincePush < 90) score += 5;

    // Commit frequency
    score += Math.min(details.recentCommits * 2, 30); // Max 30 for commits

    // Issue activity
    score += Math.min(repo.open_issues_count, 15); // Active issues indicate engagement

    return Math.min(score, 100);
  }

  async analyzeUserProfile(username: string, accessToken?: string): Promise<GitHubScore> {
    if (accessToken) {
      this.octokit = new Octokit({ auth: accessToken });
    }

    try {
      const profile = await this.getUserProfile(username);
      const repositories = await this.getUserRepositories(username);

      // Filter out forks and archived repositories for analysis
      const activeRepos = repositories.filter(repo => !repo.fork && !repo.archived);
      
      let totalStars = 0;
      let totalForks = 0;
      let totalCommits = 0;
      let languages = new Set<string>();
      let qualityScores: number[] = [];
      let documentationScores: number[] = [];
      let collaborationScores: number[] = [];
      let activityScores: number[] = [];

      // Analyze top repositories (limit to prevent API rate limits)
      const reposToAnalyze = activeRepos.slice(0, 20);
      
      for (const repo of reposToAnalyze) {
        totalStars += repo.stargazers_count;
        totalForks += repo.forks_count;
        
        if (repo.language) {
          languages.add(repo.language);
        }

        try {
          const analysis = await this.analyzeRepository(repo.full_name.split('/')[0], repo.name);
          qualityScores.push(analysis.codeQualityScore);
          documentationScores.push(analysis.documentationScore);
          collaborationScores.push(analysis.collaborationScore);
          activityScores.push(analysis.activityScore);
          totalCommits += analysis.recentCommits;
        } catch (error) {
          console.warn(`Failed to analyze repository ${repo.full_name}:`, error);
        }
      }

      // Calculate averages
      const avgQuality = qualityScores.length > 0 ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 0;
      const avgDocumentation = documentationScores.length > 0 ? documentationScores.reduce((a, b) => a + b, 0) / documentationScores.length : 0;
      const avgCollaboration = collaborationScores.length > 0 ? collaborationScores.reduce((a, b) => a + b, 0) / collaborationScores.length : 0;
      const avgActivity = activityScores.length > 0 ? activityScores.reduce((a, b) => a + b, 0) / activityScores.length : 0;

      // Account-level scores
      const profileScore = this.calculateProfileScore(profile);
      
      // Consistency score based on regular activity
      const consistencyScore = this.calculateConsistencyScore(repositories);

      const breakdown = {
        repositoryCount: activeRepos.length,
        averageStars: activeRepos.length > 0 ? totalStars / activeRepos.length : 0,
        totalCommits,
        languageDiversity: languages.size,
        readmeQuality: avgDocumentation,
        testCoverage: avgQuality,
        collaborationScore: avgCollaboration,
        activityFrequency: avgActivity,
      };

      const overall = (
        profileScore * 0.15 +
        avgActivity * 0.25 +
        avgQuality * 0.25 +
        avgCollaboration * 0.15 +
        avgDocumentation * 0.15 +
        consistencyScore * 0.05
      );

      const score: GitHubScore = {
        overall: Math.round(overall),
        activity: Math.round(avgActivity),
        quality: Math.round(avgQuality),
        collaboration: Math.round(avgCollaboration),
        documentation: Math.round(avgDocumentation),
        consistency: Math.round(consistencyScore),
        breakdown,
      };

      return score;
    } catch (error) {
      console.error('Error analyzing GitHub profile:', error);
      throw error;
    }
  }

  private calculateProfileScore(profile: GitHubProfile): number {
    let score = 0;

    score += profile.bio ? 20 : 0;
    score += profile.company ? 15 : 0;
    score += profile.location ? 10 : 0;
    score += profile.blog ? 15 : 0;
    score += Math.min(profile.followers * 2, 25); // Max 25 for followers
    score += Math.min(profile.public_repos * 1, 15); // Max 15 for repos

    return Math.min(score, 100);
  }

  private calculateConsistencyScore(repositories: GitHubRepository[]): number {
    if (repositories.length === 0) return 0;

    // Analyze commit patterns across repositories
    const recentRepos = repositories.filter(repo => {
      const daysSinceUpdate = (new Date().getTime() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate < 365; // Repositories updated in the last year
    });

    const consistencyMetrics = {
      regularUpdates: recentRepos.length / repositories.length,
      namingConsistency: this.calculateNamingConsistency(repositories),
      languageConsistency: this.calculateLanguageConsistency(repositories),
    };

    return Math.round(
      (consistencyMetrics.regularUpdates * 40 +
       consistencyMetrics.namingConsistency * 30 +
       consistencyMetrics.languageConsistency * 30)
    );
  }

  private calculateNamingConsistency(repositories: GitHubRepository[]): number {
    // Simple heuristic: check for consistent naming patterns
    const names = repositories.map(repo => repo.name);
    const patterns = {
      kebabCase: names.filter(name => /^[a-z][a-z0-9-]*$/.test(name)).length,
      camelCase: names.filter(name => /^[a-z][a-zA-Z0-9]*$/.test(name)).length,
      snakeCase: names.filter(name => /^[a-z][a-z0-9_]*$/.test(name)).length,
    };

    const maxPattern = Math.max(patterns.kebabCase, patterns.camelCase, patterns.snakeCase);
    return names.length > 0 ? (maxPattern / names.length) * 100 : 0;
  }

  private calculateLanguageConsistency(repositories: GitHubRepository[]): number {
    const languages = repositories
      .map(repo => repo.language)
      .filter(lang => lang !== null);

    if (languages.length === 0) return 0;

    // Calculate language distribution
    const langCounts = languages.reduce((acc, lang) => {
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRepos = languages.length;
    const primaryLangCount = Math.max(...Object.values(langCounts));
    
    // Score based on having a primary language used consistently
    return (primaryLangCount / totalRepos) * 100;
  }

  async syncUserData(userId: string, username: string, accessToken?: string): Promise<void> {
    try {
      if (accessToken) {
        this.octokit = new Octokit({ auth: accessToken });
      }

      // Get user profile and repositories
      const [profile, repositories] = await Promise.all([
        this.getUserProfile(username),
        this.getUserRepositories(username),
      ]);

      // Analyze profile
      const score = await this.analyzeUserProfile(username, accessToken);

      // Store in database
      const profilesCollection = await this.db.getProfilesCollection();
      await profilesCollection.updateOne(
        { userId },
        {
          $set: {
            github: {
              username: profile.login,
              profileUrl: `https://github.com/${profile.login}`,
              avatarUrl: profile.avatar_url,
              name: profile.name,
              bio: profile.bio,
              company: profile.company,
              location: profile.location,
              followers: profile.followers,
              following: profile.following,
              publicRepos: profile.public_repos,
              createdAt: new Date(profile.created_at),
              updatedAt: new Date(profile.updated_at),
              score,
              lastSyncedAt: new Date(),
            },
            updatedAt: new Date(),
          }
        },
        { upsert: true }
      );

      // Store repository data
      const repositoryDocs: GitHubRepositoryDocument[] = repositories.map(repo => ({
        userId,
        githubId: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || '',
        language: repo.language || '',
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        watchers: repo.watchers_count,
        size: repo.size,
        openIssues: repo.open_issues_count,
        hasReadme: false, // Will be updated in detailed analysis
        hasLicense: false, // Will be updated in detailed analysis
        hasTests: false, // Will be updated in detailed analysis
        hasDocumentation: false, // Will be updated in detailed analysis
        defaultBranch: repo.default_branch,
        createdAt: new Date(repo.created_at),
        updatedAt: new Date(repo.updated_at),
        pushedAt: new Date(repo.pushed_at),
        topics: repo.topics || [],
        collaborators: 0, // Will be updated in detailed analysis
        commits: 0, // Will be updated in detailed analysis
        branches: 0, // Will be updated in detailed analysis
        releases: 0, // Will be updated in detailed analysis
        lastAnalyzedAt: new Date(),
      }));

      // Clear existing repositories for this user
      const repositoriesCollection = await this.db.getRepositoriesCollection();
      await repositoriesCollection.deleteMany({ userId });

      // Insert new repository data
      if (repositoryDocs.length > 0) {
        await repositoriesCollection.insertMany(repositoryDocs);
      }

      console.log(`Successfully synced GitHub data for user ${userId}`);
    } catch (error) {
      console.error('Error syncing GitHub data:', error);
      throw error;
    }
  }
}

export default GitHubService;