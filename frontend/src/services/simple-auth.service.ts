/**
 * Simple Authentication Service
 * Uses username/password auth for testing (bypasses OTP)
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface SimpleAuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      id: number;
      username: string;
      displayName: string;
    };
  };
}

export interface SimpleUser {
  id: number;
  username: string;
  displayName: string;
}

class SimpleAuthService {
  private token: string | null = null;
  private user: SimpleUser | null = null;

  constructor() {
    // Load token and user from localStorage on init
    this.token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
  }

  async register(username: string, password: string, displayName?: string): Promise<SimpleAuthResponse> {
    const response = await axios.post<SimpleAuthResponse>(`${API_URL}/auth-simple/register`, {
      username,
      password,
      display_name: displayName
    });
    
    if (response.data.success && response.data.data) {
      this.setAuthData(response.data.data.token, response.data.data.user);
    }
    
    return response.data;
  }

  async login(username: string, password: string): Promise<SimpleAuthResponse> {
    const response = await axios.post<SimpleAuthResponse>(`${API_URL}/auth-simple/login`, {
      username,
      password
    });
    
    if (response.data.success && response.data.data) {
      this.setAuthData(response.data.data.token, response.data.data.user);
    }
    
    return response.data;
  }

  async getProfile(): Promise<SimpleUser> {
    const response = await axios.get(`${API_URL}/auth-simple/me`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data.user || response.data.data?.user;
  }

  private setAuthData(token: string, user: SimpleUser) {
    this.token = token;
    this.user = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): SimpleUser | null {
    return this.user;
  }
}

export const simpleAuthService = new SimpleAuthService();
