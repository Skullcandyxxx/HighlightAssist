# GitHub Release Fix Instructions

## Problem
The v1.2.2 release shows a ZIP file instead of the professional .exe installer.

## Root Cause
The GitHub Actions workflow (`build-windows.yml`) was updated AFTER the v1.2.2 tag was created, so it used the old workflow that creates ZIP files.

## GitHub Actions Authentication Issue
If you see: `remote: Invalid username or token. Password authentication is not supported`
- This means the GitHub agent is trying to push from Actions but lacks authentication
- **Solution:** Don't push from GitHub Actions - push from your LOCAL machine instead

## Solution Options

### Option 1: Delete and Recreate v1.2.2 Tag from LOCAL Machine (Recommended)

**Run these commands on your LOCAL Windows machine (not in GitHub Actions):**

```powershell
# Navigate to HighlightAssist directory
cd D:\Projects\LawHub\HighlightAssist

# Delete the tag locally
git tag -d v1.2.2

# Delete the tag on GitHub
git push origin :refs/tags/v1.2.2

# Recreate the tag at current commit
git tag v1.2.2

# Push the new tag (this will trigger the workflow)
git push origin v1.2.2
```

**Important:** These commands must be run from YOUR local machine where you have GitHub authentication already set up. DO NOT try to run these from GitHub Actions.

**This will:**
- Delete the old v1.2.2 release
- Trigger GitHub Actions with the updated workflow
- Build the professional installer (HighlightAssist-Setup-v1.2.2.exe)
- Upload it to the release

### Option 2: Create v1.2.3 Instead

```powershell
# Update version in installer-config.iss
# Change line 6: #define MyAppVersion "1.2.3"

# Commit the version change
git add installer-config.iss
git commit -m "Bump version to 1.2.3"

# Create new tag
git tag v1.2.3

# Push everything
git push
git push origin v1.2.3
```

### Option 3: Manual Workflow Trigger

1. Go to: https://github.com/Skullcandyxxx/HighlightAssist/actions/workflows/build-windows.yml
2. Click "Run workflow"
3. Select branch: `master`
4. Click "Run workflow" button
5. Wait for build to complete (~5 minutes)
6. Manually upload the .exe to v1.2.2 release

**Note:** This requires downloading the artifact from GitHub Actions and manually attaching it to the release.

## Verification Steps

After choosing one of the options above:

1. **Check GitHub Actions**: https://github.com/Skullcandyxxx/HighlightAssist/actions
2. **Wait for build** (~5-7 minutes)
3. **Verify release**: https://github.com/Skullcandyxxx/HighlightAssist/releases/tag/v1.2.2
4. **Confirm file exists**: `HighlightAssist-Setup-v1.2.2.exe` (~16.71 MB)
5. **Test download link** in popup.html

## Current Workflow Status

The workflow file is **CORRECT** and will build the professional installer. The issue is just timing - it was updated after the tag was created.

**Workflow location:** `.github/workflows/build-windows.yml`

**Key steps:**
- ✅ Installs Inno Setup via Chocolatey
- ✅ Builds service manager with PyInstaller
- ✅ Runs ISCC.exe to create installer
- ✅ Uploads .exe to release (not ZIP)

## Recommended Action

**Use Option 1** (delete/recreate tag) - it's the cleanest solution and won't leave orphaned releases.

## Copy-Paste Commands

```powershell
# Navigate to HighlightAssist directory
cd D:\Projects\LawHub\HighlightAssist

# Delete old tag
git tag -d v1.2.2
git push origin :refs/tags/v1.2.2

# Recreate tag at current commit (includes workflow fix)
git tag v1.2.2
git push origin v1.2.2

# Monitor progress
echo "Check GitHub Actions: https://github.com/Skullcandyxxx/HighlightAssist/actions"
```

After running these commands, wait 5-7 minutes for the build to complete, then check the release page.
