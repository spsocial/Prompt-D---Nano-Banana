# 🎨 Gemini 2.5 Flash Image Preview Setup Guide

## 📋 ข้อกำหนดสำคัญ

ตามเอกสาร: https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-image-preview

### ⚠️ ข้อจำกัดของ Model นี้:
1. **Early Access Only** - ต้องขอสิทธิ์พิเศษ
2. **ไม่ใช่ทุก API key จะใช้ได้**
3. **Quota จำกัดมากสำหรับ Free tier**
4. **อาจไม่มีในบางภูมิภาค**

## 🔧 วิธีตั้งค่าให้ใช้งานได้

### 1. ตรวจสอบสิทธิ์ API Key
```bash
# ตรวจสอบว่า API key รองรับ model นี้หรือไม่
curl -X GET "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY"
```

ดูว่ามี `models/gemini-2.5-flash-image-preview` ในรายการหรือไม่

### 2. ขอ Early Access (ถ้ายังไม่มี)
1. ไปที่ [Google AI Studio](https://aistudio.google.com)
2. ไปที่ Settings > Early Access
3. Request access สำหรับ "Image Generation Models"
4. รอการอนุมัติ (อาจใช้เวลา 1-3 วัน)

### 3. Format ที่ถูกต้องสำหรับ Image Generation

```javascript
// ❌ ผิด - ไม่ได้ภาพ
{
  contents: [{
    role: 'user',
    parts: [{ text: 'สร้างภาพแมว' }]
  }]
}

// ✅ ถูก - ได้ภาพ
{
  contents: [{
    role: 'user',
    parts: [{
      text: 'Generate an image of: cute cat sitting on sofa, photorealistic, high quality'
    }]
  }],
  generationConfig: {
    temperature: 0.4,
    topK: 32,
    topP: 1,
    maxOutputTokens: 8192
  }
}
```

### 4. Response Format
```javascript
// Response จะมีภาพเป็น base64
{
  candidates: [{
    content: {
      parts: [{
        inlineData: {
          mimeType: "image/png",
          data: "iVBORw0KGgoAAAA..." // base64 image
        }
      }]
    }
  }]
}
```

## 🚫 ปัญหาที่พบบ่อย

### Error: 404 Model not found
**สาเหตุ**: API key ไม่มีสิทธิ์เข้าถึง
**แก้ไข**: ขอ Early Access หรือใช้ model อื่น

### Error: 429 Quota exceeded
**สาเหตุ**: ใช้เกิน limit (Free tier = 2 requests/minute)
**แก้ไข**: รอ 1 นาที หรือ upgrade เป็น paid

### Error: 400 Invalid request
**สาเหตุ**: Format prompt ไม่ถูกต้อง
**แก้ไข**: ใช้ภาษาอังกฤษ + คำสั่งชัดเจน

## ✅ ทางเลือกที่ใช้งานได้จริง

### 1. OpenAI DALL-E 3
```javascript
const openai = new OpenAI({ apiKey: 'sk-...' })
const image = await openai.images.generate({
  model: "dall-e-3",
  prompt: "product advertisement",
  size: "1024x1024"
})
```
**ข้อดี**: ง่าย, เสถียร, คุณภาพสูง
**ราคา**: $0.04/ภาพ

### 2. Replicate (Stable Diffusion)
```javascript
const replicate = new Replicate({ auth: 'r8_...' })
const output = await replicate.run(
  "stability-ai/sdxl:...",
  { input: { prompt: "..." } }
)
```
**ข้อดี**: ถูก, โมเดลเยอะ
**ราคา**: $0.0011/ภาพ

### 3. Stability AI API
```javascript
const response = await fetch(
  "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
  {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ text_prompts: [...] })
  }
)
```
**ข้อดี**: คุณภาพดี, customize ได้เยอะ
**ราคา**: $0.002/ภาพ

## 📊 เปรียบเทียบ

| Service | ทำงานจริง | ราคา | Setup | คุณภาพ |
|---------|----------|------|-------|---------|
| Gemini 2.5 Flash | ❓ ต้องขอสิทธิ์ | Free/Paid | ยาก | ดีมาก |
| OpenAI DALL-E 3 | ✅ | $0.04 | ง่ายมาก | ดีที่สุด |
| Replicate | ✅ | $0.001 | ง่าย | ดี |
| Stability AI | ✅ | $0.002 | ปานกลาง | ดีมาก |

## 💡 สรุปคำแนะนำ

**สำหรับ Production**: ใช้ OpenAI หรือ Replicate
**สำหรับทดสอบ**: ใช้ Mock images จาก Unsplash
**สำหรับอนาคต**: รอ Gemini เปิดให้ใช้งานทั่วไป

## 🔗 Resources
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [OpenAI Platform](https://platform.openai.com)
- [Replicate](https://replicate.com)
- [Stability AI](https://stability.ai)