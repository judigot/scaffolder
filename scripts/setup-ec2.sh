#!/bin/sh

# EC2 Setup Script for Scaffolder + OpenCode
# Usage: ./scripts/setup-ec2.sh [domain]
# Example: ./scripts/setup-ec2.sh judigot.com

readonly PROJECT_DIRECTORY=$(cd "$(dirname "$0")/.." || exit 1; pwd)
readonly DOMAIN="${1:-judigot.com}"
readonly NGINX_CONF="$PROJECT_DIRECTORY/nginx/judigot.com.conf"

main() {
    check_root
    install_dependencies
    setup_nginx
    setup_ssl
    start_services
    print_summary
}

check_root() {
    if [ "$(id -u)" -ne 0 ]; then
        printf '%s\n' "This script must be run with sudo"
        exit 1
    fi
}

install_dependencies() {
    printf '%s\n' "==> Installing dependencies..."
    apt update
    apt install -y nginx certbot python3-certbot-nginx
}

setup_nginx() {
    printf '%s\n' "==> Setting up nginx..."
    
    # Create temp config without SSL for initial setup
    cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 200 'Server is running';
        add_header Content-Type text/plain;
    }
}
EOF

    nginx -t && systemctl reload nginx
    printf '%s\n' "==> Nginx installed with temporary config"
}

setup_ssl() {
    printf '%s\n' "==> Setting up SSL certificates for $DOMAIN..."
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN" || {
        printf '%s\n' "Warning: SSL setup failed. You may need to run certbot manually."
        printf '%s\n' "Make sure DNS is pointing to this server first."
        return 1
    }
    
    # Copy full config after SSL is set up
    if [ -f "$NGINX_CONF" ]; then
        cp "$NGINX_CONF" /etc/nginx/sites-available/default
        nginx -t && systemctl reload nginx
        printf '%s\n' "==> Full nginx config applied"
    else
        printf '%s\n' "Warning: $NGINX_CONF not found. Using default config."
    fi
}

start_services() {
    printf '%s\n' "==> Starting services..."
    
    # Enable nginx on boot
    systemctl enable nginx
    
    printf '%s\n' "==> Services configured"
    printf '%s\n' ""
    printf '%s\n' "To start the apps manually:"
    printf '%s\n' "  OpenCode:   opencode web --port 4097 --hostname 127.0.0.1"
    printf '%s\n' "  Scaffolder: cd $PROJECT_DIRECTORY && bun run dev"
}

print_summary() {
    printf '%s\n' ""
    printf '%s\n' "=========================================="
    printf '%s\n' "Setup complete!"
    printf '%s\n' "=========================================="
    printf '%s\n' ""
    printf '%s\n' "URLs:"
    printf '%s\n' "  OpenCode:   https://$DOMAIN/"
    printf '%s\n' "  Scaffolder: https://$DOMAIN/scaffolder/"
    printf '%s\n' ""
    printf '%s\n' "Next steps:"
    printf '%s\n' "  1. Ensure DNS A record points to this server's IP"
    printf '%s\n' "  2. Start OpenCode: opencode web --port 4097 --hostname 127.0.0.1"
    printf '%s\n' "  3. Start Scaffolder: bun run dev"
    printf '%s\n' ""
}

main "$@"
