# ImageUploader Redesign Plan

## ลำดับการแสดงผลใหม่:

### 1. Toggle Switch (Image to Image / Text to Image)
- ปุ่มสวิตช์แบบเลื่อนซ้าย-ขวา
- ซ้าย = Image to Image (สีเหลือง)
- ขวา = Text to Image (สีม่วง)

### 2. Upload Area หรือ Prompt Input (ขึ้นกับโหมด)
**ถ้าเลือก Image to Image:**
- แสดง Upload area สำหรับแนบรูป
- พอแนบรูปแล้ว ให้แสดงช่อง Prompt ด้านล่างการแนบรูป

**ถ้าเลือก Text to Image:**
- แสดงช่อง Prompt ใหญ่ๆ เด่นๆ ทันที

### 3. Dropdown สไตล์ Prompt
- ให้เป็น dropdown เด่นๆ อยู่เหนือช่องกรอก Prompt
- มี options: Premium, Floating, Moody, Cinematic, Product Hero, กรอกเอง
- เมื่อเลือก จะไม่แสดงเนื้อหา Prompt ให้เห็น (แสดงเป็น ***)

### 4. ช่องกรอก Prompt
- แสดงอยู่เสมอ
- ถ้าเลือก style จาก dropdown → แสดงเป็น *** (password-like)
- ถ้าเลือก "กรอกเอง" → แสดงช่องว่างให้พิมพ์

### 5. ขนาดและจำนวน
- Dropdown เลือกจำนวนภาพ (1-4)
- Dropdown เลือกขนาด (1:1, 16:9, etc.)

### 6. ปุ่มสร้างภาพ
- ปุ่มใหญ่ชัดเจน
- ข้อความเปลี่ยนตามโหมด

## Implementation Notes:
- ย้าย Settings Panel จากด้านบนมาอยู่ในตำแหน่งที่เหมาะสม
- ซ่อน Prompt content เมื่อเลือก preset styles
- ทำให้ UI flow เป็นขั้นตอนที่ชัดเจน
