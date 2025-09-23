# การตั้งค่า Google Cloud API สำหรับ Gemini

## ทำไมต้องใช้ Google Cloud?
- **Quota สูงกว่า** - ไม่มีข้อจำกัดเหมือน free tier
- **เสถียรกว่า** - ใช้งานได้ต่อเนื่อง
- **รองรับ Production** - พร้อมใช้งานจริง

## ขั้นตอนการตั้งค่า

### 1. สร้าง Google Cloud Project
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง Project ใหม่หรือเลือก Project ที่มีอยู่
3. จด Project ID ไว้ (เช่น `my-project-123456`)

### 2. เปิดใช้งาน Vertex AI API
```bash
# ใน Cloud Shell หรือ Terminal
gcloud services enable aiplatform.googleapis.com
```

หรือเปิดผ่าน Console:
1. ไปที่ APIs & Services > Enable APIs
2. ค้นหา "Vertex AI API"
3. คลิก Enable

### 3. สร้าง Service Account Key
1. ไปที่ IAM & Admin > Service Accounts
2. คลิก Create Service Account
3. ตั้งชื่อ เช่น `gemini-image-generator`
4. ให้ Role: `Vertex AI User`
5. สร้าง Key (JSON format)
6. Download ไฟล์ JSON

### 4. ตั้งค่าใน Application

#### Option 1: ใช้ API Key (ง่ายกว่า)
```javascript
// ใน pages/api/generate.js
const useCloudEndpoint = false // ใช้ AI Studio endpoint
const geminiApiKey = 'YOUR_API_KEY_HERE'
```

#### Option 2: ใช้ Service Account (สำหรับ Production)
```javascript
// ใน pages/api/generate.js
const useCloudEndpoint = true // ใช้ Cloud endpoint
// ต้องตั้งค่า OAuth token หรือใช้ Application Default Credentials

// สร้างไฟล์ .env.local
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
GOOGLE_CLOUD_PROJECT=your-project-id
```

### 5. อัปเดต Code

```javascript
// pages/api/generate.js
const useCloudEndpoint = true // เปลี่ยนเป็น true
const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id'

const apiUrl = useCloudEndpoint
  ? `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image-preview:generateContent`
  : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${geminiApiKey}`
```

## Pricing
- **Pay as you go** - จ่ายตามการใช้งานจริง
- **Free tier** - $300 credit สำหรับผู้ใช้ใหม่
- **ราคา** - ประมาณ $0.002 ต่อ 1,000 characters

## การ Monitor Usage
1. ไปที่ Cloud Console > Billing
2. ตั้ง Budget Alert
3. ดู Usage Report

## Troubleshooting

### Error: 403 Forbidden
- ตรวจสอบว่าเปิด API แล้ว
- ตรวจสอบ Permissions

### Error: 404 Not Found
- ตรวจสอบ Project ID
- ตรวจสอบ Region (ใช้ us-central1)

### Error: 401 Unauthorized
- ตรวจสอบ Service Account Key
- ตรวจสอบ Authentication

## Links
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)
- [Gemini API Docs](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)
- [Authentication Guide](https://cloud.google.com/docs/authentication)