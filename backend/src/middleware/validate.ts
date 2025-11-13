/**
 * Input Validation Middleware
 * 
 * Provides middleware for validating request data using Zod schemas.
 * Prevents invalid data from reaching business logic and database.
 * 
 * Key features:
 * - Schema-based validation with Zod (better TypeScript integration than Joi)
 * - Automatic sanitization (strips unknown fields)
 * - Detailed error messages
 * - Type-safe validated data
 */

import type { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodTypeAny } from 'zod';
import { ValidationError } from '../errors/AppError.js';

/**
 * Validation Middleware Factory (Zod)
 * 
 * Creates middleware that validates request data against a Zod schema.
 * 
 * @param schema - Zod schema to validate against
 * 
 * Usage:
 *   app.post('/api/jobs', validate(createJobSchema), async (req, res) => {
 *     // req.body is now validated and type-safe
 *   });
 */
export function validate(schema: z.ZodObject<any>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request data against schema
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into readable messages
        const errors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          type: err.code,
        }));

        const message = errors.map(e => `${e.field}: ${e.message}`).join(', ');
        
        next(new ValidationError(message, 'VALIDATION_FAILED'));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request body only
 */
export function validateBody(schema: ZodTypeAny) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        const message = errors.map(e => `${e.field}: ${e.message}`).join(', ');
        
        next(new ValidationError(message, 'VALIDATION_FAILED'));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate request query only
 */
export function validateQuery(schema: ZodTypeAny) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        const message = errors.map(e => `${e.field}: ${e.message}`).join(', ');
        
        next(new ValidationError(message, 'VALIDATION_FAILED'));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Common Validation Patterns (Zod)
 * 
 * Reusable Zod schemas for common data types
 */
export const commonSchemas = {
  // Positive integer ID
  id: z.number().int().positive(),
  
  // Optional positive integer ID
  optionalId: z.number().int().positive().optional(),
  
  // Pagination offset
  offset: z.number().int().min(0).default(0),
  
  // Pagination limit
  limit: z.number().int().min(1).max(100).default(20),
  
  // Email address
  email: z.string().email().toLowerCase().trim().max(255),
  
  // Phone number (E.164 format)
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/).trim(),
  
  // URL
  url: z.string().url().trim().max(2000),
  
  // ISO 8601 date
  isoDate: z.string().datetime(),
  
  // Latitude
  latitude: z.number().min(-90).max(90),
  
  // Longitude
  longitude: z.number().min(-180).max(180),
  
  // Price in cents (positive integer)
  priceCents: z.number().int().min(0).max(1000000000),
  
  // Short text (titles, names)
  shortText: z.string().trim().min(1).max(200),
  
  // Medium text (descriptions)
  mediumText: z.string().trim().min(1).max(5000),
  
  // Long text (content, articles)
  longText: z.string().trim().min(1).max(50000),
  
  // Tags array
  tags: z.array(z.string().trim().max(50)).max(20),
  
  // Boolean
  boolean: z.boolean(),
  
  // UUID
  uuid: z.string().uuid(),
  
  // Enum
  enum: (values: string[]) => z.enum(values as [string, ...string[]])
};

/**
 * Sanitization Helpers
 * 
 * Additional sanitization beyond Zod validation
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

