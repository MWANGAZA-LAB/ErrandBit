.PHONY: help dev build up down logs clean test deploy-staging deploy-prod k8s-deploy k8s-delete

# Default target
help:
	@echo "ErrandBit - Available Commands"
	@echo "================================"
	@echo "Development:"
	@echo "  make dev              - Start development environment"
	@echo "  make logs             - View logs"
	@echo "  make down             - Stop all services"
	@echo ""
	@echo "Building:"
	@echo "  make build            - Build Docker images"
	@echo "  make build-backend    - Build backend image only"
	@echo "  make build-frontend   - Build frontend image only"
	@echo ""
	@echo "Testing:"
	@echo "  make test             - Run all tests"
	@echo "  make test-backend     - Run backend tests"
	@echo "  make test-frontend    - Run frontend tests"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-staging   - Deploy to staging"
	@echo "  make deploy-prod      - Deploy to production"
	@echo ""
	@echo "Kubernetes:"
	@echo "  make k8s-deploy       - Deploy to Kubernetes"
	@echo "  make k8s-delete       - Delete from Kubernetes"
	@echo "  make k8s-status       - Check Kubernetes status"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean            - Clean up containers and volumes"
	@echo "  make db-migrate       - Run database migrations"
	@echo "  make db-seed          - Seed database"

# Development
dev:
	docker-compose up -d
	@echo "✅ Development environment started"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend: http://localhost:4000"

# Build images
build:
	docker-compose build

build-backend:
	cd backend && docker build -t errandbit/backend:latest .

build-frontend:
	cd frontend && docker build -t errandbit/frontend:latest .

# Start services
up:
	docker-compose up -d

# Stop services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Clean up
clean:
	docker-compose down -v
	docker system prune -f

# Testing
test: test-backend test-frontend

test-backend:
	cd backend && npm test

test-frontend:
	cd frontend && npm test

# Database
db-migrate:
	docker-compose exec backend npm run migrate

db-seed:
	docker-compose exec backend npm run seed

# Production deployment
deploy-staging:
	@echo "🚀 Deploying to staging..."
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "✅ Staging deployment complete"

deploy-prod:
	@echo "🚀 Deploying to production..."
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d; \
		echo "✅ Production deployment complete"; \
	fi

# Kubernetes
k8s-deploy:
	@echo "🚀 Deploying to Kubernetes..."
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/postgres.yaml
	kubectl apply -f k8s/backend.yaml
	kubectl apply -f k8s/frontend.yaml
	kubectl apply -f k8s/ingress.yaml
	@echo "✅ Kubernetes deployment complete"

k8s-delete:
	kubectl delete -f k8s/

k8s-status:
	kubectl get all -n errandbit
	kubectl get ingress -n errandbit

# Monitoring
monitor:
	@echo "📊 Monitoring dashboard..."
	kubectl port-forward -n errandbit svc/backend 4000:4000

# Backup database
backup:
	@echo "💾 Backing up database..."
	docker-compose exec postgres pg_dump -U errandbit errandbit > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup complete"
