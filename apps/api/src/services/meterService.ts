import { UsageEvent, MeteringResult } from '@shared/types/meter';
import Stripe from 'stripe';
import { getStripeInstance, reportToStripe } from './stripeService';
import { getUserByUserId, deductCreditsFromUser } from './userService';
import { MongoAnalyticsLogger } from '../Utilities/AnalyticsLogger';

export class MeterService {
    private logger: any;

    constructor() {
        this.logger = new MongoAnalyticsLogger();
    }


    calculateTTSCredits(textLength: number, voiceModel: string = 'standard', quality: string = 'standard'): number {
        
        let baseCredits = Math.ceil(textLength / 100); // 1 credit per 100 characters

        // TODO Add Multipliers based on voiceModel and quality

        // TODO Calculate cost based on credits and pricing tiers

        return Math.max(baseCredits, 1);
    }

    async checkUserCredits(userId: string, requiredCredits: number): Promise<{ hasCredits: boolean; currentCredits: number }> {
        try {
            const user = await getUserByUserId(userId);
            
            if (!user) {
                throw new Error(`User not found: ${userId}`);
            }

            const currentCredits = user.credits || 0;
            const hasCredits = currentCredits >= requiredCredits;

            console.log(`💳 Credit check for user ${userId}: ${currentCredits} available, ${requiredCredits} required`);

            return {
                hasCredits,
                currentCredits
            };
        } catch (error) {
            console.error('Error checking user credits:', error);
            throw error;
        }
    }

    async meterTTSUsage(userId: string, textLength: number, agentId?: string, agentName?: string, voiceModel: string = 'standard', quality: string = 'standard'): Promise<MeteringResult> {
        try {
            console.log(`📊 Starting TTS metering for user ${userId}`);
            
            // Calculate required credits
            const requiredCredits = this.calculateTTSCredits(textLength, voiceModel, quality);
            
            console.log(`💰 TTS cost calculation:`, {
                textLength,
                voiceModel,
                quality,
                requiredCredits
            });

            // Check if user has sufficient credits
            const creditCheck = await this.checkUserCredits(userId, requiredCredits);
            
            if (!creditCheck.hasCredits) {
                console.log(`❌ Insufficient credits for user ${userId}: ${creditCheck.currentCredits} < ${requiredCredits}`);
                
                return {
                    success: false,
                    creditsDeducted: 0,
                    remainingCredits: creditCheck.currentCredits,
                    error: `Insufficient credits. Required: ${requiredCredits}, Available: ${creditCheck.currentCredits}`
                };
            }

            // Create usage event
            const usageEvent: UsageEvent = {
                userId,
                eventType: 'tts_generation',
                quantity: 1,
                metadata: {
                    agentId,
                    agentName,
                    textLength,
                    voiceModel,
                    quality
                },
                cost: requiredCredits,
                timestamp: new Date()
            };

            // Record usage in database
            const usageEventId = await this.logger.recordUsageEvent(usageEvent);

            const updatedUser = await deductCreditsFromUser(userId, requiredCredits);
            
            if (!updatedUser) {
                throw new Error('Failed to deduct credits from user account');
            }

            await reportToStripe(userId, usageEvent);

            const result: MeteringResult = {
                success: true,
                creditsDeducted: requiredCredits,
                remainingCredits: updatedUser.credits,
                usageEventId
            };

            console.log(`✅ TTS metering successful:`, result);

            return result;

        } catch (error) {
            console.error('TTS metering error:', error);
            
            return {
                success: false,
                creditsDeducted: 0,
                remainingCredits: 0,
                error: error instanceof Error ? error.message : 'Unknown metering error'
            };
        }
    }
}

export const meterService = new MeterService();