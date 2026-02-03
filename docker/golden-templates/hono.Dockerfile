# ========================================
# Multi-Stage Dockerfile for Hono + React
# Optimized for development and production
# ========================================

ARG BUN_VERSION=1.1.43-alpine
FROM oven/bun:${BUN_VERSION} AS base

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup && \
    chown -R appuser:appgroup /app

# ========================================
# Dependencies Stage
# ========================================
FROM base AS deps

# Copy package files for layer caching
COPY --chown=appuser:appgroup package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# ========================================
# Development Stage
# ========================================
FROM base AS development

ENV NODE_ENV=development

# Copy dependencies from deps stage
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=deps --chown=appuser:appgroup /app/package.json ./

# Copy source code
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# Expose ports (Vite dev server + API)
EXPOSE 5173
EXPOSE 3000

# Start both servers
CMD ["sh", "-c", "bun --hot api/index.ts & bunx vite --host 0.0.0.0 --port 5173"]

# ========================================
# Build Stage
# ========================================
FROM deps AS build

COPY --chown=appuser:appgroup . .

# Build frontend for production
RUN bun run build

# ========================================
# Production Stage
# ========================================
FROM base AS production

ENV NODE_ENV=production

# Copy only production dependencies
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=deps --chown=appuser:appgroup /app/package.json ./

# Copy built frontend assets
COPY --from=build --chown=appuser:appgroup /app/dist ./dist

# Copy API source
COPY --chown=appuser:appgroup api ./api
COPY --chown=appuser:appgroup src/server ./src/server

# Switch to non-root user
USER appuser

# Expose API port only in production
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start production server
CMD ["bun", "run", "api/index.ts"]
