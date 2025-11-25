import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Sparkles, Crown, Check, Loader2 } from 'lucide-react'

const UNLOCK_PACKAGES = [
  {
    id: 'flash_only',
    name: 'Flash Only',
    credits: 1,
    icon: Zap,
    color: 'from-cyan-500 to-blue-500',
    borderColor: 'border-cyan-500/50',
    benefits: [
      'Model Flash +30 ครั้ง',
      'ใช้ได้ทันที'
    ],
    description: 'เหมาะสำหรับใช้งานทั่วไป'
  },
  {
    id: 'both_models',
    name: 'ทั้ง 2 โมเดล',
    credits: 2,
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    borderColor: 'border-purple-500/50',
    popular: true,
    benefits: [
      'Model Flash +30 ครั้ง',
      'Model Pro +5 ครั้ง',
      'ใช้ได้ทันที'
    ],
    description: 'คุ้มค่าที่สุด!'
  },
  {
    id: 'unlimited_24h',
    name: 'Unlimited 24 ชม.',
    credits: 5,
    icon: Crown,
    color: 'from-yellow-500 to-orange-500',
    borderColor: 'border-yellow-500/50',
    benefits: [
      'ไม่จำกัดทั้ง 2 โมเดล',
      'ใช้ได้ 24 ชั่วโมง',
      'นับเวลาจากตอนซื้อ'
    ],
    description: 'สำหรับ Power User'
  }
]

export default function ChatUnlockModal({ isOpen, onClose, userCredits, onUnlock }) {
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const handleUnlock = async () => {
    if (!selectedPackage) return

    const pkg = UNLOCK_PACKAGES.find(p => p.id === selectedPackage)
    if (!pkg) return

    if (userCredits < pkg.credits) {
      setError('เครดิตไม่เพียงพอ')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/chat-ai/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageType: selectedPackage })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'ไม่สามารถปลดล็อคได้')
      }

      // Success - call parent callback and close
      if (onUnlock) {
        onUnlock(data)
      }
      onClose()

    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">ปลดล็อคการใช้งาน</h2>
              <p className="text-sm text-gray-400 mt-1">
                เครดิตของคุณ: <span className="text-[#00F2EA] font-semibold">{userCredits}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Package Options */}
          <div className="space-y-3 mb-6">
            {UNLOCK_PACKAGES.map((pkg) => {
              const Icon = pkg.icon
              const isSelected = selectedPackage === pkg.id
              const canAfford = userCredits >= pkg.credits

              return (
                <button
                  key={pkg.id}
                  onClick={() => canAfford && setSelectedPackage(pkg.id)}
                  disabled={!canAfford}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                    isSelected
                      ? `bg-gradient-to-r ${pkg.color} border-transparent`
                      : canAfford
                        ? `bg-gray-800/50 ${pkg.borderColor} hover:bg-gray-800`
                        : 'bg-gray-900/50 border-gray-700 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {/* Popular Badge */}
                  {pkg.popular && (
                    <span className="absolute -top-2 right-3 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                      แนะนำ
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-gray-700'}`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-300'}`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-bold ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                          {pkg.name}
                        </h3>
                        <span className={`font-bold ${isSelected ? 'text-white' : 'text-[#00F2EA]'}`}>
                          {pkg.credits} เครดิต
                        </span>
                      </div>

                      <p className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                        {pkg.description}
                      </p>

                      <ul className="mt-2 space-y-1">
                        {pkg.benefits.map((benefit, idx) => (
                          <li key={idx} className={`text-xs flex items-center gap-1 ${isSelected ? 'text-white/90' : 'text-gray-400'}`}>
                            <Check className="h-3 w-3" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-all"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleUnlock}
              disabled={!selectedPackage || isProcessing}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] hover:shadow-lg hover:shadow-[#00F2EA]/50 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังดำเนินการ...</span>
                </>
              ) : (
                <span>ปลดล็อค</span>
              )}
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-gray-500 text-center mt-4">
            เครดิตจะถูกหักทันทีเมื่อกดปลดล็อค
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
