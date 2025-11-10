/**
 * Job Validation Schemas
 * 
 * Defines validation rules for job-related API endpoints.
 * These schemas ensure data integrity and security.
 */

import Joi from 'joi';
import { commonSchemas } from '../middleware/validate.js';

/**
 * Create Job Schema
 * 
 * Validates data for creating a new job.
 * All fields are required and must meet specific criteria.
 */
export const createJobSchema = Joi.object({
  title: commonSchemas.shortText
    .required()
    .messages({
      'string.empty': 'Job title is required',
      'string.min': 'Job title must be at least 1 character',
      'string.max': 'Job title cannot exceed 200 characters'
    }),
  
  description: commonSchemas.mediumText
    .required()
    .messages({
      'string.empty': 'Job description is required',
      'string.min': 'Job description must be at least 1 character',
      'string.max': 'Job description cannot exceed 5000 characters'
    }),
  
  priceCents: commonSchemas.priceCents
    .min(100) // Minimum $1.00
    .max(10000000) // Maximum $100,000
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price must be at least $1.00',
      'number.max': 'Price cannot exceed $100,000',
      'any.required': 'Price is required'
    }),
  
  location: Joi.object({
    lat: commonSchemas.latitude.required(),
    lng: commonSchemas.longitude.required(),
    address: commonSchemas.shortText.max(500).required()
  }).required().messages({
    'any.required': 'Location is required'
  }),
  
  tags: commonSchemas.tags.optional(),
  
  estimatedDuration: Joi.number()
    .integer()
    .min(15) // Minimum 15 minutes
    .max(1440) // Maximum 24 hours
    .optional()
    .messages({
      'number.min': 'Estimated duration must be at least 15 minutes',
      'number.max': 'Estimated duration cannot exceed 24 hours'
    }),
  
  urgency: commonSchemas.enum(['low', 'medium', 'high', 'urgent']).optional()
});

/**
 * Update Job Schema
 * 
 * Validates data for updating an existing job.
 * All fields are optional (partial update).
 */
export const updateJobSchema = Joi.object({
  title: commonSchemas.shortText.optional(),
  
  description: commonSchemas.mediumText.optional(),
  
  priceCents: commonSchemas.priceCents
    .min(100)
    .max(10000000)
    .optional(),
  
  location: Joi.object({
    lat: commonSchemas.latitude.required(),
    lng: commonSchemas.longitude.required(),
    address: commonSchemas.shortText.max(500).required()
  }).optional(),
  
  tags: commonSchemas.tags.optional(),
  
  estimatedDuration: Joi.number()
    .integer()
    .min(15)
    .max(1440)
    .optional(),
  
  urgency: commonSchemas.enum(['low', 'medium', 'high', 'urgent']).optional(),
  
  status: commonSchemas.enum([
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled'
  ]).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Query Jobs Schema
 * 
 * Validates query parameters for searching/filtering jobs.
 */
export const queryJobsSchema = Joi.object({
  status: commonSchemas.enum([
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled'
  ]).optional(),
  
  minPrice: commonSchemas.priceCents.optional(),
  maxPrice: commonSchemas.priceCents.optional(),
  
  lat: commonSchemas.latitude.optional(),
  lng: commonSchemas.longitude.optional(),
  radius: Joi.number().min(0.1).max(100).optional(), // km
  
  tags: Joi.alternatives().try(
    Joi.string(), // Single tag
    Joi.array().items(Joi.string()) // Multiple tags
  ).optional(),
  
  urgency: commonSchemas.enum(['low', 'medium', 'high', 'urgent']).optional(),
  
  clientId: commonSchemas.optionalId,
  runnerId: commonSchemas.optionalId,
  
  sortBy: commonSchemas.enum([
    'created_at',
    'price',
    'distance',
    'urgency'
  ]).default('created_at'),
  
  sortOrder: commonSchemas.enum(['asc', 'desc']).default('desc'),
  
  offset: commonSchemas.offset,
  limit: commonSchemas.limit
});

/**
 * Job ID Parameter Schema
 * 
 * Validates job ID in URL parameters.
 */
export const jobIdSchema = Joi.object({
  id: commonSchemas.id
});
