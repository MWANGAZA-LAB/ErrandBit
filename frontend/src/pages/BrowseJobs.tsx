/**
 * Browse Jobs Page
 * Search and filter available jobs
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNearbyJobs } from '../hooks/useJobs';
import { VirtualizedJobList } from '../components/VirtualizedJobList';
import { LoadingSpinner } from '../components/LoadingSkeletons';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'moving', label: 'Moving' },
  { value: 'handyman', label: 'Handyman' },
  { value: 'other', label: 'Other' }
];

export default function BrowseJobs() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Filters
  const [category, setCategory] = useState('');
  const [radius, setRadius] = useState(10);
  const [latitude, setLatitude] = useState(40.7128); // Default: NYC
  const [longitude, setLongitude] = useState(-74.0060);
  const [locationReady, setLocationReady] = useState(false);

  // Use React Query hook for data fetching
  const { data: jobs = [], isLoading, error } = useNearbyJobs(
    latitude,
    longitude,
    radius,
    category || undefined,
    { enabled: locationReady } // Only fetch when location is ready
  );

  useEffect(() => {
    /* AUTHENTICATION BYPASSED - Commented out for testing
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    */

    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocationReady(true);
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Use default location
          setLocationReady(true);
        }
      );
    } else {
      // Geolocation not available, use default
      setLocationReady(true);
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Browse Jobs
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Find jobs near you
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => navigate('/create-job')}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Post a Job
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Category Filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Radius Filter */}
          <div>
            <label htmlFor="radius" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Radius (km)
            </label>
            <select
              id="radius"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="25">25 km</option>
              <option value="50">50 km</option>
              <option value="100">100 km</option>
            </select>
          </div>

          {/* Location Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Your Location
            </label>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </div>
            <button
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setLatitude(position.coords.latitude);
                      setLongitude(position.coords.longitude);
                    }
                  );
                }
              }}
              className="mt-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
            >
              Update location
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            {error instanceof Error ? error.message : 'Failed to load jobs'}
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && <LoadingSpinner message="Loading jobs..." />}

      {/* Jobs List with Virtual Scrolling */}
      {!isLoading && (
        <div>
          {jobs.length > 0 && (
            <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Found {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
            </div>
          )}
          <VirtualizedJobList
            jobs={jobs}
            emptyMessage="No jobs found. Try adjusting your filters or expanding your search radius."
            estimatedItemHeight={220}
            overscan={3}
          />
        </div>
      )}
    </div>
  );
}
