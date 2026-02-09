# Dataset Integration Summary

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SignBridge Dataset System                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SignAvatars Dataset Sources                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │  WLASL   │  │ How2Sign │  │ HamNoSys │  │ PHOENIX  │  │   │
│  │  │  (ASL)   │  │  (ASL)   │  │  (ISL)   │  │  (GSL)   │  │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │   │
│  └───────┼─────────────┼─────────────┼─────────────┼────────┘   │
│          └─────────────┴─────────────┴─────────────┘            │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Dataset Processor (FFmpeg)                   │   │
│  │  • Parse annotations (JSON/CSV)                          │   │
│  │  • Extract metadata                                       │   │
│  │  • Transcode to H.264 (720p default)                     │   │
│  │  • Generate thumbnails                                    │   │
│  │  • Build searchable index                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Sign Database (sign-index.json)              │   │
│  │  • Query by gloss, dialect, quality                      │   │
│  │  • Search by keyword                                      │   │
│  │  • Filter by source, category                            │   │
│  │  • Get sentence context                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Hybrid Sign System                      │   │
│  │  ┌────────────┐  ┌──────────┐  ┌────────────┐  ┌───────┐ │   │
│  │  │SignAvatars │─▶│ External │─▶│ Procedural │─▶│Finger-│ │   │
│  │  │  (video)   │  │  Links   │  │  3D Anim   │  │ spell │ │   │
│  │  └────────────┘  └──────────┘  └────────────┘  └───────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Frontend Avatar                        │   │
│  │  VideoAvatar.jsx (video + 3D fallback)                   │   │
│  │  Avatar3D.jsx (pure 3D)                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Files Overview

### Backend - Dataset Processing

| File | Purpose |
|------|---------|
| `dataset-processor.js` | FFmpeg-based video processor with SignAvatars support |
| `signDatabase.js` | Query interface for processed videos |
| `signFallback.js` | 50+ procedural animations as fallback |
| `hybridSignSystem.js` | Multi-source system with fallback chain |
| `verify-dataset.js` | Verification script |

### Backend - Data Files

| File | Purpose |
|------|---------|
| `dataset/metadata/sign-index.json` | Main index for processed videos |
| `dataset/metadata/demo-sign-index.json` | 100 common signs for demo |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/download-signavatars.js` | Interactive setup helper |

### Frontend - Avatar Components

| File | Purpose |
|------|---------|
| `VideoAvatar.jsx` | Hybrid video + 3D avatar |
| `VideoAvatar.css` | Styling for all modes |
| `Avatar3D.jsx` | Pure 3D procedural avatar |

## API Endpoints

### Hybrid System (Recommended)
```
GET  /api/hybrid/sign/:gloss         # Best available source
POST /api/hybrid/sequence            # Batch processing
GET  /api/hybrid/available           # All available signs
GET  /api/hybrid/availability/:gloss # Check sources for a sign
GET  /api/hybrid/category/:category  # Signs by category
```

### Video-Specific
```
GET  /api/signs/:gloss               # Get video metadata
GET  /api/sign-stream/:dialect/:gloss # Stream video
GET  /api/signs/available            # List all video signs
GET  /api/signs/search?q=keyword     # Search signs
GET  /api/signs/stats                # Database statistics
```

### Fallback-Specific
```
GET  /api/fallback/available         # Procedural signs
GET  /api/fallback/categories        # Sign categories
GET  /api/sign-with-fallback/:gloss  # With auto-fallback
```

### Demo Mode
```
GET  /api/demo/info                  # Phase roadmap
GET  /api/demo/stats                 # System statistics
GET  /api/demo/highlights            # Key demo signs
```

## Fallback Chain

1. **SignAvatars Video** (Highest quality)
   - WLASL, How2Sign, HamNoSys, PHOENIX datasets
   - Pre-rendered, professional quality
   - Requires dataset download and processing

2. **External Links** (Handspeak, Lifeprint)
   - Opens in new tab or iframe
   - 50+ signs have links
   - Good for reference

3. **Procedural Animation** (Three.js)
   - Works offline
   - 100+ common signs
   - Real-time rendering

4. **Fingerspelling** (Always Available)
   - A-Z letters
   - Works for any word
   - Last resort

## SignAvatars Dataset Structure

```
backend/dataset/raw/SignAvatars/
├── word2motion/              # WLASL - Word-level ASL
│   ├── videos/               # .mp4 files
│   ├── text/
│   │   └── WLASL_v0.3.json  # Annotations
│   └── annotations/          # SMPL-X data (optional)
│
├── language2motion/          # How2Sign + PHOENIX
│   ├── videos/               # Sentence-level videos
│   ├── text/
│   │   ├── how2sign_*.csv   # How2Sign annotations
│   │   └── PHOENIX-*.csv    # PHOENIX annotations
│   └── annotations/
│
└── hamnosys2motion/          # HamNoSys notation
    ├── videos/
    ├── data.json             # HamNoSys annotations
    └── annotations/
```

## Quick Setup

### Demo Mode (No dataset required)
```bash
# Works out of the box
cd backend
npm start
```

### Full Dataset Mode
```bash
# 1. Run setup helper
node scripts/download-signavatars.js

# 2. Download datasets (follow instructions)
# - WLASL: https://dxli94.github.io/WLASL/
# - How2Sign: https://how2sign.github.io/

# 3. Process dataset
cd backend
node dataset-processor.js

# 4. Verify
node verify-dataset.js

# 5. Start server
npm start
```

## Request Flow

```
User speaks "Hello"
       │
       ▼
┌──────────────────┐
│ Web Speech API   │
│ (recognition)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Socket.IO        │
│ speech-input     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Gemini 2.0 Flash │
│ Text → Gloss     │
│ "Hello" → HELLO  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Hybrid System    │
│ Get best source  │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ Video │ │  3D   │
│ Found │ │Fallback│
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
┌──────────────────┐
│ VideoAvatar.jsx  │
│ or Avatar3D.jsx  │
└────────┬─────────┘
         │
         ▼
    Avatar Signs!
```

## Quality Levels

| Quality | Resolution | Bitrate | Use Case |
|---------|------------|---------|----------|
| 1080p   | 1920x1080  | 4 Mbps  | Desktop, demo |
| 720p    | 1280x720   | 2 Mbps  | Default |
| 480p    | 854x480    | 1 Mbps  | Mobile, slow network |

## Storage Estimates

| Dataset Size | Disk Space | Signs |
|--------------|------------|-------|
| Demo (procedural) | ~0 MB | 100 |
| WLASL only | ~12 GB | ~2000 |
| + How2Sign | ~40 GB | ~7000 |
| Full SignAvatars | ~65 GB | ~10000+ |

## Source Statistics

After processing, the index tracks signs by source:

```json
{
    "_meta": {
        "version": "2.0.0",
        "totalSigns": 2692,
        "sources": {
            "wlasl": 1800,
            "how2sign": 500,
            "hamnosys": 200,
            "phoenix": 192
        }
    }
}
```

## Roadmap

| Phase | Signs | Source | Status |
|-------|-------|--------|--------|
| 1. Hackathon | 100 | Procedural | ✅ Complete |
| 2. SignAvatars | 2500 | Video | ✅ Integrated |
| 3. Beta | 5000 | Full dataset | 🔄 In Progress |
| 4. Production | 10000+ | Motion capture | 📅 Planned |

## Next Steps

1. ✅ Download WLASL dataset
2. ✅ Process videos with `dataset-processor.js`
3. ✅ Verify with `verify-dataset.js`
4. 🔄 Optional: Add How2Sign for sentence context
5. 🔄 Optional: Add PHOENIX for German Sign Language

See [DATASET_SETUP.md](./DATASET_SETUP.md) for detailed instructions.
