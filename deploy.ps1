# ================================
# SignBridge Deployment Script
# Windows PowerShell Version
# ================================

Write-Host "🚀 SignBridge Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

function Test-Requirements {
    Write-Host "`n📋 Checking requirements..." -ForegroundColor Yellow
    
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Node.js is required but not installed." -ForegroundColor Red
        exit 1
    }
    
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "❌ npm is required but not installed." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ All requirements met!" -ForegroundColor Green
}

function Publish-Frontend {
    Write-Host "`n🌐 Deploying Frontend to Vercel..." -ForegroundColor Cyan
    Write-Host "-----------------------------------" -ForegroundColor Cyan
    
    if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
        Write-Host "Installing Vercel CLI..."
        npm install -g vercel
    }
    
    Set-Location frontend
    
    Write-Host "📦 Building frontend..." -ForegroundColor Yellow
    npm run build
    
    Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Yellow
    vercel --prod
    
    Set-Location ..
    Write-Host "✅ Frontend deployed!" -ForegroundColor Green
}

function Publish-Frontend-GCP {
    Write-Host "`n☁️ Deploying Frontend to Google Cloud Run..." -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Host "❌ 'gcloud' CLI is not installed." -ForegroundColor Red
        Write-Host "Please install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
        return
    }

    Write-Host "Checking Google Cloud authentication..."
    $project = gcloud config get-value project 2> $null
    
    if ([string]::IsNullOrWhiteSpace($project)) {
        Write-Host "⚠️ No active Google Cloud project found." -ForegroundColor Yellow
        Write-Host "Running 'gcloud init'..."
        gcloud init
    }

    Set-Location frontend
    
    Write-Host "`n📦 Building and deploying to Cloud Run..." -ForegroundColor Yellow
    Write-Host "This may take a few minutes..."
    
    # Get project ID again in case it changed
    $project = gcloud config get-value project
    $image = "gcr.io/$project/signbridge-frontend"
    
    # Submit build
    gcloud builds submit --tag $image
    
    # Deploy
    gcloud run deploy signbridge-frontend --image $image --platform managed --region us-central1 --allow-unauthenticated
    
    Set-Location ..
    Write-Host "`n✅ Frontend deployed to Google Cloud Run!" -ForegroundColor Green
}

function Show-BackendInstructions {
    Write-Host "`n⚙️ Backend Deployment (Render)" -ForegroundColor Cyan
    Write-Host "-------------------------------" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To deploy the backend to Render (Best Free Option):"
    Write-Host ""
    Write-Host "1. Push your code to GitHub"
    Write-Host "2. Go to https://render.com"
    Write-Host "3. Click 'New' → 'Web Service'"
    Write-Host "4. Connect your GitHub repository"
    Write-Host "5. Select the 'backend' directory as Root Directory"
    Write-Host "6. Add Environment Variable:"
    Write-Host "   - GEMINI_API_KEY: your-api-key"
    Write-Host ""
    Write-Host "✅ Render will automatically build and deploy."
}

function Start-Docker {
    Write-Host "`n🐳 Deploying with Docker..." -ForegroundColor Cyan
    Write-Host "---------------------------" -ForegroundColor Cyan
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Docker is required but not installed." -ForegroundColor Red
        exit 1
    }
    
    if (-not $env:GEMINI_API_KEY) {
        Write-Host "⚠️ GEMINI_API_KEY not set!" -ForegroundColor Yellow
        $env:GEMINI_API_KEY = Read-Host "Enter your Gemini API key"
    }
    
    Write-Host "📦 Building Docker images..." -ForegroundColor Yellow
    docker-compose build
    
    Write-Host "🚀 Starting containers..." -ForegroundColor Yellow
    docker-compose up -d
    
    Write-Host "`n✅ Docker deployment complete!" -ForegroundColor Green
    Write-Host "   Frontend: http://localhost"
    Write-Host "   Backend:  http://localhost:3000"
}

function Start-Local {
    Write-Host "`n💻 Starting Local Development..." -ForegroundColor Cyan
    Write-Host "---------------------------------" -ForegroundColor Cyan
    
    # Start backend in new window
    Write-Host "Starting backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm install; npm run dev"
    
    Start-Sleep -Seconds 3
    
    # Start frontend in new window
    Write-Host "Starting frontend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm install; npm run dev"
    
    Write-Host "`n✅ Local development running!" -ForegroundColor Green
    Write-Host "   Frontend: http://localhost:5173"
    Write-Host "   Backend:  http://localhost:3000"
}

# Main menu
function Show-Menu {
    Test-Requirements
    
    Write-Host "`nSelect deployment option:" -ForegroundColor Yellow
    Write-Host "1) Local Development"
    Write-Host "2) Deploy Frontend (Vercel)"
    Write-Host "3) Deploy Frontend (Google Cloud Run) 🆕"
    Write-Host "4) Deploy Backend (Render info)"
    Write-Host "5) Deploy with Docker"
    Write-Host "6) Exit"
    Write-Host ""
    
    $choice = Read-Host "Enter choice [1-6]"
    
    switch ($choice) {
        "1" { Start-Local }
        "2" { Publish-Frontend }
        "3" { Publish-Frontend-GCP }
        "4" { Show-BackendInstructions }
        "5" { Start-Docker }
        "6" { Write-Host "Goodbye!"; exit 0 }
        default { Write-Host "Invalid choice" -ForegroundColor Red; exit 1 }
    }
}

# Run
Show-Menu
