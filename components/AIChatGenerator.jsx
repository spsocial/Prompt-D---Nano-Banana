import { useState, useRef, useEffect } from 'react'
import { Send, Image as ImageIcon, X, Bot, User, Sparkles, Copy, Check, Trash2, Unlock, Crown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession } from 'next-auth/react'
import ChatUnlockModal from './ChatUnlockModal'
import useStore from '../lib/store'

// Model configurations
const CHAT_MODELS = {
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash-exp',
    displayName: 'Model Flash',
    dailyLimit: 30,
    icon: '⚡'
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    displayName: 'Model Pro',
    dailyLimit: 5,
    icon: '🚀'
  }
}

// Helper function to compress image for mobile
const compressImage = (base64String, maxWidth = 1024, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to compressed JPEG
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
      resolve(compressedBase64)
    }
    img.onerror = reject
    img.src = base64String
  })
}

export default function AIChatGenerator() {
  const { data: session } = useSession()
  const { userCredits, loadUserCredits } = useStore()
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [uploadedImage, setUploadedImage] = useState(null)
  // Default to true - Smart logic will handle: image = analysis, no image = normal chat
  const [useProductAnalysis, setUseProductAnalysis] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash')
  const [requestUsage, setRequestUsage] = useState(null)
  const [showUnlockModal, setShowUnlockModal] = useState(false)

  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Get user-specific storage key
  const getChatStorageKey = () => {
    const email = session?.user?.email
    if (email) {
      // Create a simple hash from email for the key
      return `aiChatHistory_${email.replace(/[^a-zA-Z0-9]/g, '_')}`
    }
    return 'aiChatHistory_guest'
  }

  // Load chat history from localStorage on mount (user-specific)
  useEffect(() => {
    try {
      const storageKey = getChatStorageKey()
      const savedMessages = localStorage.getItem(storageKey)
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages)
        // Keep only last 20 messages
        setMessages(parsed.slice(-20))
      } else {
        // Clear messages when switching to new user with no history
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }, [session?.user?.email]) // Re-run when user changes

  // Save messages to localStorage whenever they change (user-specific)
  useEffect(() => {
    const storageKey = getChatStorageKey()
    if (messages.length > 0) {
      try {
        // Keep only last 20 messages, exclude images to save space
        const messagesToSave = messages.slice(-20).map(msg => ({
          ...msg,
          image: msg.image ? '[IMAGE]' : undefined // Don't save full base64 images
        }))
        localStorage.setItem(storageKey, JSON.stringify(messagesToSave))
      } catch (error) {
        console.error('Failed to save chat history:', error)
      }
    }
  }, [messages, session?.user?.email])

  // Load initial usage data on mount and when model changes
  useEffect(() => {
    const loadUsageData = async () => {
      try {
        const response = await fetch(`/api/chat-ai/usage?model=${selectedModel}`)
        if (response.ok) {
          const data = await response.json()
          if (data.requestUsage) {
            setRequestUsage(data.requestUsage)
          }
        }
      } catch (error) {
        console.error('Failed to load usage data:', error)
      }
    }

    loadUsageData()
  }, [selectedModel])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [inputMessage])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setUploadedImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setUploadedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSendMessage = async () => {
    // Validation
    if (!inputMessage.trim() && !uploadedImage) return

    // Smart logic already handled in backend - no need to warn user
    // Just send the request and let backend decide

    const userMessage = {
      role: 'user',
      content: inputMessage.trim(),
      image: uploadedImage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    const currentImage = uploadedImage
    setUploadedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setIsGenerating(true)

    try {
      // Compress image before sending (especially important for mobile)
      let imageToSend = currentImage
      if (currentImage) {
        try {
          // Compress to max 1024px width, 70% quality
          imageToSend = await compressImage(currentImage, 1024, 0.7)
          console.log('Image compressed:', {
            originalSize: Math.round(currentImage.length / 1024) + 'KB',
            compressedSize: Math.round(imageToSend.length / 1024) + 'KB'
          })
        } catch (compressError) {
          console.error('Image compression failed, using original:', compressError)
          imageToSend = currentImage
        }
      }

      const response = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          image: imageToSend,
          useProductAnalysis: useProductAnalysis,
          model: selectedModel
        })
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        // Not JSON - likely session expired or server error
        if (response.status === 401 || response.status === 403) {
          throw new Error('Session หมดอายุ กรุณา refresh หน้าเว็บและ login ใหม่')
        }
        throw new Error('เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองใหม่อีกครั้ง')
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        throw new Error('ไม่สามารถอ่านข้อมูลจากเซิร์ฟเวอร์ได้ กรุณาลองใหม่')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const aiMessage = {
        role: 'assistant',
        content: data.message,
        parsedData: data.parsedData,
        usedProductAnalysis: data.usedProductAnalysis,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, aiMessage])

      // Update request usage display
      if (data.requestUsage) {
        setRequestUsage(data.requestUsage)
      }

    } catch (error) {
      console.error('Error sending message:', error)

      const errorMessage = {
        role: 'assistant',
        content: `❌ เกิดข้อผิดพลาด: ${error.message}`,
        isError: true,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const copyJSONToClipboard = (jsonData, index) => {
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2))
    setCopiedIndex(`json-${index}`)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const formatTextFromJSON = (data) => {
    // Convert JSON to readable text format (without emoji)
    let text = ''

    if (data.hook) text += `พาดหัว: ${data.hook}\n\n`
    if (data.sub_copy) text += `คำบรรยาย: ${data.sub_copy}\n\n`
    if (data.price) text += `ราคา: ${data.price}\n`
    if (data.contact) text += `ติดต่อ: ${data.contact}\n\n`
    if (data.style) text += `สไตล์: ${data.style}\n\n`
    if (data.layout_direction) text += `การจัดวาง: ${data.layout_direction}\n\n`
    if (data.visual_prompt) text += `Visual Prompt:\n${data.visual_prompt}\n\n`
    if (data.pro_direction) text += `คำแนะนำ: ${data.pro_direction}\n\n`
    if (data.notes) text += `หมายเหตุ: ${data.notes}`

    return text.trim()
  }

  const clearChatHistory = () => {
    if (confirm('ต้องการล้างประวัติการแชททั้งหมดหรือไม่?')) {
      setMessages([])
      const storageKey = getChatStorageKey()
      localStorage.removeItem(storageKey)
    }
  }

  const formatMessage = (msg) => {
    // If it's product analysis response with JSON
    if (msg.parsedData) {
      return (
        <div className="space-y-4">
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-[#00F2EA]" />
              <h3 className="font-bold text-white">การวิเคราะห์โฆษณาสินค้า</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-400 mb-1">📢 พาดหัว:</div>
                <div className="text-white font-semibold text-lg">{msg.parsedData.hook}</div>
              </div>

              <div>
                <div className="text-gray-400 mb-1">📝 คำบรรยาย:</div>
                <div className="text-gray-200">{msg.parsedData.sub_copy}</div>
              </div>

              <div>
                <div className="text-gray-400 mb-1">🎨 สไตล์:</div>
                <div className="text-gray-200">{msg.parsedData.style}</div>
              </div>

              <div>
                <div className="text-gray-400 mb-1">📐 การจัดวาง:</div>
                <div className="text-gray-200">{msg.parsedData.layout_direction}</div>
              </div>

              <div>
                <div className="text-gray-400 mb-1">🎯 Visual Prompt:</div>
                <div className="bg-black rounded-lg p-3 text-gray-300 font-mono text-xs break-words border border-gray-800">
                  {msg.parsedData.visual_prompt}
                </div>
              </div>

              <div>
                <div className="text-gray-400 mb-1">💡 คำแนะนำ:</div>
                <div className="text-gray-200">{msg.parsedData.pro_direction}</div>
              </div>

              {msg.parsedData.colors && msg.parsedData.colors.length > 0 && (
                <div>
                  <div className="text-gray-400 mb-2">🎨 โทนสี:</div>
                  <div className="flex gap-2">
                    {msg.parsedData.colors.map((color, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg border-2 border-white/20"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs text-gray-400">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Full JSON for advanced users */}
          <details className="bg-[#1a1a1a] rounded-lg border border-gray-700">
            <summary className="p-3 cursor-pointer text-gray-400 hover:text-white transition-colors">
              📋 ดู JSON เต็ม (สำหรับนักพัฒนา)
            </summary>
            <div className="p-3 pt-0">
              <pre className="bg-black rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(msg.parsedData, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )
    }

    // Regular text message
    return (
      <div className="prose prose-invert max-w-none">
        <div className="whitespace-pre-wrap text-gray-200">
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#000000]">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-400 mb-2">เริ่มต้นการสนทนา</h3>
              <p className="text-gray-500">พิมพ์ข้อความหรือแนบรูปภาพเพื่อเริ่มแชทกับ AI</p>

              {/* Tips */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-[#00F2EA] mt-1" />
                    <div>
                      <h4 className="font-semibold text-white mb-1">แชทธรรมดา</h4>
                      <p className="text-sm text-gray-400">ปิดสวิช "วิเคราะห์สินค้า" เพื่อคุยกับ AI แบบทั่วไป</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#00F2EA]/30">
                  <div className="flex items-start gap-3">
                    <ImageIcon className="h-5 w-5 text-[#FE2C55] mt-1" />
                    <div>
                      <h4 className="font-semibold text-white mb-1">วิเคราะห์โฆษณา</h4>
                      <p className="text-sm text-gray-400">เปิดสวิช + แนบรูปสินค้า เพื่อสร้างไอเดียโฆษณา</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Show clear history button when there are messages
            <div className="flex justify-end mb-4">
              <button
                onClick={clearChatHistory}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 rounded-lg text-xs text-red-400 hover:text-red-300 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>ล้างประวัติ</span>
              </button>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00F2EA] to-[#FE2C55] flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  </div>
                )}

                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white'
                      : msg.isError
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                      : 'bg-[#1a1a1a] border border-gray-700 text-gray-200'
                  }`}>
                    {msg.image && (
                      <div className="mb-3">
                        <img
                          src={msg.image}
                          alt="Uploaded"
                          className="rounded-lg max-h-48 object-contain"
                        />
                      </div>
                    )}

                    {formatMessage(msg)}
                  </div>

                  {/* Copy buttons for AI messages */}
                  {msg.role === 'assistant' && !msg.isError && (
                    <div className="mt-2 flex gap-2">
                      {/* Copy as text button */}
                      <button
                        onClick={() => copyToClipboard(msg.parsedData ? formatTextFromJSON(msg.parsedData) : msg.content, index)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-[#00F2EA]/20 border border-gray-700 hover:border-[#00F2EA] rounded-lg text-xs text-gray-400 hover:text-[#00F2EA] transition-all flex items-center gap-1.5"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>คัดลอก Prompt</span>
                          </>
                        )}
                      </button>

                      {/* Copy JSON button (only for product analysis) */}
                      {msg.parsedData && (
                        <button
                          onClick={() => copyJSONToClipboard(msg.parsedData, index)}
                          className="px-3 py-1.5 bg-purple-900/30 hover:bg-purple-600/30 border border-purple-700/50 hover:border-purple-500 rounded-lg text-xs text-purple-300 hover:text-purple-200 transition-all flex items-center gap-1.5"
                        >
                          {copiedIndex === `json-${index}` ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>คัดลอกแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>คัดลอก JSON</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="flex-shrink-0 order-2">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00F2EA] to-[#FE2C55] flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#00F2EA] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#00F2EA] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#00F2EA] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Input Box - Exact same style as Image/Video mode */}
      <div className="sticky bottom-0 z-20 backdrop-blur-lg bg-[#121212]/95 border-t border-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Uploaded Image Preview */}
          {uploadedImage && (
            <div className="mb-3 relative inline-block">
              <img src={uploadedImage} alt="Upload" className="h-20 rounded-lg border border-gray-700" />
              <button
                onClick={handleRemoveImage}
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
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={useProductAnalysis ? "แนบรูปสินค้าและบอกว่าต้องการโฆษณาแบบไหน..." : "พิมพ์ข้อความเพื่อแชทกับ AI..."}
              className="w-full px-4 py-4 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none"
              rows={1}
              disabled={isGenerating}
              style={{ maxHeight: '200px' }}
            />

            {/* Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
              {/* Left Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Image Upload */}
                <label className="cursor-pointer group">
                  <input
                    ref={fileInputRef}
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

                {/* Product Analysis Toggle */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={useProductAnalysis}
                    onChange={(e) => setUseProductAnalysis(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative w-10 h-5 rounded-full transition-colors ${
                    useProductAnalysis ? 'bg-[#00F2EA]' : 'bg-gray-700'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      useProductAnalysis ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                    {useProductAnalysis ? 'วิเคราะห์สินค้า ✓' : 'วิเคราะห์สินค้า'}
                  </span>
                </label>

                {/* Usage Info + Unlock Button */}
                <div className="flex items-center gap-2 ml-2">
                  <div className="text-xs text-gray-500">
                    {requestUsage ? (
                      requestUsage.isUnlimited ? (
                        // Unlimited status
                        <span className="flex items-center gap-1">
                          <Crown className="h-3 w-3 text-yellow-500" />
                          <span className="text-yellow-500 font-semibold">Unlimited</span>
                          <span className="text-gray-500">
                            (หมด {new Date(requestUsage.unlimitedUntil).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        </span>
                      ) : (
                        // Normal usage
                        <span>
                          ใช้ฟรี <span className={`font-semibold ${
                            requestUsage.requestsUsed >= requestUsage.dailyLimit
                              ? 'text-[#FE2C55]'
                              : 'text-[#00F2EA]'
                          }`}>{requestUsage.requestsUsed}/{requestUsage.dailyLimit}</span> ครั้ง
                        </span>
                      )
                    ) : (
                      <span>โหลด...</span>
                    )}
                  </div>

                  {/* Unlock Button - Show when limit reached and not unlimited */}
                  {requestUsage && !requestUsage.isUnlimited && requestUsage.requestsUsed >= requestUsage.dailyLimit && (
                    <button
                      onClick={() => setShowUnlockModal(true)}
                      className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white text-xs font-medium rounded-lg transition-all animate-pulse hover:animate-none"
                    >
                      <Unlock className="h-3 w-3" />
                      <span>ปลดล็อค</span>
                    </button>
                  )}
                </div>

                {/* Model Selector */}
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-[#00F2EA] rounded-lg text-xs text-gray-300 transition-all cursor-pointer focus:outline-none focus:border-[#00F2EA] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {Object.entries(CHAT_MODELS).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {config.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Right - Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={isGenerating || (!inputMessage.trim() && !uploadedImage)}
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
        </div>
      </div>

      {/* Unlock Modal */}
      <ChatUnlockModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        userCredits={userCredits}
        onUnlock={(data) => {
          // Reload usage data after unlock
          const loadUsageData = async () => {
            try {
              const response = await fetch(`/api/chat-ai/usage?model=${selectedModel}`)
              if (response.ok) {
                const usageData = await response.json()
                if (usageData.requestUsage) {
                  setRequestUsage(usageData.requestUsage)
                }
              }
            } catch (error) {
              console.error('Failed to reload usage data:', error)
            }
          }
          loadUsageData()

          // Reload user credits
          if (session?.user?.email) {
            const userId = `U-${session.user.email.split('@')[0].toUpperCase()}`
            loadUserCredits(userId)
          }
        }}
      />
    </>
  )
}
