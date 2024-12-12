FROM node:20-alpine

# Add debugging utilities
RUN apk add --no-cache curl wget git

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies with debug output
RUN echo "Installing dependencies..." && \
    npm install && \
    npm cache clean --force && \
    echo "Dependencies installed successfully"

# Copy the rest of the application
COPY . .

RUN ls -la && \
    echo "Checking for required files..." && \
    test -f server.js && echo "server.js exists" && \
    test -f newrelic.js && echo "newrelic.js exists" && \
    test -f package.json && echo "package.json exists" && \
    test -f Dockerfile && echo "Dockerfile exists" && \
    test -f docker-compose.yml && echo "docker-compose.yml exists"

EXPOSE 3000

# Start with more verbose output
CMD ["sh", "-c", "echo 'Starting server...' && node server.js"]