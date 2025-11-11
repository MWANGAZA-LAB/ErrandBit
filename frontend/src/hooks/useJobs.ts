/**
 * React Query Hooks for Job Operations
 * 
 * Features:
 * - Automatic caching and refetching
 * - Optimistic updates
 * - Request deduplication
 * - Background refetching
 * - Prefetching support
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { jobService, Job, CreateJobInput } from '../services/job.service'
import toast from 'react-hot-toast'

// Query Keys
export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...jobKeys.lists(), filters] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...jobKeys.details(), id] as const,
  nearby: (lat: number, lng: number, radiusKm: number, status?: string) => 
    [...jobKeys.lists(), 'nearby', { lat, lng, radiusKm, status }] as const,
  myJobs: () => [...jobKeys.lists(), 'my-jobs'] as const,
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get nearby jobs
 */
export function useNearbyJobs(
  lat: number,
  lng: number,
  radiusKm: number = 10,
  status?: string,
  options?: Omit<UseQueryOptions<Job[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: jobKeys.nearby(lat, lng, radiusKm, status),
    queryFn: () => jobService.getNearbyJobs(lat, lng, radiusKm, status),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!(lat && lng), // Only run if coordinates are available
    ...options,
  })
}

/**
 * Get user's jobs (created or assigned)
 */
export function useMyJobs(
  options?: Omit<UseQueryOptions<Job[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: jobKeys.myJobs(),
    queryFn: () => jobService.getMyJobs(),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  })
}

/**
 * Get single job by ID
 */
export function useJob(
  id: number | string | undefined,
  options?: Omit<UseQueryOptions<Job, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: jobKeys.detail(id!),
    queryFn: () => jobService.getJobById(id!),
    enabled: !!id, // Only run if ID is provided
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  })
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new job
 */
export function useCreateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateJobInput) => jobService.createJob(data),
    onSuccess: (newJob) => {
      // Invalidate and refetch job lists
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
      
      // Add the new job to the cache
      queryClient.setQueryData(jobKeys.detail(newJob.id), newJob)
      
      toast.success('Job created successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create job')
    },
  })
}

/**
 * Assign job to current user (runner)
 */
export function useAssignJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => jobService.assignJob(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: jobKeys.detail(id) })

      // Snapshot previous value
      const previousJob = queryClient.getQueryData<Job>(jobKeys.detail(id))

      // Optimistically update the job status
      if (previousJob) {
        queryClient.setQueryData<Job>(jobKeys.detail(id), {
          ...previousJob,
          status: 'assigned',
        })
      }

      return { previousJob }
    },
    onSuccess: (updatedJob) => {
      // Update the job in cache
      queryClient.setQueryData(jobKeys.detail(updatedJob.id), updatedJob)
      
      // Invalidate job lists to reflect changes
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
      
      toast.success('Job assigned successfully!')
    },
    onError: (error: Error, id, context) => {
      // Rollback on error
      if (context?.previousJob) {
        queryClient.setQueryData(jobKeys.detail(id), context.previousJob)
      }
      toast.error(error.message || 'Failed to assign job')
    },
  })
}

/**
 * Start a job (mark as in progress)
 */
export function useStartJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => jobService.startJob(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: jobKeys.detail(id) })
      const previousJob = queryClient.getQueryData<Job>(jobKeys.detail(id))

      if (previousJob) {
        queryClient.setQueryData<Job>(jobKeys.detail(id), {
          ...previousJob,
          status: 'in_progress',
        })
      }

      return { previousJob }
    },
    onSuccess: (updatedJob) => {
      queryClient.setQueryData(jobKeys.detail(updatedJob.id), updatedJob)
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
      toast.success('Job started!')
    },
    onError: (error: Error, id, context) => {
      if (context?.previousJob) {
        queryClient.setQueryData(jobKeys.detail(id), context.previousJob)
      }
      toast.error(error.message || 'Failed to start job')
    },
  })
}

/**
 * Complete a job
 */
export function useCompleteJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => jobService.completeJob(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: jobKeys.detail(id) })
      const previousJob = queryClient.getQueryData<Job>(jobKeys.detail(id))

      if (previousJob) {
        queryClient.setQueryData<Job>(jobKeys.detail(id), {
          ...previousJob,
          status: 'completed',
          completedAt: new Date().toISOString(),
        })
      }

      return { previousJob }
    },
    onSuccess: (updatedJob) => {
      queryClient.setQueryData(jobKeys.detail(updatedJob.id), updatedJob)
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
      toast.success('Job completed!')
    },
    onError: (error: Error, id, context) => {
      if (context?.previousJob) {
        queryClient.setQueryData(jobKeys.detail(id), context.previousJob)
      }
      toast.error(error.message || 'Failed to complete job')
    },
  })
}

/**
 * Cancel a job
 */
export function useCancelJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number | string) => jobService.cancelJob(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: jobKeys.detail(id) })
      const previousJob = queryClient.getQueryData<Job>(jobKeys.detail(id))

      if (previousJob) {
        queryClient.setQueryData<Job>(jobKeys.detail(id), {
          ...previousJob,
          status: 'cancelled',
        })
      }

      return { previousJob }
    },
    onSuccess: (updatedJob) => {
      queryClient.setQueryData(jobKeys.detail(updatedJob.id), updatedJob)
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
      toast.success('Job cancelled')
    },
    onError: (error: Error, id, context) => {
      if (context?.previousJob) {
        queryClient.setQueryData(jobKeys.detail(id), context.previousJob)
      }
      toast.error(error.message || 'Failed to cancel job')
    },
  })
}

// ============================================================================
// PREFETCHING
// ============================================================================

/**
 * Prefetch a job (useful for hover states)
 */
export function usePrefetchJob() {
  const queryClient = useQueryClient()

  return (id: number | string) => {
    queryClient.prefetchQuery({
      queryKey: jobKeys.detail(id),
      queryFn: () => jobService.getJobById(id),
      staleTime: 30 * 1000,
    })
  }
}
