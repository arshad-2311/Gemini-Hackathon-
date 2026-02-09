# ============================================
# SIGN LANGUAGE TRANSLATOR - COMPLETE SETUP
# Includes SignAvatars Dataset Integration
# PowerShell version for Windows
# ============================================

$ErrorActionPreference = "Stop"

# Colors function
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# Banner
Write-Host ""
Write-ColorOutput "╔══════════════════════════════════════════════════════════════╗" "Magenta"
Write-ColorOutput "║                                                              ║" "Magenta"
Write-ColorOutput "║     🤟 SIGNBRIDGE - Complete Setup with Dataset 🤟          ║" "Magenta"
Write-ColorOutput "║                                                              ║" "Magenta"
Write-ColorOutput "║     Sign Language Communication Platform                     ║" "Magenta"
Write-ColorOutput "║     Powered by Google Gemini 2.0 Flash + SignAvatars        ║" "Magenta"
Write-ColorOutput "║                                                              ║" "Magenta"
Write-ColorOutput "╚══════════════════════════════════════════════════════════════╝" "Magenta"
Write-Host ""

# ============================================
# STEP 1: CHECK PREREQUISITES
# ============================================
Write-Host ""
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-ColorOutput "📋 STEP 1: Checking Prerequisites" "Blue"
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-Host ""

function Test-Command {
    param([string]$Command)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        Write-ColorOutput "  ✅ $Command found" "Green"
        return $true
    }
    catch {
        Write-ColorOutput "  ❌ $Command not found" "Red"
        return $false
    }
}

$MissingDeps = $false
$FFmpegAvailable = $false

Write-Host "Checking required tools..."
if (-not (Test-Command "node")) { $MissingDeps = $true }
if (-not (Test-Command "npm")) { $MissingDeps = $true }
if (-not (Test-Command "git")) { $MissingDeps = $true }

Write-Host ""
Write-Host "Checking optional tools (for dataset processing)..."
if (Test-Command "ffmpeg") { $FFmpegAvailable = $true }
else { Write-ColorOutput "  ⚠️  FFmpeg not found - video processing will be limited" "Yellow" }

Test-Command "ffprobe" | Out-Null

if ($MissingDeps) {
    Write-Host ""
    Write-ColorOutput "❌ Missing required dependencies. Please install them first." "Red"
    Write-Host "  - Node.js: https://nodejs.org/"
    Write-Host "  - Git: https://git-scm.com/"
    exit 1
}

Write-Host ""
Write-ColorOutput "✅ All required dependencies found!" "Green"

# ============================================
# STEP 2: PROJECT STRUCTURE
# ============================================
Write-Host ""
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-ColorOutput "📁 STEP 2: Setting Up Project Structure" "Blue"
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-Host ""

# Create dataset directories
Write-Host "Creating dataset directories..."
$dirs = @(
    "backend/dataset/raw",
    "backend/dataset/processed/asl",
    "backend/dataset/processed/bsl",
    "backend/dataset/processed/isl",
    "backend/dataset/metadata",
    "backend/dataset/thumbnails/asl",
    "backend/dataset/thumbnails/bsl",
    "backend/dataset/thumbnails/isl"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-ColorOutput "✅ Dataset directories created" "Green"

# ============================================
# STEP 3: BACKEND SETUP
# ============================================
Write-Host ""
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-ColorOutput "🔧 STEP 3: Setting Up Backend" "Blue"
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-Host ""

Push-Location backend

if (-not (Test-Path "package.json")) {
    Write-Host "Initializing backend..."
    npm init -y | Out-Null
}

Write-Host "Installing backend dependencies..."
npm install express socket.io cors dotenv "@google/generative-ai" --silent

if ($FFmpegAvailable) {
    Write-Host "Installing fluent-ffmpeg for video processing..."
    npm install fluent-ffmpeg --silent
}

Write-ColorOutput "✅ Backend dependencies installed" "Green"

# Create .env if not exists
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "Creating .env file..."
    @"
# Server Configuration
PORT=3000
NODE_ENV=development

# Gemini API Key (REQUIRED)
# Get your key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
"@ | Out-File -FilePath ".env" -Encoding utf8
    Write-ColorOutput "⚠️  Created .env file - you'll need to add your Gemini API key" "Yellow"
}

Pop-Location

# ============================================
# STEP 4: FRONTEND SETUP
# ============================================
Write-Host ""
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-ColorOutput "🎨 STEP 4: Setting Up Frontend" "Blue"
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-Host ""

Push-Location frontend

if (-not (Test-Path "package.json")) {
    Write-Host "Initializing frontend with Vite + React..."
    npm create vite@latest . -- --template react --yes | Out-Null
}

Write-Host "Installing frontend dependencies..."
npm install --silent
npm install three "@react-three/fiber" "@react-three/drei" socket.io-client --silent

Write-ColorOutput "✅ Frontend dependencies installed" "Green"

Pop-Location

# ============================================
# STEP 5: SIGNAVATARS DATASET
# ============================================
Write-Host ""
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-ColorOutput "🎬 STEP 5: SignAvatars Dataset Setup" "Blue"
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-Host ""

Write-ColorOutput "📥 DATASET DOWNLOAD OPTIONS:" "Yellow"
Write-Host ""
Write-Host "Option A: Clone SignAvatars repository"
Write-Host "  git clone https://github.com/ZhengdiYu/SignAvatars.git backend/dataset/raw"
Write-Host ""
Write-Host "Option B: Download from Google Drive/Hugging Face"
Write-Host "  See: https://github.com/ZhengdiYu/SignAvatars#data"
Write-Host ""
Write-Host "Option C: Use sample data (for testing)"
Write-Host "  A sample index with 30 signs is already included!"
Write-Host ""

$CloneChoice = Read-Host "Do you want to attempt cloning SignAvatars now? (y/N)"

if ($CloneChoice -match "^[Yy]$") {
    Write-Host "Cloning SignAvatars repository..."
    try {
        git clone --depth 1 https://github.com/ZhengdiYu/SignAvatars.git backend/dataset/raw/SignAvatars
        Write-ColorOutput "✅ SignAvatars cloned successfully" "Green"
    }
    catch {
        Write-ColorOutput "⚠️  Clone failed. You can manually download later." "Yellow"
    }
}
else {
    Write-ColorOutput "ℹ️  Skipping dataset clone. Using sample data." "Blue"
}

# ============================================
# STEP 6: PROCESS DATASET
# ============================================
Write-Host ""
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-ColorOutput "⚙️  STEP 6: Processing Dataset" "Blue"
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-Host ""

Push-Location backend

# Check if raw data exists
$RawDataExists = (Test-Path "dataset/raw/SignAvatars") -and ((Get-ChildItem "dataset/raw/SignAvatars" -ErrorAction SilentlyContinue).Count -gt 0)

if ($RawDataExists -and $FFmpegAvailable) {
    Write-Host "Processing SignAvatars dataset..."
    try {
        node dataset-processor.js
    }
    catch {
        Write-ColorOutput "⚠️  Processing had some issues" "Yellow"
    }
}
elseif (-not $FFmpegAvailable) {
    Write-ColorOutput "⚠️  FFmpeg not available. Using sample index only." "Yellow"
}
else {
    Write-ColorOutput "ℹ️  No raw dataset found. Using sample index." "Blue"
}

# Verify dataset
Write-Host ""
Write-Host "Verifying dataset..."
node verify-dataset.js

Pop-Location

# ============================================
# STEP 7: GEMINI API KEY
# ============================================
Write-Host ""
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-ColorOutput "🔑 STEP 7: Gemini API Key Configuration" "Blue"
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-Host ""

$EnvContent = Get-Content "backend/.env" -Raw -ErrorAction SilentlyContinue
if ($EnvContent -match "your_gemini_api_key_here") {
    Write-ColorOutput "⚠️  You need to add your Gemini API key!" "Yellow"
    Write-Host ""
    Write-Host "1. Go to: https://aistudio.google.com/app/apikey"
    Write-Host "2. Create a new API key"
    Write-Host "3. Edit backend/.env and replace 'your_gemini_api_key_here'"
    Write-Host ""
    $ApiKey = Read-Host "Enter your Gemini API key (or press Enter to skip)"
    
    if ($ApiKey) {
        $EnvContent = $EnvContent -replace "your_gemini_api_key_here", $ApiKey
        $EnvContent | Out-File -FilePath "backend/.env" -Encoding utf8
        Write-ColorOutput "✅ API key saved to backend/.env" "Green"
    }
}
else {
    Write-ColorOutput "✅ API key already configured" "Green"
}

# ============================================
# SETUP COMPLETE
# ============================================
Write-Host ""
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-ColorOutput "🎉 SETUP COMPLETE!" "Green"
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-Host ""

Write-ColorOutput "📋 WHAT'S INCLUDED:" "Magenta"
Write-Host "  ✅ Backend server with Express + Socket.IO"
Write-Host "  ✅ Frontend with React + Three.js"
Write-Host "  ✅ Gemini 2.0 Flash integration"
Write-Host "  ✅ Sign database with fallback system"
Write-Host "  ✅ VideoAvatar component (video + 3D fallback)"
Write-Host "  ✅ Sample sign index (30 signs)"
Write-Host ""

Write-ColorOutput "🚀 TO START THE APPLICATION:" "Magenta"
Write-Host ""
Write-Host "  Terminal 1 (Backend):"
Write-Host "    cd backend; npm run dev"
Write-Host ""
Write-Host "  Terminal 2 (Frontend):"
Write-Host "    cd frontend; npm run dev"
Write-Host ""
Write-Host "  Then open: http://localhost:5173"
Write-Host ""

Write-ColorOutput "📖 NEXT STEPS:" "Magenta"
Write-Host "  1. Configure your Gemini API key in backend/.env (if not done)"
Write-Host "  2. Download full SignAvatars dataset for more signs"
Write-Host "  3. Run 'node dataset-processor.js' to process videos"
Write-Host "  4. Explore the teaching panel and dialect switching"
Write-Host ""

Write-ColorOutput "📚 DOCUMENTATION:" "Magenta"
Write-Host "  • API Documentation: docs/API_DOCUMENTATION.md"
Write-Host "  • Dataset Setup: docs/DATASET_SETUP.md"
Write-Host "  • Deployment Guide: docs/DEPLOYMENT.md"
Write-Host ""

Write-ColorOutput "Happy signing! 🤟" "Green"
