# ErrandBit - Project Status

**Last Updated:** Oct 30, 2025

## Completed

### Backend Infrastructure
- [x] Express server with health checks (`/health`, `/health/deep`)
- [x] PostgreSQL connection scaffold with `pg` driver
- [x] Database schema with PostGIS support (see `backend/db/schema.sql`)
- [x] Migration runner script (`npm run migrate`)
- [x] Seed data for testing
- [x] CORS, Helmet, Morgan middleware
- [x] Error handling utilities

### API Routes (Placeholder)
- [x] `/runners` - Profile CRUD and search
- [x] `/jobs` - Job lifecycle management
- [x] `/messages` - Chat messages per job
- [x] `/payments` - Lightning payment instructions and validation
- [x] API documentation (`backend/API.md`)

### Frontend Infrastructure
- [x] Vite + React + TypeScript setup
- [x] Tailwind CSS styling
- [x] React Router navigation
- [x] Modern UI layout with navigation bar
- [x] Responsive design

### Pages
- [x] Home - Landing page with feature highlights
- [x] Find Runners - Search interface (placeholder)
- [x] My Jobs - Job management (placeholder)
- [x] Profile - User/runner profile forms (placeholder)

## In Progress

### Database Connection
- [ ] Set up PostgreSQL instance (local or hosted)
- [ ] Configure `DATABASE_URL` in `.env`
- [ ] Run migrations: `npm run migrate`
- [ ] Test connection via `/health/deep`

## Next Steps (Priority Order)

### 1. Database Setup
**Goal:** Connect backend to PostgreSQL and verify schema

**Tasks:**
- Install PostgreSQL locally or use hosted service (ElephantSQL, Supabase, etc.)
- Copy `backend/.env.example` to `backend/.env`
- Set `DATABASE_URL=postgresql://user:pass@host:5432/errandbit`
- Run `npm run migrate` to create tables
- Verify with `curl http://localhost:4000/health/deep`

### 2. Authentication (Phone Verification)
**Goal:** Implement phone verification flow with Twilio

**Tasks:**
- Sign up for Twilio account
- Add Twilio credentials to `.env`
- Install `twilio` package
- Implement `/auth/phone/start` endpoint
- Implement `/auth/phone/verify` endpoint
- Add JWT token generation
- Create auth middleware for protected routes
- Add phone verification UI to frontend

**Dependencies:**
```bash
cd backend
npm install twilio jsonwebtoken bcrypt
```

### 3. Runner Profiles (Database Integration)
**Goal:** Wire up runner profile CRUD to PostgreSQL

**Tasks:**
- Implement `POST /runners` - Create profile
- Implement `GET /runners/:id` - Fetch profile
- Implement `PATCH /runners/:id` - Update profile
- Implement `GET /runners?lat&lng&radius_km&tags[]` - Search with PostGIS
- Connect frontend Profile page to API
- Add form validation and error handling

### 4. Map Integration (Mapbox)
**Goal:** Add interactive map for runner search

**Tasks:**
- Sign up for Mapbox account
- Add `VITE_MAPBOX_TOKEN` to frontend `.env`
- Install `mapbox-gl` and `@types/mapbox-gl`
- Create Map component
- Display runner pins on map
- Add distance calculation
- Integrate with search filters

**Dependencies:**
```bash
cd frontend
npm install mapbox-gl react-map-gl
```

### 5. Job Booking Flow
**Goal:** Implement full job lifecycle

**Tasks:**
- Wire job endpoints to database
- Add job creation form on frontend
- Implement runner job acceptance/decline
- Add status transition logic
- Create job detail page
- Add real-time status updates

### 6. Real-time Chat (Socket.io)
**Goal:** Enable in-app messaging per job

**Tasks:**
- Install Socket.io on backend and frontend
- Set up Redis for pub/sub (optional, can use in-memory for MVP)
- Create WebSocket server
- Implement job-specific chat rooms
- Add chat UI component
- Add QR code scanner for invoice sharing

**Dependencies:**
```bash
cd backend
npm install socket.io redis

cd frontend
npm install socket.io-client
```

### 7. Lightning Payments
**Goal:** Integrate Lightning Address and invoice flows

**Tasks:**
- Sign up for LNBits instance (hosted or self-hosted)
- Install Lightning libraries
- Implement Tier 1: Lightning Address + WebLN detection
- Implement Tier 2: Invoice generation via LNBits
- Add invoice validation
- Create payment instruction UI
- Add payment confirmation flow

**Dependencies:**
```bash
cd backend
npm install @getalby/sdk bolt11

cd frontend
npm install @getalby/bitcoin-connect
```

### 8. Reviews & Ratings
**Goal:** Post-job review system

**Tasks:**
- Wire reviews endpoints to database
- Add review prompt after job completion
- Display reviews on runner profiles
- Calculate and cache avg_rating and completion_rate
- Add review moderation (admin)

### 9. Trust Tiers & Limits
**Goal:** Enforce progressive trust system

**Tasks:**
- Create tier calculation logic
- Add middleware to enforce job caps
- Display tier badges on profiles
- Implement tier upgrade triggers
- Add optional micro-bonds feature

### 10. Subscriptions & Boosts
**Goal:** Monetization via runner subscriptions

**Tasks:**
- Implement Pro subscription purchase flow
- Add Lightning payment for subscriptions
- Create boost purchase and ranking logic
- Add subscription management UI
- Display boosted runners prominently

## Technical Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Backend** | Node.js + Express | Fast development, good ecosystem |
| **Frontend** | React + Vite + TS | Modern, fast, type-safe |
| **Database** | PostgreSQL + PostGIS | Geospatial queries, robust |
| **Styling** | Tailwind CSS | Rapid UI development |
| **Auth** | Phone verification (Twilio) | Required for trust, SMS widely available |
| **Maps** | Mapbox | Cost-effective, good API |
| **Lightning** | LNURL + WebLN + LNBits | Best UX, self-custodial option |
| **Real-time** | Socket.io | Simple, reliable |

## MVP Success Metrics

- **500** active runners across 3 cities
- **2,000** completed jobs
- **85%+** job completion rate
- **4.5★** average platform rating
- **60%** runner retention (month-over-month)
- **$50K** annual recurring revenue from subscriptions

## Launch Strategy

### Phase 1: Hyper-Local (Months 1-3)
- Single city focus (Austin, Miami, or Nashville)
- 50 hand-recruited runners
- Free Pro subscriptions for 6 months
- Host local Bitcoin meetup

### Phase 2: Quality Scaling (Months 4-8)
- Open registration city-wide
- Enable subscription model
- Add 2-3 cities
- Partner with Bitcoin meetups

### Phase 3: Network Effects (Months 9-12)
- API for third-party integrations
- Corporate accounts
- Additional cities based on demand

## Notes

- Database not yet connected - need PostgreSQL instance
- All API routes return placeholder data
- Frontend pages are UI mockups
- Authentication not implemented
- Lightning integration pending
- No WebSocket server yet

## Resources

- **API Docs:** `backend/API.md`
- **Database Schema:** `backend/db/schema.sql`
- **Seed Data:** `backend/db/seed.sql`
- **Vision Doc:** See original requirements document
