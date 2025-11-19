import '../styles/globals.css'
import { useEffect } from 'react'
import { SessionProvider, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import useStore from '../lib/store'
import { trackUser } from '../lib/analytics-client'

function AppContent({ Component, pageProps }) {
  const { loadUserCredits, loadHistory, setUserId } = useStore()
  const { data: session, status } = useSession()
  const router = useRouter()

  // 🎯 Affiliate System: เช็ค referral code จาก URL
  useEffect(() => {
    const { ref } = router.query;
    if (ref) {
      // บันทึก referral code ลง localStorage
      localStorage.setItem('referralCode', ref);
      console.log('🔗 Referral code saved:', ref);
    }
  }, [router.query]);

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

      // 🎯 Affiliate System: Set referral code สำหรับ new user
      const storedReferralCode = localStorage.getItem('referralCode');
      if (storedReferralCode) {
        // เรียก API เพื่อบันทึก referral code (จะบันทึกได้เฉพาะ new user ที่ยังไม่มี referredBy)
        fetch('/api/affiliate/set-referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            referralCode: storedReferralCode
          })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              console.log('🎉 Referral code set successfully:', storedReferralCode);
              // ลบ referralCode ออกจาก localStorage เพราะบันทึกแล้ว
              localStorage.removeItem('referralCode');
            } else {
              console.log('ℹ️ Referral code not set:', data.message);
              // ถ้า user มี referredBy อยู่แล้ว ก็ลบ referralCode ออก
              if (data.message.includes('already has')) {
                localStorage.removeItem('referralCode');
              }
            }
          })
          .catch(err => {
            console.error('Error setting referral code:', err);
          });
      }
    } else if (status === 'unauthenticated') {
      // User is not logged in - clear old data (แต่เก็บ referralCode ไว้)
      console.log('⚠️ User not authenticated - please login')
      setUserId(null)
      localStorage.removeItem('nano_user_id')
      // ไม่ลบ referralCode เพราะต้องใช้ตอน login
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