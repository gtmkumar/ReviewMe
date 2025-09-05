# Performance Optimization Guide

This document outlines the performance optimizations implemented in the ReviewMe PWA and provides guidelines for maintaining optimal performance.

## Core Web Vitals Implementation

### Largest Contentful Paint (LCP) - Target: <2.5s
- **Image Optimization**: Using Next.js Image component with WebP/AVIF formats
- **Font Loading**: Preloading critical fonts with `font-display: swap`
- **Resource Hints**: Preconnecting to external domains (GitHub API, Google Fonts)
- **Bundle Splitting**: Separating vendor and common chunks for better caching

### First Input Delay (FID) - Target: <100ms
- **Code Splitting**: Dynamic imports for non-critical components
- **Service Worker**: Background processing for heavy operations
- **Event Delegation**: Efficient event handling patterns
- **Main Thread Management**: Avoiding long tasks (>50ms)

### Cumulative Layout Shift (CLS) - Target: <0.1
- **Explicit Dimensions**: Setting width/height for images and embeds
- **Font Loading**: Using `font-display: swap` to prevent layout shifts
- **Dynamic Content**: Reserving space for loading states
- **Skeleton Screens**: Placeholder content matching final layout

## Performance Monitoring

### Web Vitals Tracking
```typescript
import { PerformanceTracker } from '@/lib/performance';

const tracker = PerformanceTracker.getInstance();
// Automatically tracks LCP, FID, CLS, FCP, TTFB, INP
```

### Custom Performance Metrics
```typescript
// Component performance profiling
const profiler = usePerformanceProfiler('ComponentName');
profiler.mark('render-start');
// Component rendering...
profiler.measure('render-complete', 'render-start');
```

### Bundle Analysis
```bash
# Analyze bundle size
ANALYZE=true npm run build

# Run Lighthouse CI
npm run lighthouse
```

## Optimization Strategies

### 1. Image Optimization
```typescript
import OptimizedImage from '@/components/optimized-image';

<OptimizedImage
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  enableLazyLoading={true}
  performanceMarker="hero-image"
/>
```

### 2. Code Splitting
```typescript
// Dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false, // If not needed for SEO
});
```

### 3. Caching Strategy
- **Static Assets**: 1 year cache with versioning
- **API Responses**: 5 minutes cache with stale-while-revalidate
- **Images**: 7 days cache with lazy loading
- **Service Worker**: Cache-first for static, network-first for dynamic

### 4. Resource Loading
```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://api.github.com">
<link rel="dns-prefetch" href="//avatars.githubusercontent.com">
```

## Performance Budgets

### JavaScript Bundles
- **Main Bundle**: <250KB gzipped
- **Vendor Bundle**: <300KB gzipped
- **Page Bundles**: <100KB gzipped each

### Images
- **Hero Images**: <500KB
- **Content Images**: <200KB
- **Icons/Avatars**: <50KB

### Third-party Scripts
- **Maximum**: 3 external scripts
- **Total Size**: <100KB

## Accessibility Performance

### Focus Management
```typescript
import { useFocusTrap } from '@/components/accessibility';

const Modal = ({ isOpen }) => {
  const trapRef = useFocusTrap(isOpen);
  return <div ref={trapRef}>...</div>;
};
```

### Screen Reader Optimization
```typescript
import { useAnnouncements } from '@/components/accessibility';

const { announce, LiveRegion } = useAnnouncements();

// Announce status changes
announce('Data loaded successfully');

return <LiveRegion />;
```

## Monitoring and Alerts

### Core Web Vitals Thresholds
```javascript
const ALERTS = {
  LCP: { warning: 2000, error: 3000 },
  FID: { warning: 80, error: 150 },
  CLS: { warning: 0.05, error: 0.15 },
};
```

### Performance Regression Detection
- **Lighthouse CI**: Automated performance testing
- **Bundle Size Monitoring**: Alert on 10%+ increase
- **Core Web Vitals**: Real user monitoring (RUM)

## Best Practices

### 1. Component Optimization
- Use React.memo for expensive components
- Implement proper dependency arrays in hooks
- Avoid creating objects/functions in render

### 2. State Management
- Keep state as local as possible
- Use React Query for server state
- Implement proper cache invalidation

### 3. Network Optimization
- Enable HTTP/2 and compression
- Use CDN for static assets
- Implement proper cache headers

### 4. Database Performance
- Index frequently queried fields
- Implement connection pooling
- Use aggregation pipelines for complex queries

## Testing Performance

### Local Testing
```bash
# Development performance
npm run dev
# Check network tab, performance profiler

# Production build
npm run build
npm start
# Run Lighthouse audit
```

### Automated Testing
```bash
# Lighthouse CI
npm run test:lighthouse

# Bundle analysis
npm run analyze

# Performance regression tests
npm run test:performance
```

### Manual Testing
1. **Slow 3G Network**: Test loading performance
2. **Low-end Devices**: CPU throttling in DevTools
3. **Screen Readers**: Test with NVDA/JAWS/VoiceOver
4. **Keyboard Navigation**: Tab through entire app

## Performance Checklist

### Pre-deployment
- [ ] Lighthouse score >90 for all categories
- [ ] Bundle size within budget
- [ ] Images optimized (WebP/AVIF)
- [ ] Critical CSS inlined
- [ ] Fonts preloaded
- [ ] Service worker updated

### Post-deployment
- [ ] Core Web Vitals monitoring active
- [ ] Error tracking configured
- [ ] Performance alerts set up
- [ ] User feedback collection enabled

## Tools and Resources

### Performance Tools
- Chrome DevTools Performance tab
- Lighthouse CI
- WebPageTest
- Core Web Vitals extension

### Monitoring Services
- Google Analytics 4 (Core Web Vitals)
- Sentry (Performance monitoring)
- Vercel Analytics
- Custom analytics endpoint

### Development Tools
- Next.js Bundle Analyzer
- webpack-bundle-analyzer
- source-map-explorer
- Performance Observer API

## Continuous Improvement

### Regular Reviews
- Weekly: Core Web Vitals metrics
- Monthly: Bundle size analysis
- Quarterly: Full performance audit
- Annually: Technology stack review

### Performance Culture
- Include performance in code reviews
- Set performance budgets for features
- Share performance wins with team
- Train team on performance best practices