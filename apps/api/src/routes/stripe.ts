
import { Router, Request, Response, response } from 'express';
import { getUserByUserId, deleteUserAndStripeCustomer } from '../services/userService';
import { expireCheckoutSession, getStripeCustomers, createCheckoutSession, getPriceById, getStripeInstance, fulfillCheckout } from '../services/stripeService';

const router: Router = Router();
const bodyParser = require('body-parser');


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

// Webhook to handle Stripe events
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripeInstance();
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;


  try {
    let event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);


    switch (event.type) {
      case event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded':
        console.log(`Checkout session ${event.data.object.id} completed!`);
        break;
      case event.type === 'payment_intent.succeeded':
        fulfillCheckout(event.data.object.id);
        break;
    }
  
    res.status(200).json({ received: true });
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error}`);
  }
});

export { router as stripeRoutes };