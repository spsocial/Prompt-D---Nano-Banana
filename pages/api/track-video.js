// API endpoint for tracking video generation
import { trackVideoGeneration, trackVideoError } from '../../lib/analytics-db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, data } = req.body;

    if (action === 'success') {
      // Track successful video generation
      const { userId, model, mode, prompt, duration, aspectRatio, creditsUsed } = data;

      const result = await trackVideoGeneration(
        userId,
        model,
        mode,
        prompt || '',
        duration || 10,
        aspectRatio || '16:9',
        creditsUsed || 10
      );

      return res.status(200).json({ success: result });
    } else if (action === 'error') {
      // Track video generation error
      const { userId, model, mode, errorType, errorMessage, creditsRefunded } = data;

      const result = await trackVideoError(
        userId,
        model,
        mode || 'unknown',
        errorType || 'unknown_error',
        errorMessage || '',
        creditsRefunded || 0
      );

      return res.status(200).json({ success: result });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error tracking video:', error);
    return res.status(500).json({ error: 'Failed to track video' });
  }
}
