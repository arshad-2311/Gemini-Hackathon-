# Deployment Guide

Complete deployment instructions for SignBridge.

## Quick Deploy Options

| Platform | Best For | Time | Difficulty |
|----------|----------|------|------------|
| **Vercel + Render** | Free tier, quick setup | 15 min | Easy |
| **Docker** | Self-hosted, full control | 30 min | Medium |
| **Cloud Run + Firebase** | Scalability | 45 min | Medium |

---

## Option 1: Vercel + Render (Recommended)

### Step 1: Deploy Backend to Render

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

3. **Deploy Backend**
   - Click **New** → **Web Service**
   - Connect your GitHub repo
   - Configure:
     - **Name**: `signbridge-backend`
     - **Root Directory**: `backend`
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
   
4. **Add Environment Variables**
   - `GEMINI_API_KEY`: Your Gemini API key
   - `NODE_ENV`: `production`
   - `CORS_ORIGIN`: `https://your-app.vercel.app`

5. **Deploy** - Click "Create Web Service"
6. **Copy URL** - Note your backend URL (e.g., `https://signbridge-backend.onrender.com`)

### Step 2: Deploy Frontend to Vercel

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click **Add New** → **Project**
   - Import your GitHub repo

3. **Configure**
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Environment Variables**
   - `VITE_BACKEND_URL`: Your Render backend URL

5. **Deploy** - Click "Deploy"

### Step 3: Update CORS

Go back to Render and update:
- `CORS_ORIGIN`: Your Vercel URL (e.g., `https://signbridge.vercel.app`)

---

## Option 2: Docker Deployment

### Prerequisites
- Docker installed
- Docker Compose installed

### Quick Start

```bash
# Clone the repo
git clone https://github.com/your-username/signbridge.git
cd signbridge

# Set API key
export GEMINI_API_KEY=your_api_key_here

# Build and run
docker-compose up -d

# View logs
docker-compose logs -f
```

### Access
- **Frontend**: http://localhost
- **Backend**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

### Production Docker

```bash
# Build for production
docker-compose -f docker-compose.yml build

# Run with restart policy
docker-compose up -d --restart unless-stopped

# Scale if needed
docker-compose up -d --scale backend=3
```

---

## Option 3: Using Deploy Scripts

### Windows (PowerShell)
```powershell
# Run interactive deployment
.\deploy.ps1
```

### Mac/Linux (Bash)
```bash
# Make executable
chmod +x deploy.sh

# Run interactive deployment
./deploy.sh
```

---

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `CORS_ORIGIN` | No | Allowed frontend origin |

### Frontend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BACKEND_URL` | ✅ Yes | Backend API URL |
| `VITE_DEMO_MODE_ENABLED` | No | Enable demo mode (default: true) |

---

## Post-Deployment Checklist

- [ ] Backend health check: `curl https://your-backend.onrender.com/health`
- [ ] Frontend loads correctly
- [ ] WebSocket connection works (check console)
- [ ] Microphone permissions work
- [ ] Camera permissions work
- [ ] Translation works end-to-end
- [ ] Demo mode runs without errors

---

## Troubleshooting

### WebSocket Connection Issues

**Symptom**: "Connection failed" in console

**Fix**: Ensure CORS is configured correctly:
```javascript
// backend server.js
cors: {
  origin: 'https://your-frontend.vercel.app',
  methods: ['GET', 'POST'],
  credentials: true
}
```

### Render Sleep Issues

Free tier Render instances sleep after 15 minutes of inactivity.

**Fix**: Add a health check ping:
```javascript
// In frontend, add:
setInterval(() => {
  fetch('https://your-backend.onrender.com/health');
}, 840000); // Every 14 minutes
```

### Build Failures

**Symptom**: "Module not found" errors

**Fix**: Ensure all dependencies are in `package.json`:
```bash
cd frontend
npm install
cd ../backend
npm install
```

---

## Custom Domain Setup

### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as shown

### Render
1. Go to Service Settings → Custom Domain
2. Add your domain
3. Update DNS to point to Render

---

## Monitoring

### Recommended Tools
- **Uptime**: [UptimeRobot](https://uptimerobot.com) (free)
- **Errors**: [Sentry](https://sentry.io) (free tier)
- **Analytics**: [Plausible](https://plausible.io) (privacy-focused)

### Health Endpoints
- `GET /health` - Basic health check
- `GET /api/health` - Detailed health with memory usage
- `GET /api/logs` - Recent API request logs (debug)

---

## Support

If deployment fails:
1. Check GitHub Issues
2. Review error logs
3. Open a new issue with:
   - Platform (Vercel/Render/Docker)
   - Error message
   - Environment details
