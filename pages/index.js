import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useSession, signIn } from 'next-auth/react'
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

  // Load user-specific credits when authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.userId) {
      const currentUserId = session.user.userId
      if (loadUserCredits) {
        loadUserCredits(currentUserId)
      }
    }
  }, [status, session, loadUserCredits])

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
              <div className="p-6 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] rounded-full shadow-2xl">
                <img src="/logo.png" alt="PD Studio" className="h-16 w-16 object-contain" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              ยินดีต้อนรับสู่ PD Studio
            </h2>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              สร้างภาพและวิดีโอโฆษณาคุณภาพสูงด้วย AI<br />
              <span className="font-semibold text-[#00F2EA]">เข้าสู่ระบบด้วย Google เพื่อเริ่มใช้งาน</span>
            </p>

            <button
              onClick={() => signIn('google')}
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] hover:shadow-lg hover:shadow-[#00F2EA]/50 text-white rounded-2xl transition-all duration-300 font-bold text-lg transform hover:scale-105 w-full justify-center"
            >
              <LogIn className="h-6 w-6" />
              <span>เข้าสู่ระบบด้วย Google</span>
            </button>

            <div className="mt-8 pt-8 border-t border-gray-800">
              <h3 className="font-bold text-white mb-4">✨ คุณสมบัติพิเศษ</h3>
              <div className="grid grid-cols-1 gap-4 text-sm text-gray-300">
                <div className="p-4 bg-[#0a0a0a] rounded-xl flex items-center gap-3">
                  <div className="w-12 h-12 flex-shrink-0">
                    <Lottie animationData={freeCreditAnimation} loop={true} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[#00F2EA] mb-1">เครดิตฟรี</div>
                    <div className="text-xs">รับ 10 เครดิตทันทีเมื่อสมัคร</div>
                  </div>
                </div>
                <div className="p-4 bg-[#0a0a0a] rounded-xl flex items-center gap-3">
                  <div className="w-12 h-12 flex-shrink-0">
                    <Lottie animationData={aiAnimation} loop={true} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[#00F2EA] mb-1">AI หลากหลาย</div>
                    <div className="text-xs">Sora 2, Nano Banana และอื่นๆ</div>
                  </div>
                </div>
                <div className="p-4 bg-[#0a0a0a] rounded-xl flex items-center gap-3">
                  <div className="w-12 h-12 flex-shrink-0">
                    <Lottie animationData={historyAnimation} loop={true} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[#00F2EA] mb-1">ประวัติการใช้งาน</div>
                    <div className="text-xs">เก็บประวัติไว้ให้อัตโนมัติ</div>
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
      {status === 'authenticated' && <ChatInterfaceGenerator />}
    </>
  )
}
