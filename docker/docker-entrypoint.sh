#!/bin/bash
# Don't exit on error - we want to handle failures gracefully
set +e

cd /var/www/html

if [ "$(id -u)" = "0" ]; then
    chown -R www-data:www-data /var/www/html || true
    USER_CMD="su -s /bin/bash www-data -c"
else
    USER_CMD="sh -c"
fi

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        if [ "$(id -u)" = "0" ]; then
            chown www-data:www-data .env
        fi
    else
        cat > .env <<EOF
APP_NAME=Laravel
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:${NGINX_PORT}/laravel

DB_CONNECTION=pgsql
DB_HOST=postgresql
DB_PORT=5432
DB_DATABASE=${DB_DATABASE}
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_PASSWORD}
EOF
        if [ "$(id -u)" = "0" ]; then
            chown www-data:www-data .env
        fi
    fi
fi

if [ ! -f vendor/autoload.php ] || [ ! -d vendor/laravel ]; then
    if [ -f composer.json ]; then
        echo "Installing Composer dependencies..."
        # Remove empty or corrupted vendor directory if it exists
        if [ -d vendor ] && [ ! -f vendor/autoload.php ]; then
            echo "Removing empty/corrupted vendor directory..."
            rm -rf vendor
        fi
        
        if [ "$(id -u)" = "0" ]; then
            # Try install first
            echo "Running composer install..."
            if /usr/bin/composer install --no-interaction --prefer-dist --optimize-autoloader 2>&1; then
                echo "Composer install succeeded"
            else
                echo "Composer install failed, trying update to resolve lock file issues..."
                /usr/bin/composer update --no-interaction --prefer-dist --optimize-autoloader --no-scripts 2>&1
                if [ $? -ne 0 ]; then
                    echo "Composer update also failed"
                fi
            fi
            
            # Verify installation
            if [ -f vendor/autoload.php ]; then
                echo "Composer installation verified: vendor/autoload.php exists"
                chown -R www-data:www-data vendor composer.json composer.lock 2>/dev/null || true
                # Run post-install scripts as www-data
                su -s /bin/bash www-data -c "cd /var/www/html && /usr/bin/composer dump-autoload --optimize" || true
            else
                echo "ERROR: Composer installation failed - vendor/autoload.php not found"
                echo "This usually means composer install/update failed. Check the logs above."
            fi
        else
            /usr/bin/composer install --no-interaction --prefer-dist --optimize-autoloader || \
            /usr/bin/composer update --no-interaction --prefer-dist --optimize-autoloader || true
        fi
    else
        echo "Warning: composer.json not found. Skipping Composer installation."
    fi
fi

if [ -f vendor/autoload.php ]; then
    if ! grep -q "APP_KEY=base64:" .env 2>/dev/null; then
        echo "Generating application key..."
        $USER_CMD "php artisan key:generate --force" || {
            echo "Key generation failed, trying as root..."
            php artisan key:generate --force || true
        }
    fi
    
    # Database operations
    echo "Resetting database..."
    $USER_CMD "php artisan migrate:fresh --force" || {
        echo "Migration failed, trying as root..."
        php artisan migrate:fresh --force || true
    }
    
    echo "Seeding database..."
    $USER_CMD "php artisan db:seed --force" || {
        echo "Seeding failed, trying as root..."
        php artisan db:seed --force || true
    }
    
    echo "Laravel dependencies installed and ready"
else
    echo "Warning: vendor/autoload.php not found. Laravel may not work properly."
fi

if [ ! -d node_modules ]; then
    $USER_CMD "npm install" || true
fi

if [ -d storage ]; then
    $USER_CMD "chmod -R 775 storage bootstrap/cache" || \
    chmod -R 775 storage bootstrap/cache || true
fi

if [ "$(id -u)" = "0" ]; then
    chown -R www-data:www-data /var/www/html || true
fi

exec "$@"

