#!/bin/bash
# ================================
# SignBridge Quick Deploy Script
# Deploys frontend to Vercel
# ================================

set -e  # Exit on error

echo ""
echo "🚀 Deploying SignBridge to Production"
echo "======================================"
echo ""

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build and deploy frontend
echo "📦 Building frontend..."
cd frontend
npm run build

echo ""
echo "🌐 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Frontend deployment complete!"
echo ""

# Backend reminder
echo "🔧 Backend (Render):"
echo "   Render deploys automatically on git push."
echo "   Make sure you have:"
echo "   1. Connected your GitHub repo to Render"
echo "   2. Set GEMINI_API_KEY in Render dashboard"
echo "   3. Set ALLOWED_ORIGINS to your Vercel URL"
echo ""

# Verify health
echo "🏥 To verify deployment, run:"
echo "   curl https://your-backend.onrender.com/health"
echo ""

echo "📋 Deployment URLs:"
echo "   Frontend: https://your-app.vercel.app"
echo "   Backend:  https://your-backend.onrender.com"
echo ""
echo "🎬 Don't forget to:"
echo "   1. Test all features on production"
echo "   2. Record demo video"
echo "   3. Update README with live URLs"
echo "   4. Submit to Devpost"
echo ""
echo "🏆 Good luck with the hackathon!"
