# Automation script to push to GitHub
Write-Host "🚀 Preparing to push SignBridge to GitHub..." -ForegroundColor Cyan

# Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed! Please install Git for Windows first." -ForegroundColor Red
    exit
}

# Initialize and commit
Write-Host "1. Initializing Git repository..."
git init

Write-Host "2. Adding all files (this might take a moment)..."
git add .

Write-Host "3. Committing files..."
git commit -m "Initial commit for Gemini Hackathon"

# Get Repo URL
Write-Host "`n--------------------------------------------------"
Write-Host "4. Link to GitHub"
$repoUrl = Read-Host "Enter your GitHub Repository URL (e.g., https://github.com/yourname/repo.git)"

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "❌ No URL provided. Exiting." -ForegroundColor Red
    exit
}

# Link and Push
git branch -M main
git remote remove origin 2> $null # Remove existing if retry
git remote add origin $repoUrl

Write-Host "5. Pushing to GitHub..."
git push -u origin main

Write-Host "`n✅ SUCCESS! Your code is on GitHub." -ForegroundColor Green
