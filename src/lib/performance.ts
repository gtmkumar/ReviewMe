// Performance monitoring and optimization utilities

export interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
}

export interface PerformanceMetrics {
  lcp?: WebVitalsMetric; // Largest Contentful Paint
  fid?: WebVitalsMetric; // First Input Delay
  cls?: WebVitalsMetric; // Cumulative Layout Shift
  fcp?: WebVitalsMetric; // First Contentful Paint
  ttfb?: WebVitalsMetric; // Time to First Byte
  inp?: WebVitalsMetric; // Interaction to Next Paint
}

// Core Web Vitals thresholds
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

export class PerformanceTracker {
  private static instance: PerformanceTracker;
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
  }

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Observe Long Tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackLongTask(entry as PerformanceEntry & { duration: number });
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported');
      }

      // Observe Navigation
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackNavigation(entry as PerformanceNavigationTiming);
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (error) {
        console.warn('Navigation observer not supported');
      }

      // Observe Resource Loading
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackResource(entry as PerformanceResourceTiming);
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported');
      }
    }
  }

  private trackLongTask(entry: PerformanceEntry & { duration: number }): void {
    // Track tasks longer than 50ms
    if (entry.duration > 50) {
      console.warn(`Long task detected: ${entry.duration}ms`);
      this.sendAnalytics('long-task', {
        duration: entry.duration,
        startTime: entry.startTime,
      });
    }
  }

  private trackNavigation(entry: PerformanceNavigationTiming): void {
    const metrics = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      ssl: entry.connectEnd - entry.secureConnectionStart,
      ttfb: entry.responseStart - entry.requestStart,
      download: entry.responseEnd - entry.responseStart,
      domParse: entry.domContentLoadedEventStart - entry.responseEnd,
      domReady: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      onLoad: entry.loadEventEnd - entry.loadEventStart,
    };

    this.sendAnalytics('navigation', metrics);
  }

  private trackResource(entry: PerformanceResourceTiming): void {
    // Track slow resources (>1s)
    const duration = entry.responseEnd - entry.startTime;
    if (duration > 1000) {
      console.warn(`Slow resource: ${entry.name} (${duration}ms)`);
      this.sendAnalytics('slow-resource', {
        name: entry.name,
        duration,
        size: entry.transferSize,
      });
    }
  }

  trackWebVital(metric: WebVitalsMetric): void {
    this.metrics[metric.name.toLowerCase() as keyof PerformanceMetrics] = metric;
    
    // Send to analytics
    this.sendAnalytics('web-vital', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    });

    // Log poor metrics
    if (metric.rating === 'poor') {
      console.warn(`Poor ${metric.name}: ${metric.value}`);
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = WEB_VITALS_THRESHOLDS[metric.toUpperCase() as keyof typeof WEB_VITALS_THRESHOLDS];
    if (!thresholds) return 'good';

    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  private sendAnalytics(event: string, data: any): void {
    // Send to your analytics service
    try {
      if (process.env.NODE_ENV === 'production') {
        // Replace with your analytics service
        fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, data, timestamp: Date.now() }),
        }).catch(() => {
          // Silently fail for analytics
        });
      }
    } catch (error) {
      // Silently fail for analytics
    }
  }

  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Image optimization utilities
export class ImageOptimizer {
  static getOptimizedImageUrl(
    src: string,
    width: number,
    height?: number,
    quality = 80
  ): string {
    if (!src) return '';

    // For Next.js Image optimization
    const params = new URLSearchParams({
      url: src,
      w: width.toString(),
      q: quality.toString(),
    });

    if (height) {
      params.set('h', height.toString());
    }

    return `/_next/image?${params.toString()}`;
  }

  static generateSrcSet(src: string, sizes: number[]): string {
    return sizes
      .map(size => `${this.getOptimizedImageUrl(src, size)} ${size}w`)
      .join(', ');
  }

  static generateSizes(breakpoints: { [key: string]: number }): string {
    return Object.entries(breakpoints)
      .map(([media, size]) => `${media} ${size}px`)
      .join(', ');
  }
}

// Font optimization utilities
export class FontOptimizer {
  static preloadFonts(fonts: string[]): void {
    if (typeof document === 'undefined') return;

    fonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = font;
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  static loadFontFace(
    family: string,
    src: string,
    descriptors?: FontFaceDescriptors
  ): Promise<FontFace> {
    const fontFace = new FontFace(family, `url(${src})`, descriptors);
    document.fonts.add(fontFace);
    return fontFace.load();
  }
}

// Lazy loading utilities
export class LazyLoader {
  private static observer: IntersectionObserver | null = null;

  static createObserver(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver {
    const defaultOptions: IntersectionObserverInit = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    };

    return new IntersectionObserver(callback, defaultOptions);
  }

  static observeElement(
    element: Element,
    callback: (entry: IntersectionObserverEntry) => void
  ): void {
    if (!this.observer) {
      this.observer = this.createObserver((entries) => {
        entries.forEach(callback);
      });
    }

    this.observer.observe(element);
  }

  static unobserveElement(element: Element): void {
    if (this.observer) {
      this.observer.unobserve(element);
    }
  }

  static disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Bundle analyzer utilities
export class BundleAnalyzer {
  static measureBundleSize(name: string): void {
    if (typeof window === 'undefined') return;

    const startTime = performance.now();
    
    // This would be called when a chunk loads
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes(name)) {
          const loadTime = performance.now() - startTime;
          console.log(`Bundle ${name} loaded in ${loadTime}ms`);
          observer.disconnect();
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  static logBundleInfo(): void {
    if (typeof window === 'undefined') return;

    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const totalSize = scripts.reduce((acc, script) => {
      const src = script.getAttribute('src');
      if (src && src.includes('/_next/static/')) {
        // Estimate size based on common patterns
        return acc + 1; // This would need actual size data
      }
      return acc;
    }, 0);

    console.log(`Total bundles: ${scripts.length}, Estimated chunks: ${totalSize}`);
  }
}

// Code splitting utilities
export const createDynamicImport = <T>(
  importFn: () => Promise<T>,
  componentName?: string
) => {
  return async (): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const module = await importFn();
      const loadTime = performance.now() - startTime;
      
      if (componentName) {
        console.log(`Dynamic import ${componentName} loaded in ${loadTime}ms`);
      }
      
      return module;
    } catch (error) {
      console.error(`Failed to load dynamic import${componentName ? ` ${componentName}` : ''}:`, error);
      throw error;
    }
  };
};

// Performance hooks for React components
export const usePerformanceProfiler = (name: string) => {
  if (typeof window === 'undefined') return;

  const startTime = performance.now();

  return {
    mark: (label: string) => {
      performance.mark(`${name}-${label}`);
    },
    measure: (label: string, startMark?: string) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`${name}-${label}: ${duration}ms`);
      
      if (startMark) {
        try {
          performance.measure(`${name}-${label}`, startMark);
        } catch (error) {
          // Mark doesn't exist
        }
      }
    },
  };
};