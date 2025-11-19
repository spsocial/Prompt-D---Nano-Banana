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
      router.push('/')
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
    { id: 2, name: 'Basic', price: 99, credits: 65, perCredit: '1.52', popular: false, color: 'from-purple-500 to-purple-600' },
    { id: 3, name: 'Pro', price: 199, credits: 140, perCredit: '1.42', popular: true, color: 'from-[#00F2EA] to-[#FE2C55]' },
    { id: 4, name: 'Premium', price: 499, credits: 380, perCredit: '1.31', popular: false, color: 'from-pink-500 to-pink-600' },
    { id: 5, name: 'Business', price: 999, credits: 800, perCredit: '1.25', popular: false, color: 'from-orange-500 to-orange-600' },
    { id: 6, name: 'Enterprise', price: 1999, credits: 1700, perCredit: '1.18', popular: false, color: 'from-yellow-500 to-yellow-600' }
  ]

  // คำนวณจำนวนที่สร้างได้สูงสุด
  const calculateUsage = (credits) => {
    return {
      images: credits, // 1 credit per image
      videosMin: Math.floor(credits / 15), // 15 credits per long video
      videosMax: Math.floor(credits / 10), // 10 credits per short video
      voices: credits // 1 credit per voice
    }
  }

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
        <title>เติมเครดิต - PD Studio</title>
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
              <div className="text-center mb-12">
                <div className="inline-block mb-4">
                  <div className="relative">
                    <h2 className="text-5xl font-black bg-gradient-to-r from-[#00F2EA] via-white to-[#FE2C55] bg-clip-text text-transparent mb-3">
                      เลือกแพ็คเกจของคุณ
                    </h2>
                    <div className="absolute -inset-2 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] blur-2xl opacity-20 -z-10"></div>
                  </div>
                </div>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  🎨 สร้างภาพและวิดีโอไม่จำกัด ด้วยเครดิตที่คุ้มค่า พร้อมระบบอัตโนมัติ
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg, index) => (
                  <div
                    key={pkg.id}
                    style={{ animationDelay: `${index * 100}ms` }}
                    className={`relative bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-3xl border-2 transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer group animate-fade-in ${
                      pkg.popular
                        ? 'border-[#00F2EA] shadow-2xl shadow-[#00F2EA]/30'
                        : 'border-gray-800 hover:border-[#00F2EA]/50'
                    }`}
                    onClick={() => handleSelectPackage(pkg)}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <div className="px-6 py-2 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] rounded-full text-white text-sm font-bold shadow-lg animate-pulse">
                          ⭐ แนะนำ
                        </div>
                      </div>
                    )}

                    {/* Gradient overlay effect */}
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${pkg.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                    <div className="relative p-8">
                      {/* Icon with glow effect */}
                      <div className={`relative w-20 h-20 mx-auto mb-6`}>
                        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${pkg.color} blur-xl opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                        <div className={`relative w-full h-full rounded-2xl bg-gradient-to-r ${pkg.color} flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300`}>
                          <Sparkles className="h-10 w-10 text-white" />
                        </div>
                      </div>

                      <h3 className="text-2xl font-bold text-white text-center mb-4 group-hover:text-[#00F2EA] transition-colors">{pkg.name}</h3>

                      <div className="text-center mb-6">
                        <div className="relative inline-block">
                          <div className="text-5xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
                            ฿{pkg.price}
                          </div>
                          <div className="absolute -inset-1 bg-gradient-to-r from-[#00F2EA] to-[#FE2C55] blur-lg opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        </div>
                        <div className={`text-2xl font-bold bg-gradient-to-r ${pkg.color} bg-clip-text text-transparent mb-2`}>
                          {pkg.credits} เครดิต
                        </div>
                        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-4">
                          <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                          <span>{pkg.perCredit} ฿/เครดิต</span>
                          <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                        </div>

                        {/* Usage Info */}
                        <div className="space-y-2 text-left bg-[#0a0a0a] rounded-xl p-4 border border-gray-800">
                          <div className="text-xs text-gray-500 font-semibold mb-2">🎯 สร้างได้สูงสุด:</div>
                          {(() => {
                            const usage = calculateUsage(pkg.credits);
                            return (
                              <>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400">🎨 รูปภาพ</span>
                                  <span className="font-bold text-white">{usage.images} รูป</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400">🎬 วิดีโอ</span>
                                  <span className="font-bold text-[#00F2EA]">{usage.videosMin}-{usage.videosMax} คลิป</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400">🎙️ เสียง</span>
                                  <span className="font-bold text-white">{usage.voices} เสียง</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      <button
                        className={`relative w-full py-4 rounded-2xl font-bold text-lg text-white overflow-hidden group/btn`}
                      >
                        <div className={`absolute inset-0 bg-gradient-to-r ${pkg.color} transition-transform duration-300 group-hover/btn:scale-110`}></div>
                        <div className="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-20 transition-opacity"></div>
                        <span className="relative flex items-center justify-center gap-2">
                          เลือกแพ็คเกจ
                          <svg className="w-5 h-5 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </span>
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
