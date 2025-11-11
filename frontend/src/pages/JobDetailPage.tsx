/**
 * Job Detail Page
 * View and manage individual job
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { jobService, Job } from '../services/job.service';
import { reviewService, Review } from '../services/review.service';
import { simpleAuthService } from '../services/simple-auth.service';
import { formatCentsAsUsd } from '../utils/currency';

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

// Category removed from new interface
const JOB_ICON = '💼';

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [existingReview, setExistingReview] = useState<Review | null>(null);

  useEffect(() => {
    /* AUTHENTICATION BYPASSED - Commented out for testing
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
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
      
      // Load existing review if payment is confirmed
      if (data.status === 'payment_confirmed') {
        try {
          const review = await reviewService.getReviewByJobId(Number(id));
          setExistingReview(review);
        } catch (err) {
          // No review yet, that's fine
          console.log('No review found for job');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptJob = async () => {
    if (!id) {
      setError('Invalid job ID');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Accepting job:', id);
      const updatedJob = await jobService.assignJob(id);
      console.log('Job accepted successfully:', updatedJob);
      setJob(updatedJob);
      setSuccess('Job accepted! You can now start working on it.');
      // Reload to ensure fresh data
      await loadJob();
    } catch (err: any) {
      console.error('Failed to accept job:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to assign job';
      setError(errorMsg);
      alert(`Error accepting job: ${errorMsg}`); // Make error very visible
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartJob = async () => {
    if (!id) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const updatedJob = await jobService.startJob(id);
      setJob(updatedJob);
      setSuccess('Job started! Good luck!');
      // Reload to ensure fresh data
      await loadJob();
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
    setSuccess('');

    try {
      const updatedJob = await jobService.completeJob(id);
      setJob(updatedJob);
      setSuccess('Job marked as complete! Awaiting payment from client.');
      // Reload to ensure fresh data
      await loadJob();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!id) return;

    setActionLoading(true);
    setError('');

    try {
      const updatedJob = await jobService.cancelJob(id);
      setJob(updatedJob);
      // Reload to ensure fresh data
      await loadJob();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!id || !rating) {
      setError('Please select a rating');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await reviewService.submitReview({
        jobId: Number(id),
        rating,
        comment: reviewComment
      });

      setSuccess('Review submitted! Thank you for your feedback.');
      setShowReviewForm(false);
      setRating(5);
      setReviewComment('');
      
      // Reload job to show review was submitted
      await loadJob();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit review');
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

  // Get user ID - check both AuthContext and simpleAuthService
  const contextUserId = user?.id;
  const simpleUser = simpleAuthService.getUser();
  const userId = contextUserId ? Number(contextUserId) : (simpleUser?.id || 0);
  
  const isClient = userId === job.clientId;
  const isRunner = userId === job.runnerId;
  const statusColor = STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800';

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
            <span className="text-4xl">{JOB_ICON}</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
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

      {/* Success Message */}
      {success && (
        <div className="mb-6 rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">{success}</p>
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
            {/* Job Location */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Job Location</h3>
              <p className="text-sm text-gray-600">{job.address || 'No address provided'}</p>
              {job.location && job.location.lat && job.location.lng && (
                <a
                  href={`https://www.google.com/maps?q=${job.location.lat},${job.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View on Google Maps
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Budget */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Payment</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Price</span>
              <span className="text-sm font-medium text-indigo-600">{formatCentsAsUsd(job.priceCents)}</span>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Posted</span>
              <span className="text-sm text-gray-900">{new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Last Updated</span>
              <span className="text-sm text-gray-900">{new Date(job.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end space-x-3">
        {/* Open job - Runner can accept */}
        {!isClient && job.status === 'open' && (
          <button
            onClick={handleAcceptJob}
            disabled={actionLoading}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {actionLoading ? 'Accepting...' : 'Accept Job'}
          </button>
        )}

        {/* Accepted job - Runner can start */}
        {isRunner && job.status === 'accepted' && (
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

        {/* Awaiting payment - Client can pay */}
        {(job.status === 'awaiting_payment' || job.status === 'completed') && isClient && (
          <button
            onClick={() => navigate(`/jobs/${job.id}/pay`)}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Pay with Lightning
          </button>
        )}

        {/* Payment confirmed - Client can leave review */}
        {job.status === 'payment_confirmed' && isClient && !existingReview && !showReviewForm && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Leave Review
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

      {/* Review Form */}
      {showReviewForm && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Rate Your Experience</h3>
          
          {/* Star Rating */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-colors ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-300`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {rating === 1 && '⭐ Poor'}
              {rating === 2 && '⭐⭐ Fair'}
              {rating === 3 && '⭐⭐⭐ Good'}
              {rating === 4 && '⭐⭐⭐⭐ Very Good'}
              {rating === 5 && '⭐⭐⭐⭐⭐ Excellent'}
            </p>
          </div>

          {/* Comment */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment (optional)
            </label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Share your experience with this runner..."
            />
          </div>

          {/* Submit */}
          <div className="flex space-x-3">
            <button
              onClick={handleSubmitReview}
              disabled={actionLoading}
              className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {actionLoading ? 'Submitting...' : 'Submit Review'}
            </button>
            <button
              onClick={() => {
                setShowReviewForm(false);
                setRating(5);
                setReviewComment('');
              }}
              className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Display Existing Review */}
      {existingReview && (
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Your Review</h3>
          
          {/* Rating Stars */}
          <div className="flex items-center mb-3">
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-2xl ${star <= existingReview.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="ml-3 text-sm text-gray-600">
              {existingReview.rating}/5
            </span>
          </div>

          {/* Comment */}
          {existingReview.comment && (
            <p className="text-gray-700 mb-3">{existingReview.comment}</p>
          )}

          {/* Timestamp */}
          <p className="text-sm text-gray-500">
            Submitted on {new Date(existingReview.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
