'use client';

import { useEffect, useRef, useState } from 'react';

// Skip link component for keyboard navigation
export function SkipLink({ href = '#main', children = 'Skip to main content' }: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-white px-4 py-2 rounded-md transition-all duration-200"
    >
      {children}
    </a>
  );
}

// Focus trap for modals and dialogs
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

  return containerRef;
}

// Announcement component for screen readers
export function LiveRegion({ 
  children, 
  politeness = 'polite' as 'polite' | 'assertive',
  atomic = true 
}: {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
}) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
}

// Custom hook for managing announcements
export function useAnnouncements() {
  const [announcement, setAnnouncement] = useState('');

  const announce = (message: string, timeout = 5000) => {
    setAnnouncement(message);
    
    if (timeout > 0) {
      setTimeout(() => setAnnouncement(''), timeout);
    }
  };

  const clear = () => setAnnouncement('');

  return {
    announcement,
    announce,
    clear,
    LiveRegion: () => (
      <LiveRegion>
        {announcement}
      </LiveRegion>
    ),
  };
}

// Custom hook for keyboard navigation
export function useKeyboardNavigation(
  items: HTMLElement[],
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical';
    onSelect?: (index: number) => void;
  } = {}
) {
  const { loop = true, orientation = 'vertical', onSelect } = options;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleKeyDown = (e: KeyboardEvent) => {
    const isHorizontal = orientation === 'horizontal';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

    switch (e.key) {
      case nextKey:
        e.preventDefault();
        setCurrentIndex(prev => {
          const next = prev + 1;
          const newIndex = next >= items.length ? (loop ? 0 : prev) : next;
          items[newIndex]?.focus();
          return newIndex;
        });
        break;

      case prevKey:
        e.preventDefault();
        setCurrentIndex(prev => {
          const next = prev - 1;
          const newIndex = next < 0 ? (loop ? items.length - 1 : prev) : next;
          items[newIndex]?.focus();
          return newIndex;
        });
        break;

      case 'Home':
        e.preventDefault();
        setCurrentIndex(0);
        items[0]?.focus();
        break;

      case 'End':
        e.preventDefault();
        setCurrentIndex(items.length - 1);
        items[items.length - 1]?.focus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(currentIndex);
        break;
    }
  };

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown,
  };
}

// Accessible button component
export function AccessibleButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  className = '',
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  'aria-label'?: string;
  'aria-describedby'?: string;
  className?: string;
  [key: string]: any;
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg',
  };

  const disabledClasses = disabled 
    ? 'opacity-50 cursor-not-allowed' 
    : 'cursor-pointer';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabledClasses}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

// High contrast mode detector
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    setIsHighContrast(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isHighContrast;
}

// Reduced motion detector
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}