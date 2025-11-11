/**
 * Advanced Caching Strategies
 * 
 * Utilities for managing cache behavior, persistence, and optimization
 */

import { QueryClient, Query } from '@tanstack/react-query'

/**
 * Cache time constants (in milliseconds)
 */
export const CACHE_TIMES = {
  // Very short - for frequently changing data
  REALTIME: 10 * 1000, // 10 seconds
  
  // Short - for data that changes often
  SHORT: 30 * 1000, // 30 seconds
  
  // Medium - for moderately stable data
  MEDIUM: 2 * 60 * 1000, // 2 minutes
  
  // Long - for stable data
  LONG: 5 * 60 * 1000, // 5 minutes
  
  // Very long - for rarely changing data
  VERY_LONG: 15 * 60 * 1000, // 15 minutes
  
  // Static - for data that almost never changes
  STATIC: 60 * 60 * 1000, // 1 hour
} as const

/**
 * Garbage collection times (in milliseconds)
 */
export const GC_TIMES = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 10 * 60 * 1000, // 10 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const

/**
 * Cache persistence utilities
 */
export const CachePersistence = {
  /**
   * Save query cache to localStorage
   */
  save(queryClient: QueryClient, key: string = 'app-cache'): void {
    try {
      const cache = queryClient.getQueryCache().getAll()
      const serialized = JSON.stringify(
        cache.map((query) => ({
          queryKey: query.queryKey,
          state: query.state,
        }))
      )
      localStorage.setItem(key, serialized)
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error)
    }
  },

  /**
   * Load query cache from localStorage
   */
  load(queryClient: QueryClient, key: string = 'app-cache'): void {
    try {
      const serialized = localStorage.getItem(key)
      if (!serialized) return

      const cache = JSON.parse(serialized)
      cache.forEach((item: { queryKey: unknown[]; state: unknown }) => {
        queryClient.setQueryData(item.queryKey, item.state)
      })
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error)
    }
  },

  /**
   * Clear persisted cache
   */
  clear(key: string = 'app-cache'): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to clear persisted cache:', error)
    }
  },
}

/**
 * Cache invalidation strategies
 */
export const CacheInvalidation = {
  /**
   * Invalidate all queries matching a pattern
   */
  invalidatePattern(queryClient: QueryClient, pattern: string): void {
    queryClient.invalidateQueries({
      predicate: (query: Query) => {
        const key = JSON.stringify(query.queryKey)
        return key.includes(pattern)
      },
    })
  },

  /**
   * Invalidate stale queries (older than specified time)
   */
  invalidateStale(queryClient: QueryClient, maxAge: number): void {
    const now = Date.now()
    queryClient.invalidateQueries({
      predicate: (query: Query) => {
        const dataUpdatedAt = query.state.dataUpdatedAt
        return now - dataUpdatedAt > maxAge
      },
    })
  },

  /**
   * Remove all inactive queries
   */
  removeInactive(queryClient: QueryClient): void {
    queryClient.removeQueries({
      predicate: (query: Query) => {
        return query.getObserversCount() === 0
      },
    })
  },
}

/**
 * Cache warming - preload data before it's needed
 */
export const CacheWarming = {
  /**
   * Prefetch multiple queries in parallel
   */
  async prefetchMultiple(
    queryClient: QueryClient,
    queries: Array<{
      queryKey: unknown[]
      queryFn: () => Promise<unknown>
      staleTime?: number
    }>
  ): Promise<void> {
    await Promise.all(
      queries.map((query) =>
        queryClient.prefetchQuery({
          queryKey: query.queryKey,
          queryFn: query.queryFn,
          staleTime: query.staleTime,
        })
      )
    )
  },

  /**
   * Prefetch on idle (using requestIdleCallback)
   */
  prefetchOnIdle(
    queryClient: QueryClient,
    queryKey: unknown[],
    queryFn: () => Promise<unknown>
  ): void {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        queryClient.prefetchQuery({ queryKey, queryFn })
      })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        queryClient.prefetchQuery({ queryKey, queryFn })
      }, 1)
    }
  },
}

/**
 * Cache optimization utilities
 */
export const CacheOptimization = {
  /**
   * Get cache statistics
   */
  getStats(queryClient: QueryClient) {
    const cache = queryClient.getQueryCache().getAll()
    
    return {
      totalQueries: cache.length,
      activeQueries: cache.filter((q: Query) => q.getObserversCount() > 0).length,
      staleQueries: cache.filter((q: Query) => q.isStale()).length,
      fetchingQueries: cache.filter((q: Query) => q.state.fetchStatus === 'fetching').length,
      errorQueries: cache.filter((q: Query) => q.state.status === 'error').length,
      totalDataSize: this.estimateSize(cache),
    }
  },

  /**
   * Estimate cache size (rough approximation)
   */
  estimateSize(cache: unknown[]): string {
    try {
      const serialized = JSON.stringify(cache)
      const bytes = new Blob([serialized]).size
      return this.formatBytes(bytes)
    } catch {
      return 'Unknown'
    }
  },

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  },

  /**
   * Clean up cache to free memory
   */
  cleanup(queryClient: QueryClient, options?: {
    removeInactive?: boolean
    removeStale?: boolean
    maxAge?: number
  }): void {
    const { removeInactive = true, removeStale = false, maxAge } = options || {}

    if (removeInactive) {
      CacheInvalidation.removeInactive(queryClient)
    }

    if (removeStale && maxAge) {
      CacheInvalidation.invalidateStale(queryClient, maxAge)
    }
  },
}

/**
 * Network-aware caching
 */
export const NetworkAwareCaching = {
  /**
   * Get network quality
   */
  getNetworkQuality(): 'slow' | 'medium' | 'fast' {
    if ('connection' in navigator) {
      const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
      const effectiveType = conn?.effectiveType

      if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow'
      if (effectiveType === '3g') return 'medium'
      return 'fast'
    }
    return 'medium' // Default assumption
  },

  /**
   * Get cache times based on network quality
   */
  getAdaptiveCacheTimes(): { staleTime: number; gcTime: number } {
    const quality = this.getNetworkQuality()

    switch (quality) {
      case 'slow':
        return {
          staleTime: CACHE_TIMES.VERY_LONG,
          gcTime: GC_TIMES.VERY_LONG,
        }
      case 'medium':
        return {
          staleTime: CACHE_TIMES.LONG,
          gcTime: GC_TIMES.LONG,
        }
      case 'fast':
        return {
          staleTime: CACHE_TIMES.MEDIUM,
          gcTime: GC_TIMES.MEDIUM,
        }
    }
  },

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine
  },

  /**
   * Listen for online/offline events
   */
  onNetworkChange(callback: (isOnline: boolean) => void): () => void {
    const handleOnline = () => callback(true)
    const handleOffline = () => callback(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  },
}

/**
 * Cache debugging utilities
 */
export const CacheDebug = {
  /**
   * Log cache state to console
   */
  logCacheState(queryClient: QueryClient): void {
    const stats = CacheOptimization.getStats(queryClient)
    console.group('🗄️ Cache State')
    console.table(stats)
    console.groupEnd()
  },

  /**
   * Log specific query state
   */
  logQueryState(queryClient: QueryClient, queryKey: unknown[]): void {
    const query = queryClient.getQueryCache().find({ queryKey })
    if (query) {
      console.group(`🔍 Query: ${JSON.stringify(queryKey)}`)
      console.log('State:', query.state)
      console.log('Observers:', query.getObserversCount())
      console.log('Is Stale:', query.isStale())
      console.log('Data Updated At:', new Date(query.state.dataUpdatedAt))
      console.groupEnd()
    } else {
      console.warn('Query not found:', queryKey)
    }
  },

  /**
   * Monitor cache changes
   */
  monitorCache(queryClient: QueryClient): () => void {
    const unsubscribe = queryClient.getQueryCache().subscribe((event: { type?: string; query: Query }) => {
      if (event?.type === 'added') {
        console.log('✅ Query added:', event.query.queryKey)
      } else if (event?.type === 'removed') {
        console.log('❌ Query removed:', event.query.queryKey)
      } else if (event?.type === 'updated') {
        console.log('🔄 Query updated:', event.query.queryKey)
      }
    })

    return unsubscribe
  },
}
