#!/bin/bash
# ============================================
# SIGN LANGUAGE TRANSLATOR - COMPLETE SETUP
# With SignAvatars Dataset Integration
# ============================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🤟 Sign Language Translator - Complete Setup               ║"
echo "║  Including SignAvatars Dataset Integration                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ============================================
# CHECK PREREQUISITES
# ============================================
print_step "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) found"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm -v) found"

# Check FFmpeg (optional but recommended)
if command -v ffmpeg &> /dev/null; then
    print_success "FFmpeg found (for video processing)"
    HAS_FFMPEG=true
else
    print_warning "FFmpeg not found - video processing will be limited"
    print_warning "Install FFmpeg for full dataset processing capability"
    HAS_FFMPEG=false
fi

# ============================================
# STEP 1: PROJECT STRUCTURE
# ============================================
print_step "Step 1: Creating project structure..."

PROJECT_DIR="sign-language-translator"

# Create directories if they don't exist
mkdir -p "$PROJECT_DIR/backend/dataset/raw/SignAvatars/word2motion/videos"
mkdir -p "$PROJECT_DIR/backend/dataset/raw/SignAvatars/word2motion/text"
mkdir -p "$PROJECT_DIR/backend/dataset/raw/SignAvatars/language2motion/videos"
mkdir -p "$PROJECT_DIR/backend/dataset/raw/SignAvatars/language2motion/text"
mkdir -p "$PROJECT_DIR/backend/dataset/raw/SignAvatars/hamnosys2motion/videos"
mkdir -p "$PROJECT_DIR/backend/dataset/raw/SignAvatars/hamnosys2motion"
mkdir -p "$PROJECT_DIR/backend/dataset/processed/asl"
mkdir -p "$PROJECT_DIR/backend/dataset/thumbnails/asl"
mkdir -p "$PROJECT_DIR/backend/dataset/metadata"
mkdir -p "$PROJECT_DIR/frontend/src/components"
mkdir -p "$PROJECT_DIR/scripts"
mkdir -p "$PROJECT_DIR/docs"

print_success "Project structure created"

# ============================================
# STEP 2: BACKEND SETUP
# ============================================
print_step "Step 2: Setting up backend..."

cd "$PROJECT_DIR/backend"

# Initialize package.json if not exists
if [ ! -f "package.json" ]; then
    npm init -y
    
    # Update package.json for ES modules
    node -e "
    const pkg = require('./package.json');
    pkg.type = 'module';
    pkg.scripts = {
        'start': 'node server.js',
        'dev': 'nodemon server.js',
        'process-dataset': 'node dataset-processor.js',
        'verify': 'node verify-dataset.js'
    };
    require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
fi

# Install dependencies
print_step "Installing backend dependencies..."
npm install express socket.io cors dotenv @google/generative-ai fluent-ffmpeg

# Install dev dependencies
npm install -D nodemon

print_success "Backend dependencies installed"

# Create .env file if not exists
if [ ! -f ".env" ]; then
    echo "# Sign Language Translator Configuration" > .env
    echo "PORT=3000" >> .env
    echo "GEMINI_API_KEY=your_api_key_here" >> .env
    print_warning "Created .env file - Please add your Gemini API key!"
fi

cd ..

# ============================================
# STEP 3: FRONTEND SETUP
# ============================================
print_step "Step 3: Setting up frontend..."

cd frontend

# Check if package.json exists (project already initialized)
if [ ! -f "package.json" ]; then
    print_step "Initializing Vite React project..."
    npm create vite@latest . -- --template react --yes
fi

# Install dependencies
print_step "Installing frontend dependencies..."
npm install
npm install three @react-three/fiber @react-three/drei socket.io-client

print_success "Frontend dependencies installed"

cd ..

# ============================================
# STEP 4: DATASET DOWNLOAD (MANUAL)
# ============================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  📦 MANUAL STEP: Download SignAvatars Dataset               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
print_warning "The SignAvatars dataset requires manual download due to access restrictions."
echo ""
echo "Option A: WLASL Dataset (Isolated Signs) - Recommended for demos"
echo "   1. Go to: https://dxli94.github.io/WLASL/"
echo "   2. Download the video files"
echo "   3. Extract to: backend/dataset/raw/SignAvatars/word2motion/videos/"
echo "   4. Download WLASL_v0.3.json to: backend/dataset/raw/SignAvatars/word2motion/text/"
echo ""
echo "Option B: How2Sign Dataset (Sentence-level)"
echo "   1. Go to: https://how2sign.github.io/"
echo "   2. Download train/test/val splits"
echo "   3. Extract to: backend/dataset/raw/SignAvatars/language2motion/videos/"
echo ""
echo "Option C: Skip Dataset (Demo Mode)"
echo "   - The system works without the dataset using procedural animations"
echo "   - You can add the dataset later"
echo ""

read -p "Press Enter to continue with setup (you can add dataset later)..."

# ============================================
# STEP 5: PROCESS DATASET (IF AVAILABLE)
# ============================================
print_step "Step 5: Checking for dataset files..."

cd backend

WLASL_DIR="dataset/raw/SignAvatars/word2motion/videos"
if [ -d "$WLASL_DIR" ] && [ "$(ls -A $WLASL_DIR 2>/dev/null)" ]; then
    print_success "WLASL videos found!"
    
    if [ "$HAS_FFMPEG" = true ]; then
        print_step "Processing dataset..."
        if [ -f "dataset-processor.js" ]; then
            node dataset-processor.js
            print_success "Dataset processed!"
        else
            print_warning "dataset-processor.js not found - skipping processing"
        fi
    else
        print_warning "FFmpeg not installed - skipping video processing"
        print_warning "Install FFmpeg and run: npm run process-dataset"
    fi
else
    print_warning "No dataset videos found - running in demo mode"
    echo "   The system will use procedural animations for all signs"
fi

# ============================================
# STEP 6: VERIFY SETUP
# ============================================
print_step "Step 6: Verifying setup..."

if [ -f "verify-dataset.js" ]; then
    node verify-dataset.js 2>/dev/null || print_warning "Verification script had warnings"
else
    print_warning "verify-dataset.js not found - skipping verification"
fi

cd ..

# ============================================
# COMPLETE
# ============================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Project Structure:"
echo "   sign-language-translator/"
echo "   ├── backend/           # Express + Socket.IO server"
echo "   │   ├── dataset/       # SignAvatars data (if downloaded)"
echo "   │   ├── server.js      # Main server"
echo "   │   └── .env           # API keys"
echo "   ├── frontend/          # React + Three.js app"
echo "   └── docs/              # Documentation"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "   1. Add your Gemini API key:"
echo "      Edit: backend/.env"
echo "      Set:  GEMINI_API_KEY=your_actual_key"
echo ""
echo "   2. Start the backend server:"
echo "      cd backend && npm run dev"
echo ""
echo "   3. Start the frontend (new terminal):"
echo "      cd frontend && npm run dev"
echo ""
echo "   4. Open in browser:"
echo "      http://localhost:5173"
echo ""

if [ "$HAS_FFMPEG" = false ]; then
    echo "📌 Optional: Install FFmpeg for full video processing"
    echo "   - Windows: winget install ffmpeg"
    echo "   - macOS:   brew install ffmpeg"
    echo "   - Linux:   apt install ffmpeg"
    echo ""
fi

echo "📚 Documentation:"
echo "   - Quick Start: docs/DAY1_QUICKSTART.md"
echo "   - Dataset Setup: docs/DATASET_SETUP.md"
echo "   - Integration Guide: docs/DATASET_INTEGRATION.md"
echo ""
print_success "Happy signing! 🤟"
