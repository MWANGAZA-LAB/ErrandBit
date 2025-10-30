import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import healthRouter from './routes/health.js';
import { notFound, errorHandler } from './utils/error.js';
import runnersRouter from './routes/runners.js';
import jobsRouter from './routes/jobs.js';
import messagesRouter from './routes/messages.js';
import paymentsRouter from './routes/payments.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: '*'}));
app.use(express.json());
app.use(morgan('dev'));

app.use('/health', healthRouter);
app.use('/runners', runnersRouter);
app.use('/jobs', jobsRouter);
app.use('/messages', messagesRouter);
app.use('/payments', paymentsRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
