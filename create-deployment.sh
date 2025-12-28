#!/bin/bash

# Deployment zip creator with versioning
# Usage: ./create-deployment.sh [version]
# Example: ./create-deployment.sh v1.0.11

VERSION=${1:-$(date +%Y%m%d-%H%M)}

echo "Creating deployment zips for version: $VERSION"

# Create versioned zips
zip -r "CIP-deployment-${VERSION}.zip" CIP/ -x "*.DS_Store" "*.git*"
zip -r "CPIA-deployment-${VERSION}.zip" CPIA/ -x "*.DS_Store" "*.git*"

echo ""
echo "✅ Created:"
ls -lh *-deployment-${VERSION}.zip

echo ""
echo "To commit these to git:"
echo "  git add -f *-deployment-${VERSION}.zip"
echo "  git commit -m 'Add deployment zips ($VERSION)'"
echo "  git push"
