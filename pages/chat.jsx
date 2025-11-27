import { useEffect } from 'react'
import Head from 'next/head'
import { useSession, signIn } from 'next-auth/react'
import ChatInterfaceGenerator from '../components/ChatInterfaceGenerator'
import useStore from '../lib/store'

export default function ChatPage() {
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
        <title>AI Chat - PD Studio</title>
        <meta name="description" content="แชทกับ AI อัจฉริยะ | PD Studio" />
      </Head>

      {/* Login Gate */}
      {status === 'unauthenticated' && (
        <div className="min-h-screen flex items-center justify-center bg-[#000000]">
          <div className="max-w-md w-full mx-4 text-center p-8 bg-[#1a1a1a] rounded-3xl border border-gray-800 shadow-2xl">
            <div className="mb-6 flex justify-center">
              <img src="/logo.png" alt="PD Studio" className="h-32 w-32 object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">กรุณาเข้าสู่ระบบ</h2>
            <button
              onClick={() => signIn('google', { callbackUrl: '/chat' })}
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white rounded-2xl font-bold text-lg w-full justify-center"
            >
              เข้าสู่ระบบด้วย Google
            </button>
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

      {/* Main App - Use ChatInterfaceGenerator with default mode = chat */}
      {status === 'authenticated' && (
        <ChatInterfaceGenerator defaultMode="chat" />
      )}
    </>
  )
}
