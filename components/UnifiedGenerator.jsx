import { useState } from 'react'
import { Sparkles, Film, Image as ImageIcon, Upload, Wand2 } from 'lucide-react'
import ImageUploader from './ImageUploader'
import VideoGenerator from './VideoGenerator'

// Model configurations
const IMAGE_MODELS = {
  banana: {
    id: 'banana',
    name: 'Banana AI',
    description: 'Gemini 2.5 - วิเคราะห์สินค้าและสร้างโฆษณา',
    icon: '🍌',
    requiresImage: true,
    hasPresetStyles: true,
    color: 'yellow'
  },
  'dalle-3': {
    id: 'dalle-3',
    name: 'DALL-E 3',
    description: 'OpenAI - สร้างภาพจาก prompt',
    icon: '🎨',
    requiresImage: false,
    hasPresetStyles: false,
    color: 'green',
    comingSoon: true
  },
  'midjourney': {
    id: 'midjourney',
    name: 'Midjourney',
    description: 'คุณภาพสูง - Artistic style',
    icon: '✨',
    requiresImage: false,
    hasPresetStyles: false,
    color: 'purple',
    comingSoon: true
  }
}

const VIDEO_MODELS = {
  'sora-2': {
    id: 'sora-2',
    name: 'Sora 2',
    description: 'OpenAI - วิดีโอคุณภาพสูง',
    icon: '🎬',
    requiresImage: false, // optional
    color: 'red'
  },
  'sora-2-hd': {
    id: 'sora-2-hd',
    name: 'Sora 2 HD',
    description: 'OpenAI - คุณภาพ 1080p',
    icon: '💎',
    requiresImage: false,
    color: 'pink'
  },
  'veo3-fast': {
    id: 'veo3-fast',
    name: 'Veo 3 Fast',
    description: 'Google - สร้างเร็ว ราคาถูก',
    icon: '⚡',
    requiresImage: false,
    color: 'blue',
    comingSoon: false // เปิดใช้งานแล้ว!
  }
}

export default function UnifiedGenerator() {
  const [mode, setMode] = useState('image') // 'image' or 'video'
  const [selectedModel, setSelectedModel] = useState('banana')

  const models = mode === 'image' ? IMAGE_MODELS : VIDEO_MODELS
  const currentModel = models[selectedModel]

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            setMode('image')
            setSelectedModel('banana')
          }}
          className={`flex-1 p-6 rounded-2xl border-2 transition-all ${
            mode === 'image'
              ? 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg'
              : 'border-gray-300 hover:border-yellow-300 bg-white'
          }`}
        >
          <ImageIcon className={`h-8 w-8 mx-auto mb-3 ${
            mode === 'image' ? 'text-yellow-600' : 'text-gray-400'
          }`} />
          <div className={`font-bold text-lg ${
            mode === 'image' ? 'text-yellow-900' : 'text-gray-600'
          }`}>
            สร้างภาพ
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Image Generation
          </div>
        </button>

        <button
          onClick={() => {
            setMode('video')
            setSelectedModel('sora-2')
          }}
          className={`flex-1 p-6 rounded-2xl border-2 transition-all ${
            mode === 'video'
              ? 'border-red-500 bg-gradient-to-br from-red-50 to-pink-50 shadow-lg'
              : 'border-gray-300 hover:border-red-300 bg-white'
          }`}
        >
          <Film className={`h-8 w-8 mx-auto mb-3 ${
            mode === 'video' ? 'text-red-600' : 'text-gray-400'
          }`} />
          <div className={`font-bold text-lg ${
            mode === 'video' ? 'text-red-900' : 'text-gray-600'
          }`}>
            สร้างวิดีโอ
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Video Generation
          </div>
        </button>
      </div>

      {/* Model Selector */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">
          🤖 เลือก AI Model:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.values(models).map((model) => {
            // Dynamic color classes (Tailwind safe-list)
            const activeClasses = {
              yellow: 'border-yellow-500 bg-yellow-50 shadow-lg',
              red: 'border-red-500 bg-red-50 shadow-lg',
              pink: 'border-pink-500 bg-pink-50 shadow-lg',
              blue: 'border-blue-500 bg-blue-50 shadow-lg',
              green: 'border-green-500 bg-green-50 shadow-lg',
              purple: 'border-purple-500 bg-purple-50 shadow-lg'
            }

            return (
              <button
                key={model.id}
                onClick={() => !model.comingSoon && setSelectedModel(model.id)}
                disabled={model.comingSoon}
                className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                  selectedModel === model.id
                    ? activeClasses[model.color]
                    : model.comingSoon
                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
              {model.comingSoon && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-gray-600 text-white text-xs rounded-full font-semibold">
                  Coming Soon
                </div>
              )}
              <div className="flex items-start space-x-3">
                <span className="text-3xl">{model.icon}</span>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">{model.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {model.description}
                  </div>
                  {model.requiresImage && (
                    <div className="mt-2 inline-flex items-center text-xs text-gray-500">
                      <Upload className="h-3 w-3 mr-1" />
                      ต้องอัพโหลดรูป
                    </div>
                  )}
                </div>
              </div>
            </button>
            )
          })}
        </div>
      </div>

      {/* Generator Component */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-lg">
        {mode === 'image' && selectedModel === 'banana' && (
          <ImageUploader />
        )}

        {mode === 'image' && selectedModel !== 'banana' && (
          <div className="text-center py-12 text-gray-500">
            <Wand2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <div className="text-lg font-semibold">Coming Soon!</div>
            <div className="text-sm mt-2">
              {currentModel.name} จะเปิดให้ใช้งานเร็วๆ นี้
            </div>
          </div>
        )}

        {mode === 'video' && (
          <VideoGenerator model={selectedModel} />
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-sm text-blue-800">
          <span className="font-bold">💡 เคล็ดลับ:</span>
          {mode === 'image'
            ? ' เลือก AI Model ที่เหมาะกับงานของคุณ - Banana AI เหมาะกับการสร้างโฆษณาสินค้า'
            : ' Sora 2 HD ให้คุณภาพสูงสุด แต่ใช้เวลานานกว่า - Veo 3 Fast เร็วและประหยัด'
          }
        </p>
      </div>
    </div>
  )
}
