import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import { register } from 'prom-client';
import pino from 'pino';
import { WorkflowExecutor } from './executor';
import { WorkflowQueue } from './queue';
import { WorkflowRepository } from './repository';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { metricsMiddleware } from './middleware/metrics';
import { multiTenantMiddleware } from './middleware/multitenant';
import { createWorkflowRouter } from './routes/workflows';
import { createExecutionRouter } from './routes/executions';
import { createHealthRouter } from './routes/health';
import { EventBus } from './events';
import { connectDatabase } from './db';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: process.env.NODE_ENV !== 'production'
    }
  }
});

async function startServer() {
  const app = express();
  const server = createServer(app);
  const port = process.env.PORT || 3002;

  // Initialize components
  const db = await connectDatabase();
  const eventBus = new EventBus();
  const queue = new WorkflowQueue();
  const repository = new WorkflowRepository(db);
  const executor = new WorkflowExecutor(repository, queue, eventBus);

  // Start background workers
  await executor.start();

  // Global middleware
  app.use(helmet());
  app.use(express.json({ limit: '10mb' }));
  app.use(metricsMiddleware);
  app.use(authMiddleware);
  app.use(multiTenantMiddleware);

  // Routes
  app.use('/health', createHealthRouter(db, queue));
  app.use('/api/v1/workflows', createWorkflowRouter(repository, queue));
  app.use('/api/v1/executions', createExecutionRouter(repository, executor));
  
  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // Error handling
  app.use(errorHandler);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('HTTP server closed');
    });
    await executor.stop();
    await queue.close();
    await db.end();
    process.exit(0);
  });

  server.listen(port, () => {
    logger.info(`Workflow engine listening on port ${port}`);
  });
}

startServer().catch((error) => {
  logger.error(error, 'Failed to start server');
  process.exit(1);
});