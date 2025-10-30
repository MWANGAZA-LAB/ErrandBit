# Database Quick Start

## Prerequisites

- PostgreSQL 14+ installed
- PostGIS extension installed
- PostgreSQL service running

## Quick Setup (3 Steps)

### Step 1: Run Setup Script

```bash
# Windows
.\setup-database.bat

# Or PowerShell
.\setup-database.ps1
```

The script will:
- Check PostgreSQL installation
- Create database
- Enable PostGIS
- Update .env file
- Run migrations
- Verify schema

### Step 2: Verify Setup

```bash
cd backend
npm run verify-db
```

Expected: "Database schema verification PASSED"

### Step 3: Start Backend

```bash
npm run dev
```

Expected: "Database connected successfully"

## Manual Setup (If Script Fails)

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE errandbit;

# Connect to database
\c errandbit

# Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

# Exit
\q
```

### 2. Configure Environment

Edit `backend/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/errandbit
```

### 3. Run Migrations

```bash
cd backend
npm run migrate
```

### 4. Verify

```bash
npm run verify-db
```

## Common Commands

### Database Operations

```bash
# Connect to database
psql -U postgres -d errandbit

# List tables
\dt

# Describe users table
\d users

# Check Nostr column
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' AND column_name='nostr_pubkey';

# Exit
\q
```

### Backend Operations

```bash
# Run migrations
npm run migrate

# Verify schema
npm run verify-db

# Start server
npm run dev

# Test health
curl http://localhost:4000/health/deep
```

### Reset Database

```bash
# Drop and recreate
psql -U postgres -c "DROP DATABASE errandbit;"
psql -U postgres -c "CREATE DATABASE errandbit;"
psql -U postgres -d errandbit -c "CREATE EXTENSION postgis;"

# Run migrations again
cd backend
npm run migrate
```

## Verification Checklist

After setup, verify:

- [ ] PostgreSQL service running
- [ ] Database 'errandbit' exists
- [ ] PostGIS extension enabled
- [ ] .env file configured
- [ ] Migrations completed
- [ ] Schema verification passed
- [ ] Backend connects successfully
- [ ] Health endpoint returns db.connected: true

## Test Database Connection

### From Command Line

```bash
# Test connection
psql -U postgres -d errandbit -c "SELECT 1;"

# Check PostGIS
psql -U postgres -d errandbit -c "SELECT PostGIS_version();"

# Check users table
psql -U postgres -d errandbit -c "SELECT * FROM users LIMIT 1;"
```

### From Backend

```bash
# Start backend
cd backend
npm run dev

# In another terminal, test health
curl http://localhost:4000/health/deep
```

Expected response:
```json
{
  "ok": true,
  "service": "errandbit-api",
  "db": {
    "connected": true
  }
}
```

## Troubleshooting

### PostgreSQL not found

```bash
# Add to PATH (Windows)
# C:\Program Files\PostgreSQL\14\bin

# Verify
psql --version
```

### Connection refused

```bash
# Check service
Get-Service postgresql*

# Start service
Start-Service postgresql-x64-14
```

### Password authentication failed

```bash
# Reset password
psql -U postgres
ALTER USER postgres PASSWORD 'newpassword';
\q

# Update .env with new password
```

### PostGIS not found

```bash
# Install via Stack Builder
# Or manually:
psql -U postgres -d errandbit
CREATE EXTENSION postgis;
SELECT PostGIS_version();
\q
```

### Migration failed

```bash
# Check error message
# Common issues:
# - Database doesn't exist: Create it first
# - PostGIS missing: Install PostGIS
# - Permission denied: Check user permissions
# - Syntax error: Check schema.sql

# Reset and retry
psql -U postgres -c "DROP DATABASE errandbit;"
psql -U postgres -c "CREATE DATABASE errandbit;"
psql -U postgres -d errandbit -c "CREATE EXTENSION postgis;"
cd backend
npm run migrate
```

## Database Schema Highlights

### Users Table with Nostr Support

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  nostr_pubkey VARCHAR(64) UNIQUE,  -- Nostr identity
  auth_method VARCHAR(20),           -- phone/email/nostr
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Key Features

- **Flexible Authentication:** Phone, email, or Nostr
- **Nostr Integration:** Privacy-preserving identity
- **PostGIS Support:** Geospatial queries for runner locations
- **Indexed:** Fast lookups on all auth methods
- **Constraints:** Data integrity enforced

## Next Steps

After database setup:

1. **Start backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Fedi integration:**
   - Open http://localhost:5173
   - Use Fedi simulator
   - Test payment flow

4. **Add sample data (optional):**
   ```sql
   -- Connect to database
   psql -U postgres -d errandbit
   
   -- Insert test user with Nostr
   INSERT INTO users (role, nostr_pubkey, auth_method)
   VALUES ('runner', 'npub1test123...', 'nostr');
   ```

## Resources

- **DATABASE_SETUP_GUIDE.md** - Detailed setup instructions
- **backend/db/schema.sql** - Complete database schema
- **backend/db/verify-schema.js** - Verification script
- **backend/db/migrate.js** - Migration script

---

**Quick Start Complete!**

Your database is ready for ErrandBit with full Nostr identity support.
