import { useState, useRef, useEffect } from 'react'
import { Send, Image as ImageIcon, Film, Sparkles, Clock, AspectRatio as AspectRatioIcon, X, Download, Play, ChevronDown, Layers, User, History as HistoryIcon, CreditCard, LogOut } from 'lucide-react'
import useStore from '../lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import VideoAdsModal from './VideoAdsModal'
import FabButton from './FabButton'

// Preset prompt styles for image generation
const PROMPT_STYLES = {
  premium: {
    name: 'พรีเมี่ยมหรูหรา',
    icon: '💎',
    prompt: `สร้างภาพโฆษณาสินค้าจากภาพต้นฉบับ ในบรรยากาศที่หรูหราและทรงพลัง ถ่ายทอดความรู้สึกระดับพรีเมียมอย่างชัดเจน ออกแบบการจัดวางองค์ประกอบภาพอย่างพิถีพิถันเหมือนงานโฆษณามืออาชีพ จัดแสงเงาให้โดดเด่นและเสริมความงามของตัวสินค้า พร้อมเลือกฉากหลังที่มีความหรูหรา กลมกลืน และสื่อถึงคุณค่าของแบรนด์
ภาพที่ได้ต้องคมชัดในระดับไฮเปอร์เรียลลิสติก รายละเอียดสมจริงทุกมุมมอง โทนสีเน้นความมีระดับ สะท้อนภาพลักษณ์ที่น่าเชื่อถือ ดูทันสมัย และสร้างแรงดึงดูดให้ผู้ชมรู้สึกว่าผลิตภัณฑ์นี้มีคุณค่าเหนือกว่าใคร`
  },
  floating: {
    name: 'ลอยในอากาศ',
    icon: '🎈',
    prompt: `สร้างภาพโฆษณาสินค้าจากภาพต้นฉบับ แบบลอยอยู่ในอากาศ และมีส่วนประกอบต่างๆที่สอดคล้องกับตัวสินค้าลอยอยู่รอบๆ เหมือนโฆษณาสินค้าที่มากประสบการณ์แบบมืออาชีพ พร้อมเลือกฉากหลังที่มีความกลมกลืน และสื่อถึงคุณค่าของแบรนด์
ภาพที่ได้ต้องคมชัดในระดับไฮเปอร์เรียลลิสติก รายละเอียดสมจริงทุกมุมมอง โทนสีเน้นความมีระดับ สะท้อนภาพลักษณ์ที่น่าเชื่อถือ ดูทันสมัย และสร้างแรงดึงดูดให้ผู้ชมรู้สึกว่าผลิตภัณฑ์นี้มีคุณค่าเหนือกว่าใคร`
  },
  moody: {
    name: 'โทนภาพ Moody',
    icon: '🌙',
    prompt: `สร้างภาพโฆษณาสินค้าจากภาพต้นฉบับ ในโทนภาพที่มีอารมณ์และความลึกลับ (Moody) ให้ความรู้สึกอบอุ่นและเป็นธรรมชาติ ใช้แสงและเงาเพื่อสร้างบรรยากาศที่ลึกซึ้งและมีอารมณ์ เน้นพื้นผิวที่ดูเป็นธรรมชาติ เช่น ไม้ หิน หรือผ้าลินิน จัดองค์ประกอบให้ดูเรียบง่ายแต่มีความลึก ใช้สีโทนอบอุ่นและเย็นผสมผสานกันอย่างลงตัว เพื่อสื่อถึงความเป็นธรรมชาติและความน่าเชื่อถือของสินค้า`
  },
  cinematic: {
    name: '3D Cinematic',
    icon: '🎬',
    prompt: `โฆษณา 3D แบบ Cinematic ที่น่าทึ่งสำหรับสินค้าจากภาพต้นฉบับ จัดเฟรมใน ฉาก mid-motion สุดดราม่า ที่จับพลังงานการระเบิดของมันไว้ในเพียงชั่วขณะเดียวที่หยุดนิ่ง การจัดแสงเป็นแบบ high-key ที่ทรงพลัง พร้อมด้วย ประกายสะท้อนแสงแวววาว และ เงาลึกเข้ม ที่ช่วยเสริมรูปร่างของผลิตภัณฑ์ รายละเอียดขั้นสูง โฟกัสคมกริบระดับคริสตัล และ สีสันสดจัดจ้าน เพื่อให้ได้ภาพที่สะดุดตา`
  },
  productHero: {
    name: 'Product Hero',
    icon: '🏆',
    prompt: `Transform this product photo into a professional advertising image. Keep the original product shape, logo, and text exactly as in the reference. Make it look high-quality, sharp, and realistic. Focus on: Hero shot of the product in the center, well-lit with cinematic lighting. Add realistic environment and props related to the product theme. Enhance textures: condensation drops, fresh ingredients, splashes, or glowing highlights. Depth of field with natural background blur. Vibrant, commercial-grade color grading. Style: modern product advertising photography, professional, high impact`
  },
  custom: {
    name: 'ใส่ Prompt เอง',
    icon: '✏️',
    prompt: ''
  }
}

const IMAGE_MODELS = {
  banana: {
    id: 'banana',
    name: 'Nano Banana',
    icon: '🍌',
    description: 'Gemini 2.5 - วิเคราะห์และสร้างโฆษณา'
  }
}

export default function ChatInterfaceGenerator() {
  const [mode, setMode] = useState('video') // 'image' or 'video'
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(10)
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [messages, setMessages] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Video generation specific states
  const [allowWatermark, setAllowWatermark] = useState(false)

  // Image generation specific states
  const [selectedStyle, setSelectedStyle] = useState('premium')
  const [numberOfImages, setNumberOfImages] = useState(1)
  const [selectedModel, setSelectedModel] = useState('banana')
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  // Confirmation popup
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [pendingGeneration, setPendingGeneration] = useState(null)

  // Switch aspect ratio when changing mode
  useEffect(() => {
    setAspectRatio(prev => {
      // Define valid ratios for each mode
      const imageRatios = ['1:1', '4:5', '9:16', '2:3', '3:4', '3:2', '4:3', '16:9', '21:9']
      const videoRatios = ['16:9', '9:16']

      // If switching to image mode and current ratio is not valid for images
      if (mode === 'image' && !imageRatios.includes(prev)) {
        return '1:1' // Default to square for images
      }

      // If switching to video mode and current ratio is not valid for videos
      if (mode === 'video' && !videoRatios.includes(prev)) {
        return '16:9' // Default to landscape for videos
      }

      return prev
    })
  }, [mode])

  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)

  const { userId, userCredits, useCredits, refundCredits, setIsGeneratingVideo, addToHistory, addVideoToHistory, showVideoAdsModal, videoAdsPreloadedImage, openVideoAdsModal, closeVideoAdsModal } = useStore()
  const { data: session } = useSession()
  const router = useRouter()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [prompt])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('[data-profile-menu]')) {
        setShowProfileMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileMenu])

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพ')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 10MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setUploadedImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedImage) {
      alert('กรุณาใส่ prompt หรืออัพโหลดรูปภาพ')
      return
    }

    // Calculate credits
    const requiredCredits = mode === 'video'
      ? (duration === 15 ? 15 : 10)
      : (numberOfImages * 1) // 1 credit per image

    if (userCredits < requiredCredits) {
      alert(`เครดิตไม่เพียงพอ! ต้องการ ${requiredCredits} เครดิต`)
      return
    }

    // Show confirmation popup before generating
    setPendingGeneration({
      prompt,
      uploadedImage,
      mode,
      duration,
      aspectRatio,
      numberOfImages,
      selectedStyle,
      requiredCredits
    })
    setShowConfirmPopup(true)
  }

  // Actual generation function (called after confirmation)
  const actualGenerate = async () => {
    setShowConfirmPopup(false)

    if (!pendingGeneration) return

    const { prompt, uploadedImage, mode, duration, aspectRatio, numberOfImages, selectedStyle, requiredCredits } = pendingGeneration

    // Add user message
    const currentTime = new Date().toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const userMessage = {
      id: Date.now(),
      type: 'user',
      prompt: prompt,
      image: uploadedImage,
      mode: mode,
      duration: duration,
      aspectRatio: aspectRatio,
      numberOfImages: numberOfImages,
      style: selectedStyle,
      timestamp: currentTime
    }
    setMessages(prev => [...prev, userMessage])

    // Clear input
    const currentPrompt = prompt
    const currentImage = uploadedImage
    setPrompt('')
    setUploadedImage(null)
    setIsGenerating(true)
    if (mode === 'video') setIsGeneratingVideo(true)

    // Add loading message
    const loadingMessage = {
      id: Date.now() + 1,
      type: 'loading',
      mode: mode
    }
    setMessages(prev => [...prev, loadingMessage])

    try {
      // Deduct credits
      await useCredits(requiredCredits)

      if (mode === 'video') {
        // Add "no text" instruction to prevent Thai text overlays
        const videoPrompt = currentPrompt
          ? `${currentPrompt} อย่าใส่ตัวหนังสือภาษาไทยที่คิดขึ้นมาเอง`
          : 'Create cinematic video อย่าใส่ตัวหนังสือภาษาไทยที่คิดขึ้นมาเอง'

        // Detect mobile for proper endpoint selection
        const isMobileDevice = isMobile()

        // Mobile: Use start endpoint (creates task, returns immediately)
        // Desktop: Use primary endpoint (creates task + polls for result)
        const apiEndpoint = isMobileDevice
          ? '/api/video-tasks/start'
          : '/api/generate-video-kie-primary'

        const controller = new AbortController()
        const timeoutId = isMobileDevice
          ? setTimeout(() => controller.abort(), 30 * 1000) // 30s for mobile (just creating task)
          : setTimeout(() => controller.abort(), 15 * 60 * 1000) // 15 min for desktop (full generation)

        let response
        try {
          response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: videoPrompt,
              image: currentImage,
              duration: duration,
              aspectRatio: aspectRatio,
              model: 'sora-2',
              allowWatermark: allowWatermark,
              userId: userId || 'anonymous'
            }),
            signal: controller.signal
          })
        } catch (fetchError) {
          clearTimeout(timeoutId)
          // Check if it's a timeout/abort error
          if (fetchError.name === 'AbortError') {
            throw new Error('⏱️ การสร้างวิดีโอใช้เวลานานเกินไป - กรุณาลองใหม่อีกครั้ง')
          }
          // Network error
          throw new Error('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ - กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต')
        }
        clearTimeout(timeoutId)

        setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id))

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Video generation failed')
        }

        const data = await response.json()

        // Mobile returns isPending, desktop returns videoUrl
        if (data.isPending) {
          // Mobile: Task created, show simple message
          const infoMessage = {
            id: Date.now() + 2,
            type: 'info',
            message: '🎬 วิดีโอกำลังสร้างอยู่\n\nกรุณารอ 5-10 นาที แล้วติดต่อแอดมินเพื่อรับลิงค์คลิป'
          }
          setMessages(prev => [...prev, infoMessage])

          setIsGenerating(false)
          setIsGeneratingVideo(false)
          return
        }

        // Desktop: Normal success case
        const resultMessage = {
          id: Date.now() + 2,
          type: 'result',
          mode: 'video',
          url: data.videoUrl,
          data: data
        }
        setMessages(prev => [...prev, resultMessage])

        // Save to history
        await addVideoToHistory({
          videoUrl: data.videoUrl,
          prompt: currentPrompt || 'Create video',
          duration: duration,
          aspectRatio: aspectRatio,
          style: 'Video Generation',
          asyncDataUrl: data.asyncDataUrl
        })

      } else {
        // Image generation with Nano Banana
        const selectedStylePrompt = PROMPT_STYLES[selectedStyle].prompt
        const finalPrompt = selectedStyle === 'custom' ? currentPrompt : (currentPrompt || selectedStylePrompt)

        // Step 1: Analyze (if image provided) or prepare prompts
        let prompts = []

        if (currentImage) {
          // Image-to-Image: analyze first
          const analyzeResponse = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: currentImage,
              customPrompt: finalPrompt,
              selectedStyle: selectedStyle,
              numberOfImages: numberOfImages,
              aspectRatio: aspectRatio
            })
          })

          if (!analyzeResponse.ok) {
            throw new Error('Failed to analyze image')
          }

          const { prompts: analyzedPrompts } = await analyzeResponse.json()
          prompts = analyzedPrompts.slice(0, numberOfImages)
        } else {
          // Text-to-Image: use custom prompt directly
          prompts = Array(numberOfImages).fill(null).map((_, i) => ({
            style: `Text-to-Image ${i + 1}`,
            prompt: finalPrompt
          }))
        }

        // Step 2: Generate images
        const generateResponse = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompts: prompts,
            originalImage: currentImage,
            aspectRatio: aspectRatio
          })
        })

        setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id))

        if (!generateResponse.ok) {
          throw new Error('Failed to generate images')
        }

        const { results } = await generateResponse.json()

        // Add each result as separate message
        results.forEach((result, index) => {
          const resultMessage = {
            id: Date.now() + 2 + index,
            type: 'result',
            mode: 'image',
            url: result.imageUrl,
            data: result
          }
          setMessages(prev => [...prev, resultMessage])
        })

        // Save each image to history
        for (const result of results) {
          await addToHistory({
            imageUrl: result.imageUrl,
            prompt: result.prompt || finalPrompt,
            style: result.style || PROMPT_STYLES[selectedStyle].name,
            aspectRatio: aspectRatio
          })
        }
      }

    } catch (error) {
      console.error('Generation error:', error)

      // Refund credits on error (but NOT for video network errors)
      let refundSuccess = false
      if (!error.isVideoNetworkError) {
        refundSuccess = await refundCredits(requiredCredits, error.message || 'Generation failed')
      } else {
        console.log('⚠️ Video network error - NOT refunding credits (video is still processing)')
      }

      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id))

      const errorMessage = {
        id: Date.now() + 3,
        type: 'error',
        message: error.message + (error.isVideoNetworkError
          ? '' // Don't add refund message for video network errors (already in error message)
          : refundSuccess
            ? ' (เครดิตถูกคืนให้อัตโนมัติแล้ว)'
            : ' ⚠️ กรุณาติดต่อแอดมินเพื่อคืนเครดิต')
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
      if (mode === 'video') setIsGeneratingVideo(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  const handleOpenAdsModalWithImage = (imageUrl) => {
    setMode('video') // Switch to video mode
    openVideoAdsModal(imageUrl)
  }

  // Detect mobile device
  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  const handleAdsSubmit = async (formData) => {
    // Credits based on duration: 10s = 10 credits, 15s = 15 credits
    const requiredCredits = formData.duration === 15 ? 15 : 10

    if (userCredits < requiredCredits) {
      alert(`เครดิตไม่เพียงพอ! ต้องการ ${requiredCredits} เครดิต`)
      return
    }

    // Add timestamp
    const currentTime = new Date().toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      prompt: `สร้างวิดีโอโฆษณา: ${formData.productName}`,
      image: formData.image,
      mode: 'video-ads',
      duration: formData.duration,
      aspectRatio: formData.aspectRatio,
      style: formData.style,
      timestamp: currentTime
    }
    setMessages(prev => [...prev, userMessage])

    // Close modal
    closeVideoAdsModal()

    setIsGenerating(true)
    setIsGeneratingVideo(true)

    // Add loading message
    const loadingMessage = {
      id: Date.now() + 1,
      type: 'loading',
      mode: 'video'
    }
    setMessages(prev => [...prev, loadingMessage])

    try {
      // Deduct credits
      await useCredits(requiredCredits)

      // Always use primary endpoint for consistent behavior
      const apiEndpoint = '/api/generate-video-kie-primary';

      // Generate video with KIE.AI
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000) // 15 minutes

      let response
      try {
        response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: formData.prompt,
            image: formData.image,
            duration: formData.duration,
            aspectRatio: formData.aspectRatio,
            model: 'sora-2',
            allowWatermark: false,
            userId: typeof window !== 'undefined' ? localStorage.getItem('nano_user_id') : 'anonymous'
          }),
          signal: controller.signal
        })
      } catch (fetchError) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('⏱️ การสร้างวิดีโอใช้เวลานานเกินไป (>15 นาที) - กรุณาลองใหม่อีกครั้ง')
        }
        throw new Error('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ - กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต')
      }
      clearTimeout(timeoutId)

      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id))

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Video generation failed')
      }

      const data = await response.json()

      // Normal success case
      const resultMessage = {
        id: Date.now() + 2,
        type: 'result',
        mode: 'video',
        url: data.videoUrl,
        data: data
      }
      setMessages(prev => [...prev, resultMessage])

      // Save to history
      await addVideoToHistory({
        videoUrl: data.videoUrl,
        prompt: formData.prompt,
        duration: formData.duration,
        aspectRatio: formData.aspectRatio,
        style: `Video Ads - ${formData.style}`,
        asyncDataUrl: data.asyncDataUrl
      })

    } catch (error) {
      console.error('Video ads generation error:', error)

      // Refund credits on error
      const refundSuccess = await refundCredits(requiredCredits, error.message || 'Video ads generation failed')

      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id))

      const errorMessage = {
        id: Date.now() + 3,
        type: 'error',
        message: error.message + (refundSuccess
          ? ' (เครดิตถูกคืนให้อัตโนมัติแล้ว)'
          : ' ⚠️ กรุณาติดต่อแอดมินเพื่อคืนเครดิต')
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
      setIsGeneratingVideo(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#000000]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg bg-[#121212]/90 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="PD Studio" className="h-8 w-8 object-contain" />
                <h1 className="text-xl font-bold text-white">PD Studio</h1>
              </div>
            </div>

            {/* Mode Toggle - TikTok Style */}
            <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-full p-1">
              <button
                onClick={() => setMode('image')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'image'
                    ? 'bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ImageIcon className="h-4 w-4 inline mr-1" />
                Image
              </button>
              <button
                onClick={() => setMode('video')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  mode === 'video'
                    ? 'bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Film className="h-4 w-4 inline mr-1" />
                Video
              </button>
            </div>

            {/* Right Section: Credits + Profile */}
            <div className="flex items-center gap-3">
              {/* Credits */}
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-full">
                <Sparkles className="h-4 w-4 text-[#FE2C55]" />
                <span className="text-sm font-semibold text-white">{userCredits}</span>
                <span className="text-xs text-gray-400">credits</span>
              </div>

              {/* Profile Button */}
              <div className="relative" data-profile-menu>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00F2EA] to-[#FE2C55] p-0.5 hover:shadow-lg hover:shadow-[#00F2EA]/50 transition-all"
                >
                  {session?.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-xl overflow-hidden z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-800">
                      <p className="text-sm font-semibold text-white">{session?.user?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{session?.user?.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          router.push('/profile')
                        }}
                        className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-[#00F2EA]/10 hover:text-[#00F2EA] flex items-center gap-2 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        ข้อมูลส่วนตัว
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          router.push('/history')
                        }}
                        className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-[#00F2EA]/10 hover:text-[#00F2EA] flex items-center gap-2 transition-colors"
                      >
                        <HistoryIcon className="h-4 w-4" />
                        ประวัติการสร้าง
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          router.push('/topup')
                        }}
                        className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-[#00F2EA]/10 hover:text-[#00F2EA] flex items-center gap-2 transition-colors"
                      >
                        <CreditCard className="h-4 w-4" />
                        เติมเครดิต
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false)
                          signOut({ callbackUrl: '/' })
                        }}
                        className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        ออกจากระบบ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8 pt-24">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#00F2EA]/20 to-[#FE2C55]/20 rounded-full mb-6">
                <Sparkles className="h-10 w-10 text-[#00F2EA]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">สร้างคอนเทนต์ด้วย AI</h2>
              <p className="text-gray-400">บอก AI ว่าคุณต้องการอะไร แล้วปล่อยให้มันสร้างให้คุณ</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onCreateVideoAd={handleOpenAdsModalWithImage}
                />
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Input Box - TikTok Style */}
      <div className="sticky bottom-0 z-20 backdrop-blur-lg bg-[#121212]/95 border-t border-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Uploaded Image Preview */}
          {uploadedImage && (
            <div className="mb-3 relative inline-block">
              <img src={uploadedImage} alt="Upload" className="h-20 rounded-lg border border-gray-700" />
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute -top-2 -right-2 p-1 bg-[#FE2C55] rounded-full text-white hover:bg-[#ff0050] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Main Input Container */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={mode === 'video' ? 'อธิบายวิดีโอที่คุณต้องการ...' : 'อธิบายภาพที่คุณต้องการ...'}
              className="w-full px-4 py-4 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none"
              rows={1}
              disabled={isGenerating}
              style={{ maxHeight: '200px' }}
            />

            {/* Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
              {/* Left Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Image Upload - Always visible */}
                <label className="cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isGenerating}
                  />
                  <div className={`p-2 rounded-lg transition-all ${
                    uploadedImage
                      ? 'bg-[#00F2EA]/20 border border-[#00F2EA]'
                      : 'hover:bg-gray-800'
                  }`}>
                    <ImageIcon className={`h-5 w-5 ${
                      uploadedImage
                        ? 'text-[#00F2EA]'
                        : 'text-gray-400 group-hover:text-[#00F2EA]'
                    }`} />
                  </div>
                </label>

                {/* Video-specific controls */}
                {mode === 'video' && (
                  <>
                    {/* Duration Toggle */}
                    <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-lg p-1">
                      <button
                        onClick={() => setDuration(10)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                          duration === 10
                            ? 'bg-[#00F2EA] text-black'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        10s
                      </button>
                      <button
                        onClick={() => setDuration(15)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                          duration === 15
                            ? 'bg-[#00F2EA] text-black'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        15s
                      </button>
                    </div>

                    {/* Watermark Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={allowWatermark}
                        onChange={(e) => setAllowWatermark(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`relative w-10 h-5 rounded-full transition-colors ${
                        allowWatermark ? 'bg-[#FE2C55]' : 'bg-gray-700'
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          allowWatermark ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                      <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                        {allowWatermark ? 'Watermark ✓' : 'No Watermark'}
                      </span>
                    </label>
                  </>
                )}

                {/* Image-specific controls */}
                {mode === 'image' && (
                  <>
                    {/* Prompt Style Dropdown */}
                    <select
                      value={selectedStyle}
                      onChange={(e) => setSelectedStyle(e.target.value)}
                      className="px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded-lg text-xs text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-1 focus:ring-[#00F2EA]"
                      disabled={isGenerating}
                    >
                      {Object.entries(PROMPT_STYLES).map(([key, style]) => (
                        <option key={key} value={key}>
                          {style.icon} {style.name}
                        </option>
                      ))}
                    </select>

                    {/* Number of Images */}
                    <select
                      value={numberOfImages}
                      onChange={(e) => setNumberOfImages(parseInt(e.target.value))}
                      className="px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded-lg text-xs text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-1 focus:ring-[#00F2EA]"
                      disabled={isGenerating}
                    >
                      <option value="1">1 รูป</option>
                      <option value="2">2 รูป</option>
                      <option value="3">3 รูป</option>
                      <option value="4">4 รูป</option>
                    </select>

                    {/* Model Selector */}
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded-lg text-xs text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-1 focus:ring-[#00F2EA]"
                      disabled={isGenerating}
                    >
                      {Object.entries(IMAGE_MODELS).map(([key, model]) => (
                        <option key={key} value={key}>
                          {model.icon} {model.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {/* Aspect Ratio Dropdown */}
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="px-3 py-1 bg-[#0a0a0a] border border-gray-700 rounded-lg text-xs text-white hover:bg-gray-800 transition-colors focus:outline-none focus:ring-1 focus:ring-[#00F2EA]"
                  disabled={isGenerating}
                >
                  {mode === 'image' ? (
                    <>
                      <option value="1:1">1:1</option>
                      <option value="4:5">4:5</option>
                      <option value="9:16">9:16</option>
                      <option value="2:3">2:3</option>
                      <option value="3:4">3:4</option>
                      <option value="3:2">3:2</option>
                      <option value="4:3">4:3</option>
                      <option value="16:9">16:9</option>
                      <option value="21:9">21:9</option>
                    </>
                  ) : (
                    <>
                      <option value="16:9">16:9</option>
                      <option value="9:16">9:16</option>
                    </>
                  )}
                </select>

                {/* Video Ads Button - Only in video mode */}
                {mode === 'video' && (
                  <button
                    onClick={() => openVideoAdsModal()}
                    disabled={isGenerating}
                    className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    <span>🎙️</span>
                    <span>ฟอร์มโฆษณา</span>
                  </button>
                )}
              </div>

              {/* Send Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt.trim() && !uploadedImage)}
                className="p-3 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#00F2EA]/50 transition-all"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            กด Enter เพื่อส่ง • Shift+Enter เพื่อขึ้นบรรทัดใหม่
          </div>
        </div>
      </div>

      {/* Video Ads Modal */}
      <VideoAdsModal
        isOpen={showVideoAdsModal}
        onClose={closeVideoAdsModal}
        onSubmit={handleAdsSubmit}
        initialImage={videoAdsPreloadedImage}
      />

      {/* Confirmation Popup */}
      <AnimatePresence>
        {showConfirmPopup && pendingGeneration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirmPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#00F2EA]" />
                ยืนยันการสร้าง
              </h3>

              <div className="space-y-3 mb-6">
                {/* Mode */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">โหมด:</span>
                  <span className="text-white font-medium">
                    {pendingGeneration.mode === 'video' ? '🎬 วิดีโอ' : '🖼️ รูปภาพ'}
                  </span>
                </div>

                {/* Credits */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">เครดิตที่ใช้:</span>
                  <span className="text-[#00F2EA] font-bold text-lg">
                    {pendingGeneration.requiredCredits} เครดิต
                  </span>
                </div>

                {/* Video specific info */}
                {pendingGeneration.mode === 'video' && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">ความยาว:</span>
                      <span className="text-white">{pendingGeneration.duration} วินาที</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">อัตราส่วน:</span>
                      <span className="text-white">{pendingGeneration.aspectRatio}</span>
                    </div>
                  </>
                )}

                {/* Image specific info */}
                {pendingGeneration.mode === 'image' && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">จำนวนรูป:</span>
                      <span className="text-white">{pendingGeneration.numberOfImages} รูป</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">สไตล์:</span>
                      <span className="text-white">
                        {PROMPT_STYLES[pendingGeneration.selectedStyle]?.name || 'กำหนดเอง'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">อัตราส่วน:</span>
                      <span className="text-white">{pendingGeneration.aspectRatio}</span>
                    </div>
                  </>
                )}

                {/* Mobile warning */}
                {isMobile() && pendingGeneration.mode === 'video' && (
                  <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm font-medium flex items-center gap-2">
                      <span className="text-lg">📱</span>
                      <span><strong>มือถือ: อย่าพับจอขณะสร้างคลิป!</strong></span>
                    </p>
                    <p className="text-red-300 text-xs mt-1">
                      หากพับจอ คลิปจะสร้างต่อในระบบ แต่คุณต้องติดต่อแอดมินเพื่อรับลิงค์
                    </p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmPopup(false)}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={actualGenerate}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] hover:shadow-lg hover:shadow-[#00F2EA]/50 text-white rounded-xl font-medium transition-all"
                >
                  ยืนยันสร้าง
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button - Contact Support */}
      <FabButton />
    </div>
  )
}

// Message Bubble Component
function MessageBubble({ message, onCreateVideoAd }) {
  if (message.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-2xl">
          {message.image && (
            <img src={message.image} alt="Input" className="rounded-lg mb-2 max-h-40 ml-auto" />
          )}
          <div className="bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-sm whitespace-pre-wrap">{message.prompt}</p>
            <div className="flex items-center gap-2 mt-2 text-xs opacity-80 flex-wrap">
              <span>{message.mode === 'video' ? '🎬 Video' : '🖼️ Image'}</span>
              {message.mode === 'video' ? (
                <>
                  <span>•</span>
                  <span>{message.duration}s</span>
                </>
              ) : (
                <>
                  <span>•</span>
                  <span>{message.numberOfImages || 1}x</span>
                  {message.style && PROMPT_STYLES[message.style] && (
                    <>
                      <span>•</span>
                      <span>{PROMPT_STYLES[message.style].name}</span>
                    </>
                  )}
                </>
              )}
              <span>•</span>
              <span>{message.aspectRatio}</span>
              {message.timestamp && (
                <>
                  <span>•</span>
                  <span className="opacity-60">🕐 {message.timestamp}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (message.type === 'loading') {
    return (
      <div className="flex justify-start">
        <div className="bg-[#1a1a1a] rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#00F2EA] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-[#00F2EA] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-[#00F2EA] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-sm text-gray-400 ml-2">กำลังสร้าง...</span>
          </div>
        </div>
      </div>
    )
  }

  if (message.type === 'error') {
    return (
      <div className="flex justify-start">
        <div className="bg-[#FE2C55]/20 border border-[#FE2C55] rounded-2xl rounded-tl-sm px-4 py-3 max-w-2xl">
          <p className="text-sm text-[#FE2C55]">❌ {message.message}</p>
        </div>
      </div>
    )
  }

  if (message.type === 'result') {
    return (
      <div className="flex justify-start">
        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden max-w-2xl border border-gray-800">
          {message.mode === 'video' ? (
            <video
              src={message.url}
              controls
              className="w-full"
              style={{ maxHeight: '500px' }}
            />
          ) : (
            <img
              src={message.url}
              alt="Generated"
              className="w-full"
              style={{ maxHeight: '500px' }}
            />
          )}
          <div className="p-3 border-t border-gray-800 flex items-center gap-2 flex-wrap">
            <a
              href={message.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
            >
              <Download className="h-4 w-4" />
              ดาวน์โหลด
            </a>
            {/* Show "Create Video Ad" button only for images */}
            {message.mode === 'image' && onCreateVideoAd && (
              <button
                onClick={() => onCreateVideoAd(message.url)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
              >
                <Film className="h-4 w-4" />
                สร้าง VDO โฆษณา
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
