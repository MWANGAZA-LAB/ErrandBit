/**
 * User Repository
 * Data access layer for users table
 */

import { BaseRepository } from './BaseRepository.js';
import { NotFoundError } from '../../core/errors/AppError.js';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  phone_number?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface CreateUserDto {
  username: string;
  passwordHash: string;
  displayName: string;
  phoneNumber?: string;
}

export interface UpdateUserDto {
  display_name?: string;
  password_hash?: string;
  phone_number?: string;
}

export class UserRepository extends BaseRepository<User> {
  /**
   * Check if username exists
   */
  async existsByUsername(username: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM users WHERE username = $1
      ) as exists
    `;
    return this.exists(query, [username]);
  }

  /**
   * Find user by username (including password hash)
   */
  async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, username, password_hash, display_name, phone_number, created_at, updated_at
      FROM users
      WHERE username = $1
    `;
    return this.queryOne<User>(query, [username]);
  }

  /**
   * Find user by ID (excluding password hash)
   */
  async findById(id: number): Promise<User> {
    const query = `
      SELECT id, username, display_name, phone_number, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const user = await this.queryOne<Partial<User>>(query, [id]);
    
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }
    
    return user as User;
  }

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const query = `
      SELECT id, username, password_hash, display_name, phone_number, created_at, updated_at
      FROM users
      WHERE phone_number = $1
    `;
    return this.queryOne<User>(query, [phoneNumber]);
  }

  /**
   * Create new user
   */
  async create(data: CreateUserDto): Promise<User> {
    const query = `
      INSERT INTO users (username, password_hash, display_name, phone_number, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, username, display_name, phone_number, created_at
    `;
    
    const users = await this.queryRows<Partial<User>>(query, [
      data.username,
      data.passwordHash,
      data.displayName,
      data.phoneNumber || null,
    ]);
    
    return users[0] as User;
  }

  /**
   * Update user
   */
  async update(id: number, data: UpdateUserDto): Promise<User> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.display_name !== undefined) {
      updates.push(`display_name = $${paramCount++}`);
      values.push(data.display_name);
    }

    if (data.password_hash !== undefined) {
      updates.push(`password_hash = $${paramCount++}`);
      values.push(data.password_hash);
    }

    if (data.phone_number !== undefined) {
      updates.push(`phone_number = $${paramCount++}`);
      values.push(data.phone_number);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, display_name, phone_number, created_at, updated_at
    `;

    const users = await this.queryRows<Partial<User>>(query, values);
    
    if (users.length === 0) {
      throw new NotFoundError(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }
    
    return users[0] as User;
  }

  /**
   * Delete user
   */
  async delete(id: number): Promise<void> {
    const query = 'DELETE FROM users WHERE id = $1';
    await this.query(query, [id]);
  }

  /**
   * Count total users
   */
  async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM users';
    const result = await this.queryOne<{ count: string }>(query);
    return parseInt(result?.count || '0', 10);
  }

  /**
   * List users with pagination
   */
  async list(limit: number = 20, offset: number = 0): Promise<User[]> {
    const query = `
      SELECT id, username, display_name, phone_number, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    return this.queryRows<Partial<User>>(query, [limit, offset]) as Promise<User[]>;
  }
}
