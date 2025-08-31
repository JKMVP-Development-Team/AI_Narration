
import { Router } from 'express';
import { getUserByUserId, deleteUserAndStripeCustomer } from '../services/userService';
import { expireCheckoutSession, getStripeCustomers, createCheckoutSession, getPriceById, retrieveCheckoutSession} from '../services/stripeService';

const router: Router = Router();


// ========== STRIPE ROUTES =================

// You can only checkout out if you have an account (stripe customer ID)
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userId} = req.body;
    
    let user = await getUserByUserId(userId);
    let price = await getPriceById(priceId);

    if (!user) {
        throw new Error('User not found');
    }

    let session = await createCheckoutSession(user, price);

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

router.get('/retrieve-checkout-session', async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (typeof sessionId !== 'string') {
      throw new Error('Invalid sessionId');
    }
    const session = await retrieveCheckoutSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    res.json({ success: true, session });
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve checkout session' });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const customers = await getStripeCustomers();
    res.json({ success: true, customers });
  } catch (error) {
    console.error('Error fetching Stripe customers:', error); 
    res.status(500).json({ success: false, error: 'Failed to fetch Stripe customers' });
  }
});

router.post('/expire-checkout-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const expiredSession = await expireCheckoutSession(sessionId);
    
    res.json({ success: true, expiredSession });
  } catch (error) {
    console.error('Error expiring checkout session:', error);
    res.status(500).json({ success: false, error: 'Failed to expire checkout session' });
  }
});

router.delete('/customers/:customerId', async (req, res) => {
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




export { router as stripeRoutes };