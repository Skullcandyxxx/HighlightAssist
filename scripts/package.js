const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const extensionDir = path.join(__dirname, '..');
const outputDir = path.join(__dirname, '..', 'dist');
const zipName = 'HighlightAssist-v1.0.0.zip';

// Files and folders to include in the package
const filesToInclude = [
    'manifest.json',
    'popup.html',
    'popup.js',
    'background.js',
    'content.js',
    'injected.js',
    'icons/icon16.png',
    'icons/icon32.png',
    'icons/icon48.png',
    'icons/icon128.png'
];

// Files and folders to exclude
const excludePatterns = [
    'node_modules',
    'dist',
    'store-assets',
    'scripts',
    '.git',
    '.gitignore',
    'package.json',
    'package-lock.json',
    'buildIcons.js',
    'generate-icons.bat',
    'icons/icon.svg',
    'icons/README.md',
    'README.md',
    'INSTALL.html',
    'LICENSE'
];

console.log('📦 Creating extension package...\n');

// Create dist directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('✓ Created dist directory');
}

// Create the zip file
try {
    const outputPath = path.join(outputDir, zipName);
    
    // Build the list of files to include
    const includeArgs = filesToInclude.map(f => `"${f}"`).join(' ');
    
    // Use PowerShell's Compress-Archive
    const command = `powershell -Command "Compress-Archive -Path ${includeArgs} -DestinationPath '${outputPath}' -Force"`;
    
    execSync(command, { cwd: extensionDir, stdio: 'inherit' });
    
    console.log(`\n✨ Extension package created successfully!`);
    console.log(`📍 Location: ${outputPath}`);
    
    // Get file size
    const stats = fs.statSync(outputPath);
    const fileSizeInKB = (stats.size / 1024).toFixed(2);
    console.log(`📊 Size: ${fileSizeInKB} KB`);
    
    console.log('\n✅ Ready to upload to:');
    console.log('   • Chrome Web Store');
    console.log('   • Opera Addons');
    console.log('   • Firefox Add-ons (may need manifest adjustments)');
    
} catch (error) {
    console.error('❌ Error creating package:', error.message);
    process.exit(1);
}
