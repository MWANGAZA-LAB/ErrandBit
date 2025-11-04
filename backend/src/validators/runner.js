import { body, param, query } from 'express-validator';

/**
 * Validation rules for creating a runner profile
 */
export const createRunnerValidation = [
  body('display_name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Display name must be between 3 and 100 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must not exceed 1000 characters'),
  
  body('lightning_address')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid Lightning address format'),
  
  body('hourly_rate_cents')
    .optional()
    .isInt({ min: 0, max: 100000000 })
    .withMessage('Hourly rate must be a positive integer (in cents)'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Each tag must be between 2 and 50 characters'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  
  body('location.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('location.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
];

/**
 * Validation rules for updating a runner profile
 */
export const updateRunnerValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid runner ID'),
  
  body('display_name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Display name must be between 3 and 100 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must not exceed 1000 characters'),
  
  body('lightning_address')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid Lightning address format'),
  
  body('hourly_rate_cents')
    .optional()
    .isInt({ min: 0, max: 100000000 })
    .withMessage('Hourly rate must be a positive integer'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
];

/**
 * Validation rules for searching runners
 */
export const searchRunnersValidation = [
  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  query('radius_km')
    .optional()
    .isFloat({ min: 0.1, max: 100 })
    .withMessage('Radius must be between 0.1 and 100 km'),
  
  query('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') return true;
      if (Array.isArray(value)) return true;
      return false;
    })
    .withMessage('Tags must be a string or array'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
];

/**
 * Validation rules for getting a runner by ID
 */
export const getRunnerValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid runner ID'),
];
