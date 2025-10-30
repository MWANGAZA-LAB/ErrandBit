# ErrandBit - Quick Start Guide

## Running the Development Servers

### Method 1: Batch File (Easiest - Windows)
```bash
.\start-dev.bat
```
This will open two separate terminal windows:
- Backend on http://localhost:4000
- Frontend on http://localhost:5173

### Method 2: From Root Directory
Open two separate terminals:

**Terminal 1 (Backend):**
```bash
npm run dev:backend
```

**Terminal 2 (Frontend):**
```bash
npm run dev:frontend
```

### Method 3: From Subdirectories
Open two separate terminals:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

## Common Commands

### Install All Dependencies
```bash
npm run install:all
```
Or manually:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### Run Database Migrations
```bash
npm run migrate
```
Or manually:
```bash
cd backend
npm run migrate
```

### Check API Health
```bash
# Basic health check
curl http://localhost:4000/health

# Deep health check (with database)
curl http://localhost:4000/health/deep
```

## Troubleshooting

### "Missing script: dev" Error
This happens when you run `npm run dev` from the root directory. Use one of these instead:
- `.\start-dev.bat` (Windows batch file)
- `npm run dev:backend` (for backend only)
- `npm run dev:frontend` (for frontend only)

### Port Already in Use
If you see "Port 4000 is already in use" or "Port 5173 is already in use":
1. Stop any existing processes using those ports
2. Or change the ports in:
   - Backend: `backend/.env` (PORT variable)
   - Frontend: `frontend/vite.config.ts` (server.port)

### Database Connection Error
If you see database connection errors:
1. Make sure PostgreSQL is running
2. Check your `backend/.env` file has correct `DATABASE_URL`
3. Run migrations: `npm run migrate`

### Module Not Found Errors
If you see "Cannot find module" errors:
```bash
# Reinstall all dependencies
npm run install:all
```

## Development Workflow

### 1. Start Development
```bash
.\start-dev.bat
```

### 2. Make Changes
- Backend code is in `backend/src/`
- Frontend code is in `frontend/src/`
- Both servers auto-reload on file changes

### 3. Test Your Changes
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- API Docs: See `backend/API.md`

### 4. Commit Changes
```bash
git add .
git commit -m "feat: your feature description"
git push origin main
```

## URLs Reference

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React application |
| Backend | http://localhost:4000 | Express API |
| Health Check | http://localhost:4000/health | Basic health |
| Deep Health | http://localhost:4000/health/deep | Health + DB |
| API Docs | `backend/API.md` | Complete API reference |

## Project Structure

```
ErrandBit/
├── backend/          # Express API
│   ├── src/         # Source code
│   ├── db/          # Database files
│   └── package.json
├── frontend/        # React app
│   ├── src/         # Source code
│   └── package.json
├── start-dev.bat    # Start both servers
└── package.json     # Root scripts
```

## Next Steps

1. **Set up Database**
   - Install PostgreSQL
   - Configure `backend/.env`
   - Run `npm run migrate`

2. **Configure APIs**
   - Add Twilio credentials for auth
   - Add Mapbox token for maps
   - Add LNBits credentials for payments

3. **Start Building**
   - See `DEVELOPMENT_GUIDE.md` for architecture
   - See `PROJECT_STATUS.md` for roadmap
   - See `backend/API.md` for API reference

## Getting Help

- **Documentation:** See `README.md`, `DEVELOPMENT_GUIDE.md`
- **API Reference:** See `backend/API.md`
- **Issues:** https://github.com/MWANGAZA-LAB/ErrandBit/issues
