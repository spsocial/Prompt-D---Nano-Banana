import { useState, useEffect } from 'react'
import { Shield, LogOut, Gift, UserPlus, Search, BarChart3 } from 'lucide-react'
import AdminDashboard from './AdminDashboard'

export default function AdminSettings() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [activeTab, setActiveTab] = useState('credits') // Default to credits tab

  // Credit Management States
  const [targetUserId, setTargetUserId] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const [creditMessage, setCreditMessage] = useState('')
  const [creditMessageType, setCreditMessageType] = useState('') // 'success' or 'error'
  const [creditType, setCreditType] = useState('paid') // 'free' or 'paid'

  // Credit Check States
  const [checkUserId, setCheckUserId] = useState('')
  const [checkResult, setCheckResult] = useState(null)

  useEffect(() => {
    // Check if already authenticated
    const authStatus = sessionStorage.getItem('admin_authenticated') === 'true'
    if (authStatus) {
      setIsAuthenticated(true)
    }
  }, [])

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    // Admin password - ควรเก็บใน environment variable จริงๆ
    const ADMIN_PASSWORD = 'nano@admin2024' // รหัสผ่านแอดมิน

    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setPasswordError('')
      // Don't set premium - admin is just for credit management
      // setUserPlan('premium')
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
    // Don't change user plan on admin logout
    sessionStorage.removeItem('admin_authenticated')
  }

  const handleCheckCredits = async () => {
    if (!checkUserId) {
      setCheckResult({ type: 'error', message: 'กรุณากรอก User ID' })
      setTimeout(() => setCheckResult(null), 3000)
      return
    }

    try {
      // Check credits from database via API
      const response = await fetch(`/api/credits?userId=${checkUserId}`)
      const data = await response.json()

      if (data.success) {
        const message = `👤 User ID: ${checkUserId}\n💳 เครดิตคงเหลือ: ${data.credits} เครดิต\n📊 ใช้ไปแล้ว: ${data.totalGenerated} ภาพ`
        setCheckResult({ type: 'success', message })
      } else {
        setCheckResult({ type: 'error', message: `❌ เกิดข้อผิดพลาด: ${data.message}` })
      }
    } catch (error) {
      console.error('Error checking credits:', error)
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
      // Add credits via API
      const response = await fetch('/api/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          amount: credits,
          type: creditType,
          adminKey: 'nano-admin-2024' // In production, get this from environment
        })
      })

      const data = await response.json()

      if (data.success) {
        const creditTypeText = creditType === 'free' ? '(ฟรีทดลอง)' : '(ชำระเงินแล้ว)'
        setCreditMessage(`✅ เพิ่ม ${credits} เครดิต ${creditTypeText} ให้ User ID: ${targetUserId} สำเร็จ (รวม: ${data.credits} เครดิต)`)
        setCreditMessageType('success')
        setTargetUserId('')
        setCreditAmount('')

        // Update local statistics for display
        const creditStatsKey = 'nano_admin_credit_stats'
        const stats = JSON.parse(localStorage.getItem(creditStatsKey) || '{}')
        const today = new Date().toISOString().split('T')[0]
        if (!stats[today]) {
          stats[today] = { free: 0, paid: 0 }
        }
        if (creditType === 'free') {
          stats[today].free += credits
        } else {
          stats[today].paid += credits
        }
        localStorage.setItem(creditStatsKey, JSON.stringify(stats))

        setTimeout(() => setCreditMessage(''), 5000)
      } else {
        setCreditMessage(`เกิดข้อผิดพลาด: ${data.message}`)
        setCreditMessageType('error')
        setTimeout(() => setCreditMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error adding credits:', error)
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
          <Shield className="h-5 w-5 mr-2 text-yellow-500" />
          🔧 Admin Control Panel
        </h3>

        {/* Admin Info */}
        <div className="mb-6 p-4 bg-gradient-to-r from-green-100/50 to-emerald-100/50 backdrop-blur-sm rounded-xl border border-green-200/50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-green-700 font-semibold">
                ✅ Admin Mode Active
              </p>
              <p className="text-xs text-green-600 mt-1">
                จัดการระบบและดูสถิติ
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

        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('credits')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center ${
              activeTab === 'credits'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <Gift className="h-4 w-4 mr-2" />
            จัดการเครดิต
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard สถิติ
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'credits' ? (
          <div>

        {/* Credit Management Section */}
        <div className="mt-6 p-6 bg-gradient-to-r from-purple-50/50 to-pink-50/50 backdrop-blur-sm rounded-xl border border-purple-200/50">
          <h4 className="text-lg font-semibold mb-4 flex items-center">
            <Gift className="h-5 w-5 mr-2 text-purple-500" />
            🎁 จัดการเครดิตผู้ใช้
          </h4>

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

            {/* Credit Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ประเภทเครดิต
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCreditType('paid')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    creditType === 'paid'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white/50 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold mb-1">💰 เครดิตจากการชำระเงิน</div>
                  <div className="text-xs">ลูกค้าโอนเงินมาแล้ว (นับรายได้จริง)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setCreditType('free')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    creditType === 'free'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white/50 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold mb-1">🎁 เครดิตฟรีทดลอง</div>
                  <div className="text-xs">แจกให้ทดลองใช้ (ไม่นับรายได้)</div>
                </button>
              </div>
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
        ) : (
          <AdminDashboard />
        )}
      </div>
    </div>
  )
}