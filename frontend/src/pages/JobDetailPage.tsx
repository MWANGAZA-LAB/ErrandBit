/**
 * Job Detail Page
 * View and manage individual job
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { jobService, Job } from '../services/job.service';

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

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    /* AUTHENTICATION BYPASSED - Commented out for testing`n
    if (!isAuthenticated) {`n
      navigate('/login');`n
      return;`n
    }`n
    */

    if (id) {
      loadJob();
    }
  }, [id, isAuthenticated, navigate]);

  const loadJob = async () => {
    if (!id) return;
    
    setLoading(true);
    setError('');

    try {
      const data = await jobService.getJobById(id);
      setJob(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async () => {
    if (!id || !user) return;

    setActionLoading(true);
    setError('');

    try {
      const updatedJob = await jobService.acceptJob(id, user.id);
      setJob(updatedJob);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartJob = async () => {
    if (!id) return;

    setActionLoading(true);
    setError('');

    try {
      const updatedJob = await jobService.startJob(id);
      setJob(updatedJob);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!id) return;

    setActionLoading(true);
    setError('');

    try {
      const updatedJob = await jobService.completeJob(id);
      setJob(updatedJob);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to cancel this job?')) return;

    setActionLoading(true);
    setError('');

    try {
      const updatedJob = await jobService.cancelJob(id);
      setJob(updatedJob);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel job');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading job...</p>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => navigate('/browse-jobs')}
            className="mt-4 text-sm text-red-600 hover:text-red-500"
          >
            Back to jobs
          </button>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const isClient = user?.id === job.client_id;
  const isRunner = user?.id === job.runner_id;
  const statusColor = STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800';
  const categoryIcon = CATEGORY_ICONS[job.category as keyof typeof CATEGORY_ICONS] || '💼';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          ← Back
        </button>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-4xl">{categoryIcon}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <p className="text-sm text-gray-500 capitalize mt-1">{job.category}</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusColor}`}>
            {job.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Description */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
        </div>

        {/* Locations */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Locations</h2>
          
          <div className="space-y-4">
            {/* Pickup */}
            <div>
              <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <svg className="h-5 w-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Pickup Location
              </div>
              <p className="text-gray-600 ml-7">{job.pickup_address}</p>
              <p className="text-xs text-gray-400 ml-7">
                {job.pickup_lat.toFixed(6)}, {job.pickup_lng.toFixed(6)}
              </p>
            </div>

            {/* Dropoff */}
            {job.dropoff_address && (
              <div>
                <div className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <svg className="h-5 w-5 mr-2 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  Dropoff Location
                </div>
                <p className="text-gray-600 ml-7">{job.dropoff_address}</p>
                <p className="text-xs text-gray-400 ml-7">
                  {job.dropoff_lat?.toFixed(6)}, {job.dropoff_lng?.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Budget */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Payment</h2>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-indigo-600">
              ${job.budget_max_usd.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500">maximum budget</span>
          </div>
          {job.agreed_price_usd && (
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-xl font-semibold text-green-600">
                ${job.agreed_price_usd.toFixed(2)}
              </span>
              <span className="text-sm text-gray-500">agreed price</span>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Posted:</span>
              <span className="ml-2 text-gray-900">
                {new Date(job.created_at).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Updated:</span>
              <span className="ml-2 text-gray-900">
                {new Date(job.updated_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end space-x-3">
        {/* Open job - Runner can accept */}
        {job.status === 'open' && !isClient && (
          <button
            onClick={handleAcceptJob}
            disabled={actionLoading}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {actionLoading ? 'Accepting...' : 'Accept Job'}
          </button>
        )}

        {/* Accepted job - Runner can start */}
        {job.status === 'accepted' && isRunner && (
          <button
            onClick={handleStartJob}
            disabled={actionLoading}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {actionLoading ? 'Starting...' : 'Start Job'}
          </button>
        )}

        {/* In progress - Runner can complete */}
        {job.status === 'in_progress' && isRunner && (
          <button
            onClick={handleCompleteJob}
            disabled={actionLoading}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {actionLoading ? 'Completing...' : 'Mark as Complete'}
          </button>
        )}

        {/* Completed - Client can pay */}
        {job.status === 'completed' && isClient && (
          <button
            onClick={() => navigate(`/jobs/${job.id}/pay`)}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Pay with Lightning
          </button>
        )}

        {/* Cancel button */}
        {(job.status === 'open' || job.status === 'accepted' || job.status === 'in_progress') && (isClient || isRunner) && (
          <button
            onClick={handleCancelJob}
            disabled={actionLoading}
            className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {actionLoading ? 'Cancelling...' : 'Cancel Job'}
          </button>
        )}
      </div>
    </div>
  );
}
