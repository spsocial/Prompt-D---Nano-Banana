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
      const { userId, voice, textLength, duration, provider, apiCost } = data;

      console.log(`📊 Tracking voice generation: ${userId} - ${voice}`);

      // Create voice generation record (if you want to create a new table)
      // For now, we'll just log it and you can add DB tracking later

      // You can create a VoiceGeneration table similar to VideoGeneration
      // await prisma.voiceGeneration.create({
      //   data: {
      //     userId,
      //     voice,
      //     textLength,
      //     duration,
      //     provider,
      //     apiCost,
      //     createdAt: new Date()
      //   }
      // });

      console.log('✅ Voice generation tracked successfully');

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
