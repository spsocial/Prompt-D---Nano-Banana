import { useState, useEffect } from 'react'
import useStore from '../lib/store'
import { Loader2, Sparkles } from 'lucide-react'

export default function ProcessingModal() {
  const { isProcessing } = useStore()
  const [currentMessage, setCurrentMessage] = useState(0)
  
  const messages = [
    "กำลังวิเคราะห์รูปภาพด้วย AI...",
    "กำลังสร้าง Prompt คุณภาพสูง...",
    "กำลังสร้างภาพโฆษณาด้วย Gemini AI...",
    "กำลังปรับแต่งภาพให้สมบูรณ์แบบ...",
    "เกือบเสร็จแล้ว กำลังเตรียมผลลัพธ์..."
  ]

  useEffect(() => {
    if (!isProcessing) return
    
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % messages.length)
    }, 2000)
    
    return () => clearInterval(interval)
  }, [isProcessing])

  if (!isProcessing) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full">
            <Sparkles className="h-12 w-12 text-white animate-pulse" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">กำลังประมวลผล</h2>
        <p className="text-gray-200 mb-8">{messages[currentMessage]}</p>
        
        <div className="flex justify-center mb-8">
          <Loader2 className="h-12 w-12 text-yellow-400 animate-spin" />
        </div>
        
        <div className="space-y-4">
          <div className="w-full bg-white/20 rounded-full h-2.5">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2.5 rounded-full animate-pulse" style={{width: '75%'}}></div>
          </div>
          
          <p className="text-sm text-gray-300">
            ใช้เวลาประมาณ 20-30 วินาที ขึ้นอยู่กับความซับซ้อนของภาพ
          </p>
        </div>
        
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-xl border border-blue-300/30">
          <p className="text-sm text-blue-200">
            💡 ขณะที่รอ คุณสามารถปรับแต่ง Prompt ในส่วนการตั้งค่าขั้นสูงได้
          </p>
        </div>
      </div>
    </div>
  )
}
