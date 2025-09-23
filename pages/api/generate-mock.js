// Mock generator for testing when API quota is exceeded
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { prompts, originalImage } = req.body

    // Generate mock images based on product type
    const productMockImages = [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', // Electronics
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', // Watch
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80', // Sunglasses
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80', // Camera
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', // Shoes
      'https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=800&q=80', // Bottle
      'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&q=80', // Product box
      'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800&q=80', // Cosmetics
      'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=800&q=80', // Gadget
      'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&q=80'  // Product shoot
    ]

    // Style-based mock images
    const mockImages = {
      'Luxury Minimalist': productMockImages[Math.floor(Math.random() * 3)],
      'Premium Lifestyle': productMockImages[Math.floor(Math.random() * 3) + 3],
      'Bold Luxury Statement': productMockImages[Math.floor(Math.random() * 3) + 6],
      'Ultra Premium Dark': productMockImages[Math.floor(Math.random() * productMockImages.length)]
    }

    const results = prompts.map((promptData, index) => {
      const imageUrl = mockImages[promptData.style] ||
        `https://source.unsplash.com/800x600/?product,luxury&${Date.now()}_${index}`

      return {
        style: promptData.style,
        imageUrl: imageUrl,
        description: `ภาพตัวอย่าง: ${promptData.style}`,
        prompt: promptData.prompt,
        isGenerated: false,
        isMock: true,
        model: 'mock-generator',
        mockNotice: originalImage ? 'ภาพตัวอย่าง (ไม่ใช่ภาพจริงจากสินค้าที่อัพโหลด)' : 'ภาพตัวอย่าง'
      }
    })

    res.status(200).json({
      results,
      success: true,
      message: '⚠️ ใช้ภาพตัวอย่างเนื่องจาก API quota หมด',
      stats: {
        total: results.length,
        generated: 0,
        mock: results.length
      },
      model: 'mock-generator',
      info: {
        apiKeyStatus: '⚠️ API quota exceeded - using mock images',
        note: 'ภาพตัวอย่างจาก Unsplash สำหรับทดสอบระบบ',
        suggestion: 'รอ 1 นาที หรือใช้ API key อื่น'
      }
    })

  } catch (error) {
    console.error('Mock generation error:', error)
    res.status(500).json({
      error: error.message || 'Failed to generate mock images'
    })
  }
}