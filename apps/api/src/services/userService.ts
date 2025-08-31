
import {
    UserAccount,
    CreditPurchase,
    UserAddress
} from '@shared/types/user';

import { ObjectId } from 'mongodb';
import { DatabaseService } from './databaseService';
import { getStripeInstance, createStripeCustomer, deleteStripeCustomer, getStripeCustomer } from './stripeService';


export async function createOrUpdateUser(data: {
    userId?: string;
    name: string;
    email: string;
    address: UserAddress;
    stripeCustomerId?: string;
}): Promise<UserAccount> {
    try {
        const db = DatabaseService.getInstance();
        const usersCollection = await db.getCollection('users');

        let existingUser = null;

        existingUser = await usersCollection.findOne({ email: data.email });

        if (!existingUser && data.userId) {
            try {
                existingUser = await usersCollection.findOne({ _id: new ObjectId(data.userId) });
            } catch (error) {
                console.log('Invalid ObjectId provided');
            }
        }

        if (existingUser) {
            console.log(`Found existing user: ${existingUser._id} for email: ${data.email}`);
            const updatedResult = await usersCollection.updateOne(
                { _id: existingUser._id },
                {
                    $set: {
                        name: data.name,
                        email: data.email,
                        updatedAt: new Date()
                    }
                }
            );

            const updatedUser = await usersCollection.findOne({ _id: existingUser._id });

            if (!updatedUser) {
                throw new Error('Failed to retrieve updated user');
            }
            
            
            const user: UserAccount = {
                _id: updatedUser._id.toString(),
                name: updatedUser.name,
                email: updatedUser.email,
                stripeCustomerId: updatedUser.stripeCustomerId,
                credits: updatedUser.credits,
                totalCreditsEverPurchased: updatedUser.totalCreditsEverPurchased,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt,
                lastPurchaseAt: updatedUser.lastPurchaseAt,
                status: updatedUser.status 
            };

            // Find Existing Stripe Customer
            let stripeCustomer = null;

            if (user.stripeCustomerId) {
                stripeCustomer = await getStripeCustomer(user.stripeCustomerId);
            }   

            if (!stripeCustomer) {
                console.log('No Stripe customer found, creating new one...');
                const stripeCustomerId = await createStripeCustomer(user, data.address);
                if (stripeCustomerId) {
                    await usersCollection.updateOne(
                        { _id: updatedUser._id },
                        { $set: { stripeCustomerId } }
                    );
                    user.stripeCustomerId = stripeCustomerId;
                    console.log(`Updated user with new Stripe customer ID: ${stripeCustomerId}`);
                }
            } else {
                console.log('Existing Stripe customer found:', stripeCustomer.id);
            }
                

            await logUserActivity(user._id!, 'user_updated', {
                email: data.email,
                name: data.name,
                hasStripeCustomer: !!user.stripeCustomerId,
                stripeCustomerRecreated: !stripeCustomer && !!user.stripeCustomerId
            });


            return user;
        }

        // CREATE NEW USER (only if no user found by email)
        console.log(`✨ Creating NEW user for email: ${data.email}`);
        
        const newUser = {
            name: data.name,
            email: data.email,
            stripeCustomerId: '',
            credits: 0,
            totalCreditsEverPurchased: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastPurchaseAt: undefined,
            status: 'active' as const
        };

        const result = await usersCollection.insertOne(newUser);
        const userId = result.insertedId.toString();

        console.log(`Inserted new user with MongoDB ID: ${userId}`);

        // Create Stripe customer with the new MongoDB _id
        const userForStripe: UserAccount = {
            _id: userId,
            ...newUser
        };

        console.log('🔄 Creating Stripe customer for new user:', userForStripe);

        const stripeCustomerId = await createStripeCustomer(userForStripe, data.address);
        if (stripeCustomerId) {
            await usersCollection.updateOne(
                { _id: result.insertedId },
                { $set: { stripeCustomerId } }
            );
            userForStripe.stripeCustomerId = stripeCustomerId;
            console.log(`Updated new user with Stripe customer ID: ${stripeCustomerId}`);
        }

        await logUserActivity(userId, 'user_created', {
            email: data.email,
            name: data.name,
            hasStripeCustomer: !!stripeCustomerId
        });

        console.log(`Successfully created new user: ${userId}`);
        return userForStripe;

    } catch (error) {
        console.error('Failed to create or update user:', error);
        throw new Error(`Failed to create or update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}


export async function addCreditsToUser(userId: string, credits: number): Promise<UserAccount | null> {
    try {
        const db = DatabaseService.getInstance();
        const usersCollection = await db.getCollection('users');

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            console.error(`User not found: ${userId}`);
            return null;
        }

        const updatedUser = await usersCollection.findOneAndUpdate(
            { _id: new ObjectId(userId) },
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
            { 
                returnDocument: 'after',
                includeResultMetadata: true
            }
        );

        console.log('📊 MongoDB update result:', {
            found: !!updatedUser,
            hasValue: !!updatedUser?.value,
            ok: updatedUser?.ok,
            modifiedCount: updatedUser?.lastErrorObject?.updatedExisting,
            upserted: updatedUser?.lastErrorObject?.upserted
        });

        const userDocument = updatedUser?.value;

        if (userDocument) {
            console.log('✅ User AFTER update:', {
                _id: userDocument._id,
                credits: userDocument.credits,
                totalCreditsEverPurchased: userDocument.totalCreditsEverPurchased
            });
        } else {
            console.error('❌ No value returned from update operation');
            console.error('Full updatedUser object:', updatedUser);
        }

        if (!userDocument) {
            console.error(`Failed to update user credits for user ${userId}.`);
            return null;
        }


        console.log(`Added ${credits} credits to user ${userId}. New balance: ${userDocument.credits}`);
        return {
            _id: userDocument._id.toString(),
            name: userDocument.name,
            email: userDocument.email,
            stripeCustomerId: userDocument.stripeCustomerId,
            credits: userDocument.credits,
            totalCreditsEverPurchased: userDocument.totalCreditsEverPurchased,
            createdAt: userDocument.createdAt,
            updatedAt: userDocument.updatedAt,
            lastPurchaseAt: userDocument.lastPurchaseAt,
            status: userDocument.status
        };
    } catch (error) {
        console.error('Failed to add credits to user:', error);
        return null;
    }
}

export async function deductCreditsFromUser(userId: string, credits: number): Promise<UserAccount | null> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
        console.error(`User not found: ${userId}`);
        return null;
    }

    if (user.credits < credits) {
        console.error(`Insufficient credits for user ${userId}. Has: ${user.credits}, Needs: ${credits}`);
        return null;
    }

    const updatedUser = await usersCollection.findOneAndUpdate(
        {  _id: new ObjectId(userId) },
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

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) return null;

    const mappedUser: UserAccount = {
        _id: user._id.toString(),
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
        {  _id: new ObjectId(userId) },
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

    const user = await usersCollection.findOne({  _id: new ObjectId(userId) });
    if (!user) return null;

    const purchases = await purchasesCollection
        .find({ userId: userId, status: 'completed' }) 
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

export async function deleteUserAndStripeCustomer(customerId: string): Promise<{
    success: boolean;
    deletedUser?: UserAccount;
    deletedStripeCustomer?: boolean;
    error?: string;
}> {
    try {
        const db = DatabaseService.getInstance();
        const usersCollection = await db.getCollection('users');

        // 1. Find the user first
        let user = await usersCollection.findOne({ stripeCustomerId: customerId });

        if (!user) {
            try {
                user = await usersCollection.findOne({ _id: new ObjectId(customerId) });
            } catch (error) {
                console.log('Invalid ObjectId provided');
            }
        }
        
        if (!user) {
            return {
                success: false,
                error: 'User not found'
            };
        }

        console.log(`Deleting user ${user._id} and Stripe customer ${customerId}`);

        let stripeDeleted = true;

        if (user.stripeCustomerId) {
            stripeDeleted = await deleteStripeCustomer(user.stripeCustomerId);

            if (!stripeDeleted) {
                console.warn('Failed to delete Stripe customer, aborting user deletion');
            } 
        } else {
            console.log('No Stripe customer ID associated with user, skipping Stripe deletion');
        }

        // 3. Delete from our database
        const deleteResult = await usersCollection.deleteOne({ _id: user._id });
        if (deleteResult.deletedCount === 0) {
            console.error('Stripe customer deleted but failed to delete user from database');
            return {
                success: false,
                error: 'Failed to delete user from database (but Stripe customer was deleted)'
            };
        }

        // 4. Log the deletion activity (if the user still existed)
        await logUserActivity(user._id.toString(), 'user_deleted', {
            email: user.email,
            name: user.name,
            stripeCustomerId: customerId,
            deletedAt: new Date().toISOString()
        });

        console.log(`Successfully deleted user ${user._id} and Stripe customer ${customerId}`);

        return {
            success: true,
            deletedUser: {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                stripeCustomerId: user.stripeCustomerId,
                credits: user.credits,
                totalCreditsEverPurchased: user.totalCreditsEverPurchased,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                lastPurchaseAt: user.lastPurchaseAt,
                status: user.status
            },
            deletedStripeCustomer: true
        };

    } catch (error) {
        console.error('Error deleting user and Stripe customer:', error);
        return {
            success: false,
            error: `Failed to delete user and customer: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
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
        const stripe = getStripeInstance();

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