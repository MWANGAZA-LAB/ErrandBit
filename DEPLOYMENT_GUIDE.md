# ErrandBit - Comprehensive Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

---

## Overview

ErrandBit is a full-stack application with:
- **Backend**: Node.js/TypeScript API (Port 4000)
- **Frontend**: React/Vite SPA (Port 8080)
- **Database**: PostgreSQL with PostGIS (Port 5432)
- **Cache**: Redis (Port 6379)

### Architecture

```
┌─────────────┐
│   Ingress   │ (HTTPS/443)
└──────┬──────┘
       │
   ┌───┴────┐
   │        │
┌──▼──┐  ┌─▼────┐
│Front│  │ Back │
│ end │  │  end │
└─────┘  └───┬──┘
             │
      ┌──────┴──────┐
      │             │
   ┌──▼──┐      ┌──▼──┐
   │ DB  │      │Redis│
   └─────┘      └─────┘
```

---

## Prerequisites

### Required Tools
- **Docker**: 24.0+
- **Docker Compose**: 2.20+
- **Node.js**: 20.x
- **kubectl**: 1.28+ (for Kubernetes)
- **Helm**: 3.12+ (optional)

### Required Accounts
- GitHub account (for CI/CD)
- Container registry access (GitHub Container Registry)
- Cloud provider account (AWS/GCP/Azure)
- Domain name (for production)

---

## Local Development

### 1. Clone Repository
```bash
git clone https://github.com/your-org/errandbit.git
cd errandbit
```

### 2. Environment Setup

Create `.env` file in root:
```env
# Database
DB_PASSWORD=dev_password
DB_NAME=errandbit
DB_USER=errandbit

# Backend
JWT_SECRET=your-dev-jwt-secret
JWT_REFRESH_SECRET=your-dev-refresh-secret
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Frontend
VITE_API_URL=http://localhost:4000

# Redis
REDIS_PASSWORD=dev_redis_password
```

### 3. Start Services
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api-docs
- **Database**: localhost:5432

---

## Docker Deployment

### Build Images

#### Backend
```bash
cd backend
docker build -t errandbit/backend:latest .
```

#### Frontend
```bash
cd frontend
docker build \
  --build-arg VITE_API_URL=https://api.errandbit.com \
  -t errandbit/frontend:latest .
```

### Production Deployment

```bash
# Use production compose file
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3 --scale frontend=2
```

### Docker Commands

```bash
# View running containers
docker ps

# View logs
docker logs -f errandbit-backend-prod

# Execute commands in container
docker exec -it errandbit-backend-prod sh

# Restart service
docker-compose restart backend

# Remove all containers and volumes
docker-compose down -v
```

---

## Kubernetes Deployment

### 1. Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Verify installation
kubectl version --client

# Configure cluster access
kubectl config use-context your-cluster
```

### 2. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 3. Create Secrets

```bash
# Create database secret
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_DB=errandbit \
  --from-literal=POSTGRES_USER=errandbit \
  --from-literal=POSTGRES_PASSWORD=your-secure-password \
  -n errandbit

# Create backend secrets
kubectl create secret generic backend-secret \
  --from-literal=DATABASE_URL=postgresql://errandbit:password@postgres:5432/errandbit \
  --from-literal=JWT_SECRET=your-jwt-secret \
  --from-literal=JWT_REFRESH_SECRET=your-refresh-secret \
  --from-literal=TWILIO_ACCOUNT_SID=your-sid \
  --from-literal=TWILIO_AUTH_TOKEN=your-token \
  --from-literal=TWILIO_PHONE_NUMBER=+1234567890 \
  -n errandbit
```

### 4. Deploy Services

```bash
# Deploy in order
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

# Or deploy all at once
kubectl apply -f k8s/
```

### 5. Verify Deployment

```bash
# Check pods
kubectl get pods -n errandbit

# Check services
kubectl get svc -n errandbit

# Check ingress
kubectl get ingress -n errandbit

# View logs
kubectl logs -f deployment/backend -n errandbit

# Describe pod for troubleshooting
kubectl describe pod <pod-name> -n errandbit
```

### 6. Scaling

```bash
# Manual scaling
kubectl scale deployment backend --replicas=5 -n errandbit

# Auto-scaling is configured via HPA
kubectl get hpa -n errandbit
```

### 7. Updates & Rollbacks

```bash
# Update image
kubectl set image deployment/backend backend=ghcr.io/your-org/errandbit/backend:v2.0.0 -n errandbit

# Check rollout status
kubectl rollout status deployment/backend -n errandbit

# Rollback to previous version
kubectl rollout undo deployment/backend -n errandbit

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n errandbit
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The pipeline automatically:
1. **Lints** code on every push/PR
2. **Tests** backend and frontend
3. **Builds** Docker images
4. **Pushes** to GitHub Container Registry
5. **Deploys** to staging (develop branch)
6. **Deploys** to production (main branch)

### Required GitHub Secrets

```bash
# Repository Settings > Secrets and variables > Actions

SNYK_TOKEN=your-snyk-token
SLACK_WEBHOOK=https://hooks.slack.com/services/xxx
VITE_API_URL=https://api.errandbit.com

# For Kubernetes deployment
KUBE_CONFIG=base64-encoded-kubeconfig
```

### Workflow Triggers

```yaml
# Automatic triggers
- Push to main → Production deployment
- Push to develop → Staging deployment
- Pull request → Run tests only

# Manual trigger
- workflow_dispatch → Manual deployment
```

### Pipeline Stages

```
┌─────────┐
│  Lint   │
└────┬────┘
     │
┌────▼────┐
│  Test   │
└────┬────┘
     │
┌────▼────┐
│Security │
└────┬────┘
     │
┌────▼────┐
│  Build  │
└────┬────┘
     │
┌────▼────┐
│  Push   │
└────┬────┘
     │
┌────▼────┐
│ Deploy  │
└────┬────┘
     │
┌────▼────┐
│  E2E    │
└─────────┘
```

---

## Monitoring & Logging

### Health Checks

```bash
# Backend health
curl http://localhost:4000/health

# Frontend health
curl http://localhost:8080/health

# Database health
docker exec errandbit-db pg_isready -U errandbit
```

### Logs

#### Docker
```bash
# View all logs
docker-compose logs

# Follow specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

#### Kubernetes
```bash
# View logs
kubectl logs -f deployment/backend -n errandbit

# View logs from all pods
kubectl logs -l app=backend -n errandbit --all-containers=true

# Stream logs
kubectl logs -f deployment/backend -n errandbit --tail=100
```

### Metrics

```bash
# Pod resource usage
kubectl top pods -n errandbit

# Node resource usage
kubectl top nodes

# HPA status
kubectl get hpa -n errandbit
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms**: Backend can't connect to database

**Solutions**:
```bash
# Check database is running
docker ps | grep postgres
kubectl get pods -n errandbit | grep postgres

# Check database logs
docker logs errandbit-db
kubectl logs -f statefulset/postgres -n errandbit

# Verify connection string
echo $DATABASE_URL

# Test connection
docker exec -it errandbit-db psql -U errandbit -d errandbit
```

#### 2. Image Pull Errors

**Symptoms**: `ImagePullBackOff` or `ErrImagePull`

**Solutions**:
```bash
# Check image exists
docker pull ghcr.io/your-org/errandbit/backend:latest

# Verify image pull secret
kubectl get secret -n errandbit

# Create image pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=your-username \
  --docker-password=your-pat \
  -n errandbit
```

#### 3. Pod CrashLoopBackOff

**Symptoms**: Pods keep restarting

**Solutions**:
```bash
# Check pod logs
kubectl logs <pod-name> -n errandbit --previous

# Describe pod
kubectl describe pod <pod-name> -n errandbit

# Check resource limits
kubectl get pod <pod-name> -n errandbit -o yaml | grep -A 5 resources

# Check liveness/readiness probes
kubectl get pod <pod-name> -n errandbit -o yaml | grep -A 10 Probe
```

#### 4. Ingress Not Working

**Symptoms**: Can't access application via domain

**Solutions**:
```bash
# Check ingress
kubectl get ingress -n errandbit
kubectl describe ingress errandbit-ingress -n errandbit

# Check ingress controller
kubectl get pods -n ingress-nginx

# Verify DNS
nslookup errandbit.com

# Check TLS certificate
kubectl get certificate -n errandbit
```

### Debug Commands

```bash
# Get all resources
kubectl get all -n errandbit

# Get events
kubectl get events -n errandbit --sort-by='.lastTimestamp'

# Port forward for debugging
kubectl port-forward svc/backend 4000:4000 -n errandbit

# Execute command in pod
kubectl exec -it <pod-name> -n errandbit -- sh

# Copy files from pod
kubectl cp <pod-name>:/app/logs/error.log ./error.log -n errandbit
```

---

## Production Checklist

### Before Deployment

- [ ] Update all secrets
- [ ] Configure SSL/TLS certificates
- [ ] Set up database backups
- [ ] Configure monitoring/alerting
- [ ] Test rollback procedure
- [ ] Document runbooks
- [ ] Set up log aggregation
- [ ] Configure auto-scaling
- [ ] Test disaster recovery
- [ ] Security audit completed

### Post Deployment

- [ ] Verify all services running
- [ ] Check health endpoints
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify backups working
- [ ] Test alerting
- [ ] Update documentation

---

## Support

For issues or questions:
- **Documentation**: https://docs.errandbit.com
- **GitHub Issues**: https://github.com/your-org/errandbit/issues
- **Slack**: #errandbit-devops

---

**Last Updated**: 2025-11-09
**Version**: 1.0.0
