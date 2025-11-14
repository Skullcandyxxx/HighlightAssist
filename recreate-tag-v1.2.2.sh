#!/bin/bash
# Script to recreate git tag v1.2.2
# This script deletes the existing tag (locally and remotely) and recreates it at the current HEAD

set -e  # Exit on error

echo "=== Recreating git tag v1.2.2 ==="
echo ""

# Step 1: Delete local tag (if it exists)
echo "Step 1: Deleting local tag v1.2.2 (if exists)..."
git tag -d v1.2.2 2>/dev/null && echo "  ✓ Local tag deleted" || echo "  ℹ Local tag doesn't exist, skipping"
echo ""

# Step 2: Delete remote tag
echo "Step 2: Deleting remote tag v1.2.2..."
git push origin :refs/tags/v1.2.2 && echo "  ✓ Remote tag deleted" || echo "  ✗ Failed to delete remote tag"
echo ""

# Step 3: Create new tag at current HEAD
echo "Step 3: Creating new tag v1.2.2 at current HEAD..."
git tag v1.2.2 && echo "  ✓ Local tag created" || echo "  ✗ Failed to create local tag"
echo ""

# Step 4: Push new tag to remote
echo "Step 4: Pushing new tag v1.2.2 to remote..."
git push origin v1.2.2 && echo "  ✓ Remote tag pushed" || echo "  ✗ Failed to push remote tag"
echo ""

# Verify
echo "=== Verification ==="
echo "Current HEAD: $(git rev-parse HEAD)"
echo "Tag v1.2.2 points to: $(git rev-parse v1.2.2)"
echo ""
echo "✓ Tag recreation complete!"
