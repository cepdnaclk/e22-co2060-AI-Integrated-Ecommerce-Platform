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
# Using internal Railway URL as fallback for better reliability
ENV BACKEND_URL="http://backend.railway.internal:3000/api/"
ENV BACKEND_HOST="backend.railway.internal"

CMD ["nginx", "-g", "daemon off;"]
