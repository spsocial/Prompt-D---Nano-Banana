import '../styles/globals.css'
import { useEffect } from 'react'
import useStore from '../lib/store'

export default function App({ Component, pageProps }) {
  const { loadUserCredits, loadHistory } = useStore()

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

    // Load user ID and credits from localStorage on startup
    const userId = localStorage.getItem('nano_user_id')
    if (!userId) {
      // Generate new user ID if none exists
      const newUserId = 'NB-' + Math.random().toString(36).substr(2, 6).toUpperCase()
      localStorage.setItem('nano_user_id', newUserId)
      loadUserCredits(newUserId)
    } else {
      loadUserCredits(userId)
    }
  }, [loadUserCredits, loadHistory])

  return <Component {...pageProps} />
}