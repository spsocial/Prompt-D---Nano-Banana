import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Download, Sparkles, Crown, Volume2, Upload, Image as ImageIcon, X } from 'lucide-react'
import useStore from '../lib/store'

// Gemini TTS Voice Options - ทั้งหมด 30 เสียงจาก Official Docs
const GEMINI_VOICES = {
  // Female Voices (15 เสียง)
  'Puck': {
    id: 'Puck',
    name: 'Puck',
    gender: 'female',
    description: 'กระชุ่มกระชวย (Upbeat) - เหมาะกับอาหาร/ขนม',
    style: 'Upbeat'
  },
  'Zephyr': {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'female',
    description: 'สดใส (Bright) - เหมาะกับความงาม/แฟชั่น',
    style: 'Bright'
  },
  'Kore': {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    description: 'เด็ดขาด (Firm) - เหมาะกับข่าว/ธุรกิจ',
    style: 'Firm'
  },
  'Leda': {
    id: 'Leda',
    name: 'Leda',
    gender: 'female',
    description: 'เยาว์วัย (Youthful) - เหมาะกับวัยรุ่น/แฟชั่น',
    style: 'Youthful'
  },
  'Autonoe': {
    id: 'Autonoe',
    name: 'Autonoe',
    gender: 'female',
    description: 'สดใส (Bright) - เหมาะกับโฆษณา',
    style: 'Bright'
  },
  'Aoede': {
    id: 'Aoede',
    name: 'Aoede',
    gender: 'female',
    description: 'สบายๆ (Breezy) - เหมาะกับเรื่องเล่า',
    style: 'Breezy'
  },
  'Callirrhoe': {
    id: 'Callirrhoe',
    name: 'Callirrhoe',
    gender: 'female',
    description: 'ผ่อนคลาย (Easy-going) - เหมาะกับไลฟ์สไตล์',
    style: 'Easy-going'
  },
  'Enceladus': {
    id: 'Enceladus',
    name: 'Enceladus',
    gender: 'female',
    description: 'นุ่มนวล (Breathy) - เหมาะกับความงาม/สปา',
    style: 'Breathy'
  },
  'Algieba': {
    id: 'Algieba',
    name: 'Algieba',
    gender: 'female',
    description: 'ลื่นไหล (Smooth) - เหมาะกับพรีเซนเทชั่น',
    style: 'Smooth'
  },
  'Despina': {
    id: 'Despina',
    name: 'Despina',
    gender: 'female',
    description: 'ลื่นไหล (Smooth) - เหมาะกับบริการ',
    style: 'Smooth'
  },
  'Laomedeia': {
    id: 'Laomedeia',
    name: 'Laomedeia',
    gender: 'female',
    description: 'กระชุ่มกระชวย (Upbeat) - เหมาะกับโฆษณา',
    style: 'Upbeat'
  },
  'Achernar': {
    id: 'Achernar',
    name: 'Achernar',
    gender: 'female',
    description: 'อ่อนโยน (Soft) - เหมาะกับเด็ก/การศึกษา',
    style: 'Soft'
  },
  'Achird': {
    id: 'Achird',
    name: 'Achird',
    gender: 'female',
    description: 'เป็นมิตร (Friendly) - เหมาะกับบริการลูกค้า',
    style: 'Friendly'
  },
  'Vindemiatrix': {
    id: 'Vindemiatrix',
    name: 'Vindemiatrix',
    gender: 'female',
    description: 'อ่อนโยน (Gentle) - เหมาะกับเนื้อหาผ่อนคลาย',
    style: 'Gentle'
  },
  'Sadachbia': {
    id: 'Sadachbia',
    name: 'Sadachbia',
    gender: 'female',
    description: 'มีชีวิตชีวา (Lively) - เหมาะกับกิจกรรม/อีเวนต์',
    style: 'Lively'
  },

  // Male Voices (14 เสียง)
  'Charon': {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    description: 'ให้ข้อมูล (Informative) - เหมาะกับเทค/อุปกรณ์',
    style: 'Informative'
  },
  'Fenrir': {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    description: 'ตื่นเต้น (Excitable) - เหมาะกับโฆษณา/กีฬา',
    style: 'Excitable'
  },
  'Orus': {
    id: 'Orus',
    name: 'Orus',
    gender: 'male',
    description: 'เด็ดขาด (Firm) - เหมาะกับข่าว/ธุรกิจ',
    style: 'Firm'
  },
  'Iapetus': {
    id: 'Iapetus',
    name: 'Iapetus',
    gender: 'male',
    description: 'ชัดเจน (Clear) - เหมาะกับคำแนะนำ/วิธีทำ',
    style: 'Clear'
  },
  'Umbriel': {
    id: 'Umbriel',
    name: 'Umbriel',
    gender: 'male',
    description: 'ผ่อนคลาย (Easy-going) - เหมาะกับพอดแคสต์',
    style: 'Easy-going'
  },
  'Erinome': {
    id: 'Erinome',
    name: 'Erinome',
    gender: 'male',
    description: 'ชัดเจน (Clear) - เหมาะกับบทเรียน',
    style: 'Clear'
  },
  'Algenib': {
    id: 'Algenib',
    name: 'Algenib',
    gender: 'male',
    description: 'แกร่ง (Gravelly) - เหมาะกับเนื้อหาผู้ชาย',
    style: 'Gravelly'
  },
  'Rasalgethi': {
    id: 'Rasalgethi',
    name: 'Rasalgethi',
    gender: 'male',
    description: 'ให้ข้อมูล (Informative) - เหมาะกับข่าว',
    style: 'Informative'
  },
  'Alnilam': {
    id: 'Alnilam',
    name: 'Alnilam',
    gender: 'male',
    description: 'เด็ดขาด (Firm) - เหมาะกับผู้นำ/CEO',
    style: 'Firm'
  },
  'Schedar': {
    id: 'Schedar',
    name: 'Schedar',
    gender: 'male',
    description: 'สม่ำเสมอ (Even) - เหมาะกับนำเสนอ',
    style: 'Even'
  },
  'Gacrux': {
    id: 'Gacrux',
    name: 'Gacrux',
    gender: 'male',
    description: 'ผู้ใหญ่ (Mature) - เหมาะกับเอกสาร/ธุรกิจ',
    style: 'Mature'
  },
  'Pulcherrima': {
    id: 'Pulcherrima',
    name: 'Pulcherrima',
    gender: 'male',
    description: 'ตรงไปตรงมา (Forward) - เหมาะกับโฆษณา',
    style: 'Forward'
  },
  'Zubenelgenubi': {
    id: 'Zubenelgenubi',
    name: 'Zubenelgenubi',
    gender: 'male',
    description: 'สบายๆ (Casual) - เหมาะกับพอดแคสต์',
    style: 'Casual'
  },
  'Sadaltager': {
    id: 'Sadaltager',
    name: 'Sadaltager',
    gender: 'male',
    description: 'มีความรู้ (Knowledgeable) - เหมาะกับการศึกษา',
    style: 'Knowledgeable'
  },

  // Neutral Voice (1 เสียง)
  'Sulafat': {
    id: 'Sulafat',
    name: 'Sulafat',
    gender: 'neutral',
    description: 'อบอุ่น (Warm) - เหมาะกับเรื่องเล่า/หนังสือเสียง',
    style: 'Warm'
  }
}

// ElevenLabs Custom Voices - เสียงโคลนคุณภาพสูง
// ElevenLabs voices are now loaded from database via API
// ไปจัดการเสียงได้ที่หน้า /admin/manage-voices

// ข้อความตายตัวสำหรับทดลองฟัง (ป้องกันการเสียเครดิตจากผู้ใช้)
const PREVIEW_TEXT = {
  male: 'สวัสดีนี่คือเสียงเอไอจากเว็บพ้อมดี คุณชอบรึป่าว',
  female: 'สวัสดีนี่คือเสียงเอไอจากเว็บพ้อมดี คุณชอบรึป่าว',
  neutral: 'สวัสดีนี่คือเสียงเอไอจากเว็บพ้อมดี คุณชอบรึป่าว'
}

// Pre-generated audio files for voice previews (to save API credits)
// Format: voiceId -> audio file path
const VOICE_PREVIEW_FILES = {
  // Gemini voices will use previewAudio field if available
  // Otherwise fallback to API call
}

export default function VoiceGenerator() {
  const [scriptText, setScriptText] = useState('')
  const [provider, setProvider] = useState('gemini') // 'gemini' or 'elevenlabs'
  const [selectedVoice, setSelectedVoice] = useState('Puck')
  const [selectedElevenlabsVoice, setSelectedElevenlabsVoice] = useState('')
  const [selectedGender, setSelectedGender] = useState('female')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [generatedAudio, setGeneratedAudio] = useState(null)
  const [audioPlayer, setAudioPlayer] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Load ElevenLabs voices from API
  const [elevenlabsVoices, setElevenlabsVoices] = useState([])
  const [loadingVoices, setLoadingVoices] = useState(false)

  // AI Script Generator States
  const [showAiModal, setShowAiModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [aiDuration, setAiDuration] = useState(15) // Default 15 seconds
  const [aiGender, setAiGender] = useState('female') // Gender for AI script generation
  const [aiKeywords, setAiKeywords] = useState('') // Keywords/hints for AI
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Confirmation States
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const { userId, userCredits, useCredits, refundCredits } = useStore()
  const audioRef = useRef(null)
  const fileInputRef = useRef(null)

  // Load ElevenLabs voices from API on mount
  useEffect(() => {
    loadElevenlabsVoices()
  }, [])

  const loadElevenlabsVoices = async () => {
    setLoadingVoices(true)
    try {
      const response = await fetch('/api/voices?provider=elevenlabs&activeOnly=true')
      const data = await response.json()
      if (data.success) {
        setElevenlabsVoices(data.voices)
        // Auto-select first voice
        if (data.voices.length > 0) {
          setSelectedElevenlabsVoice(data.voices[0].voiceId)
        }
      }
    } catch (error) {
      console.error('Error loading voices:', error)
    } finally {
      setLoadingVoices(false)
    }
  }

  // Auto-select first voice when switching provider
  useEffect(() => {
    if (provider === 'elevenlabs' && elevenlabsVoices.length > 0 && !selectedElevenlabsVoice) {
      setSelectedElevenlabsVoice(elevenlabsVoices[0].voiceId)
    }
  }, [provider, elevenlabsVoices])

  // Calculate credits based on character count (for Premium AI only)
  const calculateCredits = (text, providerType) => {
    if (providerType === 'gemini') {
      return 1 // Gemini always 1 credit
    }

    // Premium AI (ElevenLabs) - Tier pricing
    const length = text.length
    if (length <= 450) return 2
    if (length <= 900) return 4
    if (length <= 1200) return 5
    return 5 // Max at 1200 characters
  }

  // Get current tier info
  const getCurrentTier = () => {
    if (provider === 'gemini') {
      return { tier: 'Standard', limit: '∞', credits: 1 }
    }

    const length = scriptText.length
    if (length <= 450) return { tier: 'Tier 1', limit: '450', credits: 2 }
    if (length <= 900) return { tier: 'Tier 2', limit: '900', credits: 4 }
    if (length <= 1200) return { tier: 'Tier 3', limit: '1,200', credits: 5 }
    return { tier: 'Tier 3', limit: '1,200', credits: 5 }
  }

  // Filter voices by gender
  const filteredVoices = Object.values(GEMINI_VOICES).filter(voice => {
    if (selectedGender === 'all') return true
    return voice.gender === selectedGender
  })

  // Handle image upload
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

  // Handle AI script analysis
  const handleAnalyzeWithAI = async () => {
    if (!selectedImage) {
      alert('กรุณาเลือกรูปภาพก่อน')
      return
    }

    if (!aiDuration || aiDuration < 5 || aiDuration > 60) {
      alert('กรุณาระบุเวลา 5-60 วินาที')
      return
    }

    setIsAnalyzing(true)

    try {
      const response = await fetch('/api/generate-ads-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage,
          productName: '', // ไม่บังคับสำหรับ voice generation
          userInput: aiKeywords, // ส่งคีย์เวิร์ด/คำแนะนำ
          duration: aiDuration,
          gender: aiGender, // ส่งเพศผู้พูด
          mode: 'voice' // บอก API ว่าเป็นโหมดเสียง
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze image')
      }

      if (data.success && data.script) {
        setScriptText(data.script)
        setShowAiModal(false) // Close modal after success
        console.log('✅ AI generated script:', data.script)
      } else {
        throw new Error('No script in response')
      }
    } catch (error) {
      console.error('❌ AI analysis error:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Handle preview using pre-generated audio files (to save API credits)
  const handlePreview = async () => {
    setIsPreviewing(true)

    try {
      const voiceId = provider === 'gemini' ? selectedVoice : selectedElevenlabsVoice

      // Only check for pre-generated files for ElevenLabs (Premium voices)
      // Gemini is free, so no need to save preview files
      if (provider === 'elevenlabs') {
        // Find voice from database to get previewUrl
        const voice = elevenlabsVoices.find(v => v.voiceId === voiceId)

        if (voice && voice.previewUrl) {
          console.log(`🔍 Using pre-generated preview from Cloudinary: ${voice.previewUrl}`)

          const audio = new Audio(voice.previewUrl)

          // Setup promise to detect if audio loads successfully
          const audioLoaded = new Promise((resolve, reject) => {
            audio.addEventListener('canplay', () => resolve(true), { once: true })
            audio.addEventListener('error', () => reject(new Error('Failed to load preview')), { once: true })
          })

          try {
            await audioLoaded
            // Audio file exists and loaded successfully
            console.log(`✅ Playing pre-generated preview (saves ElevenLabs credits!)`)
            audio.play()
            setAudioPlayer(audio)

            audio.onended = () => {
              setIsPreviewing(false)
            }

            return // Success, no need for API call
          } catch (fileError) {
            console.log(`⚠️ Failed to load preview file, falling back to ElevenLabs API`)
          }
        } else {
          console.log(`⚠️ No preview URL found in database, falling back to ElevenLabs API`)
        }
      }

      // Fallback: Generate via API
      // For Gemini: always use API (free)
      // For ElevenLabs: fallback if file not found
      await generatePreviewViaAPI()

    } catch (error) {
      console.error('Preview error:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
      setIsPreviewing(false)
    }
  }

  // Fallback function for API-based preview (costs credits)
  const generatePreviewViaAPI = async () => {
    const apiEndpoint = provider === 'gemini'
      ? '/api/generate-voice-gemini'
      : '/api/generate-voice-elevenlabs'

    const voiceId = provider === 'gemini' ? selectedVoice : selectedElevenlabsVoice

    // Get gender for preview text
    let gender = 'neutral'
    if (provider === 'gemini') {
      gender = GEMINI_VOICES[selectedVoice]?.gender || 'neutral'
    } else {
      const voice = elevenlabsVoices.find(v => v.voiceId === selectedElevenlabsVoice)
      gender = voice?.gender || 'neutral'
    }

    // Use fixed preview text based on gender
    const previewText = PREVIEW_TEXT[gender] || PREVIEW_TEXT.neutral

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: previewText,
        ...(provider === 'gemini' ? { voice: voiceId } : { voiceId }),
        userId: 'preview',
        isPreview: true
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'ไม่สามารถสร้างตัวอย่างเสียงได้')
    }

    const data = await response.json()

    if (data.success && data.audioUrl) {
      const audio = new Audio(data.audioUrl)
      audio.play()
      setAudioPlayer(audio)

      audio.onended = () => {
        setIsPreviewing(false)
      }
    }
  }

  // Handle generate (paid, uses credits)
  // Show confirmation before generating
  const handleGenerate = () => {
    if (!scriptText.trim()) {
      alert('กรุณาพิมพ์บทพูดก่อน')
      return
    }

    // Check character limit for Premium AI
    if (provider === 'elevenlabs' && scriptText.length > 1200) {
      alert('เสียง Premium AI รองรับสูงสุด 1,200 ตัวอักษร\nกรุณาลดความยาวบทพูด')
      return
    }

    // Calculate required credits based on character count
    const requiredCredits = calculateCredits(scriptText, provider)

    if (userCredits < requiredCredits) {
      alert(`เครดิตไม่เพียงพอ! ต้องการ ${requiredCredits} เครดิต`)
      return
    }

    // Show confirmation popup
    setShowConfirmation(true)
  }

  // Confirm and actually generate
  const confirmGenerate = async () => {
    setShowConfirmation(false)
    setIsGenerating(true)

    const requiredCredits = calculateCredits(scriptText, provider)

    try {
      // Deduct credits
      await useCredits(requiredCredits)

      const apiEndpoint = provider === 'gemini'
        ? '/api/generate-voice-gemini'
        : '/api/generate-voice-elevenlabs'

      const voiceId = provider === 'gemini' ? selectedVoice : selectedElevenlabsVoice

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          ...(provider === 'gemini' ? { voice: voiceId } : { voiceId }),
          userId: userId || 'anonymous',
          isPreview: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'ไม่สามารถสร้างเสียงได้')
      }

      const data = await response.json()

      if (data.success && data.audioUrl) {
        let voiceName = ''
        let providerName = ''
        if (provider === 'gemini') {
          voiceName = `${GEMINI_VOICES[selectedVoice].name} - ${GEMINI_VOICES[selectedVoice].style}`
          providerName = 'Standard AI'
        } else {
          const voice = elevenlabsVoices.find(v => v.voiceId === selectedElevenlabsVoice)
          voiceName = voice ? voice.name : 'Premium Voice'
          providerName = 'Premium AI'
        }

        // Create a temporary audio element to get actual duration
        const tempAudio = new Audio(data.audioUrl)

        tempAudio.addEventListener('loadedmetadata', () => {
          const actualDuration = Math.ceil(tempAudio.duration)
          setGeneratedAudio({
            url: data.audioUrl,
            voice: voiceName,
            provider: providerName,
            text: scriptText,
            duration: actualDuration || data.duration || 0
          })
        })

        // Fallback if metadata loading fails
        tempAudio.addEventListener('error', () => {
          setGeneratedAudio({
            url: data.audioUrl,
            voice: voiceName,
            provider: providerName,
            text: scriptText,
            duration: data.duration || 0
          })
        })

        // Set initial state with estimated duration
        setGeneratedAudio({
          url: data.audioUrl,
          voice: voiceName,
          provider: providerName,
          text: scriptText,
          duration: data.duration || 0
        })

        setShowSuccess(true)
      }
    } catch (error) {
      console.error('Generation error:', error)

      // Refund credits on error
      await refundCredits(requiredCredits, error.message || 'Voice generation failed')

      // Better error message for API key issues
      if (error.message.includes('API key not configured')) {
        alert('❌ ไม่พบ API Key\n\n' +
          'กรุณาตั้งค่า ELEVENLABS_API_KEY ใน environment variables\n\n' +
          'หรือเลือกใช้ "Standard AI" (Gemini TTS) แทน ซึ่งไม่ต้องใช้ API key\n\n' +
          '(เครดิตถูกคืนให้อัตโนมัติแล้ว)')
      } else {
        alert('❌ ' + error.message + '\n(เครดิตถูกคืนให้อัตโนมัติแล้ว)')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle play/pause generated audio
  const togglePlay = () => {
    if (!audioRef.current || !generatedAudio) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  // Count words (approximate for Thai)
  const getWordCount = (text) => {
    const thaiChars = text.match(/[\u0E00-\u0E7F]/g)?.length || 0
    const englishWords = text.match(/[a-zA-Z]+/g)?.length || 0
    return Math.ceil(thaiChars / 3) + englishWords
  }

  const wordCount = scriptText ? getWordCount(scriptText) : 0
  const currentTier = getCurrentTier()
  const maxLength = provider === 'elevenlabs' ? 1200 : 10000 // Premium limit 1200, Standard unlimited

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header Banner */}
      <div
        className="rounded-2xl overflow-hidden mb-6 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/พากย์เสียงด้วย%20ai.png)',
          height: '240px'
        }}
      />

      <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6 space-y-6">
        {/* Script Text Area with AI Generator Button */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-white">
              📝 บทพูด (Script Text) <span className="text-[#FE2C55]">*</span>
            </label>
            <button
              onClick={() => setShowAiModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs rounded-lg transition-all flex items-center gap-1.5 font-medium"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI สร้างบทพูด
            </button>
          </div>
          <textarea
            value={scriptText}
            onChange={(e) => {
              const newText = e.target.value
              // Limit characters for Premium AI
              if (provider === 'elevenlabs' && newText.length > 1200) {
                return // Don't allow more than 1200 chars
              }
              setScriptText(newText)
            }}
            placeholder="พิมพ์บทพูดที่ต้องการให้ AI พากย์เสียงตรงนี้... หรือใช้ AI สร้างให้ด้านบน"
            rows={6}
            maxLength={maxLength}
            className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00F2EA] resize-none"
            disabled={isGenerating}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {scriptText.length}{provider === 'elevenlabs' ? `/${maxLength}` : ''} ตัวอักษร • {wordCount} คำ
              </span>
              {provider === 'elevenlabs' && scriptText.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  scriptText.length <= 450
                    ? 'bg-green-900/30 border border-green-600 text-green-400'
                    : scriptText.length <= 900
                    ? 'bg-blue-900/30 border border-blue-600 text-blue-400'
                    : 'bg-amber-900/30 border border-amber-600 text-amber-400'
                }`}>
                  {currentTier.tier} • {currentTier.credits} เครดิต
                </span>
              )}
            </div>
            <span className="text-xs text-green-400">
              ✨ ทดลองฟัง: ฟรี
            </span>
          </div>
          {provider === 'elevenlabs' && (
            <div className="mt-2">
              <p className="text-xs text-gray-400">
                💰 <span className="text-white">2-5 เครดิต</span> ขึ้นอยู่กับจำนวนคำ
              </p>
            </div>
          )}
        </div>

        {/* Voice Model Selector - Toggle Buttons */}
        <div>
          <label className="block text-sm font-semibold text-white mb-3">
            🎤 เลือกโมเดลเสียง (AI Voice Model)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Standard AI */}
            <button
              type="button"
              onClick={() => setProvider('gemini')}
              disabled={isGenerating}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                provider === 'gemini'
                  ? 'border-[#00F2EA] bg-[#00F2EA]/10'
                  : 'border-gray-700 bg-[#0a0a0a] hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">⚡</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Standard AI</p>
                    <p className="text-xs text-gray-400">30 เสียง</p>
                  </div>
                </div>
                {provider === 'gemini' && (
                  <div className="w-5 h-5 bg-[#00F2EA] rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">ไม่จำกัดความยาว</span>
                <span className="px-2 py-0.5 bg-green-900/30 border border-green-600 rounded-full text-green-400 text-xs font-medium">
                  1 เครดิต
                </span>
              </div>
            </button>

            {/* Premium AI */}
            <button
              type="button"
              onClick={() => setProvider('elevenlabs')}
              disabled={isGenerating || loadingVoices || elevenlabsVoices.length === 0}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                provider === 'elevenlabs'
                  ? 'border-[#FE2C55] bg-[#FE2C55]/10'
                  : elevenlabsVoices.length === 0
                  ? 'border-gray-800 bg-[#0a0a0a] opacity-50 cursor-not-allowed'
                  : 'border-gray-700 bg-[#0a0a0a] hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Premium AI</p>
                    <p className="text-xs text-gray-400">
                      {loadingVoices ? 'กำลังโหลด...' : `${elevenlabsVoices.length} เสียงโคลน`}
                    </p>
                  </div>
                </div>
                {provider === 'elevenlabs' && (
                  <div className="w-5 h-5 bg-[#FE2C55] rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">สูงสุด 1,200 ตัว</span>
                <span className="px-2 py-0.5 bg-amber-900/30 border border-amber-600 rounded-full text-amber-400 text-xs font-medium">
                  {provider === 'elevenlabs' ? `${currentTier.credits}` : '2-5'} เครดิต
                </span>
              </div>
            </button>
          </div>
          {provider === 'elevenlabs' && elevenlabsVoices.length === 0 && !loadingVoices && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              ⚠️ ยังไม่มีเสียง Premium ในระบบ กรุณาเพิ่มเสียงที่หน้า Admin
            </p>
          )}
        </div>

        {/* Voice Selection - Show different UI based on provider */}
        {provider === 'gemini' ? (
          <>
            {/* Gender Filter - Only for Gemini */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                👤 เลือกเพศ (Gender)
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedGender('female')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                    selectedGender === 'female'
                      ? 'bg-[#00F2EA] text-black'
                      : 'bg-[#0a0a0a] border border-gray-700 text-gray-400 hover:border-[#00F2EA] hover:text-white'
                  }`}
                >
                  ผู้หญิง
                </button>
                <button
                  onClick={() => setSelectedGender('male')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                    selectedGender === 'male'
                      ? 'bg-[#00F2EA] text-black'
                      : 'bg-[#0a0a0a] border border-gray-700 text-gray-400 hover:border-[#00F2EA] hover:text-white'
                  }`}
                >
                  ผู้ชาย
                </button>
                <button
                  onClick={() => setSelectedGender('neutral')}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                    selectedGender === 'neutral'
                      ? 'bg-[#00F2EA] text-black'
                      : 'bg-[#0a0a0a] border border-gray-700 text-gray-400 hover:border-[#00F2EA] hover:text-white'
                  }`}
                >
                  เป็นกลาง
                </button>
              </div>
            </div>

            {/* Gemini Voice Style Selector - Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                🎧 สไตล์เสียง (Voice Style)
              </label>
              <div className="flex gap-3">
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="flex-1 px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#00F2EA]"
                  disabled={isGenerating}
                >
                  {filteredVoices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handlePreview}
                  disabled={isPreviewing || isGenerating}
                  className="px-6 py-3 bg-[#0a0a0a] border border-gray-700 hover:border-[#00F2EA] hover:bg-gray-800 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isPreviewing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">ฟัง...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-5 w-5 text-[#00F2EA]" />
                      <span className="hidden sm:inline">ทดลองฟัง</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                💡 กดทดลองฟังเพื่อเช็คน้ำเสียงก่อนสร้างเสียงจริง (ฟรี ไม่เสียเครดิต)
              </p>
            </div>
          </>
        ) : (
          <>
            {/* ElevenLabs Voice Selector */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                <Crown className="h-4 w-4 inline text-amber-400 mr-1" />
                เสียง Premium (Premium Voices)
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <select
                  value={selectedElevenlabsVoice}
                  onChange={(e) => setSelectedElevenlabsVoice(e.target.value)}
                  className="flex-1 px-4 py-3 bg-[#0a0a0a] border border-amber-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  disabled={isGenerating || loadingVoices || elevenlabsVoices.length === 0}
                >
                  {elevenlabsVoices.length > 0 ? (
                    <>
                      {/* Male Voices */}
                      {elevenlabsVoices.filter(v => v.gender === 'male').length > 0 && (
                        <optgroup label="👨 เสียงผู้ชาย">
                          {elevenlabsVoices.filter(v => v.gender === 'male').map((voice) => (
                            <option key={voice.id} value={voice.voiceId}>
                              {voice.name} - {voice.description}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {/* Female Voices */}
                      {elevenlabsVoices.filter(v => v.gender === 'female').length > 0 && (
                        <optgroup label="👩 เสียงผู้หญิง">
                          {elevenlabsVoices.filter(v => v.gender === 'female').map((voice) => (
                            <option key={voice.id} value={voice.voiceId}>
                              {voice.name} - {voice.description}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {/* Neutral Voices */}
                      {elevenlabsVoices.filter(v => v.gender === 'neutral').length > 0 && (
                        <optgroup label="⚧ เสียงเป็นกลาง">
                          {elevenlabsVoices.filter(v => v.gender === 'neutral').map((voice) => (
                            <option key={voice.id} value={voice.voiceId}>
                              {voice.name} - {voice.description}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  ) : (
                    <option value="">ยังไม่มีเสียง Premium</option>
                  )}
                </select>
                <button
                  onClick={handlePreview}
                  disabled={isPreviewing || isGenerating || loadingVoices || elevenlabsVoices.length === 0}
                  className="w-full sm:w-auto px-6 py-3 bg-[#0a0a0a] border border-amber-600 hover:border-amber-500 hover:bg-gray-800 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPreviewing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>ฟัง...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-5 w-5 text-amber-400" />
                      <span>ทดลองฟัง</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-amber-400 mt-2">
                ⭐ เสียงโคลนคุณภาพสูง - กดทดลองฟังเพื่อเช็คน้ำเสียง (ฟรี ไม่เสียเครดิต)
              </p>
            </div>
          </>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t border-gray-800">
          <button
            onClick={handleGenerate}
            disabled={
              isGenerating ||
              !scriptText.trim() ||
              userCredits < currentTier.credits ||
              loadingVoices ||
              (provider === 'elevenlabs' && elevenlabsVoices.length === 0)
            }
            className="w-full px-6 py-4 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] hover:shadow-lg hover:shadow-[#00F2EA]/50 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังสร้างเสียงพากย์...</span>
              </>
            ) : (
              <>
                {provider === 'elevenlabs' && <Crown className="h-5 w-5" />}
                {provider === 'gemini' && <Sparkles className="h-5 w-5" />}
                <span>
                  ✨ สร้างเสียง ({currentTier.credits} เครดิต)
                </span>
              </>
            )}
          </button>
          {userCredits < currentTier.credits && (
            <p className="text-xs text-red-400 text-center mt-2">
              ⚠️ เครดิตไม่เพียงพอ! ต้องการ {currentTier.credits} เครดิต
            </p>
          )}
          {provider === 'elevenlabs' && elevenlabsVoices.length === 0 && !loadingVoices && (
            <p className="text-xs text-amber-400 text-center mt-2">
              ⚠️ กรุณาเพิ่มเสียง Premium ที่หน้า Admin ก่อนใช้งาน
            </p>
          )}
        </div>

        {/* Generated Audio Player - Now hidden, replaced by Success Modal */}
        {generatedAudio && !showSuccess && (
          <div className="mt-6 p-6 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-600 rounded-xl">
            <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
              ✅ เสียงพากย์สร้างเสร็จแล้ว!
            </h3>

            <div className="bg-[#0a0a0a] rounded-xl p-4 mb-4">
              {/* Duration Badge - Prominent Display */}
              <div className="flex items-center justify-center mb-3">
                <div className="px-3 py-1.5 bg-gradient-to-r from-[#00F2EA]/20 to-[#FE2C55]/20 border border-[#00F2EA] rounded-full">
                  <p className="text-base font-bold text-[#00F2EA] flex items-center gap-1.5">
                    ⏱️ ความยาว: <span className="text-xl">{generatedAudio.duration}</span> วินาที
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-white">{generatedAudio.voice}</p>
                  <p className="text-xs text-gray-400">
                    {generatedAudio.provider || 'Gemini TTS'}
                  </p>
                </div>
                <button
                  onClick={togglePlay}
                  className="p-3 bg-[#00F2EA] hover:bg-[#00d4cc] rounded-full transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 text-black" />
                  ) : (
                    <Play className="h-5 w-5 text-black" />
                  )}
                </button>
              </div>

              <audio
                ref={audioRef}
                src={generatedAudio.url}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              <div className="text-xs text-gray-300 bg-[#1a1a1a] rounded p-2 mt-2">
                <p className="line-clamp-3">"{generatedAudio.text}"</p>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={generatedAudio.url}
                download={`voice-${Date.now()}.mp3`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#00F2EA] hover:bg-[#00d4cc] text-black rounded-lg font-medium transition-all"
              >
                <Download className="h-4 w-4" />
                ดาวน์โหลดเสียง
              </a>
              <button
                onClick={() => setGeneratedAudio(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-all"
              >
                สร้างใหม่
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Script Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAiModal(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl border border-purple-500/50 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-white" />
                <h3 className="text-lg font-bold text-white">AI สร้างบทพูดอัตโนมัติ</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  📷 รูปภาพ <span className="text-purple-400">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {selectedImage ? (
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt="Selected"
                      className="w-full h-48 object-cover rounded-lg border border-gray-700"
                    />
                    <button
                      onClick={() => {
                        setSelectedImage(null)
                        setSelectedImageFile(null)
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-gray-700 rounded-lg hover:border-purple-500 transition-colors flex flex-col items-center justify-center gap-2 bg-[#0a0a0a]"
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-400">คลิกเพื่ออัปโหลดรูปภาพ</span>
                    <span className="text-xs text-gray-500">รองรับไฟล์ JPG, PNG (สูงสุด 10MB)</span>
                  </button>
                )}
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  ⏱️ ระยะเวลา (วินาที)
                </label>
                <input
                  type="number"
                  value={aiDuration}
                  onChange={(e) => setAiDuration(parseInt(e.target.value) || 15)}
                  min="5"
                  max="60"
                  className="w-full px-4 py-2 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="15"
                />
                <div className="flex gap-2 mt-2">
                  {[10, 15, 20, 30].map(sec => (
                    <button
                      key={sec}
                      onClick={() => setAiDuration(sec)}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all ${
                        aiDuration === sec
                          ? 'bg-purple-600 text-white font-medium'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  👤 เพศผู้พูด
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAiGender('female')}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      aiGender === 'female'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    👩 ผู้หญิง
                  </button>
                  <button
                    onClick={() => setAiGender('male')}
                    className={`px-4 py-3 rounded-lg font-medium transition-all ${
                      aiGender === 'male'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    👨 ผู้ชาย
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  เพื่อให้ AI สร้างบทพูดที่เหมาะสมกับเพศผู้พูด (ค่ะ/ครับ)
                </p>
              </div>

              {/* Keywords/Hints */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  💡 คีย์เวิร์ด / คำแนะนำ (ไม่บังคับ)
                </label>
                <textarea
                  value={aiKeywords}
                  onChange={(e) => setAiKeywords(e.target.value)}
                  placeholder="ระบุคีย์เวิร์ดหรือคำแนะนำที่ต้องการให้ AI ใช้ในบทพูด เช่น 'เน้นความคุ้มค่า' หรือ 'พูดแบบสบายๆ'"
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleAnalyzeWithAI}
                disabled={!selectedImage || isAnalyzing}
                className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>กำลังวิเคราะห์...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>สร้างบทพูดด้วย AI</span>
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center">
                💡 AI จะวิเคราะห์รูปภาพและสร้างบทพูดที่เหมาะสมกับระยะเวลาที่กำหนด
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowConfirmation(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#00F2EA] shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] p-4 rounded-t-2xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                ยืนยันการสร้างเสียง
              </h3>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-[#0a0a0a] rounded-lg p-4 border border-gray-800">
                <p className="text-sm text-gray-400 mb-2">รายละเอียด:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">โมเดล:</span>
                    <span className="text-gray-400 text-sm">{provider === 'gemini' ? 'Standard AI' : 'Premium AI'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">ตัวอักษร:</span>
                    <span className="text-gray-400 text-sm">{scriptText.length} ตัว • {getWordCount(scriptText)} คำ</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">ราคา:</span>
                    <span className="text-[#00F2EA] text-sm font-bold">{currentTier.credits} เครดิต</span>
                  </div>
                </div>
              </div>

              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                <p className="text-xs text-purple-300 text-center">
                  ⚠️ เครดิตจะถูกหักทันทีเมื่อยืนยัน
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmGenerate}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] hover:shadow-lg text-white rounded-xl font-bold transition-all"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && generatedAudio && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSuccess(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl border border-green-500 shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  ✅ สร้างเสียงสำเร็จ!
                </h3>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Audio Info */}
              <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800">
                {/* Duration Badge - Prominent Display */}
                <div className="flex items-center justify-center mb-3">
                  <div className="px-4 py-2 bg-gradient-to-r from-[#00F2EA]/20 to-[#FE2C55]/20 border border-[#00F2EA] rounded-full">
                    <p className="text-lg font-bold text-[#00F2EA] flex items-center gap-2">
                      ⏱️ ความยาว: <span className="text-2xl">{generatedAudio.duration}</span> วินาที
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-base font-semibold text-white">{generatedAudio.voice}</p>
                    <p className="text-sm text-gray-400">
                      {generatedAudio.provider || 'Gemini TTS'}
                    </p>
                  </div>
                  <button
                    onClick={togglePlay}
                    className="p-4 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] hover:shadow-lg rounded-full transition-all"
                  >
                    {isPlaying ? (
                      <Pause className="h-6 w-6 text-white" />
                    ) : (
                      <Play className="h-6 w-6 text-white" />
                    )}
                  </button>
                </div>

                <audio
                  ref={audioRef}
                  src={generatedAudio.url}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                <div className="text-sm text-gray-300 bg-[#1a1a1a] rounded-lg p-3 border border-gray-800">
                  <p className="line-clamp-4">"{generatedAudio.text}"</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <a
                  href={generatedAudio.url}
                  download={`voice-${Date.now()}.mp3`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] hover:shadow-lg text-white rounded-xl font-bold transition-all"
                >
                  <Download className="h-5 w-5" />
                  ดาวน์โหลด
                </a>
                <button
                  onClick={() => {
                    setShowSuccess(false)
                    setGeneratedAudio(null)
                  }}
                  className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-all"
                >
                  สร้างใหม่
                </button>
              </div>

              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                <p className="text-xs text-green-300 text-center">
                  💡 กดดาวน์โหลดเพื่อบันทึกไฟล์เสียง หรือกด "สร้างใหม่" เพื่อสร้างเสียงอื่น
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
