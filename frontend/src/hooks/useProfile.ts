/**
 * React Query Hooks for Profile Operations
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { api } from '../api';
import { queryKeys } from '../lib/queryClient';
import toast from 'react-hot-toast';

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

/**
 * Get user preferences
 */
export function usePreferences(
  options?: Omit<UseQueryOptions<Preferences, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.profilePreferences,
    queryFn: async () => {
      const response = await api.get('/profile/preferences');
      return response.data.preferences;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Get security audit log
 */
export function useSecurityLog(
  limit: number = 20,
  options?: Omit<UseQueryOptions<SecurityLogEntry[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.profileSecurityLog(limit),
    queryFn: async () => {
      const response = await api.get(`/profile/security-log?limit=${limit}`);
      return response.data.logs;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: false, // Only fetch when explicitly requested
    ...options,
  });
}

/**
 * Update profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProfileData) => {
      // Convert camelCase to snake_case for API
      const apiData: any = {};
      if (data.displayName !== undefined) apiData.display_name = data.displayName;
      if (data.email !== undefined) apiData.email = data.email;
      if (data.lightningAddress !== undefined) apiData.lightning_address = data.lightningAddress;
      if (data.themePreference !== undefined) apiData.theme_preference = data.themePreference;
      if (data.avatarUrl !== undefined) apiData.avatar_url = data.avatarUrl;
      
      const response = await api.put('/profile', apiData);
      return response.data.user;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      
      // Apply theme if changed
      if (updatedUser.theme_preference) {
        applyTheme(updatedUser.theme_preference);
      }
      
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    },
  });
}

/**
 * Change password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      // Convert camelCase to snake_case for API
      const response = await api.post('/profile/change-password', {
        current_password: data.currentPassword,
        new_password: data.newPassword,
        confirm_password: data.newPassword, // Required by schema
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to change password');
    },
  });
}

/**
 * Update preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Preferences) => {
      // Convert camelCase to snake_case for API
      const apiData: any = {};
      if (data.emailNotifications !== undefined) apiData.email_notifications = data.emailNotifications;
      if (data.pushNotifications !== undefined) apiData.push_notifications = data.pushNotifications;
      if (data.smsNotifications !== undefined) apiData.sms_notifications = data.smsNotifications;
      if (data.marketingEmails !== undefined) apiData.marketing_emails = data.marketingEmails;
      if (data.jobUpdates !== undefined) apiData.job_updates = data.jobUpdates;
      if (data.paymentAlerts !== undefined) apiData.payment_alerts = data.paymentAlerts;
      
      const response = await api.put('/profile/preferences', apiData);
      return response.data.preferences;
    },
    onMutate: async (newPreferences) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.profilePreferences });
      const previousPreferences = queryClient.getQueryData<Preferences>(queryKeys.profilePreferences);

      queryClient.setQueryData<Preferences>(queryKeys.profilePreferences, newPreferences);

      return { previousPreferences };
    },
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(queryKeys.profilePreferences, updatedPreferences);
      toast.success('Preferences updated successfully');
    },
    onError: (error: any, _, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(queryKeys.profilePreferences, context.previousPreferences);
      }
      toast.error(error.response?.data?.error || 'Failed to update preferences');
    },
  });
}

/**
 * Upload avatar
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { fileName: string; fileSize: number; mimeType: string; storagePath: string }) => {
      // Convert camelCase to snake_case for API
      const response = await api.post('/profile/avatar', {
        file_name: data.fileName,
        file_size: data.fileSize,
        mime_type: data.mimeType,
        storage_path: data.storagePath,
      });
      return response.data.avatar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      toast.success('Avatar uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to upload avatar');
    },
  });
}

// Helper function to apply theme
function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', prefersDark);
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}
