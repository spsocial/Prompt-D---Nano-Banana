import { useState, useEffect } from 'react'
import Head from 'next/head'
import { Upload, Plus, Edit2, Trash2, Check, X, Loader, Volume2, Save } from 'lucide-react'

export default function ManageVoices() {
  const [voices, setVoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingVoice, setEditingVoice] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    voiceId: '',
    name: '',
    gender: 'male',
    description: '',
    previewUrl: '',
    sortOrder: 0
  })
  const [audioFile, setAudioFile] = useState(null)

  // Load voices
  useEffect(() => {
    loadVoices()
  }, [])

  const loadVoices = async () => {
    try {
      const response = await fetch('/api/voices?provider=elevenlabs')
      const data = await response.json()
      if (data.success) {
        setVoices(data.voices)
      }
    } catch (error) {
      console.error('Error loading voices:', error)
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const handleAddVoice = () => {
    setFormData({
      voiceId: '',
      name: '',
      gender: 'male',
      description: '',
      previewUrl: '',
      sortOrder: voices.length + 1
    })
    setAudioFile(null)
    setEditingVoice(null)
    setShowAddModal(true)
  }

  const handleEditVoice = (voice) => {
    setFormData({
      voiceId: voice.voiceId,
      name: voice.name,
      gender: voice.gender,
      description: voice.description || '',
      previewUrl: voice.previewUrl || '',
      sortOrder: voice.sortOrder
    })
    setAudioFile(null)
    setEditingVoice(voice)
    setShowAddModal(true)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
      if (!allowedTypes.includes(file.type)) {
        alert('กรุณาเลือกไฟล์เสียง MP3, WAV หรือ OGG เท่านั้น')
        return
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('ไฟล์ขนาดใหญ่เกินไป (สูงสุด 5MB)')
        return
      }

      setAudioFile(file)
    }
  }

  const uploadAudioFile = async () => {
    if (!audioFile) return formData.previewUrl

    setUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('audio', audioFile)

      const response = await fetch('/api/voices/upload-preview', {
        method: 'POST',
        body: formDataUpload
      })

      const data = await response.json()
      if (data.success) {
        return data.url
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + error.message)
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.voiceId || !formData.name || !formData.gender) {
      alert('กรุณากรอก Voice ID, ชื่อ และเพศ')
      return
    }

    try {
      // Upload audio file first if exists
      let previewUrl = formData.previewUrl
      if (audioFile) {
        previewUrl = await uploadAudioFile()
        if (!previewUrl) return // Upload failed
      }

      const url = editingVoice
        ? `/api/voices/${editingVoice.id}`
        : '/api/voices'

      const method = editingVoice ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          previewUrl
        })
      })

      const data = await response.json()

      if (data.success) {
        alert(editingVoice ? 'อัปเดตเสียงสำเร็จ!' : 'เพิ่มเสียงสำเร็จ!')
        setShowAddModal(false)
        loadVoices()
      } else {
        alert(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  const handleDelete = async (voice) => {
    if (!confirm(`ต้องการลบเสียง "${voice.name}" ใช่หรือไม่?`)) return

    try {
      const response = await fetch(`/api/voices/${voice.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        alert('ลบเสียงสำเร็จ!')
        loadVoices()
      } else {
        alert(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  const handleToggleActive = async (voice) => {
    try {
      const response = await fetch(`/api/voices/${voice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !voice.isActive
        })
      })

      const data = await response.json()

      if (data.success) {
        loadVoices()
      } else {
        alert(data.message || 'เกิดข้อผิดพลาด')
      }
    } catch (error) {
      console.error('Toggle error:', error)
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000]">
        <Loader className="h-8 w-8 animate-spin text-[#00F2EA]" />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>จัดการเสียง TTS - Admin</title>
      </Head>

      <div className="min-h-screen bg-[#000000] p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">🎙️ จัดการเสียง TTS</h1>
              <p className="text-gray-400">เพิ่ม แก้ไข ลบเสียงสำหรับระบบ Voice Generator</p>
            </div>
            <button
              onClick={handleAddVoice}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Plus className="h-5 w-5" />
              เพิ่มเสียงใหม่
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <p className="text-gray-400 text-sm mb-2">เสียงทั้งหมด</p>
              <p className="text-3xl font-bold text-white">{voices.length}</p>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <p className="text-gray-400 text-sm mb-2">เสียงชาย</p>
              <p className="text-3xl font-bold text-blue-400">{voices.filter(v => v.gender === 'male').length}</p>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-6">
              <p className="text-gray-400 text-sm mb-2">เสียงหญิง</p>
              <p className="text-3xl font-bold text-pink-400">{voices.filter(v => v.gender === 'female').length}</p>
            </div>
          </div>

          {/* Voice List */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0a0a0a] border-b border-gray-800">
                <tr>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">ชื่อเสียง</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Voice ID</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">เพศ</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">Preview</th>
                  <th className="text-left p-4 text-gray-400 text-sm font-medium">สถานะ</th>
                  <th className="text-right p-4 text-gray-400 text-sm font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {voices.map((voice) => (
                  <tr key={voice.id} className="border-b border-gray-800 hover:bg-[#0a0a0a] transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="text-white font-semibold">{voice.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{voice.description}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="text-xs text-gray-400 bg-black/50 px-2 py-1 rounded">
                        {voice.voiceId.substring(0, 12)}...
                      </code>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-3 py-1 rounded-full ${
                        voice.gender === 'male'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-pink-500/20 text-pink-400'
                      }`}>
                        {voice.gender === 'male' ? '👨 ชาย' : '👩 หญิง'}
                      </span>
                    </td>
                    <td className="p-4">
                      {voice.previewUrl ? (
                        <button
                          onClick={() => {
                            const audio = new Audio(voice.previewUrl)
                            audio.play()
                          }}
                          className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
                        >
                          <Volume2 className="h-4 w-4" />
                          ฟัง
                        </button>
                      ) : (
                        <span className="text-xs text-gray-600">ไม่มีไฟล์</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActive(voice)}
                        className={`text-xs px-3 py-1 rounded-full ${
                          voice.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {voice.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditVoice(voice)}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(voice)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {voices.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                ยังไม่มีเสียงในระบบ กดปุ่ม "เพิ่มเสียงใหม่" เพื่อเริ่มต้น
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-2xl font-bold text-white">
                {editingVoice ? 'แก้ไขเสียง' : 'เพิ่มเสียงใหม่'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Voice ID */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Voice ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.voiceId}
                  onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
                  disabled={!!editingVoice}
                  placeholder="เช่น AXw7rxvMAEe68vknaJRv"
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#00F2EA] disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">Voice ID จาก ElevenLabs (ไม่สามารถแก้ไขได้หลังจากสร้าง)</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  ชื่อเสียง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น เสียงกวนทีน"
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#00F2EA]"
                  required
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  เพศ <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#00F2EA]"
                  required
                >
                  <option value="male">👨 ชาย</option>
                  <option value="female">👩 หญิง</option>
                  <option value="neutral">⚪ กลางๆ</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  คำอธิบาย
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="อธิบายลักษณะเสียง..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#00F2EA]"
                />
              </div>

              {/* Preview Audio Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  ไฟล์เสียงตัวอย่าง (Preview)
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-gray-800 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#00F2EA] file:text-black hover:file:bg-[#00F2EA]/80 file:cursor-pointer"
                  />
                  {audioFile && (
                    <p className="text-xs text-green-400">✓ เลือกไฟล์: {audioFile.name}</p>
                  )}
                  {formData.previewUrl && !audioFile && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">มีไฟล์อยู่แล้ว</p>
                      <button
                        type="button"
                        onClick={() => {
                          const audio = new Audio(formData.previewUrl)
                          audio.play()
                        }}
                        className="text-xs text-green-400 hover:text-green-300"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">รองรับ MP3, WAV, OGG (สูงสุด 5MB)</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader className="h-5 w-5 animate-spin" />
                      กำลังอัปโหลด...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      {editingVoice ? 'บันทึก' : 'เพิ่มเสียง'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={uploading}
                  className="px-6 py-3 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
