import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import { clerkMiddleware, getAuth, clerkClient, requireAuth } from '@clerk/express';
import { ttsRoutes } from './routes/tts';
import { stripeRoutes } from './routes/stripe';
import { userRoutes } from './routes/user';
import { MongoAnalyticsLogger } from './Utilities/AnalyticsLogger';
import { stripeWebhookRouter } from './webhooks/stripeWebhooks';
import { clerkWebhookRouter } from './webhooks/clerkWebhooks';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });

const app: express.Application = express();
const PORT = process.env.PORT || 3001;




// Middleware
app.use(cors());
app.use(clerkMiddleware());


const hasPermission = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const auth = getAuth(req);

  if (!auth.has({ permission: 'org:admin:example'})) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
};

// Webhook routes (must come before express.json middleware)
app.use('/webhooks', stripeWebhookRouter);
app.use('/webhooks', clerkWebhookRouter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
// To protect the routes, use the requireAuth middleware by redirecting users to sign in if they are not authenticated.
app.use('/api/tts', requireAuth(), hasPermission, ttsRoutes);
app.use('/api/stripe', requireAuth(), hasPermission, stripeRoutes);
app.use('/api/user', requireAuth(), hasPermission, userRoutes);

// TODO Add requireAuth() for data analytics routes when ready

// ========== V1 API ENDPOINTS (Ready for extraction) ==========

app.get('/api/v1/analytics/user/:userId/daily/:date', async (req, res) => {
  try {
    const { userId, date } = req.params;
    const analytics = new MongoAnalyticsLogger();
    const stats = await analytics.getUserDailyStats(userId, date);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user daily stats' });
  }
});

app.get('/api/v1/analytics/user/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const analytics = new MongoAnalyticsLogger();
    const summary = await analytics.getUserUsageSummaryStats(
      userId, 
      startDate as Date | undefined, 
      endDate as Date | undefined
    );
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user summary' });
  }
});

app.get('/api/v1/analytics/users/top', async (req, res) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const analytics = new MongoAnalyticsLogger();
    const topUsers = await analytics.getTopUsers(days, limit);
    res.json(topUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get top users' });
  }
});

// ========== END V1 API ENDPOINTS ==========

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      tts: process.env.XTTS_API_URL || 'http://localhost:8020',
    }
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
})

export default app;