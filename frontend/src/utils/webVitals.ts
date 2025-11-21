/**
 * Web Vitals Monitoring
 * 
 * Tracks Core Web Vitals and sends metrics to analytics
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals'

/**
 * Analytics endpoint (replace with your analytics service)
 */
const ANALYTICS_ENDPOINT = '/api/analytics'

/**
 * Send metric to analytics
 */
function sendToAnalytics(metric: Metric) {
  // Only send in production
  if (import.meta.env.DEV) {
    return
  }

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  })

  // Use `navigator.sendBeacon()` if available, falling back to `fetch()`
  if (navigator.sendBeacon) {
    navigator.sendBeacon(ANALYTICS_ENDPOINT, body)
  } else {
    fetch(ANALYTICS_ENDPOINT, {
      body,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch((error) => {
      // Silently fail - don't spam console
      if (import.meta.env.DEV) {
        console.warn('Analytics service unavailable:', error)
      }
    })
  }
}

/**
 * Log metric to console (development only)
 */
function logMetric(metric: Metric) {
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
    })
  }
}

/**
 * Report Web Vitals
 */
export function reportWebVitals(onPerfEntry?: (metric: Metric) => void) {
  try {
    const handleMetric = (metric: Metric) => {
      try {
        logMetric(metric)
        sendToAnalytics(metric)
        onPerfEntry?.(metric)
      } catch (error) {
        // Silently fail - don't break the app
        if (import.meta.env.DEV) {
          console.warn('Web Vitals metric error:', error)
        }
      }
    }

    // Core Web Vitals
    onCLS(handleMetric) // Cumulative Layout Shift
    onFCP(handleMetric) // First Contentful Paint
    onLCP(handleMetric) // Largest Contentful Paint
    onTTFB(handleMetric) // Time to First Byte
    onINP(handleMetric) // Interaction to Next Paint (replaces FID)
  } catch (error) {
    // Silently fail if web-vitals library has issues
    if (import.meta.env.DEV) {
      console.warn('Web Vitals initialization error:', error)
    }
  }
}

/**
 * Get performance metrics summary
 */
export function getPerformanceMetrics() {
  if (!window.performance) return null

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const paint = performance.getEntriesByType('paint')

  return {
    // Navigation timing
    dns: navigation?.domainLookupEnd - navigation?.domainLookupStart,
    tcp: navigation?.connectEnd - navigation?.connectStart,
    ttfb: navigation?.responseStart - navigation?.requestStart,
    download: navigation?.responseEnd - navigation?.responseStart,
    domInteractive: navigation?.domInteractive,
    domComplete: navigation?.domComplete,
    loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,

    // Paint timing
    fcp: paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime,
    
    // Memory (if available)
    memory: (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
      ? {
          used: (performance as Performance & { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize,
          total: (performance as Performance & { memory: { totalJSHeapSize: number } }).memory.totalJSHeapSize,
          limit: (performance as Performance & { memory: { jsHeapSizeLimit: number } }).memory.jsHeapSizeLimit,
        }
      : null,
  }
}

/**
 * Monitor long tasks (> 50ms)
 */
export function monitorLongTasks(callback: (duration: number, name: string) => void) {
  if (!('PerformanceObserver' in window)) return

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          callback(entry.duration, entry.name)
          
          if (import.meta.env.DEV) {
            console.warn(`[Long Task] ${entry.name}: ${entry.duration.toFixed(2)}ms`)
          }
        }
      }
    })

    observer.observe({ entryTypes: ['longtask'] })
    
    return () => observer.disconnect()
  } catch (error) {
    console.error('Failed to observe long tasks:', error)
  }
}

/**
 * Monitor resource loading
 */
export function monitorResourceLoading() {
  if (!window.performance) return

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  
  const summary = {
    total: resources.length,
    byType: {} as Record<string, number>,
    slow: [] as { name: string; duration: number; size: number }[],
    totalSize: 0,
    totalDuration: 0,
  }

  resources.forEach((resource) => {
    // Count by type
    const type = resource.initiatorType
    summary.byType[type] = (summary.byType[type] || 0) + 1

    // Track slow resources (> 1s)
    const duration = resource.responseEnd - resource.startTime
    if (duration > 1000) {
      summary.slow.push({
        name: resource.name,
        duration,
        size: resource.transferSize,
      })
    }

    summary.totalSize += resource.transferSize
    summary.totalDuration += duration
  })

  return summary
}

/**
 * Performance budget checker
 */
export interface PerformanceBudget {
  lcp?: number // Largest Contentful Paint (ms)
  fid?: number // First Input Delay (ms)
  cls?: number // Cumulative Layout Shift (score)
  fcp?: number // First Contentful Paint (ms)
  ttfb?: number // Time to First Byte (ms)
  bundleSize?: number // Total bundle size (bytes)
}

export function checkPerformanceBudget(budget: PerformanceBudget) {
  const violations: string[] = []

  // Check bundle size
  if (budget.bundleSize) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const totalSize = resources.reduce((sum, r) => sum + r.transferSize, 0)
    
    if (totalSize > budget.bundleSize) {
      violations.push(`Bundle size exceeded: ${totalSize} > ${budget.bundleSize}`)
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  }
}

/**
 * Get device information
 */
export function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    connection: 'connection' in navigator
      ? {
          effectiveType: (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType,
          downlink: (navigator as Navigator & { connection?: { downlink?: number } }).connection?.downlink,
          rtt: (navigator as Navigator & { connection?: { rtt?: number } }).connection?.rtt,
        }
      : null,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  }
}
