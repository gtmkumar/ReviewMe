import { getDbManager, RecommendationDocument } from './database';
import { v4 as uuidv4 } from 'uuid';

export interface RecommendationRule {
  id: string;
  name: string;
  type: 'github' | 'linkedin' | 'resume' | 'general';
  category: 'profile' | 'content' | 'activity' | 'networking' | 'skills';
  priority: 'low' | 'medium' | 'high' | 'critical';
  condition: (userData: any) => boolean;
  generateRecommendation: (userData: any) => Omit<RecommendationDocument, '_id' | 'userId' | 'createdAt'>;
}

export interface UserAnalysisData {
  profile: any;
  github?: {
    profile: any;
    repositories: any[];
    score: any;
  };
  linkedin?: {
    profile: any;
    score: any;
  };
  resume?: {
    content: any;
    score: any;
  };
  documents: any[];
  integrations: any[];
  analytics: any[];
}

export class RecommendationEngine {
  private db = getDbManager();
  private rules: RecommendationRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    this.rules = [
      // GitHub Recommendations
      {
        id: 'github-missing-readme',
        name: 'Add README to repositories',
        type: 'github',
        category: 'content',
        priority: 'high',
        condition: (data) => {
          const repos = data.github?.repositories || [];
          const reposWithoutReadme = repos.filter((repo: any) => !repo.hasReadme);
          return reposWithoutReadme.length > 0;
        },
        generateRecommendation: (data) => {
          const repos = data.github?.repositories || [];
          const reposWithoutReadme = repos.filter((repo: any) => !repo.hasReadme);
          return {
            type: 'github',
            category: 'content',
            priority: 'high',
            title: 'Add README files to your repositories',
            description: `${reposWithoutReadme.length} of your repositories are missing README files. READMEs help others understand your projects and improve your professional image.`,
            actionItems: [
              {
                id: uuidv4(),
                description: 'Create comprehensive README.md files for repositories without them',
                isCompleted: false,
                example: 'Include project description, installation instructions, usage examples, and contribution guidelines'
              },
              {
                id: uuidv4(),
                description: 'Use README templates and best practices',
                isCompleted: false,
                url: 'https://github.com/othneildrew/Best-README-Template'
              }
            ],
            impactScore: 85,
            effortScore: 60,
            estimatedTime: '2-4 hours',
            isCompleted: false,
            isDismissed: false,
          };
        }
      },

      {
        id: 'github-no-activity',
        name: 'Increase GitHub activity',
        type: 'github',
        category: 'activity',
        priority: 'medium',
        condition: (data) => {
          const score = data.github?.score;
          return score && score.activity < 50;
        },
        generateRecommendation: (data) => ({
          type: 'github',
          category: 'activity',
          priority: 'medium',
          title: 'Increase your GitHub activity',
          description: 'Your GitHub activity score is below average. Regular contributions show consistent engagement and skill development.',
          actionItems: [
            {
              id: uuidv4(),
              description: 'Commit code regularly (aim for 3-5 commits per week)',
              isCompleted: false,
            },
            {
              id: uuidv4(),
              description: 'Contribute to open source projects',
              isCompleted: false,
              url: 'https://github.com/explore'
            },
            {
              id: uuidv4(),
              description: 'Create and maintain personal projects',
              isCompleted: false,
            }
          ],
          impactScore: 70,
          effortScore: 80,
          estimatedTime: 'Ongoing',
          isCompleted: false,
          isDismissed: false,
        })
      },

      {
        id: 'github-improve-documentation',
        name: 'Improve repository documentation',
        type: 'github',
        category: 'content',
        priority: 'medium',
        condition: (data) => {
          const score = data.github?.score;
          return score && score.documentation < 60;
        },
        generateRecommendation: (data) => ({
          type: 'github',
          category: 'content',
          priority: 'medium',
          title: 'Improve your repository documentation',
          description: 'Well-documented code demonstrates professionalism and makes your projects more accessible to others.',
          actionItems: [
            {
              id: uuidv4(),
              description: 'Add inline code comments explaining complex logic',
              isCompleted: false,
            },
            {
              id: uuidv4(),
              description: 'Create API documentation for your projects',
              isCompleted: false,
            },
            {
              id: uuidv4(),
              description: 'Add wikis or docs folders for comprehensive documentation',
              isCompleted: false,
            }
          ],
          impactScore: 75,
          effortScore: 70,
          estimatedTime: '1-2 weeks',
          isCompleted: false,
          isDismissed: false,
        })
      },

      // Resume Recommendations
      {
        id: 'resume-missing-quantification',
        name: 'Add quantifiable achievements to resume',
        type: 'resume',
        category: 'content',
        priority: 'high',
        condition: (data) => {
          const score = data.resume?.score;
          return score && score.quantification < 50;
        },
        generateRecommendation: (data) => ({
          type: 'resume',
          category: 'content',
          priority: 'high',
          title: 'Add quantifiable achievements to your resume',
          description: 'Your resume lacks specific metrics and achievements. Quantified results make your impact more credible and impressive.',
          actionItems: [
            {
              id: uuidv4(),
              description: 'Add specific numbers, percentages, and metrics to achievements',
              isCompleted: false,
              example: 'Changed "Improved performance" to "Improved application performance by 40%, reducing load time from 3s to 1.8s"'
            },
            {
              id: uuidv4(),
              description: 'Include dollar amounts, time savings, or efficiency gains where possible',
              isCompleted: false,
              example: 'Saved company $50K annually by automating manual processes'
            },
            {
              id: uuidv4(),
              description: 'Use action verbs with measurable outcomes',
              isCompleted: false,
            }
          ],
          impactScore: 90,
          effortScore: 50,
          estimatedTime: '2-3 hours',
          isCompleted: false,
          isDismissed: false,
        })
      },

      {
        id: 'resume-ats-optimization',
        name: 'Optimize resume for ATS systems',
        type: 'resume',
        category: 'content',
        priority: 'high',
        condition: (data) => {
          const score = data.resume?.score;
          return score && score.ats < 70;
        },
        generateRecommendation: (data) => ({
          type: 'resume',
          category: 'content',
          priority: 'high',
          title: 'Optimize your resume for ATS systems',
          description: 'Your resume may not be compatible with Applicant Tracking Systems, which could prevent it from reaching human recruiters.',
          actionItems: [
            {
              id: uuidv4(),
              description: 'Use standard section headings (Experience, Education, Skills)',
              isCompleted: false,
            },
            {
              id: uuidv4(),
              description: 'Avoid complex formatting, graphics, and unusual fonts',
              isCompleted: false,
            },
            {
              id: uuidv4(),
              description: 'Include relevant keywords from job descriptions',
              isCompleted: false,
            },
            {
              id: uuidv4(),
              description: 'Save and submit in both PDF and Word formats',
              isCompleted: false,
            }
          ],
          impactScore: 85,
          effortScore: 60,
          estimatedTime: '1-2 hours',
          isCompleted: false,
          isDismissed: false,
        })
      },

      {
        id: 'resume-missing-skills',
        name: 'Expand technical skills section',
        type: 'resume',
        category: 'skills',
        priority: 'medium',
        condition: (data) => {
          const skills = data.resume?.content?.skills || [];
          return skills.length < 10;
        },
        generateRecommendation: (data) => ({
          type: 'resume',
          category: 'skills',
          priority: 'medium',
          title: 'Expand your technical skills section',
          description: 'A comprehensive skills section helps recruiters quickly identify your technical competencies.',
          actionItems: [
            {
              id: uuidv4(),
              description: 'List programming languages, frameworks, and tools you use',
              isCompleted: false,
            },
            {
              id: uuidv4(),
              description: 'Include soft skills relevant to your role',
              isCompleted: false,
            },
            {
              id: uuidv4(),
              description: 'Organize skills by category (Languages, Frameworks, Tools, etc.)',
              isCompleted: false,
            }
          ],
          impactScore: 60,
          effortScore: 30,
          estimatedTime: '30 minutes',
          isCompleted: false,
          isDismissed: false,
        })
      },

      // LinkedIn Recommendations
      {
        id: 'linkedin-not-connected',
        name: 'Connect LinkedIn profile',
        type: 'linkedin',
        category: 'profile',
        priority: 'high',
        condition: (data) => {
          return !data.linkedin || !data.linkedin.profile;
        },
        generateRecommendation: (data) => ({
          type: 'linkedin',
          category: 'profile',
          priority: 'high',
          title: 'Import your LinkedIn profile',
          description: 'LinkedIn is crucial for professional networking and job opportunities. Import your profile to get personalized recommendations.',
          actionItems: [
            {
              id: uuidv4(),
              description: 'Upload your LinkedIn profile data',
              isCompleted: false,
              url: '/dashboard/linkedin'
            },
            {
              id: uuidv4(),
              description: 'Ensure your LinkedIn profile is complete and up-to-date',
              isCompleted: false,
            }
          ],
          impactScore: 95,
          effortScore: 20,
          estimatedTime: '10 minutes',
          isCompleted: false,
          isDismissed: false,
        })
      },

      // General Profile Recommendations
      {
        id: 'profile-incomplete',
        name: 'Complete your professional profile',
        type: 'general',
        category: 'profile',
        priority: 'medium',
        condition: (data) => {
          const completeness = this.calculateProfileCompleteness(data);
          return completeness < 80;
        },
        generateRecommendation: (data) => {
          const missing = this.getMissingProfileElements(data);
          return {
            type: 'general',
            category: 'profile',
            priority: 'medium',
            title: 'Complete your professional profile',
            description: `Your profile is missing key elements that could improve your professional image. Complete these sections to boost your score.`,
            actionItems: missing.map(item => ({
              id: uuidv4(),
              description: item,
              isCompleted: false,
            })),
            impactScore: 70,
            effortScore: 40,
            estimatedTime: '1 hour',
            isCompleted: false,
            isDismissed: false,
          };
        }
      },

      {
        id: 'first-time-user',
        name: 'Get started with profile analysis',
        type: 'general',
        category: 'profile',
        priority: 'critical',
        condition: (data) => {
          return !data.github && !data.resume && !data.linkedin;
        },
        generateRecommendation: (data) => ({
          type: 'general',
          category: 'profile',
          priority: 'critical',
          title: 'Welcome! Let\'s analyze your professional profile',
          description: 'Start by connecting your accounts and uploading your resume to get personalized recommendations.',
          actionItems: [
            {
              id: uuidv4(),
              description: 'Connect your GitHub account for code analysis',
              isCompleted: false,
            },
            {
              id: uuidv4(),
              description: 'Upload your resume for ATS optimization',
              isCompleted: false,
            },
            {
              id: uuidv4(),
              description: 'Import your LinkedIn profile data',
              isCompleted: false,
            }
          ],
          impactScore: 100,
          effortScore: 30,
          estimatedTime: '15 minutes',
          isCompleted: false,
          isDismissed: false,
        })
      },
    ];
  }

  private calculateProfileCompleteness(data: UserAnalysisData): number {
    let completedSections = 0;
    const totalSections = 5;

    if (data.github?.profile) completedSections++;
    if (data.resume?.content) completedSections++;
    if (data.linkedin?.profile) completedSections++;
    if (data.profile?.personalInfo?.name) completedSections++;
    if (data.documents?.length > 0) completedSections++;

    return (completedSections / totalSections) * 100;
  }

  private getMissingProfileElements(data: UserAnalysisData): string[] {
    const missing: string[] = [];

    if (!data.github?.profile) {
      missing.push('Connect your GitHub account');
    }
    if (!data.resume?.content) {
      missing.push('Upload your resume');
    }
    if (!data.linkedin?.profile) {
      missing.push('Import LinkedIn profile');
    }
    if (!data.profile?.personalInfo?.name) {
      missing.push('Complete basic profile information');
    }
    if (!data.documents?.length) {
      missing.push('Upload supporting documents (portfolio, certificates)');
    }

    return missing;
  }

  async generateRecommendations(userId: string): Promise<RecommendationDocument[]> {
    try {
      // Fetch user data
      const userData = await this.fetchUserData(userId);
      
      // Apply rules to generate recommendations
      const recommendations: RecommendationDocument[] = [];
      
      for (const rule of this.rules) {
        if (rule.condition(userData)) {
          const recommendation = rule.generateRecommendation(userData);
          recommendations.push({
            ...recommendation,
            userId,
            createdAt: new Date(),
          } as RecommendationDocument);
        }
      }

      // Sort by priority and impact score
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      recommendations.sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.impactScore - a.impactScore;
      });

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  private async fetchUserData(userId: string): Promise<UserAnalysisData> {
    await this.db.connect();

    const [
      profilesCollection,
      integrationsCollection,
      repositoriesCollection,
      documentsCollection,
      analyticsCollection
    ] = await Promise.all([
      this.db.getProfilesCollection(),
      this.db.getIntegrationsCollection(),
      this.db.getRepositoriesCollection(),
      this.db.getDocumentsCollection(),
      this.db.getAnalyticsCollection()
    ]);
    
    const [profile, integrations, repositories, documents, analytics] = await Promise.all([
      profilesCollection.findOne({ userId }),
      integrationsCollection.find({ userId }).toArray(),
      repositoriesCollection.find({ userId }).toArray(),
      documentsCollection.find({ userId }).toArray(),
      analyticsCollection.find({ userId }).sort({ date: -1 }).limit(10).toArray(),
    ]);

    return {
      profile: profile || {},
      github: profile?.github ? {
        profile: profile.github,
        repositories,
        score: profile.github.score || {},
      } : undefined,
      linkedin: profile?.linkedin ? {
        profile: profile.linkedin,
        score: profile.linkedin.score || {},
      } : undefined,
      resume: profile?.resume ? {
        content: profile.resume.parsedContent || {},
        score: profile.resume.score || {},
      } : undefined,
      documents: documents || [],
      integrations: integrations || [],
      analytics: analytics || [],
    };
  }

  async updateRecommendations(userId: string): Promise<void> {
    try {
      await this.db.connect();

      // Remove old non-completed recommendations
      const recommendationsCollection = await this.db.getRecommendationsCollection();
      await recommendationsCollection.deleteMany({
        userId,
        isCompleted: false,
        isDismissed: false,
      });

      // Generate new recommendations
      const newRecommendations = await this.generateRecommendations(userId);

      // Insert new recommendations
      if (newRecommendations.length > 0) {
        const recommendationsCollection = await this.db.getRecommendationsCollection();
        await recommendationsCollection.insertMany(newRecommendations);
      }

      console.log(`Updated ${newRecommendations.length} recommendations for user ${userId}`);
    } catch (error) {
      console.error('Error updating recommendations:', error);
      throw error;
    }
  }

  async getRecommendations(userId: string, options: {
    type?: string;
    category?: string;
    priority?: string;
    limit?: number;
    includeCompleted?: boolean;
  } = {}): Promise<RecommendationDocument[]> {
    try {
      await this.db.connect();

      const filter: any = { userId };

      if (options.type) filter.type = options.type;
      if (options.category) filter.category = options.category;
      if (options.priority) filter.priority = options.priority;
      if (!options.includeCompleted) {
        filter.isCompleted = false;
        filter.isDismissed = false;
      }

      const recommendationsCollection = await this.db.getRecommendationsCollection();
      let query = recommendationsCollection.find(filter)
        .sort({ priority: -1, impactScore: -1, createdAt: -1 });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      return await query.toArray();
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  }

  async completeRecommendation(userId: string, recommendationId: string): Promise<void> {
    try {
      await this.db.connect();

      const recommendationsCollection = await this.db.getRecommendationsCollection();
      await recommendationsCollection.updateOne(
        { _id: recommendationId, userId },
        {
          $set: {
            isCompleted: true,
            completedAt: new Date(),
          }
        }
      );

      // Trigger recommendation refresh after completion
      await this.updateRecommendations(userId);
    } catch (error) {
      console.error('Error completing recommendation:', error);
      throw error;
    }
  }

  async dismissRecommendation(userId: string, recommendationId: string): Promise<void> {
    try {
      await this.db.connect();

      const recommendationsCollection = await this.db.getRecommendationsCollection();
      await recommendationsCollection.updateOne(
        { _id: recommendationId, userId },
        {
          $set: {
            isDismissed: true,
          }
        }
      );
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
      throw error;
    }
  }

  async completeActionItem(userId: string, recommendationId: string, actionItemId: string): Promise<void> {
    try {
      await this.db.connect();

      const recommendationsCollection = await this.db.getRecommendationsCollection();
      await recommendationsCollection.updateOne(
        { _id: recommendationId, userId, 'actionItems.id': actionItemId },
        {
          $set: {
            'actionItems.$.isCompleted': true,
          }
        }
      );

      // Check if all action items are completed
      const recommendation = await recommendationsCollection.findOne({
        _id: recommendationId,
        userId
      });

      if (recommendation) {
        const allCompleted = recommendation.actionItems.every(item => item.isCompleted);
        if (allCompleted) {
          await this.completeRecommendation(userId, recommendationId);
        }
      }
    } catch (error) {
      console.error('Error completing action item:', error);
      throw error;
    }
  }
}

export default RecommendationEngine;