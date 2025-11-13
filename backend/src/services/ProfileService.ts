/**
 * Profile Service
 * Handles user profile updates, preferences, and settings
 */

import { Pool } from 'pg';
import { PasswordService } from './auth/PasswordService.js';
import logger from '../utils/logger.js';
import { NotFoundError, ValidationError, AuthenticationError } from '../core/errors/AppError.js';

export interface UpdateProfileData {
  displayName?: string;
  email?: string;
  lightningAddress?: string;
  themePreference?: 'light' | 'dark' | 'system';
  avatarUrl?: string;
}

export interface UserPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  marketingEmails?: boolean;
  jobUpdates?: boolean;
  paymentAlerts?: boolean;
}

export interface AvatarData {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
}

export interface SecurityAuditData {
  action: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: any;
}

export class ProfileService {
  constructor(
    private readonly db: Pool,
    private readonly passwordService: PasswordService
  ) {}

  /**
   * Update user profile
   */
  async updateProfile(userId: number, data: UpdateProfileData): Promise<any> {
    logger.info('Updating user profile', { userId });

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(data.displayName);
    }

    if (data.email !== undefined) {
      // Check if email already exists
      const existing = await this.db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [data.email, userId]
      );

      if (existing.rows.length > 0) {
        throw new ValidationError('Email already in use', 'EMAIL_EXISTS');
      }

      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
      updates.push(`email_verified = $${paramIndex++}`);
      values.push(false); // Reset verification when email changes
    }

    if (data.lightningAddress !== undefined) {
      // Validate Lightning address format
      if (data.lightningAddress && !this.isValidLightningAddress(data.lightningAddress)) {
        throw new ValidationError(
          'Invalid Lightning address format',
          'INVALID_LIGHTNING_ADDRESS'
        );
      }

      updates.push(`lightning_address = $${paramIndex++}`);
      values.push(data.lightningAddress || null);
    }

    if (data.themePreference !== undefined) {
      updates.push(`theme_preference = $${paramIndex++}`);
      values.push(data.themePreference);
    }

    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatarUrl);
    }

    if (updates.length === 0) {
      throw new ValidationError('No fields to update', 'NO_UPDATES');
    }

    values.push(userId);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING id, username, display_name, email, lightning_address, 
                theme_preference, avatar_url, created_at, updated_at
    `;

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    logger.info('Profile updated successfully', { userId });
    return result.rows[0];
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    logger.info('Changing user password', { userId });

    // Get user with current password hash
    const userResult = await this.db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    const user = userResult.rows[0];

    // Verify current password
    const isValid = await this.passwordService.verify(
      currentPassword,
      user.password_hash
    );

    if (!isValid) {
      await this.logSecurityEvent(userId, 'password_change_failed', false);
      throw new AuthenticationError(
        'Current password is incorrect',
        'INVALID_PASSWORD'
      );
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hash(newPassword);

    // Update password
    await this.db.query(
      `UPDATE users 
       SET password_hash = $1, last_password_change = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    // Log security event
    await this.logSecurityEvent(userId, 'password_changed', true);

    logger.info('Password changed successfully', { userId });
  }

  /**
   * Get or create user preferences
   */
  async getPreferences(userId: number): Promise<UserPreferences> {
    const result = await this.db.query(
      `SELECT email_notifications, push_notifications, sms_notifications,
              marketing_emails, job_updates, payment_alerts
       FROM user_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences
      const defaults = await this.db.query(
        `INSERT INTO user_preferences (user_id)
         VALUES ($1)
         RETURNING email_notifications, push_notifications, sms_notifications,
                   marketing_emails, job_updates, payment_alerts`,
        [userId]
      );
      return this.mapPreferences(defaults.rows[0]);
    }

    return this.mapPreferences(result.rows[0]);
  }

  /**
   * Update user preferences
   */
  async updatePreferences(userId: number, prefs: UserPreferences): Promise<UserPreferences> {
    logger.info('Updating user preferences', { userId });

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (prefs.emailNotifications !== undefined) {
      updates.push(`email_notifications = $${paramIndex++}`);
      values.push(prefs.emailNotifications);
    }

    if (prefs.pushNotifications !== undefined) {
      updates.push(`push_notifications = $${paramIndex++}`);
      values.push(prefs.pushNotifications);
    }

    if (prefs.smsNotifications !== undefined) {
      updates.push(`sms_notifications = $${paramIndex++}`);
      values.push(prefs.smsNotifications);
    }

    if (prefs.marketingEmails !== undefined) {
      updates.push(`marketing_emails = $${paramIndex++}`);
      values.push(prefs.marketingEmails);
    }

    if (prefs.jobUpdates !== undefined) {
      updates.push(`job_updates = $${paramIndex++}`);
      values.push(prefs.jobUpdates);
    }

    if (prefs.paymentAlerts !== undefined) {
      updates.push(`payment_alerts = $${paramIndex++}`);
      values.push(prefs.paymentAlerts);
    }

    if (updates.length === 0) {
      return this.getPreferences(userId);
    }

    values.push(userId);

    const query = `
      UPDATE user_preferences
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE user_id = $${paramIndex}
      RETURNING email_notifications, push_notifications, sms_notifications,
                marketing_emails, job_updates, payment_alerts
    `;

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      // Preferences don't exist, create them
      return this.updatePreferences(userId, prefs);
    }

    logger.info('Preferences updated successfully', { userId });
    return this.mapPreferences(result.rows[0]);
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(userId: number, avatarData: AvatarData): Promise<string> {
    logger.info('Uploading user avatar', { userId });

    // Deactivate old avatars
    await this.db.query(
      'UPDATE user_avatars SET is_active = FALSE WHERE user_id = $1',
      [userId]
    );

    // Insert new avatar
    const result = await this.db.query(
      `INSERT INTO user_avatars (user_id, file_name, file_size, mime_type, storage_path)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING storage_path`,
      [
        userId,
        avatarData.fileName,
        avatarData.fileSize,
        avatarData.mimeType,
        avatarData.storagePath,
      ]
    );

    const avatarUrl = result.rows[0].storage_path;

    // Update user avatar_url
    await this.db.query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [avatarUrl, userId]
    );

    logger.info('Avatar uploaded successfully', { userId, avatarUrl });
    return avatarUrl;
  }

  /**
   * Get security audit log
   */
  async getSecurityLog(userId: number, limit: number = 20): Promise<any[]> {
    const result = await this.db.query(
      `SELECT action, ip_address, user_agent, success, details, created_at
       FROM security_audit_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: number,
    action: string,
    success: boolean,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO security_audit_log 
       (user_id, action, ip_address, user_agent, success, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, ipAddress, userAgent, success, JSON.stringify(details || {})]
    );
  }

  /**
   * Validate Lightning address format
   */
  private isValidLightningAddress(address: string): boolean {
    // Format: username@domain.com
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(address);
  }

  /**
   * Map database preferences to interface
   */
  private mapPreferences(row: any): UserPreferences {
    return {
      emailNotifications: row.email_notifications,
      pushNotifications: row.push_notifications,
      smsNotifications: row.sms_notifications,
      marketingEmails: row.marketing_emails,
      jobUpdates: row.job_updates,
      paymentAlerts: row.payment_alerts,
    };
  }
}
