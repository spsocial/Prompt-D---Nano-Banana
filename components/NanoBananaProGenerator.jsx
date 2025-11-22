import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import useStore from '../lib/store'
import { Upload, Image as ImageIcon, Loader2, Wand2, RefreshCw, X, Sparkles, Zap } from 'lucide-react'

export default function NanoBananaProGenerator() {
  const [preview, setPreview] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [resolution, setResolution] = useState('1K')
  const [outputFormat, setOutputFormat] = useState('png')

  const { userCredits, useCredits } = useStore()

  // Cost: 3 credits per image
  const COST_PER_IMAGE = 3

  // Handle image upload
  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ')
      return
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('ไฟล์ต้องมีขนาดไม่เกิน 10MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
      setError(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const handleGenerate = async () => {
    if (!prompt) {
      setError('กรุณาใส่ prompt')
      return
    }

    // Check credits
    if (userCredits < COST_PER_IMAGE) {
      setError(`ไม่มีเครดิตเพียงพอ (ต้องการ ${COST_PER_IMAGE} เครดิต, คุณมี ${userCredits} เครดิต)`)
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      console.log('🎨 Generating with Nano Banana PRO...')

      // Prepare image input
      let imageInput = []
      if (preview) {
        imageInput = [preview]
      }

      const response = await fetch('/api/generate-image-kie-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          aspectRatio: aspectRatio,
          resolution: resolution,
          outputFormat: outputFormat,
          imageInput: imageInput,
          userId: localStorage.getItem('nano_user_id') || 'anonymous'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate image')
      }

      const data = await response.json()
      console.log('✅ Image generated:', data)

      // Deduct credits
      const userId = localStorage.getItem('nano_user_id')
      if (userId) {
        await useCredits(userId, COST_PER_IMAGE, 'Nano Banana PRO Image Generation')
      }

      setResult(data)

      // Add to history
      try {
        useStore.getState().addToHistory({
          imageUrl: data.imageUrl,
          prompt: prompt,
          model: 'Nano Banana PRO',
          aspectRatio: aspectRatio,
          resolution: resolution,
          timestamp: Date.now()
        })
      } catch (historyError) {
        console.error('Error adding to history:', historyError)
      }

      // Update stats
      useStore.getState().incrementGenerated()

    } catch (error) {
      console.error('❌ Generation error:', error)
      setError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setPreview(null)
    setPrompt('')
    setResult(null)
    setError(null)
  }

  const handleDownload = () => {
    if (!result?.imageUrl) return

    const link = document.createElement('a')
    link.href = result.imageUrl
    link.download = `nano-banana-pro-${resolution}-${Date.now()}.${outputFormat}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl shadow-lg">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nano Banana PRO</h2>
          <p className="text-sm text-gray-600">High-Resolution Image Generation (1K/2K/4K)</p>
        </div>
      </div>

      {/* Cost Notice */}
      <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-semibold text-orange-900">
              ราคา: {COST_PER_IMAGE} เครดิต / 1 รูป
            </span>
          </div>
          <div className="text-sm text-orange-700">
            เครดิตคงเหลือ: <span className="font-bold">{userCredits}</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <span>✅</span>
            <span>ความละเอียด 1K/2K/4K</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>✅</span>
            <span>Text-to-Image</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>✅</span>
            <span>Image-to-Image</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>✅</span>
            <span>อัตราส่วนหลากหลาย</span>
          </div>
        </div>
      </div>

      {/* Image Upload (Optional) */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          อัพโหลดรูปภาพ (ถ้าต้องการแปลงภาพ)
          <span className="text-gray-500 font-normal ml-2">ไม่บังคับ</span>
        </label>

        {!preview ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              isDragActive
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-300 hover:border-orange-400 bg-white'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">
              {isDragActive ? 'วางรูปภาพที่นี่...' : 'ลากรูปภาพมาวางที่นี่'}
            </p>
            <p className="text-sm text-gray-500">หรือคลิกเพื่อเลือกไฟล์ (สูงสุด 10MB)</p>
          </div>
        ) : (
          <div className="relative">
            <img src={preview} alt="Preview" className="w-full rounded-xl border-2 border-gray-200" />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Prompt Input */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          Prompt
          <span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="เช่น: A futuristic cityscape at sunset with neon lights and flying cars, photorealistic, 4K quality"
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
          rows={4}
        />
      </div>

      {/* Aspect Ratio */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          อัตราส่วนภาพ: <span className="text-orange-600">{aspectRatio}</span>
        </label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {[
            { ratio: '1:1', label: '1:1', icon: '⬛' },
            { ratio: '2:3', label: '2:3', icon: '▯' },
            { ratio: '3:2', label: '3:2', icon: '▭' },
            { ratio: '3:4', label: '3:4', icon: '▯' },
            { ratio: '4:3', label: '4:3', icon: '▭' },
            { ratio: '4:5', label: '4:5', icon: '▯' },
            { ratio: '5:4', label: '5:4', icon: '▭' },
            { ratio: '9:16', label: '9:16', icon: '▯' },
            { ratio: '16:9', label: '16:9', icon: '▭' },
            { ratio: '21:9', label: '21:9', icon: '▭' }
          ].map(({ ratio, label, icon }) => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={`px-3 py-2 rounded-xl font-bold transition-all text-sm ${
                aspectRatio === ratio
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-orange-400'
              }`}
            >
              <div className="text-lg mb-1">{icon}</div>
              <div className="text-xs">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Resolution */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          ความละเอียด: <span className="text-orange-600">{resolution}</span>
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { res: '1K', label: '1K', desc: 'เร็ว' },
            { res: '2K', label: '2K', desc: 'ปานกลาง' },
            { res: '4K', label: '4K', desc: 'สูงสุด' }
          ].map(({ res, label, desc }) => (
            <button
              key={res}
              onClick={() => setResolution(res)}
              className={`px-4 py-3 rounded-xl font-bold transition-all ${
                resolution === res
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-orange-400'
              }`}
            >
              <div className="text-lg mb-1">{label}</div>
              <div className="text-xs opacity-80">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Output Format */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          รูปแบบไฟล์: <span className="text-orange-600">{outputFormat.toUpperCase()}</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { format: 'png', label: 'PNG', desc: 'คุณภาพสูง' },
            { format: 'jpg', label: 'JPG', desc: 'ขนาดเล็ก' }
          ].map(({ format, label, desc }) => (
            <button
              key={format}
              onClick={() => setOutputFormat(format)}
              className={`px-4 py-3 rounded-xl font-bold transition-all ${
                outputFormat === format
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-orange-400'
              }`}
            >
              <div className="text-lg mb-1">{label}</div>
              <div className="text-xs opacity-80">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Generate Button */}
      <div className="flex gap-3">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt || userCredits < COST_PER_IMAGE}
          className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] shadow-lg"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              กำลังสร้างภาพ...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <Wand2 className="h-5 w-5 mr-2" />
              สร้างภาพด้วย Nano Banana PRO ({COST_PER_IMAGE} เครดิต)
            </span>
          )}
        </button>

        <button
          onClick={handleReset}
          className="px-6 py-4 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 font-bold rounded-xl transition-all transform hover:scale-105 shadow-md"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="p-6 bg-gradient-to-br from-white to-orange-50 rounded-2xl border-2 border-orange-200 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center">
              <ImageIcon className="h-5 w-5 mr-2 text-orange-500" />
              ภาพที่สร้างเสร็จแล้ว ({resolution})
            </h3>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all"
            >
              ดาวน์โหลด
            </button>
          </div>

          <img
            src={result.imageUrl}
            alt="Generated"
            className="w-full rounded-xl border-2 border-gray-200 shadow-lg"
          />

          {result.message && (
            <div className="mt-4 p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-700">{result.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-gradient-to-r from-orange-100/50 to-yellow-100/50 rounded-xl border border-orange-200/50">
        <p className="text-sm text-orange-800">
          <span className="font-bold">💡 Tips:</span> Nano Banana PRO สร้างได้ทีละ 1 รูป ความละเอียด 4K
          ให้คุณภาพสูงสุดแต่ใช้เวลานานกว่า 1K - เลือกตามความต้องการของคุณ
        </p>
      </div>
    </div>
  )
}
