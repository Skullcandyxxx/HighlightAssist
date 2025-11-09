# 🎯 Highlight Assist - Visual UI Debugger

A professional browser extension for developers to inspect and debug UI elements visually. Perfect for working with AI assistants like GitHub Copilot - send structured element data instead of screenshots!

## ✨ Features

- 🎯 **Visual Element Inspector** - Click any element to inspect in detail
- 📊 **Real-time Properties** - View styles, dimensions, and attributes live
- 🤖 **AI-Ready Output** - Export structured data for AI assistants
- ⚡ **Keyboard Shortcuts** - Ctrl+Shift+H to toggle instantly
- 🔒 **Privacy First** - Works offline, localhost only, zero data collection
- 🎨 **Beautiful UI** - Modern gradient design with smooth animations

## 🚀 Installation

### Opera GX / Opera

1. Open Opera GX
2. Go to **opera://extensions/** (or click Menu → Extensions)
3. Enable **Developer mode** (toggle in top-right or sidebar)
4. Click **Load unpacked extension**
5. Navigate to and select the `browser-extension` folder
6. Pin the extension icon to your toolbar for quick access

### Chrome / Edge / Brave

1. Open your browser
2. Go to extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `browser-extension` folder

## 📋 How to Use

### Quick Start

1. **Start your dev server** (Vite, webpack, etc.) on localhost
2. **Click the extension icon** 🎯 in your toolbar
3. **Click "Enable Highlight Tool"** button
4. **Start inspecting!** Click any element on your page

### Keyboard Shortcuts

- **Ctrl + Shift + H** (Windows/Linux)
- **Cmd + Shift + H** (Mac)

Toggle the highlight tool without opening the popup!

### Supported Environments

The extension automatically detects Vite/webpack dev servers on:
- `http://localhost:5173` (Vite default)
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:*` (any port)
- `http://127.0.0.1:*`
- `http://*.local`

## 🛠️ Development

### Project Structure

```
browser-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.js              # Popup logic and UI updates
├── content.js            # Runs on localhost pages
├── injected.js           # Injected into page context
├── background.js         # Service worker & shortcuts
├── icons/                # Extension icons
│   ├── icon.svg         # Source SVG (512x512)
│   ├── icon16.png       # Toolbar icon
│   ├── icon32.png       # Windows taskbar
│   ├── icon48.png       # Extensions page
│   └── icon128.png      # Chrome Web Store
└── README.md            # This file
```

### Creating Icons

The extension needs PNG icons. Use the provided SVG:

**Option 1 - Online (Easiest):**
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `icons/icon.svg`
3. Convert to PNG at 512x512
4. Resize to 16, 32, 48, 128px using any image editor

**Option 2 - Inkscape (Free):**
```bash
inkscape icons/icon.svg -w 16 -h 16 -o icons/icon16.png
inkscape icons/icon.svg -w 32 -h 32 -o icons/icon32.png
inkscape icons/icon.svg -w 48 -h 48 -o icons/icon48.png
inkscape icons/icon.svg -w 128 -h 128 -o icons/icon128.png
```

**Option 3 - ImageMagick:**
```bash
convert icons/icon.svg -resize 16x16 icons/icon16.png
convert icons/icon.svg -resize 32x32 icons/icon32.png
convert icons/icon.svg -resize 48x48 icons/icon48.png
convert icons/icon.svg -resize 128x128 icons/icon128.png
```

## 🎨 Customization

### Change Colors

Edit `icons/icon.svg` gradients:
- Primary: `#3b82f6` → `#1d4ed8` (blue)
- Accent: `#fbbf24` → `#f59e0b` (amber)

### Add Features

1. Update `manifest.json` with new permissions
2. Add functionality in `content.js` or `injected.js`
3. Update UI in `popup.html` and `popup.js`

## 🔐 Privacy & Security

- ✅ **Localhost only** - Only runs on local development servers
- ✅ **No data collection** - Zero analytics or tracking
- ✅ **Open source** - Fully transparent code
- ✅ **No external requests** - Everything runs locally
- ✅ **No ads** - Clean, focused developer tool

## 📦 Publishing to Chrome Web Store

Before publishing:

1. **Create high-quality icons** (see above)
2. **Create promotional images:**
   - Small tile: 440x280
   - Large tile: 920x680
   - Marquee: 1400x560
   - Screenshots: 1280x800 or 640x400
3. **Update manifest:**
   - Add detailed description
   - Add homepage URL
   - Set version number
4. **Test thoroughly** in all supported browsers
5. **Create developer account** ($5 one-time fee)
6. **Submit for review**

## 🤝 Contributing

Found a bug or have a feature request?

1. Open an issue on GitHub
2. Submit a pull request
3. Share feedback with the team

## 📄 License

MIT License - See LICENSE file for details

Copyright (c) 2025 Skullcandyxxx

## 👤 Author

**Skullcandyxxx**
- GitHub: [@Skullcandyxxx](https://github.com/Skullcandyxxx)
- Email: glfalliance@gmail.com

## 🙏 Credits

Developed with ❤️ for the developer community by Skullcandyxxx.

Special thanks to:
- React and Vite teams
- Chromium extension API developers
- Open source community

---

**Made by Skullcandyxxx** | [GitHub](https://github.com/Skullcandyxxx/HighlightAssist) | [Report Issues](https://github.com/Skullcandyxxx/HighlightAssist/issues)

