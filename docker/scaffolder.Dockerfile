FROM node:20-slim AS base

WORKDIR /app

# Install supervisor and other dependencies
RUN apt-get update && apt-get install -y \
    supervisor \
    curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Bun and pnpm globally (latest versions)
RUN npm install -g bun pnpm

# Verify installations
RUN bun --version && pnpm --version

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Copy supervisor configuration
COPY docker/scaffolder-supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint script
COPY docker/scaffolder-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/scaffolder-entrypoint.sh

EXPOSE 3000 5000

ENTRYPOINT ["/usr/local/bin/scaffolder-entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf", "-n"]

