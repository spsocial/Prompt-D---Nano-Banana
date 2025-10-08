import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useSession, signIn, signOut } from 'next-auth/react'
import UnifiedGenerator from '../components/UnifiedGenerator'
import ResultGallery from '../components/ResultGallery'
import ProcessingModal from '../components/ProcessingModal'
import PricingModal from '../components/PricingModal'
import FabButton from '../components/FabButton'
import useStore from '../lib/store'
import Link from 'next/link'
import { Sparkles, Film, Wallet, X, History, LogIn, LogOut, User } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()
  const [showPricing, setShowPricing] = useState(false)
  const [userId, setUserId] = useState('')
  const [debugInfo, setDebugInfo] = useState('')
  const {
    isProcessing,
    results,
    error,
    apiKeys,
    userPlan,
    userCredits = 0,
    setUserCredits,
    loadUserCredits
  } = useStore()

  // Load user-specific credits when authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.userId) {
      // Use userId from session (Google login)
      const currentUserId = session.user.userId
      setUserId(currentUserId)

      // Function to reload credits from database
      const reloadCredits = async () => {
        if (loadUserCredits) {
          await loadUserCredits(currentUserId)
        }
      }

      // Load initially
      reloadCredits()

      // Reload every 5 seconds to catch updates
      const interval = setInterval(reloadCredits, 5000)

      // Also reload when window gets focus
      const handleFocus = () => reloadCredits()
      window.addEventListener('focus', handleFocus)

      return () => {
        clearInterval(interval)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [status, session, loadUserCredits])

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50">
      <Head>
        <title>Prompt D Studio - สร้างภาพและวิดีโอด้วย AI</title>
        <meta name="description" content="แพลตฟอร์ม AI ครบวงจร สร้างภาพและวิดีโอโฆษณาคุณภาพสูง | Prompt D Studio - All-in-One AI Creative Platform" />
        <meta name="keywords" content="AI, Image Generator, Video Generator, AI Platform, Prompt D, โฆษณา, วิดีโอ AI, All-in-One" />
        <link rel="icon" href="/favicon.ico" />
        {/* Inter font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* Header */}
      <header className="bg-white/60 backdrop-blur-xl border-b border-white/30 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Prompt D Studio
              </h1>
              <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-md">
                {userPlan === 'premium' ? 'Premium' : 'V.Beta'}
              </span>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* User Profile or Login Button */}
              {status === 'authenticated' && session?.user ? (
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {/* User Info */}
                  <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-white/40 to-white/20 backdrop-blur-lg rounded-xl border border-white/30 shadow-md">
                    {session.user.image && (
                      <img src={session.user.image} alt={session.user.name} className="w-6 h-6 rounded-full" />
                    )}
                    <span className="text-sm font-medium text-gray-800">{session.user.name?.split(' ')[0]}</span>
                  </div>
                </div>
              ) : status === 'unauthenticated' ? (
                <button
                  onClick={() => signIn('google')}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg font-medium text-sm"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                  <span className="sm:hidden">Login</span>
                </button>
              ) : null}

              {/* History Button */}
              <Link href="/history" className="p-3 rounded-xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-md hover:shadow-lg" title="ประวัติ">
                <History className="h-5 w-5 text-gray-700" />
              </Link>

              {/* Credits Display */}
              {status === 'authenticated' && (
                <div
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-white/40 to-white/20 backdrop-blur-lg rounded-xl border border-white/30 shadow-lg cursor-pointer"
                  onClick={() => {
                    // Force reload credits when clicked
                    const uid = localStorage.getItem('nano_user_id')
                    if (uid && loadUserCredits) {
                      loadUserCredits(uid)
                    }
                  }}
                  title="คลิกเพื่อรีเฟรชเครดิต"
                >
                  <span className="text-sm font-semibold text-gray-800">
                    💳 {userPlan === 'premium' ? 'ไม่จำกัด' : `${userCredits} เครดิต`}
                  </span>
                </div>
              )}

              {/* Pricing Button */}
              {status === 'authenticated' && (
                <button
                  onClick={() => setShowPricing(!showPricing)}
                  className="p-3 rounded-xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-md hover:shadow-lg"
                  title="ซื้อเครดิต"
                >
                  <Wallet className="h-5 w-5 text-yellow-600" />
                </button>
              )}

              {/* Logout Button */}
              {status === 'authenticated' && (
                <button
                  onClick={() => signOut()}
                  className="p-3 rounded-xl hover:bg-red-50 transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-md hover:shadow-lg"
                  title="ออกจากระบบ"
                >
                  <LogOut className="h-5 w-5 text-red-600" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Pricing Modal */}
      {showPricing && (
        <PricingModal onClose={() => setShowPricing(false)} />
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Login Required Gate */}
        {status === 'unauthenticated' && (
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="max-w-2xl w-full text-center p-8 bg-white/50 backdrop-blur-lg rounded-3xl border-2 border-white/50 shadow-2xl">
              <div className="mb-6 flex justify-center">
                <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-2xl">
                  <Sparkles className="h-16 w-16 text-white" />
                </div>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                ยินดีต้อนรับสู่ Prompt D Studio
              </h2>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                สร้างภาพและวิดีโอโฆษณาคุณภาพสูงด้วย AI<br />
                <span className="font-semibold text-purple-600">เข้าสู่ระบบด้วย Google เพื่อเริ่มใช้งาน</span>
              </p>

              <button
                onClick={() => signIn('google')}
                className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl font-bold text-lg transform hover:scale-105"
              >
                <LogIn className="h-6 w-6" />
                <span>เข้าสู่ระบบด้วย Google</span>
              </button>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4">✨ คุณสมบัติพิเศษ</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
                  <div className="p-4 bg-white/30 rounded-xl">
                    <div className="font-bold text-purple-600 mb-1">🎁 เครดิตฟรี</div>
                    รับ 10 เครดิตทันทีเมื่อสมัคร
                  </div>
                  <div className="p-4 bg-white/30 rounded-xl">
                    <div className="font-bold text-purple-600 mb-1">☁️ Sync ข้อมูล</div>
                    ใช้งานได้ทุกอุปกรณ์
                  </div>
                  <div className="p-4 bg-white/30 rounded-xl">
                    <div className="font-bold text-purple-600 mb-1">📊 ประวัติการใช้งาน</div>
                    เก็บประวัติไว้ให้อัตโนมัติ
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Only show when authenticated */}
        {status === 'authenticated' && (
          <>
            {/* Hero Section */}
            <div className="text-center mb-12 animate-fade-in">
              <div className="inline-flex items-center space-x-2 mb-6 px-5 py-2 bg-gradient-to-r from-purple-400/20 to-pink-400/20 backdrop-blur-sm rounded-full border border-white/30 shadow-lg">
                <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
                <span className="text-sm font-semibold text-purple-800">
                  สร้างภาพและวิดีโอด้วย AI โดย Prompt D
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                แปลงรูปสินค้าให้เป็น
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {" "}ภาพและวิดีโอโฆษณา
                </span>
              </h2>
              <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
                อัพโหลดรูปสินค้าของคุณ เลือก AI Model ที่ต้องการ
                แล้วสร้างภาพโฆษณาและวิดีโอคุณภาพสูงได้ในที่เดียว
              </p>
            </div>
          </>
        )}

        {/* Simple Notice if no credits (not for admin) */}
        {status === 'authenticated' && userCredits === 0 && userPlan !== 'premium' && (
          <div className="mb-8 p-5 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 backdrop-blur-sm border border-yellow-200/50 rounded-2xl shadow-lg animate-slide-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start">
                <div className="mr-3 mt-1 p-2 bg-yellow-500 rounded-lg">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-yellow-900 mb-1">ต้องการเครดิตเพื่อใช้งาน</h3>
                  <p className="text-sm text-yellow-800">
                    คลิกที่ปุ่มกระเป๋าเงินด้านบนเพื่อซื้อเครดิต เริ่มต้นเพียง 29 บาท
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPricing(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105 shadow-md"
              >
                ซื้อเครดิต
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {status === 'authenticated' && error && (
          <div className="mb-8 p-5 bg-gradient-to-r from-red-100/50 to-pink-100/50 backdrop-blur-sm border border-red-200/50 rounded-2xl shadow-lg animate-slide-in">
            <div className="flex items-start">
              <div className="mr-3 mt-1 p-2 bg-red-500 rounded-lg">
                <X className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-1">ข้อผิดพลาด</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {status === 'authenticated' && (
          <>
            <div className="max-w-5xl mx-auto">
              {/* Unified Generator */}
              <div className="card-modern">
                <div className="p-8">
                  <UnifiedGenerator />
                </div>
              </div>

              {/* Results Section */}
              {results.length > 0 && (
                <div className="card-modern mt-8">
                  <div className="p-6">
                    <h3 className="text-2xl font-bold mb-5 flex items-center">
                      <span className="mr-3 p-2 bg-gradient-to-r from-purple-400 to-purple-500 rounded-lg text-white">
                        ✨
                      </span>
                      ภาพโฆษณาที่สร้างแล้ว
                    </h3>
                    <ResultGallery />
                  </div>
                </div>
              )}
            </div>

            {/* Features Section */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-lg rounded-2xl border border-white/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-3xl mb-3 bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">🎬</div>
            <h4 className="font-bold text-gray-800">เว็บเดียวครบ จบ</h4>
            <p className="text-sm text-gray-600 mt-2">
              ทั้งภาพและวิดีโอโฆษณาในที่เดียว
            </p>
          </div>
          <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-lg rounded-2xl border border-white/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-3xl mb-3 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">🤖</div>
            <h4 className="font-bold text-gray-800">AI หลากหลายโมเดล</h4>
            <p className="text-sm text-gray-600 mt-2">
              Gemini, Sora-2, Veo3 เลือกได้ตามงาน
            </p>
          </div>
          <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-lg rounded-2xl border border-white/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-3xl mb-3 bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent">⚡</div>
            <h4 className="font-bold text-gray-800">รวดเร็วทันใจ</h4>
            <p className="text-sm text-gray-600 mt-2">
              ภาพ 30 วิ | วิดีโอ 1-3 นาที
            </p>
          </div>
          <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-lg rounded-2xl border border-white/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-3xl mb-3 bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">💎</div>
            <h4 className="font-bold text-gray-800">คุณภาพระดับโปร</h4>
            <p className="text-sm text-gray-600 mt-2">
              HD 1080p พร้อมใช้งานทันที
            </p>
          </div>
        </div>

            {/* Processing Modal */}
            {isProcessing && <ProcessingModal />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/20 bg-gradient-to-r from-yellow-50/30 to-amber-50/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-purple-500 mr-2" />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Prompt D Studio
              </h3>
            </div>
            <p className="mb-4 text-gray-700 max-w-2xl mx-auto">
              ✨ แพลตฟอร์ม AI ครบวงจร สร้างภาพและวิดีโอโฆษณาคุณภาพสูง เลือกใช้ AI Model ที่เหมาะกับงานของคุณได้ในที่เดียว
            </p>
            <div className="pt-6 border-t border-white/20">
              <p className="text-lg font-bold text-purple-600">
                💡 พัฒนาโดย Prompt D
              </p>
              <p className="text-sm text-gray-600 mt-2">
                AI-Powered Image & Video Studio
              </p>
              {userId && (
                <div className="mt-4 p-3 bg-white/50 rounded-lg inline-block">
                  <p className="text-xs text-gray-500">Your User ID:</p>
                  <p className="text-sm font-mono font-bold text-gray-700">{userId}</p>
                  <button
                    onClick={() => {
                      const creditKey = `nano_credits_${userId}`
                      const storedCredits = localStorage.getItem(creditKey)
                      alert(`Debug Info:\n\nUser ID: ${userId}\nCredit Key: ${creditKey}\nStored Credits: ${storedCredits}\nCurrent Credits (State): ${userCredits}\n\nAll Credit Keys:\n${Object.keys(localStorage).filter(k => k.includes('nano_credits')).map(k => `${k}: ${localStorage.getItem(k)}`).join('\n')}`)
                    }}
                    className="ml-2 px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Debug
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* FAB Button */}
      <FabButton />
    </div>
  )
}