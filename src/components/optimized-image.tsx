'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { LazyLoader } from '@/lib/performance';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string;
  loadingClassName?: string;
  errorClassName?: string;
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
  enableLazyLoading?: boolean;
  performanceMarker?: string;
}

export default function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  loadingClassName = 'animate-pulse bg-gray-200',
  errorClassName = 'bg-gray-100 flex items-center justify-center text-gray-400',
  onLoadComplete,
  onLoadError,
  enableLazyLoading = true,
  performanceMarker,
  className = '',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [isInView, setIsInView] = useState(!enableLazyLoading);
  const imageRef = useRef<HTMLDivElement>(null);

  // Lazy loading setup
  useEffect(() => {
    if (!enableLazyLoading || !imageRef.current) return;

    const element = imageRef.current;

    LazyLoader.observeElement(element, (entry) => {
      if (entry.isIntersecting && !isInView) {
        setIsInView(true);
        LazyLoader.unobserveElement(element);
      }
    });

    return () => {
      LazyLoader.unobserveElement(element);
    };
  }, [enableLazyLoading, isInView]);

  // Performance tracking
  useEffect(() => {
    if (performanceMarker && isInView) {
      performance.mark(`${performanceMarker}-start`);
    }
  }, [performanceMarker, isInView]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    
    if (performanceMarker) {
      performance.mark(`${performanceMarker}-end`);
      try {
        performance.measure(
          `${performanceMarker}-load-time`,
          `${performanceMarker}-start`,
          `${performanceMarker}-end`
        );
      } catch (error) {
        // Marks don't exist, ignore
      }
    }
    
    onLoadComplete?.();
  };

  const handleError = () => {
    setIsLoading(false);
    
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }
    
    setHasError(true);
    onLoadError?.(new Error(`Failed to load image: ${currentSrc}`));
  };

  const getImageElement = () => {
    if (!isInView) {
      return (
        <div
          className={`${loadingClassName} ${className}`}
          style={{ aspectRatio: props.width && props.height ? `${props.width}/${props.height}` : undefined }}
        />
      );
    }

    if (hasError) {
      return (
        <div className={`${errorClassName} ${className}`}>
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      );
    }

    return (
      <>
        {isLoading && (
          <div
            className={`absolute inset-0 ${loadingClassName}`}
            style={{ aspectRatio: props.width && props.height ? `${props.width}/${props.height}` : undefined }}
          />
        )}
        <Image
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          priority={!enableLazyLoading}
          {...props}
        />
      </>
    );
  };

  return (
    <div ref={imageRef} className="relative overflow-hidden">
      {getImageElement()}
    </div>
  );
}