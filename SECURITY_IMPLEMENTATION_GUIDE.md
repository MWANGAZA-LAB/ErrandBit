# Security Implementation Guide

This guide provides step-by-step instructions to implement all security fixes identified in the security audit.

---

## Phase 1: Critical Fixes (Immediate)

### 1. Fix Authentication Bypass

**Status**: COMPLETED

The frontend authentication bypass has been fixed in `frontend/src/contexts/AuthContext.tsx`.

### 2. Secure JWT Secret Handling

**Status**: COMPLETED

The JWT utility now enforces strong secrets in `backend/src/utils/jwt.ts`.

**Action Required**:
```bash
# Generate a secure JWT secret
openssl rand -base64 64

# Add to .env file
echo "JWT_SECRET=<generated-secret>" >> .env
echo "JWT_REFRESH_SECRET=<another-generated-secret>" >> .env
```

### 3. Replace Open Access Middleware

**Current File**: `backend/src/middleware/auth.ts` (insecure)  
**Secure Implementation**: `backend/src/middleware/auth.secure.ts` (created)

**Steps**:

1. Backup current auth middleware:
```bash
mv backend/src/middleware/auth.ts backend/src/middleware/auth.ts.backup
```

2. Rename secure implementation:
```bash
mv backend/src/middleware/auth.secure.ts backend/src/middleware/auth.ts
```

3. Update database schema to add required fields:
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_active_banned 
ON users(is_active, is_banned);
```

4. Test authentication:
```bash
# Start server
npm run dev

# Test protected endpoint
curl http://localhost:4000/api/jobs \
  -H "Authorization: Bearer <your-token>"
```

---

## Phase 2: High Priority Fixes

### 1. Add CSRF Protection

**Install Dependencies**:
```bash
cd backend
npm install csurf cookie-parser
npm install --save-dev @types/cookie-parser
```

**Implementation** (`backend/src/server.ts`):
```typescript
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

// Add before routes
app.use(cookieParser());

// Configure CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000
  }
});

// Apply to state-changing routes
app.use('/api/', csrfProtection);

// Provide CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**Frontend Integration**:
```typescript
// Fetch CSRF token on app load
const { csrfToken } = await fetch('/api/csrf-token').then(r => r.json());

// Include in all POST/PUT/DELETE requests
fetch('/api/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify(data)
});
```

### 2. Implement Rate Limiting

**Install Dependencies**:
```bash
npm install express-rate-limit
```

**Implementation** (`backend/src/server.ts`):
```typescript
import rateLimit from 'express-rate-limit';

// Global API rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please slow down',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Strict rate limiter for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts'
});

// Apply rate limiters
app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);
```

### 3. Add Security Headers

**Install Dependencies**:
```bash
npm install helmet
```

**Implementation** (`backend/src/server.ts`):
```typescript
import helmet from 'helmet';

// Configure security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 4. Implement Input Validation

**Install Dependencies**:
```bash
npm install joi
npm install --save-dev @types/joi
```

**Create Validation Schemas** (`backend/src/validators/job.validator.ts`):
```typescript
import Joi from 'joi';

export const createJobSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(200)
    .required()
    .trim()
    .pattern(/^[a-zA-Z0-9\s\-.,!?]+$/)
    .messages({
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title cannot exceed 200 characters',
      'string.pattern.base': 'Title contains invalid characters'
    }),
  
  description: Joi.string()
    .min(10)
    .max(5000)
    .required()
    .trim(),
  
  priceCents: Joi.number()
    .integer()
    .min(100)
    .max(10000000)
    .required(),
  
  location: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    address: Joi.string().max(500).required()
  }).required()
});
```

**Create Validation Middleware** (`backend/src/middleware/validate.ts`):
```typescript
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
      return;
    }
    
    req.body = value;
    next();
  };
}
```

**Apply Validation**:
```typescript
import { validate } from './middleware/validate';
import { createJobSchema } from './validators/job.validator';

app.post('/api/jobs', 
  authenticate, 
  validate(createJobSchema), 
  async (req, res) => {
    // req.body is now validated and sanitized
  }
);
```

### 5. Implement Centralized Error Handling

**Create Error Classes** (`backend/src/errors/AppError.ts`):
```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
  }
}
```

**Create Error Handler** (`backend/src/middleware/errorHandler.ts`):
```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log full error details internally
  console.error('Error occurred:', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  
  // Determine if error is operational
  const isOperational = err instanceof AppError && err.isOperational;
  
  if (isOperational) {
    // Send safe error message for operational errors
    res.status((err as AppError).statusCode).json({
      error: err.message,
      timestamp: new Date().toISOString()
    });
  } else {
    // For programming errors, send generic message
    res.status(500).json({
      error: 'An unexpected error occurred',
      message: 'Please try again later or contact support',
      timestamp: new Date().toISOString()
    });
  }
}
```

**Apply Error Handler** (`backend/src/server.ts`):
```typescript
import { errorHandler } from './middleware/errorHandler';

// Apply after all routes
app.use(errorHandler);
```

---

## Phase 3: Medium Priority Fixes

### 1. Add Request Size Limits

```typescript
import express from 'express';

app.use(express.json({
  limit: '10kb',
  strict: true
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10kb',
  parameterLimit: 100
}));
```

### 2. Implement Security Logging

**Install Dependencies**:
```bash
npm install winston
```

**Configure Logger** (`backend/src/utils/logger.ts`):
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 10
    })
  ]
});

export function logSecurityEvent(
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, any>
) {
  logger.warn('Security Event', {
    eventType,
    severity,
    timestamp: new Date().toISOString(),
    ...details
  });
}
```

### 3. Configure CORS Properly

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 600
}));
```

---

## Testing Security Fixes

### 1. Test Authentication

```bash
# Test without token (should fail)
curl http://localhost:4000/api/jobs

# Test with invalid token (should fail)
curl http://localhost:4000/api/jobs \
  -H "Authorization: Bearer invalid-token"

# Test with valid token (should succeed)
curl http://localhost:4000/api/jobs \
  -H "Authorization: Bearer <valid-token>"
```

### 2. Test Rate Limiting

```bash
# Send multiple requests quickly
for i in {1..10}; do
  curl http://localhost:4000/api/auth/login \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"phone": "+1234567890"}'
done
```

### 3. Test Input Validation

```bash
# Test with invalid data
curl http://localhost:4000/api/jobs \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title": "ab", "priceCents": -100}'
```

### 4. Security Scanning

```bash
# Run npm audit
npm audit

# Run Snyk scan
npx snyk test

# Run ESLint security plugin
npx eslint . --ext .ts,.tsx
```

---

## Production Deployment Checklist

- [ ] All environment variables set
- [ ] JWT secrets are strong (64+ characters)
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] CSRF protection enabled
- [ ] Input validation on all endpoints
- [ ] Error handling sanitized
- [ ] Logging configured
- [ ] Database backups enabled
- [ ] Monitoring and alerting set up
- [ ] Security audit passed
- [ ] Penetration testing completed

---

## Monitoring and Maintenance

### Regular Tasks

**Daily**:
- Review security logs
- Check for suspicious activity
- Monitor rate limit violations

**Weekly**:
- Review authentication failures
- Check for new vulnerabilities
- Update dependencies

**Monthly**:
- Rotate JWT secrets
- Security audit
- Penetration testing
- Review access controls

**Quarterly**:
- Full security assessment
- Update security policies
- Security training

---

## Emergency Response

### Security Incident Response Plan

1. **Detect**: Monitor logs and alerts
2. **Contain**: Block malicious IPs, revoke compromised tokens
3. **Investigate**: Analyze logs, identify breach scope
4. **Remediate**: Fix vulnerabilities, patch systems
5. **Recover**: Restore services, verify security
6. **Learn**: Document incident, update procedures

### Emergency Contacts

- Security Team: security@errandbit.com
- On-Call Engineer: oncall@errandbit.com
- Management: management@errandbit.com

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-09
