import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import UnifiedGeneratorModern from '../components/UnifiedGeneratorModern'
import ResultGallery from '../components/ResultGallery'
import History from '../components/History'
import useStore from '../lib/store'

export default function TestDesign() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { loadUserCredits } = useStore()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }

    if (session?.user?.email) {
      const userId = `U-${session.user.email.split('@')[0].toUpperCase()}`
      loadUserCredits(userId)
    }
  }, [session, status, router, loadUserCredits])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <main className="container mx-auto px-4 py-8">
        {/* Test Badge */}
        <div className="max-w-5xl mx-auto mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 border border-purple-300 rounded-lg">
            <span className="text-purple-900 font-semibold text-sm">🎨 Design Test Mode</span>
            <span className="text-purple-700 text-sm">| ทดสอบ UI ใหม่</span>
          </div>
        </div>

        {/* Modern Design */}
        <UnifiedGeneratorModern />

        {/* Result Gallery */}
        <div className="mt-16">
          <ResultGallery />
        </div>

        {/* History */}
        <div className="mt-16">
          <History />
        </div>
      </main>
    </div>
  )
}
