# Agent Docker Environment - Context Guide

This document provides essential context about the Docker development environment setup for AI agents working on this codebase.

## Overview

The Docker environment provides a self-contained, multi-framework development and testing platform for scaffolded applications. It runs on a single port (1214) with a reverse proxy architecture that allows multiple frameworks to be tested side-by-side under clean subdirectory paths.

## Core Architecture

### Main Entry Point
- **`compose.yml`**: Docker Compose configuration orchestrating all services
  - Defines services: PostgreSQL, MySQL, Laravel, and main Nginx
  - Manages networks, volumes, and dependencies
  - Single exposed port: `1214` (main Nginx)

### Architecture Pattern

```
Browser → localhost:1214 (Main Nginx)
         → /laravel → Laravel Container:80 (Nginx + PHP-FPM)
         → /springboot → Spring Boot Container:8080 (future)
         → /nextjs → Next.js Container:3000 (future)
```

**Key Principle**: Each framework runs in its own container with its own web server, and the main Nginx routes requests to them via subdirectory paths.

## Key Components

### 1. Main Nginx (`docker/nginx.conf`)

Reverse proxy that routes requests to framework containers:

- **Port**: `1214:80` (only exposed port to host)
- **Routing**: Routes `/laravel` → `laravel:80` (internal Docker network)
- **Headers**: Preserves host, port, and protocol information
- **Redirects**: Rewrites backend redirects to maintain subdirectory paths

**Key Configuration:**
```nginx
location /laravel/ {
    proxy_pass http://laravel/;
    proxy_set_header Host $http_host;  # Includes port number
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect / /laravel/;  # Rewrites redirects
}
```

### 2. Laravel Container (`Dockerfile`)

Self-contained Laravel application with Nginx and PHP-FPM:

- **Base Image**: `php:8.3-fpm`
- **Services**: Nginx (port 80) + PHP-FPM (port 9000) via Supervisor
- **No Exposed Ports**: Only accessible via main Nginx (internal network)
- **Nginx Config**: `docker/laravel-nginx.conf` (standard Laravel setup at root)
- **Supervisor**: `docker/supervisord.conf` (runs both Nginx and PHP-FPM)

**Key Features:**
- Laravel runs at root inside container (standard setup)
- No subdirectory hacks needed
- Clean separation of concerns

### 3. Database Services

#### PostgreSQL
- **Port**: `15432:5432` (exposed for HeidiSQL)
- **Image**: `postgres:16` (LTS)
- **Credentials**: `postgres/postgres`
- **Volume**: `postgresql_data` (persistent storage)

#### MySQL
- **Port**: `13306:3306` (exposed for HeidiSQL)
- **Image**: `mysql:8.0`
- **Credentials**: `root/root` or `laravel/laravel`
- **Volume**: `mysql_data` (persistent storage)

### 4. Entrypoint Script (`docker/docker-entrypoint.sh`)

Handles Laravel container initialization:

- **Composer**: Installs dependencies if `vendor/autoload.php` missing
- **Environment**: Creates `.env` file if missing
- **Application Key**: Generates Laravel app key if needed
- **Permissions**: Sets proper file ownership
- **No Database Operations**: Only installs dependencies and starts services

**Key Logic:**
- Checks for `vendor/autoload.php` (not just directory existence)
- Falls back to `composer update` if `composer install` fails
- Runs as root, then fixes permissions for www-data
- Starts Supervisor (which runs Nginx + PHP-FPM)

## Service Dependencies

### Health Checks
- **PostgreSQL**: `pg_isready -U postgres`
- **MySQL**: `mysqladmin ping -h localhost`
- **Laravel**: Depends on both databases being healthy

### Startup Order
1. PostgreSQL and MySQL start and become healthy
2. Laravel container builds and waits for databases
3. Main Nginx starts and waits for Laravel

## Network Architecture

### Docker Network
- **Name**: `scaffolder_network`
- **Type**: Bridge network
- **Services**: All containers communicate via service names (e.g., `laravel:80`, `mysql:3306`)

### Port Exposure Strategy

**Exposed to Host:**
- `1214` → Main Nginx (only web access point)
- `15432` → PostgreSQL (for HeidiSQL)
- `13306` → MySQL (for HeidiSQL)

**Internal Only:**
- Laravel container ports (80, 9000)
- Database internal ports (5432, 3306)

## File Structure

```
.
├── compose.yml                    # Main Docker Compose configuration
├── Dockerfile                     # Laravel container definition
└── docker/
    ├── nginx.conf                 # Main Nginx reverse proxy config
    ├── laravel-nginx.conf         # Laravel container Nginx config
    ├── supervisord.conf           # Supervisor config (Nginx + PHP-FPM)
    └── docker-entrypoint.sh       # Laravel container entrypoint
```

## Adding New Frameworks

### Pattern for New Framework

1. **Create Framework Container**:
   ```yaml
   springboot:
     build:
       context: ./apps/springboot
       dockerfile: Dockerfile
     container_name: scaffolder_springboot
     # No exposed ports - internal only
     networks:
       - scaffolder_network
   ```

2. **Add to Main Nginx**:
   ```nginx
   location /springboot/ {
       proxy_pass http://springboot:8080/;
       proxy_set_header Host $http_host;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_redirect / /springboot/;
   }
   ```

3. **Framework Container Should**:
   - Run its own web server (embedded or separate)
   - Serve at root (no subdirectory hacks)
   - Be accessible via internal Docker network

### Framework-Specific Considerations

#### Next.js (Standalone)
- Run `next start` on port 3000
- Container exposes port 3000 internally
- Main Nginx routes `/nextjs` → `nextjs:3000`

#### Spring Boot
- Embedded Tomcat/Jetty on port 8080
- Container exposes port 8080 internally
- Main Nginx routes `/springboot` → `springboot:8080`

#### Express.js
- Node.js server on port 3000
- Container exposes port 3000 internally
- Main Nginx routes `/express` → `express:3000`

## Environment Variables

### Laravel Container
- `APP_ENV`: `local`
- `APP_DEBUG`: `true`
- `APP_URL`: `http://localhost:1214/laravel`
- `DB_CONNECTION`: `mysql`
- `DB_HOST`: `mysql` (Docker service name)
- `DB_PORT`: `3306`
- `DB_DATABASE`: `laravel`
- `DB_USERNAME`: `laravel`
- `DB_PASSWORD`: `laravel`

## Volumes

### Named Volumes (Persistent)
- `postgresql_data`: PostgreSQL data directory
- `mysql_data`: MySQL data directory
- `laravel_vendor`: Composer dependencies (persisted across rebuilds)
- `laravel_node_modules`: npm dependencies (persisted across rebuilds)

### Bind Mounts (Development)
- `./apps/laravel:/var/www/html`: Laravel application code (live editing)

## Common Patterns

### Rebuilding After Changes

**Laravel Container:**
```bash
docker compose build laravel
docker compose up -d
```

**All Services:**
```bash
docker compose down
docker compose build
docker compose up -d
```

**Fresh Start (Remove Volumes):**
```bash
docker compose down -v
docker compose build
docker compose up -d
```

### Checking Logs

```bash
# All services
docker compose logs

# Specific service
docker compose logs laravel
docker compose logs nginx

# Follow logs
docker compose logs -f laravel
```

### Accessing Containers

```bash
# Laravel container
docker compose exec laravel bash

# Run artisan commands
docker compose exec laravel php artisan migrate

# Check services
docker compose ps
```

## Troubleshooting

### Laravel Not Accessible

1. **Check Nginx logs**: `docker compose logs nginx`
2. **Check Laravel logs**: `docker compose logs laravel`
3. **Verify Laravel container is running**: `docker compose ps`
4. **Check Nginx config**: Ensure `proxy_pass` uses trailing slash
5. **Verify APP_URL**: Should be `http://localhost:1214/laravel`

### Composer Dependencies Not Installing

1. **Check PHP version**: Must match `composer.lock` requirements (8.3+)
2. **Check vendor volume**: May need to remove and rebuild
   ```bash
   docker volume rm scaffolder_laravel_vendor
   docker compose build laravel
   ```
3. **Check entrypoint logs**: `docker compose logs laravel | grep composer`

### Database Connection Issues

1. **Verify health checks**: `docker compose ps` (should show healthy)
2. **Check database logs**: `docker compose logs mysql` or `docker compose logs postgresql`
3. **Verify network**: Containers must be on `scaffolder_network`
4. **Check credentials**: Match those in Laravel `.env`

### Redirect Issues (localhost without port)

1. **Check APP_URL**: Must include port: `http://localhost:1214/laravel`
2. **Check proxy headers**: `proxy_set_header Host $http_host` (includes port)
3. **Check proxy_redirect**: Should rewrite `/` to `/laravel/`

## Best Practices

### For Development/Testing

1. **Self-Contained**: Everything accessible via single port (1214)
2. **Framework Isolation**: Each framework in its own container
3. **No Direct Access**: Framework containers not exposed directly
4. **Clean URLs**: Subdirectory routing (`/laravel`, `/springboot`, etc.)
5. **Standard Setup**: Each framework runs at root inside its container

### For Adding Frameworks

1. **Follow the Pattern**: Framework container with own web server
2. **No Exposed Ports**: Only main Nginx exposes ports
3. **Internal Communication**: Use Docker service names
4. **Health Checks**: Add health checks for framework containers
5. **Documentation**: Update this guide with framework-specific notes

## Key Files to Understand

1. **`compose.yml`**: Service definitions, networks, volumes
2. **`Dockerfile`**: Laravel container setup (Nginx + PHP-FPM)
3. **`docker/nginx.conf`**: Main reverse proxy configuration
4. **`docker/laravel-nginx.conf`**: Laravel container Nginx config
5. **`docker/supervisord.conf`**: Process management (Nginx + PHP-FPM)
6. **`docker/docker-entrypoint.sh`**: Container initialization

## Recent Changes

### Multi-Container Architecture
- Moved from single Nginx serving Laravel directly to reverse proxy pattern
- Laravel container now has its own Nginx running at root
- Main Nginx routes `/laravel` to Laravel container
- Removed direct port exposure from Laravel container (fully internal)

### Supervisor Integration
- Added Supervisor to run both Nginx and PHP-FPM in Laravel container
- Laravel container now self-contained with its own web server
- Standard Laravel setup (no subdirectory hacks)

### Port Consolidation
- All web access through single port: `1214`
- Database ports exposed only for HeidiSQL access
- Framework containers fully internal (no exposed ports)

