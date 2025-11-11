/**
 * Error Tracking and Monitoring
 * 
 * Captures and reports errors for debugging and monitoring
 */

export interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  url: string
  timestamp: number
  userAgent: string
  type: 'error' | 'unhandledRejection' | 'react'
  severity: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, unknown>
}

/**
 * Error tracking endpoint (replace with your error tracking service)
 */
const ERROR_ENDPOINT = '/api/errors'

/**
 * Send error to tracking service
 */
export function reportError(error: ErrorReport) {
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('[Error Tracking]', error)
    // Skip sending to server in development
    return
  }

  // Send to error tracking service only in production
  fetch(ERROR_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(error),
    keepalive: true,
  }).catch((err) => {
    // Silently fail - don't spam console with tracking errors
    if (import.meta.env.DEV) {
      console.warn('Error tracking service unavailable:', err)
    }
  })
}

/**
 * Initialize global error handlers
 */
export function initErrorTracking() {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    reportError({
      message: event.message,
      stack: event.error?.stack,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      type: 'error',
      severity: 'high',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  })

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    reportError({
      message: event.reason?.message || 'Unhandled Promise Rejection',
      stack: event.reason?.stack,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      type: 'unhandledRejection',
      severity: 'high',
      metadata: {
        reason: event.reason,
      },
    })
  })

  // Handle console errors (optional)
  const originalConsoleError = console.error
  console.error = (...args) => {
    originalConsoleError.apply(console, args)
    
    // Only report in production
    if (import.meta.env.PROD) {
      reportError({
        message: args.map((arg) => String(arg)).join(' '),
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        type: 'error',
        severity: 'medium',
      })
    }
  }
}

/**
 * Track React component errors
 */
export function trackReactError(
  error: Error,
  errorInfo: { componentStack?: string }
) {
  reportError({
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    url: window.location.href,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    type: 'react',
    severity: 'critical',
  })
}

/**
 * Track custom errors
 */
export function trackCustomError(
  message: string,
  severity: ErrorReport['severity'] = 'medium',
  metadata?: Record<string, unknown>
) {
  reportError({
    message,
    url: window.location.href,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    type: 'error',
    severity,
    metadata,
  })
}

/**
 * Create breadcrumb trail for debugging
 */
const breadcrumbs: Array<{
  message: string
  category: string
  timestamp: number
  data?: Record<string, unknown>
}> = []

const MAX_BREADCRUMBS = 50

export function addBreadcrumb(
  message: string,
  category: string = 'general',
  data?: Record<string, unknown>
) {
  breadcrumbs.push({
    message,
    category,
    timestamp: Date.now(),
    data,
  })

  // Keep only last N breadcrumbs
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift()
  }
}

export function getBreadcrumbs() {
  return [...breadcrumbs]
}

export function clearBreadcrumbs() {
  breadcrumbs.length = 0
}

/**
 * Track user actions for debugging
 */
export function trackUserAction(action: string, data?: Record<string, unknown>) {
  addBreadcrumb(action, 'user-action', data)
}

/**
 * Track navigation for debugging
 */
export function trackNavigation(from: string, to: string) {
  addBreadcrumb(`Navigation: ${from} → ${to}`, 'navigation', { from, to })
}

/**
 * Track API calls for debugging
 */
export function trackAPICall(
  method: string,
  url: string,
  status: number,
  duration: number
) {
  addBreadcrumb(
    `API ${method} ${url} - ${status}`,
    'api',
    { method, url, status, duration }
  )
}

/**
 * Get error context for debugging
 */
export function getErrorContext() {
  return {
    breadcrumbs: getBreadcrumbs(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    memory: (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory
      ? {
          used: (performance as Performance & { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize,
          total: (performance as Performance & { memory: { totalJSHeapSize: number } }).memory.totalJSHeapSize,
        }
      : null,
  }
}
