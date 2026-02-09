# ================================
# SignBridge Quick Deploy Script
# Windows PowerShell Version
# ================================

Write-Host ""
Write-Host "🚀 Deploying SignBridge to Production" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check for Vercel CLI
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "📦 Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Build and deploy frontend
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm run build

Write-Host ""
Write-Host "🌐 Deploying to Vercel..." -ForegroundColor Yellow
vercel --prod

Write-Host ""
Write-Host "✅ Frontend deployment complete!" -ForegroundColor Green
Write-Host ""

# Backend reminder
Write-Host "🔧 Backend (Render):" -ForegroundColor Cyan
Write-Host "   Render deploys automatically on git push."
Write-Host "   Make sure you have:"
Write-Host "   1. Connected your GitHub repo to Render"
Write-Host "   2. Set GEMINI_API_KEY in Render dashboard"
Write-Host "   3. Set ALLOWED_ORIGINS to your Vercel URL"
Write-Host ""

# Verify health
Write-Host "🏥 To verify deployment, run:" -ForegroundColor Yellow
Write-Host "   Invoke-RestMethod https://your-backend.onrender.com/health"
Write-Host ""

Write-Host "📋 Deployment URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: https://your-app.vercel.app"
Write-Host "   Backend:  https://your-backend.onrender.com"
Write-Host ""
Write-Host "🎬 Don't forget to:" -ForegroundColor Yellow
Write-Host "   1. Test all features on production"
Write-Host "   2. Record demo video"
Write-Host "   3. Update README with live URLs"
Write-Host "   4. Submit to Devpost"
Write-Host ""
Write-Host "🏆 Good luck with the hackathon!" -ForegroundColor Green

Set-Location ..
