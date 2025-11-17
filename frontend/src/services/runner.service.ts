/**
 * Runner Service
 * Handles runner profile operations
 */

import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_BASE = `${API_URL}/api`;

export interface RunnerProfile {
  id: number;
  userId: number;
  bio: string;
  tags: string[];
  hourlyRate?: number;
  serviceRadius: number;
  available: boolean;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  avgRating?: number;
  totalJobs: number;
  completionRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRunnerInput {
  displayName: string;
  bio: string;
  tags: string[];
  hourlyRate?: number;
  serviceRadius: number;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  available: boolean;
}

export interface UpdateRunnerInput {
  bio?: string;
  tags?: string[];
  hourlyRate?: number;
  serviceRadius?: number;
  available?: boolean;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}


class RunnerService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async createProfile(data: CreateRunnerInput): Promise<RunnerProfile> {
    const response = await axios.post(`${API_BASE}/runners`, data, {
      headers: this.getHeaders()
    });
    return response.data.data || response.data.runner;
  }

  async getMyProfile(): Promise<RunnerProfile> {
    const response = await axios.get(`${API_BASE}/runners/me`, {
      headers: this.getHeaders()
    });
    return response.data.data || response.data.runner;
  }

  async getProfileById(id: number | string): Promise<RunnerProfile> {
    const response = await axios.get(`${API_BASE}/runners/${id}`, {
      headers: this.getHeaders()
    });
    return response.data.data || response.data.runner;
  }

  async updateProfile(id: number | string, data: UpdateRunnerInput): Promise<RunnerProfile> {
    const response = await axios.patch(`${API_BASE}/runners/${id}`, data, {
      headers: this.getHeaders()
    });
    return response.data.data || response.data.runner;
  }

  async updateLocation(id: number | string, location: { lat: number; lng: number; address?: string }): Promise<RunnerProfile> {
    const response = await axios.patch(`${API_BASE}/runners/${id}`, { location }, {
      headers: this.getHeaders()
    });
    return response.data.data || response.data.runner;
  }

  async toggleAvailability(id: number | string, available: boolean): Promise<RunnerProfile> {
    const response = await axios.patch(
      `${API_BASE}/runners/${id}`,
      { available },
      { headers: this.getHeaders() }
    );
    return response.data.data || response.data.runner;
  }

  async searchNearby(lat: number, lng: number, radius: number = 10): Promise<RunnerProfile[]> {
    // Public endpoint - no auth required
    const response = await axios.get(`${API_BASE}/runners/search`, {
      params: { lat, lng, radius }
    });
    return response.data.data || response.data.runners || [];
  }
}

export const runnerService = new RunnerService();
