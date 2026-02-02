# ========================================
# Hono + React Development Dockerfile
# ========================================

ARG BUN_VERSION=latest
FROM oven/bun:${BUN_VERSION}

WORKDIR /app

# Create non-root user for security (Debian-based image)
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m appuser && \
    chown -R appuser:appgroup /app

# Copy package files for layer caching
COPY --chown=appuser:appgroup package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# Expose ports (Vite dev server + API)
EXPOSE 5173
EXPOSE 3000

# Start both servers (API + Vite dev server)
CMD ["sh", "-c", "bun --hot api/index.ts & bunx vite --host 0.0.0.0 --port 5173"]
