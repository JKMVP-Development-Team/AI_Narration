
import {
    UserAccount,
    CreditPurchase,
    UserAddress
} from '@shared/types/user';

import { DatabaseService } from './databaseService';

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

export async function createOrUpdateUser(data: {
    userId: string;
    name: string;
    email: string;
    address: string;
    stripeCustomerId?: string;
}): Promise<UserAccount> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');

    // Find existing user
    const existingUser = await usersCollection.findOne({ userId: data.userId });


    // Create a UserAccount object
    const user: UserAccount = {
        userId: data.userId,
        name: data.name,
        email: data.email,
        stripeCustomerId: data.stripeCustomerId || existingUser?.stripeCustomerId || '',
        credits: existingUser?.credits || 0,
        totalCreditsEverPurchased: existingUser?.totalCreditsEverPurchased || 0,
        createdAt: existingUser?.createdAt || new Date(),
        updatedAt: new Date(),
        lastPurchaseAt: existingUser?.lastPurchaseAt,
        status: 'active'
    };

    // TODO Parse location into UserAddress
    const location: UserAddress = {
        city: '',
        country: '',
        line1: '',
        postal_code: '',
        state: ''
    };


    // Create Stripe customer if not exists
    if (!user.stripeCustomerId) {
        const stripeCustomerId = await createStripeCustomer(user, location);
        if (stripeCustomerId) {
            user.stripeCustomerId = stripeCustomerId;
        }
    }

    await usersCollection.updateOne(
        { userId: data.userId },
        { $set: user },
        { upsert: true }
    );

    console.log(`User account updated in MongoDB: ${data.userId}`);
    return user;
}

export async function createStripeCustomer(user: UserAccount, location: UserAddress): Promise<string | null> {
    try {
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
                userId: user.userId,
                appCustomerId: user.userId,
                createdAt: user.createdAt.toISOString(),
            }
        })
        console.log(`Created new Stripe customer: ${customer.id}`);
        return customer.id;
    } catch (error) {
        console.error('Failed to create Stripe customer:', error);
        return null;
    }
}

export async function addCreditsToUser(userId: string, credits: number): Promise<UserAccount | null> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');

    const user = await usersCollection.findOne({ userId });
    if (!user) {
        console.error(`User not found: ${userId}`);
        return null;
    }

    const updatedUser = await usersCollection.findOneAndUpdate(
        { userId },
        {
            $inc: {
                credits: credits,
                totalCreditsEverPurchased: credits
            },
            $set: {
                lastPurchaseAt: new Date(),
                updatedAt: new Date()
            }
        },
        { returnDocument: 'after' }
    );

    if (!updatedUser || !updatedUser.value) {
        console.error(`Failed to update user credits for user ${userId}.`);
        return null;
    }

    console.log(`Added ${credits} credits to user ${userId}. New balance: ${updatedUser.value?.credits}`);
    return updatedUser.value as UserAccount;
}

export async function deductCreditsFromUser(userId: string, credits: number): Promise<UserAccount | null> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');
    const user = await usersCollection.findOne({ userId });
    if (!user) {
        console.error(`User not found: ${userId}`);
        return null;
    }

    if (user.credits < credits) {
        console.error(`Insufficient credits for user ${userId}. Has: ${user.credits}, Needs: ${credits}`);
        return null;
    }

    const updatedUser = await usersCollection.findOneAndUpdate(
        { userId },
        {
            $inc: { credits: -credits },
            $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
    );

    if (!updatedUser || !updatedUser.value) {
        console.error(`Failed to update user credits for user ${userId}.`);
        return null;
    }

    console.log(`Deducted ${credits} credits from user ${userId}. New balance: ${updatedUser.value.credits}`);
    return updatedUser.value as UserAccount;
}

export async function getUserByUserId(userId: string): Promise<UserAccount | null> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');

    const user = await usersCollection.findOne({ userId });

    if (!user) return null;

    const mappedUser: UserAccount = {
        userId: user.userId,
        name: user.name,
        email: user.email,
        stripeCustomerId: user.stripeCustomerId,
        credits: user.credits,
        totalCreditsEverPurchased: user.totalCreditsEverPurchased,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastPurchaseAt: user.lastPurchaseAt,
        status: user.status
    };

    return mappedUser;
}


export async function updateUserStatus(userId: string, status: 'active' | 'inactive' | 'suspended'): Promise<UserAccount | null> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');

    const updatedUser = await usersCollection.findOneAndUpdate(
        { userId },
        {
            $set: {
                status,
                updatedAt: new Date()
            }
        },
        { returnDocument: 'after' }
    );

    console.log(`Updated user status for ${userId}: ${status}`);

    if (!updatedUser || !updatedUser.value) {
        console.error(`Failed to update user status for user ${userId}.`);
        return null;
    }

    return updatedUser.value as UserAccount || null;
}

export async function getUserStats(userId: string): Promise<{
    totalPurchases: number;
    totalSpent: number;
    totalCreditsUsed: number;
    averagePurchaseAmount: number;
} | null> {
    const db = DatabaseService.getInstance();
    const purchasesCollection = await db.getCollection('creditPurchases');
    const usersCollection = await db.getCollection('users');

    const user = await usersCollection.findOne({ userId });
    if (!user) return null;

    const purchases = await purchasesCollection
        .find({ userId, status: 'completed' })
        .toArray();

    const totalPurchases = purchases.length;
    const totalSpent = purchases.reduce((sum: number, purchase: any) => sum + (purchase as CreditPurchase).amount, 0);
    const totalCreditsUsed = user.totalCreditsEverPurchased - user.credits;
    const averagePurchaseAmount = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

    return {
        totalPurchases,
        totalSpent,
        totalCreditsUsed,
        averagePurchaseAmount
    };
}

// Analytics helper functions
export async function logUserActivity(userId: string, activity: string, metadata?: any): Promise<void> {
    try {
        const db = DatabaseService.getInstance();
        const user_activity = await db.getCollection('user_activity');

        // Add User activity to the collection
        await user_activity.insertOne({
            userId,
            activity,
            metadata: metadata || {},
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Failed to log user activity:', error);
    }
}

export async function getActiveUsersCount(days: number = 30): Promise<number> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const activeUsers = await usersCollection.countDocuments({
        updatedAt: { $gte: cutoffDate },
        status: 'active'
    });

    return activeUsers;
}

export async function getStripeCustomerTransactions(customerId: string, limit: number = 10): Promise<any[]> {
    try {
        const charges = await stripe.charges.list({
            customer: customerId,
            limit: limit,
            expand: ['data.payment_intent']
        });

        return charges.data.map((charge: any) => ({
            id: charge.id,
            amount: charge.amount,
            currency: charge.currency,
            status: charge.status,
            description: charge.description,
            created: new Date(charge.created * 1000),
            paymentMethod: charge.payment_method_details?.type,
            receiptUrl: charge.receipt_url
        }));
    } catch (error) {
        console.error('Error fetching Stripe transactions:', error);
        return [];
    }
}