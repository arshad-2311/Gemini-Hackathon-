# 🤟 Gemini Sign Language Demo - Quick Start

## 🚀 Installation

### 1. Install Dependencies

```bash
# Backend dependencies
cd backend
npm install @google/generative-ai @sign-mt/browsermt xml2js glob dotenv express socket.io cors

# Frontend dependencies  
cd ../frontend
npm install @sign-mt/i18n three @react-three/fiber @react-three/drei
```

> **Note:** If `@sign-mt/i18n` fails, the app will use a fallback avatar renderer.

### 2. Set Up Environment

```bash
# Create .env in backend folder
cd backend
echo "GEMINI_API_KEY=your_key_here" > .env
```

Get your API key from: https://makersuite.google.com/app/apikey

### 3. Run the App

```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev
```

### 4. Access the Demo
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

---

## Setup Steps

### 1. Add Reference Images
```bash
# Create directories (already done)
mkdir reference_signs validated_signs

# Add ASL reference images:
# reference_signs/
#   ├── HELLO.jpg
#   ├── THANK-YOU.jpg
#   ├── PLEASE.jpg
#   ├── GOODBYE.jpg
#   └── ...
```

**Where to get images:**
- [Lifeprint.com](https://www.lifeprint.com/asl101/) - Dr. Bill Vicars' ASL dictionary
- [Signing Savvy](https://www.signingsavvy.com/) - Video screenshots
- [HandSpeak](https://www.handspeak.com/) - ASL dictionary

### 2. Generate Pose Database
```bash
cd backend
node scripts/buildSignDatabase.js
```

### 3. Start the App
```bash
# Backend (already running)
cd backend && npm run dev

# Frontend (already running)
cd frontend && npm run dev
```

### 4. Access the Demo
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

---

## 🎬 Hackathon Demo Script

### Quick Demo (2 minutes)
```javascript
import { runHackathonDemo } from './GeminiSignLanguageApp.js';

// Show all Gemini capabilities
await runHackathonDemo();
```

### Interactive Demo
```javascript
import { GeminiSignLanguageApp } from './GeminiSignLanguageApp.js';

const app = new GeminiSignLanguageApp();

// 1. Start live coaching
const lesson = await app.startDemoLesson('greeting');

// 2. Process user's video frame
const feedback = await app.processVideoFrame(base64Frame);

// 3. Show the feedback
console.log(feedback);
```

---

## API Endpoints

### Translation
```bash
POST /api/v2/translate-to-sign
{
  "text": "Hello, how are you?",
  "language": "ASL"
}
```

### Sign Feedback
```bash
POST /api/feedback/compare
{
  "targetSign": "HELLO",
  "userFrame": "<base64 image>",
  "language": "ASL"
}
```

### Lesson Generation
```bash
POST /api/v2/generate-lesson
{
  "topic": "Basic Greetings",
  "difficulty": "beginner",
  "lessonCount": 5
}
```

---

## 📁 Project Structure
```
backend/
├── GeminiSignLanguageApp.js    # Main app (all capabilities)
├── services/
│   ├── geminiSignTranslation.js
│   ├── geminiSignCorrection.js
│   ├── geminiLessonGenerator.js
│   ├── geminiVision.js
│   ├── geminiVisualSignLearning.js
│   ├── geminiLiveLesson.js
│   └── geminiSignReferences.js
├── routes/
│   ├── signLanguage.js
│   └── signFeedback.js
├── scripts/
│   └── buildSignDatabase.js
├── reference_signs/     # Put ASL images here
└── validated_signs/     # Generated pose data
```

## 🚀 Gemini Features Used
1. **Gemini Vision** - Analyze ASL reference images
2. **Gemini Generation** - Create lessons & pose data
3. **Gemini Live API** - Real-time video feedback
4. **Gemini Image** - Generate visual aids
5. **Grounding** - Validate with external sources
