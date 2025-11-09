/**
 * Find Runners Page
 * Search for available runners
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { runnerService, RunnerProfile } from '../services/runner.service';
import { RunnerCardSkeleton } from '../components/LoadingSkeletons';
import toast from 'react-hot-toast';

export default function FindRunnersPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [runners, setRunners] = useState<RunnerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [latitude, setLatitude] = useState(40.7128); // Default: NYC
  const [longitude, setLongitude] = useState(-74.0060);
  const [radius, setRadius] = useState(10);

  useEffect(() => {
    /* AUTHENTICATION BYPASSED - Commented out for testing`n
    if (!isAuthenticated) {`n
      navigate('/login');`n
      return;`n
    }`n
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
        }
      );
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    loadRunners();
  }, [latitude, longitude, radius]);

  const loadRunners = async () => {
    setLoading(true);

    try {
      const data = await runnerService.searchNearby(latitude, longitude, radius);
      setRunners(data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load runners');
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
            Find Runners
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Discover available runners in your area
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Your Location
            </label>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </span>
              <button
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setLatitude(position.coords.latitude);
                        setLongitude(position.coords.longitude);
                        toast.success('Location updated');
                      },
                      () => {
                        toast.error('Failed to get location');
                      }
                    );
                  }
                }}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Update location
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State with Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <RunnerCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && runners.length === 0 && (
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No runners found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try expanding your search radius or check back later.
          </p>
        </div>
      )}

      {/* Runners Grid */}
      {!loading && runners.length > 0 && (
        <div>
          <div className="mb-4 text-sm text-gray-500">
            Found {runners.length} {runners.length === 1 ? 'runner' : 'runners'}
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {runners.map(runner => (
              <div
                key={runner.id}
                className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => navigate(`/runners/${runner.id}`)}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Runner</h3>
                        {runner.available && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {runner.bio}
                  </p>

                  {/* Tags */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {runner.tags.slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize"
                        >
                          {tag}
                        </span>
                      ))}
                      {runner.tags.length > 3 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          +{runner.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <div className="text-xs text-gray-500">Total Jobs</div>
                      <div className="text-lg font-semibold text-gray-900">{runner.totalJobs}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Rating</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {runner.avgRating ? (
                          <span className="flex items-center">
                            {runner.avgRating.toFixed(1)}
                            <svg className="w-4 h-4 text-yellow-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hourly Rate */}
                  {runner.hourlyRate && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-500">Hourly Rate</div>
                      <div className="text-xl font-bold text-indigo-600">
                        ${runner.hourlyRate.toFixed(2)}/hr
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
