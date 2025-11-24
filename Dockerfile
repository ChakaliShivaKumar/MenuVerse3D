# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY drizzle.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./

# Copy source files
COPY shared ./shared
COPY server ./server
COPY client ./client

# Install dependencies
RUN npm ci

# Build the application (builds client and server)
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev deps for potential runtime needs)
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder
# dist/ contains:
# - dist/index.js (bundled server)
# - dist/public/ (built client files)
COPY --from=builder /app/dist ./dist

# Copy necessary source files for runtime (db.ts and other runtime deps)
COPY shared ./shared

# Create uploads directory
RUN mkdir -p uploads/images uploads/models

# Expose port
EXPOSE 3030

# Set environment
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/index.js"]

