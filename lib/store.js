import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Function to optimize image data for storage
// Keep images but compress if needed
const optimizeImageForStorage = (item) => {
  const optimized = { ...item }
  // Keep the generated image URL intact
  // Only remove original image to save space (can regenerate from prompt)
  if (optimized.originalImage && optimized.originalImage.startsWith('data:')) {
    // Keep a smaller reference instead of full base64
    optimized.originalImage = 'removed_for_space'
  }
  return optimized
}

// Function to limit history size and optimize storage for persistence
// This is only called when persisting to localStorage, not on every operation
const optimizeHistoryForStorage = (history) => {
  // Keep last 50 items with full images (configurable limit)
  const HISTORY_LIMIT = 50 // จำนวนประวัติที่จะเก็บ

  // Sort by timestamp to ensure we keep the most recent items
  const sortedHistory = [...history].sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Keep recent items with full data
  const recentItems = sortedHistory.slice(0, HISTORY_LIMIT)

  // For older items (50-100), keep them but optimize storage
  const olderItems = sortedHistory.slice(HISTORY_LIMIT, 100).map(optimizeImageForStorage)

  return [...recentItems, ...olderItems]
}

// Custom storage with error handling to prevent QuotaExceededError
const createSafeStorage = () => {
  let storage
  try {
    storage = {
      getItem: (name) => {
        try {
          return localStorage.getItem(name)
        } catch (error) {
          console.warn('Error reading from localStorage:', error)
          return null
        }
      },
      setItem: (name, value) => {
        try {
          localStorage.setItem(name, value)
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded')
            // Try a more conservative approach - only clear oldest history items
            try {
              const state = JSON.parse(localStorage.getItem('nano-banana-storage') || '{}')
              if (state.state && state.state.history && state.state.history.length > 20) {
                // Keep only the 20 most recent items when quota is exceeded
                const sortedHistory = [...state.state.history].sort((a, b) => 
                  new Date(b.timestamp) - new Date(a.timestamp)
                );
                state.state.history = sortedHistory.slice(0, 20).map(optimizeImageForStorage);
                localStorage.setItem('nano-banana-storage', JSON.stringify(state))
                // Retry setting the item
                localStorage.setItem(name, value)
                console.log('Successfully reduced history size and saved data')
                // Show user-friendly notification
                if (typeof window !== 'undefined' && typeof alert !== 'undefined') {
                  // Only show alert if we're in a browser environment
                  setTimeout(() => {
                    alert('ระบบได้ทำความสะอาดประวัติเก่าเพื่อประหยัดพื้นที่ รูปภาพล่าสุด 20 รายการยังคงอยู่')
                  }, 100)
                }
              } else {
                // If we can't reduce history enough, show a user-friendly message
                console.error('Storage quota exceeded. Please clear some browser data or history manually.')
                if (typeof window !== 'undefined' && typeof alert !== 'undefined') {
                  setTimeout(() => {
                    alert('พื้นที่จัดเก็บในเบราว์เซอร์ของคุณเต็มแล้ว กรุณาลบประวัติเก่าหรือล้างข้อมูลเบราว์เซอร์')
                  }, 100)
                }
              }
            } catch (retryError) {
              console.error('Failed to reduce history size:', retryError)
            }
          } else {
            console.error('Error writing to localStorage:', error)
          }
        }
      },
      removeItem: (name) => {
        try {
          localStorage.removeItem(name)
        } catch (error) {
          console.warn('Error removing from localStorage:', error)
        }
      }
    }
  } catch (error) {
    console.error('localStorage is not available:', error)
    // Fallback to in-memory storage
    let memoryStorage = {}
    storage = {
      getItem: (name) => memoryStorage[name] || null,
      setItem: (name, value) => {
        memoryStorage[name] = value
      },
      removeItem: (name) => {
        delete memoryStorage[name]
      }
    }
  }
  return storage
}

const useStore = create(
  persist(
    (set, get) => ({
      // User Plan
      userPlan: 'free', // 'free' or 'premium'
      setUserPlan: (plan) => set({ userPlan: plan }),

      // API Keys
      apiKeys: {
        openai: '',
        gemini: '',
        replicate: ''
      },
      setApiKeys: (keys) => set({ apiKeys: keys }),

      // Processing State
      isProcessing: false,
      setIsProcessing: (processing) => set({ isProcessing: processing }),

      // Results
      results: [],
      setResults: (results) => set({ results }),
      addResult: (result) => set((state) => ({
        results: [...state.results, result]
      })),
      clearResults: () => set({ results: [] }),

      // Uploaded Image State (to persist across navigation)
      uploadedImage: null,
      setUploadedImage: (image) => set({ uploadedImage: image }),
      clearUploadedImage: () => set({ uploadedImage: null }),

      // Error Handling
      error: null,
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // History
      history: [],
      MAX_HISTORY_ITEMS: 50, // จำนวนประวัติสูงสุดที่จะเก็บรูปเต็ม
      addToHistory: (item) => set((state) => {
        const newItem = {
          ...item,
          id: Date.now() + Math.random(), // Simple unique ID
          timestamp: new Date().toISOString()
        }

        // Add new item at beginning
        let updatedHistory = [newItem, ...state.history]

        // Keep only MAX_HISTORY_ITEMS with full images
        if (updatedHistory.length > state.MAX_HISTORY_ITEMS) {
          // Keep newest items
          updatedHistory = updatedHistory.slice(0, state.MAX_HISTORY_ITEMS)
          console.log(`History limit reached. Keeping only ${state.MAX_HISTORY_ITEMS} most recent items.`)
        }

        return {
          history: updatedHistory
        }
      }),
      removeFromHistory: (id) => set((state) => ({
        history: state.history.filter(item => item.id !== id)
      })),
      clearHistory: () => set({ history: [] }),

      // User System
      userId: null,
      setUserId: (userId) => set({ userId }),

      // Credits System
      userCredits: 0, // Default credits - start at 0
      setUserCredits: (credits) => set({ userCredits: credits }),
      useCredits: (amount = 1) => set((state) => {
        const newCredits = Math.max(0, state.userCredits - amount)
        // Save to localStorage with user-specific key if userId exists
        if (state.userId) {
          localStorage.setItem(`nano_credits_${state.userId}`, newCredits.toString())
        } else {
          localStorage.setItem('nano_credits', newCredits.toString())
        }
        return { userCredits: newCredits }
      }),
      addCredits: (amount) => set((state) => {
        const newCredits = state.userCredits + amount
        // Save to localStorage with user-specific key if userId exists
        if (state.userId) {
          localStorage.setItem(`nano_credits_${state.userId}`, newCredits.toString())
        } else {
          localStorage.setItem('nano_credits', newCredits.toString())
        }
        return { userCredits: newCredits }
      }),
      loadUserCredits: (userId) => {
        // Load credits for specific user
        if (userId) {
          const userSpecificCredits = localStorage.getItem(`nano_credits_${userId}`)
          if (userSpecificCredits !== null) {
            set({ userCredits: parseInt(userSpecificCredits), userId })
            return parseInt(userSpecificCredits)
          }
        }
        // Fallback to general credits
        const generalCredits = localStorage.getItem('nano_credits')
        const credits = generalCredits ? parseInt(generalCredits) : 0 // Default to 0, not 100
        set({ userCredits: credits, userId })
        return credits
      },

      // Settings
      settings: {
        autoDownload: false,
        quality: 'high',
        notifications: true
      },
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      // Stats
      stats: {
        totalGenerated: 0,
        totalDownloaded: 0,
        favoriteStyle: null
      },
      updateStats: (newStats) => set((state) => ({
        stats: { ...state.stats, ...newStats }
      })),
      incrementGenerated: () => set((state) => ({
        stats: {
          ...state.stats,
          totalGenerated: state.stats.totalGenerated + 1
        }
      })),
      incrementDownloaded: () => set((state) => ({
        stats: {
          ...state.stats,
          totalDownloaded: state.stats.totalDownloaded + 1
        }
      })),

      // Reset Store
      reset: () => set({
        isProcessing: false,
        results: [],
        error: null,
        history: [],
        userCredits: 0, // Reset to 0, not 100
        uploadedImage: null
      })
    }),
    {
      name: 'nano-banana-storage', // localStorage key
      partialize: (state) => ({
        userPlan: state.userPlan,
        apiKeys: state.apiKeys,
        history: optimizeHistoryForStorage(state.history), // Only strip data when persisting
        settings: state.settings,
        stats: state.stats,
        userCredits: state.userCredits,
        uploadedImage: state.uploadedImage
      }),
      // Use safe storage implementation
      getStorage: () => createSafeStorage(),
      // Handle migration from old storage format
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (error) {
            console.error('Error hydrating store:', error)
          }
        }
      }
    }
  )
)

export default useStore