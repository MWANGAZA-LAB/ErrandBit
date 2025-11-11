# Multi-stage build for ErrandBit Backend
# Optimized for production with security and caching

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files for better layer caching
COPY package*.json ./

# Install ALL dependencies (no package-lock in workspace)
RUN npm install --legacy-peer-deps

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies
RUN npm prune --production --legacy-peer-deps

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 errandbit

# Copy production dependencies
COPY --from=builder --chown=errandbit:nodejs /app/node_modules ./node_modules

# Copy built files
COPY --from=builder --chown=errandbit:nodejs /app/dist ./dist
COPY --from=builder --chown=errandbit:nodejs /app/db ./db
COPY --from=builder --chown=errandbit:nodejs /app/package*.json ./

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R errandbit:nodejs logs

# Switch to non-root user
USER errandbit

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run the application
CMD ["node", "dist/server.js"]
