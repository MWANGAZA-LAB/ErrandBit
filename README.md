# ErrandBit

**Trust-minimized local services marketplace powered by Bitcoin Lightning**

## Vision

ErrandBit eliminates platform rent-seeking through Bitcoin Lightning payments, returning economic power to service providers while maintaining client protection through reputation and lightweight coordination.

## Technology Stack

- **Backend:** Node.js + Express + PostgreSQL + PostGIS
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Payments:** Bitcoin Lightning (LNURL + WebLN + LNBits)
- **Real-time:** Socket.io + Redis (planned)
- **Maps:** Mapbox (planned)

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- npm or yarn

### 1. Clone and Install

```bash
# Backend
cd backend
npm install
cp .env.example .env

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

### 2. Configure Database

Edit `backend/.env`:
```env
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/errandbit
```

Create database and run migrations:
```bash
cd backend
npm run migrate
```

### 3. Start Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# → http://localhost:4000

# Terminal 2 - Frontend
cd frontend
npm run dev
# → http://localhost:5173
```

### 4. Verify

- **Frontend:** http://localhost:5173
- **Backend Health:** http://localhost:4000/health
- **Deep Health (with DB):** http://localhost:4000/health/deep

## Project Structure

```
ErrandBit/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app entry
│   │   ├── db.js              # PostgreSQL connection
│   │   ├── routes/            # API endpoints
│   │   │   ├── health.js
│   │   │   ├── runners.js
│   │   │   ├── jobs.js
│   │   │   ├── messages.js
│   │   │   └── payments.js
│   │   └── utils/
│   ├── db/
│   │   ├── schema.sql         # Database schema
│   │   ├── seed.sql           # Test data
│   │   └── migrate.js         # Migration runner
│   ├── API.md                 # API documentation
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx           # React entry
│   │   ├── App.tsx            # Router setup
│   │   ├── api.ts             # API client
│   │   ├── components/
│   │   │   └── Layout.tsx     # Navigation layout
│   │   └── pages/
│   │       ├── Home.tsx
│   │       ├── FindRunners.tsx
│   │       ├── MyJobs.tsx
│   │       └── Profile.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
├── PROJECT_STATUS.md          # Detailed status & roadmap
└── README.md
```

## Documentation

- **[API Documentation](backend/API.md)** - Complete API reference
- **[Project Status](PROJECT_STATUS.md)** - Current status and roadmap
- **[Database Schema](backend/db/schema.sql)** - Full schema with PostGIS

## MVP Features

### Completed
- Backend API scaffold with Express
- PostgreSQL schema with PostGIS support
- Frontend UI with React + Tailwind
- Navigation and routing
- Placeholder pages for all core features

### In Progress
- Database connection and migration
- Authentication (phone verification)
- Runner profile CRUD
- Map integration (Mapbox)
- Job booking flow
- Real-time chat (Socket.io)
- Lightning payments (LNURL + WebLN)

## Key Features (Planned)

### Two-Tier Payment Flow
- **Tier 1:** Lightning Address (instant, Venmo-like UX)
- **Tier 2:** Invoice generation (fallback)

### Progressive Trust System
- **New Users:** $50 job limit
- **Established:** $200 limit (6-25 jobs, >4.5★)
- **Verified Pro:** Unlimited (25+ jobs, >4.7★)

### Revenue Model
- **Primary:** Runner subscriptions ($15/month in sats)
- **Secondary:** Visibility boosts (10,000 sats/24hrs)

## Next Steps

1. **Set up PostgreSQL** and run migrations
2. **Implement authentication** with Twilio phone verification
3. **Wire up runner profiles** to database
4. **Add Mapbox integration** for search
5. **Implement job booking** flow
6. **Add real-time chat** with Socket.io
7. **Integrate Lightning payments**

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for detailed roadmap.

## Contributing

This is an MVP in active development. Core features are being built in priority order.

## License

Private - All rights reserved
