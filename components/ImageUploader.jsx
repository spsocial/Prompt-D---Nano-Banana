import { useCallback, useState, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import useStore from '../lib/store'
import { Upload, Image, Loader2, Wand2, RefreshCw, AlertCircle, X, Camera, Brain, Film, Play, Download } from 'lucide-react'

export default function ImageUploader() {
  const [preview, setPreview] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [isCompressing, setIsCompressing] = useState(false)
  const [outputMode, setOutputMode] = useState('image') // 'image' or 'video'
  const [numberOfImages, setNumberOfImages] = useState(1) // เริ่มต้นที่ 1 ภาพเพื่อป้องกันการสร้างมากเกินไป
  const [aspectRatio, setAspectRatio] = useState('1:1') // Default aspect ratio
  const [readyToProcess, setReadyToProcess] = useState(false)

  // Video-specific states
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoDuration, setVideoDuration] = useState(5)
  const [videoResolution, setVideoResolution] = useState('720p')
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9')
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoResult, setVideoResult] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [useCustomPrompt, setUseCustomPrompt] = useState(false) // New state for custom prompt toggle
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  
  const {
    setIsProcessing,
    setResults,
    setError,
    apiKeys,
    userPlan,
    userCredits,
    useCredits,
    uploadedImage,
    setUploadedImage: setStoreUploadedImage,
    clearUploadedImage
  } = useStore()

  // Initialize component state from global store
  useEffect(() => {
    if (uploadedImage) {
      setPreview(uploadedImage)
      setReadyToProcess(true)
      setShowAdvanced(true)
    }

    // Load user-specific credits on mount using store's consistent method
    const userId = localStorage.getItem('nano_user_id')
    if (userId && useStore.getState().loadUserCredits) {
      useStore.getState().loadUserCredits(userId)
    }
  }, [uploadedImage])

  // Premium prompts
  const premiumPrompt = `สร้างภาพโฆษณาสินค้าจากภาพต้นฉบับ ในบรรยากาศที่หรูหราและทรงพลัง ถ่ายทอดความรู้สึกระดับพรีเมียมอย่างชัดเจน ออกแบบการจัดวางองค์ประกอบภาพอย่างพิถีพิถันเหมือนงานโฆษณามืออาชีพ จัดแสงเงาให้โดดเด่นและเสริมความงามของตัวสินค้า พร้อมเลือกฉากหลังที่มีความหรูหรา กลมกลืน และสื่อถึงคุณค่าของแบรนด์
ภาพที่ได้ต้องคมชัดในระดับไฮเปอร์เรียลลิสติก รายละเอียดสมจริงทุกมุมมอง โทนสีเน้นความมีระดับ สะท้อนภาพลักษณ์ที่น่าเชื่อถือ ดูทันสมัย และสร้างแรงดึงดูดให้ผู้ชมรู้สึกว่าผลิตภัณฑ์นี้มีคุณค่าเหนือกว่าใคร`

  const floatingPrompt = `สร้างภาพโฆษณาสินค้าจากภาพต้นฉบับ แบบลอยอยู่ในอากาศ และมีส่วนประกอบต่างๆที่สอดคล้องกับตัวสินค้าลอยอยู่รอบๆ เหมือนโฆษณาสินค้าที่มากประสบการณ์แบบมืออาชีพ พร้อมเลือกฉากหลังที่มีความกลมกลืน และสื่อถึงคุณค่าของแบรนด์
ภาพที่ได้ต้องคมชัดในระดับไฮเปอร์เรียลลิสติก รายละเอียดสมจริงทุกมุมมอง โทนสีเน้นความมีระดับ สะท้อนภาพลักษณ์ที่น่าเชื่อถือ ดูทันสมัย และสร้างแรงดึงดูดให้ผู้ชมรู้สึกว่าผลิตภัณฑ์นี้มีคุณค่าเหนือกว่าใคร`

  const moodyPrompt = `สร้างภาพโฆษณาสินค้าจากภาพต้นฉบับ ในโทนภาพที่มีอารมณ์และความลึกลับ (Moody) ให้ความรู้สึกอบอุ่นและเป็นธรรมชาติ ใช้แสงและเงาเพื่อสร้างบรรยากาศที่ลึกซึ้งและมีอารมณ์ เน้นพื้นผิวที่ดูเป็นธรรมชาติ เช่น ไม้ หิน หรือผ้าลินิน จัดองค์ประกอบให้ดูเรียบง่ายแต่มีความลึก ใช้สีโทนอบอุ่นและเย็นผสมผสานกันอย่างลงตัว เพื่อสื่อถึงความเป็นธรรมชาติและความน่าเชื่อถือของสินค้า`

  const cinematicPrompt = `โฆษณา 3D แบบ Cinematic ที่น่าทึ่งสำหรับสินค้าจากภาพต้นฉบับ
จัดเฟรมใน ฉาก mid-motion สุดดราม่า ที่จับพลังงานการระเบิดของมันไว้ในเพียงชั่วขณะเดียวที่หยุดนิ่ง
การจัดแสงเป็นแบบ high-key ที่ทรงพลัง พร้อมด้วย ประกายสะท้อนแสงแวววาว (specular highlights) และ เงาลึกเข้ม (inky shadows) ที่ช่วยเสริมรูปร่างของผลิตภัณฑ์
ฉากนี้เต็มไปด้วย อนุภาคพลิ้วกระจายอย่างโกลาหล – คล้ายเศษแก้วแตกกระจายหรือฝุ่นคอสมิก – ที่ตามรอยอยู่ด้านหลังผลิตภัณฑ์ในเอฟเฟกต์ slow-motion blur แบบละเอียดขั้นสูง
สภาพแวดล้อมคือ ภูมิทัศน์เหนือจริงแบบ hyperrealistic ที่สะท้อนแก่นแท้ของผลิตภัณฑ์ (เช่น ถ้ำคริสตัลสำหรับสินค้าที่มีความ "กรุบกรอบ", เมืองนีออนล่องลอยสำหรับสินค้าที่สื่อถึง "พลังงาน")
โลโก้แบรนด์ที่สร้างขึ้นอย่างประณีตจากองค์ประกอบของผลิตภัณฑ์เอง ปรากฏขึ้นราวกับถูกหล่อหลอมจากการเคลื่อนไหว
รายละเอียดขั้นสูง (hyper-detailed), โฟกัสคมกริบระดับคริสตัล, และ สีสันสดจัดจ้าน (vibrantly bold colors) เพื่อให้ได้ภาพที่สะดุดตา พร้อมเผยแพร่แบบไวรัล

พื้นหลัง: บรรยากาศสเตเดียมสุดยิ่งใหญ่ เต็มไปด้วยแสงไฟสีแดงและน้ำเงินระยิบระยับ เศษกระดาษโปรยลงมา แสงสปอร์ตไลท์สาดส่อง พลังงานดราม่าเต็มเฟรม
สไตล์: สดใส ทรงพลัง Cinematic และสมจริงระดับโปสเตอร์
โทนสี: ครองด้วยสีแดงและน้ำเงิน ถ่ายทอดความเร้าใจ พลังงาน และความรู้สึกการเฉลิมฉลองเชิงกีฬา
อารมณ์: ดุดัน สนุกสนาน เต็มไปด้วยพลังระเบิด และสะท้อนความภาคภูมิใจระดับชาติ
องค์ประกอบภาพ: โปสเตอร์แนวตั้งแบบ HD จัดองค์ประกอบกึ่งกลางอย่างสมมาตร ใบหน้าและสัญลักษณ์ชัดเจน มีมิติแบบใหญ่กว่าชีวิตจริง พร้อมการจัดแสงดราม่าที่เข้มข้น

สำคัญมาก: อย่าใส่ตัวหนังสือภาษาไทยที่คุณคิดขึ้นเองลงในภาพ ห้ามใส่ข้อความภาษาไทย แต่สามารถใส่ข้อความภาษาอังกฤษที่เกี่ยวข้องกับแบรนด์หรือสินค้าได้`

  const productHeroPrompt = `Transform this product photo into a professional advertising image.
Keep the original product shape, logo, and text exactly as in the reference.
Make it look high-quality, sharp, and realistic.

Focus on:
- Hero shot of the product in the center, well-lit with cinematic lighting
- Add realistic environment and props related to the product theme
  (e.g. beach + seafood for snacks, fresh fruits for soap, coffee beans for Nescafe)
- Enhance textures: condensation drops, fresh ingredients, splashes, or glowing highlights
- Depth of field with natural background blur
- Vibrant, commercial-grade color grading
- Maintain readability of the product's label and brand
- Style: modern product advertising photography, professional, high impact`

  const [mainPrompt, setMainPrompt] = useState(premiumPrompt)
  const [selectedPromptStyle, setSelectedPromptStyle] = useState('premium')

  // Compress image function
  const compressImage = (base64String, maxWidth = 1024, quality = 0.8) => {
    return new Promise((resolve) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // Calculate new dimensions
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (maxWidth / width) * height
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)

        // Convert back to base64 with compression
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedBase64)
      }
      img.src = base64String
    })
  }

  const processImage = async (base64Image) => {
    setIsProcessing(true)
    setError(null)
    setResults([])
    // Don't reset readyToProcess so button stays visible
    // setReadyToProcess(false) - removed this line

    try {
      // Compress image before sending
      setIsCompressing(true)
      console.log('🗜️ Compressing image...')
      const compressedImage = await compressImage(base64Image, 1024, 0.85)
      const originalSize = (base64Image.length * 0.75) / 1024 / 1024 // Convert to MB
      const compressedSize = (compressedImage.length * 0.75) / 1024 / 1024
      console.log(`✅ Compressed: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB`)
      setIsCompressing(false)

      // Determine which prompt to use
      const promptToUse = useCustomPrompt ? customPrompt : (customPrompt || mainPrompt)

      // Step 1: Analyze image with Vision API
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: compressedImage,
          apiKey: userPlan === 'free' ? apiKeys.gemini : null,
          customPrompt: promptToUse,
          selectedStyle: selectedPromptStyle,
          userId: localStorage.getItem('nano_user_id'), // Add userId for tracking
          numberOfImages: numberOfImages, // Pass the actual number of images
          aspectRatio: aspectRatio // Pass selected aspect ratio
        }),
      })

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text()
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { error: errorText }
        }
        throw new Error(error.error || 'Failed to analyze image')
      }

      const { analysis, prompts: allPrompts } = await analyzeResponse.json()
      console.log('✅ Analysis complete')

      // Use only selected number of prompts
      const prompts = allPrompts.slice(0, numberOfImages)

      // Step 2: Generate images with Gemini
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompts,
          apiKey: userPlan === 'free' ? apiKeys.gemini : null,
          replicateApiKey: userPlan === 'free' ? apiKeys.replicate : null,
          originalImage: compressedImage, // ส่งภาพที่บีบอัดแล้ว
          aspectRatio: aspectRatio // Pass selected aspect ratio
        }),
      })

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text()
        let error
        try {
          error = JSON.parse(errorText)
        } catch {
          error = { error: errorText }
        }
        throw new Error(error.error || 'Failed to generate images')
      }

      const { results } = await generateResponse.json()
      setResults(results)

      // Add results to history with better error handling
      try {
        // Add each result separately with error handling
        for (const result of results) {
          try {
            useStore.getState().addToHistory({
              ...result,
              imageUrl: result.imageUrl,
              originalImage: undefined
            })
          } catch (historyError) {
            console.error('Error adding to history:', historyError)
            // Continue with other images even if one fails
          }
        }
      } catch (error) {
        console.error('Error saving to history:', error)
        // Don't fail the whole operation if history save fails
      }
      
      // Update stats
      useStore.getState().incrementGenerated()
      
      console.log('✅ Generation complete')

    } catch (error) {
      console.error('❌ Processing error:', error)
      setError(error.message)
    } finally {
      setIsProcessing(false)
      setIsCompressing(false)
    }
  }

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('กรุณาอัพโหลดไฟล์รูปภาพ')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('ไฟล์ต้องมีขนาดไม่เกิน 10MB')
      return
    }

    console.log(`📁 File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target.result
      setPreview(base64)
      setStoreUploadedImage(base64) // Save to global store
      setReadyToProcess(true) // Don't process automatically
      setShowAdvanced(true) // Auto-open advanced settings when image uploaded
    }
    reader.readAsDataURL(file)
  }, [setStoreUploadedImage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: useStore((state) => state.isProcessing)
  })

  const isProcessing = useStore((state) => state.isProcessing)

  // Handle video generation
  const handleGenerateVideo = async () => {
    if (!videoPrompt) {
      setError('กรุณาใส่ prompt สำหรับสร้างวิดีโอ')
      return
    }

    if (!uploadedImage) {
      setError('กรุณาอัพโหลดรูปภาพก่อน')
      return
    }

    setIsGeneratingVideo(true)
    setError(null)
    setVideoResult(null)

    try {
      console.log('🎬 Starting video generation from ImageUploader...')

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: videoPrompt,
          image: uploadedImage,
          apiKey: apiKeys.openai || null,
          duration: videoDuration,
          resolution: videoResolution,
          aspectRatio: videoAspectRatio
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate video')
      }

      const data = await response.json()
      console.log('✅ Video generated:', data)

      setVideoResult(data)

      // Save to history
      try {
        useStore.getState().addVideoToHistory({
          videoUrl: data.videoUrl,
          prompt: videoPrompt,
          mode: 'image-to-video',
          duration: data.duration,
          resolution: data.resolution,
          aspectRatio: data.aspectRatio,
          sourceImage: uploadedImage,
          timestamp: new Date().toISOString()
        })
      } catch (historyError) {
        console.error('Error saving to history:', historyError)
      }

    } catch (error) {
      console.error('❌ Video generation error:', error)
      setError(error.message)
    } finally {
      setIsGeneratingVideo(false)
    }
  }

  // Handle process button click
  const handleProcess = () => {
    // Check if admin (premium plan doesn't need credits)
    if (userPlan !== 'premium') {
      // Check credits for normal users
      if (userCredits < numberOfImages) {
        setError(`ไม่มีเครดิตเพียงพอ (ต้องการ ${numberOfImages} เครดิต, คงเหลือ ${userCredits} เครดิต)`)
        return
      }

      // Deduct credits for normal users
      useCredits(numberOfImages)

      // Credits are handled by useCredits which now manages storage properly
    }

    if (uploadedImage) {
      processImage(uploadedImage)
      // Keep button visible for regeneration
      // setReadyToProcess(false) - removed
    }
  }

  // Handle reset
  const handleReset = () => {
    setPreview(null)
    setReadyToProcess(false)
    setError(null)
    setResults([])
    clearUploadedImage() // Clear from global store
    stopCamera()
  }

  // Start camera
  const startCamera = async () => {
    try {
      setCameraError(null)
      
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('เบราว์เซอร์ของคุณไม่รองรับการเข้าถึงกล้อง โปรดใช้เบราว์เซอร์รุ่นใหม่')
      }
      
      // Try different camera configurations for better compatibility
      const constraints = [
        // Try environment camera first (mobile rear camera)
        { 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        },
        // Try user-facing camera (mobile front camera or desktop)
        { 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        },
        // Try any available camera (desktop)
        { 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        },
        // Try with minimal constraints
        { 
          video: true 
        }
      ]
      
      let stream = null
      let error = null
      
      // Try each constraint until one works
      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          break
        } catch (err) {
          error = err
          continue
        }
      }
      
      if (!stream) {
        throw error || new Error('ไม่สามารถเข้าถึงกล้องได้')
      }
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // Add event listeners to detect when video is actually playing
        videoRef.current.onloadedmetadata = () => {
          console.log('Camera stream loaded successfully')
          // Play the video if it's not already playing
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(err => {
              console.error('Error playing video:', err)
              setCameraError('ไม่สามารถเปิดกล้องได้')
            })
          }
        }
        
        videoRef.current.onerror = (err) => {
          console.error('Video error:', err)
          setCameraError('เกิดข้อผิดพลาดกับการเชื่อมต่อกล้อง')
        }
        
        // Add play event listener
        videoRef.current.onplay = () => {
          console.log('Camera stream is now playing')
        }
      }
      setShowCamera(true)
    } catch (err) {
      console.error('Camera error:', err)
      let errorMessage = 'ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาตและตรวจสอบว่ามีกล้องเชื่อมต่ออยู่'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'ไม่ได้รับอนุญาตให้เข้าถึงกล้อง โปรดอนุญาตการเข้าถึงกล้องในเบราว์เซอร์'
      } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
        errorMessage = 'ไม่พบกล้องหรือไม่รองรับคุณสมบัติที่กำหนด'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'กล้องถูกใช้งานโดยแอปพลิเคชันอื่น'
      } else if (err.name === 'TypeError') {
        errorMessage = 'เบราว์เซอร์ของคุณไม่รองรับการเข้าถึงกล้อง โปรดใช้เบราว์เซอร์รุ่นใหม่'
      }
      
      setCameraError(errorMessage)
      setShowCamera(false)
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setShowCamera(false)
  }

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current) {
      setCameraError('ไม่สามารถเข้าถึงกล้องได้')
      return
    }
    
    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth || 640
      canvas.height = videoRef.current.videoHeight || 480
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('ไม่สามารถสร้าง canvas context ได้')
      }
      
      // Draw the current video frame to the canvas
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      
      // Convert to blob with error handling
      canvas.toBlob((blob) => {
        if (!blob) {
          setCameraError('ไม่สามารถจับภาพได้')
          return
        }
        
        try {
          const reader = new FileReader()
          reader.onload = (e) => {
            if (e.target && e.target.result) {
              const base64 = e.target.result
              setPreview(base64)
              setStoreUploadedImage(base64) // Save to global store
              setReadyToProcess(true)
              setShowAdvanced(true)
              stopCamera()
            } else {
              setCameraError('ไม่สามารถประมวลผลภาพได้')
            }
          }
          reader.onerror = () => {
            setCameraError('เกิดข้อผิดพลาดในการอ่านภาพ')
          }
          reader.readAsDataURL(blob)
        } catch (error) {
          console.error('FileReader error:', error)
          setCameraError('ไม่สามารถประมวลผลภาพได้')
        }
      }, 'image/jpeg', 0.9)
    } catch (error) {
      console.error('Capture error:', error)
      setCameraError('ไม่สามารถจับภาพได้: ' + error.message)
    }
  }

  return (
    <div>
      {/* Camera View */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="relative flex-1">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 left-0 right-0 flex justify-between px-4">
              <button
                onClick={stopCamera}
                className="p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                aria-label="ปิดกล้อง"
              >
                <X className="h-6 w-6" />
              </button>
              {cameraError && (
                <div className="bg-red-500 text-white px-4 py-2 rounded-lg">
                  {cameraError}
                </div>
              )}
            </div>
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <button
                onClick={capturePhoto}
                className="p-6 bg-white rounded-full border-4 border-gray-300 shadow-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="ถ่ายภาพ"
              >
                <div className="w-16 h-16 bg-red-500 rounded-full"></div>
              </button>
            </div>
            
            {/* Camera instructions */}
            <div className="absolute top-1/2 left-0 right-0 text-center text-white">
              <p className="bg-black/50 inline-block px-4 py-2 rounded-lg">
                ตรวจสอบให้แน่ใจว่ากล้องของคุณไม่ถูกบล็อก
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-300
          ${isDragActive
            ? 'border-yellow-500 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 backdrop-blur-sm'
            : 'border-gray-300/50 hover:border-yellow-400 hover:bg-gradient-to-br hover:from-yellow-50/30 hover:to-amber-50/30 hover:backdrop-blur-sm'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          ${preview ? 'bg-gradient-to-br from-gray-50/50 to-white/50 backdrop-blur-sm' : 'bg-white/20 backdrop-blur-sm'}
        `}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="relative">
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="mx-auto max-h-64 rounded-xl shadow-lg border-4 border-white"
              />
              {!isProcessing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReset()
                  }}
                  className="absolute -top-3 -right-3 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  aria-label="ลบรูปภาพ"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {!isProcessing && (
              <div className="mt-4">
                <p className="text-sm text-gray-700 font-medium">
                  คลิกหรือลากรูปใหม่มาเพื่อเปลี่ยน
                </p>
              </div>
            )}
            {isCompressing && (
              <div className="mt-4 flex items-center justify-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                <span className="text-sm text-gray-700 font-medium">กำลังบีบอัดรูปภาพ...</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              {isDragActive ? (
                <div className="p-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full">
                  <Image className="h-10 w-10 text-white animate-pulse" />
                </div>
              ) : isProcessing ? (
                <div className="p-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full">
                  <Loader2 className="h-10 w-10 text-white animate-spin" />
                </div>
              ) : (
                <div className="p-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full">
                  <Upload className="h-10 w-10 text-gray-600" />
                </div>
              )}
            </div>

            <p className="text-xl font-bold text-gray-800 mb-2">
              {isDragActive
                ? 'วางรูปได้เลย'
                : isProcessing
                ? 'กำลังประมวลผลรูปภาพ...'
                : 'ลากและวางรูปสินค้าที่นี่'}
            </p>

            <p className="text-gray-600">
              หรือ <span className="text-yellow-600 font-bold">คลิกเพื่อเลือกไฟล์</span>
            </p>

            <p className="text-sm text-gray-500 mt-4">
              รองรับ: JPG, PNG, GIF, WebP (สูงสุด 10MB)
            </p>
          </>
        )}
      </div>

      {/* File Size Info */}
      {preview && !isProcessing && (
        <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-gray-600">
          <AlertCircle className="h-4 w-4" />
          <span>รูปภาพจะถูกปรับขนาดอัตโนมัติเพื่อประสิทธิภาพที่ดีขึ้น</span>
        </div>
      )}

      {/* Process Controls */}
      {readyToProcess && (
        <div className="mt-5 p-5 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 backdrop-blur-sm border-2 border-yellow-300/50 rounded-2xl shadow-lg">
          {/* Output Mode Selection */}
          <div className="mb-5">
            <h3 className="font-bold text-gray-800 mb-3 text-lg">เลือกประเภทผลลัพธ์:</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOutputMode('image')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  outputMode === 'image'
                    ? 'border-yellow-500 bg-yellow-50 shadow-lg'
                    : 'border-gray-300 hover:border-yellow-300 bg-white'
                }`}
              >
                <Image className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                <div className="font-bold text-gray-800">สร้างภาพโฆษณา</div>
                <div className="text-xs text-gray-600 mt-1">1-4 ภาพ, หลายสไตล์</div>
              </button>
              <button
                onClick={() => setOutputMode('video')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  outputMode === 'video'
                    ? 'border-red-500 bg-red-50 shadow-lg'
                    : 'border-gray-300 hover:border-red-300 bg-white'
                }`}
              >
                <Film className="h-6 w-6 mx-auto mb-2 text-red-600" />
                <div className="font-bold text-gray-800">สร้างวิดีโอ</div>
                <div className="text-xs text-gray-600 mt-1">Sora 2, 5-20 วินาที</div>
              </button>
            </div>
          </div>

          <h3 className="font-bold text-gray-800 mb-4 text-lg">
            {outputMode === 'image' ? 'ตั้งค่าการสร้างภาพ' : 'ตั้งค่าการสร้างวิดีโอ'}
          </h3>

          {/* Image Mode Settings */}
          {outputMode === 'image' && (
            <>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  จำนวนภาพที่ต้องการสร้าง: <span className="text-yellow-600">{numberOfImages}</span>
                </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setNumberOfImages(num)}
                  className={`px-4 py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${
                    numberOfImages === num
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg'
                      : 'bg-white/50 backdrop-blur-sm text-gray-700 border border-white/30 hover:bg-white/70'
                  }`}
                >
                  {num} ภาพ
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              ขนาดรูปภาพ (Aspect Ratio): <span className="text-yellow-600">{aspectRatio}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { ratio: '1:1', label: 'จตุรัส 1:1', icon: '⬛' },
                { ratio: '16:9', label: 'แนวนอน 16:9', icon: '▭' },
                { ratio: '9:16', label: 'แนวตั้ง 9:16', icon: '▯' },
                { ratio: '4:3', label: 'แนวนอน 4:3', icon: '▬' },
                { ratio: '3:4', label: 'แนวตั้ง 3:4', icon: '▮' },
                { ratio: '21:9', label: 'ไวด์ 21:9', icon: '▬' }
              ].map(({ ratio, label, icon }) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`px-3 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                    aspectRatio === ratio
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                      : 'bg-white/50 backdrop-blur-sm text-gray-700 border border-white/30 hover:bg-white/70'
                  }`}
                >
                  <div className="text-xl mb-1">{icon}</div>
                  <div className="text-xs">{label}</div>
                </button>
              ))}
            </div>
          </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] shadow-lg"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      กำลังประมวลผล...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <Wand2 className="h-5 w-5 mr-2" />
                      สร้างภาพโฆษณา ({numberOfImages} ภาพ)
                    </span>
                  )}
                </button>

                <button
                  onClick={handleReset}
                  className="px-6 py-4 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 font-bold rounded-xl transition-all transform hover:scale-105 shadow-md"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </>
          )}

          {/* Video Mode Settings */}
          {outputMode === 'video' && (
            <>
              {/* Video Prompt */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Prompt สำหรับวิดีโอ (อธิบายการเคลื่อนไหว, บรรยากาศ):
                </label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="เช่น: Camera slowly zooms in on the product, soft lighting creates a warm atmosphere, product rotates 360 degrees smoothly, cinematic feel with dramatic shadows"
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              {/* Duration */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  ความยาววิดีโอ: <span className="text-red-600">{videoDuration} วินาที</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map(sec => (
                    <button
                      key={sec}
                      onClick={() => setVideoDuration(sec)}
                      className={`px-4 py-3 rounded-xl font-bold transition-all ${
                        videoDuration === sec
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                          : 'bg-white/50 backdrop-blur-sm text-gray-700 border border-white/30 hover:bg-white/70'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  ความละเอียด: <span className="text-red-600">{videoResolution}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['480p', '720p', '1080p'].map(res => (
                    <button
                      key={res}
                      onClick={() => setVideoResolution(res)}
                      className={`px-4 py-3 rounded-xl font-bold transition-all ${
                        videoResolution === res
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                          : 'bg-white/50 backdrop-blur-sm text-gray-700 border border-white/30 hover:bg-white/70'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  อัตราส่วนภาพ: <span className="text-red-600">{videoAspectRatio}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { ratio: '16:9', label: 'แนวนอน', icon: '▭' },
                    { ratio: '9:16', label: 'แนวตั้ง', icon: '▯' },
                    { ratio: '1:1', label: 'จตุรัส', icon: '⬛' }
                  ].map(({ ratio, label, icon }) => (
                    <button
                      key={ratio}
                      onClick={() => setVideoAspectRatio(ratio)}
                      className={`px-3 py-3 rounded-xl font-medium transition-all ${
                        videoAspectRatio === ratio
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                          : 'bg-white/50 backdrop-blur-sm text-gray-700 border border-white/30 hover:bg-white/70'
                      }`}
                    >
                      <div className="text-xl mb-1">{icon}</div>
                      <div className="text-xs">{label} {ratio}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleGenerateVideo}
                  disabled={isGeneratingVideo || !videoPrompt}
                  className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] shadow-lg"
                >
                  {isGeneratingVideo ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      กำลังสร้างวิดีโอ... (1-3 นาที)
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <Film className="h-5 w-5 mr-2" />
                      สร้างวิดีโอด้วย Sora 2
                    </span>
                  )}
                </button>

                <button
                  onClick={handleReset}
                  className="px-6 py-4 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 font-bold rounded-xl transition-all transform hover:scale-105 shadow-md"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>

              {/* Video Result */}
              {videoResult && (
                <div className="mt-6 p-6 bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-red-200 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center">
                      <Play className="h-5 w-5 mr-2 text-red-500" />
                      วิดีโอที่สร้างเสร็จแล้ว
                    </h3>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch(videoResult.videoUrl)
                          const blob = await response.blob()
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `sora-video-${Date.now()}.mp4`
                          document.body.appendChild(a)
                          a.click()
                          window.URL.revokeObjectURL(url)
                          document.body.removeChild(a)
                        } catch (error) {
                          console.error('Download error:', error)
                        }
                      }}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center space-x-2 transition-all"
                    >
                      <Download className="h-4 w-4" />
                      <span>ดาวน์โหลด</span>
                    </button>
                  </div>

                  <video
                    src={videoResult.videoUrl}
                    controls
                    className="w-full rounded-xl border-2 border-gray-200 shadow-lg"
                  />

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-600">
                    <div className="p-2 bg-white rounded-lg">
                      <span className="font-bold">ความยาว:</span> {videoResult.duration}s
                    </div>
                    <div className="p-2 bg-white rounded-lg">
                      <span className="font-bold">ความละเอียด:</span> {videoResult.resolution}
                    </div>
                    <div className="p-2 bg-white rounded-lg">
                      <span className="font-bold">อัตราส่วน:</span> {videoResult.aspectRatio}
                    </div>
                    <div className="p-2 bg-white rounded-lg">
                      <span className="font-bold">โหมด:</span> Image→Video
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  <span className="font-bold">💡 เคล็ดลับ:</span> อธิบายการเคลื่อนไหว มุมกล้อง และบรรยากาศที่ต้องการให้ละเอียด เพื่อผลลัพธ์ที่ดีที่สุด
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Advanced Settings - Auto shows when image uploaded */}
      {preview && (
        <div className="mt-5">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center space-x-2 text-sm font-semibold transition-all duration-300 ${
              showAdvanced
                ? 'text-yellow-600'
                : 'text-gray-700 hover:text-yellow-600'
            }`}
          >
            <Wand2 className="h-4 w-4" />
            <span>
              {showAdvanced ? '▼ ซ่อนการตั้งค่าขั้นสูง' : '▶ แสดงการตั้งค่าขั้นสูง'}
            </span>
          </button>

        {showAdvanced && (
          <div className="mt-4 space-y-5 p-5 bg-white/20 backdrop-blur-lg rounded-2xl border border-white/30 shadow-lg">
            {/* Prompt Style Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-3">
                เลือกสไตล์ Prompt:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <button
                  onClick={() => {
                    setSelectedPromptStyle('premium')
                    setMainPrompt(premiumPrompt)
                    setCustomPrompt(premiumPrompt)
                    setUseCustomPrompt(false) // Reset custom prompt toggle
                  }}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                    selectedPromptStyle === 'premium' && !useCustomPrompt
                      ? 'border-yellow-500 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 shadow-lg'
                      : 'border-white/30 bg-white/20 hover:border-yellow-300/50 hover:bg-white/30'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="mb-2 p-2 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg">
                      <span className="text-white font-bold text-xl">💎</span>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-800">พรีเมี่ยมหรูหรา</div>
                      <div className="text-xs mt-1 text-gray-600">วางบนพื้นผิวหรูหรา</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedPromptStyle('floating')
                    setMainPrompt(floatingPrompt)
                    setCustomPrompt(floatingPrompt)
                    setUseCustomPrompt(false) // Reset custom prompt toggle
                  }}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                    selectedPromptStyle === 'floating' && !useCustomPrompt
                      ? 'border-purple-500 bg-gradient-to-r from-purple-100/50 to-pink-100/50 shadow-lg'
                      : 'border-white/30 bg-white/20 hover:border-purple-300/50 hover:bg-white/30'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="mb-2 p-2 bg-gradient-to-r from-purple-400 to-purple-500 rounded-lg">
                      <span className="text-white font-bold text-xl">🎈</span>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-800">ลอยในอากาศ</div>
                      <div className="text-xs mt-1 text-gray-600">ลอยพร้อมส่วนประกอบ</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedPromptStyle('moody')
                    setMainPrompt(moodyPrompt)
                    setCustomPrompt(moodyPrompt)
                    setUseCustomPrompt(false) // Reset custom prompt toggle
                  }}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                    selectedPromptStyle === 'moody' && !useCustomPrompt
                      ? 'border-indigo-500 bg-gradient-to-r from-indigo-100/50 to-blue-100/50 shadow-lg'
                      : 'border-white/30 bg-white/20 hover:border-indigo-300/50 hover:bg-white/30'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="mb-2 p-2 bg-gradient-to-r from-indigo-400 to-blue-500 rounded-lg">
                      <span className="text-white font-bold text-xl">🌙</span>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-800">โทนภาพ Moody</div>
                      <div className="text-xs mt-1 text-gray-600">งานโฆษณา rustic, moody</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedPromptStyle('cinematic')
                    setMainPrompt(cinematicPrompt)
                    setCustomPrompt(cinematicPrompt)
                    setUseCustomPrompt(false)
                  }}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                    selectedPromptStyle === 'cinematic' && !useCustomPrompt
                      ? 'border-red-500 bg-gradient-to-r from-red-100/50 to-orange-100/50 shadow-lg'
                      : 'border-white/30 bg-white/20 hover:border-red-300/50 hover:bg-white/30'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="mb-2 p-2 bg-gradient-to-r from-red-400 to-orange-500 rounded-lg">
                      <span className="text-white font-bold text-xl">🎬</span>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-800">3D Cinematic</div>
                      <div className="text-xs mt-1 text-gray-600">ภาพระเบิดพลัง</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setSelectedPromptStyle('productHero')
                    setMainPrompt(productHeroPrompt)
                    setCustomPrompt(productHeroPrompt)
                    setUseCustomPrompt(false) // Reset custom prompt toggle
                  }}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                    selectedPromptStyle === 'productHero' && !useCustomPrompt
                      ? 'border-orange-500 bg-gradient-to-r from-orange-100/50 to-red-100/50 shadow-lg'
                      : 'border-white/30 bg-white/20 hover:border-orange-300/50 hover:bg-white/30'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="mb-2 p-2 bg-gradient-to-r from-orange-400 to-orange-500 rounded-lg">
                      <span className="text-white font-bold text-xl">🏆</span>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-800">Product Hero</div>
                      <div className="text-xs mt-1 text-gray-600">Hero shot สไตล์โปร</div>
                    </div>
                  </div>
                </button>

                {/* Custom Prompt Option */}
                <button
                  onClick={() => {
                    setUseCustomPrompt(true)
                    setSelectedPromptStyle('custom')
                    setMainPrompt('')
                    setCustomPrompt('')
                  }}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                    useCustomPrompt
                      ? 'border-green-500 bg-gradient-to-r from-green-100/50 to-emerald-100/50 shadow-lg'
                      : 'border-white/30 bg-white/20 hover:border-green-300/50 hover:bg-white/30'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="mb-2 p-2 bg-gradient-to-r from-green-400 to-green-500 rounded-lg">
                      <span className="text-white font-bold text-xl">✏️</span>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-800">ใส่พ้อมเอง</div>
                      <div className="text-xs mt-1 text-gray-600">เขียน Prompt เอง</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Prompt Text Area - Only show when useCustomPrompt is true */}
            {useCustomPrompt && (
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">
                  ปรับแต่ง Prompt เพิ่มเติม:
                </label>
                <div className="relative">
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="เขียน Prompt ของคุณเองที่นี่ หรือกดปุ่มวิเคราะห์ด้วย AI..."
                    className="w-full px-4 py-3 pr-32 bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300 resize-none modern-textarea"
                    rows={5}
                  />
                  {/* AI Analyze Button - Opens External Link */}
                  {preview && (
                    <a
                      href="https://chatgpt.com/g/g-68d4b28a81148191b1fe407432225d34-kh-prompt-aichthmaaphaaphsinkhaaopset-rkhaay-prompt-d"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm rounded-lg font-medium shadow-lg transition-all duration-300 flex items-center gap-2 no-underline"
                    >
                      <Brain className="h-4 w-4" />
                      วิเคราะห์ด้วย AI
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons - Only show when using custom prompt */}
            {useCustomPrompt && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setCustomPrompt('')
                    setMainPrompt('')
                  }}
                  className="flex items-center space-x-1 text-sm bg-gradient-to-r from-yellow-100 to-amber-100 hover:from-yellow-200 hover:to-amber-200 text-yellow-800 px-4 py-2 rounded-xl transition-all duration-300 font-medium shadow-md"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>รีเซ็ต Prompt</span>
                </button>

                <button
                  onClick={() => setCustomPrompt('')}
                  className="text-sm bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 px-4 py-2 rounded-xl transition-all duration-300 font-medium shadow-md"
                >
                  ล้าง
                </button>
              </div>
            )}

            <div className="p-4 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 rounded-xl border border-blue-200/50 shadow-sm">
              <p className="text-sm text-blue-800">
                <span className="font-bold">💡 เคล็ดลับ:</span> Prompt ที่ดีควรระบุ:
                บรรยากาศ, แสง, สี, มุมกล้อง, สไตล์, และความรู้สึกที่ต้องการ
              </p>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Upload tips */}
      <div className="mt-5 p-4 bg-gradient-to-r from-yellow-100/50 to-amber-100/50 backdrop-blur-sm rounded-xl border border-yellow-200/50 shadow-sm">
        <p className="text-sm text-yellow-800">
          <span className="font-bold">Pro tip:</span> ใช้รูปสินค้าคุณภาพสูง
          พื้นหลังสะอาด แสงสว่างชัดเจน เพื่อผลลัพธ์ที่ดีที่สุด
          (ระบบจะบีบอัดรูปอัตโนมัติ)
        </p>
      </div>
    </div>
  )
}