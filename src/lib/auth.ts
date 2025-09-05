import { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient, ObjectId } from 'mongodb';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import type { Adapter } from 'next-auth/adapters';

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI!);
const clientPromise = client.connect();

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as Adapter,
  providers: [
    // Email & Password Provider
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const db = (await clientPromise).db();
          const user = await db.collection('users').findOne({
            email: credentials.email.toLowerCase()
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.avatar,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    }),
    
    // GitHub OAuth Provider
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email public_repo'
        }
      }
    }),
    
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        }
      }
    })
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
        
        // Store GitHub data for integration
        if (account.provider === 'github' && profile) {
          token.github = {
            id: (profile as any).id,
            username: (profile as any).login,
            avatar_url: (profile as any).avatar_url
          };
        }
        
        // Store Google data
        if (account.provider === 'google' && profile) {
          token.google = {
            id: (profile as any).sub,
            picture: (profile as any).picture
          };
        }
      }
      
      return token;
    },
    
    async session({ session, token }) {
      // Send properties to client
      if (token && session.user) {
        (session.user as any).id = token.sub!;
        (session as any).accessToken = token.accessToken as string;
        (session as any).provider = token.provider as string;
        
        // Fetch publicUsername from database
        try {
          const db = (await clientPromise).db();
          const user = await db.collection('users').findOne({ _id: new ObjectId(token.sub!) });
          if (user && user.publicUsername) {
            (session.user as any).publicUsername = user.publicUsername;
          }
        } catch (error) {
          console.error('Error fetching publicUsername:', error);
        }
        
        if (token.github) {
          (session as any).github = token.github;
        }
        
        if (token.google) {
          (session as any).google = token.google;
        }
      }
      
      return session;
    },
    
    async signIn({ user, account, profile, email, credentials }) {
      // Allow OAuth sign-ins
      if (account?.provider !== 'credentials') {
        return true;
      }
      
      // For credentials, user must exist (handled in authorize)
      return !!user;
    },
    
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after sign in
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`;
      }
      
      // Allow relative callback URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      
      return baseUrl;
    }
  },
  
  events: {
    async signIn(message) {
      console.log('User signed in:', message.user.email);
      
      // Update last login time and first-time login status
      try {
        const db = (await clientPromise).db();
        const now = new Date();
        
        // Find user and update login timestamps
        const user = await db.collection('users').findOne({
          email: message.user.email?.toLowerCase()
        });
        
        if (user) {
          const updateData: any = {
            lastLoginAt: now,
            updatedAt: now
          };
          
          // If this is their first login, mark it as completed and set firstLoginAt
          if (user.isFirstTimeLogin) {
            updateData.isFirstTimeLogin = false;
            updateData.firstLoginAt = now;
          }
          
          await db.collection('users').updateOne(
            { email: message.user.email?.toLowerCase() },
            { $set: updateData }
          );
        }
      } catch (error) {
        console.error('Error updating login status:', error);
      }
    },
    
    async signOut(message) {
      console.log('User signed out');
    },
    
    async createUser(message) {
      console.log('New user created:', message.user.email);
      
      // Initialize user profile and preferences
      try {
        const db = (await clientPromise).db();
        
        await db.collection('profiles').insertOne({
          userId: message.user.id,
          profileScore: 0,
          lastAnalyzed: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await db.collection('preferences').insertOne({
          userId: message.user.id,
          theme: 'system',
          notifications: {
            email: true,
            push: true,
            weeklyDigest: true,
            blogUpdates: true,
            recommendations: true,
          },
          privacy: {
            profilePublic: false,
            analyticsOptOut: false,
            socialProfilesVisible: true,
            blogSharingEnabled: true,
          },
          personalization: {
            recommendationTypes: [],
            contentPreferences: [],
            dashboardLayout: 'detailed',
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
      } catch (error) {
        console.error('Error initializing user data:', error);
      }
    }
  },
  
  debug: process.env.NODE_ENV === 'development',
};