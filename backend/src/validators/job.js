import { body, param, query } from 'express-validator';

/**
 * Validation rules for creating a job
 */
export const createJobValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  
  body('price_cents')
    .isInt({ min: 100, max: 100000000 })
    .withMessage('Price must be at least 100 cents ($1) and not exceed $1,000,000'),
  
  body('client_location')
    .optional()
    .isObject()
    .withMessage('Client location must be an object'),
  
  body('client_location.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('client_location.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('target_location')
    .optional()
    .isObject()
    .withMessage('Target location must be an object'),
  
  body('target_location.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('target_location.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
];

/**
 * Validation rules for job ID parameter
 */
export const jobIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid job ID'),
];

/**
 * Validation rules for job review
 */
export const reviewJobValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid job ID'),
  
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters'),
];

/**
 * Validation rules for querying jobs
 */
export const queryJobsValidation = [
  query('status')
    .optional()
    .isIn(['requested', 'accepted', 'in_progress', 'awaiting_payment', 'payment_confirmed', 'completed', 'disputed', 'cancelled'])
    .withMessage('Invalid status'),
  
  query('client_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid client ID'),
  
  query('runner_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid runner ID'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];
