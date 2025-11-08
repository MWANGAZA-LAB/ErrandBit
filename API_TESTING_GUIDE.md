# 🧪 ErrandBit API Testing Guide

**Date:** November 9, 2025  
**API Base URL:** `http://localhost:4000`  
**Status:** Ready for Testing

---

## 📋 Overview

This guide provides comprehensive instructions for testing all 34 API endpoints in the ErrandBit backend.

---

## 🚀 Quick Start

### 1. **Start the Server**
```bash
cd backend
npm run dev
```

Server should start on `http://localhost:4000`

### 2. **Seed Test Data**
```bash
cd backend
npm run seed
```

This creates:
- 5 test users (alice_client, bob_runner, charlie_both, diana_runner, eve_client)
- 3 runner profiles
- 5 jobs (various statuses)
- 3 payments
- 2 reviews

### 3. **Run API Tests**
Open `backend/tests/api-tests.http` in VS Code with REST Client extension installed.

---

## 👥 Test Users

All users have password: `password123`

| Username | Role | Email | Use Case |
|----------|------|-------|----------|
| alice_client | client | alice@example.com | Creating jobs |
| bob_runner | runner | bob@example.com | Accepting & completing jobs |
| charlie_both | client | charlie@example.com | Both client & runner |
| diana_runner | runner | diana@example.com | Runner operations |
| eve_client | client | eve@example.com | Creating jobs & reviews |

---

## 🔐 Authentication Flow

### Step 1: Login
```http
POST http://localhost:4000/auth-simple/login
Content-Type: application/json

{
  "username": "alice_client",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "alice_client",
    "email": "alice@example.com",
    "role": "client"
  }
}
```

### Step 2: Use Token
Add to all subsequent requests:
```http
Authorization: Bearer <your_token_here>
```

---

## 📝 API Endpoints Testing

### **Jobs API** (11 endpoints)

#### 1. Create Job
```http
POST /api/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Grocery Shopping",
  "description": "Pick up groceries from Whole Foods",
  "priceCents": 2500,
  "location": {
    "lat": 40.7128,
    "lng": -74.0060,
    "address": "123 Main St, New York, NY"
  },
  "deadline": "2025-11-10T18:00:00Z"
}
```

**Expected:** 201 Created with job object

#### 2. Get All Jobs
```http
GET /api/jobs?limit=20&offset=0
Authorization: Bearer <token>
```

**Expected:** 200 OK with array of jobs

#### 3. Get Job by ID
```http
GET /api/jobs/1
Authorization: Bearer <token>
```

**Expected:** 200 OK with job object

#### 4. Search Jobs
```http
GET /api/jobs/search?lat=40.7128&lng=-74.0060&radiusKm=10&status=open
Authorization: Bearer <token>
```

**Expected:** 200 OK with filtered jobs

#### 5. Get My Jobs
```http
GET /api/jobs/my-jobs
Authorization: Bearer <token>
```

**Expected:** 200 OK with user's created jobs

#### 6. Get Assigned Jobs
```http
GET /api/jobs/assigned
Authorization: Bearer <token>
```

**Expected:** 200 OK with jobs assigned to runner

#### 7. Update Job
```http
PATCH /api/jobs/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "priceCents": 3000
}
```

**Expected:** 200 OK with updated job

#### 8. Assign Runner
```http
POST /api/jobs/1/assign
Authorization: Bearer <token>
```

**Expected:** 200 OK, job status changes to 'assigned'

#### 9. Complete Job
```http
POST /api/jobs/2/complete
Authorization: Bearer <token>
```

**Expected:** 200 OK, job status changes to 'completed'

#### 10. Cancel Job
```http
POST /api/jobs/1/cancel
Authorization: Bearer <token>
```

**Expected:** 200 OK, job status changes to 'cancelled'

#### 11. Delete Job
```http
DELETE /api/jobs/1
Authorization: Bearer <token>
```

**Expected:** 200 OK, job deleted

---

### **Runners API** (8 endpoints)

#### 1. Create Runner Profile
```http
POST /api/runners
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Experienced delivery runner",
  "hourlyRate": 25,
  "serviceRadius": 15,
  "tags": ["delivery", "shopping"],
  "location": {
    "lat": 40.7128,
    "lng": -74.0060,
    "address": "New York, NY"
  },
  "available": true
}
```

**Expected:** 201 Created with runner profile

#### 2. Get All Runners
```http
GET /api/runners?limit=20&offset=0
Authorization: Bearer <token>
```

**Expected:** 200 OK with array of runners

#### 3. Get Runner by ID
```http
GET /api/runners/1
Authorization: Bearer <token>
```

**Expected:** 200 OK with runner profile

#### 4. Get My Runner Profile
```http
GET /api/runners/me
Authorization: Bearer <token>
```

**Expected:** 200 OK with current user's runner profile

#### 5. Search Runners
```http
GET /api/runners/search?tags=delivery&minRating=4&lat=40.7128&lng=-74.0060&radius=10
Authorization: Bearer <token>
```

**Expected:** 200 OK with filtered runners

#### 6. Update Runner Profile
```http
PATCH /api/runners/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Updated bio",
  "hourlyRate": 30
}
```

**Expected:** 200 OK with updated profile

#### 7. Update Runner Stats
```http
PATCH /api/runners/1/stats
Authorization: Bearer <token>
Content-Type: application/json

{
  "avgRating": 4.8,
  "totalJobs": 25,
  "completionRate": 95.5
}
```

**Expected:** 200 OK

#### 8. Delete Runner Profile
```http
DELETE /api/runners/1
Authorization: Bearer <token>
```

**Expected:** 200 OK

---

### **Payments API** (7 endpoints)

#### 1. Create Payment
```http
POST /api/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobId": 1,
  "amountSats": 20000
}
```

**Expected:** 201 Created with payment and Lightning invoice

#### 2. Get All Payments
```http
GET /api/payments?limit=20&offset=0
Authorization: Bearer <token>
```

**Expected:** 200 OK with array of payments

#### 3. Get Payment by ID
```http
GET /api/payments/1
Authorization: Bearer <token>
```

**Expected:** 200 OK with payment object

#### 4. Get Payment by Job ID
```http
GET /api/payments/job/1
Authorization: Bearer <token>
```

**Expected:** 200 OK with payment for job

#### 5. Get Payment by Hash
```http
GET /api/payments/hash/hash_abc123
Authorization: Bearer <token>
```

**Expected:** 200 OK with payment object

#### 6. Confirm Payment
```http
POST /api/payments/1/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "preimage": "preimage_xyz789"
}
```

**Expected:** 200 OK, payment status changes to 'confirmed'

#### 7. Get Payment Stats
```http
GET /api/payments/stats
Authorization: Bearer <token>
```

**Expected:** 200 OK with payment statistics

---

### **Reviews API** (8 endpoints)

#### 1. Create Review
```http
POST /api/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobId": 3,
  "rating": 5,
  "comment": "Excellent service!"
}
```

**Expected:** 201 Created with review object

#### 2. Get Review by ID
```http
GET /api/reviews/1
Authorization: Bearer <token>
```

**Expected:** 200 OK with review object

#### 3. Get Review by Job ID
```http
GET /api/reviews/job/3
Authorization: Bearer <token>
```

**Expected:** 200 OK with review for job

#### 4. Get Reviews for Runner
```http
GET /api/reviews/runner/2?limit=10&offset=0
Authorization: Bearer <token>
```

**Expected:** 200 OK with runner's reviews

#### 5. Get Reviews by Reviewer
```http
GET /api/reviews/reviewer/1?limit=10&offset=0
Authorization: Bearer <token>
```

**Expected:** 200 OK with reviewer's reviews

#### 6. Get Runner Rating Stats
```http
GET /api/reviews/runner/2/stats
Authorization: Bearer <token>
```

**Expected:** 200 OK with rating statistics

#### 7. Update Review
```http
PATCH /api/reviews/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 4,
  "comment": "Updated comment"
}
```

**Expected:** 200 OK with updated review

#### 8. Delete Review
```http
DELETE /api/reviews/1
Authorization: Bearer <token>
```

**Expected:** 200 OK

---

## ✅ Testing Checklist

### Authentication
- [ ] Register new user
- [ ] Login with credentials
- [ ] Get current user profile
- [ ] Token works in Authorization header

### Jobs
- [ ] Create job
- [ ] Get all jobs
- [ ] Get job by ID
- [ ] Search jobs by location
- [ ] Get my jobs
- [ ] Get assigned jobs
- [ ] Update job
- [ ] Assign runner to job
- [ ] Complete job
- [ ] Cancel job
- [ ] Delete job

### Runners
- [ ] Create runner profile
- [ ] Get all runners
- [ ] Get runner by ID
- [ ] Get my runner profile
- [ ] Search runners
- [ ] Update runner profile
- [ ] Update runner stats
- [ ] Delete runner profile

### Payments
- [ ] Create payment
- [ ] Get all payments
- [ ] Get payment by ID
- [ ] Get payment by job ID
- [ ] Get payment by hash
- [ ] Confirm payment
- [ ] Get payment statistics

### Reviews
- [ ] Create review
- [ ] Get review by ID
- [ ] Get review by job ID
- [ ] Get reviews for runner
- [ ] Get reviews by reviewer
- [ ] Get runner rating stats
- [ ] Update review
- [ ] Delete review

---

## 🐛 Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution:** Make sure you're logged in and using a valid token in the Authorization header.

### Issue: 404 Not Found
**Solution:** Check that the resource ID exists. Run seed script to create test data.

### Issue: 400 Bad Request
**Solution:** Check request body format. Ensure all required fields are present.

### Issue: 403 Forbidden
**Solution:** You don't have permission. E.g., trying to update someone else's job.

### Issue: 500 Internal Server Error
**Solution:** Check server logs. May be a database connection issue.

---

## 📊 Expected Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

---

## 🔍 Testing Tools

### Recommended Tools:
1. **REST Client** (VS Code extension) - Use `api-tests.http` file
2. **Postman** - Import requests manually
3. **curl** - Command line testing
4. **Thunder Client** (VS Code extension) - Alternative to REST Client

### Example curl Command:
```bash
# Login
curl -X POST http://localhost:4000/auth-simple/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice_client","password":"password123"}'

# Create Job
curl -X POST http://localhost:4000/api/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Job","description":"Test","priceCents":1000,"location":{"lat":40.7128,"lng":-74.0060}}'
```

---

## 📈 Test Coverage

- **Total Endpoints:** 34
- **Authentication:** Required on all endpoints
- **Rate Limiting:** Enabled
- **Error Handling:** Comprehensive
- **Validation:** Input validation on all endpoints

---

**Happy Testing!** 🎉

For issues or questions, check the server logs or Phase 5 documentation.
