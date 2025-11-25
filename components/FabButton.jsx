import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'

export default function FabButton() {
  const handleClick = () => {
    window.open('https://m.me/719837687869400', '_blank')
  }

  return (
    <motion.button
      onClick={handleClick}
      // Mobile: smaller (w-9 h-9) and higher (bottom-24) to avoid blocking send button
      // Desktop: normal size (w-14 h-14) at bottom-6
      className="fixed bottom-24 right-4 w-9 h-9 sm:bottom-6 sm:right-6 sm:w-14 sm:h-14 bg-gradient-to-br from-[#00F2EA] to-[#FE2C55] rounded-full shadow-lg flex items-center justify-center text-white z-40 hover:shadow-xl hover:shadow-[#00F2EA]/50 transition-all"
      initial={{ scale: 0, rotate: -180 }}
      animate={{
        scale: 1,
        rotate: 0,
        y: [0, -5, 0]
      }}
      transition={{
        scale: {
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.5
        },
        rotate: {
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.5
        },
        y: {
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
          delay: 1
        }
      }}
      whileHover={{
        scale: 1.1,
        rotate: 10,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 10
        }
      }}
      whileTap={{ scale: 0.9 }}
      title="แจ้งปัญหา / ติดต่อเรา"
    >
      <MessageCircle className="h-4 w-4 sm:h-6 sm:w-6" />
    </motion.button>
  )
}