import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ArrowLeft, User, Mail, Calendar, Key, Copy, Check, LogOut, Wallet, History as HistoryIcon, Sparkles } from 'lucide-react'
import useStore from '../lib/store'

export default function Profile() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { userCredits, loadUserCredits } = useStore()

  const [userId, setUserId] = useState('')
  const [copied, setCopied] = useState(false)
  const [stats, setStats] = useState({ totalGenerated: 0, totalSpent: 0 })

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  // Get userId and load credits
  useEffect(() => {
    if (session?.user?.email) {
      const uid = `U-${session.user.email.split('@')[0].toUpperCase()}`
      setUserId(uid)
      if (loadUserCredits) {
        loadUserCredits(uid)
      }

      // Load stats from database via API
      const fetchStats = async () => {
        try {
          const response = await fetch(`/api/credits?userId=${uid}`)
          const data = await response.json()

          if (data.success) {
            setStats({
              totalGenerated: data.totalGenerated || 0,
              totalSpent: data.totalSpent || 0
            })
          }
        } catch (error) {
          console.error('Error loading stats:', error)
          // Fallback to 0 if API fails
          setStats({
            totalGenerated: 0,
            totalSpent: 0
          })
        }
      }

      fetchStats()
    }
  }, [session, loadUserCredits])

  const handleCopyUid = () => {
    navigator.clipboard.writeText(userId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00F2EA] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-medium">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Head>
        <title>ข้อมูลส่วนตัว - PD Studio</title>
      </Head>

      <div className="min-h-screen bg-[#000000]">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-lg bg-[#121212]/90 border-b border-gray-800">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
                <div className="flex items-center gap-2">
                  <User className="h-6 w-6 text-[#00F2EA]" />
                  <h1 className="text-xl font-bold text-white">ข้อมูลส่วนตัว</h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Profile Card */}
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden mb-6">
            {/* Cover */}
            <div className="h-32 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55]"></div>

            {/* Profile Info */}
            <div className="p-8">
              <div className="flex items-start gap-6 -mt-20 mb-6">
                {/* Avatar */}
                <div className="relative">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="w-32 h-32 rounded-full border-4 border-[#1a1a1a] shadow-xl object-cover"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-[#1a1a1a] bg-gradient-to-br from-[#00F2EA] to-[#FE2C55] flex items-center justify-center shadow-xl">
                      <User className="h-16 w-16 text-white" />
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 mt-16">
                  <h2 className="text-2xl font-bold text-white mb-2">{session.user?.name}</h2>
                  <p className="text-gray-400">{session.user?.email}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#00F2EA]/20 rounded-lg">
                      <Wallet className="h-6 w-6 text-[#00F2EA]" />
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">เครดิตคงเหลือ</div>
                      <div className="text-2xl font-bold text-white">{userCredits}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#FE2C55]/20 rounded-lg">
                      <Sparkles className="h-6 w-6 text-[#FE2C55]" />
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">สร้างแล้ว</div>
                      <div className="text-2xl font-bold text-white">{stats.totalGenerated}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <Wallet className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm">ใช้ไปทั้งหมด</div>
                      <div className="text-2xl font-bold text-white">{stats.totalSpent}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="space-y-4">
                <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm">อีเมล</span>
                    </div>
                  </div>
                  <div className="text-white font-mono">{session.user?.email}</div>
                </div>

                <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Key className="h-4 w-4" />
                      <span className="text-sm">User ID (UID)</span>
                    </div>
                    <button
                      onClick={handleCopyUid}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                      title="คัดลอก UID"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="text-white font-mono text-lg">{userId}</div>
                  <p className="text-gray-500 text-xs mt-2">
                    💡 ใช้ UID นี้เพื่อเติมเครดิตแบบ Manual หากมีปัญหากับระบบอัตโนมัติ
                  </p>
                </div>

                {session.user?.image && (
                  <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">บัญชี</span>
                    </div>
                    <div className="text-white">Google Account</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => router.push('/topup')}
              className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Wallet className="h-5 w-5" />
              เติมเครดิต
            </button>

            <button
              onClick={() => router.push('/history')}
              className="flex items-center justify-center gap-3 p-4 bg-[#1a1a1a] border border-gray-800 text-white rounded-xl font-semibold hover:bg-[#0a0a0a] transition-all"
            >
              <HistoryIcon className="h-5 w-5" />
              ประวัติการสร้าง
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-3 p-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded-xl font-semibold hover:bg-red-500/30 transition-all"
            >
              <LogOut className="h-5 w-5" />
              ออกจากระบบ
            </button>
          </div>

          {/* Info Card */}
          <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#00F2EA]" />
              เกี่ยวกับบัญชีของคุณ
            </h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>• UID ของคุณใช้สำหรับระบุบัญชีในระบบ</p>
              <p>• กรณีเติมเครดิตแบบ Manual ให้แจ้ง UID นี้กับแอดมิน</p>
              <p>• เครดิตของคุณจะถูกเก็บไว้ในระบบอย่างปลอดภัย</p>
              <p>• ประวัติการใช้งานจะถูกบันทึกอัตโนมัติ</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
