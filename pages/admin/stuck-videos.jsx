import { useState, useEffect } from 'react'
import { Copy, Check, RefreshCw, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react'

export default function StuckVideosAdmin() {
  const [adminKey, setAdminKey] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [videos, setVideos] = useState({ completed: [], pending: [], failed: [] })
  const [stats, setStats] = useState({ completed: 0, pending: 0, failed: 0 })
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [activeTab, setActiveTab] = useState('completed')

  const loadVideos = async (key) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/stuck-videos?adminKey=${key}`)
      if (response.ok) {
        const data = await response.json()
        setVideos(data.videos)
        setStats(data.stats)
        setIsAuthenticated(true)
        // Save admin key to localStorage
        localStorage.setItem('admin_key', key)
      } else {
        alert('Invalid admin key')
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Error loading videos:', error)
      alert('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Try to load from localStorage
    const savedKey = localStorage.getItem('admin_key')
    if (savedKey) {
      setAdminKey(savedKey)
      loadVideos(savedKey)
    }
  }, [])

  const handleLogin = (e) => {
    e.preventDefault()
    loadVideos(adminKey)
  }

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      alert('Failed to copy: ' + err.message)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTimeAgo = (dateString) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'เมื่อสักครู่'
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
    return `${diffDays} วันที่แล้ว`
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            🔐 Admin Login
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Key
              </label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter admin key"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                📹 Stuck Videos Admin Panel
              </h1>
              <p className="text-gray-500 mt-1">
                จัดการวิดีโอที่สร้างเสร็จแล้วและส่งลิงค์ให้ผู้ใช้
              </p>
            </div>
            <button
              onClick={() => loadVideos(adminKey)}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm text-red-600 font-medium">Failed</p>
                  <p className="text-2xl font-bold text-red-700">{stats.failed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'completed'
                  ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              ✅ Completed ({stats.completed})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'pending'
                  ? 'bg-yellow-50 text-yellow-700 border-b-2 border-yellow-500'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              ⏳ Pending ({stats.pending})
            </button>
            <button
              onClick={() => setActiveTab('failed')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'failed'
                  ? 'bg-red-50 text-red-700 border-b-2 border-red-500'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              ❌ Failed ({stats.failed})
            </button>
          </div>

          {/* Video List */}
          <div className="p-6 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading videos...</p>
              </div>
            ) : videos[activeTab].length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No {activeTab} videos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {videos[activeTab].map((video) => (
                  <div
                    key={video.id}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {video.userId}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(video.updatedAt)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 font-medium truncate mb-1">
                          {video.prompt || 'No prompt'}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>📅 {formatDate(video.updatedAt)}</span>
                          <span>•</span>
                          <span>🎬 {video.model}</span>
                          <span>•</span>
                          <span>⏱️ {video.duration}s</span>
                          <span>•</span>
                          <span>📐 {video.aspectRatio}</span>
                        </div>

                        {activeTab === 'completed' && video.videoUrl && (
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="text"
                              value={video.videoUrl}
                              readOnly
                              className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg font-mono"
                            />
                            <button
                              onClick={() => copyToClipboard(video.videoUrl, video.id)}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                            >
                              {copiedId === video.id ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4" />
                                  Copy Link
                                </>
                              )}
                            </button>
                            <a
                              href={video.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg flex items-center gap-2 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open
                            </a>
                          </div>
                        )}

                        {activeTab === 'failed' && video.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            Error: {video.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
