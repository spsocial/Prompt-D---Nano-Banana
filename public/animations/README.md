# 🎬 Animation Files

วาง Lottie animation files (.json) ไว้ที่นี่

## 📂 ไฟล์ที่ต้องการ:

```
animations/
├── image-generator.json    # สำหรับ Image Generator card
├── video-generator.json    # สำหรับ Video Generator card
├── sparkles.json           # สำหรับปุ่ม Generate
├── loading.json            # สำหรับ Loading state
├── success.json            # สำหรับ Success state
└── upload.json             # สำหรับ Upload file
```

## 🎨 แหล่ง Animation ฟรี:

- **LottieFiles:** https://lottiefiles.com/
- **IconScout:** https://iconscout.com/lottie-animations
- **Lordicon:** https://lordicon.com/

## 💡 วิธีใช้:

1. ดาวน์โหลด Lottie animation file (.json)
2. วางไฟล์ในโฟลเดอร์นี้
3. อัพเดท component ให้ import animation:

```jsx
import imageGeneratorAnim from '/animations/image-generator.json'

<LottieAnimation
  animationPath={imageGeneratorAnim}
  width={80}
  height={80}
/>
```

## 📝 Note:

ตอนนี้ใช้ emoji placeholder (`AnimationPlaceholder`) ไว้ก่อน
เมื่อวาง animation files แล้ว ให้แทนที่ `AnimationPlaceholder` ด้วย `LottieAnimation`
