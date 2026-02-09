# 🚀 Day 1 Quick Start Guide

Complete setup guide for SignBridge with SignAvatars dataset integration.

## ⏱️ Time Estimate: 30-45 minutes

---

## 📋 Checklist

### Prerequisites (5 min)
- [ ] Node.js 18+ installed ([download](https://nodejs.org/))
- [ ] Git installed ([download](https://git-scm.com/))
- [ ] FFmpeg installed (optional, for video processing) ([download](https://ffmpeg.org/download.html))
- [ ] Gemini API key ([get one free](https://aistudio.google.com/app/apikey))

### Quick Setup (10 min)
- [ ] Clone/download project
- [ ] Run setup script (bash or PowerShell)
- [ ] Add Gemini API key to `backend/.env`

### Dataset Integration (15-20 min)
- [ ] Download SignAvatars dataset (optional - sample included)
- [ ] Process videos with FFmpeg
- [ ] Verify database

### Launch & Test (5 min)
- [ ] Start backend server
- [ ] Start frontend dev server
- [ ] Test translation features

---

## 🎯 Step-by-Step Instructions

### 1. Run Setup Script

**Windows (PowerShell):**
```powershell
cd sign-language-translator
.\scripts\setup-with-dataset.ps1
```

**macOS/Linux (Bash):**
```bash
cd sign-language-translator
chmod +x scripts/setup-with-dataset.sh
./scripts/setup-with-dataset.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Create project structure
- ✅ Install backend dependencies
- ✅ Install frontend dependencies
- ✅ Offer to clone SignAvatars dataset
- ✅ Process videos (if FFmpeg available)
- ✅ Prompt for Gemini API key

### 2. Configure API Key

Edit `backend/.env`:
```env
GEMINI_API_KEY=your_actual_api_key_here
```

### 3. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Expected output:
```
🚀 Server running on port 3000
✅ Gemini API connected
📊 Sign database loaded: 30 signs
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:5173
```

### 4. Open the App

Navigate to **http://localhost:5173** in your browser.

---

## 🎬 Dataset Options

### Option A: Sample Data (Included)
- 30 pre-indexed signs
- No additional download needed
- Perfect for development and testing

### Option B: Full SignAvatars Dataset
1. **Clone the repository:**
   ```bash
   git clone https://github.com/ZhengdiYu/SignAvatars.git backend/dataset/raw/SignAvatars
   ```

2. **Process videos:**
   ```bash
   cd backend
   node dataset-processor.js
   ```

3. **Expected output:**
   ```
   ✅ ASL: 1,234 signs indexed
   ✅ BSL: 891 signs indexed
   ✅ ISL: 567 signs indexed
   ✅ Total: 2,692 signs ready
   ```

### Option C: Custom Videos
1. Place MP4 videos in `backend/dataset/raw/{dialect}/`
2. Name format: `SIGN_GLOSS.mp4` (e.g., `HELLO.mp4`)
3. Run processor: `node dataset-processor.js`

---

## ✅ Verification Checklist

### Backend Health
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok"}`

### Sign Database
```bash
curl http://localhost:3000/api/signs/stats
```
Expected: `{"totalSigns":30,"dialects":{"ASL":15,"BSL":8,"ISL":7}}`

### Fallback System
```bash
curl http://localhost:3000/api/fallback/available
```
Expected: List of 50+ procedural fallback signs

### Frontend
- [ ] 3D avatar renders
- [ ] Dialect switcher works
- [ ] Microphone button responds
- [ ] Video/3D toggle button present

---

## 🔧 Troubleshooting

### "GEMINI_API_KEY not set"
→ Add your API key to `backend/.env`

### "FFmpeg not found"
→ Install FFmpeg or use sample data

### "Cannot connect to server"
→ Ensure backend is running on port 3000

### "Video not playing"
→ Fallback to 3D animation is automatic

### Port already in use
```bash
# Find process using port 3000
netstat -ano | findstr :3000
# Kill process
taskkill /PID <PID> /F
```

---

## 📁 Final Project Structure

```
sign-language-translator/
├── backend/
│   ├── dataset/
│   │   ├── raw/           # Original videos
│   │   ├── processed/     # Web-optimized videos
│   │   ├── metadata/      # sign-index.json
│   │   └── thumbnails/    # Preview images
│   ├── server.js          # Express + Socket.IO
│   ├── gemini.js          # Gemini API integration
│   ├── signDatabase.js    # Sign query interface
│   ├── signFallback.js    # Procedural fallback
│   └── .env               # API keys
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Avatar3D.jsx      # 3D avatar
│   │   │   ├── VideoAvatar.jsx   # Hybrid avatar
│   │   │   └── ...
│   │   └── App.jsx
│   └── package.json
├── docs/
│   ├── DATASET_SETUP.md
│   ├── API_DOCUMENTATION.md
│   └── DEPLOYMENT.md
├── scripts/
│   ├── setup-with-dataset.sh   # Bash setup
│   └── setup-with-dataset.ps1  # PowerShell setup
└── README.md
```

---

## 🎉 Day 1 Complete!

You now have:
- ✅ Working sign language translator
- ✅ Gemini 2.0 Flash integration
- ✅ 3D avatar with procedural animations
- ✅ Video avatar (when dataset available)
- ✅ Multi-dialect support (ASL, BSL, ISL)
- ✅ Fallback system for missing signs

**Next Steps:**
- Add more signs to the database
- Customize the avatar appearance
- Explore teaching mode
- Prepare for deployment

---

## 📚 Additional Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [SignAvatars Dataset](https://github.com/ZhengdiYu/SignAvatars)
- [Three.js Documentation](https://threejs.org/docs/)
- [Socket.IO Guide](https://socket.io/docs/v4/)
