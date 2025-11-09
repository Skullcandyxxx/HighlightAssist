const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const svgPath = path.join(__dirname, '..', 'icons', 'icon.svg');
const iconsDir = path.join(__dirname, '..', 'icons');

async function generateIcons() {
  console.log('🎨 Generating PNG icons from SVG...\n');
  
  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon${size}.png`);
    
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated icon${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate icon${size}.png:`, error.message);
    }
  }
  
  console.log('\n✨ Icon generation complete!');
}

generateIcons().catch(console.error);
