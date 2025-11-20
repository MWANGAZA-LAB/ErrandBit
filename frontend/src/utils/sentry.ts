/**
 * Sentry Error Tracking Configuration
 * Initializes Sentry for production error monitoring
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error tracking
 * Only activates in production with VITE_SENTRY_DSN configured
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;

  if (dsn && environment === 'production') {
    Sentry.init({
      dsn,
      environment,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Performance Monitoring
      tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // Sample 10% of sessions
      replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 'unknown',
      
      // Filter out sensitive data
      beforeSend(event, hint) {
        // Don't send events in development
        if (environment !== 'production') {
          return null;
        }
        
        // Filter out sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.data) {
              // Remove sensitive fields
              const sanitized = { ...breadcrumb.data };
              delete sanitized.password;
              delete sanitized.token;
              delete sanitized.apiKey;
              breadcrumb.data = sanitized;
            }
            return breadcrumb;
          });
        }
        
        return event;
      },
      
      // Ignore common errors that aren't actionable
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',
        // Network errors (handled by app)
        'NetworkError',
        'Network request failed',
        // Cancelled requests
        'AbortError',
        'Request aborted',
      ],
    });

    // Make Sentry available globally for ErrorBoundary
    (window as any).Sentry = Sentry;

    console.log('✅ Sentry error tracking initialized');
  } else if (environment === 'production' && !dsn) {
    console.warn('⚠️ Sentry DSN not configured. Error tracking disabled.');
  }
}

/**
 * Manually capture an exception
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
}

/**
 * Manually capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.setUser(user);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  message: string;
  level?: Sentry.SeverityLevel;
  category?: string;
  data?: Record<string, any>;
}): void {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}
