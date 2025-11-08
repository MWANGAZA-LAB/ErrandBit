/**
 * Job Service Tests
 * Unit tests for job service methods
 */

import { JobService, CreateJobInput } from '../job.service';
import { Pool } from 'pg';

// Mock the database pool
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('JobService', () => {
  let jobService: JobService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    // Create a new instance before each test
    mockPool = new Pool() as jest.Mocked<Pool>;
    jobService = new JobService(mockPool);
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a new job successfully', async () => {
      const mockJob = {
        id: '123',
        client_id: '456',
        title: 'Test Job',
        description: 'Test Description',
        category: 'delivery',
        status: 'open',
        pickup_lat: 40.7128,
        pickup_lng: -74.0060,
        pickup_address: '123 Main St',
        budget_max_usd: 50,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockJob],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const input: CreateJobInput = {
        client_id: '456',
        title: 'Test Job',
        description: 'Test Description',
        category: 'delivery',
        pickup_lat: 40.7128,
        pickup_lng: -74.0060,
        pickup_address: '123 Main St',
        budget_max_usd: 50,
      };

      const result = await jobService.createJob(input);

      expect(result).toEqual(mockJob);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO jobs'),
        expect.arrayContaining([
          '456',
          'Test Job',
          'Test Description',
          'delivery',
          40.7128,
          -74.0060,
          '123 Main St',
          50,
        ])
      );
    });

    it('should handle optional dropoff location', async () => {
      const mockJob = {
        id: '123',
        client_id: '456',
        title: 'Test Job',
        description: 'Test Description',
        category: 'delivery',
        status: 'open',
        pickup_lat: 40.7128,
        pickup_lng: -74.0060,
        pickup_address: '123 Main St',
        dropoff_lat: 40.7580,
        dropoff_lng: -73.9855,
        dropoff_address: '456 Park Ave',
        budget_max_usd: 50,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockJob],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const input: CreateJobInput = {
        client_id: '456',
        title: 'Test Job',
        description: 'Test Description',
        category: 'delivery',
        pickup_lat: 40.7128,
        pickup_lng: -74.0060,
        pickup_address: '123 Main St',
        dropoff_lat: 40.7580,
        dropoff_lng: -73.9855,
        dropoff_address: '456 Park Ave',
        budget_max_usd: 50,
      };

      const result = await jobService.createJob(input);

      expect(result).toEqual(mockJob);
      expect(result.dropoff_lat).toBe(40.7580);
      expect(result.dropoff_lng).toBe(-73.9855);
    });

    it('should throw error if database fails', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const input: CreateJobInput = {
        client_id: '456',
        title: 'Test Job',
        description: 'Test Description',
        category: 'delivery',
        pickup_lat: 40.7128,
        pickup_lng: -74.0060,
        pickup_address: '123 Main St',
        budget_max_usd: 50,
      };

      await expect(jobService.createJob(input)).rejects.toThrow('Database error');
    });
  });

  describe('getJobById', () => {
    it('should return a job when found', async () => {
      const mockJob = {
        id: '123',
        client_id: '456',
        title: 'Test Job',
        description: 'Test Description',
        category: 'delivery',
        status: 'open',
        pickup_lat: 40.7128,
        pickup_lng: -74.0060,
        pickup_address: '123 Main St',
        budget_max_usd: 50,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockJob],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await jobService.getJobById('123');

      expect(result).toEqual(mockJob);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM jobs WHERE id = $1'),
        ['123']
      );
    });

    it('should return null when job not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await jobService.getJobById('999');

      expect(result).toBeNull();
    });

    it('should accept both string and number IDs', async () => {
      const mockJob = {
        id: '123',
        client_id: '456',
        title: 'Test Job',
        status: 'open',
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockJob],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await jobService.getJobById(123);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['123'] // Should convert number to string
      );
    });
  });

  describe('getJobsByClient', () => {
    it('should return all jobs for a client', async () => {
      const mockJobs = [
        { id: '1', client_id: '456', title: 'Job 1', status: 'open' },
        { id: '2', client_id: '456', title: 'Job 2', status: 'accepted' },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockJobs,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const result = await jobService.getJobsByClient('456');

      expect(result).toEqual(mockJobs);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no jobs found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await jobService.getJobsByClient('999');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status successfully', async () => {
      const mockUpdatedJob = {
        id: '123',
        client_id: '456',
        title: 'Test Job',
        status: 'accepted',
        runner_id: '789',
        updated_at: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUpdatedJob],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await jobService.updateJobStatus({
        job_id: '123',
        new_status: 'accepted',
        runner_id: '789',
      });

      expect(result).toEqual(mockUpdatedJob);
      expect(result.status).toBe('accepted');
      expect(result.runner_id).toBe('789');
    });

    it('should throw error if job not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await expect(
        jobService.updateJobStatus({
          job_id: '999',
          new_status: 'accepted',
        })
      ).rejects.toThrow('Job not found');
    });
  });
});
