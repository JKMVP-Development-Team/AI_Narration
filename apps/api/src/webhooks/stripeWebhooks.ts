
import express, { Router } from 'express';
import { getStripeInstance, handleAsyncPaymentSucceeded, handleCheckoutSessionCompleted } from '../services/stripeService';

const router: Router = express.Router();

// Webhook to handle Stripe events
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripeInstance();
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;


  if (!endpointSecret) {
    return res.status(400).send('Webhook Error: Missing webhook secret');
  }

  try {
    let event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);


    console.log(`🔔 Webhook received: ${event.type} [${event.id}]`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event);
        break;
        
      case 'checkout.session.async_payment_succeeded':
        await handleAsyncPaymentSucceeded(event);
        break;
        
      case 'payment_intent.succeeded':
        console.log(`PaymentIntent ${event.data.object.id} succeeded`);
        break;
        
      case 'charge.succeeded':
        console.log(`Charge ${event.data.object.id} succeeded`);
        break;
        
      case 'charge.updated':
        console.log(`Charge ${event.data.object.id} updated`);
        break;
        
      case 'payment_intent.created':
        console.log(`PaymentIntent ${event.data.object.id} created`);
        break;
        
    }

  
    res.status(200).json({ received: true, eventType: event.type });
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});



export { router as stripeWebhookRouter };