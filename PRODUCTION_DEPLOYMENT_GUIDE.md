# 🚀 ErrandBit Production Deployment Guide

## Overview
This guide covers deploying ErrandBit with full Lightning Network payment integration to production.

---

## 📋 Pre-Deployment Checklist

### 1. Infrastructure Requirements
- [ ] PostgreSQL 14+ database with SSL enabled
- [ ] Node.js 18+ runtime
- [ ] Nginx reverse proxy with SSL/TLS certificates
- [ ] LNBits instance (self-hosted or managed)
- [ ] Domain with DNS configured
- [ ] Email service for alerts (SendGrid, AWS SES, or SMTP)
- [ ] Server with minimum 2GB RAM, 2 CPU cores

### 2. Lightning Network Setup
- [ ] LNBits wallet created and funded (if needed)
- [ ] LNBits API keys generated (Invoice/Read and Admin/Write)
- [ ] Webhook URL registered in LNBits
- [ ] Webhook secret generated (64-character hex string)
- [ ] Test payments verified on testnet/mainnet

### 3. Environment Configuration
- [ ] All `.env` variables configured for production
- [ ] Database connection string with SSL mode
- [ ] JWT secret generated (minimum 32 characters)
- [ ] CORS origins set to production domains
- [ ] API URL set to production backend URL

### 4. Security Hardening
- [ ] SSL certificates installed (Let's Encrypt recommended)
- [ ] Firewall configured (only ports 80, 443 open)
- [ ] Database credentials rotated
- [ ] Webhook signature validation enabled
- [ ] Rate limiting configured
- [ ] Security headers enabled in Nginx

### 5. Code Deployment
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] No critical linter errors
- [ ] Git repository tagged with version
- [ ] Environment-specific configs verified

---

## 🔧 Step-by-Step Deployment

### Step 1: LNBits Configuration

#### Option A: Using Legend.lnbits.com (Managed)
```bash
# 1. Create account at https://legend.lnbits.com
# 2. Create a new wallet
# 3. Go to Settings > API Keys
# 4. Copy "Invoice/read key" → LNBITS_API_KEY
# 5. Copy "Admin key" → LNBITS_ADMIN_KEY
```

#### Option B: Self-Hosted LNBits
```bash
# Install LNBits (requires LND, CLN, or other Lightning backend)
git clone https://github.com/lnbits/lnbits.git
cd lnbits
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure funding source (e.g., LND)
export LNBITS_BACKEND_WALLET_CLASS=LndWallet
export LND_REST_ENDPOINT=https://localhost:8080/
export LND_MACAROON=<admin.macaroon hex>

# Start LNBits
uvicorn lnbits.__main__:app --host 0.0.0.0 --port 5000
```

### Step 2: Generate Secrets

```bash
# Generate webhook secret (64-char hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 3: Configure Environment Variables

Create `/var/www/errandbit/backend/.env`:

```bash
# Server Configuration
NODE_ENV=production
PORT=4000
API_URL=https://api.errandbit.com

# Database (use SSL in production)
DATABASE_URL=postgresql://errandbit_user:STRONG_PASSWORD@localhost:5432/errandbit_prod?sslmode=require

# Authentication
JWT_SECRET=YOUR_GENERATED_JWT_SECRET_HERE
JWT_EXPIRES_IN=7d

# CORS (your frontend domains)
ALLOWED_ORIGINS=https://errandbit.com,https://www.errandbit.com

# Lightning Network (LNBits)
LNBITS_URL=https://legend.lnbits.com
LNBITS_API_KEY=YOUR_LNBITS_INVOICE_READ_KEY
LNBITS_ADMIN_KEY=YOUR_LNBITS_ADMIN_KEY
LNBITS_WEBHOOK_SECRET=YOUR_GENERATED_WEBHOOK_SECRET

# Payment Configuration
PLATFORM_FEE_PERCENT=0
BTC_PRICE_FALLBACK=45000
PAYMENT_INVOICE_EXPIRY_HOURS=1

# Monitoring
ENABLE_PAYMENT_MONITORING=true
STUCK_PAYMENT_THRESHOLD_HOURS=2
LIGHTNING_HEALTH_CHECK_INTERVAL_MINUTES=5

# Email Alerts (SendGrid example)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=YOUR_SENDGRID_API_KEY
ALERT_EMAIL_FROM=alerts@errandbit.com
ALERT_EMAIL_TO=admin@errandbit.com
```

### Step 4: Database Setup

```bash
# Create production database
sudo -u postgres psql
CREATE DATABASE errandbit_prod;
CREATE USER errandbit_user WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE errandbit_prod TO errandbit_user;
\q

# Run migrations
cd /var/www/errandbit/backend
npm run migrate

# Verify schema
npm run verify-db
```

### Step 5: Build and Deploy Backend

```bash
# Clone repository
cd /var/www/errandbit
git clone https://github.com/YOUR_ORG/errandbit.git .

# Install dependencies
cd backend
npm ci --production

# Build TypeScript
npm run build

# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name errandbit-api

# Save PM2 config
pm2 save
pm2 startup

# Check status
pm2 status
pm2 logs errandbit-api
```

### Step 6: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/errandbit-api`:

```nginx
upstream errandbit_backend {
    server 127.0.0.1:4000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.errandbit.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS API Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.errandbit.com;

    # SSL certificates (use certbot for Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.errandbit.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.errandbit.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://errandbit_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Webhook endpoint (no rate limit)
    location /api/v1/payments/webhook {
        proxy_pass http://errandbit_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://errandbit_backend;
    }
}
```

Enable site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/errandbit-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Install SSL Certificate

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d api.errandbit.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Step 8: Deploy Frontend

```bash
cd /var/www/errandbit/frontend

# Set production API URL
echo "VITE_API_URL=https://api.errandbit.com" > .env.production

# Build
npm ci
npm run build

# Copy to web root
sudo cp -r dist/* /var/www/html/errandbit/

# Configure Nginx for frontend (see separate config)
```

### Step 9: Register Webhook with LNBits

```bash
# In LNBits dashboard:
# 1. Go to Extensions > Webhooks
# 2. Add webhook URL: https://api.errandbit.com/api/v1/payments/webhook
# 3. Add custom header: x-webhook-signature: <will be generated automatically>
# 4. Select events: payment_received

# Or via API:
curl -X POST https://legend.lnbits.com/api/v1/webhooks \
  -H "X-Api-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.errandbit.com/api/v1/payments/webhook",
    "type": "payment",
    "events": ["payment_received"]
  }'
```

### Step 10: Enable Monitoring

The monitoring service starts automatically when the server starts. Verify it's running:

```bash
# Check logs
pm2 logs errandbit-api | grep "monitoring"

# Should see:
# "🚀 Starting payment monitoring (interval: 5min)"
# "🚀 Starting expired invoice cleanup job (hourly)"
```

Access monitoring dashboard:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.errandbit.com/api/v1/monitoring/dashboard
```

### Step 11: Verify Deployment

```bash
# 1. Test API health
curl https://api.errandbit.com/health

# 2. Test Lightning connection
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.errandbit.com/api/v1/monitoring/lightning/health

# 3. Create test invoice (small amount)
curl -X POST https://api.errandbit.com/api/v1/payments/create-invoice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"job_id": "test-job-1", "amount_usd": 0.10}'

# 4. Pay test invoice with Lightning wallet
# 5. Verify payment confirmation via webhook

# 6. Check monitoring metrics
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.errandbit.com/api/v1/monitoring/payments
```

---

## 🔍 Post-Deployment Monitoring

### Key Metrics to Track

1. **Payment Success Rate**: Should be >95%
2. **Average Payment Time**: Should be <30 seconds
3. **Stuck Payments**: Should be 0
4. **Lightning Node Connection**: Should be healthy
5. **API Response Time**: Should be <500ms (p95)
6. **Error Rate**: Should be <1%

### Log Monitoring

```bash
# Watch API logs
pm2 logs errandbit-api --lines 100

# Watch for errors
pm2 logs errandbit-api --err

# Watch Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Watch Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Health

```bash
# Check connection pool
sudo -u postgres psql errandbit_prod
SELECT count(*) FROM pg_stat_activity WHERE datname='errandbit_prod';

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🚨 Troubleshooting

### Payment Not Confirming

1. Check webhook logs: `pm2 logs | grep webhook`
2. Verify webhook signature validation
3. Check LNBits webhook configuration
4. Test webhook manually:
   ```bash
   curl -X POST https://api.errandbit.com/api/v1/payments/webhook \
     -H "x-webhook-signature: $(node -e "console.log(require('crypto').createHmac('sha256', 'YOUR_SECRET').update(Date.now() + JSON.stringify({payment_hash: 'test'})).digest('hex'))")" \
     -H "x-webhook-timestamp: $(date +%s)000" \
     -H "Content-Type: application/json" \
     -d '{"payment_hash": "test123"}'
   ```

### Lightning Connection Failed

1. Check LNBits API keys
2. Verify LNBits is accessible: `curl https://legend.lnbits.com/api/v1/wallet -H "X-Api-Key: YOUR_KEY"`
3. Check firewall rules
4. Verify SSL certificates

### High Memory Usage

```bash
# Restart PM2
pm2 restart errandbit-api

# Check memory
pm2 monit

# Adjust PM2 memory limit
pm2 start dist/server.js --name errandbit-api --max-memory-restart 1G
```

---

## 🔄 Rollback Procedure

If deployment fails:

```bash
# 1. Stop current version
pm2 stop errandbit-api

# 2. Checkout previous version
git checkout <previous-tag>

# 3. Rebuild
npm run build

# 4. Restart
pm2 restart errandbit-api

# 5. Verify
curl https://api.errandbit.com/health
```

---

## 📊 Performance Optimization

### Database Indexing

```sql
-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;

-- Add indexes if needed
CREATE INDEX CONCURRENTLY idx_payments_status_created 
ON lightning_transactions(status, created_at);
```

### Connection Pooling

Update database connection in `db.ts`:
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### PM2 Cluster Mode

```bash
# Run multiple instances
pm2 start dist/server.js --name errandbit-api -i max

# Or specific number
pm2 start dist/server.js --name errandbit-api -i 4
```

---

## ✅ Production Checklist Verification

Run this final checklist before going live:

```bash
# 1. Environment variables loaded
[ -f .env ] && echo "✅ .env exists" || echo "❌ .env missing"

# 2. Database accessible
psql $DATABASE_URL -c "SELECT 1" && echo "✅ Database connected"

# 3. Lightning connection works
curl -H "X-Api-Key: $LNBITS_API_KEY" $LNBITS_URL/api/v1/wallet && echo "✅ LNBits connected"

# 4. All tests passing
npm test && echo "✅ Tests passed"

# 5. Build successful
npm run build && echo "✅ Build successful"

# 6. Server starts
pm2 start dist/server.js --name test-run && sleep 5 && pm2 delete test-run && echo "✅ Server starts"

# 7. Monitoring enabled
grep "ENABLE_PAYMENT_MONITORING=true" .env && echo "✅ Monitoring enabled"

# 8. SSL certificate valid
openssl s_client -connect api.errandbit.com:443 -servername api.errandbit.com < /dev/null 2>/dev/null | grep "Verify return code: 0" && echo "✅ SSL valid"
```

---

## 📞 Support

For deployment issues:
- Check logs: `pm2 logs`
- Check database: `npm run verify-db`
- Review monitoring: `curl /api/v1/monitoring/dashboard`
- Contact: admin@errandbit.com

---

**Deployment completed successfully! 🎉**

Monitor the system for 24-48 hours to ensure stability. Set up alerts for critical metrics.
