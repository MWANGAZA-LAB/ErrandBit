/**
 * Job Service
 * Handles job-related API calls
 */

import axios from 'axios';
import { simpleAuthService } from './simple-auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_BASE = `${API_URL}/api`;

export interface Job {
  id: number;
  clientId: number;
  runnerId?: number;
  title: string;
  description: string;
  status: 'open' | 'accepted' | 'in_progress' | 'awaiting_payment' | 'payment_confirmed' | 'completed' | 'disputed' | 'cancelled';
  priceCents: number;
  location?: {
    lat: number;
    lng: number;
  };
  address: string;
  deadline?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobInput {
  title: string;
  description: string;
  priceCents: number;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  deadline?: string;
}

class JobService {
  private getHeaders() {
    const token = simpleAuthService.getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async createJob(data: CreateJobInput): Promise<Job> {
    const response = await axios.post(`${API_BASE}/jobs`, data, {
      headers: this.getHeaders()
    });
    return response.data.data || response.data.job;
  }

  async getNearbyJobs(lat: number, lng: number, radiusKm: number = 10, status?: string): Promise<Job[]> {
    const params: any = { lat, lng, radiusKm, status: status || 'open' };

    const response = await axios.get(`${API_BASE}/jobs/search`, {
      headers: this.getHeaders(),
      params
    });
    return response.data.data || response.data.jobs || [];
  }

  async getMyJobs(): Promise<Job[]> {
    const response = await axios.get(`${API_BASE}/jobs/my-jobs`, {
      headers: this.getHeaders()
    });
    return response.data.data || response.data.jobs || [];
  }

  async getJobById(id: number | string): Promise<Job> {
    const response = await axios.get(`${API_BASE}/jobs/${id}`, {
      headers: this.getHeaders()
    });
    return response.data.data || response.data.job;
  }

  async assignJob(id: number | string): Promise<Job> {
    const response = await axios.post(
      `${API_BASE}/jobs/${id}/assign`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data.data || response.data.job;
  }

  async startJob(id: number | string): Promise<Job> {
    // Start is handled by assign in new API
    return this.assignJob(id);
  }

  async completeJob(id: number | string): Promise<Job> {
    const response = await axios.post(
      `${API_BASE}/jobs/${id}/complete`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data.data || response.data.job;
  }

  async cancelJob(id: number | string): Promise<Job> {
    const response = await axios.post(
      `${API_BASE}/jobs/${id}/cancel`,
      {},
      { headers: this.getHeaders() }
    );
    return response.data.data || response.data.job;
  }
}

export const jobService = new JobService();
