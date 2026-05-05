FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN NODE_OPTIONS=--max-old-space-size=1024 npm run build -- --mode production

FROM nginx:1.27-alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Store nginx template — envsubst will fill in $BACKEND_INTERNAL_HOST at startup
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# At startup:
# 1. Derive BACKEND_HOST (host:port) from BACKEND_URL env var that Railway already provides.
#    e.g. BACKEND_URL="http://backend-inter.railway.internal:3000/api/"
#         → BACKEND_HOST="backend-inter.railway.internal:3000"
# 2. Substitute it into the nginx template.
# 3. Start nginx.
CMD ["/bin/sh", "-c", "\
  BACKEND_HOST=$(echo \"${BACKEND_URL:-}\" | sed 's|^https\\?://||' | sed 's|/.*||'); \
  # AUTO-CORRECT: If user used backend-inter but service is named backend
  if echo \"$BACKEND_HOST\" | grep -q \"backend-inter\"; then \
    BACKEND_HOST=$(echo \"$BACKEND_HOST\" | sed 's/backend-inter/backend/'); \
  fi; \
  if [ -z \"$BACKEND_HOST\" ]; then BACKEND_HOST=\"backend.railway.internal:3000\"; fi; \
  echo \"[nginx] Proxying /api/ → http://$BACKEND_HOST/api/\"; \
  export BACKEND_HOST; \
  envsubst '${BACKEND_HOST}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf; \
  nginx -g 'daemon off;' \
"]
