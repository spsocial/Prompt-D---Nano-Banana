import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { PrismaClient } from '@prisma/client'
import { formatThailandDate } from '../../../lib/timezone.js'

const prisma = new PrismaClient()

// Package configurations
const UNLOCK_PACKAGES = {
  'flash_only': {
    credits: 1,
    flashBonus: 30,
    proBonus: 0,
    unlimited: false
  },
  'both_models': {
    credits: 2,
    flashBonus: 30,
    proBonus: 5,
    unlimited: false
  },
  'unlimited_24h': {
    credits: 5,
    flashBonus: 0,
    proBonus: 0,
    unlimited: true,
    durationHours: 24
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user session
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.userId) {
      return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' })
    }

    const userId = session.user.userId
    const { packageType } = req.body

    // Validate package type
    const packageConfig = UNLOCK_PACKAGES[packageType]
    if (!packageConfig) {
      return res.status(400).json({ error: 'แพ็คเกจไม่ถูกต้อง' })
    }

    // Get user credits
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { credits: true }
    })

    if (!user) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' })
    }

    // Check if user has enough credits
    if (user.credits < packageConfig.credits) {
      return res.status(400).json({
        error: 'เครดิตไม่เพียงพอ',
        required: packageConfig.credits,
        available: user.credits
      })
    }

    const today = formatThailandDate(new Date()) // Thailand timezone

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct credits from user
      await tx.user.update({
        where: { userId },
        data: {
          credits: { decrement: packageConfig.credits },
          creditsUsed: { increment: packageConfig.credits }
        }
      })

      // 2. Create unlock record
      const unlockData = {
        userId,
        packageType,
        creditsUsed: packageConfig.credits,
        flashBonus: packageConfig.flashBonus,
        proBonus: packageConfig.proBonus
      }

      if (packageConfig.unlimited) {
        // Set unlimited expiry to 24 hours from now
        const unlimitedUntil = new Date()
        unlimitedUntil.setHours(unlimitedUntil.getHours() + packageConfig.durationHours)
        unlockData.unlimitedUntil = unlimitedUntil
        unlockData.expiresAt = unlimitedUntil
      }

      const unlock = await tx.chatUnlock.create({
        data: unlockData
      })

      // 3. If not unlimited, add bonus to ChatTokenUsage (reset/add)
      if (!packageConfig.unlimited) {
        // For flash bonus
        if (packageConfig.flashBonus > 0) {
          // Find existing usage and reset, or the bonus will apply via check logic
          await tx.chatTokenUsage.upsert({
            where: {
              userId_model_date: {
                userId,
                model: 'gemini-2.0-flash',
                date: today
              }
            },
            update: {
              tokensUsed: 0 // Reset to 0
            },
            create: {
              userId,
              model: 'gemini-2.0-flash',
              date: today,
              tokensUsed: 0
            }
          })
        }

        // For pro bonus
        if (packageConfig.proBonus > 0) {
          await tx.chatTokenUsage.upsert({
            where: {
              userId_model_date: {
                userId,
                model: 'gemini-2.5-flash',
                date: today
              }
            },
            update: {
              tokensUsed: 0 // Reset to 0
            },
            create: {
              userId,
              model: 'gemini-2.5-flash',
              date: today,
              tokensUsed: 0
            }
          })
        }
      }

      return unlock
    })

    // Return success response
    const response = {
      success: true,
      message: packageConfig.unlimited
        ? 'ปลดล็อค Unlimited 24 ชั่วโมงสำเร็จ!'
        : 'ปลดล็อคสำเร็จ!',
      packageType,
      creditsUsed: packageConfig.credits
    }

    if (packageConfig.unlimited) {
      response.unlimitedUntil = result.unlimitedUntil
    } else {
      response.flashBonus = packageConfig.flashBonus
      response.proBonus = packageConfig.proBonus
    }

    res.status(200).json(response)

  } catch (error) {
    console.error('Chat unlock error:', error)
    res.status(500).json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' })
  }
}
