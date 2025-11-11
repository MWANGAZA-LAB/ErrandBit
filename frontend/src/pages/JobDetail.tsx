/**
 * Job Detail Page
 * Shows job details and payment flow for completed jobs
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Job {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'paid';
  runner: {
    id: string;
    name: string;
    rating: number;
    completedJobs: number;
  };
  client: {
    id: string;
    name: string;
  };
  createdAt: string;
  completedAt?: string;
  invoice?: string;
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Mock job data - in production, fetch from API
  const [job, setJob] = useState<Job>({
    id: id || '1',
    title: 'Grocery Delivery',
    description: 'Pick up groceries from Whole Foods and deliver to my apartment. List of items provided.',
    amount: 50000, // 50,000 sats
    status: 'completed',
    runner: {
      id: 'runner1',
      name: 'Alex Runner',
      rating: 4.8,
      completedJobs: 42,
    },
    client: {
      id: 'client1',
      name: 'You',
    },
    createdAt: '2025-10-30T10:00:00Z',
    completedAt: '2025-10-30T12:30:00Z',
    invoice: 'lnbc500000n1p...', // Mock invoice
  });

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const handlePaymentSuccess = async (preimage: string) => {
    console.log('Payment successful:', preimage);
    
    // Update job status
    setJob((prev) => ({ ...prev, status: 'paid' }));
    
    // Show review form
    setShowReviewForm(true);
    
    // In production, update backend
    // await api.updateJobStatus(job.id, 'paid', preimage);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment failed:', error);
    alert(`Payment failed: ${error}`);
  };

  const handleSubmitReview = async () => {
    console.log('Submitting review:', { rating, reviewText });
    
    // In production, submit to backend
    // await api.submitReview(job.id, job.runner.id, rating, reviewText);
    
    alert('Review submitted! Thank you.');
    navigate('/my-jobs');
  };

  const getStatusBadge = (status: Job['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      paid: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      pending: 'Pending',
      accepted: 'Accepted',
      in_progress: 'In Progress',
      completed: 'Completed - Ready to Pay',
      paid: 'Paid',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/my-jobs')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to My Jobs
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
              {getStatusBadge(job.status)}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{job.amount.toLocaleString()} sats</div>
              <div className="text-sm text-gray-500">~${(job.amount * 0.0004).toFixed(2)} USD</div>
            </div>
          </div>

          <p className="text-gray-700 mb-4">{job.description}</p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Runner:</span>
              <div className="flex items-center mt-1">
                <span className="font-medium text-gray-900">{job.runner.name}</span>
                <div className="flex items-center ml-2">
                  <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-gray-700">{job.runner.rating}</span>
                  <span className="text-gray-500 ml-1">({job.runner.completedJobs} jobs)</span>
                </div>
              </div>
            </div>
            <div>
              <span className="text-gray-600">Created:</span>
              <div className="font-medium text-gray-900 mt-1">
                {new Date(job.createdAt).toLocaleString()}
              </div>
            </div>
            {job.completedAt && (
              <div>
                <span className="text-gray-600">Completed:</span>
                <div className="font-medium text-gray-900 mt-1">
                  {new Date(job.completedAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {job.status === 'completed' && job.invoice && (
          <div className="p-6 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-3">Lightning Invoice:</p>
              <div className="font-mono text-xs bg-gray-100 p-3 rounded break-all">
                {job.invoice}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(job.invoice || '');
                  alert('Invoice copied to clipboard');
                }}
                className="mt-3 w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Copy Invoice
              </button>
            </div>
          </div>
        )}

        {job.status === 'paid' && !showReviewForm && (
          <div className="p-6 bg-green-50 border-t border-green-200">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-green-900">Payment Complete</p>
                <p className="text-sm text-green-700">The runner has been paid. Thank you for using ErrandBit!</p>
              </div>
            </div>
          </div>
        )}

        {showReviewForm && (
          <div className="p-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave a Review</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <svg
                      className={`w-8 h-8 ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Review (optional)</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Share your experience with this runner..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSubmitReview}
                className="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Submit Review
              </button>
              <button
                onClick={() => navigate('/my-jobs')}
                className="px-6 py-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
