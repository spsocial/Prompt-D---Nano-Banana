# 🔐 คู่มือการตั้งค่า Google Authentication

ระบบ Login ด้วย Google ได้ถูกติดตั้งเรียบร้อยแล้ว! 🎉

## 📋 สิ่งที่ต้องทำ

### 1. สร้าง Google OAuth Credentials

#### ขั้นตอนที่ 1: เข้า Google Cloud Console
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่ หรือเลือก Project ที่มีอยู่

#### ขั้นตอนที่ 2: เปิดใช้ Google+ API
1. ไปที่ **APIs & Services** > **Library**
2. ค้นหา "Google+ API" แล้วคลิก **Enable**

#### ขั้นตอนที่ 3: สร้าง OAuth Consent Screen
1. ไปที่ **APIs & Services** > **OAuth consent screen**
2. เลือก **External** (สำหรับ testing) หรือ **Internal** (สำหรับองค์กร)
3. กรอกข้อมูล:
   - App name: `Prompt D Studio`
   - User support email: อีเมลของคุณ
   - Developer contact email: อีเมลของคุณ
4. คลิก **Save and Continue**
5. ข้าม Scopes (คลิก Save and Continue)
6. เพิ่ม Test users (อีเมลที่จะใช้ทดสอบ) ถ้าเลือก External
7. คลิก **Save and Continue**

#### ขั้นตอนที่ 4: สร้าง OAuth Client ID
1. ไปที่ **APIs & Services** > **Credentials**
2. คลิก **+ CREATE CREDENTIALS** > **OAuth client ID**
3. เลือก Application type: **Web application**
4. ตั้งชื่อ: `Prompt D Studio - Web`
5. เพิ่ม **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   https://yourdomain.com (เปลี่ยนเป็น domain จริง)
   ```
6. เพิ่ม **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   https://yourdomain.com/api/auth/callback/google (เปลี่ยนเป็น domain จริง)
   ```
7. คลิก **Create**
8. คุณจะได้ **Client ID** และ **Client Secret** มา

---

### 2. ตั้งค่า Environment Variables

เพิ่มค่าเหล่านี้ใน `.env` file ของคุณ:

```bash
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here"  # สร้างด้วย: openssl rand -base64 32
```

#### วิธีสร้าง NEXTAUTH_SECRET:
```bash
# บน Mac/Linux:
openssl rand -base64 32

# หรือใช้เว็บไซต์:
https://generate-secret.vercel.app/32
```

---

### 3. อัพเดท Production URL

เมื่อ deploy ขึ้น production แล้ว อย่าลืม:

1. เพิ่ม production URL ใน Google Cloud Console:
   - Authorized JavaScript origins: `https://yourdomain.com`
   - Authorized redirect URIs: `https://yourdomain.com/api/auth/callback/google`

2. อัพเดท `.env`:
   ```bash
   NEXTAUTH_URL="https://yourdomain.com"
   ```

---

## ✅ การทดสอบ

1. รัน development server:
   ```bash
   npm run dev
   ```

2. เปิดเบราว์เซอร์ที่ `http://localhost:3000`

3. คลิกปุ่ม "เข้าสู่ระบบด้วย Google"

4. Login ด้วย Google Account (ต้องเป็น Test user ถ้าเลือก External + Testing mode)

5. หลัง login สำเร็จจะได้:
   - ✅ รับ 10 เครดิตฟรี
   - ✅ User profile แสดงที่มุมขวาบน
   - ✅ สามารถใช้งานระบบได้เต็มรูปแบบ

---

## 🎁 ฟีเจอร์ที่ได้เพิ่ม

### 1. Authentication System
- ✅ Login/Logout ด้วย Google
- ✅ Session management (30 วัน)
- ✅ User profile display

### 2. Credit System
- ✅ ผู้ใช้ใหม่รับ **10 เครดิตฟรี** อัตโนมัติ
- ✅ Sync เครดิตข้ามอุปกรณ์
- ✅ ไม่สูญหายเมื่อเปลี่ยนเครื่อง

### 3. User Management
- ✅ Auto-create user ใน database
- ✅ Track last active time
- ✅ User ID format: `U-{email_username}`

### 4. UI Changes
- ✅ Login gate สำหรับผู้ที่ยังไม่ login
- ✅ ปุ่ม Login/Logout ในหน้าหลัก
- ✅ User profile แสดงชื่อ + รูปโปรไฟล์
- ✅ ซ่อนฟีเจอร์ที่ต้อง login ไว้

---

## 🔧 Troubleshooting

### ปัญหา: "Error: redirect_uri_mismatch"
**วิธีแก้:**
1. ตรวจสอบว่า Authorized redirect URIs ใน Google Console ตรงกับ URL ที่ใช้
2. ต้องมี `/api/auth/callback/google` ต่อท้าย
3. ตรวจสอบ `NEXTAUTH_URL` ใน `.env`

### ปัญหา: "Sign in error: OAuthCallback"
**วิธีแก้:**
1. ตรวจสอบว่า `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET` ถูกต้อง
2. ตรวจสอบว่า Google+ API ถูก enable แล้ว
3. ลอง restart dev server

### ปัญหา: "Access blocked: This app's request is invalid"
**วิธีแก้:**
1. เพิ่ม Test users ใน OAuth consent screen
2. หรือเปลี่ยนเป็น **Publishing status: In production** (ต้อง verify)

### ปัญหา: Database migration failed
**วิธีแก้:**
```bash
npx prisma db push --accept-data-loss
npx prisma generate
```

---

## 📊 Database Schema ที่เพิ่มมา

```prisma
model User {
  // ฟิลด์เดิม
  id, userId, credits, ...

  // ฟิลด์ใหม่สำหรับ NextAuth
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?

  // Relations
  accounts      Account[]
  sessions      Session[]
}

model Account {
  // OAuth account info (Google)
}

model Session {
  // User session info
}

model VerificationToken {
  // Email verification (future)
}
```

---

## 🎯 Next Steps

1. **ทดสอบระบบ Login**
   - Login/Logout
   - รับเครดิตฟรี 10 credits
   - สร้างภาพ/วิดีโอ

2. **Deploy to Production**
   - อัพเดท Google OAuth URLs
   - ตั้งค่า Environment Variables
   - Publish OAuth App

3. **(Optional) เพิ่ม Providers อื่น**
   - Facebook Login
   - Line Login
   - Email/Password

---

## 📝 สรุป

✅ ระบบ Google Login พร้อมใช้งานแล้ว
✅ ผู้ใช้ใหม่รับ 10 เครดิตฟรีอัตโนมัติ
✅ ข้อมูล sync ข้ามอุปกรณ์
✅ UI สวยงามพร้อม Login gate

**ที่เหลือต้องทำ:** ตั้งค่า Google OAuth Credentials และใส่ใน `.env` เท่านั้น! 🚀
