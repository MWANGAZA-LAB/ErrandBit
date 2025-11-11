/**
 * Image Optimization Utilities
 * 
 * Helper functions for image processing, optimization, and responsive loading
 */

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(baseUrl: string, widths: number[]): string {
  return widths
    .map((width) => `${baseUrl}?w=${width} ${width}w`)
    .join(', ')
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizes(breakpoints: { maxWidth: string; size: string }[]): string {
  return breakpoints
    .map((bp, index) => {
      if (index === breakpoints.length - 1) {
        return bp.size
      }
      return `(max-width: ${bp.maxWidth}) ${bp.size}`
    })
    .join(', ')
}

/**
 * Convert image URL to WebP format
 */
export function getWebPUrl(url: string): string {
  // Check if URL already has WebP extension
  if (url.endsWith('.webp')) return url
  
  // Replace extension with .webp
  return url.replace(/\.(jpg|jpeg|png)$/i, '.webp')
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA='
    const img = new Image()
    
    img.onload = () => resolve(img.width === 1)
    img.onerror = () => resolve(false)
    img.src = webP
  })
}

/**
 * Preload critical images
 */
export function preloadImage(src: string, priority: 'high' | 'low' = 'low'): Promise<void> {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    
    if (priority === 'high') {
      link.setAttribute('fetchpriority', 'high')
    }
    
    link.onload = () => resolve()
    link.onerror = reject
    
    document.head.appendChild(link)
  })
}

/**
 * Lazy load background image
 */
export function lazyLoadBackgroundImage(element: HTMLElement, imageUrl: string): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          element.style.backgroundImage = `url(${imageUrl})`
          observer.unobserve(element)
        }
      })
    },
    {
      rootMargin: '50px',
    }
  )
  
  observer.observe(element)
}

/**
 * Get optimal image dimensions for container
 */
export function getOptimalDimensions(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  objectFit: 'contain' | 'cover' = 'cover'
): { width: number; height: number } {
  const containerRatio = containerWidth / containerHeight
  const imageRatio = imageWidth / imageHeight
  
  if (objectFit === 'contain') {
    if (containerRatio > imageRatio) {
      // Container is wider
      return {
        width: containerHeight * imageRatio,
        height: containerHeight,
      }
    } else {
      // Container is taller
      return {
        width: containerWidth,
        height: containerWidth / imageRatio,
      }
    }
  } else {
    // cover
    if (containerRatio > imageRatio) {
      // Container is wider
      return {
        width: containerWidth,
        height: containerWidth / imageRatio,
      }
    } else {
      // Container is taller
      return {
        width: containerHeight * imageRatio,
        height: containerHeight,
      }
    }
  }
}

/**
 * Compress image quality based on network speed
 */
export function getOptimalQuality(): number {
  if ('connection' in navigator) {
    const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
    const effectiveType = conn?.effectiveType
    
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return 50 // Low quality for slow connections
      case '3g':
        return 70 // Medium quality
      case '4g':
      default:
        return 85 // High quality for fast connections
    }
  }
  
  return 85 // Default to high quality
}

/**
 * Calculate blur data URL for placeholder
 */
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  
  // Create gradient placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#e5e7eb')
  gradient.addColorStop(1, '#d1d5db')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

/**
 * Get image dimensions from URL
 */
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    
    img.onerror = reject
    img.src = url
  })
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Check if image is in viewport
 */
export function isImageInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

/**
 * Responsive image breakpoints (matching Tailwind CSS)
 */
export const IMAGE_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

/**
 * Common responsive image widths
 */
export const RESPONSIVE_WIDTHS = [320, 640, 768, 1024, 1280, 1536, 1920]

/**
 * Generate responsive image props
 */
export function getResponsiveImageProps(baseUrl: string) {
  return {
    srcSet: generateSrcSet(baseUrl, RESPONSIVE_WIDTHS),
    sizes: generateSizes([
      { maxWidth: '640px', size: '100vw' },
      { maxWidth: '768px', size: '100vw' },
      { maxWidth: '1024px', size: '100vw' },
      { maxWidth: '1280px', size: '100vw' },
      { maxWidth: '1536px', size: '100vw' },
      { maxWidth: '1920px', size: '100vw' },
    ]),
  }
}
