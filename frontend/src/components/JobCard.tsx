/**
 * Job Card Component
 * Displays job summary in list view
 */

import { Link } from 'react-router-dom';
import { Job } from '../services/job.service';

interface JobCardProps {
  job: Job;
}

const STATUS_COLORS = {
  open: 'bg-green-100 text-green-800',
  accepted: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-purple-100 text-purple-800',
  paid: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

const CATEGORY_ICONS = {
  delivery: '📦',
  shopping: '🛒',
  cleaning: '🧹',
  moving: '📦',
  handyman: '🔧',
  other: '💼'
};

export default function JobCard({ job }: JobCardProps) {
  const statusColor = STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800';
  const categoryIcon = CATEGORY_ICONS[job.category as keyof typeof CATEGORY_ICONS] || '💼';

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block bg-white shadow rounded-lg hover:shadow-md transition-shadow duration-200"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{categoryIcon}</span>
              <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
            </div>
            <p className="mt-1 text-sm text-gray-500 capitalize">{job.category}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {job.status.replace('_', ' ')}
          </span>
        </div>

        {/* Description */}
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">
          {job.description}
        </p>

        {/* Location */}
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{job.pickup_address}</span>
        </div>

        {/* Distance (if available) */}
        {job.distance_km !== undefined && (
          <div className="mt-2 text-sm text-gray-500">
            <span className="font-medium">{job.distance_km.toFixed(1)} km away</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {new Date(job.created_at).toLocaleDateString()}
          </div>
          <div className="text-lg font-bold text-indigo-600">
            ${job.budget_max_usd.toFixed(2)}
          </div>
        </div>
      </div>
    </Link>
  );
}
