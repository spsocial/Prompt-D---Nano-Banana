import { useState, useRef, useEffect } from 'react'
import { X, Upload, Image as ImageIcon, Sparkles, Film } from 'lucide-react'

// Prompt templates for video ads
const ADS_TEMPLATES = {
  cgi: {
    name: 'CGI Style',
    icon: '🎬',
    description: 'สไตล์ CGI สมจริง เหมาะกับสินค้าทั่วไป',
    format: 'โฆษณา{productName} แนว CGI {gender}พูด"{script}" อย่าใส่ตัวหนังสือภาษาไทยที่คิดขึ้นมาเอง'
  },
  cinematic: {
    name: 'Cinematic Style',
    icon: '🎥',
    description: 'สไตล์ภาพยนตร์ ดูหรูหรา พรีเมี่ยม',
    format: 'โฆษณา{productName} แนว Cinematic {gender}พูด"{script}" อย่าใส่ตัวหนังสือภาษาไทยที่คิดขึ้นมาเอง'
  },
  minimalist: {
    name: 'Minimalist Style',
    icon: '✨',
    description: 'สไตล์มินิมอล เรียบง่าย ดูดี',
    format: 'โฆษณา{productName} แนว Minimalist {gender}พูด"{script}" อย่าใส่ตัวหนังสือภาษาไทยที่คิดขึ้นมาเอง'
  }
}

export default function VideoAdsModal({ isOpen, onClose, onSubmit, initialImage = null }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [productName, setProductName] = useState('')
  const [gender, setGender] = useState('female')
  const [duration, setDuration] = useState(10)
  const [aspectRatio, setAspectRatio] = useState('9:16') // Default to vertical for ads
  const [script, setScript] = useState('')
  const [generatedScript, setGeneratedScript] = useState('')
  const [styleTemplate, setStyleTemplate] = useState('cgi')
  const [cameo, setCameo] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const fileInputRef = useRef(null)

  // Set initial image when modal opens with preloaded image
  useEffect(() => {
    if (isOpen && initialImage) {
      setSelectedImage(initialImage)
    }
  }, [isOpen, initialImage])

  // Detect mobile device
  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  if (!isOpen) return null

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

    setSelectedImageFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyzeWithAI = async () => {
    if (!selectedImage) {
      alert('กรุณาเลือกรูปภาพสินค้าก่อน')
      return
    }

    if (!productName.trim()) {
      alert('กรุณาใส่ชื่อสินค้า')
      return
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/generate-ads-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage,
          productName: productName,
          userInput: script,
          duration: duration,
          gender: gender
        })
      })

      if (!response.ok) {
        throw new Error('ไม่สามารถสร้างบทพูดได้')
      }

      const data = await response.json()
      // ใส่บทพูดที่ AI สร้างลงใน textarea ให้ผู้ใช้แก้ไขได้
      setScript(data.script)
      setGeneratedScript('')
    } catch (error) {
      console.error('Error analyzing:', error)
      alert('เกิดข้อผิดพลาดในการวิเคราะห์: ' + error.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const buildFinalPrompt = () => {
    const template = ADS_TEMPLATES[styleTemplate]
    const finalScript = script || 'สินค้าคุณภาพดี จิ้มที่ตระก้าได้เลย' + (gender === 'female' ? 'ค่ะ' : 'ครับ')
    const styleName = styleTemplate === 'cgi' ? 'CGI' : styleTemplate === 'cinematic' ? 'Cinematic' : 'Minimalist'

    // Duration constraint: 10s -> max 9s speech, 15s -> max 14s speech
    const maxSpeechDuration = duration === 15 ? 14 : 9

    let prompt

    // Check if cameo is provided
    if (cameo.trim()) {
      // Format with cameo: "โฆษณา[สินค้า] โดย @[cameo] พูดถึง [บทพูด]"
      const cleanCameo = cameo.trim().startsWith('@') ? cameo.trim() : `@${cameo.trim()}`
      prompt = `โฆษณา${productName} แนว ${styleName} โดย ${cleanCameo} พูดถึง"${finalScript}" อย่าใส่ตัวหนังสือภาษาไทยที่คิดขึ้นมาเอง อย่าพูดเกิน ${maxSpeechDuration} วินาที`
    } else {
      // Format without cameo: "โฆษณา[สินค้า] [เพศ]พูด [บทพูด]"
      const genderText = gender === 'female' ? 'ผู้หญิง' : 'ผู้ชาย'
      prompt = `โฆษณา${productName} แนว ${styleName} ${genderText}พูด"${finalScript}" อย่าใส่ตัวหนังสือภาษาไทยที่คิดขึ้นมาเอง อย่าพูดเกิน ${maxSpeechDuration} วินาที`
    }

    return prompt
  }

  const handleSubmit = () => {
    if (!selectedImage) {
      alert('กรุณาเลือกรูปภาพสินค้า')
      return
    }

    if (!productName.trim()) {
      alert('กรุณาใส่ชื่อสินค้า')
      return
    }

    const finalPrompt = buildFinalPrompt()
    const finalScript = script || 'สินค้าคุณภาพดี จิ้มที่ตระก้าได้เลย' + (gender === 'female' ? 'ค่ะ' : 'ครับ')

    onSubmit({
      image: selectedImage,
      prompt: finalPrompt,
      script: finalScript,
      duration: duration,
      aspectRatio: aspectRatio,
      productName: productName,
      style: ADS_TEMPLATES[styleTemplate].name
    })

    // Reset form
    setSelectedImage(null)
    setSelectedImageFile(null)
    setProductName('')
    setGender('female')
    setDuration(10)
    setAspectRatio('9:16')
    setScript('')
    setGeneratedScript('')
    setStyleTemplate('cgi')
    setCameo('')
  }

  const getWordCount = (text) => {
    // Thai word counting (approximate by characters/3)
    const thaiChars = text.match(/[\u0E00-\u0E7F]/g)?.length || 0
    const englishWords = text.match(/[a-zA-Z]+/g)?.length || 0
    return Math.ceil(thaiChars / 3) + englishWords
  }

  const wordCount = script ? getWordCount(script) : 0
  const recommendedWords = duration === 10 ? '25-30 คำ' : '40-45 คำ'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-[#1a1a1a] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🎙️ สร้างวิดีโอโฆษณา
            </h2>
            <p className="text-sm text-gray-400 mt-1">สร้างคลิปขายของด้วยนักขายเสมือนจริง</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              📸 รูปภาพสินค้า <span className="text-[#FE2C55]">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-4 hover:border-[#00F2EA] transition-colors">
              {selectedImage ? (
                <div className="relative">
                  <img
                    src={selectedImage}
                    alt="Product"
                    className="w-full h-64 object-contain rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setSelectedImage(null)
                      setSelectedImageFile(null)
                      setGeneratedScript('')
                    }}
                    className="absolute top-2 right-2 p-2 bg-[#FE2C55] rounded-lg text-white hover:bg-[#ff0050] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#00F2EA]/20 hover:bg-[#00F2EA]/30 text-[#00F2EA] rounded-lg transition-colors"
                  >
                    <Upload className="h-5 w-5" />
                    <span>อัพโหลดรูปภาพ</span>
                  </button>
                  <p className="text-xs text-gray-500 mt-2">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 10MB</p>
                  <p className="text-xs text-[#FE2C55] mt-1 font-medium">⚠️ อย่าใช้ภาพที่มีหน้าคนหรือเด็ก</p>
                </div>
              )}
            </div>
          </div>

          {/* Style Template */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              🎨 สไตล์โฆษณา
            </label>
            <select
              value={styleTemplate}
              onChange={(e) => setStyleTemplate(e.target.value)}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00F2EA]"
            >
              {Object.entries(ADS_TEMPLATES).map(([key, template]) => (
                <option key={key} value={key}>
                  {template.icon} {template.name} - {template.description}
                </option>
              ))}
            </select>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              🏷️ ชื่อสินค้า <span className="text-[#FE2C55]">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="เช่น: ขนมโอโจ้, น้ำผลไม้ดอกไม้ทิพ"
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00F2EA]"
            />
          </div>

          {/* Cameo (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              👤 Cameo (นายแบบ/นางแบบ Sora 2)
            </label>
            <input
              type="text"
              value={cameo}
              onChange={(e) => setCameo(e.target.value)}
              placeholder="เช่น: @filmsp127 (ไม่ใส่ก็ได้)"
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00F2EA]"
            />
            <p className="text-xs text-gray-400 mt-1">ใส่ Cameo ID ของคุณจาก Sora 2 App เพื่อใช้ตัวละครที่สร้างไว้</p>
          </div>

          {/* Gender and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                👤 เพศผู้พูด
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-[#0a0a0a] rounded-lg border border-gray-700 hover:border-[#00F2EA] transition-colors">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => setGender(e.target.value)}
                    className="text-[#00F2EA]"
                  />
                  <span className="text-white text-sm">ผู้หญิง</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-[#0a0a0a] rounded-lg border border-gray-700 hover:border-[#00F2EA] transition-colors">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => setGender(e.target.value)}
                    className="text-[#00F2EA]"
                  />
                  <span className="text-white text-sm">ผู้ชาย</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                ⏱️ ระยะเวลา
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-[#0a0a0a] rounded-lg border border-gray-700 hover:border-[#00F2EA] transition-colors">
                  <input
                    type="radio"
                    name="duration"
                    value="10"
                    checked={duration === 10}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="text-[#00F2EA]"
                  />
                  <span className="text-white text-sm">10 วินาที (10 เครดิต)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-3 bg-[#0a0a0a] rounded-lg border border-gray-700 hover:border-[#00F2EA] transition-colors">
                  <input
                    type="radio"
                    name="duration"
                    value="15"
                    checked={duration === 15}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="text-[#00F2EA]"
                  />
                  <span className="text-white text-sm">15 วินาที (15 เครดิต)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              📐 สัดส่วนวิดีโอ
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-[#0a0a0a] rounded-lg border border-gray-700 hover:border-[#00F2EA] transition-colors">
                <input
                  type="radio"
                  name="aspectRatio"
                  value="9:16"
                  checked={aspectRatio === '9:16'}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="text-[#00F2EA]"
                />
                <div className="flex items-center gap-2">
                  <div className="w-6 h-10 bg-gradient-to-br from-[#00F2EA] to-[#FE2C55] rounded"></div>
                  <span className="text-white text-sm">แนวตั้ง (9:16)</span>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-[#0a0a0a] rounded-lg border border-gray-700 hover:border-[#00F2EA] transition-colors">
                <input
                  type="radio"
                  name="aspectRatio"
                  value="16:9"
                  checked={aspectRatio === '16:9'}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="text-[#00F2EA]"
                />
                <div className="flex items-center gap-2">
                  <div className="w-10 h-6 bg-gradient-to-br from-[#00F2EA] to-[#FE2C55] rounded"></div>
                  <span className="text-white text-sm">แนวนอน (16:9)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Script Input */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              💬 บทพูดในคลิป (ไม่บังคับ)
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="พิมพ์บทพูดเอง หรือใส่คีย์เวิร์ด เช่น: หอมอร่อย กินเพลิน ทำสดใหม่"
              rows={3}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00F2EA] resize-none"
            />
            <button
              onClick={handleAnalyzeWithAI}
              disabled={isAnalyzing || !selectedImage || !productName}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังวิเคราะห์...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>วิเคราะห์บทพูดด้วย AI</span>
                </>
              )}
            </button>
          </div>

          {/* Script Preview */}
          {script && (
            <div className="bg-[#0a0a0a] border border-green-900/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-green-400">✅ บทพูดที่จะใช้:</h3>
                <span className="text-xs text-gray-400">
                  {wordCount} คำ (แนะนำ: {recommendedWords})
                </span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                "{script}"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1a1a1a] border-t border-gray-800 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={() => setShowConfirmPopup(true)}
            disabled={!selectedImage || !productName}
            className="px-6 py-2 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] hover:shadow-lg hover:shadow-[#00F2EA]/50 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✨ สร้างวิดีโอโฆษณา ({duration} เครดิต)
          </button>
        </div>
      </div>

      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowConfirmPopup(false)}
        >
          <div
            className="bg-[#1a1a1a] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-800 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] p-6 text-white">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Film className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">ยืนยันการสร้างโฆษณา</h3>
                  <p className="text-sm text-white/90">กรุณาตรวจสอบข้อมูลก่อนเริ่มสร้าง</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Warning Box */}
              <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-2 border-amber-600 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-amber-400 mb-2">⚠️ ข้อควรระวัง</h4>
                    <div className="text-xs text-gray-300 space-y-1">
                      <p>• <strong>ไม่สามารถหยุดหรือยกเลิกได้</strong> เมื่อเริ่มสร้างแล้ว</p>
                      <p>• ใช้เวลาประมาณ <strong>1-3 นาที</strong></p>
                      <p>• ใช้เครดิต <strong>{duration} เครดิต</strong></p>
                      <p>• หากล้มเหลว เครดิตจะถูก<strong>คืนอัตโนมัติ</strong></p>
                      {isMobile() && (
                        <p className="text-red-400 font-bold">• 📱 <strong>มือถือ: อย่าพับจอขณะสร้างคลิป!</strong></p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-white mb-3">📋 รายละเอียดโฆษณา</h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">สินค้า:</span>
                    <span className="font-semibold text-white">{productName}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">สไตล์:</span>
                    <span className="font-semibold text-[#00F2EA]">{ADS_TEMPLATES[styleTemplate].name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">ความยาว:</span>
                    <span className="font-semibold text-white">{duration} วินาที</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">สัดส่วน:</span>
                    <span className="font-semibold text-white">{aspectRatio}</span>
                  </div>

                  {cameo && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cameo:</span>
                      <span className="font-semibold text-purple-400">{cameo}</span>
                    </div>
                  )}

                  {script && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <p className="text-gray-400 text-xs mb-1">บทพูด:</p>
                      <p className="text-sm text-gray-300 line-clamp-3">"{script}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowConfirmPopup(false)}
                className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  setShowConfirmPopup(false)
                  handleSubmit()
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] hover:shadow-lg hover:shadow-[#00F2EA]/50 text-white font-bold rounded-xl transition-all"
              >
                ✨ เริ่มสร้างเลย!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
