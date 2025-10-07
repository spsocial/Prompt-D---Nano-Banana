import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import useStore from '../lib/store'
import { Upload, Image as ImageIcon, Loader2, Wand2, RefreshCw, X, Sparkles } from 'lucide-react'

export default function GeminiImageGenerator() {
  const [preview, setPreview] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [aspectRatio, setAspectRatio] = useState('1:1')

  const { apiKeys, userPlan } = useStore()

  // Handle image upload
  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ')
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

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      console.log('🎨 Generating with Gemini 2.0 Exp...')

      const response = await fetch('/api/generate-gemini-exp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          image: preview, // optional
          aspectRatio: aspectRatio,
          apiKey: apiKeys.gemini || null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate image')
      }

      const data = await response.json()
      console.log('✅ Image generated:', data)

      setResult(data)

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
    link.download = `gemini-exp-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gemini 2.0 Experimental</h2>
          <p className="text-sm text-gray-600">Text-to-Image, Image-to-Image, Conversational Editing</p>
        </div>
      </div>

      {/* Features */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
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
            <span>แก้ไขภาพ</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>✅</span>
            <span>Text Rendering</span>
          </div>
        </div>
      </div>

      {/* Image Upload (Optional) */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          อัพโหลดรูปภาพ (ถ้าต้องการแก้ไขภาพ)
          <span className="text-gray-500 font-normal ml-2">ไม่บังคับ</span>
        </label>

        {!preview ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 bg-white'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-2">
              {isDragActive ? 'วางรูปภาพที่นี่...' : 'ลากรูปภาพมาวางที่นี่'}
            </p>
            <p className="text-sm text-gray-500">หรือคลิกเพื่อเลือกไฟล์</p>
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
          placeholder={
            preview
              ? "เช่น: เปลี่ยนพื้นหลังเป็นชายหาด เพิ่มแสงแดดยามเช้า"
              : "เช่น: A futuristic cityscape at sunset, neon lights, cyberpunk style"
          }
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
          rows={4}
        />
      </div>

      {/* Aspect Ratio */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          อัตราส่วนภาพ: <span className="text-blue-600">{aspectRatio}</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { ratio: '16:9', label: 'แนวนอน', icon: '▭' },
            { ratio: '1:1', label: 'จตุรัส', icon: '⬛' },
            { ratio: '9:16', label: 'แนวตั้ง', icon: '▯' }
          ].map(({ ratio, label, icon }) => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={`px-4 py-3 rounded-xl font-bold transition-all ${
                aspectRatio === ratio
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="text-xl mb-1">{icon}</div>
              <div className="text-xs">{label}</div>
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
          disabled={isGenerating || !prompt}
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] shadow-lg"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              กำลังสร้างภาพ...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <Wand2 className="h-5 w-5 mr-2" />
              สร้างภาพด้วย Gemini 2.0 Exp
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
        <div className="p-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-blue-200 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center">
              <ImageIcon className="h-5 w-5 mr-2 text-blue-500" />
              ภาพที่สร้างเสร็จแล้ว
            </h3>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all"
            >
              ดาวน์โหลด
            </button>
          </div>

          <img
            src={result.imageUrl}
            alt="Generated"
            className="w-full rounded-xl border-2 border-gray-200 shadow-lg"
          />

          {result.description && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">{result.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 rounded-xl border border-blue-200/50">
        <p className="text-sm text-blue-800">
          <span className="font-bold">💡 Tips:</span> Model นี้เก่ง Text Rendering (วาดตัวหนังสือ) และ
          แก้ไขภาพแบบสนทนา - ลองใส่คำสั่งเฉพาะเจาะจง เช่น "Add text 'SALE 50%' in red, bold font"
        </p>
      </div>
    </div>
  )
}
