# PowerShell script to recreate git tag v1.2.2
# This script deletes the existing tag (locally and remotely) and recreates it at the current HEAD

Write-Host "=== Recreating git tag v1.2.2 ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Delete local tag (if it exists)
Write-Host "Step 1: Deleting local tag v1.2.2 (if exists)..." -ForegroundColor Yellow
try {
    git tag -d v1.2.2 2>$null
    Write-Host "  ✓ Local tag deleted" -ForegroundColor Green
} catch {
    Write-Host "  ℹ Local tag doesn't exist, skipping" -ForegroundColor Gray
}
Write-Host ""

# Step 2: Delete remote tag
Write-Host "Step 2: Deleting remote tag v1.2.2..." -ForegroundColor Yellow
try {
    git push origin :refs/tags/v1.2.2
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Remote tag deleted" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to delete remote tag" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Failed to delete remote tag" -ForegroundColor Red
}
Write-Host ""

# Step 3: Create new tag at current HEAD
Write-Host "Step 3: Creating new tag v1.2.2 at current HEAD..." -ForegroundColor Yellow
try {
    git tag v1.2.2
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Local tag created" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to create local tag" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Failed to create local tag" -ForegroundColor Red
}
Write-Host ""

# Step 4: Push new tag to remote
Write-Host "Step 4: Pushing new tag v1.2.2 to remote..." -ForegroundColor Yellow
try {
    git push origin v1.2.2
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Remote tag pushed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to push remote tag" -ForegroundColor Red
    }
} catch {
    Write-Host "  ✗ Failed to push remote tag" -ForegroundColor Red
}
Write-Host ""

# Verify
Write-Host "=== Verification ===" -ForegroundColor Cyan
$headCommit = git rev-parse HEAD
$tagCommit = git rev-parse v1.2.2
Write-Host "Current HEAD: $headCommit"
Write-Host "Tag v1.2.2 points to: $tagCommit"
Write-Host ""
Write-Host "✓ Tag recreation complete!" -ForegroundColor Green
