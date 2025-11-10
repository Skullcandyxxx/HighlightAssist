#  Installation Guide

Complete installation instructions for HighlightAssist browser extension.

##  Quick Install (Recommended)

### Chrome / Edge / Brave

1. **Download** the [latest release](https://github.com/Skullcandyxxx/HighlightAssist/releases)
2. **Extract** the ZIP file to a permanent location (e.g., \C:\Extensions\HighlightAssist\)
3. **Open** your browser and go to:
   - Chrome: \chrome://extensions/\
   - Edge: \edge://extensions/\
   - Brave: \rave://extensions/\
4. **Enable** "Developer mode" (toggle in top-right corner)
5. **Click** "Load unpacked"
6. **Select** the extracted HighlightAssist folder
7. **Pin** the extension icon to your toolbar (click puzzle icon  pin HighlightAssist)

 **Done!** The extension is now installed.

### Opera / Opera GX

1. **Download** the [latest release](https://github.com/Skullcandyxxx/HighlightAssist/releases)
2. **Extract** the ZIP file to a permanent location
3. **Open** Opera GX and go to \opera://extensions/\
4. **Enable** "Developer mode" (sidebar or top-right)
5. **Click** "Load unpacked extension"
6. **Select** the extracted HighlightAssist folder
7. **Pin** the extension icon to your toolbar

 **Done!** Ready to use.

---

##  Advanced Installation

### Install from Source (Developers)

\\\ash
# Clone the repository
git clone https://github.com/Skullcandyxxx/HighlightAssist.git
cd HighlightAssist

# (Optional) Install Node.js dependencies for icon generation
npm install

# Load in browser
# Follow steps 3-7 from Quick Install above
\\\

### Build Icons (Optional)

If you need to regenerate icons from the SVG source:

\\\ash
# Using Node.js script
node buildIcons.js

# Or using batch file (Windows)
generate-icons.bat
\\\

---

##  Verify Installation

### Check Extension is Loaded

1. Open browser extensions page
2. Find **HighlightAssist** in the list
3. Ensure the toggle is **ON** (enabled)
4. Version should show **v3.3** or later

### Test Basic Functionality

1. **Navigate** to \http://localhost:5173\ (or any localhost dev server)
2. **Click** the HighlightAssist icon in your toolbar
3. **Click** "Open GUI Panel"
4. **Click** any element on your page
5. Element details should appear in the Analysis tab

 If this works, installation is successful!

---

##  Troubleshooting

### Extension Not Loading

**Problem:** "Manifest file is missing or unreadable"

**Solution:**
- Ensure you extracted the ZIP completely
- Check that \manifest.json\ exists in the folder
- Try re-downloading the release

### Extension Icon Not Showing

**Problem:** Can't find the extension icon

**Solution:**
- Click the puzzle icon in your toolbar
- Find HighlightAssist in the list
- Click the pin icon to pin it to your toolbar

### "Developer mode" Not Available

**Problem:** Can't enable Developer mode

**Solution:**
- **Chrome:** Look in the top-right corner for a toggle switch
- **Opera:** Look in the sidebar or under "Developer" menu
- **Edge:** Same as Chrome, top-right toggle

### Extension Doesn't Work on Pages

**Problem:** Extension doesn't activate on my page

**Solution:**
- Extension only works on **localhost** and **local development** URLs
- Check that your URL starts with:
  - \http://localhost:\
  - \http://127.0.0.1:\
  - \http://192.168.\ (private network)
  - \http://*.local\
- Production websites are not supported (privacy/security)

### No GUI Panel Appears

**Problem:** Clicking "Open GUI Panel" does nothing

**Solution:**
1. Check browser console (F12) for errors
2. Reload the page (Ctrl+R)
3. Reload the extension:
   - Go to \chrome://extensions/\
   - Find HighlightAssist
   - Click the reload icon 

### Bridge Connection Fails

**Problem:** "Bridge offline" in AI Assistant

**Solution:**
- This is normal if you haven't started the bridge service
- The bridge is optional for AI integration
- Extension works fine without it
- See [Bridge Setup Guide](BRIDGE_SETUP.md) if you want AI features

---

##  Updating the Extension

### Manual Update

1. **Download** the new release
2. **Extract** to the same location (overwrite existing files)
3. **Reload** the extension:
   - Go to \chrome://extensions/\
   - Find HighlightAssist
   - Click reload icon 
4. **Refresh** any open localhost pages

### Check Current Version

1. Go to \chrome://extensions/\
2. Find **HighlightAssist**
3. Version number is displayed below the name

---

##  Uninstalling

### Complete Removal

1. Go to \chrome://extensions/\
2. Find **HighlightAssist**
3. Click **Remove**
4. Confirm removal
5. (Optional) Delete the extracted folder from your computer

### Data Cleanup

HighlightAssist stores minimal data:
- **Highlight color preference** (stored in browser extension storage)
- **Bridge URL** (if configured)

All data is automatically removed when you uninstall the extension.

---

##  System Requirements

### Minimum Requirements

- **Browser:** Chrome 88+, Edge 88+, Opera 74+, Brave 1.20+
- **OS:** Windows 7+, macOS 10.12+, Linux (any)
- **Disk Space:** < 5 MB
- **RAM:** Negligible (<10 MB)

### Recommended

- **Browser:** Latest version of Chrome, Edge, or Opera GX
- **OS:** Windows 10/11, macOS 13+
- **Development Server:** Vite, Next.js, Create React App, or similar

---

##  Need Help?

-  Read the [Troubleshooting Guide](TROUBLESHOOTING.md)
-  Report bugs via [GitHub Issues](https://github.com/Skullcandyxxx/HighlightAssist/issues)
-  Email: glfalliance@gmail.com

---

**Ready to start inspecting? [View Usage Guide](../README.md#-quick-start)** 
