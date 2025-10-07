import '../styles/globals.css'
import { useEffect } from 'react'
import { SessionProvider, useSession } from 'next-auth/react'
import useStore from '../lib/store'
import { trackUser } from '../lib/analytics-client'

function AppContent({ Component, pageProps }) {
  const { loadUserCredits, loadHistory, setUserId } = useStore()
  const { data: session, status } = useSession()

  useEffect(() => {
    // Clean up old history from localStorage if it exists (one-time migration)
    try {
      const stored = localStorage.getItem('nano-banana-storage')
      if (stored) {
        const data = JSON.parse(stored)
        if (data?.state?.history) {
          // Remove history from localStorage (now in IndexedDB)
          delete data.state.history
          localStorage.setItem('nano-banana-storage', JSON.stringify(data))
          console.log('Migrated: Removed history from localStorage')
        }
      }
    } catch (e) {
      console.log('Migration check completed')
    }

    // Load history from IndexedDB
    loadHistory()

    // Handle user authentication
    if (status === 'authenticated' && session?.user) {
      // User is logged in with Google
      const userId = session.user.userId || session.user.email

      console.log('🔐 Authenticated user:', userId)

      // Update store with session user ID
      setUserId(userId)

      // Track user for analytics
      trackUser(userId)

      // Load credits from database (session already has credits)
      loadUserCredits(userId)

      // Store in localStorage for backward compatibility
      localStorage.setItem('nano_user_id', userId)
    } else if (status === 'unauthenticated') {
      // User is not logged in - clear old data
      console.log('⚠️ User not authenticated - please login')
      setUserId(null)
      localStorage.removeItem('nano_user_id')
    }
  }, [session, status, loadUserCredits, loadHistory, setUserId])

  return <Component {...pageProps} />
}

export default function App({ Component, pageProps }) {
  return (
    <SessionProvider session={pageProps.session}>
      <AppContent Component={Component} pageProps={pageProps} />
    </SessionProvider>
  )
}