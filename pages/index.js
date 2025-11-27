import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import ChatInterfaceGenerator from '../components/ChatInterfaceGenerator'
import useStore from '../lib/store'
import { Sparkles, LogIn } from 'lucide-react'
import Lottie from 'lottie-react'
import freeCreditAnimation from '../lib/animations/free_credit.json'
import aiAnimation from '../lib/animations/ai_หลากหลาย.json'
import historyAnimation from '../lib/animations/ประวัติการใช้งาน.json'

export default function Home() {
  const { data: session, status } = useSession()
  const { loadUserCredits } = useStore()
  const [showTutorial, setShowTutorial] = useState(false)
  const router = useRouter()

  // Redirect to /image when authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/image')
    }
  }, [status, router])

  // Load user-specific credits when authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.userId) {
      const currentUserId = session.user.userId
      if (loadUserCredits) {
        loadUserCredits(currentUserId)
      }
    }
  }, [status, session, loadUserCredits])

  // Show tutorial popup after login (if not dismissed today)
  useEffect(() => {
    if (status === 'authenticated') {
      const today = new Date().toDateString()
      const lastDismissed = localStorage.getItem('tutorialDismissed')

      if (lastDismissed !== today) {
        // Delay popup slightly for better UX
        const timer = setTimeout(() => {
          setShowTutorial(true)
        }, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [status])

  const handleDismissTutorial = (dontShowAgain = false) => {
    setShowTutorial(false)
    if (dontShowAgain) {
      const today = new Date().toDateString()
      localStorage.setItem('tutorialDismissed', today)
    }
  }

  return (
    <>
      <Head>
        <title>PD Studio - สร้างภาพและวิดีโอด้วย AI</title>
        <meta name="description" content="แพลตฟอร์ม AI ครบวงจร สร้างภาพและวิดีโอโฆษณาคุณภาพสูง | PD Studio - All-in-One AI Creative Platform" />
        <meta name="keywords" content="AI, Image Generator, Video Generator, AI Platform, PD Studio, โฆษณา, วิดีโอ AI, All-in-One" />
        <meta name="theme-color" content="#00F2EA" />

        {/* Favicons for all browsers and devices */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* Login Gate */}
      {status === 'unauthenticated' && (
        <div className="min-h-screen flex items-center justify-center bg-[#000000]">
          <div className="max-w-md w-full mx-4 text-center p-8 bg-[#1a1a1a] rounded-3xl border border-gray-800 shadow-2xl">
            <div className="mb-6 flex justify-center">
              <img src="/logo.png" alt="PD Studio" className="h-32 w-32 sm:h-24 sm:w-24 object-contain" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 whitespace-nowrap">
              ยินดีต้อนรับสู่ PD Studio
            </h2>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              สร้างภาพและวิดีโอโฆษณาคุณภาพสูงด้วย AI<br />
              <span className="font-semibold text-[#00F2EA]">เข้าสู่ระบบด้วย Google เพื่อเริ่มใช้งาน</span>
            </p>

            <button
              onClick={() => signIn('google', { callbackUrl: '/image' })}
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] hover:shadow-lg hover:shadow-[#00F2EA]/50 text-white rounded-2xl transition-all duration-300 font-bold text-lg transform hover:scale-105 w-full justify-center"
            >
              <LogIn className="h-6 w-6" />
              <span>เข้าสู่ระบบด้วย Google</span>
            </button>

            <div className="mt-8 pt-8 border-t border-gray-800">
              <h3 className="font-bold text-white mb-4">✨ คุณสมบัติพิเศษ</h3>
              <div className="grid grid-cols-1 gap-3 text-sm text-gray-300">
                <div className="p-3 bg-[#0a0a0a] rounded-xl flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12">
                    <Lottie animationData={freeCreditAnimation} loop={true} />
                  </div>
                  <div>
                    <div className="font-bold text-[#00F2EA] text-sm">เครดิตฟรี</div>
                    <div className="text-xs text-gray-400">รับ 10 เครดิตทันทีเมื่อสมัคร</div>
                  </div>
                </div>
                <div className="p-3 bg-[#0a0a0a] rounded-xl flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12">
                    <Lottie animationData={aiAnimation} loop={true} />
                  </div>
                  <div>
                    <div className="font-bold text-[#00F2EA] text-sm">AI หลากหลาย</div>
                    <div className="text-xs text-gray-400">Sora 2, Nano Banana และอื่นๆ</div>
                  </div>
                </div>
                <div className="p-3 bg-[#0a0a0a] rounded-xl flex flex-col items-center gap-2 text-center">
                  <div className="w-12 h-12">
                    <Lottie animationData={historyAnimation} loop={true} />
                  </div>
                  <div>
                    <div className="font-bold text-[#00F2EA] text-sm">ประวัติการใช้งาน</div>
                    <div className="text-xs text-gray-400">เก็บประวัติไว้ให้อัตโนมัติ</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {status === 'loading' && (
        <div className="min-h-screen flex items-center justify-center bg-[#000000]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#00F2EA] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white font-medium">กำลังโหลด...</p>
          </div>
        </div>
      )}

      {/* Main App */}
      {status === 'authenticated' && (
        <>
          <ChatInterfaceGenerator />

          {/* Tutorial Modal */}
          {showTutorial && (
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => handleDismissTutorial(false)}
            >
              <div
                className="bg-[#1a1a1a] rounded-2xl border border-[#00F2EA] shadow-2xl max-w-3xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] p-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-6 w-6" />
                      📺 วิธีใช้งาน PD Studio
                    </h3>
                    <button
                      onClick={() => handleDismissTutorial(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                  <p className="text-gray-300 mb-4 text-center">
                    🎬 ดูคลิปสอนใช้งานสั้นๆ ก่อนเริ่มสร้างคอนเทนต์กับ AI
                  </p>

                  {/* Video Container */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-6">
                    <iframe
                      className="w-full h-full"
                      src="https://www.youtube.com/embed/_VLB418zkXs?autoplay=1&mute=1"
                      title="วิธีใช้งาน PD Studio"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleDismissTutorial(true)}
                      className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-all"
                    >
                      ไม่ต้องแสดงอีกวันนี้
                    </button>
                    <button
                      onClick={() => handleDismissTutorial(false)}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] hover:shadow-lg text-white rounded-xl font-bold transition-all"
                    >
                      เริ่มใช้งานเลย! 🚀
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
