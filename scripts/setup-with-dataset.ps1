# ============================================
# SIGN LANGUAGE TRANSLATOR - COMPLETE SETUP
# With SignAvatars Dataset Integration
# PowerShell Script for Windows
# ============================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🤟 Sign Language Translator - Complete Setup               ║" -ForegroundColor Cyan
Write-Host "║  Including SignAvatars Dataset Integration                   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================
# HELPER FUNCTIONS
# ============================================
function Write-Step($message) {
    Write-Host "▶ $message" -ForegroundColor Blue
}

function Write-Success($message) {
    Write-Host "✅ $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "⚠️  $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "❌ $message" -ForegroundColor Red
}

# ============================================
# CHECK PREREQUISITES
# ============================================
Write-Step "Checking prerequisites..."

# Check Node.js
try {
    $nodeVersion = node -v
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 18) {
        Write-Error "Node.js 18+ is required. Current version: $nodeVersion"
        exit 1
    }
    Write-Success "Node.js $nodeVersion found"
}
catch {
    Write-Error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
}

# Check npm
try {
    $npmVersion = npm -v
    Write-Success "npm $npmVersion found"
}
catch {
    Write-Error "npm is not installed"
    exit 1
}

# Check FFmpeg
$hasFFmpeg = $false
try {
    $ffmpegOutput = ffmpeg -version 2>&1 | Select-Object -First 1
    Write-Success "FFmpeg found: $ffmpegOutput"
    $hasFFmpeg = $true
}
catch {
    Write-Warning "FFmpeg not found - video processing will be limited"
    Write-Warning "Install with: winget install ffmpeg"
}

# ============================================
# STEP 1: PROJECT STRUCTURE
# ============================================
Write-Step "Step 1: Creating project structure..."

$projectDir = "sign-language-translator"

# Create directories
$directories = @(
    "$projectDir/backend/dataset/raw/SignAvatars/word2motion/videos",
    "$projectDir/backend/dataset/raw/SignAvatars/word2motion/text",
    "$projectDir/backend/dataset/raw/SignAvatars/language2motion/videos",
    "$projectDir/backend/dataset/raw/SignAvatars/language2motion/text",
    "$projectDir/backend/dataset/raw/SignAvatars/hamnosys2motion/videos",
    "$projectDir/backend/dataset/processed/asl",
    "$projectDir/backend/dataset/thumbnails/asl",
    "$projectDir/backend/dataset/metadata",
    "$projectDir/frontend/src/components",
    "$projectDir/scripts",
    "$projectDir/docs"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Write-Success "Project structure created"

# ============================================
# STEP 2: BACKEND SETUP
# ============================================
Write-Step "Step 2: Setting up backend..."

Push-Location "$projectDir/backend"

# Initialize package.json if not exists
if (-not (Test-Path "package.json")) {
    npm init -y | Out-Null
    
    # Update package.json for ES modules
    $pkg = Get-Content "package.json" | ConvertFrom-Json
    $pkg | Add-Member -NotePropertyName "type" -NotePropertyValue "module" -Force
    $pkg.scripts = @{
        "start"           = "node server.js"
        "dev"             = "nodemon server.js"
        "process-dataset" = "node dataset-processor.js"
        "verify"          = "node verify-dataset.js"
    }
    $pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json"
}

# Install dependencies
Write-Step "Installing backend dependencies..."
npm install express socket.io cors dotenv "@google/generative-ai" fluent-ffmpeg 2>&1 | Out-Null
npm install -D nodemon 2>&1 | Out-Null

Write-Success "Backend dependencies installed"

# Create .env file if not exists
if (-not (Test-Path ".env")) {
    @"
# Sign Language Translator Configuration
PORT=3000
GEMINI_API_KEY=your_api_key_here
"@ | Set-Content ".env"
    Write-Warning "Created .env file - Please add your Gemini API key!"
}

Pop-Location

# ============================================
# STEP 3: FRONTEND SETUP
# ============================================
Write-Step "Step 3: Setting up frontend..."

Push-Location "$projectDir/frontend"

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Step "Initializing Vite React project..."
    npx -y create-vite@latest . --template react 2>&1 | Out-Null
}

# Install dependencies
Write-Step "Installing frontend dependencies..."
npm install 2>&1 | Out-Null
npm install three "@react-three/fiber" "@react-three/drei" socket.io-client 2>&1 | Out-Null

Write-Success "Frontend dependencies installed"

Pop-Location

# ============================================
# STEP 4: DATASET DOWNLOAD (MANUAL)
# ============================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║  📦 MANUAL STEP: Download SignAvatars Dataset               ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""
Write-Warning "The SignAvatars dataset requires manual download due to access restrictions."
Write-Host ""
Write-Host "Option A: WLASL Dataset (Isolated Signs) - Recommended for demos" -ForegroundColor White
Write-Host "   1. Go to: https://dxli94.github.io/WLASL/"
Write-Host "   2. Download the video files"
Write-Host "   3. Extract to: backend\dataset\raw\SignAvatars\word2motion\videos\"
Write-Host "   4. Download WLASL_v0.3.json to: backend\dataset\raw\SignAvatars\word2motion\text\"
Write-Host ""
Write-Host "Option B: How2Sign Dataset (Sentence-level)" -ForegroundColor White
Write-Host "   1. Go to: https://how2sign.github.io/"
Write-Host "   2. Download train/test/val splits"
Write-Host "   3. Extract to: backend\dataset\raw\SignAvatars\language2motion\videos\"
Write-Host ""
Write-Host "Option C: Skip Dataset (Demo Mode)" -ForegroundColor White
Write-Host "   - The system works without the dataset using procedural animations"
Write-Host "   - You can add the dataset later"
Write-Host ""

Read-Host "Press Enter to continue with setup (you can add dataset later)"

# ============================================
# STEP 5: PROCESS DATASET (IF AVAILABLE)
# ============================================
Write-Step "Step 5: Checking for dataset files..."

Push-Location "$projectDir/backend"

$wlaslDir = "dataset\raw\SignAvatars\word2motion\videos"
$hasVideos = (Test-Path $wlaslDir) -and ((Get-ChildItem $wlaslDir -ErrorAction SilentlyContinue).Count -gt 0)

if ($hasVideos) {
    Write-Success "WLASL videos found!"
    
    if ($hasFFmpeg -and (Test-Path "dataset-processor.js")) {
        Write-Step "Processing dataset..."
        try {
            node dataset-processor.js
            Write-Success "Dataset processed!"
        }
        catch {
            Write-Warning "Dataset processing had errors - continuing anyway"
        }
    }
    elseif (-not $hasFFmpeg) {
        Write-Warning "FFmpeg not installed - skipping video processing"
        Write-Warning "Install FFmpeg and run: npm run process-dataset"
    }
}
else {
    Write-Warning "No dataset videos found - running in demo mode"
    Write-Host "   The system will use procedural animations for all signs"
}

# ============================================
# STEP 6: VERIFY SETUP
# ============================================
Write-Step "Step 6: Verifying setup..."

if (Test-Path "verify-dataset.js") {
    try {
        node verify-dataset.js 2>&1 | Out-Null
    }
    catch {
        Write-Warning "Verification script had warnings"
    }
}

Pop-Location

# ============================================
# COMPLETE
# ============================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ Setup Complete!                                          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Project Structure:" -ForegroundColor White
Write-Host "   sign-language-translator\"
Write-Host "   ├── backend\           # Express + Socket.IO server"
Write-Host "   │   ├── dataset\       # SignAvatars data (if downloaded)"
Write-Host "   │   ├── server.js      # Main server"
Write-Host "   │   └── .env           # API keys"
Write-Host "   ├── frontend\          # React + Three.js app"
Write-Host "   └── docs\              # Documentation"
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. Add your Gemini API key:" -ForegroundColor White
Write-Host "      Edit: backend\.env"
Write-Host "      Set:  GEMINI_API_KEY=your_actual_key"
Write-Host ""
Write-Host "   2. Start the backend server:" -ForegroundColor White
Write-Host "      cd backend; npm run dev"
Write-Host ""
Write-Host "   3. Start the frontend (new terminal):" -ForegroundColor White
Write-Host "      cd frontend; npm run dev"
Write-Host ""
Write-Host "   4. Open in browser:" -ForegroundColor White
Write-Host "      http://localhost:5173"
Write-Host ""

if (-not $hasFFmpeg) {
    Write-Host "📌 Optional: Install FFmpeg for full video processing" -ForegroundColor Yellow
    Write-Host "   Run: winget install ffmpeg"
    Write-Host ""
}

Write-Host "📚 Documentation:" -ForegroundColor White
Write-Host "   - Quick Start: docs\DAY1_QUICKSTART.md"
Write-Host "   - Dataset Setup: docs\DATASET_SETUP.md"
Write-Host "   - Integration Guide: docs\DATASET_INTEGRATION.md"
Write-Host ""
Write-Success "Happy signing! 🤟"
