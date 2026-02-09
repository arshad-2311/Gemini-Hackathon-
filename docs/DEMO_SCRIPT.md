# SignBridge Demo Script

## Video Recording Guide

**Total Duration:** 3:00 minutes  
**Resolution:** 1920x1080 (1080p)  
**Frame Rate:** 60fps recommended

---

## Pre-Recording Checklist

- [ ] Backend server running (`npm run dev` in backend/)
- [ ] Frontend running (`npm run dev` in frontend/)
- [ ] Demo mode enabled (click 🎬 Demo button)
- [ ] Recording mode ON (check the checkbox)
- [ ] Hide cursor enabled (optional)
- [ ] Browser in full-screen (F11)
- [ ] All browser extensions hidden
- [ ] Microphone working (for voiceover)

---

## Scene-by-Scene Script

### 🎬 Scene 1: Introduction (0:00 - 0:15)

**Visual:** SignBridge logo/title screen with animated background

**Voiceover:**
> "Introducing SignBridge — an AI-powered sign language translator that bridges the communication gap between deaf and hearing communities, powered by Google Gemini 2.0 Flash."

**Key Points:**
- Show logo prominently
- Highlight "Powered by Gemini 2.0"

---

### 🎙️ Scene 2: Voice-to-Sign Translation (0:15 - 0:45)

**Visual:** Main app interface with 3D avatar

**Action (Demo Scenario 1):**
1. Click ▶ Play on "Basic Translation" scenario
2. Watch text auto-type: "Hello, how are you?"
3. Show processing indicator (Gemini logo)
4. Avatar signs the phrase with expressions

**Voiceover:**
> "Speak naturally in English, and watch our 3D avatar translate your words into American Sign Language in real-time. 
> 
> Notice how Gemini doesn't just translate word-by-word — it understands ASL grammar, applying Topic-Comment structure and adding appropriate facial expressions."

**Highlight:**
- Gemini processing overlay
- Facial expressions on avatar
- Smooth animation transitions

---

### 🎯 Scene 3: Spatial Awareness (0:45 - 1:15)

**Visual:** Camera feed visible, objects detected

**Action (Demo Scenario 2):**
1. Play "Spatial Awareness" scenario
2. Camera feed appears
3. Book detected with pulsing marker
4. User says "Can you pass me that book?"
5. Avatar signs AND points to the book's location

**Voiceover:**
> "Here's something no other sign language tool can do — spatial awareness.
>
> Using Gemini Vision, SignBridge detects objects in your environment. When you reference them in speech, the avatar actually POINTS to where they are.
>
> This is how real sign language works — grounded in physical space."

**Highlight:**
- Object detection overlay ("Powered by Gemini Vision")
- Pointing gesture animation
- Coordination between signing and pointing

---

### 🤖 Scene 4: AI Teaching Agent (1:15 - 1:55)

**Visual:** Teaching panel open

**Action (Demo Scenario 3):**
1. Play "AI Teaching Agent" scenario
2. Select THANK-YOU sign
3. Watch reference animation
4. Show simulated practice attempt
5. Display feedback: 87% accuracy
6. Show corrections
7. Second attempt: 95% accuracy
8. Celebration overlay

**Voiceover:**
> "SignBridge isn't just a translator — it's a teacher.
>
> Select a sign to practice, watch the reference animation, then try it yourself. Gemini analyzes your signing in real-time.
>
> You get an accuracy score, specific corrections like 'hand should start at chin, not cheek,' and cultural context notes.
>
> With practice, watch your accuracy improve from 87% to 95%. The AI adapts to YOUR learning style."

**Highlight:**
- Accuracy percentage prominently displayed
- Specific correction text
- Improvement celebration

---

### 🌍 Scene 5: Dialect Switching (1:55 - 2:20)

**Visual:** Dialect switcher component

**Action (Demo Scenario 4):**
1. Play "Dialect Switching" scenario
2. Show current ASL sequence
3. Click ISL button
4. Transition animation plays
5. Show ISL version with different word order

**Voiceover:**
> "Sign languages aren't universal. ASL, British Sign Language, and Indian Sign Language have different grammar, vocabulary, and cultural expressions.
>
> Watch as we switch from ASL to ISL. Gemini adapts the grammar — notice the word order changes from Topic-Comment to Subject-Object-Verb.
>
> This is cultural-aware translation, not just word substitution."

**Highlight:**
- Grammar change (word order)
- Transition animation
- Dialect information panel

---

### 📄 Scene 6: Document-to-Lesson (2:20 - 2:45)

**Visual:** Document upload panel

**Action (Demo Scenario 5):**
1. Play "Document to Lesson" scenario
2. Show document upload (medical terminology)
3. Processing animation with progress bar
4. Generated lesson appears
5. Scroll through vocabulary and sentences

**Voiceover:**
> "Have a document you need to learn in sign language? Upload any PDF, Word document, or text file.
>
> Gemini extracts key vocabulary, creates practice sentences in proper ASL grammar, adds cultural notes, and builds a progressive learning path.
>
> From medical terminology to legal documents — custom sign language lessons in seconds."

**Highlight:**
- Progress bar during generation
- Vocabulary table
- Cultural notes section

---

### 🏆 Scene 7: Closing (2:45 - 3:00)

**Visual:** Feature summary with Gemini branding

**Voiceover:**
> "SignBridge — real-time translation, AI teaching, spatial awareness, dialect support, and custom lesson generation.
>
> All powered by Google Gemini 2.0 Flash.
>
> Breaking communication barriers, one sign at a time."

**On Screen:**
```
SignBridge
━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Voice-to-Sign Translation
✓ AI Teaching Agent  
✓ Spatial Awareness
✓ 3 Dialect Support
✓ Document-to-Lesson

Powered by Gemini 2.0 Flash
```

---

## Recording Tips

### Audio
- Record voiceover separately for clean audio
- Use a quiet environment
- Speak slowly and clearly (this is about accessibility!)

### Video
- Use OBS or similar for screen recording
- Enable "Hide cursor" in demo mode
- Close all notifications
- Use dark mode in browser

### Timing
- Demo scenarios have built-in timing
- Practice the voiceover to match the visuals
- Leave 0.5s buffer between scenes

### Editing
- Add subtle transitions between scenes
- Include feature labels/callouts
- Add background music (soft, not distracting)
- Ensure all text is readable

---

## Fallback Plan

If demo fails:
1. Use offline demo mode (no API needed)
2. All scenarios use mock data
3. Animations work without backend
4. Re-record individual scenes if needed

---

## Post-Recording

- [ ] Review for audio sync
- [ ] Check all text is readable
- [ ] Verify Gemini mentions are clear
- [ ] Add captions (accessibility!)
- [ ] Export at 1080p, 60fps
- [ ] Upload to YouTube (unlisted)
- [ ] Add to Devpost submission
