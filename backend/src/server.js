import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import runnersRouter from './routes/runners.js';
import jobsRouter from './routes/jobs.js';
import messagesRouter from './routes/messages.js';
import paymentsRouter from './routes/payments.js';
import { notFound } from './utils/error.js';
import { sanitizeError, sanitizeBody } from './middleware/sanitize.js';
import { generalLimiter, authLimiter, paymentLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const isDevelopment = process.env.NODE_ENV === 'development';

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
app.use(morgan(isDevelopment ? 'dev' : 'combined'));

// Sanitize user input
app.use(sanitizeBody);

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Routes
app.use('/health', healthRouter);
app.use('/auth', authLimiter, authRouter);
app.use('/runners', runnersRouter);
app.use('/jobs', jobsRouter);
app.use('/messages', messagesRouter);
app.use('/payments', paymentLimiter, paymentsRouter);

// Error handling
app.use(notFound);
app.use(sanitizeError);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ErrandBit API listening on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Security: Rate limiting enabled`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
