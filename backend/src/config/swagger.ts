/**
 * Swagger/OpenAPI Configuration
 * API documentation setup
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ErrandBit API',
      version: '1.0.0',
      description: 'Lightning Network-powered gig economy platform API',
      contact: {
        name: 'ErrandBit Team',
        email: 'support@errandbit.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
      {
        url: 'https://api.errandbit.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /auth/verify-otp',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
            message: {
              type: 'string',
              example: 'Detailed error message',
            },
          },
        },
        Job: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123',
            },
            client_id: {
              type: 'string',
              example: '456',
            },
            runner_id: {
              type: 'string',
              nullable: true,
              example: '789',
            },
            title: {
              type: 'string',
              example: 'Grocery Shopping',
            },
            description: {
              type: 'string',
              example: 'Need someone to pick up groceries from Walmart',
            },
            category: {
              type: 'string',
              enum: ['delivery', 'shopping', 'transport', 'other'],
              example: 'shopping',
            },
            status: {
              type: 'string',
              enum: ['open', 'accepted', 'in_progress', 'completed', 'paid', 'cancelled'],
              example: 'open',
            },
            pickup_lat: {
              type: 'number',
              example: 40.7128,
            },
            pickup_lng: {
              type: 'number',
              example: -74.0060,
            },
            pickup_address: {
              type: 'string',
              example: '123 Main St, New York, NY',
            },
            dropoff_lat: {
              type: 'number',
              nullable: true,
              example: 40.7580,
            },
            dropoff_lng: {
              type: 'number',
              nullable: true,
              example: -73.9855,
            },
            dropoff_address: {
              type: 'string',
              nullable: true,
              example: '456 Park Ave, New York, NY',
            },
            budget_max_usd: {
              type: 'number',
              example: 50,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        RunnerProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123',
            },
            user_id: {
              type: 'string',
              example: '456',
            },
            hourly_rate_usd: {
              type: 'number',
              example: 25,
            },
            lightning_address: {
              type: 'string',
              example: 'runner@getalby.com',
            },
            current_lat: {
              type: 'number',
              nullable: true,
              example: 40.7128,
            },
            current_lng: {
              type: 'number',
              nullable: true,
              example: -74.0060,
            },
            service_radius_km: {
              type: 'number',
              nullable: true,
              example: 10,
            },
            service_categories: {
              type: 'array',
              items: {
                type: 'string',
              },
              example: ['delivery', 'shopping'],
            },
            is_available: {
              type: 'boolean',
              example: true,
            },
            rating_avg: {
              type: 'number',
              nullable: true,
              example: 4.5,
            },
            rating_count: {
              type: 'integer',
              example: 10,
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js'], // Path to API routes
};

export const swaggerSpec = swaggerJsdoc(options);
