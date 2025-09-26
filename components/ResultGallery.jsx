import { useState } from 'react'
import useStore from '../lib/store'
import { Download, Maximize2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function ResultGallery() {
  const { results } = useStore()
  const [selectedImage, setSelectedImage] = useState(null)

  const handleDownload = async (imageUrl, style) => {
    try {
      // Check if it's mobile device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      // If it's a base64 image, convert to blob
      if (imageUrl.startsWith('data:')) {
        const response = await fetch(imageUrl)
        const blob = await response.blob()

        // For mobile devices, try using share API first
        if (isMobile && navigator.share && navigator.canShare) {
          const file = new File([blob], `nano-banana-${style.toLowerCase().replace(/\s+/g, '-')}.png`, {
            type: 'image/png'
          })

          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Nano Banana Image',
                text: `Image: ${style}`
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
        link.download = `nano-banana-${style.toLowerCase().replace(/\s+/g, '-')}.png`
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
        link.download = `nano-banana-${style.toLowerCase().replace(/\s+/g, '-')}.png`
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
      window.open(imageUrl, '_blank')
      alert('กดค้างที่รูปภาพและเลือก "บันทึกรูปภาพ" เพื่อดาวน์โหลด')
    }
  }


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  }

  return (
    <>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {results.map((result, index) => (
          <motion.div
            key={index}
            variants={itemVariants}
            className="group relative bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-xl rounded-2xl border border-white/30 shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          >
            {/* Image Container */}
            <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-gray-100/50 to-white/50 rounded-xl">
              <img
                src={result.imageUrl}
                alt={result.style}
                className="w-full h-full object-contain bg-white/80 backdrop-blur-sm"
                loading="lazy"
              />

              {/* Mobile Download Button - Always visible on mobile */}
              <div className="md:hidden absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => setSelectedImage(result)}
                  className="p-2.5 bg-black/60 backdrop-blur-sm rounded-lg text-white shadow-lg"
                  title="View fullscreen"
                >
                  <Maximize2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDownload(result.imageUrl, result.style)}
                  className="p-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 backdrop-blur-sm rounded-lg text-white shadow-lg"
                  title="Download"
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>

              {/* Hover Overlay - Desktop only */}
              <div className="hidden md:flex absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                  <div className="text-white">
                    <p className="font-bold mb-1">{result.style}</p>
                    {result.description && (
                      <p className="text-sm opacity-80 line-clamp-2">
                        {result.description.substring(0, 80)}...
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedImage(result)}
                      className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                      title="View fullscreen"
                    >
                      <Maximize2 className="h-4 w-4 text-white" />
                    </button>
                    <button
                      onClick={() => handleDownload(result.imageUrl, result.style)}
                      className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Error State */}
              {result.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-100/50 to-pink-100/50 backdrop-blur-sm">
                  <div className="text-center p-5">
                    <div className="text-4xl mb-3">⚠️</div>
                    <p className="text-red-700 font-bold mb-2">
                      {result.error.includes('429') || result.error.includes('quota')
                        ? 'API Key หมด Quota'
                        : result.error.includes('404')
                        ? 'โมเดลไม่พร้อมใช้งาน'
                        : 'ไม่สามารถสร้างภาพได้'}
                    </p>
                    <p className="text-sm text-red-600">
                      {result.error.includes('429') || result.error.includes('quota')
                        ? 'รอ 30 วินาที หรือใช้ API Key อื่น'
                        : result.error.includes('404')
                        ? 'ตรวจสอบชื่อโมเดล'
                        : 'ตรวจสอบ API Key'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Info Bar */}
            <div className="p-3 bg-white/20 backdrop-blur-sm border-t border-white/20">
              <div className="flex items-center justify-center">
                <span className="font-semibold text-gray-800">{result.style}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-lg z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-7xl max-h-[90vh] w-full flex flex-col bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-b from-black/90 to-transparent p-4 rounded-t-2xl">
                <div className="flex justify-between items-start">
                  <div className="text-white max-w-[80%]">
                    <h3 className="text-xl md:text-2xl font-bold truncate">{selectedImage.style}</h3>
                    {selectedImage.description && (
                      <p className="text-sm opacity-80 mt-1 line-clamp-2">
                        {selectedImage.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="bg-red-500/90 hover:bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors shadow-lg z-20 flex-shrink-0"
                    title="ปิด"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Image Container - Responsive to aspect ratio */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-0 overflow-auto">
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.style}
                  className="w-auto h-auto max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                  style={{
                    maxHeight: 'calc(100% - 2rem)',
                    maxWidth: 'calc(100% - 2rem)'
                  }}
                />
              </div>

              {/* Modal Footer */}
              <div className="bg-gradient-to-t from-black/90 to-transparent p-4 rounded-b-2xl">
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(selectedImage.imageUrl, selectedImage.style)
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg flex items-center justify-center space-x-2 transition-all font-bold shadow-lg text-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>ดาวน์โหลดภาพ</span>
                  </button>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="px-5 py-2.5 bg-gray-700/80 hover:bg-gray-800/90 text-white rounded-lg font-medium transition-all shadow-lg text-sm"
                  >
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