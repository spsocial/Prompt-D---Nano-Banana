// IndexedDB utility for storing images and history
const DB_NAME = 'NanoBananaDB'
const DB_VERSION = 1
const STORE_NAME = 'history'

let db = null

// Initialize IndexedDB
export async function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db)
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('IndexedDB error:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      console.log('IndexedDB initialized')
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      db = event.target.result

      // Create history store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        console.log('Created history store')
      }
    }
  })
}

// Save history item to IndexedDB
export async function saveToHistory(item) {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    // Add unique ID and timestamp if not present
    const historyItem = {
      ...item,
      id: item.id || `${Date.now()}_${Math.random()}`,
      timestamp: item.timestamp || new Date().toISOString()
    }

    const request = store.put(historyItem)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('Saved to IndexedDB:', historyItem.id)
        resolve(historyItem)
      }
      request.onerror = () => {
        console.error('Error saving to IndexedDB:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('Save to history error:', error)
    throw error
  }
}

// Get all history from IndexedDB
export async function getAllHistory() {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const history = request.result || []
        // Sort by timestamp (newest first)
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        console.log(`Loaded ${history.length} items from IndexedDB`)
        resolve(history)
      }
      request.onerror = () => {
        console.error('Error loading history:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('Get history error:', error)
    return []
  }
}

// Delete item from IndexedDB
export async function deleteFromHistory(id) {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('Deleted from IndexedDB:', id)
        resolve()
      }
      request.onerror = () => {
        console.error('Error deleting from IndexedDB:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('Delete error:', error)
    throw error
  }
}

// Clear all history
export async function clearAllHistory() {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('Cleared all history from IndexedDB')
        resolve()
      }
      request.onerror = () => {
        console.error('Error clearing IndexedDB:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('Clear history error:', error)
    throw error
  }
}

// Get history count
export async function getHistoryCount() {
  try {
    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.count()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || 0)
      }
      request.onerror = () => {
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('Count error:', error)
    return 0
  }
}

// Clean old history (keep only recent N items)
export async function cleanOldHistory(keepCount = 30) {
  try {
    const history = await getAllHistory()

    if (history.length <= keepCount) {
      return // No need to clean
    }

    const database = await initDB()
    const transaction = database.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    // Delete oldest items
    const itemsToDelete = history.slice(keepCount)

    for (const item of itemsToDelete) {
      store.delete(item.id)
    }

    console.log(`Cleaned ${itemsToDelete.length} old items from history`)
  } catch (error) {
    console.error('Clean history error:', error)
  }
}