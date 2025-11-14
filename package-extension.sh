#!/bin/bash
# HighlightAssist Extension Packager (Linux/macOS)
# Creates a clean, minimal extension directory for browser loading

echo ""
echo "📦 Packaging HighlightAssist Extension..."
echo ""

# Define output directory
OUTPUT_DIR="./extension-package"

# Remove old package if exists
if [ -d "$OUTPUT_DIR" ]; then
    echo "🗑️  Removing old package..."
    rm -rf "$OUTPUT_DIR"
fi

# Create clean directory
mkdir -p "$OUTPUT_DIR"
echo "✅ Created clean directory: $OUTPUT_DIR"
echo ""

# Files and folders to include (ONLY what the browser needs)
INCLUDE_FILES=(
    "manifest.json"
    "background.js"
    "content.js"
    "popup-v2.html"
    "popup-v2.js"
    "overlay-gui-oop.js"
    "logger.js"
    "error-handler.js"
    "README.md"
    "LICENSE"
)

INCLUDE_DIRS=(
    "icons"
    "modules"
)

echo "📋 Copying extension files..."

COPIED_FILES=0

# Copy individual files
for file in "${INCLUDE_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$OUTPUT_DIR/"
        SIZE=$(du -h "$file" | cut -f1)
        echo "  ✅ $file ($SIZE)"
        COPIED_FILES=$((COPIED_FILES + 1))
    else
        echo "  ⚠️  $file not found - skipping"
    fi
done

# Copy directories
for dir in "${INCLUDE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$OUTPUT_DIR/"
        FILE_COUNT=$(find "$OUTPUT_DIR/$dir" -type f | wc -l | xargs)
        SIZE=$(du -sh "$OUTPUT_DIR/$dir" | cut -f1)
        echo "  ✅ $dir/ ($FILE_COUNT files, $SIZE)"
        COPIED_FILES=$((COPIED_FILES + FILE_COUNT))
    else
        echo "  ⚠️  $dir/ not found - skipping"
    fi
done

echo ""
echo "📊 Package Summary:"
TOTAL_SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)
echo "  Files copied: $COPIED_FILES"
echo "  Total size: $TOTAL_SIZE"
echo "  Location: $OUTPUT_DIR"

echo ""
echo "✅ Extension packaged successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Open browser extensions page (chrome://extensions)"
echo "   2. Enable 'Developer mode'"
echo "   3. Click 'Load unpacked'"
echo "   4. Select: $OUTPUT_DIR"
echo "   5. Extension will be ~200 KB instead of 300+ MB! 🎉"
echo ""

# Create ZIP for distribution
ZIP_NAME="HighlightAssist-Extension-v$(date +%Y-%m-%d).zip"
if [ -f "$ZIP_NAME" ]; then
    rm "$ZIP_NAME"
fi

echo "📦 Creating ZIP archive for distribution..."
cd "$OUTPUT_DIR" && zip -r "../$ZIP_NAME" . -q && cd ..

if [ -f "$ZIP_NAME" ]; then
    ZIP_SIZE=$(du -h "$ZIP_NAME" | cut -f1)
    echo "  ✅ Created: $ZIP_NAME ($ZIP_SIZE)"
    echo ""
fi
