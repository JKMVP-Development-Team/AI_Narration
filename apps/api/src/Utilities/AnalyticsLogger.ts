import { MongoClient, Collection } from 'mongodb'
import { IAnalyticsLogger, SynthesisMetrics, UserUsageStats, UserDailyUsageDocument } from '@shared/types/logger'
import { DatabaseService } from '../services/databaseService'
import { ObjectId } from 'mongodb'
import { UsageEvent } from '@shared/types/meter'
import Stripe from 'stripe'
import { getStripeInstance } from '../services/stripeService'


export class MongoAnalyticsLogger implements IAnalyticsLogger {
  private client: MongoClient | null = null
  private analyticsCollection: Collection | null = null
  private userUsageCollection: Collection | null = null
  private stripe: Stripe;

  constructor() {
    this.stripe = getStripeInstance();
    this.connect()

  }

  private async connect(): Promise<void> {
    try {
      const db = DatabaseService.getInstance()
      this.analyticsCollection = await db.getCollection('tts_analytics')
      this.userUsageCollection = await db.getCollection('user_daily_usage')
      
      await this.createIndexes()
      
      console.log(`✅ Connected to MongoDB analytics`)
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error)
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.analyticsCollection || !this.userUsageCollection) return

    try {
      await this.analyticsCollection.createIndex({ userId: 1, timestamp: -1 })
      await this.analyticsCollection.createIndex({ timestamp: -1 })
      await this.analyticsCollection.createIndex({ voiceId: 1 })
      await this.analyticsCollection.createIndex({ success: 1 })



      await this.userUsageCollection.createIndex({ userId: 1, date: -1 }, { unique: true })
      await this.userUsageCollection.createIndex({ date: -1 })

      console.log('Analytics indexes created successfully')
    } catch (error) {
      console.warn('Failed to create analytics indexes:', error)
    }
  }

  // ============ Public Query Methods =============
  async getUserDailyStats(userId: string, date: string): Promise<UserUsageStats | null> {
    if (!this.userUsageCollection) return null

    try {
      const document = await this.userUsageCollection.findOne({ userId, date }) as UserDailyUsageDocument | null
      return document ? this.mapToUserUsageStats(document) : null
    } catch (error) {
      console.error('Failed to get user daily stats:', error)
      return null
    }
  }

  async getUserMonthlyStats(userId: string, year: number, month: number): Promise<UserUsageStats[]> {
    if (!this.userUsageCollection) return []

    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`

      const documents = await this.userUsageCollection
        .find({ 
          userId, 
          date: { $gte: startDate, $lte: endDate } 
        })
        .sort({ date: 1 })
        .toArray()

      return documents.map(doc => this.mapToUserUsageStats(doc as unknown as UserDailyUsageDocument))
    } catch (error) {
      console.error('Failed to get user monthly stats:', error)
      return []
    }
  }

  async updateUserUsage(userId: string, metrics: SynthesisMetrics): Promise<void> {
    if (!this.userUsageCollection) return

    const date = metrics.timestamp.toISOString().split('T')[0] // YYYY-MM-DD

    try {
      await this.userUsageCollection.updateOne(
        { userId, date },
        {
          $inc: {
            totalRequests: 1,
            totalCharacters: metrics.charactersProcessed,
            totalAudioDuration: metrics.audioDurationSeconds,
            totalProcessingTime: metrics.processingTimeMs
          },
          $addToSet: {
            voicesUsed: metrics.voiceId,
            modelsUsed: metrics.modelId
          },
          $set: {
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      )
    } catch (error) {
      console.error('Failed to update user usage:', error)
    }
  }

  async getUserUsageSummaryStats(userId: string, startDate?: Date, endDate?: Date): Promise<{
      userId: string;
      dateRange: { start?: Date; end?: Date };
      totalRequests: number;
      totalCharacters: number;
      totalCreditsUsed: number;
      eventsByAgent: Record<string, number>;
      eventsByVoiceModel: Record<string, number>;
  }> {
      try {
          const db = DatabaseService.getInstance();
          const usageCollection = await db.getCollection('usage_events');

          const query: any = { userId };
          
          if (startDate || endDate) {
              query.timestamp = {};
              if (startDate) query.timestamp.$gte = startDate;
              if (endDate) query.timestamp.$lte = endDate;
          }

          const usageEvents = await usageCollection.find(query).toArray();

          return {
              userId,
              dateRange: { start: startDate, end: endDate },
              totalRequests: usageEvents.length,
              totalCharacters: usageEvents.reduce((sum, event) => sum + (event.metadata?.textLength || 0), 0),
              totalCreditsUsed: usageEvents.reduce((sum, event) => sum + (event.cost || 0), 0),
              eventsByAgent: usageEvents.reduce((acc, event) => {
                  const agentName = event.metadata?.agentName || 'Unknown';
                  acc[agentName] = (acc[agentName] || 0) + 1;
                  return acc;
              }, {} as Record<string, number>),
              eventsByVoiceModel: usageEvents.reduce((acc, event) => {
                  const voiceModel = event.metadata?.voiceModel || 'standard';
                  acc[voiceModel] = (acc[voiceModel] || 0) + 1;
                  return acc;
              }, {} as Record<string, number>)
          };

      } catch (error) {
          console.error('Failed to get usage summary stats:', error);
          throw error;
      }
  }


  async recordUsageEvent(usageEvent: UsageEvent): Promise<string> {
        try {
            const db = DatabaseService.getInstance();
            const usageCollection = await db.getCollection('usage_events');

            const result = await usageCollection.insertOne({
                ...usageEvent,
                _id: new ObjectId()
            });

            console.log(`📝 Recorded usage event: ${result.insertedId}`);
            return result.insertedId.toString();

        } catch (error) {
            console.error('Failed to record usage event:', error);
            throw error;
        }
    }



  async getTopUsers(days: number = 30, limit: number = 10): Promise<any[]> {
    if (!this.userUsageCollection) return []

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceDate = since.toISOString().split('T')[0]

    try {
      return await this.userUsageCollection.aggregate([
        { $match: { date: { $gte: sinceDate } } },
        {
          $group: {
            _id: '$userId',
            totalRequests: { $sum: '$totalRequests' },
            totalCharacters: { $sum: '$totalCharacters' },
            totalAudioDuration: { $sum: '$totalAudioDuration' }
          }
        },
        { $sort: { totalCharacters: -1 } },
        { $limit: limit }
      ]).toArray()
    } catch (error) {
      console.error('Failed to get top users:', error)
      return []
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close()
      console.log('📴 MongoDB analytics connection closed')
    }
  }


  //============ Private Helpers =============
  private mapToUserUsageStats(document: UserDailyUsageDocument): UserUsageStats {
    return {
      userId: document.userId,
      date: document.date,
      totalRequests: document.totalRequests,
      totalCharacters: document.totalCharacters,
      totalAudioDuration: document.totalAudioDuration,
      totalProcessingTime: document.totalProcessingTime,
      voicesUsed: document.voicesUsed,
      modelsUsed: document.modelsUsed,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    }
  }

}