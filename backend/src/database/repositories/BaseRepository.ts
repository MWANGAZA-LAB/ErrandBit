/**
 * Base Repository
 * Abstract base class for all repositories
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { db } from '../connection.js';
import logger from '../../utils/logger.js';

export abstract class BaseRepository<T extends QueryResultRow> {
  protected pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  /**
   * Execute a query
   */
  protected async query<R extends QueryResultRow = T>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<R>> {
    return db.query<R>(text, params);
  }

  /**
   * Execute a query and return rows
   */
  protected async queryRows<R extends QueryResultRow = T>(
    text: string,
    params?: any[]
  ): Promise<R[]> {
    return db.queryRows<R>(text, params);
  }

  /**
   * Execute a query and return first row or null
   */
  protected async queryOne<R extends QueryResultRow = T>(
    text: string,
    params?: any[]
  ): Promise<R | null> {
    return db.queryOne<R>(text, params);
  }

  /**
   * Check if a record exists
   */
  protected async exists(text: string, params?: any[]): Promise<boolean> {
    return db.exists(text, params);
  }

  /**
   * Execute multiple operations in a transaction
   * Ensures atomicity - all operations succeed or all fail
   */
  protected async transaction<R>(
    callback: (client: PoolClient) => Promise<R>
  ): Promise<R> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      logger.debug('Transaction started');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      logger.debug('Transaction committed');
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back', { error: (error as Error).message });
      throw error;
    } finally {
      client.release();
    }
  }
}
