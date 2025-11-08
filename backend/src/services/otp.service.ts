/**
 * OTP Service - TypeScript
 * Simple OTP verification for development
 * No Twilio required - uses fixed code or console logging
 */

import NodeCache from 'node-cache';
import crypto from 'crypto';

// Cache for OTP codes (TTL: 10 minutes)
const otpCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

interface OTPSession {
  phone: string;
  code: string;
  hash: string;
  attempts: number;
  expiresAt: Date;
}

export class OTPService {
  /**
   * Generate and send OTP to phone number
   */
  async requestOTP(phoneNumber: string): Promise<{ sessionId: string }> {
    // Validate phone number format
    if (!this.isValidPhone(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }
    
    // Generate 6-digit OTP
    const code = this.generateOTP();
    const sessionId = crypto.randomBytes(16).toString('hex');
    const hash = this.hashOTP(code);
    
    // Store in cache
    const session: OTPSession = {
      phone: phoneNumber,
      code,
      hash,
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };
    
    otpCache.set(sessionId, session);
    
    // Always log OTP to console (Twilio removed)
    await this.sendSMS(phoneNumber, code);
    console.log(`[OTP] Session: ${sessionId}`);
    
    return { sessionId };
  }
  
  /**
   * Verify OTP code
   */
  async verifyOTP(sessionId: string, code: string): Promise<string> {
    const session = otpCache.get<OTPSession>(sessionId);
    
    if (!session) {
      throw new Error('Invalid or expired OTP session');
    }
    
    // Check expiration
    if (new Date() > session.expiresAt) {
      otpCache.del(sessionId);
      throw new Error('OTP expired');
    }
    
    // Check attempts
    if (session.attempts >= 3) {
      otpCache.del(sessionId);
      throw new Error('Too many failed attempts');
    }
    
    // Verify code
    if (session.code !== code) {
      session.attempts++;
      otpCache.set(sessionId, session);
      throw new Error('Invalid OTP code');
    }
    
    // Success - delete session and return phone number
    otpCache.del(sessionId);
    return session.phone;
  }
  
  /**
   * Generate 6-digit OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  /**
   * Hash OTP for storage
   */
  private hashOTP(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
  
  /**
   * Log OTP to console (no SMS sending)
   */
  private async sendSMS(to: string, code: string): Promise<void> {
    // Development mode - just log to console
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📱 OTP CODE FOR ${to}`);
    console.log(`🔐 CODE: ${code}`);
    console.log(`⏰ Valid for 10 minutes`);
    console.log(`${'='.repeat(60)}\n`);
    // No actual SMS sending - Twilio removed
  }
  
  /**
   * Validate phone number format (E.164)
   */
  private isValidPhone(phone: string): boolean {
    // E.164 format: +[country code][number]
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }
}

export const otpService = new OTPService();
