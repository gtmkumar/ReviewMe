'use client';

import { useEffect } from 'react';
import { PerformanceTracker } from '@/lib/performance';

export default function WebVitalsReporter() {
  useEffect(() => {
    const tracker = PerformanceTracker.getInstance();

    // Dynamic import to avoid SSR issues
    const loadWebVitals = async () => {
      try {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals');

        // Largest Contentful Paint
        getLCP((metric) => {
          tracker.trackWebVital({
            id: metric.id,
            name: 'LCP',
            value: metric.value,
            rating: tracker.getRating('LCP', metric.value),
            delta: metric.delta,
            navigationType: metric.navigationType,
          });
        });

        // First Input Delay
        getFID((metric) => {
          tracker.trackWebVital({
            id: metric.id,
            name: 'FID',
            value: metric.value,
            rating: tracker.getRating('FID', metric.value),
            delta: metric.delta,
            navigationType: metric.navigationType,
          });
        });

        // Cumulative Layout Shift
        getCLS((metric) => {
          tracker.trackWebVital({
            id: metric.id,
            name: 'CLS',
            value: metric.value,
            rating: tracker.getRating('CLS', metric.value),
            delta: metric.delta,
            navigationType: metric.navigationType,
          });
        });

        // First Contentful Paint
        getFCP((metric) => {
          tracker.trackWebVital({
            id: metric.id,
            name: 'FCP',
            value: metric.value,
            rating: tracker.getRating('FCP', metric.value),
            delta: metric.delta,
            navigationType: metric.navigationType,
          });
        });

        // Time to First Byte
        getTTFB((metric) => {
          tracker.trackWebVital({
            id: metric.id,
            name: 'TTFB',
            value: metric.value,
            rating: tracker.getRating('TTFB', metric.value),
            delta: metric.delta,
            navigationType: metric.navigationType,
          });
        });

        // Try to get INP if available (newer metric)
        if ('getINP' in await import('web-vitals')) {
          const { getINP } = await import('web-vitals');
          getINP((metric) => {
            tracker.trackWebVital({
              id: metric.id,
              name: 'INP',
              value: metric.value,
              rating: tracker.getRating('INP', metric.value),
              delta: metric.delta,
              navigationType: metric.navigationType,
            });
          });
        }
      } catch (error) {
        console.warn('Web Vitals library not available:', error);
      }
    };

    loadWebVitals();

    // Cleanup on unmount
    return () => {
      tracker.cleanup();
    };
  }, []);

  // This component doesn't render anything
  return null;
}