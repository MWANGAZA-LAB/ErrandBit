import { body, query, ValidationChain } from 'express-validator';

/**
 * Validation rules for payment instruction request
 */
export const paymentInstructionValidation: ValidationChain[] = [
  query('job_id')
    .isInt({ min: 1 })
    .withMessage('Invalid job ID'),
];

/**
 * Validation rules for invoice validation
 */
export const validateInvoiceValidation: ValidationChain[] = [
  body('job_id')
    .isInt({ min: 1 })
    .withMessage('Invalid job ID'),
  
  body('bolt11')
    .trim()
    .notEmpty()
    .withMessage('Lightning invoice (bolt11) is required')
    .matches(/^(lnbc|lntb|lnbcrt)[0-9]+[a-z0-9]+$/i)
    .withMessage('Invalid Lightning invoice format'),
];

/**
 * Validation rules for payment confirmation
 */
export const confirmPaymentValidation: ValidationChain[] = [
  body('job_id')
    .isInt({ min: 1 })
    .withMessage('Invalid job ID'),
  
  body('preimage')
    .optional()
    .trim()
    .isLength({ min: 64, max: 64 })
    .withMessage('Preimage must be 64 characters (32 bytes hex)'),
  
  body('payment_hash')
    .optional()
    .trim()
    .isLength({ min: 64, max: 64 })
    .withMessage('Payment hash must be 64 characters (32 bytes hex)'),
];
