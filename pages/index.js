import { useState, useEffect } from 'react'
import Head from 'next/head'
import ImageUploader from '../components/ImageUploader'
import ResultGallery from '../components/ResultGallery'
import ProcessingModal from '../components/ProcessingModal'
import PricingModal from '../components/PricingModal'
import useStore from '../lib/store'
import Link from 'next/link'
import { Sparkles, Banana, Wallet, X, History } from 'lucide-react'

export default function Home() {
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

  // Load user-specific credits on mount and refresh periodically
  useEffect(() => {
    // Get or create user ID
    let storedUserId = localStorage.getItem('nano_user_id')
    if (!storedUserId) {
      storedUserId = 'NB-' + Math.random().toString(36).substr(2, 6).toUpperCase()
      localStorage.setItem('nano_user_id', storedUserId)
    }
    setUserId(storedUserId)

    // Function to reload credits from database
    const reloadCredits = async () => {
      if (loadUserCredits) {
        // Load credits from API
        await loadUserCredits(storedUserId)
      }
    }

    // Load initially
    reloadCredits()

    // Reload every 5 seconds to catch admin updates
    const interval = setInterval(reloadCredits, 5000)

    // Also reload when window gets focus
    const handleFocus = () => reloadCredits()
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadUserCredits])

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
      <Head>
        <title>Auto Nano Banana - สร้างโฆษณาสินค้าด้วย AI | พัฒนาโดย Prompt D</title>
        <meta name="description" content="แปลงรูปสินค้าเป็นโฆษณาระดับพรีเมี่ยมด้วย AI | Developed by Prompt D" />
        <link rel="icon" href="/favicon.ico" />
        {/* Inter font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* Header */}
      <header className="bg-white/30 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl shadow-lg">
                <Banana className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                Auto Nano Banana
              </h1>
              <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-full shadow-md">
                {userPlan === 'premium' ? 'Premium' : 'V.Beta'}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              {/* History Button */}
              <Link href="/history" className="p-3 rounded-xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-md hover:shadow-lg" title="ประวัติ">
                <History className="h-5 w-5 text-gray-700" />
              </Link>

              {/* Credits Display */}
              <div
                className="px-4 py-2 bg-gradient-to-r from-white/40 to-white/20 backdrop-blur-lg rounded-xl border border-white/30 shadow-lg cursor-pointer"
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

              {/* Pricing Button */}
              <button
                onClick={() => setShowPricing(!showPricing)}
                className="p-3 rounded-xl hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/20 shadow-md hover:shadow-lg"
                title="ซื้อเครดิต"
              >
                <Wallet className="h-5 w-5 text-yellow-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Pricing Modal */}
      {showPricing && (
        <PricingModal onClose={() => setShowPricing(false)} />
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center space-x-2 mb-6 px-5 py-2 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 backdrop-blur-sm rounded-full border border-white/30 shadow-lg">
            <Sparkles className="h-5 w-5 text-yellow-600 animate-pulse" />
            <span className="text-sm font-semibold text-yellow-800">
              สร้างโฆษณาสินค้าด้วย AI โดย Prompt D
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            แปลงรูปสินค้าให้เป็น
            <span className="bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent">
              {" "}โฆษณาระดับพรีเมี่ยม
            </span>
          </h2>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
            อัพโหลดรูปสินค้าของคุณ แล้วให้ AI สร้างโฆษณาที่สวยงามหลากหลายสไตล์
            ด้วยเทคโนโลยี Vision Analysis และ Gemini AI รุ่นล่าสุด
          </p>
        </div>

        {/* Simple Notice if no credits (not for admin) */}
        {userCredits === 0 && userPlan !== 'premium' && (
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
        {error && (
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
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="card-modern">
            <div className="p-6">
              <h3 className="text-2xl font-bold mb-5 flex items-center">
                <span className="mr-3 p-2 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg text-white">
                  📸
                </span>
                อัพโหลดรูปสินค้า
              </h3>
              <ImageUploader />
            </div>
          </div>

          {/* Results Section */}
          <div className="card-modern">
            <div className="p-6 min-h-[500px]">
              <h3 className="text-2xl font-bold mb-5 flex items-center">
                <span className="mr-3 p-2 bg-gradient-to-r from-purple-400 to-purple-500 rounded-lg text-white">
                  ✨
                </span>
                ภาพโฆษณาที่สร้างแล้ว
              </h3>
              {results.length > 0 ? (
                <ResultGallery />
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                  <div className="p-5 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 rounded-full mb-6">
                    <Banana className="h-16 w-16 text-yellow-500 opacity-70" />
                  </div>
                  <p className="text-center text-lg font-medium">
                    อัพโหลดรูปสินค้าเพื่อสร้าง<br />
                    โฆษณาระดับมืออาชีพ
                  </p>
                  <p className="text-center text-sm mt-2 text-gray-400">
                    ระบบจะสร้างภาพโฆษณาที่สวยงามและทันสมัย
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-lg rounded-2xl border border-white/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-3xl mb-3 bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">🤖</div>
            <h4 className="font-bold text-gray-800">วิเคราะห์ด้วย AI</h4>
            <p className="text-sm text-gray-600 mt-2">
              ตรวจจับและวิเคราะห์สินค้าอัตโนมัติ
            </p>
          </div>
          <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-lg rounded-2xl border border-white/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-3xl mb-3 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">🎨</div>
            <h4 className="font-bold text-gray-800">สร้างได้ 1-4 ภาพ</h4>
            <p className="text-sm text-gray-600 mt-2">
              หลากหลายสไตล์และองค์ประกอบ
            </p>
          </div>
          <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-lg rounded-2xl border border-white/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-3xl mb-3 bg-gradient-to-r from-green-500 to-teal-500 bg-clip-text text-transparent">⚡</div>
            <h4 className="font-bold text-gray-800">สร้างภาพเร็ว</h4>
            <p className="text-sm text-gray-600 mt-2">
              ได้ผลลัพธ์ภายใน 30 วินาที
            </p>
          </div>
          <div className="bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-lg rounded-2xl border border-white/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="text-3xl mb-3 bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">💎</div>
            <h4 className="font-bold text-gray-800">คุณภาพพรีเมี่ยม</h4>
            <p className="text-sm text-gray-600 mt-2">
              ดีไซน์โฆษณาระดับมืออาชีพ
            </p>
          </div>
        </div>

        {/* Processing Modal */}
        {isProcessing && <ProcessingModal />}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/20 bg-gradient-to-r from-yellow-50/30 to-amber-50/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-6">
              <Banana className="h-8 w-8 text-yellow-500 mr-2" />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                Auto Nano Banana
              </h3>
            </div>
            <p className="mb-4 text-gray-700 max-w-2xl mx-auto">
              🍌 สร้างโฆษณาสินค้าด้วย AI อัจฉริยะ ใช้เทคโนโลยี Vision API และ Google Gemini AI สำหรับการสร้างเนื้อหาอัจฉริยะ
            </p>
            <div className="pt-6 border-t border-white/20">
              <p className="text-lg font-bold text-yellow-600">
                💡 พัฒนาโดย Prompt D
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Specialist in AI-Powered Solutions
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
    </div>
  )
}