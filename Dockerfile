# Use Node.js 20 (LTS)
FROM node:20-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application code
COPY . .

# Build the application for production
RUN pnpm run build

# Set production environment
ENV NODE_ENV=production

# Railway sets PORT dynamically
EXPOSE 3000

# Start the production server
CMD ["pnpm", "run", "start:railway"]