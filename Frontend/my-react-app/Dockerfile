FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build -- --mode production

FROM nginx:1.27-alpine

# Default values to prevent Nginx crash if variables are missing in Railway
ENV BACKEND_URL=https://backend-production.up.railway.app
ENV BACKEND_HOST=backend-production.up.railway.app
ENV PORT=80

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
