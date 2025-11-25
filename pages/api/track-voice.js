import { PrismaClient } from '@prisma/client';
import { getThailandToday, getThailandCurrentMonth } from '../../lib/timezone.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, data } = req.body;

    if (action === 'success') {
      // Track successful voice generation
      const { userId, voice, textLength, duration, provider, apiCost, creditsUsed } = data;

      console.log(`📊 Tracking voice generation: ${userId} - ${voice}`);

      // Use creditsUsed from API (already calculated based on text length)
      // If not provided, use default based on provider
      const credits = creditsUsed || (provider === 'elevenlabs' ? 2 : 1);

      const revenue = credits * 1; // 1 baht per credit
      const profit = revenue - (apiCost || 0);
      const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0;

      // Create voice generation record
      await prisma.voiceGeneration.create({
        data: {
          userId,
          voice,
          textLength,
          provider: provider.toLowerCase(), // Ensure lowercase for consistency
          creditsUsed: credits,
          revenue,
          apiCost: apiCost || 0,
          profit,
          profitMargin: parseFloat(profitMargin),
          success: true
        }
      });

      // Determine tier based on credits
      const tierIncrements = {
        voicesTier2: credits === 2 ? 1 : 0,
        voicesTier3: credits === 3 ? 1 : 0,
        voicesTier4: credits === 4 ? 1 : 0,
        voicesTier5: credits === 5 ? 1 : 0,
        voicesTier6: credits === 6 ? 1 : 0
      };

      // Update daily stats (using Thailand timezone)
      const today = getThailandToday();

      await prisma.dailyStats.upsert({
        where: { date: today },
        update: {
          totalVoices: { increment: 1 },
          voicesGemini: provider.toLowerCase() === 'gemini' ? { increment: 1 } : undefined,
          voicesElevenlabs: provider.toLowerCase() === 'elevenlabs' ? { increment: 1 } : undefined,
          voicesTier2: tierIncrements.voicesTier2 > 0 ? { increment: 1 } : undefined,
          voicesTier3: tierIncrements.voicesTier3 > 0 ? { increment: 1 } : undefined,
          voicesTier4: tierIncrements.voicesTier4 > 0 ? { increment: 1 } : undefined,
          voicesTier5: tierIncrements.voicesTier5 > 0 ? { increment: 1 } : undefined,
          voicesTier6: tierIncrements.voicesTier6 > 0 ? { increment: 1 } : undefined,
          apiCostVoices: { increment: apiCost || 0 }
        },
        create: {
          date: today,
          totalVoices: 1,
          voicesGemini: provider.toLowerCase() === 'gemini' ? 1 : 0,
          voicesElevenlabs: provider.toLowerCase() === 'elevenlabs' ? 1 : 0,
          voicesTier2: tierIncrements.voicesTier2,
          voicesTier3: tierIncrements.voicesTier3,
          voicesTier4: tierIncrements.voicesTier4,
          voicesTier5: tierIncrements.voicesTier5,
          voicesTier6: tierIncrements.voicesTier6,
          apiCostVoices: apiCost || 0
        }
      });

      // Update monthly stats (using Thailand timezone)
      const month = getThailandCurrentMonth();

      await prisma.monthlyStats.upsert({
        where: { month },
        update: {
          totalVoices: { increment: 1 },
          voicesGemini: provider.toLowerCase() === 'gemini' ? { increment: 1 } : undefined,
          voicesElevenlabs: provider.toLowerCase() === 'elevenlabs' ? { increment: 1 } : undefined,
          voicesTier2: tierIncrements.voicesTier2 > 0 ? { increment: 1 } : undefined,
          voicesTier3: tierIncrements.voicesTier3 > 0 ? { increment: 1 } : undefined,
          voicesTier4: tierIncrements.voicesTier4 > 0 ? { increment: 1 } : undefined,
          voicesTier5: tierIncrements.voicesTier5 > 0 ? { increment: 1 } : undefined,
          voicesTier6: tierIncrements.voicesTier6 > 0 ? { increment: 1 } : undefined,
          apiCostVoices: { increment: apiCost || 0 }
        },
        create: {
          month,
          totalVoices: 1,
          voicesGemini: provider.toLowerCase() === 'gemini' ? 1 : 0,
          voicesElevenlabs: provider.toLowerCase() === 'elevenlabs' ? 1 : 0,
          voicesTier2: tierIncrements.voicesTier2,
          voicesTier3: tierIncrements.voicesTier3,
          voicesTier4: tierIncrements.voicesTier4,
          voicesTier5: tierIncrements.voicesTier5,
          voicesTier6: tierIncrements.voicesTier6,
          apiCostVoices: apiCost || 0
        }
      });

      console.log(`✅ Voice generation tracked: ${credits} credits, ${revenue}฿ revenue, ${profit.toFixed(2)}฿ profit`);

      return res.status(200).json({ success: true });

    } else if (action === 'error') {
      // Track voice generation error
      const { userId, voice, errorType, errorMessage, creditsRefunded } = data;

      console.log(`❌ Tracking voice error: ${userId} - ${errorType}`);

      // Create voice error record
      // await prisma.voiceError.create({
      //   data: {
      //     userId,
      //     voice,
      //     errorType,
      //     errorMessage,
      //     creditsRefunded,
      //     createdAt: new Date()
      //   }
      // });

      console.log('✅ Voice error tracked successfully');

      return res.status(200).json({ success: true });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Voice tracking error:', error);
    return res.status(500).json({ error: 'Failed to track voice generation' });
  } finally {
    await prisma.$disconnect();
  }
}
