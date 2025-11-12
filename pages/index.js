import { useState, useEffect } from 'react'
import Head from 'next/head'
import { useSession, signIn } from 'next-auth/react'
import ChatInterfaceGenerator from '../components/ChatInterfaceGenerator'
import useStore from '../lib/store'
import { Sparkles, LogIn } from 'lucide-react'

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
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      {/* Login Gate */}
      {status === 'unauthenticated' && (
        <div className="min-h-screen flex items-center justify-center bg-[#000000]">
          <div className="max-w-md w-full mx-4 text-center p-8 bg-[#1a1a1a] rounded-3xl border border-gray-800 shadow-2xl">
            <div className="mb-6 flex justify-center">
              <div className="p-6 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] rounded-full shadow-2xl">
                <Sparkles className="h-16 w-16 text-white" />
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
                <div className="p-4 bg-[#0a0a0a] rounded-xl">
                  <div className="font-bold text-[#00F2EA] mb-1">🎁 เครดิตฟรี</div>
                  รับ 10 เครดิตทันทีเมื่อสมัคร
                </div>
                <div className="p-4 bg-[#0a0a0a] rounded-xl">
                  <div className="font-bold text-[#00F2EA] mb-1">🎨 AI หลากหลาย</div>
                  Sora 2, Nano Banana และอื่นๆ
                </div>
                <div className="p-4 bg-[#0a0a0a] rounded-xl">
                  <div className="font-bold text-[#00F2EA] mb-1">📊 ประวัติการใช้งาน</div>
                  เก็บประวัติไว้ให้อัตโนมัติ
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
