/**
 * Payment Repository
 * Data access layer for payments table
 */

import { BaseRepository } from './BaseRepository.js';
import { NotFoundError } from '../../core/errors/AppError.js';

export interface Payment {
  id: number;
  job_id: number;
  payment_hash: string | null;
  preimage: string | null;
  amount_sats: number;
  paid_at: Date;
  created_at: Date;
}

export interface CreatePaymentDto {
  jobId: number;
  paymentHash?: string | undefined;
  preimage?: string | undefined;
  amountSats: number;
}

export interface UpdatePaymentDto {
  payment_hash?: string | undefined;
  preimage?: string | undefined;
  paid_at?: Date | undefined;
}

export class PaymentRepository extends BaseRepository<Payment> {
  /**
   * Find payment by ID
   */
  async findById(id: number): Promise<Payment> {
    const query = `
      SELECT id, job_id, payment_hash, preimage, amount_sats, paid_at, created_at
      FROM payments
      WHERE id = $1
    `;
    const payment = await this.queryOne<Payment>(query, [id]);
    
    if (!payment) {
      throw new NotFoundError(
        `Payment with ID ${id} not found`,
        'PAYMENT_NOT_FOUND'
      );
    }
    
    return payment;
  }

  /**
   * Find payment by job ID
   */
  async findByJobId(jobId: number): Promise<Payment | null> {
    const query = `
      SELECT id, job_id, payment_hash, preimage, amount_sats, paid_at, created_at
      FROM payments
      WHERE job_id = $1
    `;
    return this.queryOne<Payment>(query, [jobId]);
  }

  /**
   * Find payment by payment hash
   */
  async findByPaymentHash(paymentHash: string): Promise<Payment | null> {
    const query = `
      SELECT id, job_id, payment_hash, preimage, amount_sats, paid_at, created_at
      FROM payments
      WHERE payment_hash = $1
    `;
    return this.queryOne<Payment>(query, [paymentHash]);
  }

  /**
   * Check if payment exists for job
   */
  async existsByJobId(jobId: number): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM payments WHERE job_id = $1
      ) as exists
    `;
    return this.exists(query, [jobId]);
  }

  /**
   * Create payment
   */
  async create(data: CreatePaymentDto): Promise<Payment> {
    const query = `
      INSERT INTO payments (
        job_id, payment_hash, preimage, amount_sats, paid_at, created_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, job_id, payment_hash, preimage, amount_sats, paid_at, created_at
    `;

    const payments = await this.queryRows<Payment>(query, [
      data.jobId,
      data.paymentHash || null,
      data.preimage || null,
      data.amountSats,
    ]);

    if (payments.length === 0) {
      throw new NotFoundError('Failed to create payment', 'PAYMENT_CREATE_FAILED');
    }

    return payments[0]!;
  }

  /**
   * Update payment
   */
  async update(id: number, data: UpdatePaymentDto): Promise<Payment> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.payment_hash !== undefined) {
      updates.push(`payment_hash = $${paramCount++}`);
      values.push(data.payment_hash);
    }

    if (data.preimage !== undefined) {
      updates.push(`preimage = $${paramCount++}`);
      values.push(data.preimage);
    }

    if (data.paid_at !== undefined) {
      updates.push(`paid_at = $${paramCount++}`);
      values.push(data.paid_at);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE payments
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, job_id, payment_hash, preimage, amount_sats, paid_at, created_at
    `;

    const payments = await this.queryRows<Payment>(query, values);
    
    if (payments.length === 0) {
      throw new NotFoundError(
        `Payment with ID ${id} not found`,
        'PAYMENT_NOT_FOUND'
      );
    }

    return payments[0]!;
  }

  /**
   * Confirm payment with preimage
   */
  async confirmPayment(id: number, preimage: string): Promise<Payment> {
    const query = `
      UPDATE payments
      SET preimage = $1, paid_at = NOW()
      WHERE id = $2
      RETURNING id, job_id, payment_hash, preimage, amount_sats, paid_at, created_at
    `;

    const payments = await this.queryRows<Payment>(query, [preimage, id]);
    
    if (payments.length === 0) {
      throw new NotFoundError(
        `Payment with ID ${id} not found`,
        'PAYMENT_NOT_FOUND'
      );
    }

    return payments[0]!;
  }

  /**
   * List payments
   */
  async list(limit: number = 20, offset: number = 0): Promise<Payment[]> {
    const query = `
      SELECT id, job_id, payment_hash, preimage, amount_sats, paid_at, created_at
      FROM payments
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    return this.queryRows<Payment>(query, [limit, offset]);
  }

  /**
   * Count payments
   */
  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM payments';
    const result = await this.queryOne<{ count: string }>(query);
    return parseInt(result?.count || '0', 10);
  }

  /**
   * Get total payment volume in sats
   */
  async getTotalVolume(): Promise<number> {
    const query = 'SELECT COALESCE(SUM(amount_sats), 0) as total FROM payments';
    const result = await this.queryOne<{ total: string }>(query);
    return parseInt(result?.total || '0', 10);
  }

  /**
   * Delete payment
   */
  async delete(id: number): Promise<void> {
    const query = 'DELETE FROM payments WHERE id = $1';
    await this.query(query, [id]);
  }
}
