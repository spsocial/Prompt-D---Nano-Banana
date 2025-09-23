import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Function to strip base64 data from history items to reduce storage size
// This should only be used when actually storing to localStorage, not on every operation
const stripBase64DataForStorage = (item) => {
  const stripped = { ...item }
  // Remove base64 image data to save space but keep more metadata
  if (stripped.imageUrl && stripped.imageUrl.startsWith('data:')) {
    stripped.imageUrl = 'base64_image_stripped'
  }
  if (stripped.originalImage && stripped.originalImage.startsWith('data:')) {
    stripped.originalImage = 'base64_image_stripped'
  }
  return stripped
}

// Function to limit history size and optimize storage for persistence
// This is only called when persisting to localStorage, not on every operation
const optimizeHistoryForStorage = (history) => {
  // Keep last 100 items to preserve history much longer
  // Sort by timestamp to ensure we keep the most recent items
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  // Only strip base64 data when persisting to storage to save space
  return sortedHistory.slice(0, 100).map(stripBase64DataForStorage)
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
                state.state.history = sortedHistory.slice(0, 20).map(stripBase64DataForStorage);
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
      addToHistory: (item) => set((state) => {
        const newItem = {
          ...item,
          id: Date.now() + Math.random(), // Simple unique ID
          timestamp: new Date().toISOString()
        }
        // Keep last 100 items in memory (don't strip base64 data in memory)
        const updatedHistory = [newItem, ...state.history].slice(0, 100)
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
      userCredits: 100, // Default credits
      setUserCredits: (credits) => set({ userCredits: credits }),
      useCredits: (amount = 1) => set((state) => ({
        userCredits: Math.max(0, state.userCredits - amount)
      })),
      addCredits: (amount) => set((state) => ({
        userCredits: state.userCredits + amount
      })),

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
        userCredits: 100,
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