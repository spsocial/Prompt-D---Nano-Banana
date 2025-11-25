import { GoogleGenerativeAI } from '@google/generative-ai'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { PrismaClient } from '@prisma/client'
import { formatThailandDate, getThailandToday } from '../../lib/timezone.js'

const prisma = new PrismaClient()

// Model configurations with their rate limits
const CHAT_MODELS = {
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash-exp',
    dailyLimit: 30,
    displayName: 'Model Flash'
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    dailyLimit: 5,
    displayName: 'Model Pro'
  }
}

const PRODUCT_ANALYSIS_PROMPT = `You are an expert Creative Director and AI Prompt Specialist specifically for the "Nano Banana PRO" image generation model. Your goal is to turn ANY product image into a High-End Advertising Visual.

### 🚨 CRITICAL RULES:
1. **NO ROMANIZATION:** Write Thai text ONLY in Thai script. No karaoke language.
2. **JSON ONLY:** Output raw JSON without markdown.
3. **FREEDOM OF CHOICE:** Do NOT restrict fonts based on product category. Analyze the **VISUAL MOOD** to pick the best Font, Layout, and Lighting.

### 🔠 MASTER FONT & STYLE LIBRARY (Pick based on MOOD):

**GROUP A: ELEGANT & LUXURY (High-end, Expensive)**
- "Elegant Serif (Didot/Bodoni), High Contrast, Thin strokes"
- "Minimalist Sans-Serif, Wide Letter-spacing (Tracking)"
- "Calligraphic Script (Signature Style), Flowing"

**GROUP B: BOLD & IMPACT (Sales, Confidence)**
- "Massive Sans-Serif (Impact/Helvetica Bold), Tight spacing"
- "3D Pop-up Text, Bold outlines, Drop shadow"
- "Slab Serif (College style), Blocky"

**GROUP C: AGGRESSIVE & RAW (Street, Extreme)**
- "Distressed Grunge, Dirty Texture, Eroded edges"
- "Heavy Military Stencil (Army style)"
- "Graffiti Tagging, Drip effect, Spray paint"

**GROUP D: MODERN & TECH (Innovation, Speed)**
- "Futuristic Monospace, Code/Hacker style"
- "Sleek Geometric Sans, Neon Glow borders"
- "Glitch Text Effect, Cyberpunk distortion"
- "Slanted Italic (Speed lines), Racing style"

**GROUP E: SOFT & PLAYFUL (Cute, Friendly)**
- "Bubble Font, Inflated, Soft edges"
- "Handwritten Chalkboard / Pencil style"
- "Pastel Rounded Sans, Friendly vibe"

**GROUP F: VINTAGE & CLASSIC (Retro, Trust)**
- "Vintage Badge Typography, Victorian style"
- "Typewriter Font, Rough paper texture"
- "Retro 70s Groovy Script"

### 🎥 CINEMATOGRAPHY & LIGHTING CHEAT SHEET (Pick 1 Combo):

**ANGLES (มุมกล้อง):**
1. **"Hero Shot (Low Angle)":** Camera looks up. Product looks giant/powerful.
2. **"Knolling (Top-Down)":** 90-degree angle from above. Organized.
3. **"Macro Detail (Close-up)":** Focus on texture/droplets.
4. **"Wide Environmental":** Small product in vast scenery.
5. **"Dutch Angle (Tilted)":** Tilted horizon for dynamic energy.
6. **"Standard Studio":** Clean eye-level shot.

**LIGHTING (การจัดแสง):**
1. **"Golden Hour":** Warm sunlight, emotional.
2. **"Cyberpunk Neon":** Pink/Blue artificial lights, reflections.
3. **"Studio High-Key":** Bright white, clean shadow.
4. **"Dramatic Rim Light":** Dark background, light outlining edges.
5. **"Volumetric God Rays":** Light beams through smoke/dust.

### 📐 ADVANCED LAYOUT TECHNIQUES (Pick 1 or Invent):

1. **"Depth Layering (Text Behind)":** Headline huge, BEHIND product. (ซ้อนหลัง)
2. **"Dynamic Tilt (Diagonal Action)":** Tilted 30-45 degrees. (วางเฉียง)
3. **"Floor Perspective (Isometric)":** Text flat on ground. (วางราบพื้น)
4. **"Contour Curve (Text Following Shape)":** Text curves around product. (วางโค้งไต่ขอบ)
5. **"Intertwined (Weaving Effect)":** Text weaves Front/Back. (ร้อยรัด)
6. **"Oversized Magazine (Cropped)":** Text huge, extending off edges. (ใหญ่ล้นเฟรม)
7. **"Floating Elements (Anti-Gravity)":** Product/Text floating freely. (ลอยตัว)
8. **"Minimalist Negative Space":** Small product, vast space. (เน้นพื้นที่ว่าง)
9. **"AI Freestyle (Wildcard)":** Analyze image and INVENT a unique composition suitable for the shape. (คิดสไตล์ใหม่เอง)

### JSON OUTPUT FORMAT:
Generate the following JSON structure exactly:

{
  "hook": "Creative Thai Headline (Catchy, Power words)",
  "sub_copy": "Persuasive Thai Sub-headline (Benefits/Promo)",
  "product_visual": "Brief description of the scene",
  "price": "Price or Offer in Thai",
  "contact": "Contact info (Line/Tel)",
  "logo_position": "Position (e.g., Top-Right)",
  "image_size": "Aspect Ratio (e.g., 9:16)",
  "visual_prompt": "(SUBJECT:1.4), [Action/Context], [Background/Environment], [Camera Angle: Low Angle/Top Down/Macro], [Lighting: Cinematic/Neon/Rim Light], [Details: Water Splash/Dust/Sparkles], (Masterpiece, Best Quality, 8k, Sharp focus:1.2), (Professional Ad Photography), [Color Tone] --v 6",
  "colors": ["Primary Color", "Secondary Color", "Palette Name (e.g., Teal & Orange, Monochromatic, Earth Tone)"],
  "style": "Select ONE specific font style from the LIBRARY above. Explain why in Thai.",
  "layout_direction": "Describe the Composition using 'Advanced Layout Techniques' in Thai.",
  "assets": {
    "product_images": ["/path/to/image.jpg"],
    "models": ["/path/to/model.png"],
    "logo": ["Logo description"],
    "background": [],
    "others": []
  },
  "pro_direction": "Thai advice: Why did you choose this Mood, Angle & Lighting? (e.g., การใช้มุมเสย Hero Shot คู่กับแสง Rim Light ช่วยให้สินค้าดูทรงพลังขึ้น)",
  "notes": "ผู้ใช้สามารถแก้ไขข้อความทั้งหมดได้ตามต้องการ"
}`

// Hidden spam protection limits (not shown to users)
const SPAM_LIMITS = {
  maxDailyRequests: 200,      // Max 200 requests per day (even for unlimited)
  maxMessageLength: 2000,     // Max 2000 characters per message
  minRequestInterval: 1000    // Min 1 second between requests (ms)
}

// Check if user has active unlimited subscription
async function checkUnlimitedAccess(userId) {
  const now = new Date()

  const activeUnlimited = await prisma.chatUnlock.findFirst({
    where: {
      userId,
      packageType: 'unlimited_24h',
      unlimitedUntil: {
        gt: now
      }
    },
    orderBy: {
      unlimitedUntil: 'desc'
    }
  })

  if (activeUnlimited) {
    return {
      isUnlimited: true,
      unlimitedUntil: activeUnlimited.unlimitedUntil,
      dailyRequestCount: activeUnlimited.dailyRequestCount
    }
  }

  return { isUnlimited: false }
}

// Update daily request count for spam protection (hidden)
async function incrementDailyRequestCount(userId) {
  const today = getThailandToday() // Thailand timezone

  // Find today's unlock record (if any)
  const unlock = await prisma.chatUnlock.findFirst({
    where: {
      userId,
      createdAt: {
        gte: today
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  if (unlock) {
    await prisma.chatUnlock.update({
      where: { id: unlock.id },
      data: {
        dailyRequestCount: { increment: 1 }
      }
    })
  }
}

async function checkAndUpdateRequestUsage(userId, modelKey) {
  const today = formatThailandDate(new Date()) // YYYY-MM-DD in Thailand timezone
  const modelConfig = CHAT_MODELS[modelKey]

  if (!modelConfig) {
    throw new Error('Invalid model selected')
  }

  // First check if user has unlimited access
  const unlimitedStatus = await checkUnlimitedAccess(userId)

  if (unlimitedStatus.isUnlimited) {
    // Check hidden spam limit
    if (unlimitedStatus.dailyRequestCount >= SPAM_LIMITS.maxDailyRequests) {
      return {
        allowed: false,
        isUnlimited: true,
        unlimitedUntil: unlimitedStatus.unlimitedUntil,
        requestsUsed: unlimitedStatus.dailyRequestCount,
        requestsRemaining: 0,
        dailyLimit: 'unlimited',
        // Hidden error - user sees generic message
        hiddenError: 'spam_limit_reached'
      }
    }

    return {
      allowed: true,
      isUnlimited: true,
      unlimitedUntil: unlimitedStatus.unlimitedUntil,
      requestsUsed: unlimitedStatus.dailyRequestCount,
      requestsRemaining: 'unlimited',
      dailyLimit: 'unlimited'
    }
  }

  // Normal free tier check
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
    if (userUsage.tokensUsed >= modelConfig.dailyLimit) {
      return {
        allowed: false,
        requestsUsed: userUsage.tokensUsed,
        requestsRemaining: 0,
        dailyLimit: modelConfig.dailyLimit
      }
    }

    return {
      allowed: true,
      requestsUsed: userUsage.tokensUsed,
      requestsRemaining: modelConfig.dailyLimit - userUsage.tokensUsed,
      dailyLimit: modelConfig.dailyLimit
    }
  }

  // First time today - create new record
  await prisma.chatTokenUsage.create({
    data: {
      userId: userId,
      model: modelKey,
      date: today,
      tokensUsed: 0
    }
  })

  return {
    allowed: true,
    requestsUsed: 0,
    requestsRemaining: modelConfig.dailyLimit,
    dailyLimit: modelConfig.dailyLimit
  }
}

async function incrementRequestUsage(userId, modelKey) {
  const today = formatThailandDate(new Date()) // Thailand timezone

  await prisma.chatTokenUsage.upsert({
    where: {
      userId_model_date: {
        userId: userId,
        model: modelKey,
        date: today
      }
    },
    update: {
      tokensUsed: {
        increment: 1  // Count by requests, not tokens
      }
    },
    create: {
      userId: userId,
      model: modelKey,
      date: today,
      tokensUsed: 1
    }
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, image, useProductAnalysis, model } = req.body

    // Debug log - request received
    console.log('[Chat AI] Request received:', {
      hasMessage: !!message,
      messageLength: message?.length || 0,
      hasImage: !!image,
      imageLength: image?.length || 0,
      useProductAnalysis,
      model
    })

    if (!message && !image) {
      return res.status(400).json({ error: 'Message or image is required' })
    }

    // Hidden spam protection: Check message length
    if (message && message.length > SPAM_LIMITS.maxMessageLength) {
      return res.status(400).json({
        error: `ข้อความยาวเกินไป (สูงสุด ${SPAM_LIMITS.maxMessageLength} ตัวอักษร)`
      })
    }

    // Validate and default model
    const modelKey = model || 'gemini-2.0-flash'
    if (!CHAT_MODELS[modelKey]) {
      return res.status(400).json({ error: 'Invalid model selected' })
    }

    const modelConfig = CHAT_MODELS[modelKey]

    // Get user session
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized - Please login' })
    }

    const userId = session.user.userId

    // Check rate limit for this specific model (also checks unlimited status)
    const rateLimitCheck = await checkAndUpdateRequestUsage(userId, modelKey)
    if (!rateLimitCheck.allowed) {
      // Different message for spam limit vs normal limit
      if (rateLimitCheck.hiddenError === 'spam_limit_reached') {
        return res.status(429).json({
          error: 'ระบบขัดข้อง กรุณาลองใหม่ภายหลัง', // Generic message for spam
          requestsUsed: rateLimitCheck.requestsUsed,
          requestsRemaining: 0,
          dailyLimit: rateLimitCheck.dailyLimit
        })
      }

      return res.status(429).json({
        error: 'คุณใช้งานครบจำนวนที่กำหนดสำหรับวันนี้แล้ว',
        requestsUsed: rateLimitCheck.requestsUsed,
        requestsRemaining: 0,
        dailyLimit: rateLimitCheck.dailyLimit,
        resetMessage: 'จำกัดการใช้งานจะรีเซ็ตในวันพรุ่งนี้',
        isUnlimited: rateLimitCheck.isUnlimited || false,
        unlimitedUntil: rateLimitCheck.unlimitedUntil || null
      })
    }

    // Smart logic: Auto-switch to normal chat if switch is ON but no image
    const effectiveProductAnalysis = useProductAnalysis && !!image

    // Use Gemini API key from environment
    const geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyAhnMZEkrbClmHDzvUdalEiArFn9xfLvMs'
    const genAI = new GoogleGenerativeAI(geminiApiKey)

    // Use the selected model configuration
    const geminiModel = genAI.getGenerativeModel({
      model: modelConfig.id,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    })

    let result

    // Helper function to safely parse base64 image
    const parseBase64Image = (imageData) => {
      try {
        // Validate base64 format: should be "data:image/xxx;base64,..."
        if (!imageData || typeof imageData !== 'string') {
          throw new Error('Invalid image data')
        }

        if (!imageData.includes(',') || !imageData.includes(';') || !imageData.includes(':')) {
          throw new Error('Invalid base64 format')
        }

        const base64Data = imageData.split(',')[1]
        const mimeType = imageData.split(';')[0].split(':')[1]

        if (!base64Data || !mimeType) {
          throw new Error('Could not extract image data')
        }

        // Validate mime type
        if (!mimeType.startsWith('image/')) {
          throw new Error('Invalid image type')
        }

        return {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      } catch (error) {
        console.error('Image parsing error:', error.message)
        throw new Error('รูปภาพไม่ถูกต้อง กรุณาลองอัปโหลดใหม่')
      }
    }

    // If product analysis is enabled and image is provided (effective mode)
    if (effectiveProductAnalysis) {
      // Convert base64 image to format Gemini expects
      const imagePart = parseBase64Image(image)

      // Generate content with product analysis prompt
      result = await geminiModel.generateContent([
        PRODUCT_ANALYSIS_PROMPT,
        imagePart,
        message || 'วิเคราะห์รูปภาพสินค้านี้และสร้างโฆษณาที่เหมาะสม'
      ])
    }
    // If only image (no product analysis) - just describe the image normally
    else if (image) {
      const imagePart = parseBase64Image(image)

      result = await geminiModel.generateContent([
        imagePart,
        message || 'อธิบายภาพนี้'
      ])
    }
    // If only text message
    else {
      result = await geminiModel.generateContent(message)
    }

    const response = result.response
    const text = response.text()

    // Increment request count for this model (only for non-unlimited)
    if (!rateLimitCheck.isUnlimited) {
      await incrementRequestUsage(userId, modelKey)
    }

    // Increment hidden spam counter for unlimited users
    if (rateLimitCheck.isUnlimited) {
      await incrementDailyRequestCount(userId)
    }

    // Get updated usage stats for this model
    const updatedUsage = await checkAndUpdateRequestUsage(userId, modelKey)

    // Try to parse JSON if product analysis was used
    let parsedData = null
    if (effectiveProductAnalysis) {
      try {
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        console.log('Could not parse JSON from response:', e.message)
      }
    }

    res.status(200).json({
      success: true,
      message: text,
      parsedData: parsedData,
      hasImage: !!image,
      usedProductAnalysis: effectiveProductAnalysis,
      model: modelKey,
      requestUsage: {
        requestsUsed: updatedUsage.requestsUsed,
        requestsRemaining: updatedUsage.requestsRemaining,
        dailyLimit: updatedUsage.dailyLimit
      }
    })

  } catch (error) {
    console.error('AI Chat error:', error)
    res.status(500).json({
      error: error.message || 'Failed to generate response',
      details: error.response?.data || null
    })
  }
}
