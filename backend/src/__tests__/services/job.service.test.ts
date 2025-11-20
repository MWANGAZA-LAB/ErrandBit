/**
 * JobService Unit Tests
 * Tests for job creation, updates, and queries
 */

import { Pool } from 'pg';

// Create mock query function (must be before imports)
const mockQuery = jest.fn();

// Mock the database pool BEFORE importing service
jest.mock('../../db.js', () => ({
  getPool: jest.fn(() => ({
    query: mockQuery,
  })),
}));

import { JobService } from '../../services/job.service.js';

describe('JobService', () => {
  let service: JobService;

  beforeEach(() => {
    service = new JobService();
    mockQuery.mockClear();
  });

  describe('createJob', () => {
    const validJobInput = {
      customer_id: 'user-123',
      title: 'Pick up groceries',
      description: 'Get items from Whole Foods',
      category: 'shopping',
      pickup_location: { lat: 40.7128, lng: -74.0060 },
      dropoff_location: { lat: 40.7589, lng: -73.9851 },
      payment_amount_usd: 25.00,
    };

    it('should create a new job successfully', async () => {
      // Mock DB response with raw format (separate lat/lng fields)
      const mockDbJob = {
        id: 'job-123',
        client_id: validJobInput.customer_id,
        runner_id: null,
        title: validJobInput.title,
        description: validJobInput.description,
        category: validJobInput.category,
        pickup_lat: '40.7128',
        pickup_lng: '-74.0060',
        pickup_address: null,
        dropoff_lat: '40.7589',
        dropoff_lng: '-73.9851',
        dropoff_address: null,
        budget_max_usd: '25.00',
        agreed_price_usd: null,
        agreed_price_sats: null,
        status: 'open',
        created_at: new Date(),
        updated_at: new Date(),
        accepted_at: null,
        started_at: null,
        completed_at: null,
        paid_at: null,
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockDbJob],
      });

      const result = await service.createJob(validJobInput);

      expect(result.status).toBe('open');
      expect(result.pickup_location.lat).toBe(40.7128);
      expect(result.pickup_location.lng).toBe(-74.0060);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO jobs'),
        expect.any(Array)
      );
    });

    it('should validate payment amount is positive', async () => {
      const invalidInput = {
        ...validJobInput,
        payment_amount_usd: -10,
      };

      await expect(service.createJob(invalidInput)).rejects.toThrow(
        expect.stringContaining('payment amount')
      );
    });

    it('should require pickup and dropoff locations', async () => {
      const invalidInput = {
        ...validJobInput,
        pickup_location: undefined,
      };

      await expect(service.createJob(invalidInput as any)).rejects.toThrow();
    });

    it('should calculate distance between locations', async () => {
      const mockJob = {
        id: 'job-123',
        ...validJobInput,
        distance_km: 5.2,
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockJob],
      });

      const result = await service.createJob(validJobInput);

      expect(result.distance_km).toBeGreaterThan(0);
    });
  });

  describe('getJobById', () => {
    it('should retrieve job by ID with full details', async () => {
      const mockDbJob = {
        id: 'job-123',
        client_id: 'user-123',
        runner_id: null,
        title: 'Pick up groceries',
        description: 'Get items',
        category: 'shopping',
        pickup_lat: '40.7128',
        pickup_lng: '-74.0060',
        pickup_address: null,
        dropoff_lat: '40.7589',
        dropoff_lng: '-73.9851',
        dropoff_address: null,
        budget_max_usd: '25.00',
        agreed_price_usd: null,
        agreed_price_sats: null,
        status: 'open',
        created_at: new Date(),
        updated_at: new Date(),
        accepted_at: null,
        started_at: null,
        completed_at: null,
        paid_at: null,
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockDbJob],
      });

      const result = await service.getJobById('job-123');

      expect(result.id).toBe('job-123');
      expect(result.status).toBe('open');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['job-123']
      );
    });

    it('should return null for non-existent job', async () => {
      (mockQuery as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.getJobById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status to assigned', async () => {
      const mockDbJob = {
        id: 'job-123',
        client_id: 'user-123',
        runner_id: 'runner-456',
        title: 'Job',
        description: 'Desc',
        category: 'delivery',
        pickup_lat: '40.7128',
        pickup_lng: '-74.0060',
        pickup_address: null,
        dropoff_lat: '40.7589',
        dropoff_lng: '-73.9851',
        dropoff_address: null,
        budget_max_usd: '25.00',
        agreed_price_usd: null,
        agreed_price_sats: null,
        status: 'assigned',
        created_at: new Date(),
        updated_at: new Date(),
        accepted_at: new Date(),
        started_at: null,
        completed_at: null,
        paid_at: null,
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockDbJob],
      });

      const result = await service.updateJobStatus('job-123', 'assigned', 'runner-456');

      expect(result.status).toBe('assigned');
      expect(result.runner_id).toBe('runner-456');
    });

    it('should update job status to completed', async () => {
      const mockDbJob = {
        id: 'job-123',
        client_id: 'user-123',
        runner_id: 'runner-456',
        title: 'Job',
        description: 'Desc',
        category: 'delivery',
        pickup_lat: '40.7128',
        pickup_lng: '-74.0060',
        pickup_address: null,
        dropoff_lat: '40.7589',
        dropoff_lng: '-73.9851',
        dropoff_address: null,
        budget_max_usd: '25.00',
        agreed_price_usd: null,
        agreed_price_sats: null,
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date(),
        accepted_at: new Date(),
        started_at: new Date(),
        completed_at: new Date(),
        paid_at: null,
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockDbJob],
      });

      const result = await service.updateJobStatus('job-123', 'completed');

      expect(result.status).toBe('completed');
      expect(result.completed_at).toBeDefined();
    });

    it('should prevent invalid status transitions', async () => {
      (mockQuery as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ status: 'completed' }] }) // Get current status
        .mockRejectedValueOnce(new Error('Invalid status transition'));

      await expect(
        service.updateJobStatus('job-123', 'open')
      ).rejects.toThrow();
    });
  });

  describe.skip('findNearbyJobs (TODO)', () => {
    it('should find jobs within specified radius', async () => {
      const query = {
        lat: 40.7128,
        lng: -74.0060,
        radius_km: 5,
        status: 'open',
      };

      const mockJobs = [
        {
          id: 'job-1',
          distance_km: 2.3,
          status: 'open',
        },
        {
          id: 'job-2',
          distance_km: 4.1,
          status: 'open',
        },
      ];

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: mockJobs,
      });

      const result = await service.findNearbyJobs(query);

      expect(result).toHaveLength(2);
      expect(result[0].distance_km).toBeLessThanOrEqual(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ST_Distance'),
        expect.arrayContaining([40.7128, -74.0060])
      );
    });

    it('should filter by job category', async () => {
      const query = {
        lat: 40.7128,
        lng: -74.0060,
        radius_km: 10,
        category: 'delivery',
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'job-1', category: 'delivery' }],
      });

      await service.findNearbyJobs(query);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('category'),
        expect.arrayContaining(['delivery'])
      );
    });

    it('should only return open jobs by default', async () => {
      const query = {
        lat: 40.7128,
        lng: -74.0060,
        radius_km: 10,
      };

      const mockJobs = [
        { id: 'job-1', status: 'open' },
        { id: 'job-2', status: 'open' },
      ];

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: mockJobs,
      });

      const result = await service.findNearbyJobs(query);

      expect(result.every(job => job.status === 'open')).toBe(true);
    });
  });

  describe.skip('assignJobToRunner (TODO)', () => {
    it('should assign job to runner successfully', async () => {
      const mockJob = {
        id: 'job-123',
        runner_id: 'runner-456',
        status: 'assigned',
      };

      (mockQuery as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ status: 'open' }] }) // Check current status
        .mockResolvedValueOnce({ rows: [mockJob] }); // Update job

      const result = await service.assignJobToRunner('job-123', 'runner-456');

      expect(result.runner_id).toBe('runner-456');
      expect(result.status).toBe('assigned');
    });

    it('should prevent assigning already assigned job', async () => {
      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [{ status: 'assigned', runner_id: 'other-runner' }],
      });

      await expect(
        service.assignJobToRunner('job-123', 'runner-456')
      ).rejects.toThrow(expect.stringContaining('already assigned'));
    });
  });

  describe.skip('getJobsByCustomer (TODO)', () => {
    it('should retrieve all jobs for a customer', async () => {
      const mockJobs = [
        { id: 'job-1', customer_id: 'user-123', status: 'open' },
        { id: 'job-2', customer_id: 'user-123', status: 'completed' },
      ];

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: mockJobs,
      });

      const result = await service.getJobsByCustomer('user-123');

      expect(result).toHaveLength(2);
      expect(result.every(job => job.customer_id === 'user-123')).toBe(true);
    });

    it('should filter by status when specified', async () => {
      const mockJobs = [
        { id: 'job-1', customer_id: 'user-123', status: 'completed' },
      ];

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: mockJobs,
      });

      const result = await service.getJobsByCustomer('user-123', 'completed');

      expect(result.every(job => job.status === 'completed')).toBe(true);
    });
  });

  describe.skip('getJobsByRunner (TODO)', () => {
    it('should retrieve all jobs assigned to a runner', async () => {
      const mockJobs = [
        { id: 'job-1', runner_id: 'runner-456', status: 'in_progress' },
        { id: 'job-2', runner_id: 'runner-456', status: 'completed' },
      ];

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: mockJobs,
      });

      const result = await service.getJobsByRunner('runner-456');

      expect(result).toHaveLength(2);
      expect(result.every(job => job.runner_id === 'runner-456')).toBe(true);
    });
  });

  describe.skip('cancelJob (TODO)', () => {
    it('should cancel open job successfully', async () => {
      const mockJob = {
        id: 'job-123',
        status: 'cancelled',
        cancelled_at: new Date(),
      };

      (mockQuery as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ status: 'open' }] })
        .mockResolvedValueOnce({ rows: [mockJob] });

      const result = await service.cancelJob('job-123', 'user-123');

      expect(result.status).toBe('cancelled');
      expect(result.cancelled_at).toBeDefined();
    });

    it('should prevent cancelling completed jobs', async () => {
      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [{ status: 'completed' }],
      });

      await expect(
        service.cancelJob('job-123', 'user-123')
      ).rejects.toThrow(expect.stringContaining('cannot be cancelled'));
    });
  });

  describe.skip('updateJobLocation (TODO)', () => {
    it('should update job pickup location', async () => {
      const newLocation = { lat: 40.7589, lng: -73.9851 };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'job-123', pickup_location: newLocation }],
      });

      const result = await service.updateJobLocation('job-123', 'pickup', newLocation);

      expect(result.pickup_location).toEqual(newLocation);
    });

    it('should update job dropoff location', async () => {
      const newLocation = { lat: 40.7489, lng: -73.9680 };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'job-123', dropoff_location: newLocation }],
      });

      const result = await service.updateJobLocation('job-123', 'dropoff', newLocation);

      expect(result.dropoff_location).toEqual(newLocation);
    });
  });
});


