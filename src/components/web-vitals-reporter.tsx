'use client';

import { useEffect } from 'react';
import { PerformanceTracker } from '@/lib/performance';

export default function WebVitalsReporter() {
  useEffect(() => {
    const tracker = PerformanceTracker.getInstance();

    // Dynamic import to avoid SSR issues
    const loadWebVitals = async () => {
      try {
        const webVitals = await import('web-vitals');
        const { onCLS, onFID, onFCP, onLCP, onTTFB } = webVitals;

        // Largest Contentful Paint
        onLCP((metric) => {
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
        onFID((metric) => {
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
        onCLS((metric) => {
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
        onFCP((metric) => {
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
        onTTFB((metric) => {
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
        try {
          const { onINP } = webVitals;
          if (onINP) {
            onINP((metric) => {
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
        } catch (inpError) {
          // INP not available in this version, continue without it
          console.debug('INP metric not available in this web-vitals version');
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