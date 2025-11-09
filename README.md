<div align="center"># 🎯 Highlight Assist - Visual UI Debugger



# ⚡ HighlightAssistA professional browser extension for developers to inspect and debug UI elements visually. Perfect for working with AI assistants like GitHub Copilot - send structured element data instead of screenshots!



**The lightweight DevTools alternative for Vite developers**## ✨ Features



[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)- 🎯 **Visual Element Inspector** - Click any element to inspect in detail

[![GitHub stars](https://img.shields.io/github/stars/Skullcandyxxx/HighlightAssist?style=social)](https://github.com/Skullcandyxxx/HighlightAssist/stargazers)- 📊 **Real-time Properties** - View styles, dimensions, and attributes live

[![GitHub issues](https://img.shields.io/github/issues/Skullcandyxxx/HighlightAssist)](https://github.com/Skullcandyxxx/HighlightAssist/issues)- 🤖 **AI-Ready Output** - Export structured data for AI assistants

[![Open Source](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://opensource.org/)- ⚡ **Keyboard Shortcuts** - Ctrl+Shift+H to toggle instantly

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)- 🔒 **Privacy First** - Works offline, localhost only, zero data collection

- 🎨 **Beautiful UI** - Modern gradient design with smooth animations

**Click any element on your Vite localhost to instantly inspect it. 80% faster than DevTools for quick checks.**

## 🚀 Installation

[Install](#installation) • [Features](#features) • [Why Not DevTools?](WHY_NOT_DEVTOOLS.md) • [Contributing](#contributing)

### Opera GX / Opera

</div>

1. Open Opera GX

---2. Go to **opera://extensions/** (or click Menu → Extensions)

3. Enable **Developer mode** (toggle in top-right or sidebar)

## 🚀 Why HighlightAssist?4. Click **Load unpacked extension**

5. Navigate to and select the `browser-extension` folder

Stop opening DevTools for simple element checks. HighlightAssist gives you instant element information with **one click** — no DOM navigation, no context switching, no cognitive overload.6. Pin the extension icon to your toolbar for quick access



### The Problem### Chrome / Edge / Brave

- Opening DevTools for quick checks is **slow** (50-70 seconds for 10 elements)

- DevTools shows **too much information** when you just need the basics1. Open your browser

- Takes up **30-50% of your screen** real estate2. Go to extensions page:

- Forces **context switching** that breaks your flow   - Chrome: `chrome://extensions/`

   - Edge: `edge://extensions/`

### The Solution   - Brave: `brave://extensions/`

- **One click** to see element details (~10 seconds for 10 elements)3. Enable **Developer mode** (toggle in top-right)

- **Inline tooltips** show only what you need4. Click **Load unpacked**

- **Zero screen space** — no panels to manage5. Select the `browser-extension` folder

- **Stay in flow** — no mental context switching

## 📋 How to Use

**[Read the full comparison: Why Not DevTools?](WHY_NOT_DEVTOOLS.md)** | **80% Time Savings** ⚡

### Quick Start

---

1. **Start your dev server** (Vite, webpack, etc.) on localhost

## ✨ Features2. **Click the extension icon** 🎯 in your toolbar

3. **Click "Enable Highlight Tool"** button

### ⚡ Lightning Fast4. **Start inspecting!** Click any element on your page

Click any element to instantly see its tag, classes, ID, and positioning. No waiting for DevTools to load.

### Keyboard Shortcuts

### ⌨️ Keyboard Shortcuts

Toggle on/off with `Ctrl+Shift+H` (`Cmd+Shift+H` on Mac). Stay in your workflow.- **Ctrl + Shift + H** (Windows/Linux)

- **Cmd + Shift + H** (Mac)

### 🎯 Vite Auto-Detection

Automatically finds your Vite dev server on common ports (5173, 3000, 3001, 5174). Zero configuration.Toggle the highlight tool without opening the popup!



### 🔒 Privacy First### Supported Environments

- Only works on localhost (127.0.0.1, localhost, *.local)

- Zero data collectionThe extension automatically detects Vite/webpack dev servers on:

- No external network requests- `http://localhost:5173` (Vite default)

- No tracking or analytics- `http://localhost:3000`

- Fully auditable open-source code- `http://localhost:3001`

- `http://localhost:*` (any port)

### 💎 Beautiful UI- `http://127.0.0.1:*`

Modern gradient design with smooth animations. Badge indicator shows when the tool is active.- `http://*.local`



### 🎮 Opera GX Optimized## 🛠️ Development

Built specifically with Opera GX compatibility in mind, perfect for gamers who code.

### Project Structure

---

```

## 📦 Installationbrowser-extension/

├── manifest.json          # Extension configuration

### Chrome / Edge / Brave / Opera GX├── popup.html            # Main popup interface

├── popup.js              # Popup logic and UI updates

**Option 1: From Store (Coming Soon)**├── content.js            # Runs on localhost pages

- Chrome Web Store: *Pending approval*├── injected.js           # Injected into page context

- Opera Addons: *Pending approval*├── background.js         # Service worker & shortcuts

├── icons/                # Extension icons

**Option 2: Install Manually**│   ├── icon.svg         # Source SVG (512x512)

│   ├── icon16.png       # Toolbar icon

1. Download the [latest release](https://github.com/Skullcandyxxx/HighlightAssist/releases) or clone this repo│   ├── icon32.png       # Windows taskbar

2. Extract the ZIP file (or use the cloned folder)│   ├── icon48.png       # Extensions page

3. Open your browser and navigate to:│   └── icon128.png      # Chrome Web Store

   - **Chrome/Edge/Brave:** `chrome://extensions/`└── README.md            # This file

   - **Opera/Opera GX:** `opera://extensions/````

4. Enable "Developer mode" (toggle in top-right)

5. Click "Load unpacked"### Creating Icons

6. Select the HighlightAssist folder

7. Done! 🎉The extension needs PNG icons. Use the provided SVG:



### Firefox**Option 1 - Online (Easiest):**

1. Go to https://cloudconvert.com/svg-to-png

**From Store (Coming Soon)**2. Upload `icons/icon.svg`

- Firefox Add-ons: *Pending approval*3. Convert to PNG at 512x512

4. Resize to 16, 32, 48, 128px using any image editor

---

**Option 2 - Inkscape (Free):**

## 🎯 Quick Start```bash

inkscape icons/icon.svg -w 16 -h 16 -o icons/icon16.png

1. **Install the extension** (see above)inkscape icons/icon.svg -w 32 -h 32 -o icons/icon32.png

2. **Navigate to your Vite dev server** (e.g., `http://localhost:5173`)inkscape icons/icon.svg -w 48 -h 48 -o icons/icon48.png

3. **Click the extension icon** in your toolbarinkscape icons/icon.svg -w 128 -h 128 -o icons/icon128.png

4. **Enable highlighting** by clicking the toggle```

5. **Click any element** on your page to inspect it

6. **Use `Ctrl+Shift+H`** to quickly toggle on/off**Option 3 - ImageMagick:**

```bash

That's it! No configuration needed.convert icons/icon.svg -resize 16x16 icons/icon16.png

convert icons/icon.svg -resize 32x32 icons/icon32.png

---convert icons/icon.svg -resize 48x48 icons/icon48.png

convert icons/icon.svg -resize 128x128 icons/icon128.png

## 💡 Use Cases```



Perfect for when you need to:## 🎨 Customization



- ✅ Quickly check an element's tag name### Change Colors

- ✅ Verify CSS classes are applied

- ✅ Check element IDs for form fieldsEdit `icons/icon.svg` gradients:

- ✅ Inspect positioning values at a glance- Primary: `#3b82f6` → `#1d4ed8` (blue)

- ✅ Debug layout issues rapidly without DevTools overhead- Accent: `#fbbf24` → `#f59e0b` (amber)

- ✅ Verify component rendering in React/Vue/Svelte

- ✅ Stay in development flow without context switching### Add Features



---1. Update `manifest.json` with new permissions

2. Add functionality in `content.js` or `injected.js`

## 🛠️ For Developers3. Update UI in `popup.html` and `popup.js`



### Building from Source## 🔐 Privacy & Security



```bash- ✅ **Localhost only** - Only runs on local development servers

# Clone the repository- ✅ **No data collection** - Zero analytics or tracking

git clone https://github.com/Skullcandyxxx/HighlightAssist.git- ✅ **Open source** - Fully transparent code

cd HighlightAssist- ✅ **No external requests** - Everything runs locally

- ✅ **No ads** - Clean, focused developer tool

# Install dependencies (optional, for icon generation)

npm install## 📦 Publishing to Chrome Web Store



# Generate icons from SVGBefore publishing:

node scripts/generateIcons.js

1. **Create high-quality icons** (see above)

# Package extension for store submission2. **Create promotional images:**

node scripts/package.js   - Small tile: 440x280

   - Large tile: 920x680

# Output: dist/HighlightAssist-v1.0.0.zip   - Marquee: 1400x560

```   - Screenshots: 1280x800 or 640x400

3. **Update manifest:**

### Project Structure   - Add detailed description

   - Add homepage URL

```   - Set version number

HighlightAssist/4. **Test thoroughly** in all supported browsers

├── manifest.json           # Extension configuration (Manifest V3)5. **Create developer account** ($5 one-time fee)

├── popup.html/js          # Extension popup UI6. **Submit for review**

├── background.js          # Service worker

├── content.js             # Content script## 🤝 Contributing

├── injected.js            # Page context script (Vite module access)

├── icons/                 # Extension icons (16, 32, 48, 128)Found a bug or have a feature request?

├── store-assets/          # Store submission materials

│   ├── SUBMISSION_GUIDE.md1. Open an issue on GitHub

│   ├── STORE_LISTING.md2. Submit a pull request

│   └── comparison-graphics.html3. Share feedback with the team

└── scripts/               # Build scripts

```## 📄 License



### Tech StackMIT License - See LICENSE file for details



- **Manifest V3** - Latest extension standardCopyright (c) 2025 Skullcandyxxx

- **Vanilla JavaScript** - No framework overhead, maximum performance

- **Chrome Extension APIs** - storage, scripting, tabs, commands## 👤 Author

- **Modern CSS** - Gradients, animations, backdrop-filter

**Skullcandyxxx**

---- GitHub: [@Skullcandyxxx](https://github.com/Skullcandyxxx)

- Email: glfalliance@gmail.com

## 🤝 Contributing

## 🙏 Credits

Contributions are welcome! Here's how you can help:

Developed with ❤️ for the developer community by Skullcandyxxx.

### Ways to Contribute

Special thanks to:

- 🐛 **Report bugs** via [GitHub Issues](https://github.com/Skullcandyxxx/HighlightAssist/issues)- React and Vite teams

- 💡 **Suggest features** you'd like to see- Chromium extension API developers

- 🔧 **Submit pull requests** with improvements- Open source community

- 📖 **Improve documentation**

- ⭐ **Star this repo** to show support---

- 📢 **Share with others** who might find it useful

**Made by Skullcandyxxx** | [GitHub](https://github.com/Skullcandyxxx/HighlightAssist) | [Report Issues](https://github.com/Skullcandyxxx/HighlightAssist/issues)

### Development Guidelines


1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly on Chrome, Edge, and Opera
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📝 Changelog

### Version 1.0.0 (November 2025)
- 🎉 Initial release
- ⚡ Element highlighting and inspection
- ⌨️ Keyboard shortcuts (Ctrl+Shift+H)
- 🎯 Auto-detection of Vite servers on ports 5173, 3000, 3001, 5174
- 💎 Badge indicator showing active state
- 🔒 Localhost-only security (privacy first)
- 🎮 Opera GX compatibility
- 📦 Manifest V3 compliant

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Skullcandyxxx**
- GitHub: [@Skullcandyxxx](https://github.com/Skullcandyxxx)
- Email: glfalliance@gmail.com

---

## 🙏 Acknowledgments

- Built for the amazing [Vite](https://vitejs.dev/) community
- Inspired by the need for lightweight developer tools
- Special thanks to Opera GX users who code

---

## 📊 Stats

![GitHub repo size](https://img.shields.io/github/repo-size/Skullcandyxxx/HighlightAssist)
![GitHub last commit](https://img.shields.io/github/last-commit/Skullcandyxxx/HighlightAssist)
![GitHub](https://img.shields.io/github/license/Skullcandyxxx/HighlightAssist)

---

## 🌟 Show Your Support

If you find HighlightAssist useful, please consider:

- ⭐ **Starring this repository**
- 🐦 **Sharing on social media**
- 📝 **Writing a review** (once available on stores)
- 💬 **Telling other Vite developers**

Every star helps the project grow! 🚀

---

<div align="center">

**Made with ❤️ for Vite developers**

[Report Bug](https://github.com/Skullcandyxxx/HighlightAssist/issues) • [Request Feature](https://github.com/Skullcandyxxx/HighlightAssist/issues)

</div>
