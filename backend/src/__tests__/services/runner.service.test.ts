/**
 * RunnerService Unit Tests
 * Tests for runner profile management and location-based queries
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

import { RunnerService, CreateRunnerProfileInput, UpdateRunnerProfileInput } from '../../services/runner.service.js';

describe('RunnerService', () => {
  let service: RunnerService;

  beforeEach(() => {
    service = new RunnerService();
    mockQuery.mockClear();
  });

  describe('createRunnerProfile', () => {
    const validInput: CreateRunnerProfileInput = {
      user_id: 'user-123',
      hourly_rate_usd: 25.50,
      lightning_address: 'runner@getalby.com',
      current_lat: 40.7128,
      current_lng: -74.0060,
      service_radius_km: 10,
      service_categories: ['delivery', 'shopping'],
    };

    it('should create a new runner profile successfully', async () => {
      // Mock DB row format (before formatRunnerProfile transformation)
      const mockDbRow = {
        id: 'runner-123',
        user_id: 'user-123',
        hourly_rate_usd: '25.50',
        lightning_address: 'runner@getalby.com',
        current_lat: '40.7128',
        current_lng: '-74.0060',
        service_radius_km: '10',
        is_available: true,
        service_categories: ['delivery', 'shopping'],
        total_jobs_completed: 0,
        average_rating: '0',
        total_reviews: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // Check for existing profile
        .mockResolvedValueOnce({ rows: [mockDbRow] }); // Insert new profile

      const result = await service.createRunnerProfile(validInput);

      expect(result.id).toBe('runner-123');
      expect(result.user_id).toBe('user-123');
      expect(result.current_location).toEqual({ lat: 40.7128, lng: -74.0060 });
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw error if user already has a runner profile', async () => {
      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'existing-runner' }],
      });

      await expect(service.createRunnerProfile(validInput)).rejects.toThrow(
        'User already has a runner profile'
      );
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should handle missing optional location fields', async () => {
      const inputWithoutLocation = {
        user_id: 'user-456',
        hourly_rate_usd: 30.00,
        lightning_address: 'runner2@getalby.com',
      };

      const mockDbRow = {
        id: 'runner-456',
        user_id: 'user-456',
        hourly_rate_usd: '30.00',
        lightning_address: 'runner2@getalby.com',
        current_lat: null,
        current_lng: null,
        service_radius_km: '5',
        is_available: true,
        service_categories: [],
        total_jobs_completed: 0,
        average_rating: '0',
        total_reviews: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockDbRow] });

      const result = await service.createRunnerProfile(inputWithoutLocation);

      expect(result.current_location).toBeNull();
    });
  });

  describe('updateRunnerProfile', () => {
    it('should update runner profile successfully', async () => {
      const updateInput: UpdateRunnerProfileInput = {
        runner_id: 'runner-123',
        hourly_rate_usd: 28.00,
        is_available: false,
      };

      const mockDbRow = {
        id: 'runner-123',
        user_id: 'user-123',
        hourly_rate_usd: '28.00',
        lightning_address: 'runner@getalby.com',
        current_lat: '40.7128',
        current_lng: '-74.0060',
        service_radius_km: '10',
        is_available: false,
        service_categories: [],
        total_jobs_completed: 0,
        average_rating: '0',
        total_reviews: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockDbRow],
      });

      const result = await service.updateRunnerProfile(updateInput);

      expect(result.id).toBe('runner-123');
      expect(result.hourly_rate_usd).toBe(28.00);
      expect(result.is_available).toBe(false);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should update location coordinates', async () => {
      const updateInput: UpdateRunnerProfileInput = {
        runner_id: 'runner-123',
        current_lat: 34.0522,
        current_lng: -118.2437,
      };

      const mockDbRow = {
        id: 'runner-123',
        user_id: 'user-123',
        hourly_rate_usd: '25.50',
        lightning_address: 'runner@getalby.com',
        current_lat: '34.0522',
        current_lng: '-118.2437',
        service_radius_km: '10',
        is_available: true,
        service_categories: [],
        total_jobs_completed: 0,
        average_rating: '0',
        total_reviews: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockDbRow],
      });

      const result = await service.updateRunnerProfile(updateInput);

      expect(result.current_location).toEqual({ lat: 34.0522, lng: -118.2437 });
    });
  });

  describe('getRunnerProfileById', () => {
    it('should retrieve runner by ID', async () => {
      const mockDbRow = {
        id: 'runner-123',
        user_id: 'user-123',
        hourly_rate_usd: '25.50',
        lightning_address: 'runner@getalby.com',
        current_lat: '40.7128',
        current_lng: '-74.0060',
        service_radius_km: '10',
        is_available: true,
        service_categories: [],
        total_jobs_completed: 0,
        average_rating: '0',
        total_reviews: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockDbRow],
      });

      const result = await service.getRunnerProfileById('runner-123');

      expect(result?.id).toBe('runner-123');
      expect(result?.user_id).toBe('user-123');
      expect(result?.is_available).toBe(true);
    });

    it('should return null for non-existent runner', async () => {
      (mockQuery as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await service.getRunnerProfileById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('searchNearbyRunners', () => {
    it('should find runners within radius', async () => {
      const query = {
        lat: 40.7128,
        lng: -74.0060,
        radius_km: 10,
        available_only: true,
      };

      const mockDbRows = [
        {
          id: 'runner-1',
          user_id: 'user-1',
          hourly_rate_usd: '25.50',
          lightning_address: 'runner1@getalby.com',
          current_lat: '40.7100',
          current_lng: '-74.0050',
          service_radius_km: '10',
          is_available: true,
          service_categories: [],
          total_jobs_completed: 5,
          average_rating: '4.5',
          total_reviews: 3,
          distance_km: 2.5,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'runner-2',
          user_id: 'user-2',
          hourly_rate_usd: '30.00',
          lightning_address: 'runner2@getalby.com',
          current_lat: '40.7150',
          current_lng: '-74.0070',
          service_radius_km: '15',
          is_available: true,
          service_categories: [],
          total_jobs_completed: 10,
          average_rating: '4.8',
          total_reviews: 8,
          distance_km: 5.8,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: mockDbRows,
      });

      const result = await service.searchNearbyRunners(query);

      expect(result).toHaveLength(2);
      expect(result[0].distance_km).toBe(2.5);
      expect(result[1].distance_km).toBe(5.8);
    });

    it('should filter by service category', async () => {
      const query = {
        lat: 40.7128,
        lng: -74.0060,
        radius_km: 10,
        category: 'delivery',
      };

      const mockDbRow = {
        id: 'runner-1',
        user_id: 'user-1',
        hourly_rate_usd: '25.50',
        lightning_address: 'runner1@getalby.com',
        current_lat: '40.7100',
        current_lng: '-74.0050',
        service_radius_km: '10',
        is_available: true,
        service_categories: ['delivery'],
        total_jobs_completed: 5,
        average_rating: '4.5',
        total_reviews: 3,
        distance_km: 2.5,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockDbRow],
      });

      const result = await service.searchNearbyRunners(query);

      expect(result).toHaveLength(1);
      expect(result[0].service_categories).toContain('delivery');
    });

    it('should limit results when specified', async () => {
      const query = {
        lat: 40.7128,
        lng: -74.0060,
        radius_km: 10,
        limit: 5,
      };

      const mockDbRows = Array(5).fill(null).map((_, i) => ({
        id: `runner-${i}`,
        user_id: `user-${i}`,
        hourly_rate_usd: '25.50',
        lightning_address: `runner${i}@getalby.com`,
        current_lat: '40.7100',
        current_lng: '-74.0050',
        service_radius_km: '10',
        is_available: true,
        service_categories: [],
        total_jobs_completed: 0,
        average_rating: '0',
        total_reviews: 0,
        distance_km: i + 1,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: mockDbRows,
      });

      const result = await service.searchNearbyRunners(query);

      expect(result).toHaveLength(5);
    });
  });

  describe('updateRunnerLocation', () => {
    it('should update runner location successfully', async () => {
      const runnerId = 'runner-123';
      const lat = 34.0522;
      const lng = -118.2437;

      const mockDbRow = {
        id: runnerId,
        user_id: 'user-123',
        hourly_rate_usd: '25.50',
        lightning_address: 'runner@getalby.com',
        current_lat: String(lat),
        current_lng: String(lng),
        service_radius_km: '10',
        is_available: true,
        service_categories: [],
        total_jobs_completed: 0,
        average_rating: '0',
        total_reviews: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockDbRow],
      });

      await service.updateRunnerLocation(runnerId, lat, lng);

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('updateRunnerStats', () => {
    it('should update runner statistics with new rating', async () => {
      (mockQuery as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await service.updateRunnerStats('runner-123', 4.7);

      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('toggleAvailability', () => {
    it('should set runner as available', async () => {
      const mockDbRow = {
        id: 'runner-123',
        user_id: 'user-123',
        hourly_rate_usd: '25.50',
        lightning_address: 'runner@getalby.com',
        current_lat: '40.7128',
        current_lng: '-74.0060',
        service_radius_km: '10',
        is_available: true,
        service_categories: [],
        total_jobs_completed: 0,
        average_rating: '0',
        total_reviews: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockDbRow],
      });

      const result = await service.toggleAvailability('runner-123', true);

      expect(result.is_available).toBe(true);
    });

    it('should set runner as unavailable', async () => {
      const mockDbRow = {
        id: 'runner-123',
        user_id: 'user-123',
        hourly_rate_usd: '25.50',
        lightning_address: 'runner@getalby.com',
        current_lat: '40.7128',
        current_lng: '-74.0060',
        service_radius_km: '10',
        is_available: false,
        service_categories: [],
        total_jobs_completed: 0,
        average_rating: '0',
        total_reviews: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockQuery as jest.Mock).mockResolvedValueOnce({
        rows: [mockDbRow],
      });

      const result = await service.toggleAvailability('runner-123', false);

      expect(result.is_available).toBe(false);
    });
  });
});



