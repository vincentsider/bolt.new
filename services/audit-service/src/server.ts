import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import pino from 'pino';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import amqp from 'amqplib';
import { AuditService } from './services/audit';
import { ComplianceService } from './services/compliance';
import { ReportService } from './services/report';
import { createAuditRouter } from './routes/audit';
import { createComplianceRouter } from './routes/compliance';
import { createReportsRouter } from './routes/reports';
import { createHealthRouter } from './routes/health';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { connectDatabase } from './db';
import { EventConsumer } from './consumers/events';

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
  const port = process.env.PORT || 3004;

  // Initialize services
  const db = await connectDatabase();
  const elasticsearch = new ElasticsearchClient({
    node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
    auth: {
      username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
      password: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
    },
  });

  // Initialize RabbitMQ
  const rabbitConnection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
  const channel = await rabbitConnection.createChannel();

  // Initialize services
  const auditService = new AuditService(db, elasticsearch);
  const complianceService = new ComplianceService(db, auditService);
  const reportService = new ReportService(db, elasticsearch);

  // Start event consumer
  const eventConsumer = new EventConsumer(channel, auditService);
  await eventConsumer.start();

  // Create Elasticsearch indices
  await auditService.createIndices();

  // Global middleware
  app.use(helmet());
  app.use(express.json({ limit: '10mb' }));
  app.use(authMiddleware);

  // Routes
  app.use('/health', createHealthRouter(db, elasticsearch));
  app.use('/api/v1/audit', createAuditRouter(auditService));
  app.use('/api/v1/compliance', createComplianceRouter(complianceService));
  app.use('/api/v1/reports', createReportsRouter(reportService));

  // Error handling
  app.use(errorHandler);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('HTTP server closed');
    });
    await eventConsumer.stop();
    await channel.close();
    await rabbitConnection.close();
    await elasticsearch.close();
    await db.end();
    process.exit(0);
  });

  server.listen(port, () => {
    logger.info(`Audit service listening on port ${port}`);
  });
}

startServer().catch((error) => {
  logger.error(error, 'Failed to start server');
  process.exit(1);
});