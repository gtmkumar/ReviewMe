'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';

export function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (session) {
      setIsRedirecting(true);
      // Small delay to show the message
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
  }, [session, status, router]);

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show friendly message if user is already authenticated
  if (session && isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            You're Already Logged In!
          </h2>
          
          <p className="text-gray-600 mb-6">
            Welcome back, {session.user?.name}! We're redirecting you to your dashboard.
          </p>
          
          <div className="flex items-center justify-center text-blue-600 font-medium">
            <span>Redirecting to dashboard</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </div>
          
          <div className="mt-4">
            <div className="animate-pulse flex space-x-1 justify-center">
              <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse delay-75"></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show the auth page if user is not authenticated
  return <>{children}</>;
}