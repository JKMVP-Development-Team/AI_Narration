import { MongoClient, Db, Collection } from 'mongodb'
import { IAnalyticsLogger, SynthesisMetrics, UserUsageStats, TtsAnalyticsDocument, ErrorAnalyticsDocument, UserDailyUsageDocument } from '../../Interfaces'
import { AudioAnalyzer } from './AudioAnalyzer'
import { DatabaseService } from '@api/services/databaseService'


export class MongoAnalyticsLogger implements IAnalyticsLogger {
  private client: MongoClient | null = null
  private db: Db | null = null
  private analyticsCollection: Collection<TtsAnalyticsDocument> | null = null
  private errorCollection: Collection<ErrorAnalyticsDocument> | null = null
  private userUsageCollection: Collection<UserDailyUsageDocument> | null = null
  private isConnected = false

  constructor() {
    this.connect()
  }

  private async connect(): Promise<void> {
    try {
      const db = DatabaseService.getInstance()
      this.analyticsCollection = await db.getCollection('tts_analytics')
      this.errorCollection = await db.getCollection('tts_errors')
      this.userUsageCollection = await db.getCollection('user_daily_usage')
      
      await this.createIndexes()
      
      this.isConnected = true
      console.log(`✅ Connected to MongoDB analytics`)
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error)
      this.isConnected = false
    }
  }

  private async createIndexes(): Promise<void> {
    if (!this.analyticsCollection || !this.errorCollection || !this.userUsageCollection) return

    try {
      await this.analyticsCollection.createIndex({ userId: 1, timestamp: -1 })
      await this.analyticsCollection.createIndex({ timestamp: -1 })
      await this.analyticsCollection.createIndex({ voiceId: 1 })
      await this.analyticsCollection.createIndex({ success: 1 })

      await this.errorCollection.createIndex({ timestamp: -1 })
      await this.errorCollection.createIndex({ userId: 1, timestamp: -1 })
      await this.errorCollection.createIndex({ level: 1 })

      await this.userUsageCollection.createIndex({ userId: 1, date: -1 }, { unique: true })
      await this.userUsageCollection.createIndex({ date: -1 })

      console.log('Analytics indexes created successfully')
    } catch (error) {
      console.warn('Failed to create analytics indexes:', error)
    }
  }

  //============ Public Logging Methods =============
  async logSynthesis(metrics: SynthesisMetrics): Promise<void> {
    if (!this.isConnected || !this.analyticsCollection) {
      console.warn('⚠️ MongoDB not connected, skipping analytics storage')
      return
    }

    try {
      const requestId = this.generateRequestId()
      const audioLengthBytes = this.estimateAudioBytes(metrics.audioDurationSeconds)
      const efficiencyRatio = this.calculateEfficiency(metrics.audioDurationSeconds, metrics.processingTimeMs)

      const document: TtsAnalyticsDocument = {
        userId: metrics.userId,
        timestamp: metrics.timestamp,
        charactersRequested: metrics.charactersRequested,
        charactersProcessed: metrics.charactersProcessed,
        audioDurationSeconds: metrics.audioDurationSeconds,
        audioLengthBytes,
        voiceId: metrics.voiceId,
        modelId: metrics.modelId,
        processingTimeMs: metrics.processingTimeMs,
        efficiencyRatio,
        requestId,
        success: true
      }

      await this.analyticsCollection.insertOne(document)

      await this.updateUserUsage(metrics.userId, metrics)

      console.log(`TTS [${metrics.userId}]: ${metrics.charactersProcessed} chars → ${metrics.audioDurationSeconds.toFixed(2)}s audio (${metrics.processingTimeMs}ms)`)
      
    } catch (error) {
      console.error('Failed to save analytics to MongoDB:', error)
    }
  }

  async logError(error: string, context: any): Promise<void> {
    console.error('TTS Error:', error, context)

    if (!this.isConnected || !this.errorCollection) {
      return
    }

    try {
      const document: ErrorAnalyticsDocument = {
        userId: context?.userId,
        timestamp: new Date(),
        error,
        context,
        level: 'error',
        service: this.determineService(context)
      }

      await this.errorCollection.insertOne(document)
    } catch (mongoError) {
      console.error('Failed to save error to MongoDB:', mongoError)
    }
  }

  // ============ Public Query Methods =============
  async getUserDailyStats(userId: string, date: string): Promise<UserUsageStats | null> {
    if (!this.userUsageCollection) return null

    try {
      const document = await this.userUsageCollection.findOne({ userId, date })
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

      return documents.map(this.mapToUserUsageStats)
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

  async getUserUsageSummary(userId: string, days: number = 30): Promise<any> {
    if (!this.userUsageCollection) return null

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceDate = since.toISOString().split('T')[0]

    try {
      const summary = await this.userUsageCollection.aggregate([
        { $match: { userId, date: { $gte: sinceDate } } },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: '$totalRequests' },
            totalCharacters: { $sum: '$totalCharacters' },
            totalAudioDuration: { $sum: '$totalAudioDuration' },
            avgProcessingTime: { $avg: '$totalProcessingTime' },
            uniqueVoices: { $addToSet: '$voicesUsed' },
            uniqueModels: { $addToSet: '$modelsUsed' },
            activeDays: { $sum: 1 }
          }
        }
      ]).toArray()

      return summary[0] || null
    } catch (error) {
      console.error('Failed to get user usage summary:', error)
      return null
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
      this.isConnected = false
      console.log('📴 MongoDB analytics connection closed')
    }
  }


  //============ Private Helpers =============
  private calculateEfficiency(audioDuration: number, processingTime: number): number {
    return audioDuration > 0 ? processingTime / (audioDuration * 1000) : 0
  }

  private estimateAudioBytes(durationSeconds: number): number {
    return Math.floor(durationSeconds * 16000) // 128kbps / 8 = 16KB per second
  }

  private generateRequestId(): string {
    return `tts_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private determineService(context: any): 'tts' | 'voice' | 'general' {
    if (context?.voiceId || context?.charactersRequested) return 'tts'
    if (context?.voices || context?.voiceProvider) return 'voice'
    return 'general'
  }

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