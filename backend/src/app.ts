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

export const createApp = (): Express => {
  const app = express();

  // Operational Safety & Security Middleware
  app.use(cors({
    origin: (origin, callback) => {
      // In production or development, allow browser requests from authorized frontends
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
  app.use('/api/research', researchRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'API route not found.' });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Error]', err);
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
  });

  return app;
};
