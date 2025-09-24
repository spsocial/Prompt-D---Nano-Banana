import { useState, useEffect } from 'react'
import { X, Copy, Check, Loader2, QrCode, CreditCard, Wallet } from 'lucide-react'
import useStore from '../lib/store'

export default function PricingModal({ onClose }) {
  const { userCredits, setUserCredits, userId, setUserId } = useStore()
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
    { id: 1, name: 'ทดลอง', price: 29, credits: 15, perImage: '1.93', popular: false },
    { id: 2, name: 'Starter', price: 59, credits: 35, perImage: '1.69', popular: false },
    { id: 3, name: 'Popular', price: 99, credits: 60, perImage: '1.65', popular: true },
    { id: 4, name: 'Pro', price: 199, credits: 130, perImage: '1.53', popular: false },
    { id: 5, name: 'Business', price: 399, credits: 280, perImage: '1.43', popular: false },
    { id: 6, name: 'Enterprise', price: 999, credits: 750, perImage: '1.33', popular: false }
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

        // เรียก EasySlip API
        const response = await fetch('/api/verify-slip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slipImage: base64,
            expectedAmount: selectedPackage.price,
            userId: generatedUserId
          })
        })

        const result = await response.json()

        if (result.success) {
          // เพิ่มเครดิต
          const newCredits = (userCredits || 0) + selectedPackage.credits
          localStorage.setItem('nano_credits', newCredits.toString())
          if (setUserCredits) setUserCredits(newCredits)

          setVerificationResult({
            success: true,
            message: `✅ ยืนยันการชำระเงิน ${selectedPackage.price} บาทสำเร็จ! ได้รับ ${selectedPackage.credits} เครดิต`
          })

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
                      {pkg.perImage} บาท/ภาพ
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
              <p className="text-sm text-gray-600">{selectedPackage?.credits} เครดิต ({selectedPackage?.perImage} บาท/ภาพ)</p>
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

            {/* Slip Upload */}
            <div className="bg-gradient-to-r from-gray-50/50 to-white/50 backdrop-blur-sm p-5 rounded-xl border border-white/30">
              <h4 className="font-bold mb-3 text-gray-800">📸 อัพโหลดสลิปการโอน</h4>

              <input
                type="file"
                accept="image/*"
                onChange={handleSlipUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2.5 file:px-5
                  file:rounded-xl file:border-0
                  file:text-sm file:font-semibold
                  file:bg-gradient-to-r file:from-yellow-100 file:to-amber-100
                  file:text-yellow-800 hover:file:from-yellow-200
                  hover:file:to-amber-200 file:transition-all file:duration-300"
              />

              {slipFile && (
                <div className="mt-3">
                  <p className="text-sm text-green-600 font-medium">✅ เลือกไฟล์: {slipFile.name}</p>
                </div>
              )}

              <button
                onClick={handleVerifySlip}
                disabled={!slipFile || isVerifying}
                className={`
                  mt-4 w-full py-3.5 px-5 rounded-xl font-bold
                  flex items-center justify-center space-x-2
                  transition-all duration-300 transform
                  ${slipFile && !isVerifying
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg hover:scale-[1.02]'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>กำลังตรวจสอบ...</span>
                  </>
                ) : (
                  <span>ยืนยันการชำระเงิน</span>
                )}
              </button>

              {verificationResult && (
                <div className={`mt-4 p-4 rounded-xl ${
                  verificationResult.success
                    ? 'bg-gradient-to-r from-green-50/50 to-emerald-50/50 border border-green-200/50'
                    : 'bg-gradient-to-r from-red-50/50 to-pink-50/50 border border-red-200/50'
                }`}>
                  <p className={`text-sm font-medium ${
                    verificationResult.success ? 'text-green-700' : 'text-red-700'
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
          <p className="text-center text-sm text-gray-700">
            มีปัญหาติดต่อ Line: @promptd | พัฒนาโดย Prompt D
          </p>
        </div>
      </div>
    </div>
  )
}