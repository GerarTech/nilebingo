# Pre-generated Audio Files for BINGO

## Quick Start - Generate These Files:

### English (Need to generate):
```
public/audio/en/
├── 11.mp3 → "eleven"
├── 12.mp3 → "twelve"
├── 13.mp3 → "thirteen"
├── 14.mp3 → "fourteen"
├── 15.mp3 → "fifteen"
├── 16.mp3 → "sixteen"
├── 17.mp3 → "seventeen"
├── 18.mp3 → "eighteen"
└── 19.mp3 → "nineteen"
```

### Amharic (Already works!):
```
public/audio/am/
├── 10.mp3 → "አስር" (needed for 11-19)
├── 1.mp3 → "አንድ"
├── 2.mp3 → "ሁለት"
├── 3.mp3 → "ሶስት"
├── 4.mp3 → "አራት"
├── 5.mp3 → "አምስት"
├── 6.mp3 → "ስድስት"
├── 7.mp3 → "ሰባት"
├── 8.mp3 → "ስምንት"
└── 9.mp3 → "ዘጠኝ"
```

## How It Works:

### English 11-19:
- **11**: Plays `11.mp3` → "eleven"
- **14**: Plays `14.mp3` → "fourteen"
- These are SPECIAL files (not composed from "ten + four")

### Amharic 11-19:
- **11**: Plays `10.mp3` + `1.mp3` → "አስር አንድ" (ten + one)
- **14**: Plays `10.mp3` + `4.mp3` → "አስር አራት" (ten + four)
- These are composed from base + unit

## Full Audio Structure (Complete):

```
public/audio/
├── en/ (30 files)
│   ├── B.mp3, I.mp3, N.mp3, G.mp3, O.mp3
│   ├── 1.mp3 - 9.mp3
│   ├── 10.mp3, 20.mp3, 30.mp3, 40.mp3, 50.mp3, 60.mp3, 70.mp3
│   └── 11.mp3, 12.mp3, 13.mp3, 14.mp3, 15.mp3, 16.mp3, 17.mp3, 18.mp3, 19.mp3
└── am/ (21 files)
    ├── B.mp3, I.mp3, N.mp3, G.mp3, O.mp3
    ├── 1.mp3 - 9.mp3
    └── 10.mp3, 20.mp3, 30.mp3, 40.mp3, 50.mp3, 60.mp3, 70.mp3
```

## Generate Audio Files:

### Option 1: ElevenLabs (Recommended)
1. Go to https://elevenlabs.io
2. Generate each English 11-19 file
3. Download as MP3
4. Place in `/public/audio/en/`

### Option 2: Online TTS
- Use https://ttsmp3.com
- Generate: "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"
- Download and rename to 11.mp3 through 19.mp3

## Testing:
1. Place files in correct folders
2. Open game in browser
3. Enable voice in settings
4. Draw numbers - you should hear correct pronunciation!

## Notes:
- English 11-19 are special cases (eleven, twelve, etc.)
- Amharic 11-19 use base + unit (10 + 1 = "አስራ አንድ")
- Missing files are silently skipped (no crash)
- Keep audio files short (0.5-1.5 seconds)