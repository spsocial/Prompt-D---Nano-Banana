import { useCallback, useState, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import useStore from '../lib/store'
import { Upload, Image, Loader2, Wand2, RefreshCw, AlertCircle, X, Camera, Brain } from 'lucide-react'
import SuccessNotification from './SuccessNotification'

export default function ImageUploader() {
  const [mode, setMode] = useState('withImage') // 'withImage' or 'promptOnly'
  const [previews, setPreviews] = useState([]) // Changed to array for multiple images
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [isCompressing, setIsCompressing] = useState(false)
  const [numberOfImages, setNumberOfImages] = useState(1) // เริ่มต้นที่ 1 ภาพเพื่อป้องกันการสร้างมากเกินไป
  const [aspectRatio, setAspectRatio] = useState('1:1') // Default aspect ratio
  const [readyToProcess, setReadyToProcess] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [useCustomPrompt, setUseCustomPrompt] = useState(false) // New state for custom prompt toggle
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const MAX_IMAGES = 10 // Maximum 10 reference images for Nano Banana Edit
  
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
      setPreviews(prev => {
        if (prev.includes(uploadedImage)) return prev
        return [...prev, uploadedImage]
      })
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

  const processImage = async (base64Images = []) => {
    setIsProcessing(true)
    setError(null)
    setResults([])

    try {
      let compressedImages = []

      // Compress images for withImage mode
      if (base64Images.length > 0 && mode === 'withImage') {
        setIsCompressing(true)
        console.log(`🗜️ Compressing ${base64Images.length} image(s)...`)

        for (const base64Image of base64Images) {
          const compressedImage = await compressImage(base64Image, 1024, 0.85)
          const originalSize = (base64Image.length * 0.75) / 1024 / 1024
          const compressedSize = (compressedImage.length * 0.75) / 1024 / 1024
          console.log(`✅ Compressed: ${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB`)
          compressedImages.push(compressedImage)
        }

        setIsCompressing(false)
      } else if (mode === 'promptOnly') {
        console.log('🎨 Creating image from prompt only (no image input)')
      }

      // Image+Text and Text-Only modes
      let prompts = []

      if (mode === 'withImage') {
        // Image-to-Image: Analyze image first (use first image for analysis)
        const promptToUse = useCustomPrompt ? customPrompt : (customPrompt || mainPrompt)

        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: compressedImages[0], // Use first image for analysis
            images: compressedImages, // Send all images
            apiKey: userPlan === 'free' ? apiKeys.gemini : null,
            customPrompt: promptToUse,
            selectedStyle: selectedPromptStyle,
            userId: localStorage.getItem('nano_user_id'),
            numberOfImages: numberOfImages,
            aspectRatio: aspectRatio
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
        prompts = allPrompts.slice(0, numberOfImages)
      } else {
        // Text-to-Image: Skip analyze, use custom prompt directly
        console.log('📝 Using custom prompt for text-to-image')
        prompts = Array(numberOfImages).fill(null).map((_, i) => ({
          style: `Text-to-Image ${i + 1}`,
          prompt: customPrompt
        }))
      }

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
          originalImage: compressedImages[0], // ส่งภาพแรกสำหรับ backward compatibility
          originalImages: compressedImages, // ส่งรูปทั้งหมด
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

      // Show success popup
      setShowSuccessPopup(true)
      setTimeout(() => setShowSuccessPopup(false), 8000)

      // Scroll to results
      setTimeout(() => {
        const resultsElement = document.querySelector('[class*="ResultGallery"]') ||
                               document.querySelector('[class*="ภาพโฆษณาที่สร้างแล้ว"]')
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 500)

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
    if (!acceptedFiles || acceptedFiles.length === 0) return

    // Check if adding these would exceed the limit
    const remainingSlots = MAX_IMAGES - previews.length
    if (remainingSlots <= 0) {
      setError(`สามารถแนบรูปได้สูงสุด ${MAX_IMAGES} รูปเท่านั้น`)
      return
    }

    const filesToProcess = acceptedFiles.slice(0, remainingSlots)

    filesToProcess.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('กรุณาอัพโหลดไฟล์รูปภาพ')
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('ไฟล์แต่ละไฟล์ต้องมีขนาดไม่เกิน 10MB')
        return
      }

      console.log(`📁 File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target.result
        setPreviews(prev => {
          if (prev.length >= MAX_IMAGES) return prev
          const newPreviews = [...prev, base64]
          // Save first image to global store for backward compatibility
          if (newPreviews.length === 1) {
            setStoreUploadedImage(base64)
          }
          return newPreviews
        })
        setReadyToProcess(true)
        setShowAdvanced(true)
        setError(null)
      }
      reader.readAsDataURL(file)
    })
  }, [setStoreUploadedImage, previews.length])

  // Remove a specific image
  const removeImage = (indexToRemove) => {
    setPreviews(prev => {
      const newPreviews = prev.filter((_, index) => index !== indexToRemove)
      // Update store if first image was removed
      if (indexToRemove === 0 && newPreviews.length > 0) {
        setStoreUploadedImage(newPreviews[0])
      } else if (newPreviews.length === 0) {
        clearUploadedImage()
        setReadyToProcess(false)
      }
      return newPreviews
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true, // Allow multiple files
    maxSize: 10 * 1024 * 1024, // 10MB per file
    disabled: useStore((state) => state.isProcessing) || previews.length >= MAX_IMAGES
  })

  const isProcessing = useStore((state) => state.isProcessing)

  // Handle process button click
  const handleProcess = () => {
    // Validate inputs based on mode
    if (mode === 'promptOnly' && !customPrompt) {
      setError('กรุณาใส่ Prompt สำหรับสร้างภาพ')
      return
    }

    if (mode === 'withImage' && previews.length === 0) {
      setError('กรุณาอัพโหลดรูปภาพ')
      return
    }

    // Determine credit cost
    const creditsNeeded = numberOfImages

    // Check if admin (premium plan doesn't need credits)
    if (userPlan !== 'premium') {
      // Check credits for normal users
      if (userCredits < creditsNeeded) {
        setError(`ไม่มีเครดิตเพียงพอ (ต้องการ ${creditsNeeded} เครดิต, คงเหลือ ${userCredits} เครดิต)`)
        return
      }

      // Deduct credits for normal users
      useCredits(creditsNeeded)
    }

    // Process based on mode
    if (mode === 'withImage' && previews.length > 0) {
      processImage(previews) // Send all images
    } else if (mode === 'promptOnly') {
      processImage([]) // No images, prompt-only generation
    }
  }

  // Handle reset
  const handleReset = () => {
    setPreviews([])
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
              setPreviews(prev => {
                if (prev.length >= MAX_IMAGES) return prev
                const newPreviews = [...prev, base64]
                if (newPreviews.length === 1) {
                  setStoreUploadedImage(base64)
                }
                return newPreviews
              })
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

  // Handle style change
  const handleStyleChange = (e) => {
    const style = e.target.value
    setSelectedPromptStyle(style)

    if (style === 'custom') {
      setUseCustomPrompt(true)
      setMainPrompt('')
      setCustomPrompt('')
    } else {
      setUseCustomPrompt(false)
      const prompts = {
        premium: premiumPrompt,
        floating: floatingPrompt,
        moody: moodyPrompt,
        cinematic: cinematicPrompt,
        'product-hero': productHeroPrompt
      }
      const selectedPrompt = prompts[style] || premiumPrompt
      setMainPrompt(selectedPrompt)
      setCustomPrompt(selectedPrompt)
    }
  }

  return (
    <div>
      {/* Success Popup */}
      <SuccessNotification
        show={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        title="ภาพสร้างเสร็จแล้ว!"
        message={`สร้างภาพโฆษณาสำเร็จ ${numberOfImages} ภาพ กำลังแสดงผลด้านล่าง`}
        type="image"
        autoHideDuration={8000}
      />

      {/* 1. Mode Selector - 2 Button Toggle */}
      <div className="mb-6">
        <div className="relative inline-flex items-center bg-gray-200 rounded-full p-1 shadow-md mx-auto">
          <button
            onClick={() => {
              setMode('withImage')
              setReadyToProcess(false)
            }}
            className={`relative z-10 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
              mode === 'withImage' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Image className="h-5 w-5" />
            Image to Image
          </button>
          <button
            onClick={() => {
              setMode('promptOnly')
              setPreview(null)
              setReadyToProcess(true)
              setShowAdvanced(true)
            }}
            className={`relative z-10 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
              mode === 'promptOnly' ? 'text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Wand2 className="h-5 w-5" />
            Text to Image
          </button>
          {/* Sliding Background */}
          <div
            className={`absolute top-1 bottom-1 rounded-full transition-all duration-300 ${
              mode === 'withImage'
                ? 'left-1 right-1/2 bg-gradient-to-r from-yellow-400 to-yellow-500'
                : 'left-1/2 right-1 bg-gradient-to-r from-purple-500 to-purple-600'
            }`}
          />
        </div>
      </div>

      {/* 2. Conditional Content Based on Mode */}
      {mode === 'withImage' ? (
        /* Image to Image Mode: Upload Area First, then Prompt Below */
        <div className="space-y-6">
          {/* Multiple Images Preview Grid */}
          {previews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-gray-800">
                  รูปที่เลือก: {previews.length}/{MAX_IMAGES} รูป
                </label>
                <button
                  onClick={handleReset}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  ลบทั้งหมด
                </button>
              </div>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl border-2 border-gray-200 shadow-md"
                    />
                    {!isProcessing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImage(index)
                        }}
                        className="absolute top-1 right-1 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
              {isCompressing && (
                <div className="flex items-center justify-center space-x-2 py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                  <span className="text-sm text-gray-700 font-medium">กำลังบีบอัดรูปภาพ...</span>
                </div>
              )}
            </div>
          )}

          {/* Upload Area - Show if not at max */}
          {previews.length < MAX_IMAGES && (
            <div
              {...getRootProps()}
              className={`
              relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer
              transition-all duration-300
              ${isDragActive
                ? 'border-yellow-500 bg-gradient-to-br from-yellow-50/50 to-amber-50/50 backdrop-blur-sm'
                : 'border-gray-300/50 hover:border-yellow-400 hover:bg-gradient-to-br hover:from-yellow-50/30 hover:to-amber-50/30 hover:backdrop-blur-sm'
              }
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
              bg-white/20 backdrop-blur-sm
            `}
            >
              <input {...getInputProps()} />

              <div className="flex justify-center mb-3">
                {isDragActive ? (
                  <div className="p-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full">
                    <Image className="h-8 w-8 text-white animate-pulse" />
                  </div>
                ) : isProcessing ? (
                  <div className="p-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="p-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full">
                    <Upload className="h-8 w-8 text-gray-600" />
                  </div>
                )}
              </div>

              <p className="text-lg font-bold text-gray-800 mb-1">
                {isDragActive
                  ? 'วางรูปได้เลย'
                  : isProcessing
                  ? 'กำลังประมวลผลรูปภาพ...'
                  : previews.length > 0 ? 'เพิ่มรูปภาพ' : 'ลากและวางรูปสินค้าที่นี่'}
              </p>

              <p className="text-gray-600 text-sm">
                {previews.length > 0
                  ? `เหลือ ${MAX_IMAGES - previews.length} รูป`
                  : `คลิกเพื่อเลือกไฟล์ (สูงสุด ${MAX_IMAGES} รูป)`}
              </p>

              <p className="text-xs text-gray-500 mt-2">
                รองรับ: JPG, PNG, GIF, WebP (สูงสุด 10MB/รูป)
              </p>
            </div>
          )}

          {/* Max reached notice */}
          {previews.length >= MAX_IMAGES && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
              <p className="text-sm text-yellow-800">
                แนบรูปครบ {MAX_IMAGES} รูปแล้ว - ลบรูปเพื่อเพิ่มรูปใหม่
              </p>
            </div>
          )}

          {/* Show Prompt Section after image is uploaded */}
          {previews.length > 0 && (
            <>
              {/* 3. Prompt Style Selection - Beautiful Card Style */}
              <div>
                <label className="block text-lg font-bold text-gray-800 mb-3">
                  เลือกสไตล์ Prompt
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setSelectedPromptStyle('premium')
                      setMainPrompt(premiumPrompt)
                      setCustomPrompt(premiumPrompt)
                      setUseCustomPrompt(false)
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
                      setUseCustomPrompt(false)
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
                      setUseCustomPrompt(false)
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
                      setUseCustomPrompt(false)
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

              {/* 4. Prompt Textarea - Only show when custom */}
              {useCustomPrompt && (
                <div>
                  <label className="block text-lg font-bold text-gray-800 mb-3">
                    เขียน Prompt ของคุณเอง
                  </label>
                  <div className="relative">
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="เขียน Prompt ของคุณเองที่นี่ หรือกดปุ่มวิเคราะห์ด้วย AI..."
                      className="w-full px-4 py-3 bg-white/30 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-300 resize-none"
                      rows={6}
                    />
                    <a
                      href="https://chatgpt.com/g/g-68d4b28a81148191b1fe407432225d34-kh-prompt-aichthmaaphaaphsinkhaaopset-rkhaay-prompt-d"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm rounded-lg font-medium shadow-md transition-all duration-300 flex items-center gap-2 no-underline"
                    >
                      <Brain className="h-4 w-4" />
                      วิเคราะห์ AI
                    </a>
                  </div>
                </div>
              )}

              {/* 5. Size & Quantity Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-base font-bold text-gray-800 mb-2">จำนวนภาพ</label>
                  <select
                    value={numberOfImages}
                    onChange={(e) => setNumberOfImages(parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
                  >
                    {[1, 2, 3, 4].map(num => (
                      <option key={num} value={num}>{num} ภาพ ({num} เครดิต)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-800 mb-2">ขนาดภาพ</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  >
                    <option value="1:1">จตุรัส 1:1</option>
                    <option value="16:9">แนวนอน 16:9</option>
                    <option value="9:16">แนวตั้ง 9:16</option>
                    <option value="4:3">แนวนอน 4:3</option>
                    <option value="3:4">แนวตั้ง 3:4</option>
                    <option value="21:9">ไวด์ 21:9</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Text to Image Mode: Show Prompt Field Only */
        <div className="space-y-6">
          {/* Prompt Textarea - Large and Prominent */}
          <div>
            <label className="block text-2xl font-bold text-gray-800 mb-4">
              เขียน Prompt ของคุณเอง
            </label>
            <div className="relative">
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="อธิบายภาพที่คุณต้องการสร้าง... เช่น 'สินค้าลอยอยู่บนพื้นผิวหินอ่อนสีขาว มีแสงสว่างจากด้านข้าง บรรยากาศหรูหรา'"
                className="w-full px-5 py-4 bg-white border-2 border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all resize-none shadow-lg"
                rows={8}
              />
            </div>
          </div>

          {/* 5. Size & Quantity Dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">จำนวนภาพ</label>
              <select
                value={numberOfImages}
                onChange={(e) => setNumberOfImages(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all"
              >
                {[1, 2, 3, 4].map(num => (
                  <option key={num} value={num}>{num} ภาพ ({num} เครดิต)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">ขนาดภาพ</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
              >
                <option value="1:1">จตุรัส 1:1</option>
                <option value="16:9">แนวนอน 16:9</option>
                <option value="9:16">แนวตั้ง 9:16</option>
                <option value="4:3">แนวนอน 4:3</option>
                <option value="3:4">แนวตั้ง 3:4</option>
                <option value="21:9">ไวด์ 21:9</option>
              </select>
            </div>
          </div>
        </div>
      )}

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

      {/* OLD UPLOAD AREA - REPLACED WITH NEW DESIGN ABOVE */}
      {false && mode === 'withImage' && (
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
      )}

      {/* 6. Generate Button - Large Prominent Button */}
      {(mode === 'withImage' ? previews.length > 0 : true) && (
        <div className="mt-6">
          <button
            onClick={handleProcess}
            disabled={isProcessing || (mode === 'promptOnly' && !customPrompt)}
            className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 ${
              mode === 'withImage'
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
                : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                กำลังประมวลผล...
              </>
            ) : mode === 'withImage' ? (
              <>
                <Wand2 className="h-6 w-6" />
                สร้างภาพจากรูปสินค้า ({numberOfImages} ภาพ = {numberOfImages} เครดิต)
              </>
            ) : (
              <>
                <Wand2 className="h-6 w-6" />
                สร้างภาพจาก Prompt ({numberOfImages} ภาพ = {numberOfImages} เครดิต)
              </>
            )}
          </button>

          {/* Reset Button for Image Mode */}
          {mode === 'withImage' && previews.length > 0 && !isProcessing && (
            <button
              onClick={handleReset}
              className="w-full mt-3 px-6 py-3 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 font-bold rounded-xl transition-all transform hover:scale-[1.01] shadow-md flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              เริ่มใหม่
            </button>
          )}
        </div>
      )}

      {/* File Size Info */}
      {previews.length > 0 && !isProcessing && (
        <div className="mt-3 flex items-center justify-center space-x-2 text-sm text-gray-600">
          <AlertCircle className="h-4 w-4" />
          <span>รูปภาพจะถูกปรับขนาดอัตโนมัติเพื่อประสิทธิภาพที่ดีขึ้น</span>
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