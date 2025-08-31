
import {
    UserAccount,
    CreditPurchase,
} from '@shared/types/user';

import { ObjectId } from 'mongodb';
import { DatabaseService } from './databaseService';
import { getStripeInstance, createStripeCustomer, deleteStripeCustomer, getStripeCustomer } from './stripeService';


export async function createOrUpdateUser(data: {
    clerkId?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    stripeCustomerId?: string;
    userId?: string;
}): Promise<UserAccount> {
    try {
        const db = DatabaseService.getInstance();
        const usersCollection = await db.getCollection('users');

        let existingUser = null;

        // Try to find by clerkId first, then email, then userId
        if (data.clerkId) {
            existingUser = await usersCollection.findOne({ clerkId: data.clerkId });
        }
        
        if (!existingUser) {
            existingUser = await usersCollection.findOne({ email: data.email });
        }

        if (!existingUser && data.userId) {
            try {
                existingUser = await usersCollection.findOne({ _id: new ObjectId(data.userId) });
            } catch (error) {
                console.log('Invalid ObjectId provided');
            }
        }

        if (existingUser) {
            console.log(`Found existing user: ${existingUser._id} for email: ${data.email}`);
            
            // Prepare update data
            const updateData: any = {
                email: data.email,
                updatedAt: new Date()
            };

            if (data.firstName || data.lastName) {
                updateData.firstName = data.firstName;
                updateData.lastName = data.lastName;
            } 

            if (data.clerkId) {
                updateData.clerkId = data.clerkId;
            }

            const updatedResult = await usersCollection.updateOne(
                { _id: existingUser._id },
                { $set: updateData }
            );

            const updatedUser = await usersCollection.findOne({ _id: existingUser._id });

            if (!updatedUser) {
                throw new Error('Failed to retrieve updated user');
            }
            
            
            const user: UserAccount = {
                _id: updatedUser._id.toString(),
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                clerkId: updatedUser.clerkId,
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
                const stripeCustomerId = await createStripeCustomer(user);
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
                firstName: data.firstName,
                lastName: data.lastName,
                hasStripeCustomer: !!user.stripeCustomerId,
                stripeCustomerRecreated: !!(!stripeCustomer && user.stripeCustomerId)
            });


            return user;
        }

        // CREATE NEW USER (only if no user found by email)
        console.log(`✨ Creating NEW user for email: ${data.email}`);
        
        const newUser = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            clerkId: data.clerkId,
            stripeCustomerId: '',
            credits: 100, // Default free credits
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
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            clerkId: newUser.clerkId || '',
            stripeCustomerId: '',
            credits: newUser.credits,
            totalCreditsEverPurchased: newUser.totalCreditsEverPurchased,
            createdAt: newUser.createdAt,
            updatedAt: newUser.updatedAt,
            lastPurchaseAt: newUser.lastPurchaseAt,
            status: newUser.status
        };

        console.log('🔄 Creating Stripe customer for new user:', userForStripe);

        const stripeCustomerId = await createStripeCustomer(userForStripe);
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
            firstName: data.firstName,
            lastName: data.lastName,
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
            firstName: userDocument.firstName,
            lastName: userDocument.lastName,
            clerkId: userDocument.clerkId,
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
        { 
            returnDocument: 'after',
            includeResultMetadata: true
         }
    );

    const userDocument = updatedUser?.value;

    if (userDocument) {
        console.log('User AFTER update:', {
            _id: userDocument._id,
            credits: userDocument.credits,
            totalCreditsEverPurchased: userDocument.totalCreditsEverPurchased
        });
    } else {
        console.error('No value returned from update operation');
        console.error('Full updatedUser object:', updatedUser);
    }

    if (!userDocument) {
        console.error(`Failed to update user credits for user ${userId}.`);
        return null;
    }

    console.log(`Deducted ${credits} credits from user ${userId}. New balance: ${userDocument.value.credits}`);

        return {
            _id: userDocument._id.toString(),
            firstName: userDocument.firstName,
            lastName: userDocument.lastName,
            clerkId: userDocument.clerkId,
            email: userDocument.email,
            stripeCustomerId: userDocument.stripeCustomerId,
            credits: userDocument.credits,
            totalCreditsEverPurchased: userDocument.totalCreditsEverPurchased,
            createdAt: userDocument.createdAt,
            updatedAt: userDocument.updatedAt,
            lastPurchaseAt: userDocument.lastPurchaseAt,
            status: userDocument.status
        };
}

export async function getUserByUserId(userId: string): Promise<UserAccount | null> {
    const db = DatabaseService.getInstance();
    const usersCollection = await db.getCollection('users');

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) return null;

    const mappedUser: UserAccount = {
        _id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        clerkId: user.clerkId,
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

    return {
        _id: updatedUser.value._id.toString(),
        firstName: updatedUser.value.firstName,
        lastName: updatedUser.value.lastName,
        clerkId: updatedUser.value.clerkId,
        email: updatedUser.value.email,
        stripeCustomerId: updatedUser.value.stripeCustomerId,
        credits: updatedUser.value.credits,
        totalCreditsEverPurchased: updatedUser.value.totalCreditsEverPurchased,
        createdAt: updatedUser.value.createdAt,
        updatedAt: updatedUser.value.updatedAt,
        lastPurchaseAt: updatedUser.value.lastPurchaseAt,
        status: updatedUser.value.status
    }
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
                firstName: user.firstName,
                lastName: user.lastName,
                clerkId: user.clerkId,
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

// ========== CLERK WEBHOOK HANDLERS ==========

/**
 * Handle Clerk user creation webhook
 */
export async function handleClerkUserCreated(clerkUserId: string, userData: any): Promise<UserAccount> {
    try {
        const email = userData.email_addresses?.[0]?.email_address;
        const firstName = userData.first_name;
        const lastName = userData.last_name;

        if (!email) {
            throw new Error('User email is required');
        }

        console.log(`📝 Clerk user created: ${email}`);

        // Use your existing createOrUpdateUser function
        const user = await createOrUpdateUser({
            clerkId: clerkUserId,
            email,
            firstName,
            lastName,
        });

        await logUserActivity(user._id!, 'clerk_user_created', {
            email,
            firstName,
            lastName,
            clerkId: clerkUserId,
        });

        return user;

    } catch (error) {
        console.error('Error handling Clerk user creation:', error);
        throw error;
    }
}

/**
 * Handle Clerk user sign in webhook
 */
export async function handleClerkUserSignedIn(clerkUserId: string, userData: any): Promise<UserAccount> {
    try {
        const email = userData.email_addresses?.[0]?.email_address || userData.email_address;

        console.log(`🔐 Clerk user signed in: ${email}`);

        // Use your existing createOrUpdateUser - it handles both create and update
        const user = await createOrUpdateUser({
            clerkId: clerkUserId,
            email,
            firstName: userData.first_name,
            lastName: userData.last_name,
        });

        await logUserActivity(user._id!, 'clerk_user_signed_in', {
            email,
            clerkId: clerkUserId,
        });

        return user;

    } catch (error) {
        console.error('Error handling Clerk user sign in:', error);
        throw error;
    }
}

/**
 * Handle Clerk user updates webhook
 */
export async function handleClerkUserUpdated(clerkUserId: string, userData: any): Promise<UserAccount> {
    try {
        const email = userData.email_addresses?.[0]?.email_address;

        console.log(`📝 Clerk user updated: ${email}`);

        // Use your existing createOrUpdateUser function
        const user = await createOrUpdateUser({
            clerkId: clerkUserId,
            email,
            firstName: userData.first_name,
            lastName: userData.last_name,
        });

        await logUserActivity(user._id!, 'clerk_user_updated', {
            email,
            firstName: userData.first_name,
            lastName: userData.last_name,
            clerkId: clerkUserId,
        });

        return user;

    } catch (error) {
        console.error('Error handling Clerk user update:', error);
        throw error;
    }
}

/**
 * Handle Clerk user deletion webhook
 */
export async function handleClerkUserDeleted(clerkUserId: string): Promise<void> {
    try {
        console.log(`🗑️ Clerk user deleted: ${clerkUserId}`);

        // Find user by clerkId
        const user = await getUserByClerkId(clerkUserId);
        if (!user) {
            console.log('User not found for deletion');
            return;
        }

        await logUserActivity(user._id!, 'clerk_user_deleted', {
            clerkId: clerkUserId,
            email: user.email,
        });

        // Use your existing deletion function
        if (user.stripeCustomerId) {
            await deleteUserAndStripeCustomer(user.stripeCustomerId);
        } else {
            await deleteUserAndStripeCustomer(user._id!);
        }

    } catch (error) {
        console.error('Error handling Clerk user deletion:', error);
        throw error;
    }
}

/**
 * Get user by Clerk ID
 */
export async function getUserByClerkId(clerkId: string): Promise<UserAccount | null> {
    try {
        const db = DatabaseService.getInstance();
        const usersCollection = await db.getCollection('users');
        const user = await usersCollection.findOne({ clerkId });
        
        if (!user) return null;

        return {
            _id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            clerkId: user.clerkId,
            stripeCustomerId: user.stripeCustomerId,
            credits: user.credits,
            totalCreditsEverPurchased: user.totalCreditsEverPurchased,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastPurchaseAt: user.lastPurchaseAt,
            status: user.status
        };
    } catch (error) {
        console.error('Error getting user by Clerk ID:', error);
        return null;
    }
}