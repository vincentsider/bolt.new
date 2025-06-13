FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all files
COPY . .

# Build the app
RUN cp app/entry.server.node.tsx app/entry.server.tsx && \
    find app -name '*.ts*' -type f -exec sed -i 's/@remix-run\/cloudflare/@remix-run\/node/g' {} \; && \
    NODE_ENV=production RAILWAY_ENVIRONMENT=production pnpm run build

# Expose port
EXPOSE 3000

# Copy test server
COPY server-test.js ./

# Start the test server
CMD ["node", "server-test.js"]