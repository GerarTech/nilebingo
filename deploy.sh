#!/bin/bash
# Deployment script for BINGO bot

echo "🚀 Deploying to Vercel..."
echo ""

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed"
    exit 1
fi

# Add all changes
echo "1. Adding files..."
git add .

# Commit changes
echo "2. Committing changes..."
git commit -m "Fix: User bot menu buttons and voice system"

# Push to GitHub (triggers Vercel deployment)
echo "3. Pushing to GitHub..."
git push

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Check deployment status at:"
echo "https://vercel.com/gerartechs-projects/bingo/hjwvqJSXzPgxpCkHgbC8HVjCaJq6"
echo ""
echo "After deployment, test your bot:"
echo "1. Send /start to user bot"
echo "2. You should see menu buttons at the bottom"