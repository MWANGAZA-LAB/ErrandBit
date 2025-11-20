import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { reportWebVitals } from './utils/webVitals'
import { initErrorTracking } from './utils/errorTracking'
import { initSentry } from './utils/sentry'
import { initDarkMode, watchSystemTheme, detectReducedMotion, listenForThemeChanges } from './utils/darkMode'

// Initialize Sentry error tracking FIRST
initSentry();

// Initialize dark mode IMMEDIATELY before React renders
initDarkMode();
// Watch for system theme changes
watchSystemTheme();
// Detect reduced motion preference for accessibility
detectReducedMotion();
// Listen for theme changes from other tabs
listenForThemeChanges((theme) => {
  console.log('Theme changed from another tab:', theme);
});

// Configure React Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Retry failed requests once
      refetchOnReconnect: true, // Refetch when internet reconnects
    },
    mutations: {
      retry: 1,
    },
  },
})

// Initialize performance monitoring
initErrorTracking()
reportWebVitals()

const el = document.getElementById('root')!
createRoot(el).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
