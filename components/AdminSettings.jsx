import { useState, useEffect } from 'react'
import useStore from '../lib/store'
import { Key, Save, Eye, EyeOff, CheckCircle, Shield, LogOut, Gift, UserPlus, Search } from 'lucide-react'

export default function AdminSettings() {
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

  // Credit Management States
  const [targetUserId, setTargetUserId] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const [creditMessage, setCreditMessage] = useState('')
  const [creditMessageType, setCreditMessageType] = useState('') // 'success' or 'error'

  // Credit Check States
  const [checkUserId, setCheckUserId] = useState('')
  const [checkResult, setCheckResult] = useState(null)

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

    // Check if already authenticated
    const authStatus = sessionStorage.getItem('admin_authenticated') === 'true'
    if (authStatus) {
      setIsAuthenticated(true)
      setUserPlan('premium')
    }
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

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    // Admin password - ควรเก็บใน environment variable จริงๆ
    const ADMIN_PASSWORD = 'nano2024' // เปลี่ยนเป็นรหัสที่คุณต้องการ

    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setPasswordError('')
      // Set to premium automatically when admin logs in
      setUserPlan('premium')
      // Save authentication status in session
      sessionStorage.setItem('admin_authenticated', 'true')
    } else {
      setPasswordError('รหัสผ่านไม่ถูกต้อง')
      setPassword('')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setPassword('')
    setUserPlan('free')
    sessionStorage.removeItem('admin_authenticated')
  }

  const handleCheckCredits = () => {
    if (!checkUserId) {
      setCheckResult({ type: 'error', message: 'กรุณากรอก User ID' })
      setTimeout(() => setCheckResult(null), 3000)
      return
    }

    try {
      // Check credits from localStorage with user-specific key
      const userCreditKey = `nano_credits_${checkUserId}`
      const specificCredits = localStorage.getItem(userCreditKey)

      // Also check general credits
      const generalCredits = localStorage.getItem('nano_credits')

      // Get transaction log
      const transactionKey = `nano_credit_log_${checkUserId}`
      const transactionLog = JSON.parse(localStorage.getItem(transactionKey) || '[]')

      let message = ''
      if (specificCredits !== null) {
        message = `👤 User ID: ${checkUserId}\n💳 เครดิตคงเหลือ: ${specificCredits} เครดิต`
        if (transactionLog.length > 0) {
          const lastTransaction = transactionLog[transactionLog.length - 1]
          message += `\n📅 รายการล่าสุด: ${new Date(lastTransaction.timestamp).toLocaleString('th-TH')}`
        }
      } else {
        message = `❌ ไม่พบข้อมูล User ID: ${checkUserId}\n💡 ใช้เครดิตทั่วไป: ${generalCredits || 100} เครดิต`
      }

      setCheckResult({ type: 'success', message })
    } catch (error) {
      setCheckResult({ type: 'error', message: 'เกิดข้อผิดพลาดในการเช็คเครดิต' })
    }
  }

  const handleAddCredits = async () => {
    if (!targetUserId || !creditAmount) {
      setCreditMessage('กรุณากรอก User ID และจำนวนเครดิต')
      setCreditMessageType('error')
      setTimeout(() => setCreditMessage(''), 3000)
      return
    }

    const credits = parseInt(creditAmount)
    if (isNaN(credits) || credits <= 0) {
      setCreditMessage('จำนวนเครดิตต้องเป็นตัวเลขมากกว่า 0')
      setCreditMessageType('error')
      setTimeout(() => setCreditMessage(''), 3000)
      return
    }

    try {
      // Store credits directly in localStorage with user-specific key
      const userCreditKey = `nano_credits_${targetUserId}`
      const currentCredits = parseInt(localStorage.getItem(userCreditKey) || '0')
      const newCredits = currentCredits + credits

      // Save to localStorage
      localStorage.setItem(userCreditKey, newCredits.toString())

      // Also save a transaction log
      const transactionKey = `nano_credit_log_${targetUserId}`
      const existingLog = JSON.parse(localStorage.getItem(transactionKey) || '[]')
      existingLog.push({
        type: 'admin_add',
        amount: credits,
        balance: newCredits,
        timestamp: new Date().toISOString(),
        adminId: 'admin'
      })
      localStorage.setItem(transactionKey, JSON.stringify(existingLog))

      setCreditMessage(`✅ เพิ่ม ${credits} เครดิตให้ User ID: ${targetUserId} สำเร็จ (รวม: ${newCredits} เครดิต)`)
      setCreditMessageType('success')
      setTargetUserId('')
      setCreditAmount('')

      setTimeout(() => setCreditMessage(''), 5000)
    } catch (error) {
      setCreditMessage('เกิดข้อผิดพลาดในการเพิ่มเครดิต: ' + error.message)
      setCreditMessageType('error')
      setTimeout(() => setCreditMessage(''), 3000)
    }
  }

  // ถ้ายังไม่ได้ login แสดงหน้า password
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-yellow-500" />
            🔒 Admin Access Required
          </h3>

          <div className="p-6 bg-gradient-to-r from-yellow-50/50 to-amber-50/50 backdrop-blur-sm rounded-xl border border-yellow-200/50">
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
                  className="w-full px-4 py-3 bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-2">{passwordError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
              >
                เข้าสู่ระบบ Admin
              </button>
            </form>

            <div className="mt-6 p-4 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 backdrop-blur-sm rounded-xl border border-blue-200/50">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">💡 สำหรับลูกค้า:</span>
                <br />กรุณาติดต่อ Prompt D เพื่อซื้อแพ็คเกจ
                <br />📱 Line: @promptd
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
        <div className="mb-6 p-4 bg-gradient-to-r from-green-100/50 to-emerald-100/50 backdrop-blur-sm rounded-xl border border-green-200/50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-green-700 font-semibold">
                ✅ Admin Mode Active
              </p>
              <p className="text-xs text-green-600 mt-1">
                คุณสามารถใช้งานระบบได้ไม่จำกัด (ไม่ใช้เครดิต)
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/80 hover:bg-red-600/90 text-white rounded-lg font-medium transition-all shadow-md flex items-center"
            >
              <LogOut className="h-4 w-4 mr-2" />
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* API Keys Input for Admin */}
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
                className="w-full px-4 py-3 bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent pr-12 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowKeys(!showKeys)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
              Replicate API Token (สำหรับสร้างภาพจริง - Optional)
            </label>
            <div className="relative">
              <input
                type={showKeys ? 'text' : 'password'}
                value={localKeys.replicate}
                onChange={(e) => setLocalKeys({ ...localKeys, replicate: e.target.value })}
                placeholder="r8_..."
                className="w-full px-4 py-3 bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent pr-12 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowKeys(!showKeys)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
            </p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`
            w-full mt-6 px-4 py-3 rounded-xl font-semibold
            flex items-center justify-center space-x-2
            transition-all duration-300 transform hover:scale-[1.02] shadow-lg
            ${saved
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
              : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
            }
          `}
        >
          {saved ? (
            <>
              <CheckCircle className="h-5 w-5" />
              <span>บันทึกสำเร็จ!</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>บันทึก API Keys</span>
            </>
          )}
        </button>

        {/* Info Note */}
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 backdrop-blur-sm rounded-xl border border-blue-200/50">
          <p className="text-xs text-blue-700">
            <span className="font-semibold">💡 วิธีการทำงาน:</span>
            <br />• <b>Gemini 2.5 Flash Image Preview</b> - วิเคราะห์และสร้างภาพในตัวเดียว! 🎨
            <br />• รองรับการสร้างภาพคุณภาพสูงโดยตรง
            <br />• Replicate (optional) - ใช้เป็นตัวสำรองถ้า Gemini ไม่พร้อม
          </p>
        </div>

        {/* Admin Control Panel */}
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 backdrop-blur-sm rounded-xl border border-yellow-200/50">
          <h4 className="font-semibold text-yellow-900 mb-3">👑 Admin Controls</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">สถานะ:</span>
              <span className="text-sm font-semibold text-green-600">Premium (ไม่จำกัด)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">ใช้เครดิต:</span>
              <span className="text-sm font-semibold text-green-600">ไม่ใช้</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">API Keys:</span>
              <span className="text-sm font-semibold text-green-600">ใช้ของระบบ</span>
            </div>
          </div>
        </div>

        {/* Credit Management Section */}
        <div className="mt-6 p-6 bg-gradient-to-r from-purple-50/50 to-pink-50/50 backdrop-blur-sm rounded-xl border border-purple-200/50">
          <h4 className="text-lg font-semibold mb-4 flex items-center">
            <Gift className="h-5 w-5 mr-2 text-purple-500" />
            🎁 จัดการเครดิตผู้ใช้ (Admin Only)
          </h4>

          {/* Tabs for Check and Add Credits */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setCheckResult(null)
                setCreditMessage('')
              }}
              className="px-4 py-2 bg-blue-500/10 text-blue-700 rounded-lg font-medium hover:bg-blue-500/20 transition-colors"
            >
              🔍 เช็คเครดิต
            </button>
            <button
              onClick={() => {
                setCheckResult(null)
                setCreditMessage('')
              }}
              className="px-4 py-2 bg-green-500/10 text-green-700 rounded-lg font-medium hover:bg-green-500/20 transition-colors"
            >
              ➕ เพิ่มเครดิต
            </button>
          </div>

          {/* Check Credits Section */}
          <div className="mb-6 p-4 bg-white/50 rounded-xl">
            <h5 className="font-medium text-gray-700 mb-3 flex items-center">
              <Search className="h-4 w-4 mr-2" />
              เช็คเครดิตผู้ใช้
            </h5>
            <div className="flex gap-2">
              <input
                type="text"
                value={checkUserId}
                onChange={(e) => setCheckUserId(e.target.value)}
                placeholder="กรอก User ID"
                className="flex-1 px-4 py-2 bg-white/70 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <button
                onClick={handleCheckCredits}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                เช็ค
              </button>
            </div>
            {checkResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm whitespace-pre-line ${
                checkResult.type === 'success'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {checkResult.message}
              </div>
            )}
          </div>

          {/* Add Credits Section */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-700 mb-3 flex items-center">
              <UserPlus className="h-4 w-4 mr-2" />
              เพิ่มเครดิตให้ผู้ใช้
            </h5>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID ของผู้ใช้
              </label>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="เช่น user_abc123"
                className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
              />
              <p className="text-xs text-gray-500 mt-1">
                User ID จะแสดงในหน้าจอของผู้ใช้ด้านล่างซ้าย
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                จำนวนเครดิตที่ต้องการเพิ่ม
              </label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="เช่น 10, 20, 50"
                min="1"
                className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300"
              />
              <p className="text-xs text-gray-500 mt-1">
                เครดิต 1 หน่วย = สร้างภาพ 1 รูป
              </p>
            </div>

            {creditMessage && (
              <div className={`p-4 rounded-lg font-medium text-sm ${
                creditMessageType === 'success'
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {creditMessage}
              </div>
            )}

            <button
              onClick={handleAddCredits}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center"
              disabled={!targetUserId || !creditAmount}
            >
              <UserPlus className="h-5 w-5 mr-2" />
              เพิ่มเครดิตให้ผู้ใช้
            </button>

            <div className="mt-4 p-3 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-800">
                <span className="font-semibold">⚠️ หมายเหตุ:</span> การเพิ่มเครดิตจะบันทึกใน localStorage ของผู้ใช้
                ผู้ใช้ต้องเปิดเว็บด้วย User ID เดียวกันเพื่อเห็นเครดิตที่เพิ่ม
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}