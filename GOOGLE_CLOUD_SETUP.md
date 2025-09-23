# 🔥 วิธีใช้ Gemini Image Generation กับ Google Cloud (มีบัตรแล้ว)

## ✅ คุณผูกบัตรแล้ว - ทำต่อดังนี้:

### 1. สร้าง API Key จาก Google Cloud Console
1. ไปที่: https://console.cloud.google.com
2. เลือก Project ของคุณ (หรือสร้างใหม่)
3. ไปที่ **APIs & Services > Credentials**
4. คลิก **+ CREATE CREDENTIALS > API Key**
5. Copy API key ใหม่ที่ได้

### 2. เปิด API ที่จำเป็น
```bash
# ใน Cloud Console หรือ Cloud Shell
gcloud services enable generativelanguage.googleapis.com
```

หรือไปที่ APIs & Services > Library แล้วค้นหา:
- **Generative Language API** - คลิก Enable

### 3. ตรวจสอบ Billing
- ไปที่ Billing > Account management
- ดูว่า "Billing account is active" ✅
- ดูว่า Project ผูกกับ billing account แล้ว

### 4. ตั้งค่า API Key ที่ถูกต้อง
```javascript
// ใช้ API key จาก Google Cloud (ไม่ใช่จาก AI Studio)
const apiKey = 'AIza...' // จาก Google Cloud Console

// Endpoint ที่ถูกต้องสำหรับ billing account
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`
```

## 🎯 ตรวจสอบว่าใช้ได้หรือไม่

### Test Command:
```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=YOUR_CLOUD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "role": "user",
      "parts": [{
        "text": "Generate a photorealistic image of a luxury product on white background"
      }]
    }],
    "generationConfig": {
      "temperature": 0.4,
      "maxOutputTokens": 8192
    }
  }'
```

## ⚠️ ข้อควรระวัง
1. **ใช้ API key จาก Cloud Console** - ไม่ใช่จาก AI Studio
2. **ตรวจสอบ quota** - ไปที่ APIs & Services > Quotas
3. **Set budget alerts** - ไปที่ Billing > Budgets & alerts

## 🔴 ถ้ายังไม่ได้:
### อาจเป็นเพราะ:
1. API key จาก AI Studio (ฟรี) ≠ Cloud API key (จ่ายเงิน)
2. Project ยังไม่ผูกกับ billing account
3. ยังไม่ enable Generative Language API
4. Region ไม่รองรับ (ลองใช้ us-central1)

## 💡 Quick Fix:
```javascript
// แทนที่ API key เดิม
const oldKey = 'AIzaSyCaUEO45dTltA6huicctEvJEOT0GC4Qzsg' // AI Studio (FREE)
const newKey = 'YOUR_GOOGLE_CLOUD_API_KEY' // Cloud Console (PAID)

// ใส่ใน pages/api/generate.js
const geminiApiKey = apiKey || process.env.GEMINI_API_KEY || 'YOUR_CLOUD_KEY_HERE'
```

## 📊 ราคาจริง:
- ประมาณ 1.4 บาท/ภาพ
- Free trial $300 credits ใช้ได้นาน
- สร้างได้ ~8,500 ภาพ ด้วย free credits

---

### 🚀 ต้องการ:
1. **Google Cloud API Key** (ไม่ใช่ AI Studio)
2. **Project ID** ของคุณ
3. แล้วผมจะช่วยตั้งค่าให้ใช้งานได้ทันที!