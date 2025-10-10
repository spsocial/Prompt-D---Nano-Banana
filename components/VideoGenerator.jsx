import { useState, useEffect, useRef } from 'react'
import { Film, Loader2, Play, Download, X, Image as ImageIcon, Type } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../lib/store'

export default function VideoGenerator({ sourceImage = null, sourcePrompt = '', model = 'sora-2' }) {
  // Sora models now support image-to-video with max_tokens parameter
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
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState(null)
  const [pollingInterval, setPollingInterval] = useState(null)
  const [generationProgress, setGenerationProgress] = useState('')

  const { apiKeys, userPlan, setIsGeneratingVideo, userCredits, useCredits } = useStore()

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
      durations: [10], // Fixed 10 seconds only
      resolutions: {
        '16:9': ['720p'], // Fixed 720p
        '9:16': ['720p']  // Fixed 720p
      },
      aspectRatios: ['16:9', '9:16'] // Only horizontal and vertical
    },
    'sora-2-hd': {
      name: 'Sora 2 HD',
      durations: [10], // Fixed 10 seconds only
      resolutions: {
        '16:9': ['1080p'], // Fixed 1080p
        '9:16': ['1080p']  // Fixed 1080p
      },
      aspectRatios: ['16:9', '9:16'] // Only horizontal and vertical
    }
  }

  const currentConfig = modelConfig[model] || modelConfig['sora-2']

  // Get available resolutions for current aspect ratio
  const availableResolutions = currentConfig.resolutions[aspectRatio] || ['720p']

  // Auto-adjust settings when model changes
  useEffect(() => {
    // Auto-set resolution based on model and aspect ratio
    const availableRes = currentConfig.resolutions[aspectRatio] || ['720p']
    setResolution(availableRes[0])

    // Auto-set duration based on model
    setDuration(currentConfig.durations[0])

    // Reset aspect ratio to 16:9 if not available in current model
    if (!currentConfig.aspectRatios.includes(aspectRatio)) {
      setAspectRatio('16:9')
    }

    // Note: Sora 2 now supports image-to-video with max_tokens parameter (confirmed by CometAPI team)
  }, [model])

  // Auto-adjust resolution if not available for selected aspect ratio
  const handleAspectRatioChange = (newAspectRatio) => {
    setAspectRatio(newAspectRatio)
    const availableRes = currentConfig.resolutions[newAspectRatio] || ['720p']
    if (!availableRes.includes(resolution)) {
      setResolution(availableRes[0]) // Set to first available resolution
    }
  }

  // Poll task status
  const pollTaskStatus = async (taskId) => {
    try {
      const response = await fetch(`/api/video-task/${taskId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch task status')
      }

      const data = await response.json()
      console.log(`📊 [Task ${taskId}] Status: ${data.status}`)

      if (data.status === 'completed') {
        // Task completed!
        setIsGenerating(false)
        setIsGeneratingVideo(false)
        setGenerationProgress('')

        setVideoResult({
          videoUrl: data.videoUrl,
          previewUrl: data.previewUrl,
          duration: data.duration,
          resolution: data.resolution,
          aspectRatio: data.aspectRatio,
          mode: data.mode
        })

        setShowSuccessPopup(true)
        setTimeout(() => setShowSuccessPopup(false), 8000)

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

        // Stop polling
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }
        setCurrentTaskId(null)
        localStorage.removeItem('video_task_id')

        return true // Task complete
      } else if (data.status === 'failed') {
        // Task failed
        setIsGenerating(false)
        setIsGeneratingVideo(false)
        setGenerationProgress('')
        setError(`❌ การสร้างวิดีโอล้มเหลว: ${data.errorMessage || 'Unknown error'}\n\nเครดิตได้ถูกคืนให้แล้ว`)

        // Stop polling
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }
        setCurrentTaskId(null)
        localStorage.removeItem('video_task_id')

        // Reload credits
        const store = useStore.getState()
        if (store.loadUserCredits) {
          await store.loadUserCredits(localStorage.getItem('nano_user_id'))
        }

        return true // Task complete (failed)
      } else {
        // Still processing
        const elapsed = Math.floor((Date.now() - new Date(data.createdAt).getTime()) / 1000)
        setGenerationProgress(`⏱️ กำลังสร้างวิดีโอ... (${elapsed} วินาที) - สามารถปิดหน้านี้ได้ วิดีโอจะปรากฏในประวัติเมื่อเสร็จ`)
        return false // Still processing
      }

    } catch (error) {
      console.error('Error polling task status:', error)
      // Don't stop polling on network errors - might recover
      return false
    }
  }

  // Start polling for a task
  const startPolling = (taskId) => {
    console.log(`🔄 Starting polling for task ${taskId}`)
    setCurrentTaskId(taskId)
    localStorage.setItem('video_task_id', taskId)

    // Poll immediately
    pollTaskStatus(taskId)

    // Then poll every 3 seconds
    const interval = setInterval(async () => {
      const isComplete = await pollTaskStatus(taskId)
      if (isComplete) {
        clearInterval(interval)
      }
    }, 3000)

    setPollingInterval(interval)
  }

  // Check for pending tasks on mount
  useEffect(() => {
    const resumePendingTask = async () => {
      const savedTaskId = localStorage.getItem('video_task_id')
      if (savedTaskId) {
        console.log(`🔄 Resuming task ${savedTaskId}`)
        setIsGenerating(true)
        setIsGeneratingVideo(true)
        setGenerationProgress('⏱️ กำลังกู้คืนงานที่ค้างไว้...')
        startPolling(savedTaskId)
      }
    }

    resumePendingTask()

    // Cleanup on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [])

  // Handle visibility change (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentTaskId) {
        console.log(`👀 Page visible again, resuming poll for ${currentTaskId}`)
        // Poll immediately when page becomes visible
        pollTaskStatus(currentTaskId)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [currentTaskId])

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

    // Calculate required credits based on model
    const requiredCredits =
      model === 'sora-2-hd' ? 15 :     // Sora-2 HD: 15 credits
      model === 'veo3-fast' ? 15 :     // Veo3-fast: 15 credits (updated)
      10                                // Sora-2: 10 credits

    // Check if user has enough credits
    if (userCredits < requiredCredits) {
      setError(`⚠️ เครดิตไม่เพียงพอ! ต้องการ ${requiredCredits} เครดิต (คุณมี ${userCredits} เครดิต)`)
      return
    }

    // Deduct credits before generation
    const success = await useCredits(requiredCredits)
    if (!success) {
      setError('❌ ไม่สามารถหักเครดิตได้ กรุณาลองใหม่อีกครั้ง')
      return
    }

    setIsGenerating(true)
    setIsGeneratingVideo(true) // Lock mode switching
    setError(null)
    setVideoResult(null)
    setGenerationProgress('⏱️ กำลังเริ่มต้นสร้างวิดีโอ...')

    try {
      console.log('🎬 Starting video generation...')
      console.log('📝 Model:', model)
      console.log(`💳 Deducted ${requiredCredits} credits (Remaining: ${userCredits - requiredCredits})`)

      // Create async task
      const response = await fetch('/api/video-task/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: localStorage.getItem('nano_user_id'),
          prompt: prompt,
          image: mode === 'image' ? uploadedImage : null,
          model: model,
          duration: duration,
          resolution: resolution,
          aspectRatio: aspectRatio,
          creditsUsed: requiredCredits
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create video task')
      }

      const data = await response.json()
      console.log('✅ Task created:', data.taskId)

      // Start polling
      startPolling(data.taskId)

    } catch (error) {
      console.error('❌ Error creating task:', error)
      setIsGenerating(false)
      setIsGeneratingVideo(false)
      setGenerationProgress('')

      // Refund credits on error
      try {
        console.log(`💳 Refunding ${requiredCredits} credits...`)
        const refundResponse = await fetch('/api/credits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: localStorage.getItem('nano_user_id'),
            amount: requiredCredits,
            isRefund: true
          })
        })

        if (refundResponse.ok) {
          const refundData = await refundResponse.json()
          const store = useStore.getState()
          if (store.setUserCredits) {
            store.setUserCredits(refundData.credits)
          }
        }
      } catch (refundError) {
        console.error('❌ Failed to refund credits:', refundError)
      }

      setError(`❌ เกิดข้อผิดพลาด: ${error.message}\n\nเครดิตได้ถูกคืนให้แล้ว`)
    }
  }


  return (
    <div className="space-y-6">
      {/* Success Popup */}
      <AnimatePresence>
        {showSuccessPopup && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl shadow-2xl p-6 border-2 border-white/30">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1">🎉 วิดีโอสร้างเสร็จแล้ว!</h3>
                  <p className="text-sm text-white/90 mb-2">
                    วิดีโอของคุณพร้อมใช้งานแล้ว
                  </p>
                  <div className="bg-red-500/30 backdrop-blur-sm rounded-xl p-4 mt-3 border-2 border-white/50">
                    <p className="text-sm font-bold flex items-start mb-2">
                      <span className="mr-2 text-xl">⚠️</span>
                      <span>
                        สำคัญมาก! ดาวน์โหลดทันที
                      </span>
                    </p>
                    <div className="text-sm space-y-1 pl-7">
                      <p>• วิดีโอนี้มีอายุ <strong>24 ชั่วโมงเท่านั้น</strong></p>
                      <p>• หลัง 24 ชม. ลิงก์จะหมดอายุและไม่สามารถกู้คืนได้</p>
                      <p>• <strong className="underline">ดาวน์โหลดเก็บไว้ในเครื่องทันที</strong></p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowSuccessPopup(false)}
                  className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl shadow-lg">
            <Film className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Video Generation</h2>
            <p className="text-sm text-gray-600">สร้างวิดีโอคุณภาพสูงด้วย AI จากข้อความหรือรูปภาพ</p>
          </div>
        </div>
      </div>

      {/* Sora 2 Beta Warning - Show only for Sora 2 models */}
      {(model === 'sora-2' || model === 'sora-2-hd') && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl shadow-md">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-amber-900 mb-1">⚠️ โมเดล Sora 2 อยู่ในช่วงทดลอง (Beta)</h3>
              <div className="text-sm text-amber-800 space-y-1">
                <p>• <strong>รองรับทั้ง Text-to-Video และ Image-to-Video</strong> - ใช้ได้แล้ว!</p>
                <p>• <strong>ระบบอาจไม่เสถียร</strong> - บางครั้งอาจใช้เวลานานหรือล้มเหลว</p>
                <p>• <strong>API มีปัญหาเป็นครั้งคราว</strong> - หากล้มเหลว เครดิตจะถูกคืนอัตโนมัติ</p>
                <p>• <strong>แนะนำ:</strong> ลองใหม่อีกครั้งหากประสบปัญหา หรือเปลี่ยนไปใช้ Veo 3 แทน</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Selection - Show for all models (Sora 2 now supports image-to-video with max_tokens) */}
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
        <div className="space-y-4">
          {/* Sora Image-to-Video Limitations Warning */}
          {(model === 'sora-2' || model === 'sora-2-hd') && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl shadow-md">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-purple-900 mb-2">🚫 ข้อจำกัดของ Sora Image-to-Video</h3>
                  <div className="text-sm text-purple-800 space-y-1.5">
                    <p><strong>⚠️ ไม่สามารถใช้รูปคนได้:</strong> Sora ไม่รองรับภาพที่มีคนหรือใบหน้า (Content Policy)</p>
                    <p><strong>📱 ปัญหาแนวตั้ง (9:16):</strong> ถ้าสร้างแนวตั้งไม่สำเร็จ ให้ลองสลับเป็น<strong className="text-purple-900"> แนวนอน (16:9)</strong> แทน</p>
                    <p><strong>✅ แนะนำ:</strong> ใช้รูปสินค้า วัตถุ ธรรมชาติ หรือฉากที่ไม่มีคน</p>
                  </div>
                </div>
              </div>
            </div>
          )}

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
          {/* Duration - Only show if there are multiple options */}
          {currentConfig.durations.length > 1 && (
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                ความยาววิดีโอ: <span className="text-red-600">{duration} วินาที</span>
              </label>
              <div className="grid gap-2 grid-cols-4">
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
          )}

          {/* Resolution - Only show if there are multiple options */}
          {availableResolutions.length > 1 && (
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                ความละเอียด: <span className="text-red-600">{resolution}</span>
              </label>
              <div className="grid gap-2 grid-cols-3">
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
          )}

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

      {/* Generation Progress */}
      {generationProgress && (
        <div className="p-4 bg-blue-100 border border-blue-300 rounded-xl text-blue-800">
          <div className="flex items-start">
            <Loader2 className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 animate-spin" />
            <div className="text-sm whitespace-pre-line">{generationProgress}</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-300 rounded-xl text-red-800">
          <div className="flex items-start">
            <X className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm whitespace-pre-line">{error}</div>
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
            สร้างวิดีโอด้วย AI (ใช้ {model === 'sora-2-hd' ? '15' : model === 'veo3-fast' ? '15' : '10'} เครดิต)
          </span>
        )}
      </button>

      {/* Video Result */}
      {videoResult && (
        <div className="p-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-red-200 shadow-xl">
          {/* Warning Banner - Prominent */}
          <div className="mb-5 p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl shadow-lg animate-pulse">
            <div className="flex items-start space-x-3">
              <span className="text-2xl flex-shrink-0">⏰</span>
              <div className="flex-1">
                <p className="font-bold text-lg mb-1">⚠️ วิดีโอนี้หมดอายุใน 24 ชั่วโมง!</p>
                <p className="text-sm">กรุณาดาวน์โหลดเก็บไว้ในเครื่องทันที ลิงก์จะหายหลัง 24 ชม.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center">
              <Play className="h-5 w-5 mr-2 text-red-500" />
              วิดีโอที่สร้างเสร็จแล้ว
            </h3>
            <a
              href={videoResult.videoUrl}
              download={`${model}-video-${Date.now()}.mp4`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold flex items-center space-x-2 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 animate-bounce"
            >
              <Download className="h-5 w-5" />
              <span>ดาวน์โหลดทันที!</span>
            </a>
          </div>

          <div className="flex justify-center">
            <video
              src={videoResult.videoUrl}
              controls
              autoPlay
              loop
              playsInline
              className={`rounded-xl border-2 border-gray-200 shadow-lg ${
                videoResult.aspectRatio === '9:16'
                  ? 'max-w-sm w-full' // Vertical: max 384px width (9:16)
                  : 'w-full max-w-2xl' // Horizontal: max 672px width (16:9) - ลดจาก 4xl
              }`}
            />
          </div>

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
        {(model === 'sora-2' || model === 'sora-2-hd') && (
          <p className="text-sm text-blue-800 mt-2">
            <span className="font-bold">📌 หมายเหตุ:</span>
            {' '}
            {model === 'sora-2' ? 'Sora 2 สร้างวิดีโอ 720p' : 'Sora 2 HD สร้างวิดีโอ 1080p'} ความยาว 10 วินาที (ค่าตายตัว)
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-bold">💳 ใช้เครดิต:</span>
            {' '}
            <span className="text-lg font-bold text-blue-600">
              {model === 'sora-2-hd' ? '15' : model === 'veo3-fast' ? '15' : '10'} เครดิต
            </span>
            {' '}
            / วิดีโอ (คุณมี {userCredits} เครดิต)
          </p>
        </div>
      </div>
    </div>
  )
}
