import { useState, useEffect } from 'react'
import { Sparkles, Film, Image as ImageIcon, ArrowRight, Lock } from 'lucide-react'
import ImageUploader from './ImageUploader'
import VideoGenerator from './VideoGenerator'
import GeminiImageGenerator from './GeminiImageGenerator'
import useStore from '../lib/store'
import { AnimationPlaceholder } from './LottieAnimation'

// Model configurations
const IMAGE_MODELS = {
  banana: {
    id: 'banana',
    name: 'Banana AI',
    description: 'วิเคราะห์สินค้าและสร้างโฆษณา',
    emoji: '🍌',
    requiresImage: true,
    hasPresetStyles: true,
    color: 'yellow'
  }
}

const VIDEO_MODELS = {
  'sora-2': {
    id: 'sora-2',
    name: 'Sora 2',
    description: 'Text/Image to Video',
    emoji: '🎬',
    requiresImage: false,
    supportsImageToVideo: true,
    color: 'red'
  },
  'sora-2-hd': {
    id: 'sora-2-hd',
    name: 'Sora 2 HD',
    description: '1080p Text/Image to Video',
    emoji: '💎',
    requiresImage: false,
    supportsImageToVideo: true,
    color: 'pink'
  },
  'veo3-fast': {
    id: 'veo3-fast',
    name: 'Veo 3 Fast',
    description: 'Text/Image to Video',
    emoji: '⚡',
    requiresImage: false,
    supportsImageToVideo: true,
    color: 'blue',
    comingSoon: false
  }
}

export default function UnifiedGeneratorModern() {
  const [mode, setMode] = useState('image') // 'image' or 'video'
  const [selectedModel, setSelectedModel] = useState('banana')

  const { isGeneratingVideo } = useStore()

  const models = mode === 'image' ? IMAGE_MODELS : VIDEO_MODELS
  const currentModel = models[selectedModel]

  // Check if user wants to create video from image (from ResultGallery)
  useEffect(() => {
    const pendingVideoGen = localStorage.getItem('nano_pending_video_gen')
    if (pendingVideoGen === 'true') {
      setMode('video')
      setSelectedModel('sora-2')
      localStorage.removeItem('nano_pending_video_gen')

      setTimeout(() => {
        const notification = document.createElement('div')
        notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce'
        notification.innerHTML = '✅ เลือกโมเดล AI สำหรับสร้างวิดีโอด้านล่าง'
        document.body.appendChild(notification)
        setTimeout(() => {
          notification.remove()
        }, 4000)
      }, 500)
    }
  }, [])

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">
          สร้างคอนเทนต์ด้วย AI
        </h1>
        <p className="text-gray-600 text-base">
          เลือกสิ่งที่คุณต้องการสร้าง แล้วปล่อยให้ AI ทำงานให้คุณ
        </p>
      </div>

      {/* Mode Selection Cards - Modern Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {/* Image Generator Card */}
        <button
          onClick={() => {
            if (!isGeneratingVideo) {
              setMode('image')
              setSelectedModel('banana')
            }
          }}
          disabled={isGeneratingVideo}
          className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 text-left ${
            mode === 'image'
              ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg scale-[1.02]'
              : isGeneratingVideo
              ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
              : 'border-gray-200 bg-white hover:border-yellow-300 hover:shadow-md hover:scale-[1.01]'
          }`}
        >
          {isGeneratingVideo && mode === 'video' && (
            <div className="absolute top-4 right-4">
              <Lock className="h-5 w-5 text-red-500" />
            </div>
          )}

          <div className="flex flex-col items-center text-center space-y-4">
            <AnimationPlaceholder emoji="🖼️" size="xl" />

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Image Generator
              </h3>
              <p className="text-sm text-gray-600">
                วิเคราะห์สินค้าและสร้างโฆษณา
              </p>
            </div>

            {mode === 'image' && (
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5 text-yellow-600" />
              </div>
            )}
          </div>
        </button>

        {/* Video Generator Card */}
        <button
          onClick={() => {
            if (!isGeneratingVideo) {
              setMode('video')
              setSelectedModel('sora-2')
            }
          }}
          disabled={isGeneratingVideo}
          className={`group relative p-8 rounded-2xl border-2 transition-all duration-300 text-left ${
            mode === 'video'
              ? 'border-red-400 bg-gradient-to-br from-red-50 to-pink-50 shadow-lg scale-[1.02]'
              : isGeneratingVideo
              ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
              : 'border-gray-200 bg-white hover:border-red-300 hover:shadow-md hover:scale-[1.01]'
          }`}
        >
          {isGeneratingVideo && mode === 'video' && (
            <div className="absolute top-4 right-4">
              <Lock className="h-5 w-5 text-green-500 animate-pulse" />
            </div>
          )}

          <div className="flex flex-col items-center text-center space-y-4">
            <AnimationPlaceholder emoji="🎬" size="xl" />

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Video Generator
              </h3>
              <p className="text-sm text-gray-600">
                Text/Image to Video AI
              </p>
            </div>

            {mode === 'video' && (
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5 text-red-600" />
              </div>
            )}

            {isGeneratingVideo && mode === 'video' && (
              <div className="text-xs text-green-600 font-medium">
                ⏳ กำลังสร้างวิดีโอ...
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Notice when video is generating */}
      {isGeneratingVideo && (
        <div className="max-w-2xl mx-auto p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-green-900 text-sm">กำลังสร้างวิดีโออยู่</div>
              <div className="text-xs text-green-700">ไม่สามารถสลับโหมดได้จนกว่าจะสร้างเสร็จ</div>
            </div>
          </div>
        </div>
      )}

      {/* Model Selector - Compact Tabs Style */}
      {Object.keys(models).length > 1 && (
        <div className="max-w-2xl mx-auto">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            เลือก AI Model
          </label>
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
            {Object.values(models).map((model) => (
              <button
                key={model.id}
                onClick={() => !model.comingSoon && setSelectedModel(model.id)}
                disabled={model.comingSoon}
                className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  selectedModel === model.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : model.comingSoon
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="mr-2">{model.emoji}</span>
                {model.name}
                {model.comingSoon && (
                  <span className="ml-2 text-xs text-gray-400">Soon</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generator Component */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {mode === 'image' && selectedModel === 'banana' && (
          <div className="p-6">
            <ImageUploader />
          </div>
        )}

        {mode === 'image' && selectedModel !== 'banana' && (
          <div className="text-center py-16 px-6">
            <AnimationPlaceholder emoji="✨" size="xl" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Coming Soon!</h3>
            <p className="mt-2 text-sm text-gray-600">
              {currentModel.name} จะเปิดให้ใช้งานเร็วๆ นี้
            </p>
          </div>
        )}

        {mode === 'video' && (
          <div className="p-6">
            <VideoGenerator model={selectedModel} />
          </div>
        )}
      </div>

      {/* Info Box - Subtle */}
      <div className="max-w-2xl mx-auto p-4 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">💡 เคล็ดลับ:</span>
          {' '}
          {mode === 'image'
            ? 'เลือก AI Model ที่เหมาะกับงานของคุณ - Banana AI เหมาะกับการสร้างโฆษณาสินค้า'
            : 'Model HD ให้คุณภาพสูงสุด แต่ใช้เวลานานกว่า - Model Fast เร็วและประหยัด'
          }
        </p>
      </div>
    </div>
  )
}
