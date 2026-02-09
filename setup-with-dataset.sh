#!/bin/bash
# ============================================
# SIGN LANGUAGE TRANSLATOR - COMPLETE SETUP
# Includes SignAvatars Dataset Integration
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     🤟 SIGNBRIDGE - Complete Setup with Dataset 🤟          ║"
echo "║                                                              ║"
echo "║     Sign Language Communication Platform                     ║"
echo "║     Powered by Google Gemini 2.0 Flash + SignAvatars        ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================
# STEP 1: CHECK PREREQUISITES
# ============================================
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 STEP 1: Checking Prerequisites${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "  ${GREEN}✅ $1 found${NC}"
        return 0
    else
        echo -e "  ${RED}❌ $1 not found${NC}"
        return 1
    fi
}

MISSING_DEPS=0

echo "Checking required tools..."
check_command node || MISSING_DEPS=1
check_command npm || MISSING_DEPS=1
check_command git || MISSING_DEPS=1

echo ""
echo "Checking optional tools (for dataset processing)..."
if check_command ffmpeg; then
    FFMPEG_AVAILABLE=1
else
    FFMPEG_AVAILABLE=0
    echo -e "  ${YELLOW}⚠️  FFmpeg not found - video processing will be limited${NC}"
fi

if check_command ffprobe; then
    FFPROBE_AVAILABLE=1
else
    FFPROBE_AVAILABLE=0
fi

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "\n${RED}❌ Missing required dependencies. Please install them first.${NC}"
    echo "  - Node.js: https://nodejs.org/"
    echo "  - Git: https://git-scm.com/"
    exit 1
fi

echo -e "\n${GREEN}✅ All required dependencies found!${NC}"

# ============================================
# STEP 2: PROJECT STRUCTURE
# ============================================
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📁 STEP 2: Setting Up Project Structure${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Create dataset directories
echo "Creating dataset directories..."
mkdir -p backend/dataset/raw
mkdir -p backend/dataset/processed/asl
mkdir -p backend/dataset/processed/bsl
mkdir -p backend/dataset/processed/isl
mkdir -p backend/dataset/metadata
mkdir -p backend/dataset/thumbnails/asl
mkdir -p backend/dataset/thumbnails/bsl
mkdir -p backend/dataset/thumbnails/isl

echo -e "${GREEN}✅ Dataset directories created${NC}"

# ============================================
# STEP 3: BACKEND SETUP
# ============================================
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 STEP 3: Setting Up Backend${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cd backend

if [ ! -f "package.json" ]; then
    echo "Initializing backend..."
    npm init -y
fi

echo "Installing backend dependencies..."
npm install express socket.io cors dotenv @google/generative-ai

if [ $FFMPEG_AVAILABLE -eq 1 ]; then
    echo "Installing fluent-ffmpeg for video processing..."
    npm install fluent-ffmpeg
fi

echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo ""
    echo "Creating .env file..."
    cat > .env << 'EOF'
# Server Configuration
PORT=3000
NODE_ENV=development

# Gemini API Key (REQUIRED)
# Get your key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
EOF
    echo -e "${YELLOW}⚠️  Created .env file - you'll need to add your Gemini API key${NC}"
fi

cd ..

# ============================================
# STEP 4: FRONTEND SETUP
# ============================================
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎨 STEP 4: Setting Up Frontend${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cd frontend

if [ ! -f "package.json" ]; then
    echo "Initializing frontend with Vite + React..."
    npm create vite@latest . -- --template react --yes
fi

echo "Installing frontend dependencies..."
npm install
npm install three @react-three/fiber @react-three/drei socket.io-client

echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

cd ..

# ============================================
# STEP 5: SIGNAVATARS DATASET
# ============================================
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎬 STEP 5: SignAvatars Dataset Setup${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📥 DATASET DOWNLOAD OPTIONS:${NC}"
echo ""
echo "Option A: Clone SignAvatars repository"
echo "  git clone https://github.com/ZhengdiYu/SignAvatars.git backend/dataset/raw"
echo ""
echo "Option B: Download from Google Drive/Hugging Face"
echo "  See: https://github.com/ZhengdiYu/SignAvatars#data"
echo ""
echo "Option C: Use sample data (for testing)"
echo "  A sample index with 30 signs is already included!"
echo ""

read -p "Do you want to attempt cloning SignAvatars now? (y/N): " CLONE_CHOICE

if [[ "$CLONE_CHOICE" =~ ^[Yy]$ ]]; then
    echo "Cloning SignAvatars repository..."
    if git clone --depth 1 https://github.com/ZhengdiYu/SignAvatars.git backend/dataset/raw/SignAvatars; then
        echo -e "${GREEN}✅ SignAvatars cloned successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Clone failed. You can manually download later.${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  Skipping dataset clone. Using sample data.${NC}"
fi

# ============================================
# STEP 6: PROCESS DATASET
# ============================================
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚙️  STEP 6: Processing Dataset${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cd backend

# Check if raw data exists
if [ -d "dataset/raw/SignAvatars" ] && [ "$(ls -A dataset/raw/SignAvatars 2>/dev/null)" ]; then
    if [ $FFMPEG_AVAILABLE -eq 1 ]; then
        echo "Processing SignAvatars dataset..."
        node dataset-processor.js || echo -e "${YELLOW}⚠️  Processing had some issues${NC}"
    else
        echo -e "${YELLOW}⚠️  FFmpeg not available. Using sample index only.${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  No raw dataset found. Using sample index.${NC}"
fi

# Verify dataset
echo ""
echo "Verifying dataset..."
node verify-dataset.js

cd ..

# ============================================
# STEP 7: GEMINI API KEY
# ============================================
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔑 STEP 7: Gemini API Key Configuration${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if grep -q "your_gemini_api_key_here" backend/.env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  You need to add your Gemini API key!${NC}"
    echo ""
    echo "1. Go to: https://aistudio.google.com/app/apikey"
    echo "2. Create a new API key"
    echo "3. Edit backend/.env and replace 'your_gemini_api_key_here'"
    echo ""
    read -p "Enter your Gemini API key (or press Enter to skip): " API_KEY
    
    if [ -n "$API_KEY" ]; then
        sed -i.bak "s/your_gemini_api_key_here/$API_KEY/" backend/.env
        rm -f backend/.env.bak
        echo -e "${GREEN}✅ API key saved to backend/.env${NC}"
    fi
else
    echo -e "${GREEN}✅ API key already configured${NC}"
fi

# ============================================
# SETUP COMPLETE
# ============================================
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 SETUP COMPLETE!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${PURPLE}📋 WHAT'S INCLUDED:${NC}"
echo "  ✅ Backend server with Express + Socket.IO"
echo "  ✅ Frontend with React + Three.js"
echo "  ✅ Gemini 2.0 Flash integration"
echo "  ✅ Sign database with fallback system"
echo "  ✅ VideoAvatar component (video + 3D fallback)"
echo "  ✅ Sample sign index (30 signs)"
echo ""

echo -e "${PURPLE}🚀 TO START THE APPLICATION:${NC}"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd backend && npm run dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "  Then open: http://localhost:5173"
echo ""

echo -e "${PURPLE}📖 NEXT STEPS:${NC}"
echo "  1. Configure your Gemini API key in backend/.env (if not done)"
echo "  2. Download full SignAvatars dataset for more signs"
echo "  3. Run 'node dataset-processor.js' to process videos"
echo "  4. Explore the teaching panel and dialect switching"
echo ""

echo -e "${PURPLE}📚 DOCUMENTATION:${NC}"
echo "  • API Documentation: docs/API_DOCUMENTATION.md"
echo "  • Dataset Setup: docs/DATASET_SETUP.md"
echo "  • Deployment Guide: docs/DEPLOYMENT.md"
echo ""

echo -e "${GREEN}Happy signing! 🤟${NC}"
