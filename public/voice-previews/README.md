# Voice Preview Files (ElevenLabs Only)

This folder contains pre-generated audio files for **ElevenLabs** voice previews to save API credits.

**Note:** Gemini TTS is free, so we don't need to save preview files for it. Only ElevenLabs requires pre-generated files.

## Structure

```
voice-previews/
└── elevenlabs/      # ElevenLabs voices (premium, 7 voices)
    ├── AXw7rxvMAEe68vknaJRv.mp3  (เสียงกวนทีน - ชาย)
    ├── oKIE62mvU7YR0KSC6cjd.mp3  (เสียงพี่ชิล - ชาย)
    ├── gkEgy6IJoIagFuyBcxDu.mp3  (เสียงบอส - ชาย)
    ├── fJnvnbC7A9PHKFt2Zi5I.mp3  (เสียงนักพูด - ชาย)
    ├── ocXeZcpfl3y8l2JH0Dyv.mp3  (เสียงน้องมิ้นท์ - หญิง)
    ├── yvV1FSiWQfVfAv6TKN2O.mp3  (เสียงพี่พอด - หญิง)
    └── GYFXpkcXjA3N82uHvHn3.mp3  (เสียงสบายหู - หญิง)
```

## Preview Text (Thai)

All preview audio files use this exact text:

```
สวัสดีนี่คือเสียงเอไอจากเว็บพ้อมดี คุณชอบรึป่าว
```

## How to Generate Preview Files

### Method 1: Using Voice Generator Page
1. Go to Voice mode in the app
2. Select each voice
3. Click "สร้างเสียง" with the preview text
4. Download the generated audio
5. Rename to `{VoiceID}.mp3`
6. Place in appropriate folder (gemini/ or elevenlabs/)

### Method 2: Using API Directly
Run this command for each voice:

```bash
# For Gemini voices
curl -X POST http://localhost:3000/api/generate-voice-gemini \
  -H "Content-Type: application/json" \
  -d '{
    "text": "สวัสดีนี่คือเสียงเอไอจากเว็บพ้อมดี คุณชอบรึป่าว",
    "voice": "Puck",
    "userId": "preview",
    "isPreview": true
  }' | jq -r '.audioUrl' | xargs curl -o public/voice-previews/gemini/Puck.mp3
```

## Gemini Voice IDs (30 voices)

### Female Voices (15)
- Puck (กระชุ่มกระชวย - Upbeat)
- Zephyr (สดใส - Bright)
- Kore (เด็ดขาด - Firm)
- Leda (เยาว์วัย - Youthful)
- Autonoe (สดใส - Bright)
- Aoede (สบายๆ - Breezy)
- Callirrhoe (ผ่อนคลาย - Easy-going)
- Enceladus (นุ่มนวล - Breathy)
- Algieba (ลื่นไหล - Smooth)
- Despina (ลื่นไหล - Smooth)
- Laomedeia (กระชุ่มกระชวย - Upbeat)
- Achernar (อ่อนโยน - Soft)
- Achird (เป็นมิตร - Friendly)
- Vindemiatrix (อ่อนโยน - Gentle)
- Sadachbia (มีชีวิตชีวา - Lively)

### Male Voices (14)
- Charon (ให้ข้อมูล - Informative)
- Fenrir (ตื่นเต้น - Excitable)
- Orus (เด็ดขาด - Firm)
- Iapetus (ชัดเจน - Clear)
- Umbriel (ผ่อนคลาย - Easy-going)
- Erinome (ลื่นไหล - Smooth)
- Ankaa (นุ่มนวล - Breathy)
- Adhafera (กระชุ่มกระชวย - Upbeat)
- Alphekka (อ่อนโยน - Gentle)
- Edasich (พลังงาน - Energetic)
- Keid (อ่อนโยน - Gentle)
- Algol (ลึกซึ้ง - Deep)
- Nashira (สงบ - Calm)
- Sadalmelik (พลังงาน - Energetic)

### Neutral Voice (1)
- Pavo (กลางๆ - Neutral)

## ElevenLabs Voice IDs (Premium)

Check the `ELEVENLABS_VOICES` array in VoiceGenerator.jsx for the exact voice IDs.

Example IDs:
- oQJz2rnMSBBVDAfLbvWj (เสียงหนุ่มเท่)
- ZD9e4e8ym6DLYBwsuxA1 (เสียงสบายๆ)
- GYFXpkcXjA3N82uHvHn3 (เสียงสบายหู)
- etc.

## Benefits

- ✅ Saves API credits (no repeated calls for the same preview)
- ✅ Faster preview loading
- ✅ Consistent preview quality
- ✅ Works offline (once files are cached)
- ✅ Falls back to API if file doesn't exist

## File Size Optimization

- Use MP3 format with ~128kbps bitrate
- Typical file size: 50-150 KB per voice
- Total storage for all 34 voices: ~3-5 MB

## Note

If a preview file doesn't exist, the system will automatically fall back to generating via API. This ensures the preview feature always works, even for new voices that haven't been pre-generated yet.
