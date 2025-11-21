/**
 * Create Job Page
 * Form for posting new jobs
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobService, CreateJobInput } from '../services/job.service';
import { authService } from '../services/auth.service';
import LocationPicker from '../components/LocationPicker';
import CurrencyInput from '../components/CurrencyInput';
import toast from 'react-hot-toast';

export default function CreateJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Check authentication on mount
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      toast.error('Please login to create a job');
      navigate('/login');
    }
  }, [navigate]);
  
  const [formData, setFormData] = useState<CreateJobInput>({
    title: '',
    description: '',
    category: 'delivery',
    pickup_lat: 0,
    pickup_lng: 0,
    pickup_address: '',
    budget_max_usd: 10.00
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePriceChange = (cents: number) => {
    setFormData(prev => ({
      ...prev,
      budget_max_usd: cents / 100 // Convert cents to dollars
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate form data
      if (!formData.title.trim()) {
        throw new Error('Job title is required');
      }
      if (!formData.description.trim()) {
        throw new Error('Job description is required');
      }
      if (formData.budget_max_usd <= 0) {
        throw new Error('Job price must be greater than 0');
      }
      if (!formData.pickup_address) {
        throw new Error('Job location is required');
      }
      if (formData.pickup_lat === 0 && formData.pickup_lng === 0) {
        throw new Error('Please select a valid location');
      }

      console.log('Submitting job:', formData); // Debug log
      const job = await jobService.createJob(formData);
      navigate(`/jobs/${job.id}`);
    } catch (err: any) {
      console.error('Job creation error:', err); // Debug log
      const errorMessage = err.message || err.response?.data?.error || 'Failed to create job';
      setError(errorMessage);
      toast.error(errorMessage);
      
      // If unauthorized, redirect to login
      if (err.message?.includes('session has expired') || err.message?.includes('log in')) {
        setTimeout(() => navigate('/login'), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Post a New Job
          </h2>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Job Title
            </label>
            <input
              type="text"
              name="title"
              id="title"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Deliver package to downtown"
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Category
            </label>
            <select
              name="category"
              id="category"
              required
              value={formData.category}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            >
              <option value="delivery">Delivery</option>
              <option value="shopping">Shopping</option>
              <option value="cleaning">Cleaning</option>
              <option value="moving">Moving</option>
              <option value="handyman">Handyman</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide details about the job..."
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            />
          </div>

          {/* Job Location */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <LocationPicker
              onLocationSelect={(lat, lng, address) => {
                setFormData(prev => ({
                  ...prev,
                  pickup_lat: lat,
                  pickup_lng: lng,
                  pickup_address: address || ''
                }));
              }}
              initialLat={formData.pickup_lat}
              initialLng={formData.pickup_lng}
              label="Job Location"
              required
            />
          </div>

          {/* Price with Multi-Currency Support */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <CurrencyInput
              value={Math.round(formData.budget_max_usd * 100)} // Convert dollars to cents
              onChange={handlePriceChange}
              label="Job Price"
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
