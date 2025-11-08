/**
 * ErrandBit Type Definitions
 * Strict TypeScript types for fintech-grade type safety
 */

import { Request } from 'express';

/* ============================================
 * USER & AUTHENTICATION TYPES
 * ============================================ */

export type UserRole = 'client' | 'runner' | 'admin';
export type AuthMethod = 'phone' | 'email' | 'nostr';

export interface User {
  id: number | string; // Support both DB IDs and anonymous IDs
  role: UserRole;
  phone: string | null;
  phone_verified?: boolean;
  email: string | null;
  email_verified?: boolean;
  password_hash?: string | null;
  nostr_pubkey: string | null;
  auth_method?: AuthMethod;
  created_at: Date | string;
  updated_at?: Date | string;
  is_anonymous?: boolean; // Flag for anonymous users
}

export interface UserRegistration {
  role: UserRole;
  auth_method: AuthMethod;
  email?: string;
  password?: string;
  phone?: string;
  nostr_pubkey?: string;
  nostr_signature?: string;
}

export interface UserLogin {
  auth_method: AuthMethod;
  email?: string;
  password?: string;
  phone?: string;
  verification_code?: string;
  nostr_pubkey?: string;
  nostr_signature?: string;
}

export interface JWTPayload {
  userId: number;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: number | string; // Support both DB IDs and anonymous IDs
}

/* ============================================
 * RUNNER PROFILE TYPES
 * ============================================ */

export interface Location {
  lat: number;
  lng: number;
}

export interface RunnerProfile {
  id: number;
  user_id: number;
  display_name: string;
  bio: string | null;
  lightning_address: string | null;
  hourly_rate_cents: number | null;
  tags: string[];
  location: string | null; // PostGIS geography type
  avatar_url: string | null;
  completion_rate: number;
  avg_rating: number;
  total_jobs: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRunnerProfile {
  display_name: string;
  bio?: string;
  lightning_address?: string;
  hourly_rate_cents?: number;
  tags?: string[];
  location?: Location;
  avatar_url?: string;
}

export interface UpdateRunnerProfile {
  display_name?: string;
  bio?: string;
  lightning_address?: string;
  hourly_rate_cents?: number;
  tags?: string[];
  location?: Location;
  avatar_url?: string;
}

export interface RunnerSearchFilters {
  lat?: number;
  lng?: number;
  radius_km?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/* ============================================
 * JOB TYPES
 * ============================================ */

export type JobStatus = 
  | 'open' 
  | 'accepted' 
  | 'in_progress' 
  | 'awaiting_payment' 
  | 'payment_confirmed' 
  | 'completed' 
  | 'disputed' 
  | 'cancelled';

export interface Job {
  id: number;
  client_id: number;
  runner_id: number | null;
  title: string;
  description: string;
  price_cents: number;
  location: string | null; // PostGIS geography type
  status: JobStatus;
  deadline: Date | null;
  created_at: Date;
  updated_at: Date;
  accepted_at: Date | null;
  completed_at: Date | null;
  payment_confirmed_at: Date | null;
}

export interface CreateJob {
  title: string;
  description: string;
  price_cents: number;
  location?: Location;
  deadline?: string;
}

export interface UpdateJobStatus {
  status: JobStatus;
}

/* ============================================
 * PAYMENT TYPES
 * ============================================ */

export interface Payment {
  id: number;
  job_id: number;
  payment_hash: string | null;
  preimage: string | null;
  amount_sats: number;
  paid_at: Date;
  created_at: Date;
}

export interface LightningInvoice {
  paymentHash: string;
  amountSats: number | null;
  description: string | null;
  expiresAt: Date;
  timestamp: Date;
}

export interface InvoiceValidation {
  isValid: boolean;
  error?: string;
  details?: string;
  invoice?: LightningInvoice;
}

export interface PaymentInstruction {
  job_id: number;
  amount_cents: number;
  amount_sats: number;
  fiat_equiv_usd: string;
  runner: {
    lightning_address: string | null;
    display_name: string;
  };
  instructions: string[];
}

/* ============================================
 * REVIEW TYPES
 * ============================================ */

export interface Review {
  id: number;
  job_id: number;
  reviewer_id: number;
  rating: number;
  comment: string | null;
  created_at: Date;
}

export interface CreateReview {
  rating: number;
  comment?: string;
}

/* ============================================
 * MESSAGE TYPES
 * ============================================ */

export interface Message {
  id: number;
  job_id: number;
  sender_id: number;
  content: string;
  created_at: Date;
}

/* ============================================
 * DATABASE TYPES
 * ============================================ */

export interface DatabaseConfig {
  connected: boolean;
  ok?: boolean;
  reason?: string;
  error?: string;
  mode?: 'postgres' | 'mock';
}

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

/* ============================================
 * API RESPONSE TYPES
 * ============================================ */

export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface PaginatedResponse<T> {
  results: T[];
  total: number;
  limit: number;
  offset: number;
}

/* ============================================
 * UTILITY TYPES
 * ============================================ */

export interface HealthCheck {
  ok: boolean;
  service: string;
  timestamp: string;
  db?: DatabaseConfig;
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

/* ============================================
 * ENVIRONMENT VARIABLES
 * ============================================ */

export interface EnvironmentVariables {
  PORT: string;
  NODE_ENV: 'development' | 'production' | 'test';
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ALLOWED_ORIGINS: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvironmentVariables {}
  }
}
