import { useState, useEffect } from 'react'
import { X, Upload, Image as ImageIcon, User, Type, Camera, Palette, Sparkles, Layers, Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// โมเดล AI
const AI_MODELS = [
  {
    id: 'banana',
    name: 'Nano Banana',
    icon: '🍌',
    credits: 1,
    description: 'Gemini 2.5 - มาตรฐาน'
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana PRO',
    icon: '⚡',
    credits: 3,
    description: 'KIE.AI - คุณภาพสูง (แนะนำสำหรับข้อความ)'
  }
]

// สไตล์ภาพ
const IMAGE_STYLES = [
  {
    id: 'realistic',
    name: 'Realistic',
    nameTh: 'สมจริง',
    icon: '📷',
    prompt: 'ถ่ายภาพแบบสมจริงระดับไฮเปอร์เรียลลิสติก แสงธรรมชาติ รายละเอียดพื้นผิวคมชัด ภาพถ่ายสินค้าระดับมืออาชีพ'
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    nameTh: 'แนวภาพยนตร์',
    icon: '🎬',
    prompt: 'แสงแบบภาพยนตร์ เงาดราม่า สไตล์โปสเตอร์หนัง คอนทราสต์สูง บรรยากาศยิ่งใหญ่อลังการ'
  },
  {
    id: 'commercial',
    name: 'Commercial',
    nameTh: 'โฆษณามืออาชีพ',
    icon: '💼',
    prompt: 'ภาพถ่ายโฆษณาระดับมืออาชีพ พื้นหลังสะอาดตา แสงสตูดิโอ สไตล์โฆษณาระดับพรีเมียม'
  },
  {
    id: 'poster',
    name: 'Poster',
    nameTh: 'โปสเตอร์',
    icon: '🎨',
    prompt: 'สไตล์โปสเตอร์โฆษณา สีสันโดดเด่น องค์ประกอบดราม่า ดีไซน์ดึงดูดสายตา งานโปรโมทที่น่าสนใจ'
  },
  {
    id: 'infographic',
    name: 'Infographic',
    nameTh: 'อินโฟกราฟฟิค',
    icon: '📊',
    prompt: 'สไตล์อินโฟกราฟฟิค เลย์เอาต์สะอาดตา ดีไซน์ให้ข้อมูล กราฟิกทันสมัย สวยงามเรียบหรู'
  }
]

// มุมกล้อง
const CAMERA_ANGLES = [
  { id: 'close-up', name: 'Close-up', nameTh: 'ระยะใกล้', prompt: 'ถ่ายระยะใกล้ เน้นรายละเอียดสินค้า' },
  { id: 'medium', name: 'Medium Shot', nameTh: 'ระยะกลาง', prompt: 'ถ่ายระยะกลาง เห็นสินค้าและบริบทรอบข้าง' },
  { id: 'wide', name: 'Wide Shot', nameTh: 'ระยะไกล', prompt: 'ถ่ายระยะไกล เห็นฉากโดยรวมทั้งหมด' },
  { id: 'eye-level', name: 'Eye Level', nameTh: 'ระดับสายตา', prompt: 'ถ่ายระดับสายตา มุมมองธรรมชาติ' },
  { id: 'high-angle', name: 'High Angle', nameTh: 'มุมสูง', prompt: 'ถ่ายมุมสูงลงมา มองจากด้านบน' },
  { id: 'low-angle', name: 'Low Angle', nameTh: 'มุมต่ำ', prompt: 'ถ่ายมุมต่ำขึ้นไป ให้ความรู้สึกยิ่งใหญ่ทรงพลัง' }
]

// Aspect Ratios
const ASPECT_RATIOS = [
  { id: '1:1', name: '1:1', desc: 'สี่เหลี่ยมจัตุรัส' },
  { id: '4:5', name: '4:5', desc: 'Instagram' },
  { id: '9:16', name: '9:16', desc: 'Story/Reels' },
  { id: '16:9', name: '16:9', desc: 'YouTube' },
  { id: '3:4', name: '3:4', desc: 'Portrait' }
]

export default function ImageAdsModal({ isOpen, onClose, onSubmit }) {
  // รูปภาพ
  const [productImage, setProductImage] = useState(null)
  const [modelImage, setModelImage] = useState(null)

  // ตัวเลือกนายแบบ/นางแบบ
  const [modelOption, setModelOption] = useState('none') // 'none', 'from-image', 'male', 'female'

  // ข้อความบนภาพ
  const [wantText, setWantText] = useState(false)
  const [customText, setCustomText] = useState('')

  // สไตล์และมุมกล้อง
  const [selectedStyle, setSelectedStyle] = useState('realistic')
  const [selectedAngle, setSelectedAngle] = useState('close-up')
  const [aspectRatio, setAspectRatio] = useState('1:1')

  // ตัวเลือกการสร้าง
  const [selectedModel, setSelectedModel] = useState('banana')
  const [numberOfImages, setNumberOfImages] = useState(1)

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setProductImage(null)
      setModelImage(null)
      setModelOption('none')
      setWantText(false)
      setCustomText('')
      setSelectedStyle('realistic')
      setSelectedAngle('close-up')
      setAspectRatio('1:1')
      setSelectedModel('banana')
      setNumberOfImages(1)
    }
  }, [isOpen])

  // Lock numberOfImages to 1 when Nano Banana PRO is selected
  useEffect(() => {
    if (selectedModel === 'nano-banana-pro') {
      setNumberOfImages(1)
    }
  }, [selectedModel])

  const handleImageUpload = (e, type) => {
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
      if (type === 'product') {
        setProductImage(reader.result)
      } else {
        setModelImage(reader.result)
        setModelOption('from-image')
      }
    }
    reader.readAsDataURL(file)
  }

  const buildPrompt = () => {
    const style = IMAGE_STYLES.find(s => s.id === selectedStyle)
    const angle = CAMERA_ANGLES.find(a => a.id === selectedAngle)

    let prompt = ''

    // เริ่มต้นด้วยคำสั่งหลัก
    prompt += 'สร้างภาพโฆษณาสินค้าจากภาพต้นฉบับที่ให้มา รักษารูปร่าง โลโก้ และข้อความบนสินค้าให้ตรงตามต้นฉบับ '

    // นายแบบ/นางแบบ
    if (modelOption === 'from-image') {
      prompt += 'ใช้นางแบบจากรูปที่อัพโหลดมา ให้นางแบบถือหรือนำเสนอสินค้าอย่างเป็นธรรมชาติ '
    } else if (modelOption === 'male') {
      prompt += 'มีนายแบบชายเอเชียหน้าตาดี ถือหรือนำเสนอสินค้า ดูมั่นใจและเป็นมืออาชีพ '
    } else if (modelOption === 'female') {
      prompt += 'มีนางแบบหญิงเอเชียสวยงาม ถือหรือนำเสนอสินค้า ดูสง่างามและเป็นมืออาชีพ '
    } else {
      prompt += 'เน้นที่ตัวสินค้าเท่านั้น ไม่ต้องมีนายแบบหรือนางแบบ '
    }

    // มุมกล้อง
    prompt += `${angle.prompt} `

    // สไตล์
    prompt += `${style.prompt} `

    // ข้อความ
    if (wantText) {
      if (customText.trim()) {
        prompt += `ใส่ข้อความโปรโมทบนภาพ: "${customText}" ให้อ่านง่ายและโดดเด่น `
      } else {
        prompt += 'มีข้อความรีวิวสินค้าที่ด้านบนของภาพ '
      }
    }

    prompt += 'ภาพคุณภาพสูง ความละเอียดระดับ 8K แสงสวยระดับมืออาชีพ รายละเอียดคมชัด'

    return prompt
  }

  const handleSubmit = () => {
    if (!productImage) {
      alert('กรุณาอัพโหลดรูปสินค้า')
      return
    }

    const prompt = buildPrompt()

    const modelInfo = AI_MODELS.find(m => m.id === selectedModel)
    const totalCredits = selectedModel === 'nano-banana-pro' ? 3 : numberOfImages

    onSubmit({
      productImage,
      modelImage,
      modelOption,
      wantText,
      customText,
      style: selectedStyle,
      angle: selectedAngle,
      aspectRatio,
      prompt,
      images: modelImage ? [productImage, modelImage] : [productImage],
      selectedModel,
      numberOfImages,
      totalCredits
    })
  }

  // คำนวณเครดิต
  const calculateCredits = () => {
    if (selectedModel === 'nano-banana-pro') {
      return 3
    }
    return numberOfImages
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#1a1a1a] rounded-2xl border border-gray-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] p-4 rounded-t-2xl flex items-center justify-between z-10">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              ฟอร์มสร้างภาพโฆษณา
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* 1. อัพโหลดรูปภาพ */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-[#00F2EA]" />
                อัพโหลดรูปภาพ
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {/* รูปสินค้า */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    รูปสินค้า <span className="text-red-400">*</span>
                  </label>
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'product')}
                      className="hidden"
                    />
                    {productImage ? (
                      <div className="relative">
                        <img
                          src={productImage}
                          alt="Product"
                          className="w-full h-32 object-cover rounded-xl border-2 border-[#00F2EA]"
                        />
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            setProductImage(null)
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-32 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#00F2EA] transition-colors">
                        <ImageIcon className="h-8 w-8 text-gray-500" />
                        <span className="text-xs text-gray-500">คลิกเพื่ออัพโหลด</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* รูปนายแบบ/นางแบบ */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    รูปนายแบบ/นางแบบ (ถ้ามี)
                  </label>
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'model')}
                      className="hidden"
                    />
                    {modelImage ? (
                      <div className="relative">
                        <img
                          src={modelImage}
                          alt="Model"
                          className="w-full h-32 object-cover rounded-xl border-2 border-[#FE2C55]"
                        />
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            setModelImage(null)
                            if (modelOption === 'from-image') {
                              setModelOption('none')
                            }
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full"
                        >
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-32 border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#FE2C55] transition-colors">
                        <User className="h-8 w-8 text-gray-500" />
                        <span className="text-xs text-gray-500">คลิกเพื่ออัพโหลด</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* 2. ตัวเลือกนายแบบ/นางแบบ */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <User className="h-4 w-4 text-[#00F2EA]" />
                นายแบบ/นางแบบ
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setModelOption('none')}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    modelOption === 'none'
                      ? 'bg-[#00F2EA] text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  ไม่ต้องการ
                </button>

                {modelImage && (
                  <button
                    onClick={() => setModelOption('from-image')}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      modelOption === 'from-image'
                        ? 'bg-[#00F2EA] text-black'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    ใช้จากภาพที่อัพ
                  </button>
                )}

                <button
                  onClick={() => setModelOption('male')}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    modelOption === 'male'
                      ? 'bg-[#00F2EA] text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  👨 นายแบบ (AI สร้าง)
                </button>

                <button
                  onClick={() => setModelOption('female')}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    modelOption === 'female'
                      ? 'bg-[#00F2EA] text-black'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  👩 นางแบบ (AI สร้าง)
                </button>
              </div>
            </div>

            {/* 3. ข้อความบนภาพ */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Type className="h-4 w-4 text-[#00F2EA]" />
                ข้อความบนภาพ
                <span className="text-xs text-orange-400 font-normal">(เหมาะกับ Banana Pro)</span>
              </h4>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wantText}
                  onChange={(e) => setWantText(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-[#00F2EA] focus:ring-[#00F2EA]"
                />
                <span className="text-gray-300">ต้องการข้อความโปรโมทบนภาพ</span>
              </label>

              {wantText && (
                <div>
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="กรอกข้อความ หรือปล่อยว่างให้ AI คิดให้"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00F2EA]"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ถ้าไม่กรอก AI จะคิดข้อความโปรโมทให้อัตโนมัติ
                  </p>
                </div>
              )}
            </div>

            {/* 4. สไตล์ภาพ */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Palette className="h-4 w-4 text-[#00F2EA]" />
                สไตล์ภาพ
              </h4>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {IMAGE_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      selectedStyle === style.id
                        ? 'bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-xl mb-1">{style.icon}</div>
                    <div className="text-xs font-medium">{style.nameTh}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. มุมกล้อง */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-[#00F2EA]" />
                มุมกล้อง
              </h4>

              <div className="grid grid-cols-3 gap-2">
                {CAMERA_ANGLES.map((angle) => (
                  <button
                    key={angle.id}
                    onClick={() => setSelectedAngle(angle.id)}
                    className={`p-2 rounded-xl text-sm transition-all ${
                      selectedAngle === angle.id
                        ? 'bg-[#00F2EA] text-black font-medium'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {angle.nameTh}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Aspect Ratio */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#00F2EA]" />
                สัดส่วนภาพ
              </h4>

              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id)}
                    className={`px-4 py-2 rounded-xl text-sm transition-all ${
                      aspectRatio === ratio.id
                        ? 'bg-[#00F2EA] text-black font-medium'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {ratio.name}
                    <span className="text-xs opacity-70 ml-1">({ratio.desc})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 7. ตัวเลือกการสร้าง */}
            <div className="space-y-3 p-4 bg-gray-900/50 rounded-xl border border-gray-700">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#00F2EA]" />
                ตัวเลือกการสร้าง
              </h4>

              {/* เลือก AI Model */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">โมเดล AI</label>
                <div className="grid grid-cols-2 gap-2">
                  {AI_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        selectedModel === model.id
                          ? 'bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{model.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{model.name}</div>
                          <div className="text-xs opacity-70">{model.credits} เครดิต/ภาพ</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* จำนวนภาพ */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">จำนวนภาพ</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumberOfImages(num)}
                      disabled={selectedModel === 'nano-banana-pro' && num > 1}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                        numberOfImages === num
                          ? 'bg-[#00F2EA] text-black'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      } ${selectedModel === 'nano-banana-pro' && num > 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {num} รูป
                    </button>
                  ))}
                </div>
                {selectedModel === 'nano-banana-pro' && (
                  <p className="text-xs text-orange-400">
                    * Banana PRO สร้างได้ทีละ 1 รูปเท่านั้น
                  </p>
                )}
              </div>

              {/* สรุปเครดิต */}
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
                <span className="text-gray-400">เครดิตที่ใช้:</span>
                <span className="text-[#00F2EA] font-bold text-lg">
                  {calculateCredits()} เครดิต
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!productImage}
              className="w-full py-4 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#00F2EA]/50 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="h-5 w-5" />
              สร้างภาพโฆษณา ({calculateCredits()} เครดิต)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
