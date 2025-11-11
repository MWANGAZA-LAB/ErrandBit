/**
 * React Query Hooks for Runner Operations
 * 
 * Features:
 * - Automatic caching and background refetching
 * - Optimistic updates for better UX
 * - Request deduplication
 * - Type-safe query keys
 * - Toast notifications
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { runnerService, RunnerProfile, CreateRunnerInput, UpdateRunnerInput } from '../services/runner.service'
import toast from 'react-hot-toast'

// Query Keys
export const runnerKeys = {
  all: ['runners'] as const,
  lists: () => [...runnerKeys.all, 'list'] as const,
  list: (filters: { lat?: number; lng?: number; radius?: number }) => 
    [...runnerKeys.lists(), filters] as const,
  details: () => [...runnerKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...runnerKeys.details(), id] as const,
  myProfile: () => [...runnerKeys.all, 'my-profile'] as const,
}

/**
 * Get current user's runner profile
 */
export function useMyRunnerProfile(
  options?: Omit<UseQueryOptions<RunnerProfile, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<RunnerProfile, Error>({
    queryKey: runnerKeys.myProfile(),
    queryFn: () => runnerService.getMyProfile(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    ...options,
  })
}

/**
 * Get runner profile by ID
 */
export function useRunnerProfile(
  id: number | string | undefined,
  options?: Omit<UseQueryOptions<RunnerProfile, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<RunnerProfile, Error>({
    queryKey: runnerKeys.detail(id!),
    queryFn: () => runnerService.getProfileById(id!),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Search for nearby runners
 */
export function useNearbyRunners(
  lat: number,
  lng: number,
  radius: number = 10,
  options?: Omit<UseQueryOptions<RunnerProfile[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<RunnerProfile[], Error>({
    queryKey: runnerKeys.list({ lat, lng, radius }),
    queryFn: () => runnerService.searchNearby(lat, lng, radius),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Create runner profile mutation
 */
export function useCreateRunnerProfile(
  options?: UseMutationOptions<RunnerProfile, Error, CreateRunnerInput>
) {
  const queryClient = useQueryClient()

  return useMutation<RunnerProfile, Error, CreateRunnerInput>({
    mutationFn: (data) => runnerService.createProfile(data),
    onSuccess: (newProfile) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: runnerKeys.myProfile() })
      queryClient.invalidateQueries({ queryKey: runnerKeys.lists() })
      
      // Set the new profile in cache
      queryClient.setQueryData(runnerKeys.myProfile(), newProfile)
      
      toast.success('Runner profile created successfully!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create runner profile')
    },
    ...options,
  })
}

/**
 * Update runner profile mutation
 */
export function useUpdateRunnerProfile(
  options?: UseMutationOptions<RunnerProfile, Error, { id: number | string; data: UpdateRunnerInput }>
) {
  const queryClient = useQueryClient()

  return useMutation<RunnerProfile, Error, { id: number | string; data: UpdateRunnerInput }>({
    mutationFn: ({ id, data }) => runnerService.updateProfile(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: runnerKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: runnerKeys.myProfile() })

      // Snapshot previous values
      const previousProfile = queryClient.getQueryData<RunnerProfile>(runnerKeys.detail(id))
      const previousMyProfile = queryClient.getQueryData<RunnerProfile>(runnerKeys.myProfile())

      // Optimistically update
      if (previousProfile) {
        queryClient.setQueryData<RunnerProfile>(runnerKeys.detail(id), {
          ...previousProfile,
          ...data,
        })
      }
      if (previousMyProfile && previousMyProfile.id === id) {
        queryClient.setQueryData<RunnerProfile>(runnerKeys.myProfile(), {
          ...previousMyProfile,
          ...data,
        })
      }

      return { previousProfile, previousMyProfile }
    },
    onSuccess: (updatedProfile, { id }) => {
      // Update cache with server response
      queryClient.setQueryData(runnerKeys.detail(id), updatedProfile)
      if (queryClient.getQueryData(runnerKeys.myProfile())) {
        queryClient.setQueryData(runnerKeys.myProfile(), updatedProfile)
      }
      
      // Invalidate nearby runners list
      queryClient.invalidateQueries({ queryKey: runnerKeys.lists() })
      
      toast.success('Profile updated successfully!')
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      const ctx = context as { previousProfile?: RunnerProfile; previousMyProfile?: RunnerProfile } | undefined
      if (ctx?.previousProfile) {
        queryClient.setQueryData(runnerKeys.detail(id), ctx.previousProfile)
      }
      if (ctx?.previousMyProfile) {
        queryClient.setQueryData(runnerKeys.myProfile(), ctx.previousMyProfile)
      }
      
      toast.error(error.message || 'Failed to update profile')
    },
    ...options,
  })
}

/**
 * Toggle runner availability mutation
 */
export function useToggleAvailability(
  options?: UseMutationOptions<RunnerProfile, Error, { id: number | string; available: boolean }>
) {
  const queryClient = useQueryClient()

  return useMutation<RunnerProfile, Error, { id: number | string; available: boolean }>({
    mutationFn: ({ id, available }) => runnerService.toggleAvailability(id, available),
    onMutate: async ({ id, available }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: runnerKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: runnerKeys.myProfile() })

      // Snapshot previous values
      const previousProfile = queryClient.getQueryData<RunnerProfile>(runnerKeys.detail(id))
      const previousMyProfile = queryClient.getQueryData<RunnerProfile>(runnerKeys.myProfile())

      // Optimistically update
      if (previousProfile) {
        queryClient.setQueryData<RunnerProfile>(runnerKeys.detail(id), {
          ...previousProfile,
          available,
        })
      }
      if (previousMyProfile && previousMyProfile.id === id) {
        queryClient.setQueryData<RunnerProfile>(runnerKeys.myProfile(), {
          ...previousMyProfile,
          available,
        })
      }

      return { previousProfile, previousMyProfile }
    },
    onSuccess: (updatedProfile, { id, available }) => {
      // Update cache with server response
      queryClient.setQueryData(runnerKeys.detail(id), updatedProfile)
      if (queryClient.getQueryData(runnerKeys.myProfile())) {
        queryClient.setQueryData(runnerKeys.myProfile(), updatedProfile)
      }
      
      // Invalidate nearby runners list
      queryClient.invalidateQueries({ queryKey: runnerKeys.lists() })
      
      toast.success(available ? 'You are now available' : 'You are now unavailable')
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      const ctx = context as { previousProfile?: RunnerProfile; previousMyProfile?: RunnerProfile } | undefined
      if (ctx?.previousProfile) {
        queryClient.setQueryData(runnerKeys.detail(id), ctx.previousProfile)
      }
      if (ctx?.previousMyProfile) {
        queryClient.setQueryData(runnerKeys.myProfile(), ctx.previousMyProfile)
      }
      
      toast.error(error.message || 'Failed to update availability')
    },
    ...options,
  })
}

/**
 * Update runner location mutation
 */
export function useUpdateRunnerLocation(
  options?: UseMutationOptions<
    RunnerProfile,
    Error,
    { id: number | string; location: { lat: number; lng: number; address?: string } }
  >
) {
  const queryClient = useQueryClient()

  return useMutation<
    RunnerProfile,
    Error,
    { id: number | string; location: { lat: number; lng: number; address?: string } }
  >({
    mutationFn: ({ id, location }) => runnerService.updateLocation(id, location),
    onSuccess: (updatedProfile, { id }) => {
      // Update cache
      queryClient.setQueryData(runnerKeys.detail(id), updatedProfile)
      if (queryClient.getQueryData(runnerKeys.myProfile())) {
        queryClient.setQueryData(runnerKeys.myProfile(), updatedProfile)
      }
      
      // Invalidate nearby runners list
      queryClient.invalidateQueries({ queryKey: runnerKeys.lists() })
      
      toast.success('Location updated successfully!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update location')
    },
    ...options,
  })
}

/**
 * Prefetch runner profile
 */
export function usePrefetchRunnerProfile() {
  const queryClient = useQueryClient()

  return (id: number | string) => {
    queryClient.prefetchQuery({
      queryKey: runnerKeys.detail(id),
      queryFn: () => runnerService.getProfileById(id),
      staleTime: 30 * 1000, // 30 seconds
    })
  }
}
