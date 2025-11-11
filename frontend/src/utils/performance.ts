/**
 * Performance Utilities
 * Helper functions for performance optimization and monitoring
 */

/**
 * Debounce function to limit how often a function can be called
 * Useful for search inputs, resize handlers, etc.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function to ensure a function is called at most once per interval
 * Useful for scroll handlers, mouse move events, etc.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Lazy load images with Intersection Observer
 */
export function lazyLoadImage(img: HTMLImageElement): void {
  const src = img.dataset.src
  if (!src) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const image = entry.target as HTMLImageElement
          const imageSrc = image.dataset.src
          if (imageSrc) {
            image.src = imageSrc
            image.classList.add('loaded')
            observer.unobserve(image)
          }
        }
      })
    },
    {
      rootMargin: '50px',
    }
  )

  observer.observe(img)
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string): void {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  link.as = as
  document.head.appendChild(link)
}

/**
 * Prefetch resources for future navigation
 */
export function prefetchResource(href: string): void {
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href
  document.head.appendChild(link)
}

/**
 * Check if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get connection quality information
 */
export function getConnectionQuality(): {
  effectiveType: string
  downlink: number
  rtt: number
  saveData: boolean
} | null {
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType: string
      downlink: number
      rtt: number
      saveData: boolean
    }
  }

  if (!nav.connection) return null

  return {
    effectiveType: nav.connection.effectiveType,
    downlink: nav.connection.downlink,
    rtt: nav.connection.rtt,
    saveData: nav.connection.saveData,
  }
}

/**
 * Check if device is low-end based on hardware concurrency
 */
export function isLowEndDevice(): boolean {
  return navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Measure component render time (for development)
 */
export function measureRenderTime(componentName: string, callback: () => void): void {
  if (import.meta.env.DEV) {
    const start = performance.now()
    callback()
    const end = performance.now()
    console.log(`${componentName} rendered in ${(end - start).toFixed(2)}ms`)
  } else {
    callback()
  }
}
