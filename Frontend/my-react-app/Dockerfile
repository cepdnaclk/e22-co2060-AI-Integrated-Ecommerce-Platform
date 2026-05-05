FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build -- --mode production

FROM nginx:1.27-alpine

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Defaults for envsubst - ensure BACKEND_URL ends in /api/
ENV BACKEND_URL="https://backend-production.up.railway.app/api/"
ENV BACKEND_HOST="backend-production.up.railway.app"

CMD ["nginx", "-g", "daemon off;"]
