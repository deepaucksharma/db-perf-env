FROM node:20-alpine

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

EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
