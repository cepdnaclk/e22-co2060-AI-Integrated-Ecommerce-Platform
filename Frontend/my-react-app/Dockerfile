FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN NODE_OPTIONS=--max-old-space-size=1024 npm run build -- --mode production

FROM nginx:1.27-alpine

# Directly copy our fixed nginx.conf to the correct Nginx location.
# This prevents the complex startup script from overwriting our settings.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
