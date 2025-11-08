/**
 * Authentication Service
 * Handles OTP-based phone authentication
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface OTPResponse {
  success: boolean;
  sessionId: string;
  message: string;
}

export interface VerifyResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    phone: string;
    display_name: string;
  };
}

export interface User {
  id: string;
  phone: string;
  display_name: string;
  email?: string;
  created_at: string;
}

class AuthService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  async requestOTP(phone: string): Promise<OTPResponse> {
    const response = await axios.post(`${API_URL}/auth/request-otp`, { phone });
    return response.data;
  }

  async verifyOTP(sessionId: string, code: string): Promise<VerifyResponse> {
    const response = await axios.post(`${API_URL}/auth/verify-otp`, {
      session_id: sessionId,
      code
    });
    
    if (response.data.success) {
      this.token = response.data.token;
      localStorage.setItem('token', response.data.token);
    }
    
    return response.data;
  }

  async getProfile(): Promise<User> {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data.user;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await axios.patch(`${API_URL}/auth/me`, data, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data.user;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const authService = new AuthService();
