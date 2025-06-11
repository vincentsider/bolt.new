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

# Expose port
EXPOSE 3000

# Set development environment for now
ENV NODE_ENV=development

# Start the development server
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]