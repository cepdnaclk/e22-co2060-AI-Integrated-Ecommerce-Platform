#!/bin/sh

# If BACKEND_INTERNAL_HOST is not set, fallback to the repository default name on Railway.
# The user can override this in Railway variables (e.g. backend-production-xxxx.up.railway.app)
BACKEND_HOST=${BACKEND_INTERNAL_HOST:-e22-co2060-ai-integrated-ecommerce-platform.railway.internal:8080}
echo "Starting Nginx with backend host: $BACKEND_HOST"

# Extract the DNS resolver from /etc/resolv.conf (works for both Docker and Railway)
RESOLVER=$(awk 'BEGIN{ORS=" "} $1=="nameserver" {print $2}' /etc/resolv.conf)
echo "Using DNS resolvers: $RESOLVER"

# Write the nginx config
cat <<EOF > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Dynamic DNS resolution prevents Nginx from caching stale IPs if the backend restarts
    resolver $RESOLVER valid=10s ipv6=off;

    location /api/ {
        # Using a variable forces Nginx to dynamically resolve the IP
        set \$backend "http://${BACKEND_HOST}";
        proxy_pass \$backend;
        
        proxy_http_version 1.1;
        proxy_set_header Host ${BACKEND_HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Auth \$http_authorization;
        proxy_pass_request_headers on;
        proxy_ssl_server_name on;
        
        # Timeouts for Railway backend response
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
}
EOF

# Start Nginx
nginx -g "daemon off;"

