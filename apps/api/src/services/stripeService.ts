import Stripe from 'stripe';
import {
    UserAccount,
} from '@shared/types/user';

import { UsageEvent } from '@shared/types/meter';
import { getUserByUserId, addCreditsToUser, logUserActivity } from './userService';
import { DatabaseService } from './databaseService';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
let stripeInstance: Stripe | null = null;

const getStripeApiKey = (): string => {
    const apiKey = process.env.STRIPE_API_KEY;
    if (!apiKey) {
        throw new Error('STRIPE_API_KEY is not configured in environment variables');
    }
    return apiKey;
}


export function getStripeInstance(): Stripe {
    if (!stripeInstance) {
        stripeInstance = new Stripe(getStripeApiKey(), {
            apiVersion: '2025-08-27.basil',
            typescript: true
        });
    }
    return stripeInstance;
}


export async function createCheckoutSession(
    user: UserAccount,
    priceId?: any
): Promise<any> {
    try {
        const stripe = getStripeInstance();

        if (!user.stripeCustomerId) {
            throw new Error('User does not have a Stripe customer ID');
        }

        const actualPriceId = priceId?.id || priceId;
        const price = await stripe.prices.retrieve(actualPriceId);
        const creditsPerCent = 10;
        const creditsForPurchase = (price.unit_amount || 0) / 100 * creditsPerCent;

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: actualPriceId,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${FRONTEND}`, // TODO Add Success URL
            cancel_url: `${FRONTEND}`, // TODO Add Cancel URL
            customer: user?.stripeCustomerId,
            metadata: {
                planName: 'Credit Package',
                userId: user._id!,
                creditsForPurchase: creditsForPurchase.toString(),
                purchaseType: 'credits',
                userEmail: user.email
            },
            allow_promotion_codes: true,
            customer_update: {
                name: 'auto',
            },
            invoice_creation: {
                enabled: true,
                invoice_data: {
                description: `AI Narration Credits - Credit Package`,
                    metadata: {
                        planName: 'Credit Package',
                        userId: user._id || 'anonymous',
                        creditsForPurchase: creditsForPurchase.toString(),
                        purchaseType: 'credits'
                    }
                }
            }
        });

        console.log("Checkout Session Created:", session.id);

        return session;
    } catch (error) {
        console.error('Failed to create Stripe checkout session:', error);
        throw error;
    }
}

export async function retrieveCheckoutSession(sessionId: string): Promise<any> {
    try {
        const stripe = getStripeInstance();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        return session;
    } catch (error) {
        console.error('Failed to retrieve Stripe checkout session:', error);
        throw error;
    }
}

export async function expireCheckoutSession(sessionId: string): Promise<any> {
    try {
        const stripe = getStripeInstance();
        const expiredSession = await stripe.checkout.sessions.expire(sessionId);
        return expiredSession;
    } catch (error) {
        console.error('Failed to expire Stripe checkout session:', error);
        throw error;
    }
}


async function fulfillCheckout(sessionId: string): Promise<boolean> {
    try {
        const stripe = getStripeInstance();
        const db = DatabaseService.getInstance()
        const fulfillmentCollection = await db.getCollection('fulfillments');

        const existingFulfillment = await fulfillmentCollection.findOne({ sessionId });
        
        // Check if fulfillment already exists
        if (existingFulfillment) {
            console.log(`Fulfillment already processed for session ${sessionId}`);
            return true;
        }

        // Retrieve the session with expanded line items
        let session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['line_items', 'line_items.data.price.product'],
        });

        console.log(`Session details:`, {
            sessionId: session.id,
            payment_status: session.payment_status,
            metadata: session.metadata,
            hasLineItems: !!session.line_items?.data?.length
        });

        // Only fulfill if the payment was successful
        if (session.payment_status === 'paid') {
            const userId = session.metadata?.userId;

            if (!userId) {
                throw new Error('User ID not found in session metadata');
            }

            console.log(`Fulfilling purchase for user ${userId} for session ${sessionId}`);
            const user = await getUserByUserId(userId);
            if (!user) {
                throw new Error('User not found for fulfillment');
            }

            let totalCredits = 0;
            let totalAmount = 0;

            // Calculate total credits and amount from line items
            if (session.line_items?.data) {
                for (const lineItem of session.line_items.data) {
                    const price = lineItem.price;
                    const quantity = lineItem.quantity || 1;

                    const creditsPerCent = 10;
                    const itemCredits = (price?.unit_amount || 0) / 100 * creditsPerCent * quantity;

                    totalCredits += itemCredits;
                    totalAmount += (price?.unit_amount || 0) * quantity;

                    console.log(`Line item: ${lineItem.description}, Amount: $${(price?.unit_amount || 0) / 100}, Credits: ${itemCredits}`);
                }
            }

            if (totalCredits === 0) {
                throw new Error('No credits to fulfill');
            }

            // Record the fulfillment in the database
            const fulfillmentRecord = {
                sessionId,
                userId,
                totalCredits,
                totalAmount,
                fulfilledAt: new Date(),
                paymentStatus: session.payment_status,
                customerEmail: session.customer_details?.email,
                lineItems: session.line_items?.data?.map((item: any) => ({
                    priceId: item.price?.id,
                    quantity: item.quantity,
                    amount: item.amount_total
                }))
            };

            await fulfillmentCollection.insertOne(fulfillmentRecord);

            // Add credits to the user's account
            const result = await addCreditsToUser(userId, totalCredits);
            
            if (!result) {
                throw new Error('Failed to add credits to user');
            }

            // Log user activity
            await logUserActivity(userId, 'credits_purchased', {
                sessionId,
                creditsAdded: totalCredits,
                amountPaid: totalAmount / 100,
                paymentMethod: 'stripe_checkout'
            });

            console.log(`Fulfillment complete for user ${userId} for session ${sessionId}`);
            return true;
        }
    } catch (error) {
        console.error('Failed to fulfill checkout session:', error);
        throw error;
    }
    return false;
}

export async function getProductById(productId: string): Promise<any | null> {
    try {
        const stripe = getStripeInstance();
        const product = await stripe.products.retrieve(productId);
        return product;
    } catch (error) {
        console.error('Failed to retrieve Stripe product:', error);
        return null;
    }
}

export async function getPriceById(priceId: string): Promise<any | null> {
    try {
        const stripe = getStripeInstance();
        const price = await stripe.prices.retrieve(priceId);
        return price;
    } catch (error) {
        console.error('Failed to retrieve Stripe price:', error);
        return null;
    }
}

export async function createStripeCustomer(user: UserAccount): Promise<string | null> {
    try {
        const stripe = getStripeInstance();

        // Check if customer already exists
        const stripeCustomer = await getStripeCustomer(user.stripeCustomerId);

        if (stripeCustomer) {
            console.log(`Stripe customer already exists: ${user.stripeCustomerId}`);
            return user.stripeCustomerId;
        }

        // TODO Text Validation
        const customer = await stripe.customers.create({
            name: user.firstName + ' ' + user.lastName,
            email: user.email,
            metadata: {
                userId: user._id?.toString() || '',
                createdAt: user.createdAt.toISOString(),
                source: 'AI Narration Platform'
            }
        })
        console.log(`Created new Stripe customer: ${customer.id}`);
        return customer.id;
    } catch (error) {
        console.error('Failed to create Stripe customer:', error);
        return null;
    }
}

export async function getStripeCustomer(customerId: string): Promise<any | null> {
    try {

        if (!customerId) {
            console.warn('No customer ID provided to retrieve Stripe customer');
            return null;
        }

        const stripe = getStripeInstance();
        const customer = await stripe.customers.retrieve(customerId);

        if (customer.deleted) {
            console.warn(`Stripe customer ${customerId} has been deleted`);
            return null;
        }
        return customer;
    } catch (error: any) {
        if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
            console.log('Stripe customer not found:', customerId);
            return null;
        }

        console.error('Failed to retrieve Stripe customer:', error);
        return null;
    }
}

export async function getStripeCustomers(): Promise<any[] | null> {
    try {
        const stripe = getStripeInstance();
        const customers = await stripe.customers.list({ limit: 5 });
        return customers.data
    } catch (error) {
        console.error('Failed to retrieve Stripe customer:', error);
        return null;
    }
}

export async function deleteStripeCustomer(customerId: string): Promise<boolean> {
    try {
        const stripe = getStripeInstance();
        const deleted = await stripe.customers.del(customerId);
        return deleted.deleted || false;
    } catch (error) {
        console.error('Failed to delete Stripe customer:', error);
        return false;
    }
}


export async function reportToStripe(userId: string, usageEvent: UsageEvent): Promise<void> {
    try {
        const stripe = getStripeInstance();
        const user = await getUserByUserId(userId);
        
        if (!user || !user.stripeCustomerId) {
            console.log(`⚠️ No Stripe customer for user ${userId}, skipping Stripe usage report`);
            return;
        }

        await stripe.billing.meterEvents.create({
            event_name: 'tts_generation',
            payload: {
                stripe_customer_id: user.stripeCustomerId,
                value: usageEvent.cost.toString(),
            },
            timestamp: Math.floor(usageEvent.timestamp.getTime() / 1000)
        });

        console.log(`📊 Reported usage to Stripe for customer ${user.stripeCustomerId}`);

    } catch (error) {
        console.error('Failed to report usage to Stripe:', error);
    }
}



// =========== STRIPE WEBHOOK HANDLERS ===========

export async function handleCheckoutSessionCompleted(event: any): Promise<void> {
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

export async function handleAsyncPaymentSucceeded(event: any): Promise<void> {
  console.log(`Async payment succeeded for session ${event.data.object.id}`);
  try {
    await fulfillCheckout(event.data.object.id);
    console.log(`Successfully fulfilled async session ${event.data.object.id}`);
  } catch (fulfillError) {
    console.error(`Failed to fulfill async session ${event.data.object.id}:`, fulfillError);
  }
}
