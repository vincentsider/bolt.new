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

# Set development environment for now
ENV NODE_ENV=development

# Railway sets PORT dynamically
EXPOSE 5173

# Copy scripts
COPY start.sh fix-imports.sh ./

# Fix imports before starting
RUN ./fix-imports.sh

# Start the application
CMD ["./start.sh"]