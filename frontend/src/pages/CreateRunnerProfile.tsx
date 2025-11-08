/**
 * Create Runner Profile Page
 * Form for becoming a runner
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { runnerService, CreateRunnerInput } from '../services/runner.service';
import toast from 'react-hot-toast';

const SKILL_OPTIONS = [
  'Delivery',
  'Shopping',
  'Cleaning',
  'Moving',
  'Handyman',
  'Pet Care',
  'Gardening',
  'Tutoring',
  'Tech Support',
  'Other'
];

export default function CreateRunnerProfile() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateRunnerInput>({
    bio: '',
    skills: [],
    hourly_rate_usd: undefined,
    current_lat: undefined,
    current_lng: undefined
  });

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
          setFormData(prev => ({
            ...prev,
            current_lat: position.coords.latitude,
            current_lng: position.coords.longitude
          }));
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hourly_rate_usd' ? parseFloat(value) || undefined : value
    }));
  };

  const handleSkillToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.skills.length === 0) {
      toast.error('Please select at least one skill');
      return;
    }

    setLoading(true);

    try {
      await runnerService.createProfile(formData);
      toast.success('Runner profile created successfully!');
      navigate('/profile');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Become a Runner
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create your runner profile to start accepting jobs
          </p>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
              Bio
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Tell clients about yourself and your experience
            </p>
            <textarea
              name="bio"
              id="bio"
              required
              rows={4}
              value={formData.bio}
              onChange={handleChange}
              placeholder="I'm a reliable runner with 5 years of experience..."
              className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skills
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select all services you can provide
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SKILL_OPTIONS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => handleSkillToggle(skill)}
                  className={`${
                    formData.skills.includes(skill)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } px-4 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>

          {/* Hourly Rate */}
          <div>
            <label htmlFor="hourly_rate_usd" className="block text-sm font-medium text-gray-700">
              Hourly Rate (Optional)
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Set your preferred hourly rate in USD
            </p>
            <div className="mt-2 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                name="hourly_rate_usd"
                id="hourly_rate_usd"
                min="1"
                step="0.01"
                value={formData.hourly_rate_usd || ''}
                onChange={handleChange}
                className="block w-full pl-7 pr-12 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="25.00"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">/hr</span>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Location</h3>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="current_lat" className="block text-sm font-medium text-gray-700">
                  Latitude
                </label>
                <input
                  type="number"
                  name="current_lat"
                  id="current_lat"
                  step="any"
                  value={formData.current_lat || ''}
                  onChange={handleChange}
                  placeholder="40.7128"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="current_lng" className="block text-sm font-medium text-gray-700">
                  Longitude
                </label>
                <input
                  type="number"
                  name="current_lng"
                  id="current_lng"
                  step="any"
                  value={formData.current_lng || ''}
                  onChange={handleChange}
                  placeholder="-74.0060"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setFormData(prev => ({
                        ...prev,
                        current_lat: position.coords.latitude,
                        current_lng: position.coords.longitude
                      }));
                      toast.success('Location updated');
                    },
                    () => {
                      toast.error('Failed to get location');
                    }
                  );
                }
              }}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-500"
            >
              Use my current location
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Runner Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-900 mb-3">What happens next?</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
          <li>Your profile will be visible to clients looking for runners</li>
          <li>You can browse and accept available jobs in your area</li>
          <li>Clients can see your skills, rating, and completed jobs</li>
          <li>You'll earn Bitcoin instantly via Lightning Network</li>
        </ul>
      </div>
    </div>
  );
}
