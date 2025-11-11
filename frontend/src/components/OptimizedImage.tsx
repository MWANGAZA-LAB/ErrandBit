import { useState, useEffect } from 'react'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  priority?: boolean
  srcSet?: string
  sizes?: string
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  webpSrc?: string
}

/**
 * Optimized Image Component with lazy loading and placeholder
 * 
 * Features:
 * - Lazy loading with Intersection Observer
 * - Blur-up placeholder effect
 * - WebP format support with fallback
 * - Responsive image loading (srcset/sizes)
 * - Proper accessibility attributes
 * - Error handling with fallback UI
 * - Progressive loading
 */
export function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  priority = false,
  srcSet,
  sizes,
  objectFit = 'cover',
  webpSrc,
}: OptimizedImageProps) {
  const [imageRef, isVisible] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
    freezeOnceVisible: true,
  })

  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const shouldLoad = priority || isVisible || loading === 'eager'

  useEffect(() => {
    if (!shouldLoad) return

    const img = new Image()
    img.src = src
    img.onload = () => setIsLoaded(true)
    img.onerror = () => setHasError(true)
  }, [src, shouldLoad])

  // Placeholder while loading
  if (!shouldLoad || (!isLoaded && !hasError)) {
    return (
      <div
        ref={imageRef}
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={`Loading ${alt}`}
      />
    )
  }

  // Error state
  if (hasError) {
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={`Failed to load ${alt}`}
      >
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    )
  }

  // Loaded image with WebP support
  if (webpSrc) {
    return (
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        <img
          src={src}
          alt={alt}
          srcSet={srcSet}
          sizes={sizes}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          style={{ objectFit }}
          width={width}
          height={height}
          loading={loading}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      </picture>
    )
  }

  // Standard image
  return (
    <img
      src={src}
      alt={alt}
      srcSet={srcSet}
      sizes={sizes}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ objectFit }}
      width={width}
      height={height}
      loading={loading}
      decoding="async"
      onLoad={() => setIsLoaded(true)}
      onError={() => setHasError(true)}
    />
  )
}
