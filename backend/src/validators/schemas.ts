/**
 * Zod Validation Schemas
 * Type-safe request validation with runtime checks
 */

import { z } from 'zod';

// ============================================================================
// Auth Schemas
// ============================================================================

export const registerSchema = z.object({
  body: z.object({
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password must be at most 100 characters'),
    display_name: z.string()
      .min(1, 'Display name is required')
      .max(100, 'Display name must be at most 100 characters')
      .optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    display_name: z.string().max(100).optional(),
    password: z.string().min(8).max(100).optional(),
  }),
});

// ============================================================================
// Job Schemas
// ============================================================================

export const createJobSchema = z.object({
  body: z.object({
    title: z.string()
      .min(5, 'Title must be at least 5 characters')
      .max(200, 'Title must be at most 200 characters'),
    description: z.string()
      .min(20, 'Description must be at least 20 characters')
      .max(5000, 'Description must be at most 5000 characters'),
    budgetSats: z.number()
      .int('Budget must be an integer')
      .positive('Budget must be positive')
      .max(100000000, 'Budget cannot exceed 100M sats'),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      address: z.string().min(1, 'Address is required').max(500),
    }),
    category: z.string().max(50).optional(),
  }),
});

export const updateJobSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(200).optional(),
    description: z.string().min(20).max(5000).optional(),
    budgetSats: z.number().int().positive().max(100000000).optional(),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      address: z.string().min(1).max(500),
    }).optional(),
    category: z.string().max(50).optional(),
    status: z.enum(['requested', 'accepted', 'in_progress', 'completed', 'cancelled']).optional(),
  }),
});

// ============================================================================
// Runner Schemas
// ============================================================================

export const createRunnerProfileSchema = z.object({
  body: z.object({
    displayName: z.string()
      .min(1, 'Display name is required')
      .max(100, 'Display name must be at most 100 characters'),
    bio: z.string()
      .max(1000, 'Bio must be at most 1000 characters')
      .optional(),
    tags: z.array(z.string().max(50))
      .max(10, 'Maximum 10 tags allowed')
      .optional(),
    hourlyRate: z.number()
      .int('Hourly rate must be an integer')
      .positive('Hourly rate must be positive')
      .max(1000000, 'Hourly rate cannot exceed 1M sats')
      .optional(),
    serviceRadius: z.number()
      .positive('Service radius must be positive')
      .max(500, 'Service radius cannot exceed 500 km')
      .optional(),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      address: z.string().min(1).max(500),
    }),
    available: z.boolean().optional(),
  }),
});

export const updateRunnerProfileSchema = z.object({
  body: z.object({
    bio: z.string().max(1000).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    hourlyRate: z.number().int().positive().max(1000000).optional(),
    serviceRadius: z.number().positive().max(500).optional(),
    location: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      address: z.string().min(1).max(500),
    }).optional(),
    available: z.boolean().optional(),
  }),
});

// ============================================================================
// Payment Schemas
// ============================================================================

export const createInvoiceSchema = z.object({
  body: z.object({
    jobId: z.number().int().positive(),
    amountSats: z.number().int().positive().max(100000000),
  }),
});

export const verifyPaymentSchema = z.object({
  body: z.object({
    jobId: z.number().int().positive(),
    preimage: z.string()
      .length(64, 'Preimage must be 64 hex characters')
      .regex(/^[0-9a-fA-F]{64}$/, 'Preimage must be valid hex'),
  }),
});

// ============================================================================
// Review Schemas
// ============================================================================

export const createReviewSchema = z.object({
  body: z.object({
    jobId: z.number().int().positive(),
    runnerId: z.number().int().positive(),
    rating: z.number()
      .int('Rating must be an integer')
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating must be at most 5'),
    comment: z.string()
      .min(10, 'Comment must be at least 10 characters')
      .max(1000, 'Comment must be at most 1000 characters')
      .optional(),
  }),
});

// ============================================================================
// Search Schemas
// ============================================================================

export const searchRunnersSchema = z.object({
  query: z.object({
    latitude: z.string()
      .transform(val => parseFloat(val))
      .refine(val => !isNaN(val) && val >= -90 && val <= 90, 'Invalid latitude'),
    longitude: z.string()
      .transform(val => parseFloat(val))
      .refine(val => !isNaN(val) && val >= -180 && val <= 180, 'Invalid longitude'),
    radius: z.string()
      .transform(val => parseFloat(val))
      .refine(val => !isNaN(val) && val > 0 && val <= 500, 'Radius must be between 0 and 500 km')
      .optional(),
  }),
});

// ============================================================================
// ID Parameter Schemas
// ============================================================================

export const idParamSchema = z.object({
  params: z.object({
    id: z.string()
      .transform(val => parseInt(val, 10))
      .refine(val => !isNaN(val) && val > 0, 'Invalid ID'),
  }),
});

// Type exports for TypeScript
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type CreateJobInput = z.infer<typeof createJobSchema>['body'];
export type UpdateJobInput = z.infer<typeof updateJobSchema>['body'];
export type CreateRunnerProfileInput = z.infer<typeof createRunnerProfileSchema>['body'];
export type UpdateRunnerProfileInput = z.infer<typeof updateRunnerProfileSchema>['body'];
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>['body'];
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>['body'];
export type CreateReviewInput = z.infer<typeof createReviewSchema>['body'];
export type SearchRunnersQuery = z.infer<typeof searchRunnersSchema>['query'];
export type IdParam = z.infer<typeof idParamSchema>['params'];
