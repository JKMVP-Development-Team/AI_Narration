
import {
    UserAccount,
    CreditPurchase,
    UserAddress
} from '@shared/types/user';


export function getStripeInstance() {
    const apiKey = process.env.STRIPE_API_KEY;
    if (!apiKey) {
        throw new Error('STRIPE_API_KEY is not configured in environment variables');
    }
    return require('stripe')(apiKey);
}

export async function createStripeCustomer(user: UserAccount, location: UserAddress): Promise<string | null> {
    try {
        const stripe = getStripeInstance();

        if (user.stripeCustomerId) {
            const existingCustomer = await stripe.customers.retrieve(user.stripeCustomerId);

            if (!existingCustomer.deleted) {
                console.log(`Stripe customer already exists: ${user.stripeCustomerId}`);
                return user.stripeCustomerId;
            }
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