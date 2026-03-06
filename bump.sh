#!/bin/bash

# Exit on error
set -e

TYPE=$1

if [[ "$TYPE" != "minor" && "$TYPE" != "patch" ]]; then
  echo "Usage: ./bump.sh <minor|patch>"
  exit 1
fi

echo "🚀 Bumping version ($TYPE)..."

# 1. Bump version in package.json and update package-lock.json
npm version $TYPE --no-git-tag-version

# 2. Run install to ensure lockfile is synced
npm install

# 3. Get the new version number
VERSION=$(node -p "require('./package.json').version")

# 4. Commit, Tag, and Push
git add package.json package-lock.json
git commit -m "Bumped version number to $VERSION"
git tag "v$VERSION"

echo "📤 Pushing changes and tag v$VERSION to origin..."
git push origin main
git push origin "v$VERSION"

echo "✅ Successfully bumped and published tag v$VERSION!"
