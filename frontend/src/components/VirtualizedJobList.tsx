/**
 * Virtualized Job List Component
 * 
 * Features:
 * - Virtual scrolling for large lists (only renders visible items)
 * - Automatic height calculation
 * - Smooth scrolling performance
 * - Memory efficient (handles 1000+ items)
 * - Accessibility support
 */

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Job } from '../services/job.service'
import JobCard from './JobCard'

interface VirtualizedJobListProps {
  jobs: Job[]
  emptyMessage?: string
  estimatedItemHeight?: number
  overscan?: number
  onJobClick?: (job: Job) => void
}

export function VirtualizedJobList({
  jobs,
  emptyMessage = 'No jobs found',
  estimatedItemHeight = 200,
  overscan = 5,
  onJobClick,
}: VirtualizedJobListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan, // Number of items to render outside visible area
  })

  if (jobs.length === 0) {
    return (
      <div 
        className="text-center py-12"
        role="status"
        aria-live="polite"
      >
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {emptyMessage}
        </h3>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
      role="feed"
      aria-label="Job listings"
      aria-busy={false}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const job = jobs[virtualItem.index]
          
          return (
            <div
              key={job.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="px-4 py-2"
            >
              <JobCard 
                job={job} 
                onClick={() => onJobClick?.(job)}
              />
            </div>
          )
        })}
      </div>

      {/* Screen reader announcement for loaded items */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Showing {virtualizer.getVirtualItems().length} of {jobs.length} jobs
      </div>
    </div>
  )
}
