FROM node:20-slim AS build

WORKDIR /app

# Copy build context and normalize app location.
# This supports both:
# 1) context = Frontend/my-react-app
# 2) context = repo root with app at Frontend/my-react-app
COPY . .
RUN if [ -f package.json ] && [ -f index.html ] && [ -d src ]; then \
      echo "Using frontend context at /app"; \
    elif [ -f Frontend/my-react-app/package.json ] && [ -f Frontend/my-react-app/index.html ] && [ -d Frontend/my-react-app/src ]; then \
      echo "Using monorepo context at /app/Frontend/my-react-app"; \
      cp -a Frontend/my-react-app/. /app/; \
    else \
      echo "Frontend source not found in build context"; \
      exit 1; \
    fi

RUN npm install --no-audit --no-fund --legacy-peer-deps

# Build app
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN NODE_OPTIONS=--max-old-space-size=1024 npm run build -- --mode production

FROM nginx:1.27-alpine

# Directly copy our fixed nginx.conf to the correct Nginx location.
# This prevents the complex startup script from overwriting our settings.
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
