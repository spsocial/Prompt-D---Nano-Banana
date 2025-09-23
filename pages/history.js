import { useState } from 'react'
import Head from 'next/head'
import History from '../components/History'
import useStore from '../lib/store'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function HistoryPage() {
  const { history, clearHistory } = useStore()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClearHistory = () => {
    clearHistory()
    setShowConfirm(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
      <Head>
        <title>ประวัติการสร้างภาพ - Auto Nano Banana</title>
        <meta name="description" content="ประวัติการสร้างภาพด้วย AI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-white/30 backdrop-blur-lg border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                <ArrowLeft className="h-6 w-6 text-gray-700" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">ประวัติการสร้างภาพ</h1>
            </div>
            
            {history.length > 0 && (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>ล้างประวัติ</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {showConfirm && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-red-900 mb-1">ยืนยันการล้างประวัติ</h3>
                <p className="text-sm text-red-700">
                  คุณแน่ใจหรือไม่ที่ต้องการล้างประวัติการสร้างภาพทั้งหมด? การกระทำนี้ไม่สามารถยกเลิกได้
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleClearHistory}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  ล้างประวัติ
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">ภาพที่สร้างแล้ว</h2>
            <p className="text-gray-600">
              ทั้งหมด {history.length} รายการ
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ระบบเก็บประวัติล่าสุด 100 รายการ • ภาพบางส่วนอาจถูกลบเพื่อประหยัดพื้นที่
            </p>
            <p className="text-xs text-gray-500 mt-1">
              คำแนะนำ: ดาวน์โหลดภาพที่คุณต้องการเก็บไว้ก่อนที่จะหายไป
            </p>
          </div>
        </div>

        <div className="bg-white/30 backdrop-blur-lg rounded-2xl border border-white/30 shadow-lg p-6">
          <History />
        </div>
      </main>

      <footer className="mt-12 border-t border-white/20 bg-gradient-to-r from-yellow-50/30 to-amber-50/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-600">
            <p>Auto Nano Banana - สร้างโฆษณาสินค้าด้วย AI</p>
          </div>
        </div>
      </footer>
    </div>
  )
}