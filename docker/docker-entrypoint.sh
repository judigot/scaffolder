#!/bin/bash
set -e

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
APP_URL=http://localhost:1214/laravel

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=laravel
DB_USERNAME=laravel
DB_PASSWORD=laravel
EOF
        if [ "$(id -u)" = "0" ]; then
            chown www-data:www-data .env
        fi
    fi
fi

if [ ! -d vendor ]; then
    $USER_CMD "composer install --no-interaction --prefer-dist --optimize-autoloader" || true
fi

if ! grep -q "APP_KEY=base64:" .env 2>/dev/null; then
    $USER_CMD "php artisan key:generate --force" || true
fi

$USER_CMD "php artisan config:clear" || true
$USER_CMD "php artisan cache:clear" || true

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

