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

# Define default values for env variables so envsubst doesn't skip them, preventing Nginx startup crashes
ENV PORT=80
ENV BACKEND_URL="http://localhost:3000"

CMD ["nginx", "-g", "daemon off;"]
