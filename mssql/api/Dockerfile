FROM node:20-alpine
RUN apk add --no-cache curl

WORKDIR /app
COPY package*.json ./
RUN npm install && npm cache clean --force
COPY . .

EXPOSE 3000
CMD ["sh", "-c", "echo 'Starting server...' && node server.js"]
