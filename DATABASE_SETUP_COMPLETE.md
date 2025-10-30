# Database Setup and Integration - Complete

## Summary

Complete database setup infrastructure has been created for ErrandBit, including automated setup scripts, comprehensive documentation, and verification tools.

## What Was Created

### 1. Comprehensive Setup Guide (500 lines)
**File:** `DATABASE_SETUP_GUIDE.md`

**Contents:**
- PostgreSQL installation instructions (3 methods)
- Step-by-step database creation
- PostGIS extension setup
- Environment configuration
- Migration execution
- Schema verification
- Troubleshooting guide
- Production considerations
- Quick reference commands

### 2. Automated Setup Script (PowerShell)
**File:** `setup-database.ps1` (200 lines)

**Features:**
- Checks PostgreSQL installation
- Tests database connection
- Creates database automatically
- Enables PostGIS extension
- Updates .env file
- Runs migrations
- Verifies schema
- Comprehensive error handling
- Color-coded output

**Usage:**
```powershell
.\setup-database.ps1
```

### 3. Batch File Wrapper
**File:** `setup-database.bat`

**Features:**
- Simple double-click execution
- Checks for PostgreSQL
- Runs PowerShell script
- User-friendly output

**Usage:**
```bash
.\setup-database.bat
```

### 4. Quick Start Guide
**File:** `DATABASE_QUICK_START.md` (300 lines)

**Contents:**
- 3-step quick setup
- Manual setup instructions
- Common commands reference
- Verification checklist
- Test procedures
- Troubleshooting tips
- Schema highlights

### 5. Updated README
**File:** `README.md` (updated)

**Changes:**
- Added database setup section
- Included automated script instructions
- Added manual setup alternative
- Linked to detailed guides

## Database Schema Features

### Nostr Identity Support

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  nostr_pubkey VARCHAR(64) UNIQUE,  -- Privacy-preserving identity
  auth_method VARCHAR(20),           -- phone/email/nostr
  phone_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT auth_method_check CHECK (
    (auth_method = 'phone' AND phone IS NOT NULL) OR
    (auth_method = 'email' AND email IS NOT NULL) OR
    (auth_method = 'nostr' AND nostr_pubkey IS NOT NULL)
  )
);
```

### Key Features

- **Flexible Authentication:** Users can authenticate via phone, email, or Nostr
- **Privacy-First:** Nostr pubkey allows anonymous usage
- **Indexed:** Fast lookups on all authentication methods
- **PostGIS:** Geospatial queries for runner locations
- **Constraints:** Data integrity enforced at database level

## Setup Options

### Option 1: Automated Setup (Recommended)

```bash
# Double-click or run:
.\setup-database.bat
```

**What it does:**
1. Checks PostgreSQL installation
2. Prompts for credentials
3. Creates database
4. Enables PostGIS
5. Updates .env file
6. Runs migrations
7. Verifies schema

**Time:** 2-3 minutes

### Option 2: Manual Setup

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE errandbit;"
psql -U postgres -d errandbit -c "CREATE EXTENSION postgis;"

# 2. Configure .env
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/errandbit" >> backend/.env

# 3. Run migrations
cd backend
npm run migrate

# 4. Verify
npm run verify-db
```

**Time:** 5-10 minutes

### Option 3: Docker

```bash
# Start PostgreSQL with PostGIS
docker run --name errandbit-db \
  -e POSTGRES_PASSWORD=yourpassword \
  -p 5432:5432 \
  -d postgis/postgis:14-3.3

# Configure .env
echo "DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/errandbit" >> backend/.env

# Run migrations
cd backend
npm run migrate
```

**Time:** 3-5 minutes

## Verification Steps

### 1. Check PostgreSQL Installation

```bash
psql --version
# Expected: psql (PostgreSQL) 14.x or higher
```

### 2. Verify Database Exists

```bash
psql -U postgres -l | grep errandbit
# Expected: errandbit | postgres | UTF8 | ...
```

### 3. Check PostGIS Extension

```bash
psql -U postgres -d errandbit -c "SELECT PostGIS_version();"
# Expected: 3.x.x POSTGIS="3.x.x" ...
```

### 4. Verify Schema

```bash
cd backend
npm run verify-db
```

**Expected output:**
```
✓ Passed: 45
⚠ Warnings: 0
✗ Failed: 0

✓ Database schema verification PASSED
Your database is ready for ErrandBit!
```

### 5. Test Backend Connection

```bash
cd backend
npm run dev
```

**Expected output:**
```
ErrandBit API Server
Database connected successfully
Server running on port 4000
```

### 6. Test Health Endpoint

```bash
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

## What's Included in Database

### Tables Created (10 total)

1. **users** - User accounts with Nostr support
2. **runner_profiles** - Runner information and stats
3. **jobs** - Job listings and status
4. **messages** - Direct messaging between users
5. **reviews** - Rating and review system
6. **trust_tiers** - Trust level management
7. **subscriptions** - Runner subscription plans
8. **boosts** - Featured listing marketplace
9. **disputes** - Dispute resolution system
10. **bonds** - Optional runner bonds

### Indexes Created

- `idx_users_phone` - Fast phone lookup
- `idx_users_email` - Fast email lookup
- `idx_users_nostr_pubkey` - Fast Nostr lookup
- `idx_runner_profiles_location` - Geospatial queries
- `idx_jobs_status` - Job filtering
- Additional indexes on foreign keys

### Constraints

- Foreign key constraints for referential integrity
- Check constraints for data validation
- Unique constraints on authentication fields
- Auth method validation (ensures at least one auth method)

## Integration with Fedi Mod

### Nostr Authentication Flow

1. **User connects Nostr in Fedi app**
   ```javascript
   const pubkey = await window.nostr.getPublicKey();
   ```

2. **Frontend sends to backend**
   ```javascript
   POST /api/auth/nostr
   { "pubkey": "npub1..." }
   ```

3. **Backend creates/finds user**
   ```sql
   INSERT INTO users (role, nostr_pubkey, auth_method)
   VALUES ('client', 'npub1...', 'nostr')
   ON CONFLICT (nostr_pubkey) DO UPDATE SET updated_at = NOW()
   RETURNING *;
   ```

4. **User authenticated without email/phone**

### Privacy Benefits

- No personal information required
- Anonymous job posting
- Encrypted messaging via NIP-04
- Reputation tied to Nostr identity
- Portable across federations

## Troubleshooting

### PostgreSQL Not Found

**Issue:** `psql: command not found`

**Solution:**
1. Install PostgreSQL from https://www.postgresql.org/download/
2. Add to PATH: `C:\Program Files\PostgreSQL\14\bin`
3. Restart terminal

### Connection Refused

**Issue:** `Connection refused`

**Solution:**
```bash
# Check service
Get-Service postgresql*

# Start service
Start-Service postgresql-x64-14
```

### PostGIS Missing

**Issue:** `extension "postgis" does not exist`

**Solution:**
1. Install PostGIS via Stack Builder
2. Or download from https://postgis.net/windows_downloads/
3. Restart PostgreSQL service

### Migration Failed

**Issue:** Migration errors

**Solution:**
```bash
# Reset database
psql -U postgres -c "DROP DATABASE errandbit;"
psql -U postgres -c "CREATE DATABASE errandbit;"
psql -U postgres -d errandbit -c "CREATE EXTENSION postgis;"

# Run migrations again
cd backend
npm run migrate
```

## Next Steps

### Immediate

1. **Run setup script:**
   ```bash
   .\setup-database.bat
   ```

2. **Verify setup:**
   ```bash
   cd backend
   npm run verify-db
   ```

3. **Start backend:**
   ```bash
   npm run dev
   ```

4. **Test connection:**
   ```bash
   curl http://localhost:4000/health/deep
   ```

### Short-term

1. **Add sample data** (optional)
2. **Test Nostr authentication**
3. **Implement API endpoints**
4. **Connect frontend to backend**

### Production

1. **Use managed database** (AWS RDS, Heroku Postgres)
2. **Enable SSL connection**
3. **Set up backups**
4. **Configure connection pooling**
5. **Monitor performance**

## Files Created

```
ErrandBit/
├── setup-database.ps1 (NEW - 200 lines)
├── setup-database.bat (NEW - 40 lines)
├── DATABASE_SETUP_GUIDE.md (NEW - 500 lines)
├── DATABASE_QUICK_START.md (NEW - 300 lines)
├── DATABASE_SETUP_COMPLETE.md (NEW - this file)
├── README.md (UPDATED - database section)
├── backend/
│   ├── db/
│   │   ├── schema.sql (UPDATED - Nostr support)
│   │   ├── migrate.js (existing)
│   │   └── verify-schema.js (existing)
│   └── .env (will be created by script)
└── TEST_RESULTS.md (existing)
```

## Documentation

- **DATABASE_SETUP_GUIDE.md** - Complete setup instructions
- **DATABASE_QUICK_START.md** - Quick reference guide
- **DATABASE_SETUP_COMPLETE.md** - This summary
- **README.md** - Updated with database setup
- **backend/db/schema.sql** - Database schema with Nostr

## Commands Reference

```bash
# Setup
.\setup-database.bat              # Automated setup
.\setup-database.ps1              # PowerShell version

# Manual operations
psql -U postgres                  # Connect to PostgreSQL
createdb errandbit                # Create database
npm run migrate                   # Run migrations
npm run verify-db                 # Verify schema

# Testing
npm run dev                       # Start backend
curl http://localhost:4000/health # Test health
```

---

**Status:** Database setup infrastructure complete

**Next Action:** Run `.\setup-database.bat` to set up database

**Timeline:** 2-3 minutes for automated setup

All tools and documentation are ready for complete database setup and integration with ErrandBit Fedi Mod.
