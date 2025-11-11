/**
 * My Jobs Page
 * Display user's posted jobs and accepted jobs
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { jobService, Job } from '../services/job.service';
import JobCard from '../components/JobCard';
import { JobCardSkeleton } from '../components/LoadingSkeletons';

type TabType = 'posted' | 'assigned' | 'all';

export default function MyJobsPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    /* AUTHENTICATION BYPASSED - Commented out for testing`n
    if (!isAuthenticated) {`n
      navigate('/login');`n
      return;`n
    }`n
    */

    loadJobs();
  }, [isAuthenticated, navigate]);

  const loadJobs = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await jobService.getMyJobs();
      setJobs(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const userId = Number(user?.id);
  
  const filteredJobs = jobs.filter(job => {
    if (activeTab === 'all') return true;
    if (activeTab === 'posted') return job.clientId === userId;
    if (activeTab === 'assigned') return job.runnerId === userId;
    return true;
  });

  const postedCount = jobs.filter(j => j.clientId === userId).length;
  const assignedCount = jobs.filter(j => j.runnerId === userId).length;

  const stats = {
    total: jobs.length,
    open: jobs.filter(j => j.status === 'open').length,
    in_progress: jobs.filter(j => j.status === 'in_progress' || j.status === 'accepted').length,
    completed: jobs.filter(j => j.status === 'completed' || j.status === 'awaiting_payment' || j.status === 'payment_confirmed').length,
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            My Jobs
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your posted and assigned jobs
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => navigate('/create-job')}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Post New Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Jobs</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Open</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.open}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.in_progress}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.completed}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`${
              activeTab === 'all'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            All Jobs
            <span className="ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium bg-gray-100 text-gray-900">
              {jobs.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('posted')}
            className={`${
              activeTab === 'posted'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Posted by Me
            <span className="ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium bg-gray-100 text-gray-900">
              {postedCount}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('assigned')}
            className={`${
              activeTab === 'assigned'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Assigned to Me
            <span className="ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium bg-gray-100 text-gray-900">
              {assignedCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State with Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredJobs.length === 0 && (
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
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'posted' && "You haven't posted any jobs yet."}
            {activeTab === 'assigned' && "You haven't been assigned any jobs yet."}
            {activeTab === 'all' && "You don't have any jobs yet."}
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/create-job')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Post Your First Job
            </button>
          </div>
        </div>
      )}

      {/* Jobs Grid */}
      {!loading && filteredJobs.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
