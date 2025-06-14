import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from './utils/logger';
import { authMiddleware } from './middleware/auth';
import { auditMiddleware } from './middleware/audit';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { workflowRoutes } from './routes/workflows';
import { componentRoutes } from './routes/components';
import { aiRoutes } from './routes/ai';
import { healthRoutes } from './routes/health';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration for multi-tenant
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from tenant-specific domains
    const allowedPatterns = [
      /^https:\/\/[a-z0-9-]+\.workflowhub\.io$/,
      /^https:\/\/localhost:\d+$/,
    ];
    
    if (!origin || allowedPatterns.some(pattern => pattern.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global middleware
app.use(auditMiddleware);
app.use(rateLimitMiddleware);

// Health check (no auth required)
app.use('/health', healthRoutes);

// API routes (auth required)
app.use('/api/v1/workflows', authMiddleware, workflowRoutes);
app.use('/api/v1/components', authMiddleware, componentRoutes);
app.use('/api/v1/ai', authMiddleware, aiRoutes);

// Proxy to other microservices
app.use('/api/v1/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3000',
  changeOrigin: true,
}));

app.use('/api/v1/engine', createProxyMiddleware({
  target: process.env.ENGINE_SERVICE_URL || 'http://workflow-engine:3000',
  changeOrigin: true,
}));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({
    error: message,
    requestId: req.id,
  });
});

// Graceful shutdown
let server: any;

const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown');
      process.exit(1);
    }, 30000);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
server = app.listen(PORT, () => {
  logger.info(`Builder API service listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`Tenant mode: ${process.env.TENANT_MODE || 'multi'}`);
});