/**
 * Loading Skeleton Components
 * Provide visual feedback while content is loading
 * Improves perceived performance
 */

export function JobCardSkeleton() {
  return (
    <div
      className="block bg-white shadow rounded-lg p-6 animate-pulse"
      role="status"
      aria-label="Loading job card"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded"></div>
            <div className="h-5 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
      </div>

      {/* Description */}
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>

      {/* Location */}
      <div className="flex items-center mb-4">
        <div className="h-5 w-5 bg-gray-200 rounded mr-2"></div>
        <div className="h-3 bg-gray-200 rounded w-40"></div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="h-3 bg-gray-200 rounded w-24"></div>
        <div className="h-5 bg-gray-200 rounded w-16"></div>
      </div>
      
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function RunnerCardSkeleton() {
  return (
    <div
      className="bg-white shadow rounded-lg p-6 animate-pulse"
      role="status"
      aria-label="Loading runner profile"
    >
      {/* Header */}
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-4/5"></div>
        <div className="h-3 bg-gray-200 rounded w-3/5"></div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-6 w-20 bg-gray-200 rounded-full"></div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
        <div>
          <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-8"></div>
        </div>
        <div>
          <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-5 bg-gray-200 rounded w-12"></div>
        </div>
      </div>
      
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50"
      role="status"
      aria-label="Loading page"
    >
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading table">
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading form">
      {[...Array(4)].map((_, i) => (
        <div key={i}>
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      ))}
      <div className="h-10 bg-gray-200 rounded w-32"></div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg overflow-hidden animate-pulse">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
