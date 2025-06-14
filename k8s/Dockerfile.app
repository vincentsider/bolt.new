FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage - using the same image to run the built app
FROM node:20-alpine
WORKDIR /app

# Copy everything from builder (including node_modules)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/server.mjs ./server.mjs

# Expose port
EXPOSE 3000

# Run the production server
CMD ["node", "server.mjs"]