#!/bin/bash
# ================================
# SignBridge Deployment Script
# ================================

set -e  # Exit on error

echo "🚀 SignBridge Deployment Script"
echo "================================"

# Check for required tools
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required but not installed."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is required but not installed."
        exit 1
    fi
    
    echo "✅ All requirements met!"
}

# Deploy frontend to Vercel
deploy_frontend() {
    echo ""
    echo "🌐 Deploying Frontend to Vercel..."
    echo "-----------------------------------"
    
    if ! command -v vercel &> /dev/null; then
        echo "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    cd frontend
    
    # Build
    echo "📦 Building frontend..."
    npm run build
    
    # Deploy
    echo "🚀 Deploying to Vercel..."
    vercel --prod
    
    cd ..
    echo "✅ Frontend deployed!"
}

# Deploy backend to Render
deploy_backend() {
    echo ""
    echo "⚙️ Backend Deployment (Render)"
    echo "-------------------------------"
    echo ""
    echo "To deploy the backend to Render:"
    echo ""
    echo "1. Go to https://render.com"
    echo "2. Click 'New' → 'Web Service'"
    echo "3. Connect your GitHub repository"
    echo "4. Select the 'backend' directory"
    echo "5. Add environment variable:"
    echo "   - GEMINI_API_KEY: your-api-key"
    echo ""
    echo "Or use the render.yaml blueprint for auto-deploy."
}

# Deploy with Docker
deploy_docker() {
    echo ""
    echo "🐳 Deploying with Docker..."
    echo "---------------------------"
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is required but not installed."
        exit 1
    fi
    
    # Check for GEMINI_API_KEY
    if [ -z "$GEMINI_API_KEY" ]; then
        echo "⚠️ GEMINI_API_KEY not set!"
        echo "Run: export GEMINI_API_KEY=your-key"
        read -p "Enter your Gemini API key: " GEMINI_API_KEY
        export GEMINI_API_KEY
    fi
    
    # Build and run
    echo "📦 Building Docker images..."
    docker-compose build
    
    echo "🚀 Starting containers..."
    docker-compose up -d
    
    echo ""
    echo "✅ Docker deployment complete!"
    echo "   Frontend: http://localhost"
    echo "   Backend:  http://localhost:3000"
}

# Local development
start_local() {
    echo ""
    echo "💻 Starting Local Development..."
    echo "---------------------------------"
    
    # Start backend
    echo "Starting backend..."
    cd backend
    npm install
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend
    sleep 3
    
    # Start frontend
    echo "Starting frontend..."
    cd frontend
    npm install
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo ""
    echo "✅ Local development running!"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend:  http://localhost:3000"
    echo ""
    echo "Press Ctrl+C to stop..."
    
    # Wait for interrupt
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
    wait
}

# Main menu
main() {
    check_requirements
    
    echo ""
    echo "Select deployment option:"
    echo "1) Local Development"
    echo "2) Deploy Frontend (Vercel)"
    echo "3) Deploy Backend (Render instructions)"
    echo "4) Deploy with Docker"
    echo "5) Exit"
    echo ""
    read -p "Enter choice [1-5]: " choice
    
    case $choice in
        1) start_local ;;
        2) deploy_frontend ;;
        3) deploy_backend ;;
        4) deploy_docker ;;
        5) echo "Goodbye!"; exit 0 ;;
        *) echo "Invalid choice"; exit 1 ;;
    esac
}

# Run
main "$@"
