/**
 * ErrandBit API Server - TypeScript
 * Strict type-safe Express server with comprehensive security
 */

import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import logger, { stream } from './utils/logger.js';
import { swaggerSpec } from './config/swagger.js';
// Routes
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.routes.js'; // OTP-based auth
import authSimpleRouter from './routes/auth-simple.routes.js'; // Simple username/password auth
import authSimpleRefactoredRouter from './routes/auth-simple-refactored.routes.js'; // Refactored auth routes
import jobsRouter from './routes/jobs.routes.js'; // TypeScript
import runnersRouter from './routes/runners.routes.js'; // TypeScript
import paymentsRouter from './routes/payments.routes.js'; // TypeScript
import reviewsRouter from './routes/reviews.routes.js'; // TypeScript
import messagesRouter from './routes/messages.js';

// Controller-based routes (new clean architecture)
import jobsControllerRouter from './routes/jobs.controller.routes.js';
import runnersControllerRouter from './routes/runners.controller.routes.js';
import paymentsControllerRouter from './routes/payments.controller.routes.js';
import reviewsControllerRouter from './routes/reviews.controller.routes.js';

// TypeScript modules
import { notFound } from './utils/error.js';
import { sanitizeError, sanitizeBody } from './middleware/sanitize.js';
import { generalLimiter, authLimiter, paymentLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/error/errorHandler.js';

dotenv.config();

const app: Express = express();
const isDevelopment: boolean = process.env.NODE_ENV === 'development';

// Security middleware
app.use(helmet());

// CORS configuration - restrict in production
const corsOptions = {
  origin: isDevelopment ? '*' : (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan(isDevelopment ? 'dev' : 'combined', { stream }));

// Sanitize user input
app.use(sanitizeBody);

// Apply general rate limiting to all routes
app.use(generalLimiter);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/health', healthRouter);
app.use('/auth-simple', authLimiter, authSimpleRefactoredRouter); // Refactored auth (clean architecture)
app.use('/auth', authLimiter, authSimpleRouter); // Simple auth (no OTP) - legacy
app.use('/auth/otp', authLimiter, authRouter); // OTP auth (optional)

// Legacy routes (will be deprecated)
app.use('/runners', runnersRouter);
app.use('/jobs', jobsRouter);
app.use('/reviews', reviewsRouter);
app.use('/messages', messagesRouter);
app.use('/payments', paymentLimiter, paymentsRouter);

// New controller-based routes (clean architecture)
app.use('/api/jobs', jobsControllerRouter);
app.use('/api/runners', runnersControllerRouter);
app.use('/api/payments', paymentLimiter, paymentsControllerRouter);
app.use('/api/reviews', reviewsControllerRouter);

// Error handling - New centralized handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Legacy error handlers (can be removed after migration)
app.use(notFound);
app.use(sanitizeError);

const PORT: number = parseInt(process.env.PORT || '4000', 10);

app.listen(PORT, () => {
  logger.info(`ErrandBit API listening on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Security: Rate limiting enabled`);
  logger.info(`Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
  logger.info(`TypeScript: Strict mode enabled ✓`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
