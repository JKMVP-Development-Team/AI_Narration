
import { Router, Request, Response } from 'express';
import { getUserByUserId, deleteUserAndStripeCustomer } from '../services/userService';
import { getStripeInstance, getStripeCustomers } from '../services/stripeService';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const router: Router = Router();

// ========== STRIPE ROUTES =================

router.post('/create-checkout-session', async (req, res) => {
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

router.get('/customers', async (req, res) => {
  try {
    const customers = await getStripeCustomers();
    res.json({ success: true, customers });
  } catch (error) {
    console.error('Error fetching Stripe customers:', error); 
    res.status(500).json({ success: false, error: 'Failed to fetch Stripe customers' });
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