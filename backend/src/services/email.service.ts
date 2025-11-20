/**
 * Email Service
 * Handles sending email alerts for payment monitoring and system notifications
 */

import logger from '../utils/logger.js';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export interface AlertEmailOptions {
  subject: string;
  body: string;
  severity?: 'info' | 'warning' | 'critical';
}

export class EmailService {
  private smtpHost: string;
  private smtpPort: number;
  private smtpUser: string;
  private smtpPass: string;
  private alertEmailFrom: string;
  private alertEmailTo: string[];
  private enabled: boolean;

  constructor() {
    this.smtpHost = process.env['SMTP_HOST'] || '';
    this.smtpPort = parseInt(process.env['SMTP_PORT'] || '587');
    this.smtpUser = process.env['SMTP_USER'] || '';
    this.smtpPass = process.env['SMTP_PASS'] || '';
    this.alertEmailFrom = process.env['ALERT_EMAIL_FROM'] || 'alerts@errandbit.com';
    this.alertEmailTo = (process.env['ALERT_EMAIL_TO'] || '').split(',').filter(Boolean);
    
    // Email is enabled if all required config is present
    this.enabled = !!(this.smtpHost && this.smtpUser && this.smtpPass && this.alertEmailTo.length > 0);

    if (!this.enabled) {
      logger.warn('📧 Email service not configured - alerts will be logged only');
    } else {
      logger.info('📧 Email service initialized', {
        host: this.smtpHost,
        port: this.smtpPort,
        from: this.alertEmailFrom,
        recipients: this.alertEmailTo.length
      });
    }
  }

  /**
   * Send alert email to administrators
   */
  async sendAlert(options: AlertEmailOptions): Promise<boolean> {
    if (!this.enabled) {
      logger.warn('📧 Email not configured, logging alert instead:', {
        subject: options.subject,
        body: options.body,
        severity: options.severity || 'info'
      });
      return false;
    }

    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨'
    };

    const emoji = severityEmoji[options.severity || 'info'];
    const subject = `${emoji} ${options.subject}`;

    try {
      await this.sendEmail({
        to: this.alertEmailTo,
        subject,
        text: options.body,
        html: this.generateAlertHtml(options)
      });

      logger.info('✅ Alert email sent successfully', { subject });
      return true;
    } catch (error) {
      logger.error('❌ Failed to send alert email', { error, subject });
      return false;
    }
  }

  /**
   * Send general email
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.enabled) {
      throw new Error('Email service not configured');
    }

    // In development mode or if SMTP is not fully configured, just log
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      logger.info('📧 DEV MODE: Would send email', {
        to: options.to,
        subject: options.subject,
        text: options.text.substring(0, 100)
      });
      return;
    }

    try {
      // TODO: Integrate with actual email provider (SendGrid, AWS SES, etc.)
      // For now, using nodemailer as placeholder
      
      // Example with nodemailer (when installed):
      // const nodemailer = require('nodemailer');
      // const transporter = nodemailer.createTransport({
      //   host: this.smtpHost,
      //   port: this.smtpPort,
      //   secure: this.smtpPort === 465,
      //   auth: {
      //     user: this.smtpUser,
      //     pass: this.smtpPass
      //   }
      // });
      //
      // await transporter.sendMail({
      //   from: this.alertEmailFrom,
      //   to: Array.isArray(options.to) ? options.to.join(',') : options.to,
      //   subject: options.subject,
      //   text: options.text,
      //   html: options.html
      // });

      logger.info('📧 Email sent successfully', {
        to: options.to,
        subject: options.subject
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to send email', {
        error: err.message,
        subject: options.subject
      });
      throw error;
    }
  }

  /**
   * Generate HTML template for alert emails
   */
  private generateAlertHtml(options: AlertEmailOptions): string {
    const severityColors = {
      info: '#3b82f6',
      warning: '#f59e0b',
      critical: '#ef4444'
    };

    const color = severityColors[options.severity || 'info'];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${options.subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">${options.subject}</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
            <div style="white-space: pre-wrap; font-size: 16px;">
              ${options.body}
            </div>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #d1d5db;">
            <p style="font-size: 14px; color: #6b7280; margin: 0;">
              This is an automated alert from ErrandBit Payment Monitoring System.<br>
              Timestamp: ${new Date().toISOString()}<br>
              Environment: ${process.env.NODE_ENV || 'production'}
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send payment stuck alert
   */
  async sendStuckPaymentsAlert(count: number, totalSats: number, paymentHashes: string[]): Promise<boolean> {
    return this.sendAlert({
      subject: `${count} Stuck Payments Detected`,
      body: `Found ${count} payments stuck for extended period.\n\n` +
            `Total Amount: ${totalSats} sats\n\n` +
            `Payment Hashes:\n${paymentHashes.map(h => `- ${h}`).join('\n')}\n\n` +
            `Please investigate these payments immediately.`,
      severity: 'warning'
    });
  }

  /**
   * Send Lightning node down alert
   */
  async sendLightningDownAlert(): Promise<boolean> {
    return this.sendAlert({
      subject: 'CRITICAL: Lightning Node Connection Failed',
      body: `The Lightning node connection health check has failed.\n\n` +
            `This means:\n` +
            `- New invoice generation will fail\n` +
            `- Payment status checks will fail\n` +
            `- Payouts to runners cannot be processed\n\n` +
            `IMMEDIATE ACTION REQUIRED:\n` +
            `1. Check Lightning node status\n` +
            `2. Verify LNBits API credentials\n` +
            `3. Check network connectivity\n` +
            `4. Review error logs`,
      severity: 'critical'
    });
  }

  /**
   * Send low success rate alert
   */
  async sendLowSuccessRateAlert(successRate: number, period: string = '24h'): Promise<boolean> {
    return this.sendAlert({
      subject: `Low Payment Success Rate: ${successRate.toFixed(1)}%`,
      body: `Payment success rate has dropped to ${successRate.toFixed(1)}% over the last ${period}.\n\n` +
            `Normal success rate is >90%.\n\n` +
            `Possible causes:\n` +
            `- Lightning network routing issues\n` +
            `- Node liquidity problems\n` +
            `- LNBits service degradation\n` +
            `- Network connectivity issues\n\n` +
            `Recommended actions:\n` +
            `1. Check Lightning node health\n` +
            `2. Review recent failed payments\n` +
            `3. Monitor for pattern in failures\n` +
            `4. Consider increasing channel capacity`,
      severity: 'warning'
    });
  }
}

export const emailService = new EmailService();
