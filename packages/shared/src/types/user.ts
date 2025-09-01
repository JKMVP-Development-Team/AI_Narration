
export interface UserAccount {
    _id?: string;
    name: string;
    email: string;
    stripeCustomerId: string;
    credits: number;
    totalCreditsEverPurchased: number;
    createdAt: Date;
    updatedAt: Date;
    lastPurchaseAt?: Date;
    status: 'active' | 'inactive' | 'suspended';
}

export interface UserAddress {
    city: string;
    country: string;
    line1: string;
    line2?: string;
    postal_code: string;
    state: string;
}
export interface CreditPurchase {
    _id?: string;
    userId: string;
    stripeCustomerId: string;
    amount: number; // in cents
    credits: number;
    currency: string;
    stripeSessionId: string;
    stripePaymentIntentId?: string;
    createdAt: Date;
    updatedAt: Date;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
}

