'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import OnboardingPopup from './onboarding-popup';

export default function OnboardingManager() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    // Don't show onboarding on auth pages
    if (pathname?.startsWith('/auth')) {
      setIsLoading(false);
      return;
    }
    
    // Only check for authenticated users
    if (session?.user) {
      checkOnboardingStatus();
    } else {
      setIsLoading(false);
    }
  }, [session, status, pathname]);

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/onboarding');
      if (response.ok) {
        const data = await response.json();
        const isCompleted = data.onboardingData?.completed || false;
        
        // Also check user's first-time login status
        const userResponse = await fetch('/api/user/profile');
        let shouldShowOnboarding = false;
        if (userResponse.ok) {
          const userData = await userResponse.json();
          // Show onboarding if:
          // 1. Onboarding not completed AND
          // 2. (User is first-time login OR onboarding was never completed)
          shouldShowOnboarding = !isCompleted;
        }
        
        // Show onboarding popup if conditions are met and on dashboard
        if (shouldShowOnboarding && pathname?.startsWith('/dashboard')) {
          // Check if user has skipped onboarding recently
          const skipped = localStorage.getItem('onboarding_skipped');
          const skipTime = localStorage.getItem('onboarding_skip_time');
          
          // If skipped within last 24 hours, don't show again
          if (skipped && skipTime) {
            const skipTimestamp = parseInt(skipTime);
            const dayInMs = 24 * 60 * 60 * 1000;
            if (Date.now() - skipTimestamp < dayInMs) {
              setIsLoading(false);
              return;
            }
          }
          
          setShowOnboarding(true);
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Clear any skip flags
    localStorage.removeItem('onboarding_skipped');
    localStorage.removeItem('onboarding_skip_time');
    // Optionally refresh the page or update app state
    window.location.reload();
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    // Store that user skipped onboarding with timestamp
    localStorage.setItem('onboarding_skipped', 'true');
    localStorage.setItem('onboarding_skip_time', Date.now().toString());
  };

  // Don't show anything while loading, not authenticated, or on auth pages
  if (isLoading || !session?.user || pathname?.startsWith('/auth')) {
    return null;
  }

  return (
    <OnboardingPopup
      isOpen={showOnboarding}
      onClose={handleOnboardingClose}
      onComplete={handleOnboardingComplete}
    />
  );
}