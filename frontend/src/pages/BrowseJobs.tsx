/**
 * Browse Jobs Page
 * Search and filter available jobs
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { jobService, Job } from '../services/job.service';
import JobCard from '../components/JobCard';

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
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [category, setCategory] = useState('');
  const [radius, setRadius] = useState(10);
  const [latitude, setLatitude] = useState(40.7128); // Default: NYC
  const [longitude, setLongitude] = useState(-74.0060);

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
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Use default location
        }
      );
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    loadJobs();
  }, [latitude, longitude, radius, category]);

  const loadJobs = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await jobService.getNearbyJobs(
        latitude,
        longitude,
        radius,
        category || undefined
      );
      setJobs(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Browse Jobs
          </h2>
          <p className="mt-1 text-sm text-gray-500">
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
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Category Filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
            <label htmlFor="radius" className="block text-sm font-medium text-gray-700">
              Radius (km)
            </label>
            <select
              id="radius"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
            <label className="block text-sm font-medium text-gray-700">
              Your Location
            </label>
            <div className="mt-1 text-sm text-gray-600">
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
              className="mt-1 text-sm text-indigo-600 hover:text-indigo-500"
            >
              Update location
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading jobs...</p>
        </div>
      )}

      {/* Jobs List */}
      {!loading && jobs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or expanding your search radius.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/create-job')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Post a Job
            </button>
          </div>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div>
          <div className="mb-4 text-sm text-gray-500">
            Found {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
