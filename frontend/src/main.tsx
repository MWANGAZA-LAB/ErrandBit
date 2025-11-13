import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import './index.css'
import { reportWebVitals } from './utils/webVitals'
import { initErrorTracking } from './utils/errorTracking'
import { initDarkMode } from './utils/darkMode'

// Initialize dark mode IMMEDIATELY before React renders
initDarkMode();

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
      {/* React Query DevTools - only in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
)
