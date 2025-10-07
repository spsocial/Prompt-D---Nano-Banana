import { useState, useEffect } from 'react'
import useStore from '../lib/store'
import { X, Download, Calendar, Image as ImageIcon, Maximize2, Film } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function History() {
  const { history, removeFromHistory, loadHistory, setUploadedImage } = useStore()
  const [selectedImage, setSelectedImage] = useState(null)

  // Load history from IndexedDB on mount
  useEffect(() => {
    if (loadHistory) {
      loadHistory()
    }
  }, [])

  const handleDownload = async (imageUrl, id) => {
    try {
      // Handle case where image data was stripped to save space
      if (imageUrl === 'base64_image_stripped' || !imageUrl) {
        alert('ไม่สามารถดาวน์โหลดภาพนี้ได้ (ข้อมูลภาพถูกลบเพื่อประหยัดพื้นที่)')
        return
      }

      // Check if it's mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      // If it's a base64 image, convert to blob
      if (imageUrl.startsWith('data:')) {
        const response = await fetch(imageUrl)
        const blob = await response.blob()

        // For mobile devices, try using share API first
        if (isMobile && navigator.share && navigator.canShare) {
          const file = new File([blob], `nano-banana-history-${id}.png`, {
            type: 'image/png'
          })

          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Nano Banana History',
                text: `History Image ${id}`
              })
              return
            } catch (shareError) {
              console.log('Share cancelled or failed:', shareError)
            }
          }
        }

        // Fallback to blob URL download
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `nano-banana-history-${id}.png`
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()

        // Clean up
        setTimeout(() => {
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        }, 100)

        // For mobile, also open in new tab as fallback
        if (isMobile) {
          setTimeout(() => {
            window.open(url, '_blank')
          }, 200)
        }
      } else {
        // For regular URLs
        const link = document.createElement('a')
        link.href = imageUrl
        link.download = `nano-banana-history-${id}.png`
        link.target = '_blank'
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()

        setTimeout(() => {
          document.body.removeChild(link)
        }, 100)

        // For mobile, also open in new tab
        if (isMobile) {
          window.open(imageUrl, '_blank')
        }
      }
    } catch (error) {
      console.error('Download error:', error)

      // If all else fails, open image in new tab
      if (imageUrl && !imageUrl.includes('base64_image_stripped')) {
        window.open(imageUrl, '_blank')
        alert('กดค้างที่รูปภาพและเลือก "บันทึกรูปภาพ" เพื่อดาวน์โหลด')
      } else {
        alert('ไม่สามารถดาวน์โหลดได้')
      }
    }
  }

  // Handle creating video from image
  const handleCreateVideo = (item) => {
    if (!item.imageUrl || item.imageUrl === 'base64_image_stripped') {
      alert('ไม่สามารถสร้างวิดีโอจากภาพนี้ได้ (ภาพถูกลบแล้ว)')
      return
    }

    // Save image to store for video generation
    setUploadedImage(item.imageUrl)

    // Scroll to top where UnifiedGenerator is
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // Store mode preference in localStorage for UnifiedGenerator to read
    localStorage.setItem('nano_pending_video_gen', 'true')

    // Close modal if open
    setSelectedImage(null)

    // Navigate to home page if not already there
    if (window.location.pathname !== '/') {
      window.location.href = '/'
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

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">ยังไม่มีประวัติ</h3>
        <p className="text-gray-500">รูปภาพที่คุณสร้างจะแสดงที่นี่</p>
        <p className="text-sm text-gray-400 mt-2">ระบบจะเก็บประวัติล่าสุด 30 รายการ</p>
        <p className="text-xs text-gray-400 mt-1">ใช้ IndexedDB เก็บภาพคุณภาพเต็ม</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {history.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-xl rounded-2xl border border-white/30 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl"
            >
              {/* Image Container */}
              <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-gray-100/50 to-white/50 rounded-xl">
                {/* Handle missing image data */}
                {item.imageUrl === 'base64_image_stripped' || !item.imageUrl ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200/50">
                    <div className="text-center p-4">
                      <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">ภาพถูกลบเพื่อประหยัดพื้นที่</p>
                      <p className="text-gray-400 text-xs mt-1">ระบบเก็บ Prompt และข้อมูลอื่นๆ ไว้</p>
                      <button
                        onClick={() => handleDownload(item.imageUrl, item.id)}
                        disabled
                        className="mt-2 px-3 py-1 text-xs bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                      >
                        ดาวน์โหลดไม่ได้
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <img
                      src={item.imageUrl}
                      alt={item.style || 'Generated image'}
                      className="w-full h-full object-contain bg-white/80 backdrop-blur-sm cursor-pointer"
                      onClick={() => setSelectedImage(item)}
                      onError={(e) => {
                        // Handle broken image links
                        e.target.onerror = null;
                        e.target.parentElement.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center bg-gray-200/50">
                            <div class="text-center p-4">
                              <ImageIcon class="h-12 w-12 text-gray-400 mx-auto mb-2" />
                              <p class="text-gray-500 text-sm">ไม่สามารถโหลดภาพได้</p>
                            </div>
                          </div>
                        `;
                      }}
                      loading="lazy"
                    />

                    {/* Mobile Buttons - Always visible on mobile */}
                    {item.imageUrl && item.imageUrl !== 'base64_image_stripped' && (
                      <div className="md:hidden absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={() => handleCreateVideo(item)}
                          className="p-2.5 bg-red-500/90 backdrop-blur-sm rounded-lg text-white shadow-lg"
                          title="สร้างวิดีโอ"
                        >
                          <Film className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setSelectedImage(item)}
                          className="p-2.5 bg-black/60 backdrop-blur-sm rounded-lg text-white shadow-lg"
                          title="View fullscreen"
                        >
                          <Maximize2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDownload(item.imageUrl, item.id)}
                          className="p-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 backdrop-blur-sm rounded-lg text-white shadow-lg"
                          title="Download"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Hover Overlay - Desktop only */}
                <div className="hidden md:flex absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-between items-end">
                    <div className="text-white">
                      <p className="text-xs font-medium mb-1 line-clamp-1">
                        {item.style || 'ไม่มีชื่อ'}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleCreateVideo(item)}
                        className="p-1.5 bg-red-500/80 backdrop-blur-sm rounded hover:bg-red-600/90 transition-colors"
                        title="สร้างวิดีโอ"
                      >
                        <Film className="h-4 w-4 text-white" />
                      </button>
                      <button
                        onClick={() => setSelectedImage(item)}
                        className="p-1.5 bg-white/20 backdrop-blur-sm rounded hover:bg-white/30 transition-colors"
                        title="ดูภาพเต็ม"
                      >
                        <ImageIcon className="h-4 w-4 text-white" />
                      </button>
                      <button
                        onClick={() => handleDownload(item.imageUrl, item.id)}
                        className="p-1.5 bg-white/20 backdrop-blur-sm rounded hover:bg-white/30 transition-colors"
                        title="ดาวน์โหลด"
                      >
                        <Download className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Bar */}
              <div className="p-3 bg-white/20 backdrop-blur-sm border-t border-white/20">
                <div className="mb-2">
                  <span className="text-sm font-semibold text-gray-800 line-clamp-1">
                    {item.style || 'ไม่มีชื่อ'}
                  </span>
                </div>
                
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>{formatDate(item.timestamp)}</span>
                </div>
                
                <button
                  onClick={() => removeFromHistory(item.id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="ลบจากรายการ"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-7xl max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button - Large and Prominent */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-red-500 hover:bg-red-600 text-white rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center transition-all shadow-2xl z-30 flex-shrink-0 ring-4 ring-white/20"
                title="ปิด (กดที่ไหนก็ได้เพื่อปิด)"
              >
                <X className="h-6 w-6 sm:h-7 sm:w-7" />
              </button>

              {/* Modal Header */}
              <div className="bg-gradient-to-b from-black/90 to-transparent p-4 rounded-t-2xl flex-shrink-0">
                <div className="pr-12">
                  <div className="text-white">
                    <h3 className="text-xl md:text-2xl font-bold truncate">{selectedImage.style || 'ไม่มีชื่อ'}</h3>
                    <div className="flex items-center text-sm opacity-80 mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>{formatDate(selectedImage.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Container - Responsive to aspect ratio */}
              <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0 overflow-hidden">
                {/* Handle missing image data */}
                {selectedImage.imageUrl === 'base64_image_stripped' || !selectedImage.imageUrl ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-gray-800/50 rounded-xl">
                    <ImageIcon className="h-16 w-16 text-gray-500 mb-4" />
                    <h4 className="text-xl font-bold text-gray-300 mb-2">ภาพถูกลบเพื่อประหยัดพื้นที่</h4>
                    <p className="text-gray-400 max-w-md">
                      ภาพนี้ถูกลบเพื่อประหยัดพื้นที่จัดเก็บ
                    </p>
                    <p className="text-gray-500 text-sm mt-2">ระบบเก็บข้อมูลอื่นๆ ไว้เพื่อประหยัดพื้นที่</p>
                    <p className="text-gray-500 text-xs mt-1">แนะนำ: ดาวน์โหลดภาพเพื่อเก็บไว้ก่อนที่จะหายไป</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(selectedImage.imageUrl, selectedImage.id)
                      }}
                      disabled
                      className="mt-4 px-4 py-2 text-sm bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
                    >
                      ดาวน์โหลดไม่ได้
                    </button>
                  </div>
                ) : (
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.style || 'Generated image'}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                    onError={(e) => {
                      // Handle broken image links
                      e.target.onerror = null;
                      e.target.parentElement.innerHTML = `
                        <div class="flex flex-col items-center justify-center text-center p-8 bg-gray-800/50 rounded-xl">
                          <ImageIcon class="h-16 w-16 text-gray-500 mb-4" />
                          <h4 class="text-xl font-bold text-gray-300 mb-2">ไม่สามารถโหลดภาพได้</h4>
                          <p class="text-gray-400">ภาพนี้อาจไม่สามารถเข้าถึงได้อีกต่อไป</p>
                        </div>
                      `;
                    }}
                  />
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-gradient-to-t from-black/90 to-transparent p-4 rounded-b-2xl flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCreateVideo(selectedImage)
                    }}
                    disabled={selectedImage.imageUrl === 'base64_image_stripped' || !selectedImage.imageUrl}
                    className={`px-5 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-all font-bold shadow-lg text-sm ${
                      selectedImage.imageUrl === 'base64_image_stripped' || !selectedImage.imageUrl
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white'
                    }`}
                  >
                    <Film className="h-4 w-4" />
                    <span>สร้างวิดีโอจากภาพนี้</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(selectedImage.imageUrl, selectedImage.id)
                    }}
                    disabled={selectedImage.imageUrl === 'base64_image_stripped' || !selectedImage.imageUrl}
                    className={`px-5 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-all font-bold shadow-lg text-sm ${
                      selectedImage.imageUrl === 'base64_image_stripped' || !selectedImage.imageUrl
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                    }`}
                  >
                    <Download className="h-4 w-4" />
                    <span>ดาวน์โหลดภาพ</span>
                  </button>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="px-5 py-2.5 bg-gray-700/80 hover:bg-gray-800/90 text-white rounded-lg font-bold transition-all shadow-lg text-sm border-2 border-white/20"
                  >
                    <X className="h-4 w-4 inline mr-1" />
                    ปิด
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}