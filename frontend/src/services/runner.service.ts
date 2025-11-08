/**
 * Runner Service
 * Handles runner profile operations
 */

import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface RunnerProfile {
  id: string;
  user_id: string;
  bio: string;
  skills: string[];
  hourly_rate_usd?: number;
  available: boolean;
  current_lat?: number;
  current_lng?: number;
  total_jobs: number;
  completed_jobs: number;
  average_rating?: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRunnerInput {
  bio: string;
  skills: string[];
  hourly_rate_usd?: number;
  current_lat?: number;
  current_lng?: number;
}

export interface UpdateRunnerInput {
  bio?: string;
  skills?: string[];
  hourly_rate_usd?: number;
  available?: boolean;
}

export interface UpdateLocationInput {
  lat: number;
  lng: number;
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
    const response = await axios.post(`${API_URL}/runners`, data, {
      headers: this.getHeaders()
    });
    return response.data.runner;
  }

  async getMyProfile(): Promise<RunnerProfile> {
    const response = await axios.get(`${API_URL}/runners/me`, {
      headers: this.getHeaders()
    });
    return response.data.runner;
  }

  async getProfileById(id: string): Promise<RunnerProfile> {
    const response = await axios.get(`${API_URL}/runners/${id}`, {
      headers: this.getHeaders()
    });
    return response.data.runner;
  }

  async updateProfile(id: string, data: UpdateRunnerInput): Promise<RunnerProfile> {
    const response = await axios.patch(`${API_URL}/runners/${id}`, data, {
      headers: this.getHeaders()
    });
    return response.data.runner;
  }

  async updateLocation(id: string, data: UpdateLocationInput): Promise<RunnerProfile> {
    const response = await axios.patch(`${API_URL}/runners/${id}/location`, data, {
      headers: this.getHeaders()
    });
    return response.data.runner;
  }

  async toggleAvailability(id: string, available: boolean): Promise<RunnerProfile> {
    const response = await axios.patch(
      `${API_URL}/runners/${id}/availability`,
      { available },
      { headers: this.getHeaders() }
    );
    return response.data.runner;
  }

  async searchNearby(lat: number, lng: number, radius_km: number = 10): Promise<RunnerProfile[]> {
    const response = await axios.get(`${API_URL}/runners/search`, {
      headers: this.getHeaders(),
      params: { lat, lng, radius_km }
    });
    return response.data.runners;
  }
}

export const runnerService = new RunnerService();
