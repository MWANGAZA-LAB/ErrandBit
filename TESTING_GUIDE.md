# ErrandBit Testing Guide

## Overview

This guide provides step-by-step instructions for testing all ErrandBit features locally before deployment.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ with PostGIS installed
- Git installed
- Modern web browser (Chrome/Firefox/Edge)

## Setup Instructions

### 1. Environment Setup

```bash
# Navigate to project
cd ErrandBit

# Install all dependencies
npm run install:all

# Or install separately
cd backend && npm install
cd ../frontend && npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb errandbit

# Configure environment
cd backend
cp .env.example .env

# Edit .env file with your database credentials
# DATABASE_URL=postgresql://username:password@localhost:5432/errandbit
```

### 3. Run Migrations

```bash
# From backend directory
npm run migrate

# Verify schema
npm run verify-db
```

Expected output:
```
✓ Database schema verification PASSED
Your database is ready for ErrandBit!
```

### 4. Start Development Servers

```bash
# From project root
.\start-dev.bat

# Or manually in separate terminals:
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

## Testing Checklist

### Phase 1: Basic Functionality

#### Test 1: Home Page
- [ ] Navigate to http://localhost:5173
- [ ] Verify page loads without errors
- [ ] Check FediStatus component displays
- [ ] Should show "Open in Fedi for Full Experience" message
- [ ] Verify navigation links work
- [ ] Check API health status displays

#### Test 2: Find Runners Page
- [ ] Navigate to /find-runners
- [ ] Verify search interface displays
- [ ] Check placeholder runner cards show
- [ ] Verify "Development in Progress" message displays
- [ ] Test search filters (UI only)

#### Test 3: My Jobs Page
- [ ] Navigate to /my-jobs
- [ ] Verify job list displays
- [ ] Check placeholder jobs show
- [ ] Verify status badges display correctly

#### Test 4: Profile Page
- [ ] Navigate to /profile
- [ ] Verify form fields display
- [ ] Check account info section
- [ ] Check runner profile section
- [ ] Verify "Save Changes" button present

### Phase 2: Fedi Simulation Testing

#### Test 5: WebLN Simulation

1. **Open browser console** (F12)

2. **Load simulator:**
   ```javascript
   // Option 1: Add script tag
   const script = document.createElement('script');
   script.src = '/fedi-simulator.js';
   document.head.appendChild(script);
   
   // Option 2: Use URL parameter
   // Navigate to: http://localhost:5173?fedi-sim=true
   ```

3. **Enable WebLN:**
   ```javascript
   simulateWebLN();
   location.reload();
   ```

4. **Verify WebLN active:**
   - [ ] FediStatus shows "Connected to Fedi"
   - [ ] "Lightning payments enabled" message displays
   - [ ] Console shows "[Fedi Simulator] WebLN enabled"

#### Test 6: Job Detail with Payment

1. **Navigate to job detail:**
   ```
   http://localhost:5173/jobs/1
   ```

2. **Verify page elements:**
   - [ ] Job title and description display
   - [ ] Runner information shows
   - [ ] Amount displays correctly (50,000 sats)
   - [ ] Status badge shows "Completed - Ready to Pay"

3. **Test payment flow:**
   - [ ] Click "Pay 50,000 sats" button
   - [ ] Button shows "Processing..." state
   - [ ] Console shows payment simulation
   - [ ] Success message displays
   - [ ] Button changes to "Paid" state
   - [ ] Review form appears

4. **Test review submission:**
   - [ ] Click stars to set rating
   - [ ] Enter review text
   - [ ] Click "Submit Review"
   - [ ] Success alert shows
   - [ ] Redirects to /my-jobs

#### Test 7: Nostr Identity

1. **Enable Nostr simulation:**
   ```javascript
   simulateNostr();
   location.reload();
   ```

2. **Navigate to profile:**
   ```
   http://localhost:5173/profile
   ```

3. **Verify Nostr section:**
   - [ ] "Privacy-Preserving Identity" section displays
   - [ ] "Connect Nostr Identity" button shows
   - [ ] Click button to connect
   - [ ] Public key displays (truncated)
   - [ ] Copy button works
   - [ ] Checkbox to use Nostr appears

4. **Test Nostr mode:**
   - [ ] Check "Use Nostr identity" checkbox
   - [ ] Phone field becomes disabled
   - [ ] Email field becomes disabled
   - [ ] Helper text shows "Not required when using Nostr identity"

#### Test 8: Full Fedi Environment

1. **Enable full simulation:**
   ```javascript
   simulateFedi();
   location.reload();
   ```

2. **Verify both features:**
   - [ ] FediStatus shows both WebLN and Nostr connected
   - [ ] Payment flow works on /jobs/1
   - [ ] Nostr identity works in /profile
   - [ ] No console errors

### Phase 3: Error Handling

#### Test 9: Payment Errors

1. **Modify simulator to fail:**
   ```javascript
   window.webln.sendPayment = async () => {
     throw new Error('Payment failed: Insufficient balance');
   };
   ```

2. **Test error handling:**
   - [ ] Navigate to /jobs/1
   - [ ] Click "Pay" button
   - [ ] Error message displays
   - [ ] Button returns to "Pay" state
   - [ ] Can retry payment

#### Test 10: Network Errors

1. **Stop backend server**

2. **Test graceful degradation:**
   - [ ] Home page still loads
   - [ ] API health shows error
   - [ ] Pages don't crash
   - [ ] Appropriate error messages display

### Phase 4: Database Integration

#### Test 11: Database Connection

1. **Verify database connection:**
   ```bash
   cd backend
   npm run verify-db
   ```

2. **Check output:**
   - [ ] All tables exist
   - [ ] PostGIS extension installed
   - [ ] Nostr_pubkey column present
   - [ ] Indexes created
   - [ ] Constraints active

#### Test 12: Health Check

1. **Test basic health:**
   ```bash
   curl http://localhost:4000/health
   ```
   Expected: `{"ok":true,"service":"errandbit-api"}`

2. **Test deep health:**
   ```bash
   curl http://localhost:4000/health/deep
   ```
   Expected: `{"ok":true,"db":{"connected":true}}`

### Phase 5: Performance Testing

#### Test 13: Page Load Performance

1. **Open Chrome DevTools**
2. **Go to Lighthouse tab**
3. **Run audit on:**
   - [ ] Home page (/)
   - [ ] Find Runners (/find-runners)
   - [ ] Job Detail (/jobs/1)

4. **Target scores:**
   - Performance: > 90
   - Accessibility: > 95
   - Best Practices: > 90
   - SEO: > 90

#### Test 14: Bundle Size

1. **Build production bundle:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Check bundle size:**
   ```bash
   ls -lh dist/assets/
   ```

3. **Verify:**
   - [ ] Main JS bundle < 500KB
   - [ ] CSS bundle < 50KB
   - [ ] No duplicate dependencies

## Common Issues & Solutions

### Issue: Database connection fails

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL in backend/.env
# Format: postgresql://user:password@localhost:5432/errandbit

# Test connection manually
psql $DATABASE_URL -c "SELECT 1"
```

### Issue: PostGIS extension missing

**Solution:**
```sql
-- Connect to database
psql errandbit

-- Install PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify
SELECT PostGIS_version();
```

### Issue: Frontend won't start

**Solution:**
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Check for port conflicts
netstat -ano | findstr :5173

# Kill process if needed
taskkill /PID <process_id> /F
```

### Issue: WebLN simulation not working

**Solution:**
```javascript
// Clear existing simulation
clearFediSimulation();

// Reload page
location.reload();

// Re-enable simulation
simulateFedi();
location.reload();
```

## Test Results Documentation

### Test Report Template

```
ErrandBit Test Report
Date: [DATE]
Tester: [NAME]
Environment: Local Development

Phase 1: Basic Functionality
- Home Page: [PASS/FAIL]
- Find Runners: [PASS/FAIL]
- My Jobs: [PASS/FAIL]
- Profile: [PASS/FAIL]

Phase 2: Fedi Simulation
- WebLN Simulation: [PASS/FAIL]
- Job Payment Flow: [PASS/FAIL]
- Nostr Identity: [PASS/FAIL]
- Full Fedi Environment: [PASS/FAIL]

Phase 3: Error Handling
- Payment Errors: [PASS/FAIL]
- Network Errors: [PASS/FAIL]

Phase 4: Database
- Database Connection: [PASS/FAIL]
- Health Checks: [PASS/FAIL]

Phase 5: Performance
- Page Load Performance: [SCORE]
- Bundle Size: [SIZE]

Issues Found:
1. [Description]
2. [Description]

Notes:
[Additional observations]
```

## Next Steps After Testing

Once all tests pass:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "test: verified all features working locally"
   git push origin main
   ```

2. **Prepare for staging:**
   - Review IMPLEMENTATION_COMPLETE.md
   - Follow deployment checklist
   - Set up staging environment

3. **Beta testing:**
   - Deploy to staging
   - Test in real Fedi app
   - Invite beta testers

## Automated Testing (Future)

### Unit Tests (Planned)
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### E2E Tests (Planned)
```bash
# Playwright tests
npm run test:e2e
```

## Support

If you encounter issues:
- Check console for errors
- Review backend logs
- Verify database connection
- Check TROUBLESHOOTING.md
- Open GitHub issue

---

**Testing Status:** Ready for local testing
**Last Updated:** October 30, 2025
