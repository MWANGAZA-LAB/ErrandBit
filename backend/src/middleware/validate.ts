/**
 * Input Validation Middleware
 * 
 * Provides middleware for validating request data using Joi schemas.
 * Prevents invalid data from reaching business logic and database.
 * 
 * Key features:
 * - Schema-based validation
 * - Automatic sanitization (strips unknown fields)
 * - Detailed error messages
 * - Type-safe validated data
 */

import type { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../errors/AppError.js';

/**
 * Validation Middleware Factory
 * 
 * Creates middleware that validates request data against a Joi schema.
 * 
 * @param schema - Joi schema to validate against
 * @param property - Which request property to validate ('body', 'query', 'params')
 * 
 * Usage:
 *   app.post('/api/jobs', validate(createJobSchema), async (req, res) => {
 *     // req.body is now validated and sanitized
 *   });
 */
export function validate(
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Validate the specified request property
    const { error, value } = schema.validate(req[property], {
      // Stop after first error for better performance
      abortEarly: false,
      
      // Remove fields not defined in schema (security)
      stripUnknown: true,
      
      // Convert types when possible (e.g., string "123" to number 123)
      convert: true
    });
    
    if (error) {
      // Format validation errors into user-friendly messages
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, ''),
        type: detail.type
      }));
      
      // Throw validation error with details
      throw new ValidationError('Validation failed', errors);
    }
    
    // Replace request property with validated and sanitized data
    req[property] = value;
    
    next();
  };
}

/**
 * Common Validation Patterns
 * 
 * Reusable Joi schemas for common data types
 */
export const commonSchemas = {
  // Positive integer ID
  id: Joi.number().integer().positive().required(),
  
  // Optional positive integer ID
  optionalId: Joi.number().integer().positive().optional(),
  
  // Pagination offset
  offset: Joi.number().integer().min(0).default(0),
  
  // Pagination limit
  limit: Joi.number().integer().min(1).max(100).default(20),
  
  // Email address
  email: Joi.string().email().lowercase().trim().max(255),
  
  // Phone number (E.164 format)
  phone: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).trim(),
  
  // URL
  url: Joi.string().uri().trim().max(2000),
  
  // ISO 8601 date
  isoDate: Joi.date().iso(),
  
  // Latitude
  latitude: Joi.number().min(-90).max(90),
  
  // Longitude
  longitude: Joi.number().min(-180).max(180),
  
  // Price in cents (positive integer)
  priceCents: Joi.number().integer().min(0).max(1000000000),
  
  // Short text (titles, names)
  shortText: Joi.string().trim().min(1).max(200),
  
  // Medium text (descriptions)
  mediumText: Joi.string().trim().min(1).max(5000),
  
  // Long text (content, articles)
  longText: Joi.string().trim().min(1).max(50000),
  
  // Tags array
  tags: Joi.array().items(Joi.string().trim().max(50)).max(20),
  
  // Boolean
  boolean: Joi.boolean().strict(),
  
  // UUID
  uuid: Joi.string().uuid(),
  
  // Enum
  enum: (values: string[]) => Joi.string().valid(...values)
};

/**
 * Sanitization Helpers
 * 
 * Additional sanitization beyond Joi validation
 */
export const sanitize = {
  /**
   * Remove HTML tags from string
   */
  stripHtml: (text: string): string => {
    return text.replace(/<[^>]*>/g, '');
  },
  
  /**
   * Escape HTML special characters
   */
  escapeHtml: (text: string): string => {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'/]/g, char => htmlEscapes[char] || char);
  },
  
  /**
   * Normalize whitespace
   */
  normalizeWhitespace: (text: string): string => {
    return text.replace(/\s+/g, ' ').trim();
  }
};
