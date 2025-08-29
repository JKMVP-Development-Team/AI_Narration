
import {
    UserAccount,
    CreditPurchase
} from '@shared/types/user';
import Stripe from 'stripe';
import { MongoAnalyticsLogger } from '../Utilities/AnalyticsLogger';
import { DatabaseService } from './databaseService';


export async function createOrUpdateUser(data: {
    userId: string;
    email: string;
    stripeCustomerId?: string;
}): Promise<UserAccount> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');
    
    const existingUser = await usersCollection.findOne({ userId: data.userId });
    
    const user: UserAccount = {
        userId: data.userId,
        email: data.email,
        stripeCustomerId: data.stripeCustomerId ?? '',
        credits: existingUser?.credits || 0,
        totalCreditsEverPurchased: existingUser?.totalCreditsEverPurchased || 0,
        createdAt: existingUser?.createdAt || new Date(),
        updatedAt: new Date(),
        lastPurchaseAt: existingUser?.lastPurchaseAt,
        status: 'active'
    };

    await usersCollection.updateOne(
        { userId: data.userId },
        { $set: user },
        { upsert: true }
    );

    console.log(`User account updated in MongoDB: ${data.userId}`);
    return user;
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

    console.log(`Deducted ${credits} credits from user ${userId}. New balance: ${updatedUser.value?.credits}`);
    return updatedUser.value as UserAccount;
}


export async function getUserByUserId(userId: string): Promise<UserAccount | null> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');
    
    const user = await usersCollection.findOne({ userId });
    return user as UserAccount || null;
}

export async function getUserByEmail(email: string): Promise<UserAccount | null> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');
    
    const user = await usersCollection.findOne({ email });
    return user as UserAccount || null;
}

export async function getUserByCustomerId(customerId: string): Promise<UserAccount | null> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');
    
    const user = await usersCollection.findOne({ stripeCustomerId: customerId });
    return user as UserAccount || null;
}


export async function recordCreditPurchase(data: {
    sessionId: string;
    userId: string;
    stripeCustomerId: string;
    credits: number;
    amount: number;
    currency: string;
    planName: string;
}): Promise<CreditPurchase> {
    const db = DatabaseService.getInstance();
    const purchasesCollection = await db.getCollection('creditPurchases');
    
    const purchase: CreditPurchase = {
        purchaseId: `${data.userId}-${data.sessionId}`,
        userId: data.userId,
        stripeCustomerId: data.stripeCustomerId,
        amount: data.amount,
        credits: data.credits,
        currency: data.currency,
        stripeSessionId: data.sessionId,
        stripePaymentIntentId: '', // TODO To be updated when payment intent is known
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed' // Assuming completed for simplicity; could be 'pending' initially
    };

    await purchasesCollection.insertOne(purchase);
    console.log(`Recorded credit purchase in MongoDB: ${purchase.purchaseId}`);
    return purchase;
}



export async function getUserPurchaseHistory(userId: string): Promise<CreditPurchase[]> {
    const db = DatabaseService.getInstance();
    const purchasesCollection = await db.getCollection('creditPurchases');
    
    const purchases = await purchasesCollection
        .find({ userId })
        .sort({ purchaseDate: -1 })
        .toArray();
    
    return purchases as CreditPurchase[];
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

    console.log(`🔄 Updated user status for ${userId}: ${status}`);
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
    const totalSpent = purchases.reduce((sum: number, purchase: CreditPurchase) => sum + purchase.amount, 0);
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