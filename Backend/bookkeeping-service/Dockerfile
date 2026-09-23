FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

EXPOSE 4020

CMD ["npm", "start"]
