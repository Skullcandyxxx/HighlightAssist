# Git Tag v1.2.2 Recreation Guide

## Overview

This directory contains scripts to recreate the git tag `v1.2.2` at the current HEAD commit. This is useful when you need to move a tag to point to a different commit.

## What These Scripts Do

The scripts perform the following operations in sequence:

1. **Delete local tag** (if it exists): `git tag -d v1.2.2`
2. **Delete remote tag**: `git push origin :refs/tags/v1.2.2`
3. **Create new local tag**: `git tag v1.2.2`
4. **Push new tag to remote**: `git push origin v1.2.2`

## Prerequisites

- You must have write access to the repository
- You must be on the branch/commit where you want the tag to point
- You must have git credentials configured for pushing to the remote

## Usage

### On Linux/macOS:

```bash
./recreate-tag-v1.2.2.sh
```

### On Windows (PowerShell):

```powershell
.\recreate-tag-v1.2.2.ps1
```

### Manual Execution:

If you prefer to run the commands manually:

```bash
# Navigate to repository
cd /path/to/HighlightAssist

# Delete local tag (if exists)
git tag -d v1.2.2

# Delete remote tag
git push origin :refs/tags/v1.2.2

# Create new tag at current HEAD
git tag v1.2.2

# Push new tag to remote
git push origin v1.2.2
```

## Current Status

- ✅ Local tag `v1.2.2` has been created at commit `513c7981f24a1ab5da9e88ca993bba7f3550390b`
- ⏳ Remote tag deletion and push requires authentication (manual step needed)

## Verification

After running the script, verify the tag was created correctly:

```bash
# Check local tag
git tag -l v1.2.2

# Check what commit the tag points to
git show v1.2.2 --no-patch

# Check remote tag
git ls-remote --tags origin | grep v1.2.2
```

## Notes

- The tag will point to the current HEAD commit when created
- Deleting and recreating a tag is a **force operation** that rewrites history
- Coordinate with your team before moving published tags
- Other users will need to delete their local tag and fetch the new one:
  ```bash
  git tag -d v1.2.2
  git fetch origin tag v1.2.2
  ```

## Troubleshooting

### Authentication Failed

If you see "Authentication failed", ensure:
- Your git credentials are properly configured
- You have push access to the repository
- For HTTPS, you may need a personal access token instead of password

### Tag Already Exists

If "tag already exists" error appears:
- Delete the local tag first: `git tag -d v1.2.2`
- Then retry creating the tag

### Permission Denied on Remote

- Ensure you have write/push access to the repository
- Check that branch protection rules don't prevent tag updates
