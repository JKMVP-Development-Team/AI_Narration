
import express, { Router } from 'express';
import { getStripeInstance, fulfillCheckout } from '../services/stripeService';

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


async function handleCheckoutSessionCompleted(event: any): Promise<void> {
  console.log(`Checkout session ${event.data.object.id} completed!`);
  
  const session = event.data.object;
  if (session.payment_status === 'paid') {
    console.log(`Fulfilling credits for session ${session.id}`);
    try {
      await fulfillCheckout(session.id);
      console.log(`Successfully fulfilled session ${session.id}`);
    } catch (fulfillError) {
      console.error(`Failed to fulfill session ${session.id}:`, fulfillError);
    }
  } else {
    console.log(`Session ${session.id} payment status: ${session.payment_status}`);
  }
}

async function handleAsyncPaymentSucceeded(event: any): Promise<void> {
  console.log(`Async payment succeeded for session ${event.data.object.id}`);
  try {
    await fulfillCheckout(event.data.object.id);
    console.log(`Successfully fulfilled async session ${event.data.object.id}`);
  } catch (fulfillError) {
    console.error(`Failed to fulfill async session ${event.data.object.id}:`, fulfillError);
  }
}


export { router as stripeWebhookRouter };