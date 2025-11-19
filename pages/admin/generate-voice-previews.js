import { useState } from 'react'
import Head from 'next/head'
import { Download, Check, X, Loader } from 'lucide-react'

// ElevenLabs Voice lists (ชาย 4 หญิง 3)
const ELEVENLABS_VOICES = [
  // เสียงชาย (4 เสียง)
  { id: 'AXw7rxvMAEe68vknaJRv', name: 'เสียงกวนทีน', gender: 'male' },
  { id: 'oKIE62mvU7YR0KSC6cjd', name: 'เสียงพี่ชิล', gender: 'male' },
  { id: 'gkEgy6IJoIagFuyBcxDu', name: 'เสียงบอส', gender: 'male' },
  { id: 'fJnvnbC7A9PHKFt2Zi5I', name: 'เสียงนักพูด', gender: 'male' },
  // เสียงหญิง (3 เสียง)
  { id: 'ocXeZcpfl3y8l2JH0Dyv', name: 'เสียงน้องมิ้นท์', gender: 'female' },
  { id: 'yvV1FSiWQfVfAv6TKN2O', name: 'เสียงพี่พอด', gender: 'female' },
  { id: 'GYFXpkcXjA3N82uHvHn3', name: 'เสียงสบายหู', gender: 'female' }
]

const PREVIEW_TEXT = 'สวัสดีนี่คือเสียงเอไอจากเว็บพ้อมดี คุณชอบรึป่าว'

export default function GenerateVoicePreviews() {
  const [progress, setProgress] = useState({})
  const [generating, setGenerating] = useState(false)

  const generatePreview = async (voiceId, voiceName) => {
    const key = voiceId
    setProgress(prev => ({ ...prev, [key]: 'loading' }))

    try {
      const response = await fetch('/api/generate-voice-elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: PREVIEW_TEXT,
          voiceId: voiceId,
          userId: 'preview',
          isPreview: true
        })
      })

      const data = await response.json()

      if (!data.success || !data.audioUrl) {
        throw new Error('Failed to generate audio')
      }

      // Download the audio file
      const audioResponse = await fetch(data.audioUrl)
      const audioBlob = await audioResponse.blob()

      // Create download link
      const url = window.URL.createObjectURL(audioBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${voiceId}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setProgress(prev => ({ ...prev, [key]: 'success' }))

      // Wait a bit before next generation to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000))

    } catch (error) {
      console.error(`Error generating ${voiceId}:`, error)
      setProgress(prev => ({ ...prev, [key]: 'error' }))
    }
  }

  const generateAll = async () => {
    setGenerating(true)
    for (const voice of ELEVENLABS_VOICES) {
      await generatePreview(voice.id, voice.name)
    }
    setGenerating(false)
    alert('✅ สร้างไฟล์เสียง ElevenLabs ครบทั้งหมดแล้ว!\n\nกรุณานำไฟล์ที่ดาวน์โหลดไปวางใน:\npublic/voice-previews/elevenlabs/')
  }

  const getStatusIcon = (status) => {
    if (status === 'loading') return <Loader className="h-4 w-4 animate-spin text-blue-500" />
    if (status === 'success') return <Check className="h-4 w-4 text-green-500" />
    if (status === 'error') return <X className="h-4 w-4 text-red-500" />
    return null
  }

  return (
    <>
      <Head>
        <title>สร้างไฟล์เสียงสำหรับ Preview - Admin</title>
      </Head>

      <div className="min-h-screen bg-[#000000] p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">🎙️ สร้างไฟล์เสียง ElevenLabs สำหรับ Preview</h1>
          <p className="text-gray-400 mb-8">เครื่องมือสร้างไฟล์เสียงสำเร็จรูปเพื่อประหยัด API credits (เฉพาะ Premium)</p>

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-bold text-blue-400 mb-3">📋 วิธีใช้งาน</h2>
            <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
              <li>กดปุ่ม "สร้างทั้งหมด" - ระบบจะดาวน์โหลดไฟล์ MP3 ให้ทีละไฟล์ (7 ไฟล์)</li>
              <li>หรือกดปุ่ม "สร้าง" แต่ละเสียงเพื่อสร้างทีละเสียง</li>
              <li>สร้างโฟลเดอร์ในโปรเจค: <code className="bg-black/50 px-2 py-1 rounded">public/voice-previews/elevenlabs/</code></li>
              <li>นำไฟล์ที่ดาวน์โหลด (ชื่อไฟล์จะเป็น Voice ID เช่น AXw7rxvMAEe68vknaJRv.mp3) ไปวางในโฟลเดอร์</li>
              <li>เสร็จแล้ว! ระบบจะใช้ไฟล์เหล่านี้แทนการเรียก API</li>
            </ol>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <p className="text-gray-400 text-sm mb-2">เสียง ElevenLabs ทั้งหมด</p>
              <p className="text-3xl font-bold text-white">{ELEVENLABS_VOICES.length}</p>
              <p className="text-xs text-orange-500 mt-2">ชาย 4 เสียง • หญิง 3 เสียง</p>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <p className="text-gray-400 text-sm mb-2">ประหยัดต่อเดือน</p>
              <p className="text-3xl font-bold text-green-400">~$5-10</p>
              <p className="text-xs text-gray-500 mt-2">จากการทดลองฟังซ้ำๆ</p>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <p className="text-gray-400 text-sm mb-2">ใช้เวลาสร้าง</p>
              <p className="text-3xl font-bold text-blue-400">~15 วินาที</p>
              <p className="text-xs text-gray-500 mt-2">ต่อไฟล์เสียง</p>
            </div>
          </div>

          {/* Generate All Button */}
          <div className="mb-6">
            <button
              onClick={generateAll}
              disabled={generating}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {generating ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  กำลังสร้าง... (กรุณารอ)
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  สร้างไฟล์เสียงทั้งหมด ({ELEVENLABS_VOICES.length} ไฟล์)
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              ⏱️ ใช้เวลาประมาณ 2-3 นาที (ดาวน์โหลดทีละไฟล์)
            </p>
          </div>

          {/* Voice List */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">📝 รายการเสียง ElevenLabs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ELEVENLABS_VOICES.map((voice) => {
                const key = voice.id
                return (
                  <div
                    key={voice.id}
                    className="flex items-center justify-between bg-[#0a0a0a] border border-gray-800 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(progress[key])}
                      <div>
                        <div className="text-sm font-semibold text-white">{voice.name}</div>
                        <div className="text-xs text-gray-500">
                          {voice.gender === 'male' ? '👨 ชาย' : '👩 หญิง'} • ID: {voice.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => generatePreview(voice.id, voice.name)}
                      disabled={generating || progress[key] === 'loading'}
                      className="text-xs px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50 font-medium"
                    >
                      สร้าง
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mt-6">
            <p className="text-sm text-orange-400">
              ⚠️ <strong>หมายเหตุ:</strong> การสร้างไฟล์เสียง ElevenLabs จะใช้ credits จาก API key ของคุณ
              แต่จะช่วยประหยัดค่าใช้จ่ายในระยะยาวจากการที่ผู้ใช้กดทดลองฟังซ้ำๆ
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
