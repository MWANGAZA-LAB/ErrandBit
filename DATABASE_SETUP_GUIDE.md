# ErrandBit Database Setup Guide

## Overview

This guide will help you set up PostgreSQL with PostGIS for ErrandBit, including the Nostr identity integration.

## Step 1: Install PostgreSQL

### Option A: PostgreSQL Installer (Recommended for Windows)

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download PostgreSQL 14 or higher installer
   - Includes pgAdmin and PostGIS

2. **Run installer:**
   - Accept default installation directory
   - Set a password for postgres user (remember this!)
   - Use default port: 5432
   - Select default locale

3. **Install PostGIS:**
   - In Stack Builder (opens after PostgreSQL install)
   - Select "Spatial Extensions"
   - Check "PostGIS" and install

### Option B: Docker (Alternative)

```bash
# Pull PostgreSQL with PostGIS
docker pull postgis/postgis:14-3.3

# Run container
docker run --name errandbit-db -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgis/postgis:14-3.3
```

### Option C: Chocolatey (Windows Package Manager)

```bash
# Install Chocolatey first: https://chocolatey.org/install

# Install PostgreSQL
choco install postgresql14

# Install PostGIS
choco install postgis
```

## Step 2: Verify Installation

### Check PostgreSQL is running:

```bash
# Windows Services
services.msc
# Look for "postgresql-x64-14" service

# Or check with PowerShell
Get-Service postgresql*
```

### Test connection:

```bash
# Connect to PostgreSQL
psql -U postgres

# You should see:
# postgres=#
```

## Step 3: Create ErrandBit Database

### Using psql command line:

```bash
# Connect as postgres user
psql -U postgres

# Create database
CREATE DATABASE errandbit;

# Connect to database
\c errandbit

# Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

# Verify PostGIS
SELECT PostGIS_version();

# Exit
\q
```

### Using pgAdmin (GUI):

1. Open pgAdmin
2. Connect to PostgreSQL server
3. Right-click "Databases" → "Create" → "Database"
4. Name: `errandbit`
5. Click "Save"
6. Open Query Tool for errandbit database
7. Run: `CREATE EXTENSION IF NOT EXISTS postgis;`

## Step 4: Configure ErrandBit

### Update backend/.env file:

```bash
# Navigate to backend directory
cd backend

# Edit .env file
notepad .env
```

### Set DATABASE_URL:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/errandbit
```

**Format:**
```
postgresql://[username]:[password]@[host]:[port]/[database]
```

**Examples:**
```env
# Local PostgreSQL with postgres user
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/errandbit

# Docker PostgreSQL
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/errandbit

# Remote PostgreSQL
DATABASE_URL=postgresql://user:pass@db.example.com:5432/errandbit
```

## Step 5: Run Migrations

### Create migration script:

The migration script is already in `backend/db/migrate.js`. Let's verify it exists:

```bash
cd backend
ls db/
```

### Run migrations:

```bash
# From backend directory
npm run migrate
```

**Expected output:**
```
Running migrations...
✓ Created users table
✓ Created runner_profiles table
✓ Created jobs table
✓ Created messages table
✓ Created reviews table
✓ Created trust_tiers table
✓ Created subscriptions table
✓ Created boosts table
✓ Created disputes table
✓ Created bonds table
✓ All migrations completed successfully
```

## Step 6: Verify Schema

### Run verification script:

```bash
npm run verify-db
```

**Expected output:**
```
ErrandBit Database Schema Verification
============================================================

Database: postgresql://postgres:****@localhost:5432/errandbit

1. Checking PostgreSQL extensions...
   ✓ PostGIS extension found

2. Checking required tables...
   ✓ users
   ✓ runner_profiles
   ✓ jobs
   ✓ messages
   ✓ reviews
   ✓ trust_tiers
   ✓ subscriptions
   ✓ boosts
   ✓ disputes
   ✓ bonds

3. Checking users table schema...
   ✓ id (integer)
   ✓ role (character varying)
   ✓ phone (character varying)
   ✓ email (character varying)
   ✓ nostr_pubkey (character varying)
     → Nostr identity support enabled
   ✓ auth_method (character varying)
   ✓ created_at (timestamp without time zone)

4. Checking database indexes...
   ✓ idx_users_phone
   ✓ idx_users_email
   ✓ idx_users_nostr_pubkey
   ✓ idx_runner_profiles_location
   ✓ idx_jobs_status

5. Checking database constraints...
   ✓ 15 check constraints
   ✓ 25 foreign keys
   ✓ 12 unique constraints
   ✓ auth_method_check constraint found

6. Testing database connection...
   ✓ Connection successful
   → PostgreSQL version: PostgreSQL 14.x

============================================================
VERIFICATION SUMMARY
============================================================

✓ Passed: 45
⚠ Warnings: 0
✗ Failed: 0

============================================================

✓ Database schema verification PASSED
Your database is ready for ErrandBit!
```

## Step 7: Test Database Connection

### Test from backend:

```bash
# Start backend server
npm run dev
```

**Expected output:**
```
[nodemon] starting `node src/server.js`
ErrandBit API Server
Database connected successfully
Server running on port 4000
```

### Test health endpoint:

```bash
# In another terminal
curl http://localhost:4000/health/deep
```

**Expected response:**
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

### Issue: "psql: command not found"

**Solution:**
Add PostgreSQL to PATH:
1. Find PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\14\bin`)
2. Add to System PATH environment variable
3. Restart terminal

### Issue: "Connection refused"

**Solution:**
```bash
# Check if PostgreSQL is running
Get-Service postgresql*

# Start service if stopped
Start-Service postgresql-x64-14
```

### Issue: "password authentication failed"

**Solution:**
1. Verify password in .env matches PostgreSQL user password
2. Check pg_hba.conf allows password authentication
3. Try resetting postgres password:
   ```bash
   psql -U postgres
   ALTER USER postgres PASSWORD 'newpassword';
   ```

### Issue: "database does not exist"

**Solution:**
```bash
# Create database
psql -U postgres -c "CREATE DATABASE errandbit;"
```

### Issue: "PostGIS extension not found"

**Solution:**
1. Install PostGIS from Stack Builder
2. Or manually: `CREATE EXTENSION postgis;`
3. Verify: `SELECT PostGIS_version();`

### Issue: "Migration failed"

**Solution:**
```bash
# Drop and recreate database
psql -U postgres
DROP DATABASE errandbit;
CREATE DATABASE errandbit;
\c errandbit
CREATE EXTENSION postgis;
\q

# Run migrations again
npm run migrate
```

## Database Schema Overview

### Users Table (with Nostr Support)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  nostr_pubkey VARCHAR(64) UNIQUE,  -- NEW: Nostr identity
  auth_method VARCHAR(20),           -- NEW: phone/email/nostr
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Authentication Methods
- **Phone:** Traditional SMS verification
- **Email:** Traditional email verification
- **Nostr:** Privacy-preserving public key authentication

### Key Features
- Flexible authentication (at least one method required)
- Nostr pubkey indexed for fast lookups
- PostGIS for geospatial queries
- Foreign key constraints for data integrity
- Indexes for performance

## Next Steps

After database setup:

1. **Test backend API:**
   ```bash
   npm run dev
   curl http://localhost:4000/health/deep
   ```

2. **Test with frontend:**
   - Start frontend: `npm run dev`
   - Navigate to http://localhost:5173
   - Features will use database

3. **Add sample data (optional):**
   ```bash
   npm run seed  # If seed script exists
   ```

4. **Monitor database:**
   - Use pgAdmin for GUI
   - Check logs: `backend/logs/`
   - Monitor queries in development

## Production Considerations

### For Production Deployment:

1. **Use managed database:**
   - AWS RDS PostgreSQL
   - Google Cloud SQL
   - Heroku Postgres
   - Supabase

2. **Enable SSL:**
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
   ```

3. **Connection pooling:**
   - Already configured in backend (pg Pool)
   - Adjust pool size for production

4. **Backups:**
   - Enable automated backups
   - Test restore procedures
   - Keep 30 days of backups

5. **Monitoring:**
   - Query performance
   - Connection count
   - Disk usage
   - Slow query log

## Quick Reference

### Common Commands

```bash
# Connect to database
psql -U postgres -d errandbit

# List databases
\l

# List tables
\dt

# Describe table
\d users

# Run SQL file
psql -U postgres -d errandbit -f schema.sql

# Backup database
pg_dump -U postgres errandbit > backup.sql

# Restore database
psql -U postgres errandbit < backup.sql
```

### Environment Variables

```env
# Development
DATABASE_URL=postgresql://postgres:password@localhost:5432/errandbit

# Production
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/errandbit?sslmode=require
```

### NPM Scripts

```bash
npm run migrate      # Run migrations
npm run verify-db    # Verify schema
npm run dev          # Start with database
```

---

**Status:** Ready for database setup
**Estimated Time:** 15-30 minutes
**Prerequisites:** PostgreSQL 14+ with PostGIS
