# 🔥 ตรวจสอบและแก้ไข Google Cloud Billing

## ⚠️ ปัญหาที่พบ:
คุณผูกบัตรแล้ว แต่ยังติด quota = **คุณใช้ API key ผิดตัว!**

## 🎯 มี 2 ประเภท API Key:

### 1. ❌ AI Studio API Key (ที่คุณใช้อยู่)
- **URL**: https://aistudio.google.com/app/apikey
- **ลักษณะ**: AIzaSy...
- **ราคา**: ฟรี
- **Quota**: จำกัดมาก (2 requests/min)
- **ผูกบัตร**: ไม่มีผล

### 2. ✅ Google Cloud API Key (ที่ต้องใช้)
- **URL**: https://console.cloud.google.com
- **ลักษณะ**: AIzaSy... (เหมือนกันแต่คนละตัว)
- **ราคา**: Pay-per-use
- **Quota**: ไม่จำกัด
- **ผูกบัตร**: ต้องผูก

## 📋 ขั้นตอนแก้ไข:

### Step 1: ตรวจสอบ Billing
1. ไปที่: https://console.cloud.google.com/billing
2. ดูว่ามี "Active billing account" ✅
3. ถ้าไม่มี คลิก "LINK A BILLING ACCOUNT"

### Step 2: สร้าง/เลือก Project
1. ไปที่: https://console.cloud.google.com
2. ด้านบนซ้าย คลิก dropdown เลือก Project
3. หรือสร้างใหม่ "NEW PROJECT"
4. **สำคัญ**: Project ต้องผูกกับ Billing Account

### Step 3: Enable API
```bash
# ไปที่ APIs & Services > Library
# ค้นหาและ Enable:
1. Generative Language API
2. Vertex AI API (ถ้ามี)
```

### Step 4: สร้าง API Key ใหม่
1. ไปที่: APIs & Services > Credentials
2. คลิก "+ CREATE CREDENTIALS"
3. เลือก "API Key"
4. Copy key ใหม่ที่ได้ (อันนี้คือ Paid key!)

### Step 5: ทดสอบ API Key
```bash
# Test ว่าเป็น Paid key จริง
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_NEW_KEY"

# ถ้าได้ response = OK
# ถ้า error 403 = ยังไม่ enable API
```

## 🔴 Check List ตรวจสอบ:

- [ ] มี Google Cloud Account (ไม่ใช่แค่ Gmail)
- [ ] มี Billing Account ที่ Active
- [ ] มี Project ที่ผูกกับ Billing
- [ ] Enable "Generative Language API"
- [ ] สร้าง API Key จาก Cloud Console (ไม่ใช่ AI Studio)

## 💳 วิธีอัปเกรด Billing:

### ถ้ายังเป็น Free Trial:
1. ไปที่: https://console.cloud.google.com/billing
2. คลิก "UPGRADE"
3. ยืนยันบัตรเครดิต
4. เปลี่ยนจาก Free Trial → Paid Account

### ถ้ามี Billing แล้ว:
1. ตรวจสอบว่า Project ผูกกับ Billing
2. ไปที่ Project Settings
3. ดูที่ "Billing account"
4. ถ้าไม่มี คลิก "Link billing account"

## 🚨 วิธีเช็คว่าใช้ API key ตัวไหน:

```javascript
// ใน code ของคุณ
const geminiApiKey = 'AIzaSyD0n9MuVEpgDDyXjWBp9O4LpRpSRYe_8aY'

// นี่คือ AI Studio key (FREE) ❌
// ต้องเปลี่ยนเป็น Cloud key (PAID) ✅
```

## ✅ Solution:

1. **สร้าง Cloud API Key ใหม่**
2. **แทนที่ key เดิมในโค้ด**
3. **Enable billing + API**
4. **ใช้งานได้ไม่จำกัด**

---

### 💬 บอก API key ใหม่จาก Cloud Console มาครับ
แล้วผมจะอัปเดตให้ใช้งานได้ทันที!