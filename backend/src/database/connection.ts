/**
 * Database Connection Manager
 * Singleton pattern with proper error handling
 */

import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { DATABASE_CONSTANTS } from '../config/constants.js';
import { DatabaseError, ServiceUnavailableError } from '../core/errors/AppError.js';
import logger from '../utils/logger.js';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private isConnected: boolean = false;

  private constructor() {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new ServiceUnavailableError(
        'DATABASE_URL environment variable is not set',
        'DATABASE_NOT_CONFIGURED'
      );
    }

    const config: PoolConfig = {
      connectionString,
      max: DATABASE_CONSTANTS.POOL.MAX_CONNECTIONS,
      idleTimeoutMillis: DATABASE_CONSTANTS.POOL.IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: DATABASE_CONSTANTS.POOL.CONNECTION_TIMEOUT_MS,
    };

    this.pool = new Pool(config);
    
    // Event handlers
    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error:', err);
      this.isConnected = false;
    });

    this.pool.on('connect', () => {
      if (!this.isConnected) {
        logger.info('Database connection established');
        this.isConnected = true;
      }
    });

    this.pool.on('remove', () => {
      logger.debug('Database client removed from pool');
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Get the underlying pool
   */
  public getPool(): Pool {
    return this.pool;
  }

  /**
   * Execute a query with error handling
   */
  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    try {
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      logger.debug('Query executed', {
        text: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });

      return result;
    } catch (error) {
      logger.error('Database query error:', {
        text: text.substring(0, 100),
        params,
        error: (error as Error).message,
      });
      
      throw new DatabaseError(
        'Query execution failed',
        'QUERY_ERROR',
        error as Error
      );
    }
  }

  /**
   * Execute a query and return rows
   */
  public async queryRows<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T[]> {
    const result = await this.query<T>(text, params);
    return result.rows;
  }

  /**
   * Execute a query and return first row or null
   */
  public async queryOne<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * Check if a record exists
   */
  public async exists(text: string, params?: any[]): Promise<boolean> {
    const result = await this.queryOne<{ exists: boolean }>(text, params);
    return result?.exists || false;
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1 as ok');
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      logger.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Get connection status
   */
  public getStatus(): {
    connected: boolean;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      connected: this.isConnected,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Close all connections
   */
  public async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    logger.info('Database connection pool closed');
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();

// Export legacy getPool for backward compatibility
export function getPool(): Pool {
  return db.getPool();
}
