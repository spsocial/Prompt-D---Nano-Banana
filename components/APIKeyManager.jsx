import { useState, useEffect } from 'react'
import useStore from '../lib/store'
import { Key, Save, Eye, EyeOff, CheckCircle, Sparkles } from 'lucide-react'

export default function APIKeyManager() {
  const { apiKeys, setApiKeys, userPlan, setUserPlan } = useStore()
  const [showKeys, setShowKeys] = useState(false)
  const [localKeys, setLocalKeys] = useState({
    gemini: '',
    replicate: ''
  })
  const [saved, setSaved] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    // Load keys from localStorage on mount
    const savedGemini = localStorage.getItem('gemini_api_key') || ''
    const savedReplicate = localStorage.getItem('replicate_api_key') || ''

    setLocalKeys({
      gemini: savedGemini,
      replicate: savedReplicate
    })

    setApiKeys({
      gemini: savedGemini,
      replicate: savedReplicate
    })
  }, [])

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('gemini_api_key', localKeys.gemini)
    localStorage.setItem('replicate_api_key', localKeys.replicate)

    // Update global state
    setApiKeys({ ...apiKeys, gemini: localKeys.gemini, replicate: localKeys.replicate })

    // Show success feedback
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handlePlanChange = (plan) => {
    setUserPlan(plan)
    if (plan === 'premium') {
      // Clear local API keys when switching to premium
      setLocalKeys({ gemini: '', replicate: '' })
      setApiKeys({ ...apiKeys, gemini: '', replicate: '' })
      localStorage.removeItem('gemini_api_key')
      localStorage.removeItem('replicate_api_key')
    }
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    // Admin password - ควรเก็บใน environment variable จริงๆ
    const ADMIN_PASSWORD = 'nano2024' // เปลี่ยนเป็นรหัสที่คุณต้องการ

    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setPasswordError('')
      // Set to premium automatically when admin logs in
      handlePlanChange('premium')
    } else {
      setPasswordError('รหัสผ่านไม่ถูกต้อง')
      setPassword('')
    }
  }

  // ถ้ายังไม่ได้ login แสดงหน้า password
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Key className="h-5 w-5 mr-2 text-yellow-500" />
            🔐 Admin Access Required
          </h3>

          <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  กรุณาใส่รหัสผ่านสำหรับผู้ดูแลระบบ
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-2">{passwordError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                เข้าสู่ระบบ
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">💡 สำหรับลูกค้า:</span>
                <br />หากเติมเครดิตไม่เข้ากรุณาติดต่อที่เพจ
                <br />📱 Facebook Page: <a href="https://m.me/719837687869400" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-medium hover:underline">Prompt D</a>
                <br />💰 เริ่มต้นเพียง 29 บาท/15 เครดิต
                <br />🎯 ยอดนิยม 99 บาท/60 เครดิต (1.65 บาท/ภาพ)
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Key className="h-5 w-5 mr-2 text-yellow-500" />
          ⚙️ Admin Settings
        </h3>

        {/* Admin Info */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-700 font-semibold">
            ✅ Admin Mode Active
          </p>
          <p className="text-xs text-green-600 mt-1">
            คุณสามารถใช้งานระบบได้ไม่จำกัด
          </p>
          <button
            onClick={() => {
              setIsAuthenticated(false)
              setPassword('')
              handlePlanChange('free')
            }}
            className="mt-3 text-xs text-red-600 hover:text-red-700 underline"
          >
            ออกจากระบบ
          </button>
        </div>

        {/* API Keys Input for Admin */}
        {isAuthenticated && (
          <>
            <div className="space-y-4">
              {/* Gemini Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Gemini API Key (สำหรับวิเคราะห์และสร้างภาพ)
                </label>
                <div className="relative">
                  <input
                    type={showKeys ? 'text' : 'password'}
                    value={localKeys.gemini}
                    onChange={(e) => setLocalKeys({ ...localKeys, gemini: e.target.value })}
                    placeholder="AIza..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(!showKeys)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your key from{' '}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-600 hover:underline"
                  >
                    Google AI Studio
                  </a>
                  {' '}(ฟรี!)
                </p>
              </div>

              {/* Replicate Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center">
                    Replicate API Token (สำหรับสร้างภาพจริง)
                    <Sparkles className="h-3 w-3 ml-1 text-yellow-500" />
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showKeys ? 'text' : 'password'}
                    value={localKeys.replicate}
                    onChange={(e) => setLocalKeys({ ...localKeys, replicate: e.target.value })}
                    placeholder="r8_..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(!showKeys)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your key from{' '}
                  <a
                    href="https://replicate.com/account/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-600 hover:underline"
                  >
                    Replicate.com
                  </a>
                  {' '}(มี free tier, ใช้ Stable Diffusion XL)
                </p>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className={`
                w-full mt-6 px-4 py-2.5 rounded-lg font-medium
                flex items-center justify-center space-x-2
                transition-all duration-200
                ${saved
                  ? 'bg-green-500 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }
              `}
            >
              {saved ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>บันทึกสำเร็จ!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>บันทึก API Keys</span>
                </>
              )}
            </button>

            {/* Info Note */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">💡 วิธีการทำงาน:</span>
                <br />• <b>Gemini 2.5 Flash Image Preview</b> - วิเคราะห์และสร้างภาพในตัวเดียว! 🎨
                <br />• รองรับการสร้างภาพคุณภาพสูงโดยตรง
                <br />• Replicate (optional) - ใช้เป็นตัวสำรองถ้า Gemini ไม่พร้อม
              </p>
            </div>

            {/* Security Note */}
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600">
                <span className="font-semibold">🔒 ความปลอดภัย:</span> API keys ของคุณถูกเก็บไว้ในเบราว์เซอร์
                และไม่ถูกส่งไปยังเซิร์ฟเวอร์ของเรา
              </p>
            </div>
          </>
        )}

        {/* Admin Controls */}
        {isAuthenticated && (
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">👑</span>
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">แพ็คเกจพรีเมี่ยมใช้งานอยู่</h4>
                <p className="text-sm text-yellow-700">
                  คุณกำลังใช้ API keys ของเรา ไม่ต้องตั้งค่าอะไรเพิ่ม!
                </p>
                <ul className="mt-2 space-y-1 text-xs text-yellow-600">
                  <li>✓ สร้างภาพไม่จำกัด</li>
                  <li>✓ ใช้ Stable Diffusion XL</li>
                  <li>✓ ประมวลผลเร็ว</li>
                  <li>✓ ไม่ต้องจัดการ API keys</li>
                </ul>
                <p className="text-xs text-yellow-600 mt-2">
                  <span className="font-semibold">เทคโนโลยี:</span>
                  <br />• <b>Gemini 2.5 Flash Image Preview</b> 🎨
                  <br />• สร้างภาพคุณภาพสูงในตัวเดียว
                  <br />• ไม่ต้องใช้บริการภายนอก
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}