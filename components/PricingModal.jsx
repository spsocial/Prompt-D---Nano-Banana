import { useState, useEffect } from 'react'
import { X, Copy, Check, Loader2, QrCode, CreditCard, Wallet } from 'lucide-react'
import useStore from '../lib/store'
import { trackPayment } from '../lib/analytics-client'

export default function PricingModal({ onClose }) {
  const { userCredits, setUserCredits, userId, setUserId, loadUserCredits } = useStore()
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [slipFile, setSlipFile] = useState(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [generatedUserId, setGeneratedUserId] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)

  // สร้างหรือโหลด User ID
  useEffect(() => {
    let storedUserId = localStorage.getItem('nano_user_id')
    if (!storedUserId) {
      // สร้าง User ID ใหม่ (format: NB-XXXXXX)
      const newId = 'NB-' + Math.random().toString(36).substr(2, 6).toUpperCase()
      localStorage.setItem('nano_user_id', newId)
      storedUserId = newId
    }
    setGeneratedUserId(storedUserId)
    if (setUserId) setUserId(storedUserId)

    // Use store's loadUserCredits for consistent loading
    const store = useStore.getState()
    if (store.loadUserCredits) {
      store.loadUserCredits(storedUserId)
    }
  }, [])

  const packages = [
    { id: 1, name: 'ทดลอง', price: 29, credits: 15, perCredit: '1.93', popular: false },
    { id: 2, name: 'Starter', price: 59, credits: 35, perCredit: '1.69', popular: false },
    { id: 3, name: 'Popular', price: 99, credits: 60, perCredit: '1.65', popular: true },
    { id: 4, name: 'Pro', price: 199, credits: 130, perCredit: '1.53', popular: false },
    { id: 5, name: 'Business', price: 399, credits: 280, perCredit: '1.43', popular: false },
    { id: 6, name: 'Enterprise', price: 999, credits: 750, perCredit: '1.33', popular: false }
  ]

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('0902462826')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSelectPackage = async (pkg) => {
    setSelectedPackage(pkg)
    setShowPayment(true)
    setIsGeneratingQR(true)
    setQrCodeUrl(null)

    try {
      // Generate QR Code
      const response = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: pkg.price })
      })

      const data = await response.json()
      if (data.success) {
        setQrCodeUrl(data.qrCode)
      }
    } catch (error) {
      console.error('QR generation error:', error)
    } finally {
      setIsGeneratingQR(false)
    }
  }

  const handleSlipUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSlipFile(file)
    }
  }

  const handleVerifySlip = async () => {
    if (!slipFile || !selectedPackage) return

    setIsVerifying(true)
    setVerificationResult(null)

    try {
      // อ่านไฟล์เป็น base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1]

        // เรียก EasySlip API พร้อมข้อมูลแพ็คเกจ
        const response = await fetch('/api/verify-slip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slipImage: base64,
            expectedAmount: selectedPackage.price,
            userId: generatedUserId,
            packageName: selectedPackage.name,
            credits: selectedPackage.credits
          })
        })

        const result = await response.json()

        if (result.success) {
          // Wait a bit to ensure database is updated
          await new Promise(resolve => setTimeout(resolve, 500))

          // Sync with database multiple times to ensure consistency
          let finalCredits = result.data?.newBalance || ((userCredits || 0) + selectedPackage.credits)

          // First sync attempt
          try {
            const creditResponse = await fetch('/api/credits?userId=' + generatedUserId)
            if (creditResponse.ok) {
              const creditData = await creditResponse.json()
              if (creditData.success && creditData.credits !== undefined) {
                finalCredits = creditData.credits
                console.log('Credits from DB:', finalCredits)
              }
            }
          } catch (error) {
            console.error('Error syncing credits:', error)
          }

          // Update localStorage and state with verified database value
          localStorage.setItem('nano_credits', finalCredits.toString())
          localStorage.setItem(`nano_credits_${generatedUserId}`, finalCredits.toString())
          if (setUserCredits) setUserCredits(finalCredits)

          // Also call the store's loadUserCredits function for proper sync
          if (loadUserCredits) {
            await loadUserCredits(generatedUserId)
          }

          setVerificationResult({
            success: true,
            message: `✅ ยืนยันการชำระเงิน ${selectedPackage.price} บาทสำเร็จ! ได้รับ ${selectedPackage.credits} เครดิต (รวม ${finalCredits} เครดิต)`
          })

          // Double-check sync after showing success message
          setTimeout(async () => {
            if (loadUserCredits) {
              await loadUserCredits(generatedUserId)
            }
          }, 1000)

          // ปิด modal หลังจาก 3 วินาที
          setTimeout(() => {
            onClose()
          }, 3000)
        } else {
          setVerificationResult({
            success: false,
            message: result.message || '❌ ไม่สามารถยืนยันสลิปได้ กรุณาตรวจสอบ'
          })
        }
      }
      reader.readAsDataURL(slipFile)
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationResult({
        success: false,
        message: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่'
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 backdrop-blur-sm p-6 rounded-t-3xl border-b border-white/20">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">💰 ซื้อเครดิต</h2>
              <p className="text-gray-600 mt-1">เลือกแพ็คเกจที่เหมาะสมกับคุณ</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-5 bg-gradient-to-r from-yellow-50/50 to-amber-50/50 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">User ID ของคุณ:</p>
              <p className="text-lg font-bold text-yellow-600">{generatedUserId}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">เครดิตคงเหลือ:</p>
              <p className="text-2xl font-bold text-green-600">{userCredits || 0} เครดิต</p>
            </div>
          </div>
        </div>

        {!showPayment ? (
          /* Package Selection */
          <div className="p-6">
            {/* Auto System Notice */}
            <div className="mb-5 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
              <h4 className="font-bold text-green-800 mb-2 flex items-center">
                <span className="text-xl mr-2">⚡</span>
                ระบบเติมเงินอัตโนมัติ - เครดิตเข้าทันที!
              </h4>
              <div className="text-sm text-green-700 space-y-1">
                <p>✅ <strong>เลือกแพ็ก</strong> → แนบสลิป → <strong>เครดิตเข้าทันที</strong></p>
                <p>✅ ระบบตรวจสอบสลิปอัตโนมัติด้วย AI</p>
                <p>✅ หากไม่เข้าภายใน 5 นาที ให้แจ้งแอดมิน</p>
              </div>
            </div>

            {/* Credit Usage Info */}
            <div className="mb-5 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              <h4 className="font-bold text-blue-800 mb-2">💳 การใช้เครดิต</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>🖼️ <strong>สร้างภาพ (Nano Banana):</strong> 1 เครดิต/ภาพ</p>
                <p>🎬 <strong>สร้างวิดีโอ (Sora-2):</strong> 10 เครดิต/คลิป (10 วิ)</p>
                <p>💎 <strong>สร้างวิดีโอ HD (Sora-2 HD):</strong> 15 เครดิต/คลิป (10 วิ)</p>
                <p>⚡ <strong>สร้างวิดีโอ (Veo3-fast):</strong> 15 เครดิต/คลิป (8 วิ)</p>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-4 text-gray-800">เลือกแพ็คเกจ</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg)}
                  className={`
                    relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-[1.02]
                    ${pkg.popular
                      ? 'border-yellow-500 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 shadow-lg'
                      : 'border-white/30 bg-white/20 hover:border-yellow-300/50 hover:bg-white/30'
                    }
                  `}
                >
                  {pkg.popular && (
                    <span className="absolute -top-3 -right-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      ยอดนิยม
                    </span>
                  )}
                  <div className="text-center">
                    <div className="font-bold text-gray-900">{pkg.name}</div>
                    <div className="text-3xl font-bold text-yellow-600 mt-2">
                      ฿{pkg.price}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      {pkg.credits} เครดิต
                    </div>
                    <div className="text-xs text-green-600 font-medium mt-1">
                      {pkg.perCredit} บาท/เครดิต
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div>🖼️ {pkg.credits} ภาพ</div>
                        <div>หรือ 🎬 {Math.floor(pkg.credits / 10)} วิดีโอ</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Payment Process */
          <div className="p-6">
            <button
              onClick={() => {
                setShowPayment(false)
                setSlipFile(null)
                setVerificationResult(null)
              }}
              className="mb-4 text-sm text-gray-600 hover:text-yellow-600 font-medium"
            >
              ← เลือกแพ็คเกจอื่น
            </button>

            <div className="bg-gradient-to-r from-gray-50/50 to-white/50 backdrop-blur-sm p-5 rounded-xl border border-white/30 mb-5">
              <h3 className="font-bold mb-2 text-gray-800">แพ็คเกจที่เลือก: {selectedPackage?.name}</h3>
              <p className="text-2xl font-bold text-yellow-600">฿{selectedPackage?.price}</p>
              <p className="text-sm text-gray-600">{selectedPackage?.credits} เครดิต ({selectedPackage?.perCredit} บาท/เครดิต)</p>
            </div>

            {/* Payment QR */}
            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border-2 border-yellow-300/50 mb-5">
              <h4 className="font-bold mb-4 text-center text-gray-800">📱 สแกน QR Code เพื่อชำระเงิน</h4>

              <div className="bg-gradient-to-br from-gray-100/50 to-white/50 p-5 rounded-xl mb-4 flex justify-center">
                {isGeneratingQR ? (
                  <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center shadow-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
                  </div>
                ) : qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="PromptPay QR Code"
                    className="w-48 h-48 bg-white rounded-xl shadow-lg"
                  />
                ) : (
                  <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center shadow-lg">
                    <QrCode className="h-32 w-32 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="text-center mb-3">
                <p className="text-sm text-gray-600 mb-1">PromptPay</p>
                <p className="text-sm font-bold text-gray-800 mb-2">นางสาว ธัญลักษณ์ ไทยพุทรา</p>
                <div className="flex items-center justify-center space-x-2">
                  <span className="font-mono text-lg text-gray-800">090-246-2826</span>
                  <button
                    onClick={handleCopyAccount}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                </div>
                <p className="text-xl font-bold text-yellow-600 mt-3">
                  จำนวน: {selectedPackage?.price} บาท
                </p>
              </div>

              <div className="bg-gradient-to-r from-yellow-50/50 to-amber-50/50 p-3 rounded-xl">
                <p className="text-xs text-yellow-800">
                  💡 หมายเหตุ: ระบุ User ID <strong>{generatedUserId}</strong> ในหมายเหตุการโอน
                </p>
              </div>
            </div>

            {/* Important Warning - Sticky at top */}
            <div className="sticky top-0 z-10 mb-5 p-5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl shadow-xl border-2 border-white/30 animate-pulse">
              <div className="flex items-start space-x-3">
                <span className="text-3xl flex-shrink-0">⚠️</span>
                <div>
                  <h4 className="font-bold text-lg mb-2">สำคัญมาก! กรุณาอ่าน</h4>
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold">📸 <u>ต้องแนบสลิปด้านล่าง</u> มิฉะนั้นเครดิตจะไม่เข้า!</p>
                    <p>✅ โอนเงิน → <strong>แนบสลิป</strong> → กดยืนยัน</p>
                    <p className="text-white/90">⏰ ห้ามปิดหน้าต่างก่อนแนบสลิป</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Slip Upload - Highlighted */}
            <div className="bg-gradient-to-br from-yellow-100 to-amber-100 p-6 rounded-2xl border-4 border-red-500 shadow-2xl mb-5">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <span className="text-2xl animate-bounce">👇</span>
                <h4 className="font-bold text-xl text-red-700">แนบสลิปที่นี่!</h4>
                <span className="text-2xl animate-bounce">👇</span>
              </div>

              <label
                htmlFor="slip-upload"
                className={`
                  block w-full py-6 px-6 rounded-2xl border-4 border-dashed cursor-pointer
                  transition-all duration-300 transform hover:scale-[1.02]
                  ${slipFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-400 bg-white hover:border-red-500 hover:bg-red-50'
                  }
                `}
              >
                <input
                  id="slip-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleSlipUpload}
                  className="hidden"
                />
                <div className="text-center">
                  {slipFile ? (
                    <>
                      <div className="text-5xl mb-3">✅</div>
                      <p className="text-lg font-bold text-green-700 mb-2">สลิปที่เลือก:</p>
                      <p className="text-sm text-green-600 font-medium">{slipFile.name}</p>
                      <p className="text-xs text-gray-600 mt-2">คลิกเพื่อเปลี่ยนไฟล์</p>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl mb-3">📸</div>
                      <p className="text-lg font-bold text-red-700 mb-2">คลิกที่นี่เพื่อเลือกสลิป</p>
                      <p className="text-sm text-gray-600">รองรับ: JPG, PNG (ขนาดไม่เกิน 10MB)</p>
                    </>
                  )}
                </div>
              </label>

              <button
                onClick={handleVerifySlip}
                disabled={!slipFile || isVerifying}
                className={`
                  mt-5 w-full py-5 px-6 rounded-2xl font-bold text-lg
                  flex items-center justify-center space-x-3
                  transition-all duration-300 transform
                  ${slipFile && !isVerifying
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-2xl hover:scale-[1.03] animate-pulse'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>กำลังตรวจสอบสลิป...</span>
                  </>
                ) : slipFile ? (
                  <>
                    <Check className="h-6 w-6" />
                    <span>ยืนยันการชำระเงิน (คลิกที่นี่)</span>
                  </>
                ) : (
                  <>
                    <X className="h-6 w-6" />
                    <span>กรุณาแนบสลิปก่อน</span>
                  </>
                )}
              </button>

              {verificationResult && (
                <div className={`mt-5 p-5 rounded-2xl border-2 ${
                  verificationResult.success
                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-500'
                    : 'bg-gradient-to-r from-red-100 to-pink-100 border-red-500'
                }`}>
                  <p className={`text-base font-bold text-center ${
                    verificationResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {verificationResult.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="p-5 bg-gradient-to-r from-gray-100/50 to-gray-200/50 backdrop-blur-sm border-t border-white/20 rounded-b-3xl">
          <div className="text-center">
            <p className="text-sm text-gray-700 mb-2">
              💡 สำหรับลูกค้า: หากเติมเครดิตไม่เข้ากรุณาติดต่อที่เพจ
            </p>
            <div className="flex flex-col items-center space-y-1">
              <a
                href="https://m.me/719837687869400"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.784 23.456l4.5-1.443C7.236 23.298 9.546 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm.067 21.6c-2.24 0-4.404-.656-6.278-1.876l-.45-.29-3.162 1.013 1.03-3.104-.315-.477C1.617 15.044.9 13.569.9 12c0-5.303 4.317-9.6 9.633-9.6 5.316 0 9.633 4.297 9.633 9.6 0 5.303-4.317 9.6-9.633 9.6h-.033z"/>
                  <path d="M8.994 6.815c-.243-.54-.498-.551-.729-.56-.188-.007-.403-.009-.619-.009-.215 0-.564.081-.86.403-.295.322-1.126 1.101-1.126 2.684s1.153 3.113 1.314 3.327c.161.215 2.207 3.516 5.445 4.789 2.61 1.026 3.239.822 3.823.77.584-.051 1.883-.77 2.148-1.513.265-.743.265-1.38.186-1.513-.079-.134-.295-.215-.619-.376-.323-.161-1.911-.943-2.207-1.051-.295-.107-.511-.161-.726.161-.215.323-.832 1.051-1.02 1.265-.188.215-.376.242-.7.081-.323-.161-1.364-.503-2.598-1.605-.961-.857-1.609-1.916-1.798-2.239-.188-.323-.02-.498.142-.658.145-.144.323-.376.484-.564.161-.188.215-.323.323-.538.107-.215.054-.403-.027-.564-.081-.161-.7-1.73-.994-2.37z"/>
                </svg>
                ติดต่อผ่าน Facebook Page
              </a>
              <p className="text-xs text-gray-600 mt-1">
                📱 Facebook: Prompt D | พัฒนาโดย Prompt D
              </p>
              <div className="mt-2 text-xs text-gray-500">
                💰 เริ่มต้นเพียง 29 บาท/15 เครดิต
                <br />
                🎯 ยอดนิยม 99 บาท/60 เครดิต (1.65 บาท/เครดิต)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}