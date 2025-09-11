# ReviewMe Development Guide

A comprehensive step-by-step guide for adding components, routes, APIs, security, and features to the ReviewMe platform.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Adding API Routes](#adding-api-routes)
4. [Creating Components](#creating-components)
5. [Database Integration](#database-integration)
6. [Authentication & Security](#authentication--security)
7. [Service Layer Implementation](#service-layer-implementation)
8. [Frontend Pages & Routing](#frontend-pages--routing)
9. [Testing Strategy](#testing-strategy)
10. [Performance & PWA](#performance--pwa)
11. [Deployment & Configuration](#deployment--configuration)

---

## Project Overview

### Technology Stack
- **Frontend**: Next.js 15 + React 18 + TypeScript
- **Backend**: Next.js API Routes + Express.js Server
- **Database**: MongoDB with custom ODM
- **Authentication**: NextAuth.js (Credentials, GitHub, Google)
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand + TanStack Query
- **Testing**: Jest + Playwright + Testing Library
- **PWA**: next-pwa with Workbox

### Core Features
- Multi-step onboarding system
- GitHub/LinkedIn/Resume analysis
- Credit-based economy with referrals
- Advanced analytics dashboard
- Blog content aggregation
- Real-time notifications
- Public profile pages

---

## Architecture Patterns

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── auth/          # Authentication routes
│   │   ├── credits/       # Credit management
│   │   ├── linkedin/      # LinkedIn analysis
│   │   ├── github/        # GitHub analysis
│   │   ├── resume/        # Resume analysis
│   │   └── analytics/     # Analytics endpoints
│   ├── dashboard/         # Protected dashboard pages
│   │   ├── linkedin/      # LinkedIn service pages
│   │   ├── github/        # GitHub service pages
│   │   ├── resume/        # Resume service pages
│   │   └── settings/      # User settings
│   ├── auth/              # Authentication pages
│   └── u/[username]/      # Public profile pages
├── components/            # Reusable React components
├── lib/                   # Core services and utilities
│   ├── database.ts        # Database manager
│   ├── services.ts        # Business logic services
│   ├── auth.ts           # Authentication configuration
│   └── security.ts       # Security utilities
├── types/                 # TypeScript definitions
└── hooks/                 # Custom React hooks
```

### Service Layer Pattern
```typescript
// Core Services Architecture
- CreditService: Credit management and validation
- RequestLogService: Request/response tracking  
- AnalyticsService: User activity monitoring
- ReferralService: Referral code management
- ValidationService: Input validation
- BlogService: Content aggregation
```

---

## Adding API Routes

### Step 1: Create API Route File

Create a new file in `src/app/api/[feature]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDbManager } from '@/lib/database';
import { z } from 'zod';

// Validation schema
const requestSchema = z.object({
  // Define your request schema here
});

// GET handler
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get database connection
    const db = getDbManager();
    await db.connect();

    // 3. Extract query parameters
    const { searchParams } = new URL(request.url);
    const param = searchParams.get('param');

    // 4. Business logic
    // Your implementation here

    // 5. Return response
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    // 3. Get database connection
    const db = getDbManager();
    await db.connect();

    // 4. Business logic with services
    // Example: Credit check and deduction
    const creditCheck = await CreditService.checkAndDeductCredits(
      session.user.id,
      'your_service_type',
      validatedData
    );

    if (!creditCheck.success) {
      return NextResponse.json(
        { error: creditCheck.error },
        { status: 400 }
      );
    }

    // 5. Process request
    // Your implementation here

    // 6. Log response
    await RequestLogService.logResponse(
      session.user.id,
      creditCheck.requestId!,
      'your_service_type',
      result
    );

    // 7. Return response
    return NextResponse.json({
      success: true,
      data: result,
      creditsUsed: creditCheck.creditsDeducted,
      remainingCredits: creditCheck.remainingCredits
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

### Step 2: Add Route Security

For protected routes, always include:

```typescript
// Authentication middleware
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Rate limiting (if needed)
// Implement rate limiting logic

// Input validation
const validatedData = requestSchema.parse(body);

// CSRF protection (for state-changing operations)
if (['POST', 'PUT', 'DELETE'].includes(request.method || '')) {
  const csrfToken = request.headers.get('x-csrf-token');
  // Validate CSRF token
}
```

---

## Creating Components

### Step 1: Component Structure

Create components in `src/components/[component-name].tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';

// Component props interface
interface ComponentProps {
  className?: string;
  // Add your props here
}

export function ComponentName({ className, ...props }: ComponentProps) {
  // 1. Hooks
  const { data: session } = useSession();
  const { trackButtonClick } = useAnalytics();
  const [state, setState] = useState();

  // 2. Effects
  useEffect(() => {
    // Component initialization
  }, []);

  // 3. Event handlers
  const handleAction = async () => {
    // Track user interaction
    trackButtonClick('component-action', 'component-name');
    
    try {
      // Your logic here
    } catch (error) {
      console.error('Component error:', error);
    }
  };

  // 4. Render
  return (
    <div className={cn('base-styles', className)}>
      {/* Component content */}
    </div>
  );
}

export default ComponentName;
```

### Step 2: Component Patterns

#### Dashboard Components
```typescript
// Dashboard components should include navigation
import { DashboardNavigation } from '@/components/dashboard-navigation';

export function DashboardComponent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Component content */}
      </main>
    </div>
  );
}
```

#### Form Components
```typescript
// Form components with validation
import { z } from 'zod';
import { ValidationService } from '@/lib/validation-service';

const formSchema = z.object({
  // Define form schema
});

export function FormComponent() {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = formSchema.parse(formData);
      // Submit form
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(ValidationService.formatZodErrors(error));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

---

## Database Integration

### Step 1: Define Document Interface

Add new document interfaces to `src/lib/database.ts`:

```typescript
export interface YourDocument {
  _id?: string;
  userId: string;
  // Add your fields here
  createdAt: Date;
  updatedAt: Date;
}
```

### Step 2: Add Collection Getter

Add collection getter to DatabaseManager class:

```typescript
// Synchronous getter (use sparingly)
get yourCollection(): Collection<YourDocument> {
  if (!this.db) {
    throw new Error('Database not connected');
  }
  return this.db.collection<YourDocument>('your_collection');
}

// Async getter (preferred)
async getYourCollection(): Promise<Collection<YourDocument>> {
  const db = await this.getDb();
  return db.collection<YourDocument>('your_collection');
}
```

### Step 3: Create Database Indexes

Add indexes in the `createIndexes` method:

```typescript
private async createIndexes(): Promise<void> {
  try {
    const db = await this.getDb();
    
    // Add your indexes
    await db.collection('your_collection').createIndex(
      { userId: 1, createdAt: -1 },
      { background: true }
    );
    
    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}
```

### Step 4: Use in Services

```typescript
// In your service class
export class YourService {
  static async createRecord(userId: string, data: any): Promise<string> {
    const db = getDbManager();
    await db.connect();
    const collection = await db.getYourCollection();
    
    const document: YourDocument = {
      userId,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(document);
    return result.insertedId.toString();
  }
}
```

---

## Authentication & Security

### Step 1: NextAuth Configuration

The authentication is configured in `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Credential validation logic
      }
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, account }) {
      // JWT customization
    },
    async session({ session, token }) {
      // Session customization
    }
  }
};
```

### Step 2: Middleware Protection

The middleware in `middleware.ts` handles route protection:

```typescript
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  async function middleware(req: NextRequest) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
    const isPublicPage = publicPages.includes(req.nextUrl.pathname);

    // Route protection logic
    if (isAuth && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (!isAuth && !isPublicPage && !isAuthPage) {
      const loginUrl = new URL('/auth/signin', req.url);
      loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);
```

### Step 3: Security Headers

Security headers are configured in `next.config.mjs`:

```javascript
async headers() {
  return [
    {
      source: '/api/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ];
}
```

---

## Service Layer Implementation

### Step 1: Create Service Class

Add new services to `src/lib/services.ts`:

```typescript
export class YourService {
  static async performAction(
    userId: string,
    data: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // 1. Get database connection
      const db = getDbManager();
      await db.connect();
      
      // 2. Validate input
      // Add validation logic
      
      // 3. Business logic
      // Your implementation here
      
      // 4. Log activity
      await AnalyticsService.trackActivity(
        userId,
        'session-id',
        'api_request',
        { service: 'your_service', action: 'perform_action' }
      );
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
```

### Step 2: Service Patterns

#### Credit-Based Services
```typescript
export class CreditBasedService {
  static async performPaidAction(
    userId: string,
    serviceType: ServiceType,
    payload: any
  ): Promise<ServiceResult> {
    // 1. Check and deduct credits
    const creditCheck = await CreditService.checkAndDeductCredits(
      userId,
      serviceType,
      payload
    );
    
    if (!creditCheck.success) {
      return { success: false, error: creditCheck.error };
    }
    
    try {
      // 2. Perform the actual service
      const result = await this.executeService(payload);
      
      // 3. Log successful response
      await RequestLogService.logResponse(
        userId,
        creditCheck.requestId!,
        serviceType,
        result
      );
      
      return {
        success: true,
        data: result,
        requestId: creditCheck.requestId,
        creditsUsed: creditCheck.creditsDeducted,
        remainingCredits: creditCheck.remainingCredits
      };
    } catch (error) {
      // 4. Update request status on failure
      await RequestLogService.updateRequestStatus(
        creditCheck.requestId!,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw error;
    }
  }
}
```

---

## Frontend Pages & Routing

### Step 1: Create Page Component

Create pages in `src/app/[route]/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function YourPage() {
  // 1. Hooks
  const { data: session, status } = useSession();
  const router = useRouter();
  const { trackPageView } = useAnalytics();
  
  // 2. State
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  
  // 3. Effects
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    // Track page view
    trackPageView('/your-page');
    
    // Load page data
    loadPageData();
  }, [session, status]);
  
  // 4. Data loading
  const loadPageData = async () => {
    try {
      const response = await fetch('/api/your-endpoint');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 5. Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // 6. Render
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page content */}
      </main>
    </div>
  );
}
```

### Step 2: Route Protection

For protected routes, use the AuthRouteGuard component:

```typescript
import { AuthRouteGuard } from '@/components/auth-route-guard';

export default function ProtectedPage() {
  return (
    <AuthRouteGuard>
      {/* Your page content */}
    </AuthRouteGuard>
  );
}
```

### Step 3: Dynamic Routes

For dynamic routes like `[id]` or `[username]`:

```typescript
// src/app/u/[username]/page.tsx
interface PageProps {
  params: { username: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function PublicProfilePage({ params, searchParams }: PageProps) {
  const { username } = params;
  
  useEffect(() => {
    // Load user profile by username
    loadUserProfile(username);
  }, [username]);
  
  // Component implementation
}
```

---

## Testing Strategy

### Step 1: Unit Tests

Create tests in `src/lib/__tests__/` or `src/components/__tests__/`:

```typescript
// src/lib/__tests__/services.test.ts
import { CreditService } from '../services';
import { getDbManager } from '../database';

// Mock database
jest.mock('../database');

describe('CreditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('getUserCredits', () => {
    it('should return user credits', async () => {
      // Mock implementation
      const mockDb = {
        connect: jest.fn(),
        getUsersCollection: jest.fn().mockResolvedValue({
          findOne: jest.fn().mockResolvedValue({ credits: 100 })
        })
      };
      
      (getDbManager as jest.Mock).mockReturnValue(mockDb);
      
      const credits = await CreditService.getUserCredits('user-id');
      expect(credits).toBe(100);
    });
  });
});
```

### Step 2: Component Tests

```typescript
// src/components/__tests__/component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import YourComponent from '../your-component';

const mockSession = {
  user: { id: '1', email: 'test@example.com' },
  expires: '2024-01-01'
};

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <SessionProvider session={mockSession}>
    {children}
  </SessionProvider>
);

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />, { wrapper: Wrapper });
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('should handle user interaction', async () => {
    render(<YourComponent />, { wrapper: Wrapper });
    
    const button = screen.getByRole('button', { name: 'Action Button' });
    fireEvent.click(button);
    
    // Assert expected behavior
  });
});
```

### Step 3: E2E Tests

```typescript
// e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login or setup
    await page.goto('/auth/signin');
    // Perform login
  });
  
  test('should complete user flow', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test user interactions
    await page.click('[data-testid="feature-button"]');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

---

## Performance & PWA

### Step 1: PWA Configuration

The PWA is configured in `next.config.mjs`:

```javascript
const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
      },
    },
    {
      urlPattern: /\/api\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 2, // 2 minutes
        },
      },
    },
  ],
  disable: process.env.NODE_ENV === 'development',
});
```

### Step 2: Performance Monitoring

```typescript
// src/components/web-vitals-reporter.tsx
import { useEffect } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export default function WebVitalsReporter() {
  useEffect(() => {
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  }, []);
  
  return null;
}
```

### Step 3: Image Optimization

```typescript
import Image from 'next/image';

// Use Next.js Image component for optimization
<Image
  src="/path/to/image.jpg"
  alt="Description"
  width={500}
  height={300}
  priority // For above-the-fold images
  placeholder="blur" // Optional blur placeholder
/>
```

---

## Deployment & Configuration

### Step 1: Environment Variables

Create `.env.local` file:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/reviewme

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# OAuth Providers
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# External APIs
REDACT_AI_API_KEY=your-redact-ai-key
```

### Step 2: Build Configuration

```json
// package.json scripts
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:e2e": "playwright test",
    "analyze": "ANALYZE=true next build"
  }
}
```

### Step 3: Production Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Best Practices Summary

### Code Organization
1. **Separation of Concerns**: Keep business logic in services, UI in components
2. **Type Safety**: Use TypeScript interfaces for all data structures
3. **Error Handling**: Implement comprehensive error handling at all levels
4. **Validation**: Validate all inputs using Zod schemas
5. **Security**: Always authenticate and authorize API requests

### Performance
1. **Database**: Use proper indexing and async collection getters
2. **Caching**: Implement appropriate caching strategies
3. **Images**: Use Next.js Image component for optimization
4. **Bundle**: Monitor and optimize bundle size
5. **PWA**: Leverage service workers for offline functionality

### Testing
1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test API endpoints and database interactions
3. **E2E Tests**: Test complete user workflows
4. **Coverage**: Maintain good test coverage (70%+ target)

### Security
1. **Authentication**: Use NextAuth.js for secure authentication
2. **Authorization**: Implement proper role-based access control
3. **Input Validation**: Validate and sanitize all inputs
4. **Headers**: Set appropriate security headers
5. **HTTPS**: Always use HTTPS in production

This guide provides a comprehensive foundation for developing features in the ReviewMe platform. Follow these patterns and practices to maintain consistency and quality across the codebase.