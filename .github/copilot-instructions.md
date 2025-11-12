# HighlightAssist - AI Assistant Instructions

Cross-platform browser extension for visual UI debugging with AI-assisted element inspection.

## Architecture Overview

**Three-Layer Architecture (v3.0 OOP):**

1. **Browser Extension Layer** (`manifest.json`, `content.js`, `background.js`, **NEW: `overlay-gui-oop.js`**)
   - Content script injects OOP overlay into localhost pages
   - Background service worker manages extension lifecycle and native messaging
   - **NEW**: Modular overlay with 7 specialized classes (replaces 2262-line monolith)
   - Handshake protocol ensures reliable popup ↔ overlay communication

2. **WebSocket Bridge Layer** (`bridge.py` - FastAPI/Uvicorn on port 5055)
   - Persistent WebSocket server for browser ↔ AI communication
   - Logs structured element context for AI assistants
   - Broadcasts messages to multiple connected clients

3. **Service Manager Layer** (v2.0 OOP Architecture - TCP control on port 5054)
   - **NEW**: Modular OOP design in `/core` directory for performance and maintainability
   - `BridgeController`: Manages bridge lifecycle with non-blocking health checks
   - `TCPControlServer`: Selector-based async TCP server (minimal CPU usage)
   - `NotificationManager`: Cross-platform notifications with fallback chain
   - Background service (auto-starts with OS like Bonjour/mDNS)
   - Launches/stops bridge on-demand via TCP JSON commands

**NEW: Overlay OOP Architecture (v3.0)**

**Entry Point**: `overlay-gui-oop.js` (35 lines - minimal bootstrapper)

**Core Modules** (in `/modules` directory):
- **OverlayManager**: Main orchestrator (lifecycle, **init()**, handshake)
- **StateManagerEnhanced**: Reactive state management with persistence
- **UIRenderer**: DOM creation/updates for panel, tabs, overlays
- **EventHandler**: Event delegation (mouse, keyboard, buttons)
- **BridgeClient**: WebSocket communication with auto-reconnect
- **LayerInspector**: Z-index stack analysis (Photoshop-style)
- **ElementAnalyzer**: Framework detection (React/Vue/Angular/Svelte)

**Data Flow (NEW Handshake Protocol)**:
```
Browser Extension → WebSocket (5055) → Bridge → AI Assistant
       ↕ (HIGHLIGHT_ASSIST_READY)
Extension Commands → TCP (5054) → Service Manager
```

## User Workflow: Popup → Overlay → Inspection

### End-User Story (How Developers Use HighlightAssist)

**Scenario**: Developer wants to inspect a React component's styling on `http://localhost:3000`

1. **Navigate to localhost page**
   - Open browser → go to localhost development server
   - Extension icon shows in toolbar

2. **Open Popup (Click extension icon)**
   - Shows status: "Inspection Paused" (inactive state)
   - Quick features list displayed
   - Two main actions available:
     - "🚀 Enable Highlight Tool" → Starts basic inspection mode
     - "🎨 Open GUI Panel" → Opens full overlay interface

3. **Open GUI Panel** (Recommended workflow)
   - Click "🎨 Open GUI Panel" button
   - Floating overlay appears top-left (draggable)
   - Four tabs visible: Main, Layers, Bridge, Settings
   - Keyboard shortcut: `Ctrl+Shift+H` (or `Cmd+Shift+H` on Mac)

4. **Start Inspecting Elements**
   - **Method 1**: Click "Start Inspecting" in Main tab
   - **Method 2**: Use keyboard shortcut `Ctrl+Shift+H`
   - Cursor changes to crosshair
   - Hover over elements → blue highlight appears
   - Element info updates in real-time

5. **Lock Element for Analysis**
   - **Auto-lock mode** (checkbox ON): Click element directly
   - **Ctrl/Cmd-click mode** (checkbox OFF): Hold Ctrl/Cmd + Click
   - Element locked → full analysis appears in Main tab
   - Element added to Layers tab history (max 20)

6. **Use Layer Inspector (Photoshop-style)**
   - Click "🎨 Layer Explorer" button in Main tab
   - Floating panel shows z-index stack at cursor position
   - Each layer shows:
     - Tag name + ID/class
     - Dimensions (width × height)
     - Background preview (colors/gradients)
     - CSS selector
   - **Hide layers**: Click 👁️ icon to toggle visibility
   - **Lock layer**: Click 🔒 to select specific element
   - **Copy selector**: Click 📋 to copy CSS selector
   - **Restore all**: Button at bottom unhides all layers

7. **Send to AI Assistant**
   - After locking element, click "📤 Send to AI" in Main tab
   - Structured data sent via WebSocket to bridge (port 5055)
   - Bridge logs full HTML/CSS context to terminal
   - AI assistant (Copilot/Claude/ChatGPT) monitors bridge output
   - AI receives element context for analysis/suggestions

8. **View Inspection History**
   - Switch to Layers tab
   - See last 20 inspected elements
   - Click any layer to re-select it
   - Selector automatically updated

9. **Configure Bridge (Optional)**
   - Switch to Bridge tab
   - Click "Start" to launch WebSocket bridge
   - Status shows: "Bridge running on port 5055"
   - Required for "Send to AI" functionality

10. **Adjust Settings**
    - Switch to Settings tab
    - Adjust overlay opacity (slider)
    - Toggle auto-lock mode
    - Toggle keyboard shortcuts
    - Export logs (JSON/text/CSV)

**Key Features in Workflow**:
- ✅ No page refresh needed
- ✅ Draggable overlay (doesn't block content)
- ✅ Real-time element highlighting
- ✅ Layer visibility toggling (like Photoshop)
- ✅ Direct AI integration via bridge
- ✅ Works completely offline on localhost
- ✅ Keyboard shortcuts for power users

### Quick Start Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Developer on localhost:3000                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Click Extension Icon → Popup Opens                      │
│    Shows: "Inspection Paused" + Quick Features             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Click "🎨 Open GUI Panel" Button                        │
│    (OR press Ctrl+Shift+H)                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Floating Overlay Appears (Top-Left, Draggable)          │
│    Tabs: Main | Layers | Bridge | Settings                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Main Tab → Click "Start Inspecting"                     │
│    Cursor → Crosshair, Hover → Blue Highlight              │
└─────────────────┬───────────────────────────────────────────┘
                  │
      ┌───────────┴───────────┐
      │                       │
      ▼                       ▼
┌─────────────────┐   ┌───────────────────────────────────────┐
│ 5a. Click       │   │ 5b. Open Layer Explorer               │
│     Element     │   │     Click "🎨 Layer Explorer"         │
│                 │   │     Shows z-index stack               │
│ → Locks element │   │     Hide/Lock/Copy layers             │
│ → Shows details │   │     Click layer → Locks it            │
└─────────┬───────┘   └───────────────┬───────────────────────┘
          │                           │
          └───────────┬───────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Element Locked → Full Analysis in Main Tab              │
│    - HTML structure, CSS properties, dimensions             │
│    - Added to Layers tab history                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
      ┌───────────┴───────────┐
      │                       │
      ▼                       ▼
┌─────────────────┐   ┌───────────────────────────────────────┐
│ 7a. Send to AI  │   │ 7b. Use Layer History                 │
│     (Bridge tab │   │     Switch to Layers tab              │
│      must be    │   │     Click any of last 20 elements     │
│      started)   │   │     Re-select previous elements       │
└─────────────────┘   └───────────────────────────────────────┘
```

### Common User Issues & Solutions

**Issue**: "Extension not loaded on this page"
- **Cause**: Page not refreshed after extension install
- **Fix**: Refresh page (F5) or hard reload (Ctrl+F5)

**Issue**: "Not on localhost" warning
- **Cause**: On production URL (extension only works on localhost)
- **Fix**: Popup shows clickable links to active localhost tabs

**Issue**: GUI panel doesn't appear after clicking "Open GUI Panel"
- **Cause 1**: Overlay script not loading (500ms delay may be insufficient)
- **Cause 2**: Content script not injected properly
- **Cause 3**: Message passing race condition between popup → content → overlay
- **Fix**: 
  1. Check browser console for errors
  2. Try clicking "Open GUI Panel" twice (second click after 1s)
  3. Reload extension if issue persists
  4. Hard refresh page (Ctrl+F5)

**Issue**: "Start Inspecting" button does nothing
- **Cause**: `toggleInspecting` message not reaching overlay-gui.js
- **Fix**: Check console for errors, ensure overlay loaded (look for "Overlay GUI loaded" message)

**Issue**: Popup buttons show "Extension not loaded" error
- **Cause**: Content script failed to inject or `chrome.tabs.sendMessage` timing issue
- **Fix**: 
  1. Refresh the page
  2. Check `manifest.json` has correct `matches` for localhost
  3. Verify content script loaded in DevTools → Sources → Content scripts

**Issue**: "Send to AI" button grayed out
- **Cause**: Bridge not started
- **Fix**: Go to Bridge tab → Click "Start" → Wait for "Running" status

**Issue**: Layer Explorer shows no layers
- **Cause**: Cursor not over any elements
- **Fix**: Move mouse over page content, panel updates on `mouseover`

**Issue**: Can't click elements (always miss-click)
- **Cause**: Auto-lock enabled (click anywhere locks element)
- **Fix**: Disable auto-lock checkbox → Use Ctrl/Cmd+Click instead

**Issue**: Overlay loads but disappears immediately
- **Cause**: State not persisting, or panel being removed by cleanup code
- **Fix**: Check `overlayLoaded` flag in content.js console logging

### Popup UI States & Features

**Status Card Colors**:
- 🟢 **Green gradient** = "Inspection Active" (tool is running)
- ⚫ **Red gradient** = "Inspection Paused" (tool is idle)
- ⚠️ **Warning** = Not on localhost (shows localhost tab links)

**Button Actions**:
1. **"🚀 Enable Highlight Tool"** → Basic inspection mode (no GUI panel)
   - Toggles to "⏸ Stop Inspecting" when active
   - Changes from blue to red gradient
2. **"🎨 Open GUI Panel"** → Full overlay interface (recommended)
   - Opens draggable floating panel
   - Auto-closes popup
3. **"📥 Export Logs"** → Download inspection logs
   - Prompts for format (JSON/text/CSV)
   - Includes timestamps, levels, sources, data
4. **"⚙️ Settings & Preferences"** → Shows stats
   - Total logs, errors, last saved time
   - Logs detailed settings to console

**Smart Localhost Detection**:
- Detects: `localhost`, `127.0.0.1`, `::1`, `.local` domains
- Also: `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x` (private networks)
- If not on localhost: Shows clickable list of active localhost tabs
- If no localhost tabs: Offers "Set Up Localhost" button (prompts for port)

**Keyboard Shortcuts Shown**:
- Popup footer displays: `Ctrl + Shift + H` (Mac: `Cmd + Shift + H`)
- Works globally on any localhost page
- Toggles inspection on/off

**Debouncing**:
- All button clicks debounced (400ms) to prevent double-clicks
- UI shows loading state: "⏳ Loading..." during operations
- Prevents race conditions with content script communication

**Error Handling**:
- Shows temporary error messages (3s duration)
- Examples: "Extension not loaded", "Page needs refresh"
- Auto-reverts to previous status after timeout

## Key Development Workflows

### 1. Extension Development (Unpacked Load)
```powershell
# Load extension in browser
# Chrome/Edge: chrome://extensions → Developer mode → Load unpacked
# Opera: opera://extensions → Developer mode → Load unpacked
# Point to your HighlightAssist directory

# Watch for changes (manual reload required)
# Use Ctrl+R on chrome://extensions or use RELOAD-GUIDE.md
```

### 2. Testing Bridge & Service Manager
```powershell
# NEW v2.0 OOP Architecture (recommended)
python service_manager_v2.py

# Test individual components
python test_service_manager.py --component bridge
python test_service_manager.py --component tcp
python test_service_manager.py --component notify

# Legacy service manager (has duplicate code issues - deprecated)
python service-manager.py

# Test bridge directly (development)
python -m uvicorn bridge:app --host=127.0.0.1 --port=5055 --reload

# Verify WebSocket
# Open browser → http://localhost:5055/health
# Expected: {"status": "ok", "active_connections": 0}
```

### 3. Building Standalone Installer
```powershell
# Windows installer (Inno Setup)
.\build-windows-installer.ps1

# Cross-platform installers (requires dependencies)
.\build-installers.ps1

# Output: installers/HighlightAssist-Setup-{platform}.{ext}
```

### 4. Icon Generation
```powershell
# Regenerate extension icons from assets/icon-128.png
npm run build:icons
# Outputs: icons/icon{16,32,48,128}.png
```

## Project-Specific Conventions

### 1. **OOP Python Architecture (NEW v2.0)**
- **Core components in `/core` directory**:
  - `BridgeController`: Subprocess management with timeout/health checks
  - `TCPControlServer`: Selector-based non-blocking TCP server (high performance)
  - `NotificationManager`: Strategy pattern for cross-platform notifications
  - `Notifier` abstract base class with platform-specific implementations
- **Key improvements over v1.0**:
  - 60% less CPU usage (selector vs polling)
  - No duplicate code (v1 had 3 ServiceManager class copies)
  - Proper separation of concerns
  - Unit testable components
- **Legacy `service-manager.py`**: Deprecated monolithic file (keep for reference)

### 2. **Module-Based JavaScript Architecture**
- Modular components in `/modules`: `StateManager.js`, `NativeBridge.js`, `OverlayPanel.js`, etc.
- Use `EventBinder.js` for centralized event delegation
- `StorageService.js` abstracts chrome.storage.local operations
- All modules expose classes/functions, imported via ES6 modules in `overlay-gui.js`

### 3. **Message Passing Patterns**
```javascript
// Extension → Page (content.js → injected.js)
window.postMessage({ type: 'HIGHLIGHT_ASSIST_RESPONSE', ... }, '*');

// Page → Extension → Native (overlay-gui.js → content.js → background.js)
window.postMessage({ type: 'HIGHLIGHT_ASSIST_NATIVE_REQUEST', command: 'start' }, '*');

// Extension → Background service worker
chrome.runtime.sendMessage({ action: 'bridgeNativeCommand', ... });
```

### 4. **Logging & Error Handling**
- Use `logger.js` for structured logging: `logger.info(msg, context, source)`
- Logs stored in: `%LOCALAPPDATA%\HighlightAssist\logs\service-manager.log`
- `error-handler.js` provides global error capture with `logError(error, context, source)`
- Export logs via popup.html "📥 Export Logs" button

### 5. **Layer Inspector Implementation**
- `sampleElementsAtPoint(x, y)` uses recursive `elementFromPoint()` with `pointerEvents: 'none'`
- Hidden layers tracked in `Map()` for O(1) visibility restoration
- Real-time refresh on `mouseover` when panel is open
- Background preview extracts CSS gradients/colors for visual thumbnails

### 6. **Cross-Platform Service Management (v2.0)**
```python
# NEW: Strategy pattern with fallback chain
class NotificationManager:
    def __init__(self):
        self._notifiers = [
            WindowsNotifier(),  # win10toast
            MacOSNotifier(),    # pync  
            LinuxNotifier(),    # notify-send
            LoggerNotifier()    # fallback
        ]
    
    def notify(self, title, msg):
        for notifier in self._notifiers:
            if notifier.notify(title, msg):
                return  # First success wins

# OLD (deprecated): Global flags with try/except
# HAS_TRAY, HAS_PLYER, HAS_WIN10TOAST, etc.
```

## Integration Points

### 1. **Native Messaging (Optional)**
- Native host manifests in `/native_host/manifests/` for Chrome/Firefox
- `bridge_host.py` handles stdio-based JSON-RPC communication
- Currently **unused** (extension uses direct TCP/WebSocket instead)

### 2. **External Dependencies**
- **Python**: FastAPI, Uvicorn, WebSockets (bridge)
- **Python Optional**: pystray, PIL, win10toast, notify2, pync (service manager)
- **Node.js**: Sharp (icon generation only - dev dependency)

### 3. **AI Assistant Communication**
- Extension sends structured element context via WebSocket to bridge
- Bridge logs AI requests with full HTML/CSS context to console
- AI assistants monitor bridge terminal for element analysis requests
- See `bridge.py` → `message_type == "ai_request"` handler

## Common Tasks

### 1. Adding a New Overlay Feature
- Create module in `/modules` (e.g., `FeatureName.js`)
- Export class/function from module
- Import in `overlay-gui.js`: `import FeatureName from './modules/FeatureName.js'`
- Add UI in `OverlayPanel.js` render methods
- Wire events in `EventBinder.js` or feature module

### 2. Adding a New Bridge Command
- Add handler in `bridge.py` → `websocket_endpoint` message switch
- Define JSON schema: `{"type": "new_command", "data": {...}}`
- Return response: `await manager.send_personal_message({...}, websocket)`
- Update `NativeBridge.js` to call new command

### 3. Cross-Platform Installer Modifications
- Windows: Edit `installer-config.iss` (Inno Setup)
- Linux: Edit `install-linux.sh` (systemd service template)
- macOS: Edit `install-macos.sh` (LaunchAgent plist)
- Test on target platform before release

### 4. Updating Extension for Store Submission
- Edit `manifest.json` version, description, icons
- Update `store-assets/STORE_LISTING.md` for submission copy
- Generate comparison graphics: Open `store-assets/comparison-graphics.html`
- Package: Create `.zip` excluding `/node_modules`, `/dist`, `/build`

## Security & Best Practices

### 1. **Localhost-Only Operation**
```json
// manifest.json - restricts to local dev servers
"host_permissions": [
  "http://localhost/*",
  "http://127.0.0.1/*",
  "http://*.local/*"
]
```

### 2. **CSP-Safe Injection**
- Never use `eval()` or inline scripts
- Inject via `chrome.scripting.executeScript` or web_accessible_resources
- Message passing for cross-context communication

### 3. **Service Manager Defensive Coding**
- All optional imports wrapped in try/except
- Graceful degradation when GUI libs unavailable
- Log all exceptions to rotating file handler (1MB, 3 backups)

## Documentation Structure

- **Root README.md**: Quick start for end users
- **docs/INSTALLATION.md**: Detailed setup per platform
- **docs/TROUBLESHOOTING.md**: Common issues and fixes
- **docs/FEATURES-v3.3.md**: Complete feature changelog
- **LAUNCH_CHECKLIST.md**: Marketing/release steps
- **MARKETING.md**: Social media copy templates

## Marketing & Distribution

**Current Status**: Open source, preparing for browser store submission

**Target Platforms**: Chrome Web Store, Opera Addons, Firefox Add-ons, Edge Add-ons

**Key Differentiators**:
- 80% faster than DevTools for Vite projects (documented in WHY_NOT_DEVTOOLS.md)
- Photoshop-style layer inspector
- Direct AI assistant integration
- Cross-platform auto-start service

## Known Issues & Debugging

### 1. **Popup → Overlay Communication Failures**

**Problem**: Overlay doesn't appear when clicking "Open GUI Panel" in popup.

**Root Causes Identified**:
```javascript
// content.js - Race condition in message handling
if (request.action === 'showGui') {
  if (!overlayLoaded) {
    loadOverlayGui();
    // 500ms delay may be too short for slow systems
    setTimeout(() => {
      window.postMessage({ type: 'HIGHLIGHT_ASSIST', action: 'showGui' }, '*');
    }, 500);
  } else {
    window.postMessage({ type: 'HIGHLIGHT_ASSIST', action: 'showGui' }, '*');
  }
  
  // pendingResponse callback pattern - can timeout before overlay responds
  pendingResponse = (data) => {
    sendResponse({ success: true, panelShown: data.panelShown });
  };
  
  // 1000ms fallback timeout - fires even if overlay still loading
  setTimeout(() => {
    if (pendingResponse) {
      sendResponse({ success: false, error: 'Timeout waiting for overlay' });
      pendingResponse = null;
    }
  }, 1000);
  return true; // Async response
}
```

**Issues**:
1. **overlayLoaded flag synchronization**: Set in `script.onload`, but overlay-gui.js may not be ready to receive messages
2. **Fixed delays**: 500ms for script load, 1000ms for callback timeout - not adaptive to system performance
3. **No retry mechanism**: If message sent before overlay event listeners registered, it's lost forever
4. **No confirmation**: pendingResponse can timeout without knowing if overlay actually loaded

**Debugging Steps**:
```javascript
// Add to content.js for debugging
console.log('[DEBUG] overlayLoaded:', overlayLoaded);
console.log('[DEBUG] Sending message to overlay:', request.action);

// Add to overlay-gui.js initialization
console.log('[OVERLAY] Event listeners registered, ready to receive messages');
window.postMessage({ type: 'HIGHLIGHT_ASSIST_READY' }, '*');

// Add to content.js to catch ready signal
if (data.type === 'HIGHLIGHT_ASSIST_READY') {
  console.log('[DEBUG] Overlay confirmed ready');
  overlayLoaded = true; // More reliable flag setting
}
```

**Potential Fix**:
```javascript
// Replace fixed timeouts with handshake pattern
let overlayReady = false;
let messageQueue = [];

window.addEventListener('message', (event) => {
  if (event.data.type === 'HIGHLIGHT_ASSIST_READY') {
    overlayReady = true;
    overlayLoaded = true;
    
    // Flush queued messages
    messageQueue.forEach(msg => {
      window.postMessage(msg, '*');
    });
    messageQueue = [];
  }
});

function sendToOverlay(message) {
  if (!overlayReady) {
    messageQueue.push(message);
    if (!overlayLoaded) {
      loadOverlayGui();
    }
  } else {
    window.postMessage(message, '*');
  }
}
```

### 2. **Script Injection Timing Issues**

**Problem**: `overlay-gui.js` injected via dynamic `<script>` tag, but execution timing unpredictable.

**Current Implementation**:
```javascript
function loadOverlayGui() {
  if (overlayLoaded) return;
  
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('overlay-gui.js');
  
  script.onload = function() {
    overlayLoaded = true; // Flag set when script loaded, not when initialized
    this.remove();
  };
  
  (document.head || document.documentElement).appendChild(script);
}
```

**Issues**:
- `script.onload` fires when file loaded, **not** when overlay initialized
- Overlay initialization may be delayed by DOM parsing, other scripts, etc.
- Removing script element after load prevents debugging in DevTools

**Better Approach**:
```javascript
function loadOverlayGui() {
  if (overlayLoaded) return;
  
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('overlay-gui.js');
  script.dataset.highlightAssist = 'overlay'; // Mark for debugging
  
  script.onerror = function() {
    console.error('[HighlightAssist] Failed to load overlay-gui.js');
    overlayLoaded = false;
  };
  
  // Don't remove script - allows DevTools inspection
  (document.head || document.documentElement).appendChild(script);
  
  // Wait for overlay to announce readiness via message
  // Don't set overlayLoaded here
}
```

### 3. **Popup Debouncing Side Effects**

**Problem**: All buttons debounced with 400ms delay, can cause confusion if user clicks rapidly.

**Current Implementation**:
```javascript
// popup.js - Debounce wrapper
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Applied to all buttons
const debouncedToggle = debounce(toggleInspecting, 400);
const debouncedShowGui = debounce(showGui, 400);
```

**Issues**:
- User clicks "Open GUI Panel" twice quickly → only second click executes (400ms after last click)
- No visual feedback during debounce period
- Can make UI feel sluggish

**Improvement**:
```javascript
// Throttle instead of debounce - executes first click immediately
function throttle(func, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

// Or add loading state during debounce
function debounceWithFeedback(func, delay, button) {
  let timeout;
  return function(...args) {
    button.disabled = true;
    button.textContent = '⏳ Loading...';
    
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
      button.disabled = false;
      button.textContent = button.dataset.originalText;
    }, delay);
  };
}
```

### 4. **Auto-Load Disabled State Confusion**

**Problem**: Documentation says overlay auto-loads, but code has `autoLoadOverlay = false` hardcoded.

**Current Code**:
```javascript
// content.js - Auto-load disabled
const autoLoadOverlay = false; // Overlay no longer auto-loads

if (autoLoadOverlay) {
  window.addEventListener('DOMContentLoaded', () => {
    loadOverlayGui();
  });
}
```

**Result**: User must manually click "Open GUI Panel" every time, but documentation implies it should auto-load.

**Decision Needed**:
- **Option A**: Enable auto-load (change to `true`), update popup UI to show "Panel already loaded"
- **Option B**: Keep disabled, update all documentation to reflect manual-only loading
- **Option C**: Make it a user preference in Settings tab

### 5. **Service Manager v2.0 Not Wired to Extension**

**Problem**: New OOP service manager (`service_manager_v2.py`) not referenced in extension code or installers.

**Current State**:
- `background.js` has no native messaging to service manager
- Installers still reference old `service-manager.py`
- PyInstaller spec needs updating for v2.0 structure

**Files Needing Updates**:
```plaintext
❌ build-windows-installer.ps1 → Update PyInstaller command
❌ installer-config.iss → Point to service_manager_v2.exe
❌ install-linux.sh → Update systemd service ExecStart path
❌ install-macos.sh → Update LaunchAgent ProgramArguments
❌ pyinstaller.spec → Add /core modules to analysis
```

**Migration Checklist**:
1. Update PyInstaller spec to include `/core` directory
2. Test standalone .exe generation
3. Update all installer scripts
4. Update README.md installation instructions
5. Add migration guide for existing users

**Development Philosophy**

**This project is**:
- A standalone browser extension for localhost development
- Built for AI-assisted workflows from the ground up

**Design Principles**:
- **Progressive enhancement**: Works without bridge/service (limited features)
- **Defensive coding**: Graceful degradation when dependencies missing
- **Developer-first UX**: Keyboard shortcuts, minimal clicks, visual feedback
- **AI-native**: Built for AI-assisted workflows from the ground up

Report unclear sections or suggest improvements for iterative refinement.
