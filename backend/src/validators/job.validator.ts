/**
 * Job Validation Schemas - Zod
 * 
 * Type-safe validation with runtime checks and auto-generated TypeScript types.
 * Zod provides better TypeScript integration than Joi.
 */

import { z } from 'zod';

/**
 * Create Job Schema
 * 
 * Validates data for creating a new job.
 * All fields are required and must meet specific criteria.
 */
export const createJobSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Job title is required')
    .max(200, 'Job title cannot exceed 200 characters'),
  
  description: z.string()
    .trim()
    .min(1, 'Job description is required')
    .max(5000, 'Job description cannot exceed 5000 characters'),
  
  priceCents: z.number()
    .int('Price must be an integer')
    .min(100, 'Price must be at least $1.00')
    .max(10000000, 'Price cannot exceed $100,000'),
  
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().trim().min(1).max(500),
  }),
  
  tags: z.array(z.string().trim().max(50)).max(20).optional(),
  
  estimatedDuration: z.number()
    .int()
    .min(15, 'Estimated duration must be at least 15 minutes')
    .max(1440, 'Estimated duration cannot exceed 24 hours')
    .optional(),
  
  urgency: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

/**
 * Update Job Schema
 * 
 * Validates data for updating an existing job.
 * All fields are optional (partial update).
 */
export const updateJobSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  
  description: z.string().trim().min(1).max(5000).optional(),
  
  priceCents: z.number()
    .int()
    .min(100)
    .max(10000000)
    .optional(),
  
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().trim().min(1).max(500),
  }).optional(),
  
  tags: z.array(z.string().trim().max(50)).max(20).optional(),
  
  estimatedDuration: z.number()
    .int()
    .min(15)
    .max(1440)
    .optional(),
  
  urgency: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  
  status: z.enum([
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled'
  ]).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

/**
 * Query Jobs Schema
 * 
 * Validates query parameters for searching/filtering jobs.
 */
export const queryJobsSchema = z.object({
  status: z.enum([
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled'
  ]).optional(),
  
  minPrice: z.number().int().min(0).optional(),
  maxPrice: z.number().int().min(0).optional(),
  
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  radius: z.number().min(0.1).max(100).optional(), // km
  
  tags: z.union([
    z.string(), // Single tag
    z.array(z.string()) // Multiple tags
  ]).optional(),
  
  urgency: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  
  clientId: z.number().int().positive().optional(),
  runnerId: z.number().int().positive().optional(),
  
  sortBy: z.enum([
    'created_at',
    'price',
    'distance',
    'urgency'
  ]).default('created_at'),
  
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * Job ID Parameter Schema
 * 
 * Validates job ID in URL parameters.
 */
export const jobIdSchema = z.object({
  id: z.number().int().positive(),
});

// Export TypeScript types inferred from Zod schemas
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type QueryJobsInput = z.infer<typeof queryJobsSchema>;
export type JobIdParam = z.infer<typeof jobIdSchema>;
