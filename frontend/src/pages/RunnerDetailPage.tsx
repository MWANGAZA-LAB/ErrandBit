/**
 * Runner Detail Page
 * View runner profile and reviews
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { runnerService, RunnerProfile } from '../services/runner.service';
import { reviewService, Review, RunnerRatingStats } from '../services/review.service';
import toast from 'react-hot-toast';

export default function RunnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [runner, setRunner] = useState<RunnerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<RunnerRatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadRunnerData();
    }
  }, [id]);

  const loadRunnerData = async () => {
    if (!id) return;
    
    setLoading(true);

    try {
      // Load runner profile
      const runnerData = await runnerService.getProfileById(Number(id));
      setRunner(runnerData);

      // Load reviews
      try {
        const reviewsData = await reviewService.getReviewsForRunner(Number(id));
        setReviews(reviewsData);
      } catch (err) {
        console.log('No reviews yet');
      }

      // Load rating stats
      try {
        const statsData = await reviewService.getRunnerRatingStats(Number(id));
        setStats(statsData);
      } catch (err) {
        console.log('No stats yet');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load runner');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading runner profile...</p>
        </div>
      </div>
    );
  }

  if (!runner) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">Runner not found</p>
          <button
            onClick={() => navigate('/find-runners')}
            className="mt-4 text-sm text-red-600 hover:text-red-500"
          >
            Back to runners
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/find-runners')}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        ← Back to runners
      </button>

      {/* Runner Profile Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Runner Profile</h1>
                {runner.available && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mt-1">
                    ✓ Available Now
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">About</h2>
            <p className="text-gray-700">{runner.bio}</p>
          </div>

          {/* Tags */}
          {runner.tags.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {runner.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 capitalize"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{runner.totalJobs}</div>
              <div className="text-sm text-gray-500">Jobs Completed</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center">
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.averageRating ? stats.averageRating.toFixed(1) : runner.avgRating?.toFixed(1) || 'N/A'}
                </div>
                {(stats?.averageRating || runner.avgRating) && (
                  <svg className="w-6 h-6 text-yellow-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
              </div>
              <div className="text-sm text-gray-500">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats?.totalReviews || reviews.length}</div>
              <div className="text-sm text-gray-500">Reviews</div>
            </div>
          </div>

          {/* Hourly Rate */}
          {runner.hourlyRate && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-500">Hourly Rate</div>
              <div className="text-3xl font-bold text-indigo-600">
                ${runner.hourlyRate.toFixed(2)}/hr
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rating Distribution */}
      {stats && stats.totalReviews > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Rating Distribution</h2>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingDistribution[rating.toString() as '1' | '2' | '3' | '4' | '5'] || 0;
              const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center space-x-3">
                  <div className="flex items-center w-16">
                    <span className="text-sm font-medium text-gray-700">{rating}</span>
                    <svg className="w-4 h-4 text-yellow-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-sm text-gray-600">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Reviews ({reviews.length})
        </h2>

        {reviews.length === 0 ? (
          <div className="text-center py-8">
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
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                {/* Rating Stars */}
                <div className="flex items-center mb-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">
                    {review.rating}/5
                  </span>
                </div>

                {/* Comment */}
                {review.comment && (
                  <p className="text-gray-700 mb-2">{review.comment}</p>
                )}

                {/* Date & Reviewer */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {review.reviewer?.username && `By ${review.reviewer.username} • `}
                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
