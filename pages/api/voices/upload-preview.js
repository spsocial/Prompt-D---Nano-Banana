// API endpoint for uploading voice preview audio to Cloudinary
import formidable from 'formidable'
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    })
  }

  try {
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB max
      keepExtensions: true
    })

    const [fields, files] = await form.parse(req)

    const audioFile = files.audio?.[0]

    if (!audioFile) {
      return res.status(400).json({
        success: false,
        message: 'ไม่พบไฟล์เสียง'
      })
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
    if (!allowedTypes.includes(audioFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'รองรับเฉพาะไฟล์เสียง MP3, WAV, OGG เท่านั้น'
      })
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(audioFile.filepath, {
      resource_type: 'video', // Cloudinary uses 'video' for audio files
      folder: 'voice-previews',
      public_id: `preview_${Date.now()}`,
      format: 'mp3'
    })

    // Delete temp file
    fs.unlinkSync(audioFile.filepath)

    return res.status(200).json({
      success: true,
      message: 'อัปโหลดไฟล์เสียงสำเร็จ',
      url: result.secure_url,
      publicId: result.public_id
    })

  } catch (error) {
    console.error('Error uploading voice preview:', error)
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์',
      error: error.message
    })
  }
}
