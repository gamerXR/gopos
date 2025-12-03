#!/bin/bash
# GoPos - Quick Start Script for GitHub & EAS Build
# Run this script to commit and prepare for EAS build

echo "🚀 GoPos Deployment - Quick Start"
echo "=================================="
echo ""

# Step 1: Check current directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from /app directory"
    echo "   Run: cd /app && bash QUICK_START.sh"
    exit 1
fi

echo "✅ Current directory: $(pwd)"
echo ""

# Step 2: Check git status
echo "📊 Checking git status..."
git status --short
echo ""

# Step 3: Stage all changes
echo "📦 Staging all changes..."
git add .
echo "✅ Changes staged"
echo ""

# Step 4: Show what will be committed
echo "📋 Files to be committed:"
git status --short
echo ""

# Step 5: Commit
read -p "Enter commit message (or press Enter for default): " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Phase 1: Stabilize dependencies for APK build

- Upgrade React 18.2.0 → 19.1.0
- Upgrade React Native 0.74.5 → 0.81.0
- Remove deprecated Gradle config
- Standardize URLs to resto-orders-21

Ready for EAS Build"
fi

echo ""
echo "💾 Committing with message:"
echo "\"$COMMIT_MSG\""
git commit -m "$COMMIT_MSG"
echo ""

# Step 6: Check remote
echo "🔗 Checking git remote..."
REMOTE=$(git remote get-url origin 2>/dev/null)

if [ -z "$REMOTE" ]; then
    echo "⚠️  No remote repository configured"
    echo ""
    echo "To add remote, run:"
    echo "  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
    echo "  git push -u origin main"
    echo ""
else
    echo "✅ Remote: $REMOTE"
    echo ""
    read -p "Push to GitHub now? (y/n): " PUSH_NOW
    if [ "$PUSH_NOW" = "y" ] || [ "$PUSH_NOW" = "Y" ]; then
        echo "📤 Pushing to GitHub..."
        git push
        echo "✅ Pushed successfully!"
    else
        echo "⏭️  Skipped push. Run 'git push' when ready."
    fi
fi

echo ""
echo "================================================"
echo "✅ GitHub Commit Complete!"
echo "================================================"
echo ""
echo "Next Step: Build APK with EAS"
echo "------------------------------"
echo ""
echo "Run these commands:"
echo ""
echo "  cd frontend"
echo "  eas login"
echo "  # Username: mhk2913"
echo "  # Password: haizkia1311"
echo ""
echo "  eas build --platform android --profile preview-apk"
echo ""
echo "📚 Full guide available in: DEPLOYMENT_GUIDE.md"
echo ""
