# HighlightAssist - User Guide

Quick reference for using HighlightAssist browser extension.

## 🚀 Quick Start (3 Steps)

1. **Navigate to localhost** (e.g., `http://localhost:3000`)
2. **Click extension icon** in browser toolbar
3. **Click "🎨 Open GUI Panel"** button

That's it! The overlay is now active.

---

## 🎯 Main Features

### 1. Element Inspection
**What it does**: Highlight and analyze any element on your page

**How to use**:
1. Click "Start Inspecting" in Main tab
2. Hover over elements (blue highlight appears)
3. Click element to lock and analyze

**Keyboard shortcut**: `Ctrl+Shift+H` (Mac: `Cmd+Shift+H`)

---

### 2. Layer Explorer (Photoshop-style)
**What it does**: Shows all elements at cursor position in z-index order

**How to use**:
1. Click "🎨 Layer Explorer" button
2. Hover over complex UI (buttons, cards, modals)
3. See stacked layers in floating panel
4. Click 👁️ to hide/show layers
5. Click 🔒 to select a specific layer
6. Click 📋 to copy CSS selector

**Pro tip**: Use layer hiding to reveal what's beneath overlays

---

### 3. AI Integration
**What it does**: Sends element context to AI assistants

**How to use**:
1. Lock an element (click while inspecting)
2. Go to Bridge tab → Click "Start"
3. Wait for "Bridge running" status
4. Click "📤 Send to AI" in Main tab
5. AI receives structured HTML/CSS data

**Works with**: GitHub Copilot, ChatGPT, Claude, local LLMs

---

### 4. Inspection History
**What it does**: Track last 20 inspected elements

**How to use**:
1. Switch to Layers tab
2. Click any previous element to re-select
3. See full inspection history

---

## 🎨 Popup UI Guide

### Status Indicators

| Icon | Status | Meaning |
|------|--------|---------|
| 🟢 | Green gradient | Inspection is active |
| ⚫ | Red gradient | Inspection is paused |
| ⚠️ | Warning | Not on localhost |

### Buttons

| Button | Action | When to Use |
|--------|--------|-------------|
| 🚀 Enable Highlight Tool | Basic inspection | Quick element checks |
| 🎨 Open GUI Panel | Full overlay | Advanced debugging |
| 📥 Export Logs | Download logs | Troubleshooting |
| ⚙️ Settings & Preferences | View stats | Check configuration |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` | Toggle inspection on/off |
| `Cmd+Shift+H` | (Mac) Toggle inspection |
| `Ctrl+Click` | Lock element (when auto-lock disabled) |
| `Cmd+Click` | (Mac) Lock element |

---

## 🔧 Settings & Options

### Overlay Opacity
- **Location**: Settings tab
- **Range**: 0% - 100%
- **Default**: 100%
- **Use case**: Reduce opacity to see underlying content

### Auto-Lock Mode
- **Location**: Main tab (checkbox)
- **ON**: Click anywhere to lock element
- **OFF**: Require Ctrl/Cmd+Click to lock
- **Recommended**: OFF for precision clicking

### Keyboard Shortcuts Toggle
- **Location**: Settings tab
- **Default**: Enabled
- **Disable if**: Shortcuts conflict with other tools

---

## 🛠️ Common Workflows

### Workflow 1: Inspect Button Styling
```
1. Open GUI Panel (Ctrl+Shift+H)
2. Click "Start Inspecting"
3. Hover over button
4. Click to lock
5. View CSS properties in Main tab
6. Click "📤 Send to AI" for suggestions
```

### Workflow 2: Debug z-index Issues
```
1. Open GUI Panel
2. Click "🎨 Layer Explorer"
3. Hover over problem area
4. See z-index stack in real-time
5. Hide layers one by one
6. Identify overlapping elements
```

### Workflow 3: Copy Complex Selectors
```
1. Open Layer Explorer
2. Find target element in stack
3. Click 📋 button
4. Paste selector in DevTools or code
```

### Workflow 4: Track Inspection History
```
1. Inspect multiple elements
2. Switch to Layers tab
3. Click any previous element
4. Compare properties side-by-side
```

---

## ❗ Troubleshooting

### "Extension not loaded on this page"
**Solution**: Refresh page (F5 or Ctrl+F5)

### "Not on localhost" warning
**Solution**: 
- Click one of the suggested localhost tabs
- OR click "Set Up Localhost" and enter port

### GUI panel doesn't appear
**Solution**:
1. Check browser console for errors
2. Reload extension: `chrome://extensions` → Reload
3. Hard refresh page: Ctrl+F5

### "Send to AI" button grayed out
**Solution**: 
1. Go to Bridge tab
2. Click "Start" button
3. Wait for "Running" status

### Layer Explorer shows no layers
**Solution**: Move cursor over page content (not blank areas)

### Can't click elements precisely
**Solution**: Disable auto-lock checkbox → Use Ctrl/Cmd+Click

---

## 🌐 Localhost Detection

HighlightAssist works on:
- ✅ `localhost:*`
- ✅ `127.0.0.1:*`
- ✅ `::1` (IPv6 localhost)
- ✅ `*.local` (mDNS domains)
- ✅ `10.x.x.x` (private network)
- ✅ `172.16-31.x.x` (private network)
- ✅ `192.168.x.x` (private network)

**Does NOT work on**:
- ❌ Production websites
- ❌ Public URLs
- ❌ `file://` protocol

---

## 📊 Log Export Formats

### JSON Format
```json
[
  {
    "timestamp": "2025-11-12T10:30:00Z",
    "level": "info",
    "source": "overlay",
    "message": "Element locked",
    "data": {...}
  }
]
```

### Text Format
```
[2025-11-12T10:30:00Z] [info] [overlay] Element locked
  Data: {...}
```

### CSV Format
```csv
Timestamp,Level,Source,Message,URL,Data
"2025-11-12T10:30:00Z","info","overlay","Element locked","http://localhost:3000","{...}"
```

---

## 🎓 Pro Tips

1. **Use Layer Explorer first** when debugging complex layouts
2. **Enable auto-lock** for rapid element inspection
3. **Disable auto-lock** for precise clicking in dense UIs
4. **Export logs** before reporting bugs
5. **Start bridge early** if planning to use AI features
6. **Drag overlay** to screen edge to maximize workspace
7. **Check Layers tab** to compare recently inspected elements
8. **Copy selectors** instead of manually writing them
9. **Use keyboard shortcuts** for faster workflow
10. **Reduce opacity** when overlay blocks important content

---

## 📝 Frequently Asked Questions

### Q: Do I need to install Python for basic features?
**A**: No, only for AI integration (bridge).

### Q: Does this work on production websites?
**A**: No, only localhost/development servers for security.

### Q: Can I use this with React DevTools?
**A**: Yes, they work together without conflicts.

### Q: How do I share inspection data with my team?
**A**: Export logs as JSON and share the file.

### Q: Does this slow down my page?
**A**: No, it uses event-driven architecture with minimal overhead.

### Q: Can I customize keyboard shortcuts?
**A**: Not yet, but this is planned for a future release.

### Q: What browsers are supported?
**A**: Chrome, Edge, Opera, Brave. Firefox support coming soon.

---

## 🔗 Additional Resources

- **Full Documentation**: See `.github/copilot-instructions.md`
- **Architecture Details**: See `ARCHITECTURE_COMPARISON.md`
- **Migration Guide**: See `MIGRATION_GUIDE.md`
- **Troubleshooting**: See `docs/TROUBLESHOOTING.md`
- **Feature History**: See `docs/FEATURES-v3.3.md`

---

## 💡 Support

**Issues**: Check logs in `%LOCALAPPDATA%\HighlightAssist\logs\`
**Bugs**: Export logs → Create GitHub issue
**Questions**: Check documentation first

---

Made with ❤️ for developers who hate slow debugging workflows.
