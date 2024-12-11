FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies and generate lock file
RUN npm install && \
    npm cache clean --force

# Copy the rest of the application
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
