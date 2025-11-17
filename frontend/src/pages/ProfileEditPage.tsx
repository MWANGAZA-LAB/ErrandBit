/**
 * Profile Edit Page
 * Comprehensive profile management with Lightning address, theme, avatar, and security features
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  usePreferences,
  useUpdateProfile,
  useChangePassword,
  useUpdatePreferences,
  useSecurityLog,
} from '../hooks/useProfile';

interface ProfileData {
  displayName?: string;
  email?: string;
  lightningAddress?: string;
  themePreference?: 'light' | 'dark' | 'system';
  avatarUrl?: string;
}

interface Preferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  marketingEmails?: boolean;
  jobUpdates?: boolean;
  paymentAlerts?: boolean;
}

interface SecurityLogEntry {
  id: number;
  action: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  createdAt: string;
  details?: any;
}

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Profile state
  const [profile, setProfile] = useState<ProfileData>({
    displayName: '',
    email: '',
    lightningAddress: '',
    themePreference: 'dark',
    avatarUrl: '',
  });

  // Preferences state
  const [preferences, setPreferences] = useState<Preferences>({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    marketingEmails: false,
    jobUpdates: true,
    paymentAlerts: true,
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Security log state
  const [showSecurityLog, setShowSecurityLog] = useState(false);

  // React Query hooks - only fetch when authenticated
  const { data: preferencesData, isLoading: preferencesLoading } = usePreferences({
    enabled: isAuthenticated,
  });
  const { data: securityLogData, refetch: refetchSecurityLog } = useSecurityLog(20);
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const updatePreferencesMutation = useUpdatePreferences();

  // UI state
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');

  // Load profile data from auth context
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      // Load current user data from auth context
      if (user) {
        setProfile({
          displayName: 'displayName' in user ? user.displayName : (user as any).display_name || '',
          email: (user as any).email || '',
          lightningAddress: (user as any).lightning_address || '',
          themePreference: (user as any).theme_preference || 'dark',
          avatarUrl: (user as any).avatar_url || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, [isAuthenticated, navigate, loadProfile]);

  // Sync preferences from React Query
  useEffect(() => {
    if (preferencesData) {
      setPreferences(preferencesData);
    }
  }, [preferencesData]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Lightning address format if provided
    if (profile.lightningAddress && !isValidLightningAddress(profile.lightningAddress)) {
      toast.error('Invalid Lightning address format. Use format: user@domain.com');
      return;
    }

    updateProfileMutation.mutate(profile);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(passwordData.newPassword);
    const hasLowerCase = /[a-z]/.test(passwordData.newPassword);
    const hasNumber = /[0-9]/.test(passwordData.newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      toast.error('Password must contain uppercase, lowercase, and number');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    }, {
      onSuccess: () => {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      },
    });
  };

  const handlePreferencesUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferencesMutation.mutate(preferences);
  };

  const isValidLightningAddress = (address: string): boolean => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(address);
  };

  const handleViewSecurityLog = async () => {
    setShowSecurityLog(true);
    await refetchSecurityLog();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/profile')}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Profile
        </button>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl">
          Edit Profile
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account settings, Lightning address, and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Profile & Lightning
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`${
              activeTab === 'preferences'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Preferences
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`${
              activeTab === 'security'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Security
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg transition-colors">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Basic Information
              </h3>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  placeholder="Your display name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Lightning Address */}
          <div className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg transition-colors">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Lightning Network
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add your Lightning address to receive instant Bitcoin payments for completed jobs
              </p>
            </div>
            <div className="px-6 py-5">
              <div>
                <label htmlFor="lightningAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lightning Address
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(format: user@domain.com)</span>
                </label>
                <input
                  type="text"
                  id="lightningAddress"
                  value={profile.lightningAddress}
                  onChange={(e) => setProfile({ ...profile, lightningAddress: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono transition-colors"
                  placeholder="yourname@getalby.com"
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Get a Lightning address from providers like{' '}
                  <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                    Alby
                  </a>
                  ,{' '}
                  <a href="https://walletofsatoshi.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                    Wallet of Satoshi
                  </a>
                  , or{' '}
                  <a href="https://strike.me" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                    Strike
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Theme Preferences */}
          <div className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg transition-colors">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Appearance
              </h3>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Theme Preference
              </label>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    id="theme-light"
                    name="theme"
                    type="radio"
                    checked={profile.themePreference === 'light'}
                    onChange={() => setProfile({ ...profile, themePreference: 'light' })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <label htmlFor="theme-light" className="ml-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-900 dark:text-white">Light</span>
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="theme-dark"
                    name="theme"
                    type="radio"
                    checked={profile.themePreference === 'dark'}
                    onChange={() => setProfile({ ...profile, themePreference: 'dark' })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <label htmlFor="theme-dark" className="ml-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                    <span className="text-sm text-gray-900 dark:text-white">Dark</span>
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="theme-system"
                    name="theme"
                    type="radio"
                    checked={profile.themePreference === 'system'}
                    onChange={() => setProfile({ ...profile, themePreference: 'system' })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <label htmlFor="theme-system" className="ml-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-900 dark:text-white">System</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <form onSubmit={handlePreferencesUpdate} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg transition-colors">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Notification Preferences
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Choose how you want to be notified about updates
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="emailNotifications"
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="emailNotifications" className="font-medium text-gray-700 dark:text-gray-300">
                    Email Notifications
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive email updates about your jobs and account</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="pushNotifications"
                    type="checkbox"
                    checked={preferences.pushNotifications}
                    onChange={(e) => setPreferences({ ...preferences, pushNotifications: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="pushNotifications" className="font-medium text-gray-700 dark:text-gray-300">
                    Push Notifications
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive push notifications in your browser</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="smsNotifications"
                    type="checkbox"
                    checked={preferences.smsNotifications}
                    onChange={(e) => setPreferences({ ...preferences, smsNotifications: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="smsNotifications" className="font-medium text-gray-700 dark:text-gray-300">
                    SMS Notifications
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive text messages for important updates</p>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Specific Updates</h4>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="jobUpdates"
                        type="checkbox"
                        checked={preferences.jobUpdates}
                        onChange={(e) => setPreferences({ ...preferences, jobUpdates: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="jobUpdates" className="font-medium text-gray-700 dark:text-gray-300">
                        Job Updates
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Notifications about job status changes</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="paymentAlerts"
                        type="checkbox"
                        checked={preferences.paymentAlerts}
                        onChange={(e) => setPreferences({ ...preferences, paymentAlerts: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="paymentAlerts" className="font-medium text-gray-700 dark:text-gray-300">
                        Payment Alerts
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Notifications about payments and payouts</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="marketingEmails"
                        type="checkbox"
                        checked={preferences.marketingEmails}
                        onChange={(e) => setPreferences({ ...preferences, marketingEmails: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="marketingEmails" className="font-medium text-gray-700 dark:text-gray-300">
                        Marketing Emails
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive news, tips, and special offers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updatePreferencesMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password */}
          <form onSubmit={handlePasswordChange} className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg transition-colors">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Change Password
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Password must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  placeholder="Confirm new password"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </form>

          {/* Security Log */}
          <div className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50 rounded-lg transition-colors">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Security Activity Log
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Recent security-related activity on your account
                </p>
              </div>
              <button
                type="button"
                onClick={handleViewSecurityLog}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                View Log
              </button>
            </div>
            
            {showSecurityLog && (
              <div className="px-6 py-5">
                {!securityLogData || securityLogData.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No security events recorded</p>
                ) : (
                  <div className="space-y-3">
                    {securityLogData.map((entry) => (
                      <div key={entry.id} className="flex items-start border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
                        <div className="flex-shrink-0">
                          <div className={`w-2 h-2 mt-2 rounded-full ${entry.success ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {entry.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            IP: {entry.ipAddress}
                          </p>
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            entry.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {entry.success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
