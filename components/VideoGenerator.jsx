import { useState } from 'react'
import { Film, Loader2, Play, Download, X, Image as ImageIcon, Type } from 'lucide-react'
import useStore from '../lib/store'

export default function VideoGenerator({ sourceImage = null, sourcePrompt = '', model = 'sora-2' }) {
  const [mode, setMode] = useState(sourceImage ? 'image' : 'text')
  const [uploadedImage, setUploadedImage] = useState(sourceImage)
  const [prompt, setPrompt] = useState(sourcePrompt)
  const [duration, setDuration] = useState(model === 'veo3-fast' ? 8 : 5)
  const [resolution, setResolution] = useState('720p')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [isGenerating, setIsGenerating] = useState(false)
  const [videoResult, setVideoResult] = useState(null)
  const [error, setError] = useState(null)
  const [showSettings, setShowSettings] = useState(true)

  const { apiKeys, userPlan } = useStore()

  // Model-specific configurations
  const modelConfig = {
    'veo3-fast': {
      name: 'Veo 3 Fast',
      durations: [8], // Fixed 8 seconds only
      resolutions: {
        '16:9': ['720p', '1080p'],
        '9:16': ['720p'],
        '1:1': ['720p']
      },
      aspectRatios: ['16:9', '9:16', '1:1']
    },
    'sora-2': {
      name: 'Sora 2',
      durations: [5, 10, 15, 20],
      resolutions: {
        '16:9': ['480p', '720p', '1080p'],
        '9:16': ['480p', '720p', '1080p'],
        '1:1': ['480p', '720p', '1080p'],
        '4:3': ['480p', '720p', '1080p'],
        '3:4': ['480p', '720p', '1080p'],
        '21:9': ['480p', '720p', '1080p']
      },
      aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9']
    },
    'sora-2-hd': {
      name: 'Sora 2 HD',
      durations: [5, 10, 15, 20],
      resolutions: {
        '16:9': ['720p', '1080p'],
        '9:16': ['720p', '1080p'],
        '1:1': ['720p', '1080p'],
        '4:3': ['720p', '1080p'],
        '3:4': ['720p', '1080p'],
        '21:9': ['720p', '1080p']
      },
      aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9']
    }
  }

  const currentConfig = modelConfig[model] || modelConfig['sora-2']

  // Get available resolutions for current aspect ratio
  const availableResolutions = currentConfig.resolutions[aspectRatio] || ['720p']

  // Auto-adjust resolution if not available for selected aspect ratio
  const handleAspectRatioChange = (newAspectRatio) => {
    setAspectRatio(newAspectRatio)
    const availableRes = currentConfig.resolutions[newAspectRatio] || ['720p']
    if (!availableRes.includes(resolution)) {
      setResolution(availableRes[0]) // Set to first available resolution
    }
  }

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ')
      return
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 10MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      setUploadedImage(reader.result)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setUploadedImage(null)
  }

  const handleGenerate = async () => {
    if (!prompt && mode === 'text') {
      setError('กรุณาใส่ prompt สำหรับสร้างวิดีโอ')
      return
    }

    if (!uploadedImage && mode === 'image') {
      setError('กรุณาอัพโหลดรูปภาพ')
      return
    }

    setIsGenerating(true)
    setError(null)
    setVideoResult(null)

    try {
      console.log('🎬 Starting video generation...')
      console.log('📝 Model:', model)

      // Select API endpoint based on model
      const apiEndpoint = model === 'veo3-fast'
        ? '/api/generate-video-veo3'
        : '/api/generate-video'

      console.log('🔗 API Endpoint:', apiEndpoint)

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          image: mode === 'image' ? uploadedImage : null,
          apiKey: apiKeys.openai || null,
          duration: duration,
          resolution: resolution,
          aspectRatio: aspectRatio,
          model: model
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate video')
      }

      const data = await response.json()
      console.log('✅ Video generated:', data)

      setVideoResult(data)

      // Save to history
      try {
        useStore.getState().addVideoToHistory({
          videoUrl: data.videoUrl,
          prompt: prompt,
          mode: data.mode,
          duration: data.duration,
          resolution: data.resolution,
          aspectRatio: data.aspectRatio,
          sourceImage: mode === 'image' ? sourceImage : null,
          timestamp: new Date().toISOString()
        })
      } catch (historyError) {
        console.error('Error saving to history:', historyError)
      }

    } catch (error) {
      console.error('❌ Video generation error:', error)

      // Check if API is not available
      if (error.message.includes('not valid JSON') || error.message.includes('Unexpected token')) {
        setError('⚠️ Sora API ยังไม่เปิดให้ใช้งานสาธารณะ - กรุณารอ OpenAI เปิดให้ใช้งานอย่างเป็นทางการ หรือตรวจสอบสถานะล่าสุดที่ platform.openai.com')
      } else {
        setError(error.message)
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!videoResult?.videoUrl) return

    try {
      const response = await fetch(videoResult.videoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sora-video-${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      setError('ไม่สามารถดาวน์โหลดวิดีโอได้')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl shadow-lg">
            <Film className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sora 2 Video Generation</h2>
            <p className="text-sm text-gray-600">สร้างวิดีโอด้วย AI จากข้อความหรือรูปภาพ</p>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-3">
        <button
          onClick={() => setMode('text')}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            mode === 'text'
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300 hover:border-red-300'
          }`}
        >
          <Type className="h-6 w-6 mx-auto mb-2 text-red-500" />
          <div className="font-bold">Text to Video</div>
          <div className="text-xs text-gray-600">สร้างจากข้อความ</div>
        </button>
        <button
          onClick={() => setMode('image')}
          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
            mode === 'image'
              ? 'border-red-500 bg-red-50'
              : 'border-gray-300 hover:border-red-300'
          }`}
        >
          <ImageIcon className="h-6 w-6 mx-auto mb-2 text-red-500" />
          <div className="font-bold">Image to Video</div>
          <div className="text-xs text-gray-600">สร้างจากรูปภาพ</div>
        </button>
      </div>

      {/* Image Upload (for Image to Video mode) */}
      {mode === 'image' && (
        <div>
          {!uploadedImage ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-red-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="video-image-upload"
              />
              <label htmlFor="video-image-upload" className="cursor-pointer">
                <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <div className="text-lg font-semibold text-gray-700 mb-2">
                  อัพโหลดรูปภาพ
                </div>
                <div className="text-sm text-gray-500">
                  คลิกหรือลากไฟล์มาวาง (สูงสุด 10MB)
                </div>
              </label>
            </div>
          ) : (
            <div className="p-4 bg-white rounded-xl border-2 border-red-200 relative">
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="text-sm font-bold text-gray-700 mb-2">รูปภาพต้นทาง:</div>
              <img
                src={uploadedImage}
                alt="Uploaded"
                className="max-h-64 mx-auto rounded-lg border-2 border-gray-200"
              />
            </div>
          )}
        </div>
      )}

      {/* Prompt Input */}
      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">
          {mode === 'image' ? 'คำอธิบายวิดีโอ (ทิศทางการเคลื่อนไหว, บรรยากาศ)' : 'Prompt สร้างวิดีโอ'}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={mode === 'image'
            ? 'เช่น: Camera slowly zooms in, product rotates 360 degrees, dramatic lighting, cinematic atmosphere'
            : 'เช่น: A rocket launching into space with dramatic lighting and smoke effects'
          }
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
          rows={4}
        />
      </div>

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="text-sm font-semibold text-red-600 hover:text-red-700"
      >
        {showSettings ? '▼ ซ่อนการตั้งค่า' : '▶ แสดงการตั้งค่าขั้นสูง'}
      </button>

      {/* Advanced Settings */}
      {showSettings && (
        <div className="space-y-4 p-5 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
          {/* Duration */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              ความยาววิดีโอ: <span className="text-red-600">{duration} วินาที</span>
            </label>
            <div className={`grid gap-2 ${currentConfig.durations.length === 1 ? 'grid-cols-1' : 'grid-cols-4'}`}>
              {currentConfig.durations.map(sec => (
                <button
                  key={sec}
                  onClick={() => setDuration(sec)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    duration === sec
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-red-100'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              ความละเอียด: <span className="text-red-600">{resolution}</span>
            </label>
            <div className={`grid gap-2 ${availableResolutions.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
              {availableResolutions.map(res => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    resolution === res
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-red-100'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              อัตราส่วนภาพ: <span className="text-red-600">{aspectRatio}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {currentConfig.aspectRatios.map(ratio => {
                const labels = {
                  '16:9': 'แนวนอน',
                  '9:16': 'แนวตั้ง',
                  '1:1': 'จตุรัส',
                  '4:3': 'แนวนอน 4:3',
                  '3:4': 'แนวตั้ง 3:4',
                  '21:9': 'ภาพกว้าง'
                }
                return (
                  <button
                    key={ratio}
                    onClick={() => handleAspectRatioChange(ratio)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      aspectRatio === ratio
                        ? 'bg-red-500 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-red-100'
                    }`}
                  >
                    {ratio}
                    <div className="text-xs font-normal">{labels[ratio]}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-300 rounded-xl text-red-800">
          <div className="flex items-start">
            <X className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || (!prompt && mode === 'text')}
        className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            กำลังสร้างวิดีโอ... (อาจใช้เวลา 1-3 นาที)
          </span>
        ) : (
          <span className="flex items-center justify-center">
            <Film className="h-5 w-5 mr-2" />
            สร้างวิดีโอด้วย AI
          </span>
        )}
      </button>

      {/* Video Result */}
      {videoResult && (
        <div className="p-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-red-200 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center">
              <Play className="h-5 w-5 mr-2 text-red-500" />
              วิดีโอที่สร้างเสร็จแล้ว
            </h3>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center space-x-2 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>ดาวน์โหลด</span>
            </button>
          </div>

          <video
            src={videoResult.videoUrl}
            controls
            className="w-full rounded-xl border-2 border-gray-200 shadow-lg"
          />

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-600">
            <div className="p-2 bg-white rounded-lg">
              <span className="font-bold">ความยาว:</span> {videoResult.duration}s
            </div>
            <div className="p-2 bg-white rounded-lg">
              <span className="font-bold">ความละเอียด:</span> {videoResult.resolution}
            </div>
            <div className="p-2 bg-white rounded-lg">
              <span className="font-bold">อัตราส่วน:</span> {videoResult.aspectRatio}
            </div>
            <div className="p-2 bg-white rounded-lg">
              <span className="font-bold">โหมด:</span> {videoResult.mode === 'image-to-video' ? 'Image→Video' : 'Text→Video'}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-sm text-blue-800">
          <span className="font-bold">💡 เคล็ดลับ:</span>
          {mode === 'image'
            ? ' อธิบายการเคลื่อนไหว มุมกล้อง และบรรยากาศที่ต้องการให้ละเอียด เพื่อผลลัพธ์ที่ดีที่สุด'
            : ' ใช้คำอธิบายที่ชัดเจนและละเอียด รวมถึงการเคลื่อนไหว แสงสว่าง และอารมณ์ที่ต้องการ'
          }
        </p>
      </div>
    </div>
  )
}
