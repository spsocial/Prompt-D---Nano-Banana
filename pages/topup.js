import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ArrowLeft, Copy, Check, Loader2, QrCode, CreditCard, Wallet, Sparkles, Upload, CheckCircle, XCircle } from 'lucide-react'
import useStore from '../lib/store'

export default function TopUp() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { userCredits, setUserCredits, loadUserCredits } = useStore()

  const [selectedPackage, setSelectedPackage] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [slipFile, setSlipFile] = useState(null)
  const [slipPreview, setSlipPreview] = useState(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [userId, setUserId] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Get userId
  useEffect(() => {
    if (session?.user?.email) {
      const uid = `U-${session.user.email.split('@')[0].toUpperCase()}`
      setUserId(uid)
      if (loadUserCredits) {
        loadUserCredits(uid)
      }
    }
  }, [session, loadUserCredits])

  const packages = [
    { id: 1, name: 'ทดลอง', price: 29, credits: 15, perCredit: '1.93', popular: false, color: 'from-blue-500 to-blue-600' },
    { id: 2, name: 'Starter', price: 59, credits: 35, perCredit: '1.69', popular: false, color: 'from-purple-500 to-purple-600' },
    { id: 3, name: 'Popular', price: 99, credits: 60, perCredit: '1.65', popular: true, color: 'from-[#00F2EA] to-[#FE2C55]' },
    { id: 4, name: 'Pro', price: 199, credits: 130, perCredit: '1.53', popular: false, color: 'from-pink-500 to-pink-600' },
    { id: 5, name: 'Business', price: 399, credits: 280, perCredit: '1.43', popular: false, color: 'from-orange-500 to-orange-600' },
    { id: 6, name: 'Enterprise', price: 999, credits: 750, perCredit: '1.33', popular: false, color: 'from-yellow-500 to-yellow-600' }
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
    setVerificationResult(null)
    setSlipFile(null)
    setSlipPreview(null)

    try {
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
      const reader = new FileReader()
      reader.onloadend = () => {
        setSlipPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleVerifySlip = async () => {
    if (!slipFile || !selectedPackage) return

    setIsVerifying(true)
    setVerificationResult(null)

    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1]

        const response = await fetch('/api/verify-slip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slipImage: base64,
            expectedAmount: selectedPackage.price,
            userId: userId,
            packageName: selectedPackage.name,
            credits: selectedPackage.credits
          })
        })

        const result = await response.json()

        if (result.success) {
          await new Promise(resolve => setTimeout(resolve, 500))

          let finalCredits = result.data?.newBalance || ((userCredits || 0) + selectedPackage.credits)

          try {
            const creditResponse = await fetch('/api/credits?userId=' + userId)
            if (creditResponse.ok) {
              const creditData = await creditResponse.json()
              if (creditData.success && creditData.credits !== undefined) {
                finalCredits = creditData.credits
              }
            }
          } catch (error) {
            console.error('Error syncing credits:', error)
          }

          localStorage.setItem('nano_credits', finalCredits.toString())
          localStorage.setItem(`nano_credits_${userId}`, finalCredits.toString())
          if (setUserCredits) setUserCredits(finalCredits)

          if (loadUserCredits) {
            await loadUserCredits(userId)
          }

          setVerificationResult({
            success: true,
            message: `✅ ยืนยันการชำระเงิน ${selectedPackage.price} บาทสำเร็จ! ได้รับ ${selectedPackage.credits} เครดิต (รวม ${finalCredits} เครดิต)`
          })

          setTimeout(async () => {
            if (loadUserCredits) {
              await loadUserCredits(userId)
            }
          }, 1000)

        } else {
          setVerificationResult({
            success: false,
            message: result.error || 'ไม่สามารถยืนยันสลิปได้ กรุณาลองใหม่'
          })
        }

        setIsVerifying(false)
      }
      reader.readAsDataURL(slipFile)
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationResult({
        success: false,
        message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
      })
      setIsVerifying(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00F2EA] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-medium">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <>
      <Head>
        <title>เติมเครดิต - Prompt D Studio</title>
      </Head>

      <div className="min-h-screen bg-[#000000]">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-lg bg-[#121212]/90 border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
                <div className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-[#00F2EA]" />
                  <h1 className="text-xl font-bold text-white">เติมเครดิต</h1>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-full">
                <Sparkles className="h-4 w-4 text-[#FE2C55]" />
                <span className="text-sm font-semibold text-white">{userCredits}</span>
                <span className="text-xs text-gray-400">credits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          {!showPayment ? (
            <>
              {/* Packages Grid */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">เลือกแพ็คเกจ</h2>
                <p className="text-gray-400">เลือกแพ็คเกจที่เหมาะกับคุณ</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`relative bg-[#1a1a1a] rounded-2xl border-2 transition-all hover:scale-105 cursor-pointer ${
                      pkg.popular
                        ? 'border-[#00F2EA] shadow-lg shadow-[#00F2EA]/20'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                    onClick={() => handleSelectPackage(pkg)}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <div className="px-4 py-1 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] rounded-full text-white text-xs font-bold">
                          ⭐ Popular
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      <div className={`w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-r ${pkg.color} flex items-center justify-center`}>
                        <Sparkles className="h-8 w-8 text-white" />
                      </div>

                      <h3 className="text-xl font-bold text-white text-center mb-2">{pkg.name}</h3>

                      <div className="text-center mb-4">
                        <div className="text-4xl font-bold text-white mb-1">
                          ฿{pkg.price}
                        </div>
                        <div className="text-[#00F2EA] font-semibold text-lg">
                          {pkg.credits} เครดิต
                        </div>
                        <div className="text-gray-500 text-sm mt-1">
                          {pkg.perCredit} บาท/เครดิต
                        </div>
                      </div>

                      <button
                        className={`w-full py-3 rounded-xl font-semibold transition-all bg-gradient-to-r ${pkg.color} text-white hover:shadow-lg`}
                      >
                        เลือกแพ็คเกจ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Payment Section */}
              <div className="max-w-2xl mx-auto">
                <button
                  onClick={() => setShowPayment(false)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  กลับไปเลือกแพ็คเกจ
                </button>

                <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-8">
                  {/* Selected Package Info */}
                  <div className="text-center mb-8 pb-8 border-b border-gray-800">
                    <div className={`w-20 h-20 mx-auto mb-4 rounded-xl bg-gradient-to-r ${selectedPackage?.color} flex items-center justify-center`}>
                      <Sparkles className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{selectedPackage?.name}</h3>
                    <div className="text-4xl font-bold text-[#00F2EA] mb-1">฿{selectedPackage?.price}</div>
                    <div className="text-gray-400">รับ {selectedPackage?.credits} เครดิต</div>
                  </div>

                  {/* QR Code */}
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-[#00F2EA]" />
                      สแกน QR Code เพื่อชำระเงิน
                    </h4>
                    <div className="bg-white p-6 rounded-xl flex justify-center">
                      {isGeneratingQR ? (
                        <div className="flex flex-col items-center py-12">
                          <Loader2 className="h-12 w-12 text-[#00F2EA] animate-spin mb-4" />
                          <p className="text-gray-600">กำลังสร้าง QR Code...</p>
                        </div>
                      ) : qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                      ) : (
                        <div className="py-12 text-gray-600">ไม่สามารถสร้าง QR Code ได้</div>
                      )}
                    </div>
                  </div>

                  {/* PromptPay Info */}
                  <div className="mb-8">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-[#FE2C55]" />
                      หรือโอนเงินผ่าน PromptPay
                    </h4>
                    <div className="flex items-center justify-between bg-[#0a0a0a] p-4 rounded-xl border border-gray-800">
                      <div>
                        <div className="text-gray-400 text-sm mb-1">เลขพร้อมเพย์</div>
                        <div className="text-white text-xl font-mono font-bold">0902462826</div>
                      </div>
                      <button
                        onClick={handleCopyAccount}
                        className="p-3 bg-[#00F2EA] hover:bg-[#00d4cc] rounded-lg transition-colors"
                      >
                        {copied ? (
                          <Check className="h-5 w-5 text-white" />
                        ) : (
                          <Copy className="h-5 w-5 text-white" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Upload Slip */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Upload className="h-5 w-5 text-[#FE2C55]" />
                      อัพโหลดสลิปเพื่อยืนยันการชำระเงิน
                    </h4>

                    {slipPreview ? (
                      <div className="mb-4">
                        <img src={slipPreview} alt="Slip Preview" className="w-full max-w-sm mx-auto rounded-xl border-2 border-gray-700" />
                        <button
                          onClick={() => {
                            setSlipFile(null)
                            setSlipPreview(null)
                          }}
                          className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                          เปลี่ยนรูปสลิป
                        </button>
                      </div>
                    ) : (
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSlipUpload}
                          className="hidden"
                        />
                        <div className="border-2 border-dashed border-gray-700 hover:border-[#00F2EA] rounded-xl p-12 text-center cursor-pointer transition-colors">
                          <Upload className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400 mb-2">คลิกเพื่ออัพโหลดสลิป</p>
                          <p className="text-gray-600 text-sm">รองรับไฟล์ JPG, PNG</p>
                        </div>
                      </label>
                    )}

                    {slipFile && (
                      <button
                        onClick={handleVerifySlip}
                        disabled={isVerifying}
                        className="w-full mt-4 py-4 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isVerifying ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            กำลังตรวจสอบ...
                          </span>
                        ) : (
                          'ยืนยันการชำระเงิน'
                        )}
                      </button>
                    )}

                    {verificationResult && (
                      <div className={`mt-4 p-4 rounded-xl border-2 ${
                        verificationResult.success
                          ? 'bg-green-500/10 border-green-500'
                          : 'bg-red-500/10 border-red-500'
                      }`}>
                        <div className="flex items-start gap-3">
                          {verificationResult.success ? (
                            <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={`font-semibold mb-1 ${
                              verificationResult.success ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {verificationResult.success ? 'สำเร็จ!' : 'ไม่สำเร็จ'}
                            </p>
                            <p className="text-white text-sm">{verificationResult.message}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
