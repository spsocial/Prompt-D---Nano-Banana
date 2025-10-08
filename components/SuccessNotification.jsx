import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, Download, Sparkles } from 'lucide-react'

export default function SuccessNotification({
  show,
  onClose,
  title = 'สำเร็จ!',
  message,
  type = 'image', // 'image' or 'video'
  autoHideDuration = 8000
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] max-w-md w-full mx-4"
        >
          <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 text-white rounded-2xl shadow-2xl p-6 border-4 border-white/40 backdrop-blur-lg">
            {/* Animated Background */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.1, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"
              />
            </div>

            {/* Content */}
            <div className="relative flex items-start space-x-4">
              {/* Icon with Animation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex-shrink-0"
              >
                <div className="w-14 h-14 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg">
                  <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
              </motion.div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <motion.h3
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-bold mb-2 flex items-center"
                >
                  {type === 'image' ? '🎨' : '🎬'} {title}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-white/95 mb-3 leading-relaxed"
                >
                  {message}
                </motion.p>

                {/* Important Notice */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/25 backdrop-blur-sm rounded-xl p-3 mt-3 border-2 border-white/40"
                >
                  <div className="flex items-start space-x-2">
                    <Download className="w-5 h-5 flex-shrink-0 mt-0.5 animate-bounce" />
                    <p className="text-sm font-medium">
                      {type === 'video' ? (
                        <>
                          <strong>สำคัญ:</strong> กรุณาดาวน์โหลดวิดีโอทันที!
                          ระบบไม่มีการบันทึกย้อนหลัง
                        </>
                      ) : (
                        <>
                          <strong>เสร็จแล้ว!</strong> ภาพของคุณพร้อมใช้งาน
                          สามารถดาวน์โหลดได้ทันที
                        </>
                      )}
                    </p>
                  </div>
                </motion.div>

                {/* Sparkles Effect */}
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="w-6 h-6 text-yellow-300" />
                </motion.div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="flex-shrink-0 text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            {autoHideDuration > 0 && (
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: autoHideDuration / 1000, ease: "linear" }}
                className="absolute bottom-0 left-0 right-0 h-1 bg-white/50 rounded-b-2xl origin-left"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
