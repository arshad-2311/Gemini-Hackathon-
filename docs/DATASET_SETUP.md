# SignAvatars Dataset Setup Guide

Complete guide for integrating the SignAvatars dataset into your Sign Language Translator project.

## Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18+ | 20+ |
| FFmpeg | Required | Latest |
| Disk Space | 20GB | 50GB |
| RAM | 8GB | 16GB |
| Processing Time | 2 hours | 4+ hours |

### Install FFmpeg

```bash
# Windows (using winget)
winget install FFmpeg

# Windows (using chocolatey)
choco install ffmpeg

# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Verify installation
ffmpeg -version
```

---

## Dataset Overview

SignAvatars contains three sub-datasets:

| Sub-dataset | Type | Signs | Best For |
|-------------|------|-------|----------|
| `word2motion` | Word-level | ~2000 | Individual sign lookup |
| `language2motion` | Sentence-level | ~5000 | Continuous signing |
| `hamnosys2motion` | Notation-based | ~500 | HamNoSys research |

> [!NOTE]
> For the Sign Language Translator, **word2motion (WLASL)** is the primary dataset we use since it provides isolated word-level signs.

---

## Step 1: Request Dataset Access

### 1.1 SignAvatars Annotations (Required)

1. Fill out the [SignAvatars Access Form](https://docs.google.com/forms/d/e/1FAIpQLSc6xQJJMf_R4xJ1sIwDL6FBIYw4HbVVv_HUgCqeiguWX5XGPg/viewform)
2. Wait for email approval (usually 1-2 business days)
3. Download annotations from provided links

### 1.2 Original Video Sources

SignAvatars provides motion annotations, but original videos must be downloaded separately:

#### WLASL (American Sign Language - Word Level)
- **Website**: [https://dxli94.github.io/WLASL/](https://dxli94.github.io/WLASL/)
- **Signs**: ~2000 ASL words
- **Format**: MP4 videos
- **Best for**: Individual sign lookup

```bash
# After getting access, download WLASL videos
# Follow instructions on the WLASL website
```

#### How2Sign (ASL - Sentence Level)
- **Website**: [https://how2sign.github.io/](https://how2sign.github.io/)
- **Signs**: ~5000 sentences
- **Format**: Green screen RGB clips
- **Best for**: Continuous signing, context

```bash
# Download Green Screen RGB clips from How2Sign
# Requires signing agreement form
```

#### PHOENIX-2014-T (German Sign Language)
- **Website**: [RWTH-PHOENIX](https://www-i6.informatik.rwth-aachen.de/~koller/RWTH-PHOENIX-2014-T/)
- **Signs**: German Sign Language sentences
- **Format**: Video + annotations

---

## Step 2: Organize Dataset

Create the following directory structure:

```
sign-language-translator/
└── backend/
    └── dataset/
        ├── raw/
        │   └── SignAvatars/
        │       ├── word2motion/           # WLASL data
        │       │   ├── videos/
        │       │   │   └── *.mp4
        │       │   ├── images/
        │       │   │   └── <video_name>/
        │       │   ├── annotations/
        │       │   │   └── SMPL-X/
        │       │   └── text/
        │       │       └── WLASL_v0.3.json
        │       │
        │       ├── language2motion/       # How2Sign + PHOENIX
        │       │   ├── videos/
        │       │   ├── images/
        │       │   ├── annotations/
        │       │   └── text/
        │       │       ├── how2sign_train.csv
        │       │       ├── how2sign_test.csv
        │       │       └── PHOENIX-2014-T.*.csv
        │       │
        │       └── hamnosys2motion/       # HamNoSys data
        │           ├── videos/
        │           ├── images/
        │           ├── annotations/
        │           ├── data.json
        │           └── split.pkl
        │
        ├── processed/                     # Output: processed videos
        │   ├── asl/
        │   ├── bsl/
        │   └── isl/
        │
        ├── thumbnails/                    # Output: video thumbnails
        │   ├── asl/
        │   ├── bsl/
        │   └── isl/
        │
        └── metadata/                      # Output: JSON indexes
            ├── sign-index.json
            └── demo-sign-index.json
```

### Quick Setup Commands

```bash
# Navigate to backend
cd backend

# Create directory structure
mkdir -p dataset/raw/SignAvatars/word2motion/videos
mkdir -p dataset/raw/SignAvatars/word2motion/text
mkdir -p dataset/raw/SignAvatars/language2motion/videos
mkdir -p dataset/raw/SignAvatars/language2motion/text
mkdir -p dataset/raw/SignAvatars/hamnosys2motion/videos
mkdir -p dataset/processed/asl
mkdir -p dataset/processed/bsl
mkdir -p dataset/processed/isl
mkdir -p dataset/thumbnails/asl
mkdir -p dataset/thumbnails/bsl
mkdir -p dataset/thumbnails/isl
mkdir -p dataset/metadata
```

---

## Step 3: Copy Dataset Files

### 3.1 WLASL (Primary - ASL Words)

```bash
# Copy WLASL videos
cp -r /path/to/WLASL/videos/* backend/dataset/raw/SignAvatars/word2motion/videos/

# Copy WLASL annotations
cp /path/to/WLASL/WLASL_v0.3.json backend/dataset/raw/SignAvatars/word2motion/text/
```

### 3.2 How2Sign (Optional - ASL Sentences)

```bash
# Copy How2Sign videos
cp -r /path/to/How2Sign/green_screen/* backend/dataset/raw/SignAvatars/language2motion/videos/

# Copy How2Sign annotations
cp /path/to/How2Sign/*.csv backend/dataset/raw/SignAvatars/language2motion/text/
```

### 3.3 SignAvatars Annotations

```bash
# Copy downloaded SignAvatars annotations
cp -r /path/to/SignAvatars/annotations/* backend/dataset/raw/SignAvatars/
```

---

## Step 4: Process Dataset

### 4.1 Install Dependencies

```bash
cd backend
npm install
```

### 4.2 Run Dataset Processor

```bash
# Process all videos (may take 2-4 hours)
node dataset-processor.js

# Or specify a custom path
node dataset-processor.js /path/to/SignAvatars
```

### 4.3 Expected Output

```
🚀 SignAvatars Dataset Processor
================================

✅ FFmpeg found
📁 Dataset path: backend/dataset/raw/SignAvatars
📁 Output path: backend/dataset/processed

📂 Scanning dataset directory...

📊 Found 2500 video files

🎬 Processing videos...

[1/2500] Processing: HELLO (ASL)
   ✅ Done

[2/2500] Processing: THANK_YOU (ASL)
   ✅ Done

...

════════════════════════════════════════
           PROCESSING COMPLETE          
════════════════════════════════════════
✅ Processed: 2500
❌ Failed: 12
⏭️ Skipped: 0

Signs per dialect:
   ASL: 1234 signs
   ISL: 567 signs
   BSL: 891 signs
════════════════════════════════════════
```

---

## Step 5: Verify Processing

```bash
# Run verification script
node verify-dataset.js
```

Expected output:

```
✅ ASL: 1,234 signs indexed
✅ ISL: 567 signs indexed
✅ BSL: 891 signs indexed
✅ Total: 2,692 signs ready
```

---

## Step 6: Update .gitignore

Add to `.gitignore`:

```gitignore
# Dataset files (large, don't commit)
backend/dataset/raw/
backend/dataset/processed/
backend/dataset/thumbnails/

# Only commit metadata
# backend/dataset/metadata/sign-index.json
```

---

## Step 7: Test Integration

### Start the Server

```bash
cd backend
npm start
```

### Test API Endpoints

```bash
# Get a sign
curl http://localhost:3001/api/signs/HELLO

# Get hybrid sign (with fallback)
curl http://localhost:3001/api/hybrid/sign/HELLO

# List available signs
curl http://localhost:3001/api/signs/available

# Search signs
curl "http://localhost:3001/api/signs/search?q=hello"
```

### Test Video Streaming

```bash
# Stream a sign video
curl http://localhost:3001/api/sign-stream/ASL/HELLO --output test.mp4
```

---

## Troubleshooting

### FFmpeg Not Found

```bash
# Check if FFmpeg is in PATH
ffmpeg -version

# If not found, add to PATH or reinstall
# Windows: Add C:\ffmpeg\bin to System PATH
```

### Out of Memory

```bash
# Process in smaller batches
node dataset-processor.js --batch-size 100

# Or increase Node.js memory
node --max-old-space-size=8192 dataset-processor.js
```

### Video Processing Fails

```bash
# Check video file integrity
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 video.mp4

# Re-download corrupted files
```

### Index Not Loading

```bash
# Rebuild index
node dataset-processor.js --rebuild-index

# Check JSON validity
cat backend/dataset/metadata/sign-index.json | jq .
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `node dataset-processor.js` | Process all videos |
| `node dataset-processor.js --test` | Process first 10 videos only |
| `node dataset-processor.js --rebuild-index` | Rebuild index without reprocessing |
| `node verify-dataset.js` | Verify processed dataset |
| `npm start` | Start backend server |

---

## Storage Estimates

| Dataset Size | Videos | Processed | Thumbnails | Total |
|--------------|--------|-----------|------------|-------|
| WLASL only | ~8 GB | ~4 GB | ~100 MB | ~12 GB |
| + How2Sign | ~25 GB | ~15 GB | ~500 MB | ~40 GB |
| Full | ~40 GB | ~25 GB | ~800 MB | ~65 GB |

---

## Next Steps

After setup, the system automatically:

1. ✅ Serves processed videos via `/api/sign-stream/:dialect/:gloss`
2. ✅ Falls back to procedural animations for missing signs
3. ✅ Provides search and batch APIs
4. ✅ Integrates with the frontend VideoAvatar component

See [DATASET_INTEGRATION.md](./DATASET_INTEGRATION.md) for architecture details.
