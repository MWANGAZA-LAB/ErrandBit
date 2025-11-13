/**
 * React Query Configuration
 * Centralized configuration for data fetching, caching, and state management
 */

import { QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes - data is considered fresh for 5 min
      staleTime: 5 * 60 * 1000,
      
      // Cache time: 10 minutes - keep unused data in cache for 10 min
      gcTime: 10 * 60 * 1000,
      
      // Retry failed requests 1 time
      retry: 1,
      
      // Don't refetch on window focus in development
      refetchOnWindowFocus: process.env.NODE_ENV === 'production',
      
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations 0 times (don't retry by default)
      retry: 0,
    },
  },
});

// Query Keys - Centralized for consistency
export const queryKeys = {
  // Profile
  profile: ['profile'] as const,
  profilePreferences: ['profile', 'preferences'] as const,
  profileSecurityLog: (limit?: number) => ['profile', 'security-log', limit] as const,
  
  // Jobs
  jobs: ['jobs'] as const,
  job: (id: number | string) => ['jobs', id] as const,
  myJobs: ['jobs', 'my-jobs'] as const,
  
  // Runners
  runners: ['runners'] as const,
  runner: (id: number | string) => ['runners', id] as const,
  runnerProfile: ['runners', 'me'] as const,
  searchRunners: (params: any) => ['runners', 'search', params] as const,
  
  // Payments
  payment: (jobId: number | string) => ['payments', jobId] as const,
  
  // Reviews
  reviews: (runnerId: number | string) => ['reviews', runnerId] as const,
};
