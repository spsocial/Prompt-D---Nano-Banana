# 🚨 วิธีแก้ปัญหา API Quota หมด

## ❌ ปัญหาที่พบตอนนี้
- **API quota หมดทุก 1-2 นาที** (Free tier limit)
- **Model: gemini-2.5-flash-image-preview** ต้องจ่ายเงิน
- ระบบใช้ภาพ mock แทนภาพจริง

## ✅ วิธีแก้ไขถาวร (เลือก 1 วิธี)

### 1. 🎯 อัปเกรดเป็น Google Cloud Paid Account
```bash
# 1. ไปที่ https://console.cloud.google.com/billing
# 2. อัปเกรดจาก Free tier เป็น Paid
# 3. สร้าง API key ใหม่จาก Cloud Console
# 4. ใช้ API key ใหม่ในแอป
```
**ราคา**: ~1.4 บาท/ภาพ
**ข้อดี**: ไม่มี quota limit, เสถียร

### 2. 💰 ใช้ OpenAI DALL-E 3 แทน
```javascript
// 1. สมัคร https://platform.openai.com
// 2. เติมเครดิต $5-10
// 3. แก้ไขโค้ด:

const response = await openai.images.generate({
  model: "dall-e-3",
  prompt: "luxury product advertisement",
  size: "1024x1024"
})
```
**ราคา**: ~1.4 บาท/ภาพ
**ข้อดี**: ง่าย, คุณภาพดีมาก

### 3. 🔧 ใช้ Replicate (แนะนำ!)
```javascript
// 1. สมัคร https://replicate.com
// 2. ได้ free credits $5
// 3. ใช้ Stable Diffusion XL

const output = await replicate.run(
  "stability-ai/sdxl:...",
  { input: { prompt: "..." } }
)
```
**ราคา**: ~0.04 บาท/ภาพ (ถูกมาก!)
**ข้อดี**: ถูก, มีโมเดลเยอะ

### 4. 🆓 ใช้หลาย API Keys สลับกัน
```javascript
const apiKeys = [
  'AIzaSy...key1',
  'AIzaSy...key2',
  'AIzaSy...key3'
]

// สลับใช้ key
const currentKey = apiKeys[Math.floor(Date.now() / 60000) % apiKeys.length]
```
**ข้อดี**: ฟรี
**ข้อเสีย**: ยุ่งยาก, ไม่เสถียร

## 📊 เปรียบเทียบ

| วิธี | ราคา/ภาพ | Setup | เสถียรภาพ | แนะนำ |
|-----|----------|-------|-----------|-------|
| Google Cloud Paid | 1.4 บาท | ปานกลาง | ⭐⭐⭐⭐⭐ | ✅ |
| OpenAI DALL-E 3 | 1.4 บาท | ง่าย | ⭐⭐⭐⭐⭐ | ✅ |
| Replicate | 0.04 บาท | ง่าย | ⭐⭐⭐⭐ | ✅✅ |
| หลาย API Keys | ฟรี | ยุ่งยาก | ⭐⭐ | ❌ |

## 💡 แนะนำ Replicate!

### เหตุผล:
1. **ถูกมาก** - 35 เท่าถูกกว่า Gemini/OpenAI
2. **Free credits $5** - สร้างได้ ~3,000 ภาพ
3. **Setup ง่าย** - 5 นาที
4. **คุณภาพดี** - Stable Diffusion XL

### วิธี Setup Replicate:
```bash
# 1. สมัคร https://replicate.com
# 2. Copy API token
# 3. ใส่ใน API Key Manager ของแอป
# 4. เสร็จ! ใช้งานได้เลย
```

## 🔴 สรุป
**ปัจจุบัน**: ใช้ภาพ mock เพราะ API quota หมด
**แก้ไข**: ใช้ Replicate หรือ OpenAI แทน
**ระยะยาว**: อัปเกรด Google Cloud เป็น Paid

ต้องการให้ผมเปลี่ยนไปใช้ Replicate แทนไหมครับ?