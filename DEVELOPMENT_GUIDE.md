# ErrandBit Development Guide

## Current Status

**Version:** 0.1.0 (MVP Development)  
**Last Updated:** October 30, 2025

### Completed Milestones

#### Infrastructure
- Express API server with comprehensive middleware stack
- PostgreSQL database schema with PostGIS geospatial support
- React frontend with TypeScript and Tailwind CSS
- Automated migration system
- API documentation and testing framework

#### User Interface
- Responsive navigation with active state indicators
- Professional landing page with feature highlights
- Runner search interface (awaiting backend integration)
- Job management dashboard (awaiting backend integration)
- User profile management forms (awaiting backend integration)

### Active Development

#### Database Integration
The application is currently configured to connect to PostgreSQL but requires:
- PostgreSQL instance (local or hosted)
- Environment variable configuration
- Initial migration execution

**Action Required:**
```bash
# Configure database connection
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL

# Run migrations
cd backend
npm run migrate
```

#### Authentication System
Phone-based verification system is designed but not yet implemented. Next steps include:
- Twilio API integration
- JWT token generation and validation
- Session management middleware
- Protected route implementation

### Upcoming Features

#### Priority 1: Core Functionality
1. **Database Connection** - Connect backend to PostgreSQL instance
2. **Authentication** - Implement phone verification with Twilio
3. **Runner Profiles** - Enable CRUD operations for runner accounts
4. **Geospatial Search** - Implement PostGIS-powered location search

#### Priority 2: User Experience
5. **Map Integration** - Add Mapbox for visual runner discovery
6. **Job Lifecycle** - Implement complete job booking and management flow
7. **Real-time Messaging** - Add Socket.io for in-app chat
8. **Payment Integration** - Connect Lightning Network payment rails

#### Priority 3: Platform Features
9. **Review System** - Enable post-job ratings and feedback
10. **Trust Tiers** - Implement progressive reputation system
11. **Subscriptions** - Add runner subscription management
12. **Dispute Resolution** - Build mediation workflow

## Architecture Decisions

### Backend Stack
- **Framework:** Express.js for rapid API development
- **Database:** PostgreSQL with PostGIS for geospatial queries
- **Authentication:** JWT tokens with phone verification
- **Real-time:** Socket.io for WebSocket connections

### Frontend Stack
- **Framework:** React 18 with TypeScript for type safety
- **Build Tool:** Vite for fast development and optimized builds
- **Styling:** Tailwind CSS for consistent design system
- **Routing:** React Router v6 for client-side navigation

### Payment Infrastructure
- **Primary:** Lightning Address (LNURL-pay) for instant settlements
- **Fallback:** BOLT11 invoice generation via LNBits
- **UX Enhancement:** WebLN browser extension detection

### Security Considerations
- Helmet.js for HTTP security headers
- CORS configuration for API access control
- Input validation on all endpoints
- Rate limiting for authentication endpoints (planned)
- SQL injection prevention via parameterized queries

## Development Workflow

### Local Development
```bash
# Start backend (Terminal 1)
cd backend
npm run dev

# Start frontend (Terminal 2)
cd frontend
npm run dev
```

### Database Migrations
```bash
# Run migrations
cd backend
npm run migrate

# Seed test data (optional)
psql $DATABASE_URL < db/seed.sql
```

### Code Quality
- TypeScript strict mode enabled
- ESLint configuration (to be added)
- Prettier formatting (to be added)
- Pre-commit hooks (to be added)

## API Endpoints

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/deep` - Health check with database connectivity

### Authentication (Planned)
- `POST /auth/phone/start` - Initiate phone verification
- `POST /auth/phone/verify` - Verify code and issue JWT
- `GET /me` - Get current user profile

### Runners (Placeholder)
- `GET /runners/:id` - Get runner profile
- `POST /runners` - Create runner profile
- `PATCH /runners/:id` - Update runner profile
- `GET /runners` - Search runners by location

### Jobs (Placeholder)
- `POST /jobs` - Create job request
- `GET /jobs/:id` - Get job details
- `POST /jobs/:id/accept` - Runner accepts job
- `POST /jobs/:id/complete` - Mark job complete

### Payments (Placeholder)
- `GET /payments/instruction` - Get payment details
- `POST /payments/validate-invoice` - Validate Lightning invoice
- `POST /payments/confirm` - Confirm payment received

## Testing Strategy

### Unit Tests (Planned)
- API endpoint validation
- Database query logic
- Authentication middleware
- Payment validation functions

### Integration Tests (Planned)
- Complete job lifecycle
- Payment flow end-to-end
- User authentication flow
- Geospatial search accuracy

### E2E Tests (Planned)
- User registration and profile creation
- Job posting and acceptance
- Payment and completion flow
- Review submission

## Deployment Strategy

### Staging Environment
- Automated deployment on push to `develop` branch
- Separate database instance
- Test Lightning Network integration
- Performance monitoring

### Production Environment
- Manual deployment from `main` branch
- Database backups and replication
- SSL/TLS certificates
- CDN for static assets
- Error tracking and logging

## Performance Targets

### API Response Times
- Health checks: < 50ms
- Database queries: < 200ms
- Geospatial searches: < 500ms
- Payment validation: < 1s

### Frontend Metrics
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

## Security Checklist

- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] API rate limiting implemented
- [ ] Input sanitization on all endpoints
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] JWT secrets secured
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented

## Support & Documentation

- **API Documentation:** `backend/API.md`
- **Database Schema:** `backend/db/schema.sql`
- **Project Status:** `PROJECT_STATUS.md`
- **README:** `README.md`

## Contributing Guidelines

### Code Style
- Use TypeScript for type safety
- Follow existing naming conventions
- Write descriptive commit messages
- Add comments for complex logic

### Pull Request Process
1. Create feature branch from `develop`
2. Implement changes with tests
3. Update documentation
4. Submit PR with detailed description
5. Address review feedback
6. Merge after approval

### Commit Message Format
```
type(scope): brief description

Detailed explanation of changes
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check PostgreSQL service is running
- Confirm network access to database host
- Verify PostGIS extension is installed

### Frontend Build Errors
- Clear `node_modules` and reinstall
- Check Node.js version (18+ required)
- Verify all dependencies are installed
- Check for TypeScript errors

### API Errors
- Check server logs for stack traces
- Verify request format matches API docs
- Confirm authentication token is valid
- Check CORS configuration

## Resources

### External Documentation
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Manual](https://postgis.net/documentation/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lightning Network](https://lightning.network/)

### Development Tools
- [Postman](https://www.postman.com/) - API testing
- [pgAdmin](https://www.pgadmin.org/) - Database management
- [React DevTools](https://react.dev/learn/react-developer-tools) - Frontend debugging
