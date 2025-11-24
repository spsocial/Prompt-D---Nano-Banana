import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Model configurations with their rate limits
const CHAT_MODELS = {
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash-exp',
    dailyLimit: 30,
    displayName: 'Gemini 2.0 Flash'
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash-exp',
    dailyLimit: 5,
    displayName: 'Gemini 2.5 Flash'
  }
}

async function getRequestUsage(userId, modelKey) {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const modelConfig = CHAT_MODELS[modelKey]

  if (!modelConfig) {
    throw new Error('Invalid model')
  }

  const userUsage = await prisma.chatTokenUsage.findUnique({
    where: {
      userId_model_date: {
        userId: userId,
        model: modelKey,
        date: today
      }
    }
  })

  if (userUsage) {
    return {
      requestsUsed: userUsage.tokensUsed,
      requestsRemaining: Math.max(0, modelConfig.dailyLimit - userUsage.tokensUsed),
      dailyLimit: modelConfig.dailyLimit
    }
  }

  // No usage today yet
  return {
    requestsUsed: 0,
    requestsRemaining: modelConfig.dailyLimit,
    dailyLimit: modelConfig.dailyLimit
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user session
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized - Please login' })
    }

    const userId = session.user.userId

    // Get model from query parameter, default to gemini-2.0-flash
    const modelKey = req.query.model || 'gemini-2.0-flash'

    // Validate model
    if (!CHAT_MODELS[modelKey]) {
      return res.status(400).json({ error: 'Invalid model' })
    }

    // Get usage stats for specific model
    const requestUsage = await getRequestUsage(userId, modelKey)

    res.status(200).json({
      success: true,
      model: modelKey,
      requestUsage: requestUsage
    })

  } catch (error) {
    console.error('Usage API error:', error)
    res.status(500).json({
      error: error.message || 'Failed to get usage data'
    })
  }
}
