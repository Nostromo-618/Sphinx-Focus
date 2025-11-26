#!/bin/bash
# deploy.sh - Deploy Sphinx Focus to GitHub Pages

set -e  # Exit on error

echo "🚀 Starting deployment to GitHub Pages..."

# Ensure we're on main branch
echo "📌 Ensuring we're on main branch..."
git checkout main

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Generate static site
echo "🔨 Generating static site..."
pnpm run generate

# Store the output in a temp location
echo "📦 Storing generated files..."
TEMP_DIR=$(mktemp -d)
cp -r .output/public/* "$TEMP_DIR/"

# Switch to gh-pages
echo "🔀 Switching to gh-pages branch..."
git checkout gh-pages || git checkout -b gh-pages

# Remove all tracked files (preserves .git)
echo "📋 Cleaning gh-pages branch..."
git rm -rf . 2>/dev/null || true
git clean -fd 2>/dev/null || true

# Copy generated files from temp
echo "📁 Copying generated files..."
cp -r "$TEMP_DIR"/* .
rm -rf "$TEMP_DIR"

# Add and commit all changes
echo "💾 Committing changes..."
git add -A
git commit -m "Deploy: $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes to commit"

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push origin gh-pages

# Return to main
echo "🔙 Returning to main branch..."
git checkout main

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your site will be updated at: https://nostromo-618.github.io/sphinx-focus/"
echo "⏱️  GitHub Pages may take a few minutes to reflect the changes."
