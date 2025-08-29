import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import { ttsRoutes } from './routes/tts';
import { TTSFactory } from './Factories/TTSFactory';
import { MongoAnalyticsLogger } from './Utilities/AnalyticsLogger';
import { getUserByUserId, createOrUpdateUser, deleteUserAndStripeCustomer, deleteUserByUserId } from './services/userService';
import { getStripeInstance, getStripeCustomers } from './services/stripeService';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });

const app: express.Application = express();
const PORT = process.env.PORT || 3001;
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/tts', ttsRoutes);

// TODO: Extract these /api/v1/ endpoints to separate route files
// Then use: app.use('/api/v1', v1Routes);

// ========== V1 API ENDPOINTS (Ready for extraction) ==========
const ttsService = TTSFactory.createElevenLabsTTS();
const voiceProvider = TTSFactory.createElevenLabsVoiceProvider();

app.post('/api/v1/tts', async (req, res) => {
  try {
    const { text, voiceId, modelId, userId } = req.body ?? {};
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const audio = await ttsService.synthesize({ text, voiceId, modelId, userId });
    
    res.setHeader('Content-Type', audio.mimeType);
    res.send(audio.data);
  } catch (err: any) {
    console.error('TTS Error:', err.message);
    
    if (err.message.includes('timeout')) {
      return res.status(408).json({ error: 'Request timeout. Please try again.' });
    }
    
    if (err.message.includes('failed after') && err.message.includes('attempts')) {
      return res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.' });
    }
    
    res.status(400).json({ error: err.message ?? 'TTS error' });
  }
});

app.get('/api/v1/voices', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const voices = await voiceProvider.getVoices(limit);
    res.json(voices);
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to get voices' });
  }
});

app.get('/api/v1/voices/:id', async (req, res) => {
  try {
    const voice = await voiceProvider.getVoiceById(req.params.id);
    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' });
    }
    res.json(voice);
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to get voice' });
  }
});

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
    const days = req.query.days ? Number(req.query.days) : 30;
    const analytics = new MongoAnalyticsLogger();
    const summary = await analytics.getUserUsageSummary(userId, days);
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


// ========== STRIPE ROUTES =================

app.post('/create-checkout-session', async (req, res) => {
  try {
    const stripe = getStripeInstance();
    const { priceId, planName, userId, credits, customerEmail } = req.body;

    let user = await getUserByUserId(userId);

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: 'price_1S0vfk7ev7V2kfjiiZauwMJx', // $20 for 200 credits
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${FRONTEND}`,
      cancel_url: `${FRONTEND}`,
      // automatic_tax: { enabled: true }, // TODO Enable tax calculation once we have a valid address
      customer_creation: customerEmail ? 'if_required' : 'always',
      customer: user?.stripeCustomerId,
      metadata: {
        planName: planName || 'Credit Package',
        userId: userId || 'anonymous',
        credits: credits || '200',
        purchaseType: 'credits'
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: user ? { name: user.name, email: user.email } : undefined,
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `AI Narration Credits - ${planName || 'Credit Package'}`,
          metadata: {
            planName: planName || 'Credit Package',
            userId: userId || 'anonymous',
            credits: credits || '200',
            purchaseType: 'credits'
          }
        }
      }
    });

    console.log("Checkout Session Created:", session.id);

    // For API calls, return JSON
    if (req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        sessionId: session.id,
        url: session.url,
        customerId: user?.stripeCustomerId
      });
    }

    // For form submissions, redirect
    res.redirect(303, session.url);
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(400).json({ success: false, error: 'Failed to create checkout session' });
  }
});

// ========== USER MANAGEMENT ==========

app.post('/api/v1/create-account', async (req, res) => {
  try {
    const { userId, name, email, address } = req.body;

    let data = { userId, name, email, address};

    const user = await createOrUpdateUser(data);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error creating users:', error);
    res.status(500).json({ error: 'Failed to create users' });
  }
});

app.get('/api/v1/stripe/customers', async (req, res) => {
  try {
    const customers = await getStripeCustomers();
    res.json({ success: true, customers });
  } catch (error) {
    console.error('Error fetching Stripe customers:', error); 
    res.status(500).json({ success: false, error: 'Failed to fetch Stripe customers' });
  }
});

app.delete('/api/v1/stripe/customers/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const result = await deleteUserAndStripeCustomer(customerId);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: `User and Stripe customer ${customerId} deleted successfully`,
                deletedUser: result.deletedUser,
                deletedStripeCustomer: result.deletedStripeCustomer
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: result.error 
            });
        }
    } catch (error) {
        console.error('Error in delete endpoint:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error while deleting customer' 
        });
    }
});


app.delete('/api/v1/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await deleteUserByUserId(userId);
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: `User ${userId} deleted successfully`,
                deletedUser: result.deletedUser,
                deletedStripeCustomer: result.deletedStripeCustomer
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: result.error 
            });
        }
    } catch (error) {
        console.error('Error in delete user endpoint:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error while deleting user' 
        });
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
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎙️  TTS API: http://localhost:${PORT}/api/tts`);
  console.log(`🔊 TTS V1 API: http://localhost:${PORT}/api/v1/tts`);
  console.log(`🎤 Voices API: http://localhost:${PORT}/api/v1/voices`);
  console.log(`📈 Analytics API: http://localhost:${PORT}/api/v1/analytics`);
});

export default app;