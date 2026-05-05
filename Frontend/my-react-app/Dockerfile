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

# At startup: substitute env vars into the template, then start nginx
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_INTERNAL_HOST}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
