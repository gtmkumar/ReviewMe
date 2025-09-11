import { getDbManager, NotificationDocument } from './database';
import nodemailer from 'nodemailer';

export interface NotificationOptions {
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'recommendation' | 'milestone' | 'digest';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  expiresAt?: Date;
}

export interface EmailDigestData {
  user: {
    name: string;
    email: string;
  };
  weeklyStats: {
    profileScore: number;
    scoreChange: number;
    completedRecommendations: number;
    newRecommendations: number;
  };
  highlights: {
    topAchievement?: string;
    improvedAreas: string[];
    nextSteps: string[];
  };
  recommendations: Array<{
    title: string;
    priority: string;
    impactScore: number;
  }>;
}

export class NotificationService {
  private db = getDbManager();
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }

  async createNotification(options: NotificationOptions): Promise<string> {
    try {
      await this.db.connect();

      const notification: NotificationDocument = {
        userId: options.userId,
        type: options.type,
        category: options.category,
        title: options.title,
        message: options.message,
        actionUrl: options.actionUrl,
        actionText: options.actionText,
        isRead: false,
        createdAt: new Date(),
        expiresAt: options.expiresAt,
      };

      const notificationsCollection = await this.db.getNotificationsCollection();
      const result = await notificationsCollection.insertOne(notification);
      
      // Send push notification if user has enabled it
      await this.sendPushNotification(options.userId, notification);

      return result.insertedId.toString();
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getUserNotifications(
    userId: string, 
    options: {
      limit?: number;
      unreadOnly?: boolean;
      category?: string;
    } = {}
  ): Promise<NotificationDocument[]> {
    try {
      await this.db.connect();

      const filter: any = { userId };
      
      if (options.unreadOnly) {
        filter.isRead = false;
      }
      
      if (options.category) {
        filter.category = options.category;
      }

      // Filter out expired notifications
      filter.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ];

      const notificationsCollection = await this.db.getNotificationsCollection();
      let query = notificationsCollection
        .find(filter)
        .sort({ createdAt: -1 });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      return await query.toArray();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markNotificationRead(userId: string, notificationId: string): Promise<void> {
    try {
      await this.db.connect();

      const notificationsCollection = await this.db.getNotificationsCollection();
      await notificationsCollection.updateOne(
        { _id: notificationId, userId },
        { $set: { isRead: true } }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    try {
      await this.db.connect();

      const notificationsCollection = await this.db.getNotificationsCollection();
      await notificationsCollection.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } }
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteExpiredNotifications(): Promise<void> {
    try {
      await this.db.connect();

      const notificationsCollection = await this.db.getNotificationsCollection();
      const result = await notificationsCollection.deleteMany({
        expiresAt: { $lte: new Date() }
      });

      console.log(`Deleted ${result.deletedCount} expired notifications`);
    } catch (error) {
      console.error('Error deleting expired notifications:', error);
    }
  }

  // Push Notification Methods
  private async sendPushNotification(userId: string, notification: NotificationDocument): Promise<void> {
    try {
      // Get user preferences
      await this.db.connect();
      const preferencesCollection = await this.db.getPreferencesCollection();
      const preferences = await preferencesCollection.findOne({ userId });
      
      if (!preferences?.notifications?.push) {
        return; // User has disabled push notifications
      }

      // In a real implementation, you would:
      // 1. Get the user's push subscription from the database
      // 2. Use web-push library to send the notification
      // 3. Handle any errors or invalid subscriptions

      // For now, we'll just log that a push notification would be sent
      console.log(`Push notification would be sent to user ${userId}: ${notification.title}`);
      
      // Example push notification payload:
      const payload = {
        title: notification.title,
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: {
          url: notification.actionUrl || '/dashboard',
          notificationId: notification._id,
        },
        actions: notification.actionUrl ? [
          {
            action: 'view',
            title: notification.actionText || 'View',
          }
        ] : [],
      };

      // This would be implemented with web-push library
      // await webpush.sendNotification(subscription, JSON.stringify(payload));
      
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Email Notification Methods
  async sendEmailNotification(
    userId: string, 
    subject: string, 
    htmlContent: string, 
    textContent?: string
  ): Promise<void> {
    try {
      // Get user email from database
      const usersCollection = await this.db.getUsersCollection();
      const user = await usersCollection.findOne({ _id: userId });
      if (!user?.email) {
        throw new Error('User email not found');
      }

      // Get user preferences
      const preferencesCollection = await this.db.getPreferencesCollection();
      const preferences = await preferencesCollection.findOne({ userId });
      if (!preferences?.notifications?.email) {
        return; // User has disabled email notifications
      }

      const mailOptions = {
        from: `"ReviewMe" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent),
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Email sent to ${user.email}: ${subject}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
      throw error;
    }
  }

  async sendWeeklyDigest(userId: string): Promise<void> {
    try {
      // Get user data for digest
      const digestData = await this.generateWeeklyDigestData(userId);
      
      if (!digestData) {
        console.log(`No digest data available for user ${userId}`);
        return;
      }

      const subject = `Your Weekly Profile Review - Score: ${digestData.weeklyStats.profileScore}`;
      const htmlContent = this.generateDigestEmailHTML(digestData);
      
      await this.sendEmailNotification(userId, subject, htmlContent);
      
      // Create a notification about the digest being sent
      await this.createNotification({
        userId,
        type: 'info',
        category: 'digest',
        title: 'Weekly digest sent',
        message: 'Your weekly profile review has been sent to your email.',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire in 1 week
      });
    } catch (error) {
      console.error('Error sending weekly digest:', error);
      throw error;
    }
  }

  private async generateWeeklyDigestData(userId: string): Promise<EmailDigestData | null> {
    try {
      await this.db.connect();

      const usersCollection = await this.db.getUsersCollection();
      const profilesCollection = await this.db.getProfilesCollection();
      const preferencesCollection = await this.db.getPreferencesCollection();
      
      const user = await usersCollection.findOne({ _id: userId });
      const profile = await profilesCollection.findOne({ userId });
      const preferences = await preferencesCollection.findOne({ userId });

      if (!user || !preferences?.notifications?.weeklyDigest) {
        return null;
      }

      // Get analytics from the past week
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const analytics = await this.db.analytics
        .find({ userId, date: { $gte: oneWeekAgo } })
        .sort({ date: -1 })
        .toArray();

      // Get recommendations
      const recommendations = await this.db.recommendations
        .find({ 
          userId, 
          isCompleted: false, 
          isDismissed: false 
        })
        .sort({ priority: -1, impactScore: -1 })
        .limit(5)
        .toArray();

      // Get completed recommendations from the past week
      const completedRecommendations = await this.db.recommendations
        .find({
          userId,
          isCompleted: true,
          completedAt: { $gte: oneWeekAgo }
        })
        .toArray();

      // Calculate score change
      const currentScore = profile?.profileScore || 0;
      const previousScore = analytics.length > 1 ? analytics[analytics.length - 1].scores.overall : currentScore;
      const scoreChange = currentScore - previousScore;

      // Determine improved areas
      const improvedAreas: string[] = [];
      if (profile?.github?.score?.overall > 70) improvedAreas.push('GitHub Activity');
      if (profile?.resume?.score?.overall > 80) improvedAreas.push('Resume Quality');
      if (profile?.linkedin?.score?.overall > 70) improvedAreas.push('LinkedIn Profile');

      // Generate next steps
      const nextSteps = recommendations
        .slice(0, 3)
        .map(rec => rec.title);

      return {
        user: {
          name: user.name || 'Professional',
          email: user.email,
        },
        weeklyStats: {
          profileScore: currentScore,
          scoreChange,
          completedRecommendations: completedRecommendations.length,
          newRecommendations: recommendations.length,
        },
        highlights: {
          topAchievement: scoreChange > 5 ? `Improved profile score by ${scoreChange} points!` : undefined,
          improvedAreas,
          nextSteps,
        },
        recommendations: recommendations.map(rec => ({
          title: rec.title,
          priority: rec.priority,
          impactScore: rec.impactScore,
        })),
      };
    } catch (error) {
      console.error('Error generating weekly digest data:', error);
      return null;
    }
  }

  private generateDigestEmailHTML(data: EmailDigestData): string {
    const scoreChangeIcon = data.weeklyStats.scoreChange > 0 ? '📈' : 
                           data.weeklyStats.scoreChange < 0 ? '📉' : '➡️';
    
    const scoreChangeText = data.weeklyStats.scoreChange > 0 ? 
      `+${data.weeklyStats.scoreChange} points this week` :
      data.weeklyStats.scoreChange < 0 ?
      `${data.weeklyStats.scoreChange} points this week` :
      'No change this week';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Profile Review</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
        }
        .header { 
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
            color: white; 
            padding: 30px; 
            border-radius: 10px; 
            text-align: center; 
            margin-bottom: 30px;
        }
        .score { 
            font-size: 48px; 
            font-weight: bold; 
            margin: 10px 0;
        }
        .card { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 20px; 
            margin-bottom: 20px;
        }
        .highlight { 
            background: #10b981; 
            color: white; 
            padding: 10px 15px; 
            border-radius: 6px; 
            margin: 10px 0;
        }
        .recommendation { 
            border-left: 4px solid #2563eb; 
            padding-left: 15px; 
            margin: 15px 0;
        }
        .priority-high { border-left-color: #ef4444; }
        .priority-medium { border-left-color: #f59e0b; }
        .priority-low { border-left-color: #10b981; }
        .footer { 
            text-align: center; 
            color: #64748b; 
            padding-top: 30px; 
            border-top: 1px solid #e2e8f0; 
            margin-top: 30px;
        }
        .btn { 
            display: inline-block; 
            background: #2563eb; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Weekly Profile Review</h1>
        <div class="score">${data.weeklyStats.profileScore}</div>
        <p>${scoreChangeIcon} ${scoreChangeText}</p>
    </div>

    <div class="card">
        <h2>Hello ${data.user.name}! 👋</h2>
        <p>Here's your weekly professional profile summary:</p>
        
        <ul>
            <li><strong>Profile Score:</strong> ${data.weeklyStats.profileScore}/100</li>
            <li><strong>Completed Tasks:</strong> ${data.weeklyStats.completedRecommendations} this week</li>
            <li><strong>New Recommendations:</strong> ${data.weeklyStats.newRecommendations} available</li>
        </ul>
    </div>

    ${data.highlights.topAchievement ? `
    <div class="highlight">
        🎉 <strong>Top Achievement:</strong> ${data.highlights.topAchievement}
    </div>
    ` : ''}

    ${data.highlights.improvedAreas.length > 0 ? `
    <div class="card">
        <h3>📊 Areas of Improvement</h3>
        <ul>
            ${data.highlights.improvedAreas.map(area => `<li>${area}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${data.highlights.nextSteps.length > 0 ? `
    <div class="card">
        <h3>🎯 Recommended Next Steps</h3>
        <ul>
            ${data.highlights.nextSteps.map(step => `<li>${step}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${data.recommendations.length > 0 ? `
    <div class="card">
        <h3>💡 Top Recommendations</h3>
        ${data.recommendations.map(rec => `
            <div class="recommendation priority-${rec.priority}">
                <strong>${rec.title}</strong>
                <br>
                <small>Impact Score: ${rec.impactScore} | Priority: ${rec.priority.toUpperCase()}</small>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" class="btn">
            View Full Dashboard
        </a>
    </div>

    <div class="footer">
        <p>Keep building your professional profile! 🚀</p>
        <p>
            <a href="${process.env.NEXTAUTH_URL}/dashboard/settings">Update Preferences</a> | 
            <a href="${process.env.NEXTAUTH_URL}/dashboard">ReviewMe Dashboard</a>
        </p>
        <p><small>© 2025 ReviewMe. All rights reserved.</small></p>
    </div>
</body>
</html>
    `;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  // Milestone Notifications
  async checkAndCreateMilestoneNotifications(userId: string): Promise<void> {
    try {
      const profilesCollection = await this.db.getProfilesCollection();
      const profile = await profilesCollection.findOne({ userId });
      if (!profile) return;

      const currentScore = profile.profileScore || 0;
      const milestones = [
        { score: 25, title: 'Getting Started!', message: 'You\'ve taken your first steps toward profile optimization!' },
        { score: 50, title: 'Halfway There!', message: 'Your profile is 50% optimized. Keep up the great work!' },
        { score: 75, title: 'Excellent Progress!', message: 'Your profile is looking professional. Almost there!' },
        { score: 90, title: 'Outstanding Profile!', message: 'Your profile is in the top tier. Impressive work!' },
        { score: 100, title: 'Perfect Score!', message: 'Congratulations! You\'ve achieved a perfect profile score!' },
      ];

      for (const milestone of milestones) {
        if (currentScore >= milestone.score) {
          // Check if we've already sent this milestone notification
          const notificationsCollection = await this.db.getNotificationsCollection();
          const existingNotification = await notificationsCollection.findOne({
            userId,
            category: 'milestone',
            title: milestone.title,
          });

          if (!existingNotification) {
            await this.createNotification({
              userId,
              type: 'success',
              category: 'milestone',
              title: milestone.title,
              message: milestone.message,
              actionUrl: '/dashboard',
              actionText: 'View Dashboard',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking milestone notifications:', error);
    }
  }

  // Scheduled Tasks
  async sendScheduledNotifications(): Promise<void> {
    try {
      console.log('Running scheduled notification tasks...');

      // Clean up expired notifications
      await this.deleteExpiredNotifications();

      // Send weekly digests (run on Sundays)
      const today = new Date();
      if (today.getDay() === 0) { // Sunday
        await this.sendWeeklyDigestsToAllUsers();
      }

      console.log('Scheduled notification tasks completed');
    } catch (error) {
      console.error('Error in scheduled notification tasks:', error);
    }
  }

  private async sendWeeklyDigestsToAllUsers(): Promise<void> {
    try {
      // Get all users who have weekly digest enabled
      const preferencesCollection = await this.db.getPreferencesCollection();
      const users = await preferencesCollection
        .find({ 'notifications.weeklyDigest': true })
        .toArray();

      console.log(`Sending weekly digests to ${users.length} users`);

      for (const userPrefs of users) {
        try {
          await this.sendWeeklyDigest(userPrefs.userId);
        } catch (error) {
          console.error(`Error sending digest to user ${userPrefs.userId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error sending weekly digests:', error);
    }
  }
}

export default NotificationService;