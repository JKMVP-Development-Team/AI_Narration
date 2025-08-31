
import {
    UserAccount,
    CreditPurchase,
    UserAddress
} from '@shared/types/user';

import { getUserByUserId, addCreditsToUser, logUserActivity } from './userService';
import { DatabaseService } from './databaseService';
import { Collection } from 'mongodb';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';

export function getStripeInstance() {
    const apiKey = process.env.STRIPE_API_KEY;
    if (!apiKey) {
        throw new Error('STRIPE_API_KEY is not configured in environment variables');
    }
    return require('stripe')(apiKey);
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
            // automatic_tax: { enabled: true }, // TODO Enable tax Update Stripe Business Profile
            customer: user?.stripeCustomerId,
            metadata: {
                planName: 'Credit Package',
                userId: user._id!,
                creditsForPurchase: creditsForPurchase.toString(),
                purchaseType: 'credits',
                userEmail: user.email
            },
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            customer_update: {
                address: 'auto',
                name: 'auto',
                shipping: 'auto'
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


export async function fulfillCheckout(sessionId: string): Promise<boolean> {
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

export async function createStripeCustomer(user: UserAccount, location: UserAddress): Promise<string | null> {
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
            name: user.name,
            email: user.email,
            address: {
                city: location.city,
                country: location.country,
                line1: location.line1,
                line2: location.line2 || '',
                postal_code: location.postal_code,
                state: location.state,
            },
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
        return customers
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