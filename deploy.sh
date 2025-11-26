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

# Switch to gh-pages
echo "🔀 Switching to gh-pages branch..."
git checkout gh-pages || git checkout -b gh-pages

# Store .git temporarily
echo "📋 Copying generated files to root..."
GIT_BACKUP=$(mktemp -d)
cp -r .git "$GIT_BACKUP/"

# Remove everything except .git
rm -rf .[^.]* *
rm -rf .[^g]*
rm -rf .g[^i]*
rm -rf .gi[^t]*

# Restore .git
cp -r "$GIT_BACKUP/.git" .
rm -rf "$GIT_BACKUP"

# Copy generated files
cp -r .output/public/* .

# Remove development files and directories that shouldn't be in production
echo "🧹 Cleaning development files..."
rm -rf node_modules .output .nuxt .github .vscode coverage playwright-report test-results .cursorrules .DS_Store DEPLOYMENT.md CHANGELOG.md README.md playwright.config.ts package.json package-lock.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .editorconfig renovate.json eslint.config.mjs tsconfig.json nuxt.config.ts app reshot-icon-emotion-WYMLSU5D4V.svg

# Add and commit all changes (including deletions)
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
