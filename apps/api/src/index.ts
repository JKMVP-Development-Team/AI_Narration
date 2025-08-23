import express from 'express'
import dotenv from 'dotenv'
import * as path from 'path'
import cors from 'cors'
import { TTSFactory } from './Factories/TTSFactory'
import { MongoAnalyticsLogger } from './Utilities/AnalyticsLogger'

dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') })

export const app = express()
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const ttsService = TTSFactory.createElevenLabsTTS()
const voiceProvider = TTSFactory.createElevenLabsVoiceProvider()

app.post('/api/v1/tts', async (req, res) => {
  try {
    const { text, voiceId, modelId, userId } = req.body ?? {}
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' })
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required'})
    }

    const audio = await ttsService.synthesize({ text, voiceId, modelId, userId })
    
    res.setHeader('Content-Type', audio.mimeType)
    res.send(audio.data)
  } catch (err: any) {
    console.error('TTS Error:', err.message)
    
    if (err.message.includes('timeout')) {
      return res.status(408).json({ error: 'Request timeout. Please try again.' })
    }
    
    if (err.message.includes('failed after') && err.message.includes('attempts')) {
      return res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.' })
    }
    
    res.status(400).json({ error: err.message ?? 'TTS error' })
  }
})

app.get('/api/v1/voices', async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10
    const voices = await voiceProvider.getVoices(limit)
    res.json(voices)
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to get voices' })
  }
})

app.get('/api/v1/voices/:id', async (req, res) => {
  try {
    const voice = await voiceProvider.getVoiceById(req.params.id)
    if (!voice) {
      return res.status(404).json({ error: 'Voice not found' })
    }
    res.json(voice)
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to get voice' })
  }
})

app.get('/api/v1/analytics/user/:userId/daily/:date', async (req, res) => {
  try {
    const { userId, date } = req.params
    const analytics = new MongoAnalyticsLogger(process.env.MONGODB_URI!, process.env.MONGODB_DATABASE!)
    const stats = await analytics.getUserDailyStats(userId, date)
    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user daily stats' })
  }
})

app.get('/api/v1/analytics/user/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params
    const days = req.query.days ? Number(req.query.days) : 30
    const analytics = new MongoAnalyticsLogger(process.env.MONGODB_URI!, process.env.MONGODB_DATABASE!)
    const summary = await analytics.getUserUsageSummary(userId, days)
    res.json(summary)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user summary' })
  }
})

app.get('/api/v1/analytics/users/top', async (req, res) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30
    const limit = req.query.limit ? Number(req.query.limit) : 10
    const analytics = new MongoAnalyticsLogger(process.env.MONGODB_URI!, process.env.MONGODB_DATABASE!)
    const topUsers = await analytics.getTopUsers(days, limit)
    res.json(topUsers)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get top users' })
  }
})


const PORT = process.env.PORT ? Number(process.env.PORT) : 4000
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})