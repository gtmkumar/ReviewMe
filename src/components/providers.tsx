'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import OfflineSupport from './offline-support';
import WebVitalsReporter from './web-vitals-reporter';
import { SkipLink } from './accessibility';
import OnboardingManager from './onboarding-manager';

interface ProvidersProps {
  children: React.ReactNode;
  session?: Session | null;
}

export function Providers({ children, session }: ProvidersProps) {
  const [queryClient] = useState(() => 
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          retry: (failureCount, error: any) => {
            // Don't retry on 4xx errors except 429 (rate limit)
            if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
              return false;
            }
            return failureCount < 3;
          },
          refetchOnWindowFocus: false,
          refetchOnMount: true,
        },
        mutations: {
          retry: (failureCount, error: any) => {
            // Don't retry mutations on 4xx errors
            if (error?.status >= 400 && error?.status < 500) {
              return false;
            }
            return failureCount < 2;
          },
        },
      },
    })
  );

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <SkipLink />
        {children}
        <OnboardingManager />
        <WebVitalsReporter />
        <OfflineSupport />
        <ReactQueryDevtools 
          initialIsOpen={false} 
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}