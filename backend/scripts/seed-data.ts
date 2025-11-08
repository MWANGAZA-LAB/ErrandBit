/**
 * Seed Data Script
 * Creates test users, jobs, runners, payments, and reviews for development
 */

import { getPool } from '../src/db.js';
import bcrypt from 'bcrypt';
import logger from '../src/utils/logger.js';

interface SeedResult {
  users: number[];
  runners: number[];
  jobs: number[];
  payments: number[];
  reviews: number[];
}

async function seedDatabase(): Promise<SeedResult> {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  logger.info('Starting database seed...');

  const result: SeedResult = {
    users: [],
    runners: [],
    jobs: [],
    payments: [],
    reviews: [],
  };

  try {
    // 1. Create test users
    logger.info('Creating test users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
      { username: 'alice_client', email: 'alice@example.com', phone: '+1234567890', role: 'client' },
      { username: 'bob_runner', email: 'bob@example.com', phone: '+1234567891', role: 'runner' },
      { username: 'charlie_both', email: 'charlie@example.com', phone: '+1234567892', role: 'client' },
      { username: 'diana_runner', email: 'diana@example.com', phone: '+1234567893', role: 'runner' },
      { username: 'eve_client', email: 'eve@example.com', phone: '+1234567894', role: 'client' },
    ];

    for (const user of users) {
      const userResult = await pool.query(
        `INSERT INTO users (username, email, phone, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [user.username, user.email, user.phone, hashedPassword, user.role]
      );
      result.users.push(userResult.rows[0].id);
      logger.info(`Created user: ${user.username} (ID: ${userResult.rows[0].id})`);
    }

    // 2. Create runner profiles
    logger.info('Creating runner profiles...');
    const runnerProfiles = [
      {
        userId: result.users[1], // bob_runner
        bio: 'Experienced delivery runner with 5 years experience',
        hourlyRate: 25,
        serviceRadius: 10,
        tags: ['delivery', 'shopping', 'errands'],
        lat: 40.7128,
        lng: -74.0060,
        address: 'New York, NY',
      },
      {
        userId: result.users[3], // diana_runner
        bio: 'Fast and reliable runner, specializing in grocery delivery',
        hourlyRate: 20,
        serviceRadius: 15,
        tags: ['grocery', 'delivery', 'shopping'],
        lat: 40.7580,
        lng: -73.9855,
        address: 'Manhattan, NY',
      },
      {
        userId: result.users[2], // charlie_both
        bio: 'Part-time runner available on weekends',
        hourlyRate: 18,
        serviceRadius: 8,
        tags: ['delivery', 'errands'],
        lat: 40.7489,
        lng: -73.9680,
        address: 'Queens, NY',
      },
    ];

    for (const profile of runnerProfiles) {
      const runnerResult = await pool.query(
        `INSERT INTO runner_profiles 
         (user_id, bio, hourly_rate, service_radius, tags, location, address, available, avg_rating, total_jobs, completion_rate, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($7, $6), 4326), $8, true, 0, 0, 0, NOW(), NOW())
         RETURNING id`,
        [profile.userId, profile.bio, profile.hourlyRate, profile.serviceRadius, profile.tags, profile.lat, profile.lng, profile.address]
      );
      result.runners.push(runnerResult.rows[0].id);
      logger.info(`Created runner profile for user ${profile.userId} (ID: ${runnerResult.rows[0].id})`);
    }

    // 3. Create jobs
    logger.info('Creating test jobs...');
    const jobs = [
      {
        clientId: result.users[0], // alice_client
        title: 'Grocery Shopping',
        description: 'Pick up groceries from Whole Foods and deliver to my apartment',
        priceCents: 2500,
        status: 'open',
        lat: 40.7128,
        lng: -74.0060,
        address: '123 Main St, New York, NY',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      },
      {
        clientId: result.users[0], // alice_client
        title: 'Package Delivery',
        description: 'Deliver package to friend across town',
        priceCents: 1500,
        status: 'assigned',
        runnerId: result.users[1], // bob_runner
        lat: 40.7580,
        lng: -73.9855,
        address: '456 Park Ave, Manhattan, NY',
        deadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
      },
      {
        clientId: result.users[4], // eve_client
        title: 'Pharmacy Pickup',
        description: 'Pick up prescription from CVS',
        priceCents: 1000,
        status: 'completed',
        runnerId: result.users[1], // bob_runner
        lat: 40.7489,
        lng: -73.9680,
        address: '789 Broadway, Queens, NY',
        deadline: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      },
      {
        clientId: result.users[2], // charlie_both
        title: 'Document Drop-off',
        description: 'Drop off documents at office building',
        priceCents: 800,
        status: 'open',
        lat: 40.7614,
        lng: -73.9776,
        address: '321 5th Ave, New York, NY',
        deadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days
      },
      {
        clientId: result.users[4], // eve_client
        title: 'Lunch Delivery',
        description: 'Pick up lunch order from restaurant',
        priceCents: 1200,
        status: 'in_progress',
        runnerId: result.users[3], // diana_runner
        lat: 40.7505,
        lng: -73.9934,
        address: '555 Restaurant Row, NY',
        deadline: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
      },
    ];

    for (const job of jobs) {
      const jobResult = await pool.query(
        `INSERT INTO jobs 
         (client_id, runner_id, title, description, price_cents, status, location, address, deadline, completed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($8, $7), 4326), $9, $10, $11, NOW(), NOW())
         RETURNING id`,
        [job.clientId, job.runnerId || null, job.title, job.description, job.priceCents, job.status, job.lat, job.lng, job.address, job.deadline, job.completedAt || null]
      );
      result.jobs.push(jobResult.rows[0].id);
      logger.info(`Created job: ${job.title} (ID: ${jobResult.rows[0].id}, Status: ${job.status})`);
    }

    // 4. Create payments
    logger.info('Creating test payments...');
    const payments = [
      {
        jobId: result.jobs[1], // Assigned job
        amountSats: 15000,
        status: 'pending',
        paymentHash: 'hash_' + Math.random().toString(36).substring(7),
        invoice: 'lnbc15000n1...',
      },
      {
        jobId: result.jobs[2], // Completed job
        amountSats: 10000,
        status: 'confirmed',
        paymentHash: 'hash_' + Math.random().toString(36).substring(7),
        preimage: 'preimage_' + Math.random().toString(36).substring(7),
        invoice: 'lnbc10000n1...',
        confirmedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      },
      {
        jobId: result.jobs[4], // In progress job
        amountSats: 12000,
        status: 'pending',
        paymentHash: 'hash_' + Math.random().toString(36).substring(7),
        invoice: 'lnbc12000n1...',
      },
    ];

    for (const payment of payments) {
      const paymentResult = await pool.query(
        `INSERT INTO payments 
         (job_id, amount_sats, status, payment_hash, preimage, invoice, confirmed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id`,
        [payment.jobId, payment.amountSats, payment.status, payment.paymentHash, payment.preimage || null, payment.invoice, payment.confirmedAt || null]
      );
      result.payments.push(paymentResult.rows[0].id);
      logger.info(`Created payment for job ${payment.jobId} (ID: ${paymentResult.rows[0].id}, Status: ${payment.status})`);
    }

    // 5. Create reviews
    logger.info('Creating test reviews...');
    const reviews = [
      {
        jobId: result.jobs[2], // Completed job
        runnerId: result.users[1], // bob_runner
        reviewerId: result.users[4], // eve_client
        rating: 5,
        comment: 'Excellent service! Very fast and professional.',
      },
      {
        jobId: result.jobs[2], // Same completed job (runner reviews client)
        runnerId: result.users[1], // bob_runner
        reviewerId: result.users[1], // bob_runner (reviewing the client)
        rating: 5,
        comment: 'Great client, clear instructions and friendly.',
      },
    ];

    for (const review of reviews) {
      const reviewResult = await pool.query(
        `INSERT INTO reviews 
         (job_id, runner_id, reviewer_id, rating, comment, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id`,
        [review.jobId, review.runnerId, review.reviewerId, review.rating, review.comment]
      );
      result.reviews.push(reviewResult.rows[0].id);
      logger.info(`Created review for job ${review.jobId} (ID: ${reviewResult.rows[0].id}, Rating: ${review.rating})`);
    }

    // 6. Update runner statistics
    logger.info('Updating runner statistics...');
    await pool.query(
      `UPDATE runner_profiles 
       SET avg_rating = 5.0, total_jobs = 2, completion_rate = 100.0, updated_at = NOW()
       WHERE user_id = $1`,
      [result.users[1]] // bob_runner
    );
    logger.info('Updated runner statistics for bob_runner');

    logger.info('Database seed completed successfully!');
    logger.info(`Created: ${result.users.length} users, ${result.runners.length} runners, ${result.jobs.length} jobs, ${result.payments.length} payments, ${result.reviews.length} reviews`);

    return result;
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then((result) => {
      logger.info('Seed data summary:', result);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seed failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
