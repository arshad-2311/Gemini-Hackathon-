# SignBridge Deployment Checklist

Use this checklist before and after deploying to production.

---

## Pre-Deployment

### Environment Setup
- [ ] Backend `.env` configured with real values
- [ ] `GEMINI_API_KEY` is valid and has quota
- [ ] `ALLOWED_ORIGINS` set to frontend URL
- [ ] Frontend `.env` configured with backend URL
- [ ] `VITE_BACKEND_URL` points to production backend
- [ ] `VITE_WS_URL` uses `wss://` protocol

### Code Ready
- [ ] All dependencies installed (`npm install`)
- [ ] No console errors in development
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Backend starts without errors
- [ ] All imports are correct (no missing modules)

---

## Backend Deployment (Render)

### Initial Setup
- [ ] GitHub repository connected
- [ ] Root directory set to `backend`
- [ ] Build command: `npm install`
- [ ] Start command: `node server.js`
- [ ] Environment variables added in dashboard

### Verification
- [ ] Deploy completes without errors
- [ ] Health check passes: `curl https://your-backend.onrender.com/health`
- [ ] Response: `{"status":"ok","uptime":...}`
- [ ] Logs show "Server running" message
- [ ] No API key warnings in logs

---

## Frontend Deployment (Vercel)

### Initial Setup
- [ ] GitHub repository connected
- [ ] Root directory set to `frontend`
- [ ] Framework preset: Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variables configured

### Verification
- [ ] Deploy completes without errors
- [ ] Site loads without blank screen
- [ ] No console errors on load
- [ ] Favicon and title correct

---

## Post-Deployment Testing

### Connection
- [ ] WebSocket connects (check browser console)
- [ ] "Connected to Sign Language Translator" message received
- [ ] No CORS errors in console
- [ ] Reconnection works after brief disconnect

### Features

#### Voice-to-Sign Translation
- [ ] Microphone permission granted
- [ ] Speech recognition starts
- [ ] Text appears in transcript
- [ ] Signs play on avatar
- [ ] Facial expressions animate

#### Avatar Performance
- [ ] 60fps animation (check with DevTools Performance)
- [ ] Smooth transitions between signs
- [ ] No jank or stuttering
- [ ] Responsive on resize

#### Spatial Awareness
- [ ] Camera permission granted
- [ ] Objects detected and displayed
- [ ] Markers appear on detected objects
- [ ] Pointing gestures work

#### Teaching Mode
- [ ] Panel opens correctly
- [ ] Reference animations play
- [ ] Feedback displays after practice
- [ ] Progress saves to localStorage

#### Dialect Switching
- [ ] All three dialects selectable (ASL/BSL/ISL)
- [ ] Transition animation plays
- [ ] Avatar adapts to dialect

#### Document Upload
- [ ] File upload works
- [ ] Processing indicator appears
- [ ] Lesson generates and displays
- [ ] Vocabulary table populated

#### Demo Mode
- [ ] Demo button visible
- [ ] All 5 scenarios play correctly
- [ ] Recording mode works
- [ ] Auto-play functions

### Error Handling
- [ ] Toast notifications appear for errors
- [ ] Connection status indicator works
- [ ] Graceful fallback when Gemini fails
- [ ] No unhandled exceptions

---

## Performance Checklist

| Metric | Target | Actual |
|--------|--------|--------|
| Initial Load | < 3s | _____ |
| Time to Interactive | < 5s | _____ |
| Avatar FPS | 60fps | _____ |
| API Response | < 2s | _____ |
| Bundle Size (gzipped) | < 500KB | _____ |

### How to Measure
```javascript
// In browser console:
// FPS
const fps = performance.now(); // Check frame timing

// Bundle size
// Check Network tab → Size column

// API response
// Check Network tab → Time column for socket events
```

---

## Security Checklist

- [ ] API key not exposed in frontend code
- [ ] CORS restricts to specific origin
- [ ] Rate limiting active (60 req/min)
- [ ] No sensitive data in console logs
- [ ] HTTPS only in production

---

## Final Submission

- [ ] Demo video recorded
- [ ] README updated with live URLs
- [ ] Devpost submission complete
- [ ] All team members listed
- [ ] GitHub repo is public (or shared with judges)

---

## Quick Fixes

### "WebSocket connection failed"
→ Check `ALLOWED_ORIGINS` in backend matches frontend URL exactly

### "Gemini API error"
→ Check API key is valid at https://makersuite.google.com

### "Blank screen"
→ Check browser console for errors, ensure build completed

### "CORS error"
→ Backend must allow frontend origin, check protocol (http vs https)

### "Avatar not animating"
→ Check Three.js loaded, no console errors, WebGL supported

---

## Deployment URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://_________________.vercel.app |
| **Backend** | https://_________________.onrender.com |
| **Health Check** | https://_________________.onrender.com/health |
| **Demo Video** | https://youtube.com/watch?v=_____________ |
| **GitHub** | https://github.com/_______________/signbridge |

---

**Deployment completed on:** ____/____/2026  
**Tested by:** ________________  
**Status:** ☐ Ready for Submission
