# Voice Preview Files

This folder contains pre-generated audio files for voice previews to save API credits.

## Structure

```
voice-previews/
├── gemini/          # Gemini TTS voices (30 voices)
│   ├── Puck.mp3
│   ├── Zephyr.mp3
│   ├── Kore.mp3
│   └── ...
└── elevenlabs/      # ElevenLabs voices (premium, 4 voices)
    ├── VOICE_ID_1.mp3
    ├── VOICE_ID_2.mp3
    └── ...
```

## Preview Text (Thai)

All preview audio files should use this exact text:

**Male voices:**
```
สวัสดีนี่คือเสียงเอไอจากเว็บพ้อมดี คุณชอบรึป่าว
```

**Female voices:**
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
