import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import ChatInterfaceGenerator from '../components/ChatInterfaceGenerator'
import useStore from '../lib/store'

export default function ChatUI() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { loadUserCredits } = useStore()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }

    if (session?.user?.email) {
      const userId = `U-${session.user.email.split('@')[0].toUpperCase()}`
      loadUserCredits(userId)
    }
  }, [session, status, router, loadUserCredits])

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

  return <ChatInterfaceGenerator />
}
