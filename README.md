# 🤟 SignBridge - AI-Powered Sign Language Translator

[![Gemini 2.0](https://img.shields.io/badge/Powered%20by-Gemini%202.0%20Flash-blue?style=for-the-badge&logo=google)](https://deepmind.google/technologies/gemini/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-3D-black?style=for-the-badge&logo=three.js)](https://threejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

> **Breaking communication barriers with AI-powered sign language translation, teaching, and spatial awareness.**

SignBridge is a revolutionary real-time sign language translator that leverages **Google Gemini 2.0 Flash** to bridge the communication gap between deaf and hearing communities. Unlike traditional translators, SignBridge features an intelligent 3D avatar that understands spatial context, learns from your signing, and provides culturally-aware translations across multiple sign language dialects.

---

## 🎯 What It Does

SignBridge transforms spoken language into expressive sign language animations in real-time, and vice versa. Powered by Gemini 2.0's multimodal capabilities, it goes beyond simple word-to-sign mapping by understanding **grammar**, **spatial context**, and **cultural nuances** across ASL, BSL, and ISL. The AI teaching agent analyzes your signing technique and provides personalized feedback to help you improve.

---

## 🌟 Key Features

| Feature | Description | Gemini Integration |
|---------|-------------|-------------------|
| 🎙️ **Voice-to-Sign Translation** | Speak naturally and watch the 3D avatar sign in real-time | Gemini converts speech to ASL grammar |
| ✋ **Real-Time Sign Prediction** | Sign to the camera and get instant translation & speech | Gemini Vision analyzes video frames |
| 📹 **How2Sign Integration** | View real human motion-captured signs for maximum accuracy | Hybrid retrieval system (Pose + Video) |
| 🤖 **AI Teaching Agent** | Analyzes your signing and provides accuracy scores + corrections | Gemini evaluates pose data |
| 🎯 **Spatial Awareness** | Avatar points to real objects detected in your camera | Gemini Vision object detection |
| 🌍 **Dialect Switching** | Seamlessly translate between ASL ↔ ISL ↔ BSL | Gemini handles linguistic differences |
| 🧠 **Context Memory** | Smart sign suggestions based on conversation context | Gemini contextual reasoning |
| 📄 **Document-to-Lesson** | Upload any document to generate sign language lessons | Gemini curriculum generation |

---

## 🚀 Innovation Highlights

### 1. 🎯 Spatial Context Integration — *World's First*

Traditional sign language tools ignore the **physical environment**. SignBridge uses Gemini Vision to detect objects in your camera feed and integrates them into the signing experience:

```
User says: "Can you pass me that book?"
                    ↓
Gemini detects: Book at left position (96% confidence)
                    ↓
Avatar signs: BOOK → THAT [POINTS LEFT] → GIVE-ME
```

**Why it matters:** Real conversations reference objects in the environment. SignBridge makes sign language feel natural and grounded in reality.

### 2. 🤖 AI Teaching Agent — *Personalized Learning*

Unlike static tutorials, SignBridge's teaching agent powered by Gemini provides **real-time, personalized feedback**:

- **Accuracy Scoring**: "Your THANK-YOU sign was 87% accurate"
- **Specific Corrections**: "Hand should start at chin, not cheek"
- **Cultural Notes**: "In Deaf culture, this sign is considered formal"
- **Progress Tracking**: Streak counters and achievement badges

### 3. 🌍 Cultural Context Awareness

Gemini understands that sign languages are **not universal**. ASL, BSL, and ISL have different:

- **Grammar structures** (ASL: Topic-Comment, ISL: SOV)
- **Alphabets** (ASL: one-handed, BSL: two-handed)
- **Regional expressions** (cultural greetings vary significantly)

SignBridge preserves these nuances instead of forcing a one-size-fits-all approach.

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        SIGNBRIDGE                            │
├─────────────────────────────────────────────────────────────┤
│  🧠 AI LAYER                                                 │
│  └── Google Gemini 2.0 Flash (Multimodal)                   │
│      ├── Text-to-Sign Translation                           │
│      ├── Sign Analysis & Correction                         │
│      ├── Object Detection (Vision)                          │
│      └── Lesson Generation                                  │
├─────────────────────────────────────────────────────────────┤
│  🖥️ FRONTEND                                                │
│  ├── React 18 + Vite                                        │
│  ├── Three.js + React Three Fiber (3D Avatar)               │
│  ├── Socket.IO Client (Real-time)                           │
│  └── Web Speech API (Voice I/O)                             │
├─────────────────────────────────────────────────────────────┤
│  ⚙️ BACKEND                                                 │
│  ├── Node.js + Express                                      │
│  ├── Socket.IO (WebSocket Server)                           │
│  └── Gemini API Client                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎬 Demo

📺 **[Watch Demo Video](#)** | 🌐 **[Try Live Demo](#)**

---

## 📸 Screenshots

<table>
  <tr>
    <td><img src="docs/screenshots/translation.png" width="300" alt="Translation"><br><b>Real-time Translation</b></td>
    <td><img src="docs/screenshots/teaching.png" width="300" alt="Teaching"><br><b>AI Teaching Mode</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/spatial.png" width="300" alt="Spatial"><br><b>Spatial Awareness</b></td>
    <td><img src="docs/screenshots/dialects.png" width="300" alt="Dialects"><br><b>Dialect Switching</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/lessons.png" width="300" alt="Lessons"><br><b>Document Lessons</b></td>
    <td><img src="docs/screenshots/progress.png" width="300" alt="Progress"><br><b>Progress Tracking</b></td>
  </tr>
</table>

---

## 🏗️ Architecture

```
┌──────────────┐     WebSocket      ┌──────────────┐     API      ┌──────────────┐
│   Browser    │ ←───────────────→  │   Backend    │ ←─────────→  │   Gemini     │
│              │                    │              │              │   2.0 Flash  │
│ ┌──────────┐ │   speech-input     │ ┌──────────┐ │              │              │
│ │  React   │ │ ─────────────────→ │ │ Socket.IO│ │  Translate   │ ┌──────────┐ │
│ │   App    │ │                    │ │  Server  │ │ ───────────→ │ │   Text   │ │
│ └──────────┘ │   play-signs       │ └──────────┘ │              │ │ Analysis │ │
│              │ ←───────────────── │              │              │ └──────────┘ │
│ ┌──────────┐ │                    │ ┌──────────┐ │              │              │
│ │  Three.js│ │   check-my-sign    │ │  Gemini  │ │  Analyze     │ ┌──────────┐ │
│ │  Avatar  │ │ ─────────────────→ │ │  Service │ │ ───────────→ │ │  Vision  │ │
│ └──────────┘ │                    │ └──────────┘ │              │ │ Analysis │ │
│              │   sign-feedback    │              │              │ └──────────┘ │
│ ┌──────────┐ │ ←───────────────── │              │              │              │
│ │  Camera  │ │                    │              │              │              │
│ │  Input   │ │   detect-objects   │              │              │              │
│ └──────────┘ │ ─────────────────→ │              │              │              │
└──────────────┘                    └──────────────┘              └──────────────┘
```

---

## 🔧 Installation & Setup

### Prerequisites

- **Node.js 18+** ([Download](https://nodejs.org))
- **Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/signbridge.git
cd signbridge

# Backend setup
cd backend
npm install
echo "GEMINI_API_KEY=your_api_key_here" > .env
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Gemini 2.0 API key | ✅ Yes |
| `PORT` | Backend port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |

---

## 🚀 Deployment

We support a **Hybrid Deployment** strategy for the best balance of performance and cost:

- **Frontend:** Google Cloud Run (High performance, supports Gemini features)
- **Backend:** Render (Free hosting for API)

### Easy Deployment Script
Run our automated script to deploy:

```powershell
.\deploy.ps1
```

Select **Option 3** to deploy the Frontend to Google Cloud Run. For the backend, follow the instructions in **Option 4** to deploy to Render.

---

## 🎮 Usage Guide

### 1. Voice-to-Sign Translation
1. Click the **🎤 microphone button** to start listening
2. Speak naturally in English
3. Watch the avatar sign your words in real-time
4. Toggle dialects (ASL/BSL/ISL) for different sign languages

### 2. Learning Mode
1. Click **📚 Learn** to open the teaching panel
2. Select a sign to practice (e.g., THANK-YOU)
3. Watch the reference animation
4. Sign along and get AI feedback
5. View your accuracy score and corrections

### 3. Spatial Awareness
1. Allow camera access when prompted
2. Place objects in view (book, cup, phone, etc.)
3. Say sentences like "Can you pass me that book?"
4. Watch the avatar point to detected objects

### 4. Document Lessons
1. Click **📄 Upload** button
2. Upload a PDF, DOCX, or TXT file
3. Wait for Gemini to generate your lesson
4. Practice vocabulary and sentences

---

## 🧠 Gemini Integration Details

### How We Use Gemini 2.0 Flash

| Feature | Gemini Capability | Example Prompt |
|---------|------------------|----------------|
| Translation | Text understanding + Grammar | "Convert 'How are you?' to ASL glosses considering Topic-Comment structure" |
| Teaching | Multimodal analysis | "Analyze this pose data for THANK-YOU sign accuracy" |
| Spatial | Vision API | "Detect objects in this image and return positions" |
| Dialects | Linguistic reasoning | "Translate ASL sequence to ISL, adapting grammar structure" |
| Lessons | Content generation | "Create a sign language curriculum from this medical document" |

### Sample API Usage

```javascript
// Translation prompt structure
const prompt = `
You are an expert ASL linguist. Convert this English text 
to a precise sequence of ASL signs following Topic-Comment 
grammar structure. Include facial expressions and timing.

Text: "${userInput}"

Respond with JSON: [{ gloss, duration, expression }]
`;

const result = await gemini.generateContent(prompt);
```

---

## 🎯 Hackathon Categories

| Category | Our Alignment |
|----------|---------------|
| 🏆 **Best Multimodal Application** | Vision (object detection) + Text (translation) + Generation (lessons) |
| 🤖 **Best AI Agent** | Teaching agent with memory, feedback, and personalization |
| ⚡ **Best Use of Gemini 2.0** | Leverages Flash model for real-time, intelligent responses |
| 🌟 **Grand Prize** | Novel solution to real-world accessibility challenge |

---

## 📊 Impact

<table>
  <tr>
    <td align="center"><h2>70M+</h2>Deaf people worldwide</td>
    <td align="center"><h2>300+</h2>Sign languages globally</td>
    <td align="center"><h2>2%</h2>Deaf people with interpreter access</td>
  </tr>
</table>

**SignBridge addresses:**
- 🎯 **Communication barriers** in daily life
- 📚 **Lack of accessible learning tools**
- 💼 **Workplace inclusion challenges**
- 🏥 **Healthcare communication gaps**

---

## 🏆 Accomplishments

- ✅ Built complete application in **7 days**
- ✅ Supports **3 sign language dialects** (ASL, BSL, ISL)
- ✅ Real-time 3D animation at **60 FPS**
- ✅ First sign language tool with **spatial awareness**
- ✅ AI teaching agent with **personalized feedback**
- ✅ Works **offline** with service worker caching
- ✅ Demo mode for **perfect recordings**

---

## 🔮 Future Plans

- 📱 **Mobile Apps** - iOS and Android native apps
- 🌏 **More Dialects** - JSL, Auslan, LSF, and more
- 🤖 **Fine-tuned Model** - Gemini trained specifically on sign language
- 📴 **Offline Mode** - Compressed models for no-internet use
- 📹 **Video Calls** - Integration with Zoom, Meet, Teams
- 👓 **AR Mode** - Augmented reality signing overlay
- 🏢 **Enterprise** - API for businesses and healthcare

---

## 🙏 Acknowledgments

- **Google Gemini Team** for the incredible AI capabilities
- **Deaf Community** for feedback and guidance
- **ASL, BSL, ISL Experts** for linguistic accuracy
- **Open Source Community** for amazing tools

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>Made with ❤️ for the Gemini 3 Hackathon</b><br>
  <a href="#demo">Watch Demo</a> •
  <a href="#installation--setup">Get Started</a> •
  <a href="#usage-guide">Documentation</a>
</p>
