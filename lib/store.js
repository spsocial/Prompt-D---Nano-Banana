import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveToHistory, getAllHistory, deleteFromHistory, clearAllHistory, cleanOldHistory } from './indexedDB'

// History is now stored in IndexedDB, not localStorage
// No need for compression or optimization functions

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
              // Clean up localStorage - remove old history data if it exists
              const state = JSON.parse(localStorage.getItem('nano-banana-storage') || '{}')

              // Remove history from localStorage if it exists (migrated to IndexedDB)
              if (state.state && state.state.history) {
                delete state.state.history
              }

              // Clear other non-essential data
              if (state.state) {
                delete state.state.uploadedImage
                delete state.state.results
              }

              // Try to save cleaned state
              localStorage.setItem('nano-banana-storage', JSON.stringify(state))

              // Retry original save
              localStorage.setItem(name, value)
              console.log('Cleaned localStorage (history now in IndexedDB)')
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

      // History (using IndexedDB)
      history: [],
      MAX_HISTORY_ITEMS: 30, // เพิ่มได้เป็น 30 เพราะใช้ IndexedDB
      loadHistory: async () => {
        try {
          const historyFromDB = await getAllHistory()
          set({ history: historyFromDB })
        } catch (error) {
          console.error('Error loading history:', error)
        }
      },
      addToHistory: async (item) => {
        try {
          // Prepare item (keep full quality image)
          const historyItem = {
            ...item,
            id: item.id || `${Date.now()}_${Math.random()}`,
            timestamp: item.timestamp || new Date().toISOString()
          }

          // Remove only truly unnecessary data
          delete historyItem.originalImage
          delete historyItem.analysis
          delete historyItem.premiumPrompt

          // Save to IndexedDB (no compression)
          await saveToHistory(historyItem)

          // Clean old history if needed
          await cleanOldHistory(30)

          // Update state
          const updatedHistory = await getAllHistory()
          set({ history: updatedHistory })

          console.log('Added to history with full quality')
        } catch (error) {
          console.error('Error adding to history:', error)
        }
      },
      removeFromHistory: async (id) => {
        try {
          await deleteFromHistory(id)
          const updatedHistory = await getAllHistory()
          set({ history: updatedHistory })
        } catch (error) {
          console.error('Error removing from history:', error)
        }
      },
      clearHistory: async () => {
        try {
          await clearAllHistory()
          set({ history: [] })
        } catch (error) {
          console.error('Error clearing history:', error)
        }
      },

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
        if (userId) {
          // Check for user-specific credits first
          const creditKey = `nano_credits_${userId}`
          const userSpecificCredits = localStorage.getItem(creditKey)

          if (userSpecificCredits !== null && userSpecificCredits !== '') {
            // User has specific credits stored
            const credits = parseInt(userSpecificCredits) || 0
            set({ userCredits: credits, userId })
            return credits
          } else {
            // New user - start with 0 credits
            localStorage.setItem(creditKey, '0')
            set({ userCredits: 0, userId })
            return 0
          }
        }

        // No userId - default 0 credits
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
        // Remove history from localStorage - it's now in IndexedDB
        // history: optimizeHistoryForStorage(state.history),
        settings: state.settings,
        stats: state.stats,
        userCredits: state.userCredits,
        // Don't persist uploadedImage to avoid quota issues
        // uploadedImage: state.uploadedImage
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
            // Load history from IndexedDB after rehydration
            if (state.loadHistory) {
              state.loadHistory()
            }
            // Clean up temporary data on load
            try {
              // Clear temporary data that shouldn't persist
              state.results = []
              state.error = null

              // Log minimal storage usage (no history or images)
              const storageSize = JSON.stringify(state).length
              console.log(`localStorage size: ${(storageSize / 1024).toFixed(2)}KB (minimal, history in IndexedDB)`)
            } catch (e) {
              console.error('Error during cleanup:', e)
            }
          }
        }
      }
    }
  )
)

export default useStore