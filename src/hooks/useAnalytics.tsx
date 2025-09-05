import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

interface AnalyticsHookOptions {
  enabled?: boolean;
  trackPageViews?: boolean;
  trackClicks?: boolean;
  sessionTimeout?: number; // minutes
}

interface TrackEventParams {
  action: 'page_view' | 'button_click' | 'file_upload' | 'api_request' | 'navigation';
  element?: string;
  page?: string;
  metadata?: Record<string, any>;
}

export function useAnalytics(options: AnalyticsHookOptions = {}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const sessionIdRef = useRef<string>('');
  const pageStartTimeRef = useRef<number>(Date.now());
  const lastActivityRef = useRef<number>(Date.now());
  
  const {
    enabled = true,
    trackPageViews = true,
    trackClicks = true,
    sessionTimeout = 30
  } = options;

  // Generate or maintain session ID
  useEffect(() => {
    if (!enabled || !session?.user?.id) return;

    const now = Date.now();
    const lastActivity = lastActivityRef.current;
    const timeoutMs = sessionTimeout * 60 * 1000;

    // Check if session should be renewed (after timeout or first load)
    if (!sessionIdRef.current || (now - lastActivity) > timeoutMs) {
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    lastActivityRef.current = now;
  }, [enabled, session, sessionTimeout]);

  // Track page views
  useEffect(() => {
    if (!enabled || !trackPageViews || !session?.user?.id) return;

    const startTime = Date.now();
    pageStartTimeRef.current = startTime;

    // Track page entry
    trackEvent({
      action: 'page_view',
      page: pathname,
      metadata: {
        entryTime: startTime,
        userAgent: navigator.userAgent,
        referrer: document.referrer
      }
    });

    // Track page exit
    return () => {
      const duration = Date.now() - startTime;
      trackEvent({
        action: 'page_view',
        page: pathname,
        metadata: {
          duration,
          exitTime: Date.now()
        }
      });
    };
  }, [pathname, enabled, trackPageViews, session]);

  // Track API for sending events
  const trackEvent = useCallback(async (params: TrackEventParams) => {
    if (!enabled || !session?.user?.email || !sessionIdRef.current) return;

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          actionType: params.action,
          page: params.page || pathname,
          element: params.element,
          metadata: params.metadata
        })
      });

      lastActivityRef.current = Date.now();
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }, [enabled, session, pathname]);

  // Track button clicks
  const trackClick = useCallback((element: string, targetUrl?: string, metadata?: Record<string, any>) => {
    if (!trackClicks) return;
    
    trackEvent({
      action: 'button_click',
      element,
      metadata: {
        targetUrl,
        timestamp: Date.now(),
        ...metadata
      }
    });
  }, [trackEvent, trackClicks]);

  // Track file uploads
  const trackFileUpload = useCallback((fileName: string, fileSize: number, fileType: string) => {
    trackEvent({
      action: 'file_upload',
      metadata: {
        fileName,
        fileSize,
        fileType,
        timestamp: Date.now()
      }
    });
  }, [trackEvent]);

  // Track API requests
  const trackApiRequest = useCallback((endpoint: string, method: string, duration?: number, success?: boolean) => {
    trackEvent({
      action: 'api_request',
      metadata: {
        endpoint,
        method,
        duration,
        success,
        timestamp: Date.now()
      }
    });
  }, [trackEvent]);

  // Track navigation
  const trackNavigation = useCallback((from: string, to: string, method: 'click' | 'programmatic' = 'click') => {
    trackEvent({
      action: 'navigation',
      metadata: {
        from,
        to,
        method,
        timestamp: Date.now()
      }
    });
  }, [trackEvent]);

  // Track page views manually
  const trackPageView = useCallback((pageName?: string) => {
    trackEvent({
      action: 'page_view',
      page: pageName || pathname,
      metadata: {
        timestamp: Date.now(),
        pathname
      }
    });
  }, [trackEvent, pathname]);

  return {
    trackEvent,
    trackClick,
    trackFileUpload,
    trackApiRequest,
    trackNavigation,
    trackPageView,
    sessionId: sessionIdRef.current
  };
}

// Higher-order component for automatic click tracking
export function withAnalytics<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  elementName?: string
) {
  return function AnalyticsWrapper(props: T) {
    const { trackClick } = useAnalytics();
    
    const handleClick = useCallback((event: React.MouseEvent) => {
      const element = elementName || Component.displayName || Component.name || 'unknown';
      const target = event.currentTarget as HTMLElement;
      const targetUrl = target.getAttribute('href') || target.getAttribute('data-href');
      
      trackClick(element, targetUrl || undefined);
      
      // Call original onClick if it exists
      if (props.onClick) {
        props.onClick(event);
      }
    }, [props.onClick, trackClick]);

    return <Component {...props} onClick={handleClick} />;
  };
}

// Analytics provider component
export function AnalyticsProvider({ 
  children, 
  options = {} 
}: { 
  children: React.ReactNode;
  options?: AnalyticsHookOptions;
}) {
  useAnalytics(options);
  return <>{children}</>;
}

// Custom hooks for specific tracking scenarios
export function usePageAnalytics(pageName?: string) {
  const { trackEvent } = useAnalytics();
  const pathname = usePathname();
  
  useEffect(() => {
    const page = pageName || pathname;
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      trackEvent({
        action: 'page_view',
        page,
        metadata: { duration }
      });
    };
  }, [pageName, pathname, trackEvent]);
}

export function useFormAnalytics(formName: string) {
  const { trackEvent } = useAnalytics();
  
  const trackFormStart = useCallback(() => {
    trackEvent({
      action: 'button_click',
      element: `${formName}_start`,
      metadata: {
        formName,
        action: 'form_start'
      }
    });
  }, [formName, trackEvent]);
  
  const trackFormSubmit = useCallback((success: boolean, errors?: string[]) => {
    trackEvent({
      action: 'button_click',
      element: `${formName}_submit`,
      metadata: {
        formName,
        action: 'form_submit',
        success,
        errors
      }
    });
  }, [formName, trackEvent]);
  
  const trackFieldFocus = useCallback((fieldName: string) => {
    trackEvent({
      action: 'button_click',
      element: `${formName}_field_${fieldName}`,
      metadata: {
        formName,
        fieldName,
        action: 'field_focus'
      }
    });
  }, [formName, trackEvent]);
  
  return {
    trackFormStart,
    trackFormSubmit,
    trackFieldFocus
  };
}