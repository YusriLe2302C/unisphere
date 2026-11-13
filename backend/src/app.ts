import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';

import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import postRoutes from './routes/post.routes.js';
import communityRoutes from './routes/community.routes.js';
import opportunityRoutes from './routes/opportunity.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import applicationRoutes from './routes/application.routes.js';
import researchRoutes from './routes/research.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import eventsRoutes from './routes/events.routes.js';
import researchWorkflowRoutes from './routes/research-workflow.routes.js';
import careerRoutes from './routes/career.routes.js';
import timetableRoutes from './routes/timetable.routes.js';
import filesRoutes from './routes/files.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import { envConfig } from './config/env.js';

export const createApp = (): Express => {
  const app = express();

  // Operational Safety & Security Middleware
  app.use(cors({
    origin: (origin, callback) => {
      const configured = envConfig.CORS_ORIGIN.split(',').map(x => x.trim()).filter(Boolean);
      if (!origin || configured.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
  }));

  // Payload size restrictions (prevents Denial of Service via massive body ingestion)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Swagger Documentation
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.json(swaggerDocument);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      app: 'UniGlobe Academic & Professional Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API modules
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/communities', communityRoutes);
  app.use('/api/opportunities', opportunityRoutes);
  app.use('/api/applications', applicationRoutes);
  app.use('/api/research', researchWorkflowRoutes);
  app.use('/api/research', researchRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/career', careerRoutes);
  app.use('/api/timetable', timetableRoutes);
  app.use('/api/files', filesRoutes);
  app.use('/api/messages', messagesRoutes);

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'API route not found.' });
  });

  // Global Error Handler — handles AppError subclasses and unexpected errors
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.statusCode || err.status || 500;
    const message = err.isOperational ? err.message : 'Internal Server Error';
    if (!err.isOperational) console.error('[Unexpected Error]', err);
    res.status(status).json({
      message,
      ...(err.errors && { errors: err.errors }),
      ...(process.env.NODE_ENV === 'development' && !err.isOperational && { stack: err.stack })
    });
  });

  return app;
};
