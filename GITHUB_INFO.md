# ErrandBit - GitHub Repository

## Repository Information

**Repository URL:** https://github.com/MWANGAZA-LAB/ErrandBit.git  
**Organization:** MWANGAZA-LAB  
**Branch:** main  
**Initial Commit:** ef6e3f6

## Repository Contents

### Committed Files (37 files, 6,823 lines)

#### Documentation
- `README.md` - Project overview and quick start guide
- `CHANGELOG.md` - Version history and changes
- `DEVELOPMENT_GUIDE.md` - Technical documentation
- `PROJECT_STATUS.md` - Current status and roadmap
- `.gitignore` - Git ignore rules

#### Backend (Node.js + Express + PostgreSQL)
```
backend/
├── src/
│   ├── server.js              # Express server
│   ├── db.js                  # PostgreSQL connection
│   ├── routes/
│   │   ├── health.js          # Health check endpoints
│   │   ├── runners.js         # Runner profile routes
│   │   ├── jobs.js            # Job management routes
│   │   ├── messages.js        # Messaging routes
│   │   └── payments.js        # Payment routes
│   └── utils/
│       └── error.js           # Error handling
├── db/
│   ├── schema.sql             # Database schema
│   ├── seed.sql               # Test data
│   └── migrate.js             # Migration runner
├── API.md                     # API documentation
├── .env.example               # Environment template
├── package.json               # Dependencies
└── package-lock.json          # Locked dependencies
```

#### Frontend (React + TypeScript + Vite + Tailwind)
```
frontend/
├── src/
│   ├── main.tsx               # Application entry
│   ├── App.tsx                # Router configuration
│   ├── api.ts                 # API client
│   ├── index.css              # Global styles
│   ├── components/
│   │   └── Layout.tsx         # Navigation layout
│   └── pages/
│       ├── Home.tsx           # Landing page
│       ├── FindRunners.tsx    # Runner search
│       ├── MyJobs.tsx         # Job management
│       └── Profile.tsx        # User profile
├── index.html                 # HTML template
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind configuration
├── postcss.config.js          # PostCSS configuration
├── tsconfig.json              # TypeScript configuration
├── .env.example               # Environment template
├── package.json               # Dependencies
└── package-lock.json          # Locked dependencies
```

## Clone Instructions

### Clone the Repository
```bash
git clone https://github.com/MWANGAZA-LAB/ErrandBit.git
cd ErrandBit
```

### Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Configure Environment
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your VITE_API_BASE
```

### Run Development Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Repository Statistics

- **Total Files:** 37
- **Total Lines:** 6,823
- **Languages:** TypeScript, JavaScript, SQL, CSS, Markdown
- **License:** Private - All rights reserved

## Next Steps

1. **Database Setup**
   - Set up PostgreSQL instance
   - Run migrations: `npm run migrate`
   - Seed test data (optional)

2. **Feature Development**
   - Implement authentication (Twilio)
   - Wire up database operations
   - Add map integration (Mapbox)
   - Implement Lightning payments

3. **Deployment**
   - Set up CI/CD pipeline
   - Configure staging environment
   - Deploy to production

## Commit History

### Initial Commit (ef6e3f6)
**Message:** "Initial commit - ErrandBit MVP scaffold"

**Changes:**
- Complete backend API structure
- Frontend UI with professional design
- Database schema with PostGIS
- Comprehensive documentation
- Professional UI/UX (no emojis)
- SVG icon system
- Tailwind design system

## Branch Strategy

- `main` - Production-ready code
- `develop` - Active development (to be created)
- `feature/*` - Feature branches (to be created)
- `hotfix/*` - Emergency fixes (to be created)

## Collaboration

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
5. Wait for review and approval

### Code Review Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Keep commits atomic and descriptive

## Support

For issues, questions, or contributions:
- **Issues:** https://github.com/MWANGAZA-LAB/ErrandBit/issues
- **Pull Requests:** https://github.com/MWANGAZA-LAB/ErrandBit/pulls
- **Discussions:** https://github.com/MWANGAZA-LAB/ErrandBit/discussions

## Repository Settings

### Recommended Settings
- Enable branch protection for `main`
- Require pull request reviews
- Require status checks to pass
- Enable automatic security updates
- Configure GitHub Actions for CI/CD

### Secrets to Configure
- `DATABASE_URL` - PostgreSQL connection string
- `TWILIO_ACCOUNT_SID` - Twilio account ID
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `MAPBOX_TOKEN` - Mapbox API key
- `LNBITS_API_KEY` - LNBits API key

## License

Private - All rights reserved

Copyright (c) 2025 MWANGAZA-LAB
