import axios from 'axios';
import { simpleAuthService } from './services/simple-auth.service';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// Create axios instance with authentication
export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = simpleAuthService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}
