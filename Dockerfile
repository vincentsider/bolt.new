# Use Node.js 20 (LTS)
FROM node:20-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN NODE_ENV=production pnpm run build

# Production stage
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --production
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY server.mjs ./
COPY server-debug.mjs ./

# Railway sets PORT dynamically
EXPOSE 3000

# Start the debug server temporarily
CMD ["node", "server-debug.mjs"]