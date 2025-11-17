/**
 * Authentication Service
 * Supports both simple username/password auth (MVP) and OTP-based phone authentication (production)
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
    id: string | number;
    phone?: string;
    phone_number?: string;
    display_name: string;
    displayName?: string;
    username?: string;
  };
}

export interface User {
  id: string | number;
  phone?: string;
  phone_number?: string;
  display_name?: string;
  displayName?: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  theme_preference?: string;
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
  data?: {
    token: string;
    user: User;
  };
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Support both token keys for migration compatibility
    this.token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
  }

  // Simple username/password auth (current MVP implementation)
  async register(username: string, password: string, displayName?: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${API_URL}/auth-simple/register`, {
      username,
      password,
      display_name: displayName
    });
    
    if (response.data.success && response.data.data) {
      this.setAuthData(response.data.data.token, response.data.data.user);
    }
    
    return response.data;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${API_URL}/auth-simple/login`, {
      username,
      password
    });
    
    if (response.data.success && response.data.data) {
      this.setAuthData(response.data.data.token, response.data.data.user);
    }
    
    return response.data;
  }

  // OTP-based phone auth (future production implementation)
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
      this.setAuthData(response.data.token, response.data.user);
    }
    
    return response.data;
  }

  async getProfile(): Promise<User> {
    const response = await axios.get<{ user?: User; data?: { user: User } }>(`${API_URL}/auth-simple/me`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    const user = response.data.user || response.data.data?.user;
    if (user) {
      this.user = user;
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
    return user!;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await axios.put<{ user: User }>(`${API_URL}/api/profile`, data, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    if (response.data.user) {
      this.user = { ...this.user, ...response.data.user };
      localStorage.setItem('auth_user', JSON.stringify(this.user));
    }
    return response.data.user;
  }

  private setAuthData(token: string, user: User) {
    this.token = token;
    this.user = user;
    // Store with both keys for compatibility during migration
    localStorage.setItem('token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  updateUser(userData: Partial<User>) {
    if (this.user) {
      this.user = { ...this.user, ...userData };
      localStorage.setItem('auth_user', JSON.stringify(this.user));
    }
  }
}

export const authService = new AuthService();
