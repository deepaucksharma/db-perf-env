FROM node:20-alpine

# Install curl for healthcheck
RUN apk --no-cache add curl

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Create directory for NewRelic logs
RUN mkdir -p /var/log/newrelic

# Add healthcheck
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
