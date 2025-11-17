/**
 * Job Service
 * Handles job-related API calls
 */

import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_BASE = `${API_URL}/api`;

// Transform snake_case API response to camelCase
function transformJob(apiJob: any): Job {
  return {
    id: apiJob.id,
    clientId: apiJob.client_id || apiJob.clientId,
    runnerId: apiJob.runner_id || apiJob.runnerId,
    title: apiJob.title,
    description: apiJob.description,
    status: apiJob.status,
    priceCents: apiJob.price_cents || apiJob.priceCents,
    location: apiJob.location,
    address: apiJob.address || '',
    deadline: apiJob.deadline,
    completedAt: apiJob.completed_at || apiJob.completedAt,
    createdAt: apiJob.created_at || apiJob.createdAt,
    updatedAt: apiJob.updated_at || apiJob.updatedAt,
  };
}

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
    const token = authService.getToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async createJob(data: CreateJobInput): Promise<Job> {
    const response = await axios.post(`${API_BASE}/jobs`, data, {
      headers: this.getHeaders()
    });
    const apiJob = response.data.data || response.data.job;
    return transformJob(apiJob);
  }

  async getNearbyJobs(lat: number, lng: number, radiusKm: number = 10, status?: string): Promise<Job[]> {
    const params: any = { lat, lng, radiusKm, status: status || 'open' };

    const response = await axios.get(`${API_BASE}/jobs/search`, {
      headers: this.getHeaders(),
      params
    });
    const apiJobs = response.data.data || response.data.jobs || [];
    return apiJobs.map(transformJob);
  }

  async getMyJobs(): Promise<Job[]> {
    const response = await axios.get(`${API_BASE}/jobs/my-jobs`, {
      headers: this.getHeaders()
    });
    const apiJobs = response.data.data || response.data.jobs || [];
    return apiJobs.map(transformJob);
  }

  async getJobById(id: number | string): Promise<Job> {
    const response = await axios.get(`${API_BASE}/jobs/${id}`, {
      headers: this.getHeaders()
    });
    const apiJob = response.data.data || response.data.job;
    return transformJob(apiJob);
  }

  async assignJob(id: number | string): Promise<Job> {
    const response = await axios.post(
      `${API_BASE}/jobs/${id}/assign`,
      {},
      { headers: this.getHeaders() }
    );
    const apiJob = response.data.data || response.data.job;
    return transformJob(apiJob);
  }

  async startJob(id: number | string): Promise<Job> {
    const response = await axios.post(
      `${API_BASE}/jobs/${id}/start`,
      {},
      { headers: this.getHeaders() }
    );
    const apiJob = response.data.data || response.data.job;
    return transformJob(apiJob);
  }

  async completeJob(id: number | string): Promise<Job> {
    const response = await axios.post(
      `${API_BASE}/jobs/${id}/complete`,
      {},
      { headers: this.getHeaders() }
    );
    const apiJob = response.data.data || response.data.job;
    return transformJob(apiJob);
  }

  async cancelJob(id: number | string): Promise<Job> {
    const response = await axios.post(
      `${API_BASE}/jobs/${id}/cancel`,
      {},
      { headers: this.getHeaders() }
    );
    const apiJob = response.data.data || response.data.job;
    return transformJob(apiJob);
  }
}

export const jobService = new JobService();
