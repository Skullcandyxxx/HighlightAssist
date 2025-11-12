# HighlightAssist - Cleanup Old Release Tags
# This script removes old test and outdated release tags

$ErrorActionPreference = 'Stop'

Write-Host "`n=== HighlightAssist Tag Cleanup ===" -ForegroundColor Cyan
Write-Host "Removing old release tags...`n" -ForegroundColor Yellow

# Old tags to remove
$oldTags = @(
    "v0.0.1-test",
    "v0.0.2-test", 
    "v0.0.3-test",
    "v3.4.0",
    "v3.4.1",
    "v3.4.2"
)

# Delete local tags
Write-Host "[1/2] Deleting local tags..." -ForegroundColor Green
foreach ($tag in $oldTags) {
    try {
        git tag -d $tag 2>$null
        Write-Host "  ✅ Deleted local tag: $tag" -ForegroundColor Gray
    } catch {
        Write-Host "  ⚠️  Tag not found locally: $tag" -ForegroundColor Yellow
    }
}

# Delete remote tags
Write-Host "`n[2/2] Deleting remote tags..." -ForegroundColor Green
foreach ($tag in $oldTags) {
    try {
        git push origin ":refs/tags/$tag" 2>&1 | Out-Null
        Write-Host "  ✅ Deleted remote tag: $tag" -ForegroundColor Gray
    } catch {
        Write-Host "  ⚠️  Tag not found remotely: $tag" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green
Write-Host "`nNote: You still need to manually delete releases on GitHub:" -ForegroundColor Cyan
Write-Host "  https://github.com/Skullcandyxxx/HighlightAssist/releases" -ForegroundColor Yellow
Write-Host "`nOr use GitHub CLI:" -ForegroundColor Cyan
foreach ($tag in $oldTags) {
    Write-Host "  gh release delete $tag --yes" -ForegroundColor White
}
Write-Host "`n"
