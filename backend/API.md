# ErrandBit API Documentation

Base URL: `http://localhost:4000`

## Health & Status

### GET /health
Basic health check
```json
{ "ok": true, "service": "errandbit-api", "timestamp": "..." }
```

### GET /health/deep
Deep health check with DB connectivity
```json
{
  "ok": true,
  "service": "errandbit-api",
  "timestamp": "...",
  "db": { "connected": true, "ok": true }
}
```

## Authentication & Verification

### POST /auth/phone/start
Start phone verification
```json
Request: { "phone": "+1234567890" }
Response: { "ok": true, "expires_in": 300 }
```

### POST /auth/phone/verify
Verify phone code
```json
Request: { "phone": "+1234567890", "code": "123456" }
Response: { "ok": true, "token": "jwt_token", "user": {...} }
```

### GET /me
Get current user profile (requires auth)
```json
Response: { "id": 1, "role": "runner", "phone": "...", ... }
```

## Runners

### GET /runners/:id
Get runner profile by ID
```json
Response: {
  "id": 1,
  "user_id": 5,
  "display_name": "John Doe",
  "bio": "...",
  "lightning_address": "john@getalby.com",
  "hourly_rate_cents": 2500,
  "tags": ["delivery", "tech-help"],
  "location": { "lat": 30.2672, "lng": -97.7431 },
  "completion_rate": 95.5,
  "avg_rating": 4.8,
  "total_jobs": 42
}
```

### POST /runners
Create runner profile (requires auth)
```json
Request: {
  "display_name": "Jane Smith",
  "bio": "Fast and reliable",
  "lightning_address": "jane@wallet.com",
  "hourly_rate_cents": 3000,
  "tags": ["shopping", "delivery"],
  "location": { "lat": 30.2672, "lng": -97.7431 }
}
Response: { "ok": true, "runner": {...} }
```

### PATCH /runners/:id
Update runner profile (requires auth)
```json
Request: { "bio": "Updated bio", "tags": ["new-tag"] }
Response: { "ok": true, "runner": {...} }
```

### GET /runners?lat=...&lng=...&radius_km=5&tags[]=delivery
Search runners by location and tags
```json
Response: {
  "results": [
    {
      "id": 1,
      "display_name": "...",
      "distance_km": 1.2,
      "avg_rating": 4.8,
      "completion_rate": 95,
      "tags": [...]
    }
  ],
  "total": 10
}
```

## Jobs

### POST /jobs
Create a job (requires auth, client)
```json
Request: {
  "title": "Grocery pickup",
  "description": "Pick up items from Whole Foods",
  "category": "shopping",
  "price_cents": 1500,
  "client_location": { "lat": 30.2672, "lng": -97.7431 },
  "target_location": { "lat": 30.2700, "lng": -97.7500 }
}
Response: { "ok": true, "job": { "id": 123, ... } }
```

### GET /jobs/:id
Get job details
```json
Response: {
  "id": 123,
  "title": "...",
  "status": "requested",
  "client_id": 5,
  "runner_id": null,
  "price_cents": 1500,
  ...
}
```

### POST /jobs/:id/accept
Runner accepts job (requires auth, runner)
```json
Response: { "ok": true, "job": { "id": 123, "status": "accepted" } }
```

### POST /jobs/:id/decline
Runner declines job
```json
Response: { "ok": true, "job": { "id": 123, "status": "declined" } }
```

### POST /jobs/:id/start
Runner starts job
```json
Response: { "ok": true, "job": { "id": 123, "status": "in_progress" } }
```

### POST /jobs/:id/ready-for-payment
Runner marks job ready for payment
```json
Response: { "ok": true, "job": { "id": 123, "status": "awaiting_payment" } }
```

### POST /jobs/:id/mark-paid
Client marks payment sent
```json
Response: { "ok": true, "job": { "id": 123, "paid_by": "client" } }
```

### POST /jobs/:id/confirm-received
Runner confirms payment received
```json
Response: { "ok": true, "job": { "id": 123, "received_confirmed_by": "runner" } }
```

### POST /jobs/:id/complete
Complete job
```json
Response: { "ok": true, "job": { "id": 123, "status": "completed" } }
```

### POST /jobs/:id/review
Submit review for completed job
```json
Request: { "rating": 5, "comment": "Great service!" }
Response: { "ok": true, "review": {...} }
```

## Messages

### GET /messages/job/:jobId
Get messages for a job
```json
Response: {
  "jobId": 123,
  "messages": [
    {
      "id": 1,
      "sender_id": 5,
      "content": "On my way!",
      "created_at": "..."
    }
  ]
}
```

### POST /messages/job/:jobId
Send message to job chat
```json
Request: {
  "content": "I'm here",
  "media_url": "https://...",
  "ln_invoice": "lnbc..."
}
Response: { "ok": true, "message": {...} }
```

## Payments

### GET /payments/instruction?job_id=123
Get payment instruction for a job
```json
Response: {
  "job_id": 123,
  "amount_sats": 1000,
  "fiat_equiv_usd": 0.50,
  "runner": {
    "lightning_address": "runner@wallet.com"
  }
}
```

### POST /payments/validate-invoice
Validate a Lightning invoice
```json
Request: { "job_id": 123, "bolt11": "lnbc..." }
Response: {
  "job_id": 123,
  "is_valid": true,
  "amount_ok": true,
  "expires_at": "..."
}
```

### POST /payments/confirm
Confirm payment
```json
Request: { "job_id": 123, "by": "client" }
Response: { "ok": true, "job_id": 123, "confirmed_by": "client" }
```

## Trust & Tiers

### GET /trust/me
Get current user's trust tier
```json
Response: {
  "tier": "established",
  "score_cache": 150,
  "job_cap_cents": 20000
}
```

## Subscriptions & Boosts

### POST /runner/subscriptions/activate
Activate Pro subscription (requires auth, runner)
```json
Request: { "plan": "pro", "payment_proof": "..." }
Response: { "ok": true, "subscription": {...} }
```

### POST /runner/boosts/purchase
Purchase visibility boost (requires auth, runner)
```json
Request: { "category": "delivery", "duration_hours": 24, "sats_paid": 10000 }
Response: { "ok": true, "boost": {...} }
```

## Disputes

### POST /jobs/:id/dispute
Open a dispute for a job
```json
Request: { "reason": "...", "evidence_urls": ["..."] }
Response: { "ok": true, "dispute": {...} }
```

### GET /disputes/:id
Get dispute details (requires auth, admin or involved party)
```json
Response: {
  "id": 1,
  "job_id": 123,
  "status": "open",
  "evidence_urls": [...],
  ...
}
```

## WebSocket Events (Future)

Connect to `ws://localhost:4000` with auth token

### Events
- `job:123` - Job-specific room for real-time updates
- `message:new` - New message in job chat
- `job:status_changed` - Job status update
- `payment:confirmed` - Payment confirmation
