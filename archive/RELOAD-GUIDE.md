# 🔄 Extension Reload Guide - CRITICAL STEPS

## ⚠️ IMPORTANT: You're Running the OLD Version!

The new features won't appear until you properly reload the extension.

## Step-by-Step Reload Process

### 1. Go to Extensions Page
```
opera://extensions
```
OR
```
chrome://extensions (if using Chrome)
```

### 2. Find "Highlight Assist" Extension

Look for the card that says:
- **Name**: Highlight Assist - Visual UI Debugger
- **Version**: 1.0.0

### 3. COMPLETELY REMOVE Old Extension

**CRITICAL**: Just clicking "Reload" is NOT enough!

Click the **"Remove"** button (trash icon) to completely uninstall the old version.

### 4. Enable Developer Mode

Toggle the **"Developer mode"** switch in the top-right corner (if not already on).

### 5. Load New Extension

Click **"Load unpacked"** button

Navigate to:
```
D:\Projects\LawHub\LawFirmProject\browser-extension
```

Select this folder and click **"Select Folder"**

### 6. Verify New Version Loaded

Check that you see these files in the extension:
- ✅ logger.js
- ✅ error-handler.js
- ✅ LOGGING.md
- ✅ TROUBLESHOOTING.md

If you don't see these, you loaded the wrong folder!

### 7. Refresh Your Localhost Page

**CRITICAL**: Close and reopen the tab, or hard refresh:
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### 8. Click Extension Icon

You should now see **4 BUTTONS**:
1. 🚀 Enable Highlight Tool / ⏸ Stop Inspecting
2. 🎨 **Open GUI Panel** ← NEW!
3. 📥 **Export Logs** ← NEW!
4. ⚙️ Settings & Preferences

### 9. Test It Works

1. Click "🎨 Open GUI Panel"
2. You should see the overlay appear on the page
3. Click "▶ Start Inspecting" 
4. Hover over page elements - they should highlight

---

## 🐛 Still Not Working? Run Diagnostics

### Check 1: Verify Extension Loaded
Open browser console (F12) and run:
```javascript
console.log('Testing extension...');
chrome.runtime.sendMessage({ action: 'ping' }, response => {
  console.log('Extension response:', response);
});
```

### Check 2: Verify Content Script Loaded
Look for this in console:
```
[Highlight Assist] Content script loaded
```

If you DON'T see this, the extension isn't injecting properly.

### Check 3: Verify Logger Loaded
Run in console:
```javascript
if (typeof logger !== 'undefined') {
  console.log('✅ Logger is loaded');
  logger.info('Test log', {}, 'manual-test');
} else {
  console.log('❌ Logger NOT loaded - extension not working');
}
```

### Check 4: Export Current Logs
In console:
```javascript
chrome.storage.local.get(['highlightAssist_logs'], (r) => {
  console.log('Logs found:', r.highlightAssist_logs?.length || 0);
  console.table(r.highlightAssist_logs?.slice(-10));
});
```

---

## 🚨 Common Mistakes

### ❌ WRONG: Just clicking "Reload" button
This doesn't always clear old cached scripts.

### ✅ RIGHT: Remove completely, then re-add
Always remove the old extension first.

---

### ❌ WRONG: Loading the wrong folder
Don't load:
- `D:\Projects\LawHub\HighlightAssist` ← OLD version
- `D:\Projects\LawHub\LawFirmProject` ← Too high up

### ✅ RIGHT: Load the exact folder
```
D:\Projects\LawHub\LawFirmProject\browser-extension
```

---

### ❌ WRONG: Not refreshing the page
Old scripts stay in memory until you refresh.

### ✅ RIGHT: Hard refresh the page
`Ctrl + Shift + R` after reloading extension.

---

## 📋 Verification Checklist

After reload, verify:

- [ ] Extension shows 4 buttons in popup (not 3)
- [ ] "Open GUI Panel" button is visible
- [ ] "Export Logs" button is visible
- [ ] Console shows: `[Highlight Assist] Content script loaded`
- [ ] `typeof logger !== 'undefined'` returns true in console
- [ ] Clicking "Open GUI Panel" shows overlay on page
- [ ] Clicking "Start Inspecting" enables element hover

---

## 🔍 If Still Not Working

Run this diagnostic script in console:

```javascript
console.log('=== DIAGNOSTIC REPORT ===');

// Check logger
console.log('Logger available:', typeof logger !== 'undefined');

// Check error handler
console.log('Error handler available:', typeof errorHandler !== 'undefined');

// Check chrome extension API
console.log('Chrome runtime available:', typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined');

// Check storage
chrome.storage.local.get(null, (data) => {
  console.log('Storage keys:', Object.keys(data));
  console.log('Logs count:', data.highlightAssist_logs?.length || 0);
  console.log('Critical errors:', data.highlightAssist_criticalErrors?.length || 0);
});

// Check for overlay
console.log('Overlay on page:', !!document.querySelector('[data-ha-ui="control-panel"]'));

// Check manifest
fetch(chrome.runtime.getURL('manifest.json'))
  .then(r => r.json())
  .then(m => {
    console.log('Extension version:', m.version);
    console.log('Web accessible resources:', m.web_accessible_resources);
    console.log('Content scripts:', m.content_scripts);
  });
```

Copy the entire output and send it to me!

---

## 🎯 Expected Console Output on Fresh Load

When you refresh localhost:3000, you should see:

```
[Highlight Assist] Content script loaded
[INFO] content Logger initialized
[INFO] content Content script loaded
[INFO] content Localhost detected, auto-loading overlay
[INFO] content Loading overlay GUI
[SUCCESS] content Overlay GUI loaded successfully
```

If you see this, everything is working! 🎉

---

## 📞 Quick Help

If nothing works after following all steps:

1. Export logs: Click "📥 Export Logs" (if button exists)
2. OR run: `chrome.storage.local.get(null, d => console.log(JSON.stringify(d)))`
3. Copy the output
4. Send it to me with the exact error messages

This will show me exactly what's happening! 🚀
