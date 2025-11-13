/**
 * Optimized Job Card Component
 * 
 * Improvements:
 * - React.memo for preventing unnecessary re-renders
 * - useMemo for expensive computations
 * - Full WCAG 2.1 AA accessibility compliance
 * - Semantic HTML with proper ARIA labels
 * - Keyboard navigation support
 * - Screen reader optimizations
 */

import { memo, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Job } from '../services/job.service';
import { formatCentsAsUsd } from '../utils/currency';
import { usePrefetchJob } from '../hooks/useJobs';

interface JobCardProps {
  job: Job;
  onClick?: () => void;
  enablePrefetch?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  accepted: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  awaiting_payment: 'bg-purple-100 text-purple-800',
  payment_confirmed: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  disputed: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800'
};

// Job icon component
const JobIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

function JobCardComponent({ job, onClick, enablePrefetch = true }: JobCardProps) {
  const prefetchJob = usePrefetchJob();

  // Memoize expensive computations
  const statusColor = useMemo(
    () => STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800',
    [job.status]
  );

  const formattedPrice = useMemo(
    () => formatCentsAsUsd(job.priceCents),
    [job.priceCents]
  );

  const formattedDate = useMemo(
    () => new Date(job.createdAt).toLocaleDateString(),
    [job.createdAt]
  );

  const statusLabel = useMemo(
    () => job.status.replace('_', ' '),
    [job.status]
  );

  // Create accessible description for screen readers
  const ariaLabel = useMemo(
    () => `Job: ${job.title}. Status: ${statusLabel}. Price: ${formattedPrice}. Location: ${job.address}. Posted: ${formattedDate}`,
    [job.title, statusLabel, formattedPrice, job.address, formattedDate]
  );

  // Prefetch job data on hover for instant navigation
  const handleMouseEnter = useCallback(() => {
    if (enablePrefetch) {
      prefetchJob(job.id);
    }
  }, [enablePrefetch, prefetchJob, job.id]);

  return (
    <Link
      to={`/jobs/${job.id}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      className="block bg-white shadow rounded-lg hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      aria-label={ariaLabel}
    >
      <article className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-400" role="img" aria-label="Job icon">
                <JobIcon />
              </span>
              <h3 
                id={`job-title-${job.id}`}
                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                {job.title}
              </h3>
            </div>
          </div>
          <span 
            className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}
            role="status"
            aria-label={`Job status: ${statusLabel}`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Description */}
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">
          {job.description}
        </p>

        {/* Location */}
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <svg 
            className="h-5 w-5 mr-1" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
            />
          </svg>
          <span className="truncate">{job.address}</span>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-200">
          <time 
            className="text-sm text-gray-500"
            dateTime={job.createdAt}
          >
            {formattedDate}
          </time>
          <div 
            className="text-lg font-bold text-indigo-600"
            aria-label={`Price: ${formattedPrice}`}
          >
            {formattedPrice}
          </div>
        </div>

        {/* Hidden content for screen readers */}
        <div className="sr-only">
          <p>Job ID: {job.id}</p>
          <p>Client ID: {job.clientId}</p>
          {job.runnerId && <p>Assigned to runner ID: {job.runnerId}</p>}
          {job.deadline && <p>Deadline: {new Date(job.deadline).toLocaleDateString()}</p>}
        </div>
      </article>
    </Link>
  );
}

// Memoize the component to prevent unnecessary re-renders
// Only re-render if job.id or job.updatedAt changes
export default memo(JobCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.job.id === nextProps.job.id &&
    prevProps.job.updatedAt === nextProps.job.updatedAt
  );
});
