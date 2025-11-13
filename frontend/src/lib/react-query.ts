/**
 * React Query Configuration
 * Central configuration for data fetching, caching, and synchronization
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 3 times
      retry: 3,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for real-time updates
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query Keys - Centralized query key management
export const queryKeys = {
  // Jobs
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.jobs.lists(), filters] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.jobs.details(), id] as const,
    myJobs: () => [...queryKeys.jobs.all, 'my-jobs'] as const,
  },
  
  // Runners
  runners: {
    all: ['runners'] as const,
    lists: () => [...queryKeys.runners.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.runners.lists(), filters] as const,
    details: () => [...queryKeys.runners.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.runners.details(), id] as const,
    me: () => [...queryKeys.runners.all, 'me'] as const,
  },
  
  // Profile
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
    preferences: () => [...queryKeys.profile.all, 'preferences'] as const,
    securityLog: () => [...queryKeys.profile.all, 'security-log'] as const,
  },
  
  // Payments
  payments: {
    all: ['payments'] as const,
    status: (paymentHash: string) => [...queryKeys.payments.all, 'status', paymentHash] as const,
    history: () => [...queryKeys.payments.all, 'history'] as const,
  },
  
  // Reviews
  reviews: {
    all: ['reviews'] as const,
    list: (runnerId: number) => [...queryKeys.reviews.all, 'list', runnerId] as const,
  },
} as const;
