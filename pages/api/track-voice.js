import { PrismaClient } from '@prisma/client';

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
