import express from 'express';
import { Webhook } from 'svix';
import { 
    handleClerkUserCreated,
    handleClerkUserSignedIn,
    handleClerkUserUpdated,
    handleClerkUserDeleted
} from '../services/userService';

const router = express.Router();

// Middleware to get raw body for webhook verification
router.use('/clerk', express.raw({ type: 'application/json' }));

router.post('/clerk', async (req, res) => {
    try {
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
        
        if (!WEBHOOK_SECRET) {
            throw new Error('CLERK_WEBHOOK_SECRET is not set');
        }

        // Get headers for verification
        const headers = req.headers;
        const payload = req.body;

        // Verify webhook signature
        const wh = new Webhook(WEBHOOK_SECRET);
        let evt;

        try {
            evt = wh.verify(payload, headers as any);
        } catch (err) {
            console.error('Webhook verification failed:', err);
            return res.status(400).json({ error: 'Webhook verification failed' });
        }

        // Handle the webhook event
        const { type, data } = evt as { type: string; data: any };
        
        console.log(`📨 Received Clerk webhook: ${type}`);

        switch (type) {
            case 'user.created':
                await handleClerkUserCreated(data.id, data);
                console.log(`✅ User created: ${data.id}`);
                break;
                
            case 'session.created':
                // User signed in
                await handleClerkUserSignedIn(data.user_id, data);
                console.log(`✅ User signed in: ${data.user_id}`);
                break;
                
            case 'user.updated':
                await handleClerkUserUpdated(data.id, data);
                console.log(`✅ User updated: ${data.id}`);
                break;
                
            case 'user.deleted':
                await handleClerkUserDeleted(data.id);
                console.log(`✅ User deleted: ${data.id}`);
                break;
                
            default:
                console.log(`⚠️ Unhandled webhook type: ${type}`);
        }

        res.status(200).json({ success: true, type });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as clerkWebhookRouter };