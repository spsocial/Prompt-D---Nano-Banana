import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Function to optimize image data for storage
// Keep images but compress if needed
const optimizeImageForStorage = (item) => {
  const optimized = { ...item }
  // Remove original image to save space
  if (optimized.originalImage && optimized.originalImage.startsWith('data:')) {
    delete optimized.originalImage
  }
  // Compress generated image if it's base64
  if (optimized.imageUrl && optimized.imageUrl.startsWith('data:')) {
    // Estimate size - if over 100KB, consider compressing
    const sizeEstimate = optimized.imageUrl.length * 0.75 / 1024 // KB
    if (sizeEstimate > 200) { // If over 200KB
      // For older items, we might want to remove image data
      // But keep for recent items
      console.log(`Image size: ${sizeEstimate.toFixed(2)}KB`)
    }
  }
  // Remove any large unnecessary data
  delete optimized.analysis
  delete optimized.premiumPrompt

  return optimized
}

// Function to limit history size and optimize storage for persistence
// This is only called when persisting to localStorage, not on every operation
const optimizeHistoryForStorage = (history) => {
  // Reduce limit to save space
  const HISTORY_LIMIT = 20 // ลดจำนวนประวัติที่เก็บภาพเต็ม
  const TOTAL_LIMIT = 30 // จำนวนประวัติทั้งหมด

  // Sort by timestamp to ensure we keep the most recent items
  const sortedHistory = [...history].sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Keep recent items with full data (but still optimize)
  const recentItems = sortedHistory.slice(0, HISTORY_LIMIT).map(item => {
    // Even for recent items, optimize storage
    const optimized = { ...item }
    // Remove unnecessary data
    delete optimized.originalImage
    delete optimized.analysis
    delete optimized.premiumPrompt
    return optimized
  })

  // For older items, remove image data completely
  const olderItems = sortedHistory.slice(HISTORY_LIMIT, TOTAL_LIMIT).map(item => {
    const optimized = { ...item }
    // Remove all image data for older items
    if (optimized.imageUrl && optimized.imageUrl.startsWith('data:')) {
      optimized.imageUrl = 'removed_for_space'
    }
    delete optimized.originalImage
    delete optimized.analysis
    delete optimized.premiumPrompt
    delete optimized.description
    return optimized
  })

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
            console.warn('localStorage quota exceeded - attempting cleanup')

            try {
              // More aggressive cleanup
              const state = JSON.parse(localStorage.getItem('nano-banana-storage') || '{}')

              if (state.state && state.state.history) {
                // Keep only 10 most recent items with reduced data
                const sortedHistory = [...state.state.history].sort((a, b) =>
                  new Date(b.timestamp) - new Date(a.timestamp)
                );

                // Aggressively optimize history
                state.state.history = sortedHistory.slice(0, 10).map(item => {
                  const minimal = {
                    id: item.id,
                    style: item.style,
                    timestamp: item.timestamp,
                    prompt: item.prompt ? item.prompt.substring(0, 100) : '',
                    // Keep imageUrl but might truncate if too large
                    imageUrl: item.imageUrl
                  }

                  // If imageUrl is base64 and too large, remove it
                  if (minimal.imageUrl && minimal.imageUrl.startsWith('data:')) {
                    if (minimal.imageUrl.length > 100000) { // Over 100KB
                      minimal.imageUrl = 'removed_for_space'
                    }
                  }

                  return minimal
                });

                // Clear other non-essential data
                delete state.state.uploadedImage
                delete state.state.results

                // Try to save cleaned state
                localStorage.setItem('nano-banana-storage', JSON.stringify(state))

                // Retry original save
                localStorage.setItem(name, value)
                console.log('Successfully cleaned storage and saved data')

                // Notify user
                if (typeof window !== 'undefined') {
                  const message = 'ระบบได้ทำความสะอาดพื้นที่จัดเก็บแล้ว เก็บประวัติล่าสุด 10 รายการ'
                  console.info(message)
                  // Don't show alert - too disruptive
                }
              } else {
                // Can't clean history, try clearing all localStorage for this app
                console.error('Cannot reduce storage enough, clearing all app data')
                localStorage.removeItem('nano-banana-storage')
                localStorage.removeItem('nano_credits')
                // Retry save
                localStorage.setItem(name, value)
              }
            } catch (retryError) {
              console.error('Critical storage error:', retryError)
              // Last resort - clear everything
              try {
                localStorage.clear()
                localStorage.setItem(name, value)
                console.log('Cleared all localStorage and retried')
              } catch (finalError) {
                console.error('Cannot save to localStorage even after clearing:', finalError)
              }
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
      MAX_HISTORY_ITEMS: 20, // ลดจำนวนประวัติสูงสุดเพื่อประหยัดพื้นที่
      addToHistory: (item) => set((state) => {
        // Optimize item before adding
        const optimizedItem = {
          ...item,
          id: Date.now() + Math.random(), // Simple unique ID
          timestamp: new Date().toISOString()
        }

        // Remove unnecessary data immediately
        delete optimizedItem.originalImage
        delete optimizedItem.analysis
        delete optimizedItem.premiumPrompt

        // Check if adding this would exceed quota
        try {
          // Test if we can save
          const testData = JSON.stringify(optimizedItem)
          if (testData.length > 500000) { // If single item is over 500KB
            console.warn('Item too large, compressing...')
            // Further compress if needed
            if (optimizedItem.imageUrl && optimizedItem.imageUrl.startsWith('data:')) {
              // Keep only essential data for very large items
              optimizedItem.imageUrl = optimizedItem.imageUrl.substring(0, 50000) + '...truncated'
            }
          }
        } catch (e) {
          console.error('Error checking item size:', e)
        }

        // Add new item at beginning
        let updatedHistory = [optimizedItem, ...state.history]

        // More aggressive limiting
        if (updatedHistory.length > state.MAX_HISTORY_ITEMS) {
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
        // Always save to both user-specific and general for consistency
        if (state.userId) {
          localStorage.setItem(`nano_credits_${state.userId}`, newCredits.toString())
          // Also clear general credits to prevent conflicts
          localStorage.removeItem('nano_credits')
        } else {
          // Get or create user ID
          let userId = localStorage.getItem('nano_user_id')
          if (!userId) {
            userId = 'NB-' + Math.random().toString(36).substr(2, 6).toUpperCase()
            localStorage.setItem('nano_user_id', userId)
          }
          localStorage.setItem(`nano_credits_${userId}`, newCredits.toString())
          localStorage.removeItem('nano_credits')
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
        // Migration: Clean up old conflicting credits
        const generalCredits = localStorage.getItem('nano_credits')

        if (userId) {
          const userSpecificCredits = localStorage.getItem(`nano_credits_${userId}`)

          // If there are conflicting credits, prioritize user-specific or 0
          if (userSpecificCredits !== null) {
            const credits = parseInt(userSpecificCredits)
            // Clean up general credits to prevent conflicts
            if (generalCredits !== null) {
              localStorage.removeItem('nano_credits')
            }
            set({ userCredits: credits, userId })
            return credits
          } else if (generalCredits !== null && parseInt(generalCredits) === 100) {
            // Old bug: 100 free credits - reset to 0
            localStorage.removeItem('nano_credits')
            localStorage.setItem(`nano_credits_${userId}`, '0')
            set({ userCredits: 0, userId })
            return 0
          } else if (generalCredits !== null) {
            // Migrate general credits to user-specific
            const credits = parseInt(generalCredits)
            localStorage.setItem(`nano_credits_${userId}`, credits.toString())
            localStorage.removeItem('nano_credits')
            set({ userCredits: credits, userId })
            return credits
          }
        }

        // Default: no credits
        set({ userCredits: 0, userId })
        return 0
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
            // Clear corrupted data
            try {
              localStorage.removeItem('nano-banana-storage')
              console.log('Cleared corrupted storage')
            } catch (e) {
              console.error('Failed to clear corrupted storage:', e)
            }
          } else if (state) {
            // Clean up on load
            try {
              // Check storage size
              const storageSize = JSON.stringify(state).length
              console.log(`Storage size on load: ${(storageSize / 1024).toFixed(2)}KB`)

              // If storage is too large, clean it up
              if (storageSize > 1000000) { // Over 1MB
                console.log('Storage too large, cleaning up...')
                if (state.history && state.history.length > 10) {
                  state.history = state.history.slice(0, 10)
                }
                // Clear temporary data
                state.results = []
                state.uploadedImage = null
              }
            } catch (e) {
              console.error('Error checking storage size:', e)
            }
          }
        }
      }
    }
  )
)

export default useStore