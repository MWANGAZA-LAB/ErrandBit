/**
 * Job Service
 * Handles job-related API calls
 */

import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface Job {
  id: string;
  client_id: string;
  runner_id?: string;
  title: string;
  description: string;
  category: string;
  status: 'open' | 'accepted' | 'in_progress' | 'completed' | 'paid' | 'cancelled';
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  dropoff_address?: string;
  budget_max_usd: number;
  agreed_price_usd?: number;
  agreed_price_sats?: number;
  distance_km?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateJobInput {
  title: string;
  description: string;
  category: string;
  pickup_lat?: number;  // Auto-detected from geolocation
  pickup_lng?: number;  // Auto-detected from geolocation
  pickup_address?: string;  // Reverse geocoded
  dropoff_lat?: number;
  dropoff_lng?: number;
  dropoff_address?: string;
  budget_max_usd: number;
  use_current_location?: boolean;  // Flag for auto-detection
}

class JobService {
  private getHeaders() {
    const token = authService.getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async createJob(data: CreateJobInput): Promise<Job> {
    const response = await axios.post(`${API_URL}/jobs`, data, {
      headers: this.getHeaders()
    });
    return response.data.job;
  }

  async getNearbyJobs(lat: number, lng: number, radius_km: number = 10, category?: string): Promise<Job[]> {
    const params: any = { lat, lng, radius_km };
    if (category) params.category = category;

    const response = await axios.get(`${API_URL}/jobs`, {
      headers: this.getHeaders(),
      params
    });
    return response.data.jobs;
  }

  async getMyJobs(): Promise<Job[]> {
    const response = await axios.get(`${API_URL}/jobs/my-jobs`, {
      headers: this.getHeaders()
    });
    return response.data.jobs;
  }

  async getJobById(id: string): Promise<Job> {
    const response = await axios.get(`${API_URL}/jobs/${id}`, {
      headers: this.getHeaders()
    });
    return response.data.job;
  }

  async acceptJob(id: string, runner_id: string, agreed_price_usd?: number): Promise<Job> {
    const response = await axios.post(
      `${API_URL}/jobs/${id}/accept`,
      { runner_id, agreed_price_usd },
      { headers: this.getHeaders() }
    );
    return response.data.job;
  }

  async startJob(id: string): Promise<Job> {
    const response = await axios.post(
      `${API_URL}/jobs/${id}/start`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data.job;
  }

  async completeJob(id: string): Promise<Job> {
    const response = await axios.post(
      `${API_URL}/jobs/${id}/complete`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data.job;
  }

  async cancelJob(id: string): Promise<Job> {
    const response = await axios.post(
      `${API_URL}/jobs/${id}/cancel`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data.job;
  }
}

export const jobService = new JobService();
