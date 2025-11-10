# Quick Troubleshooting Guide

## When Something Goes Wrong

### Step 1: Check Extension Logs
```javascript
// Open browser console (F12) on any localhost page
// Copy and paste this:

chrome.storage.local.get(['highlightAssist_logs', 'highlightAssist_criticalErrors'], (result) => {
  const logs = result.highlightAssist_logs || [];
  const errors = result.highlightAssist_criticalErrors || [];
  
  console.log('📊 Total Logs:', logs.length);
  console.log('❌ Critical Errors:', errors.length);
  
  // Show recent errors
  const recentErrors = logs.filter(l => l.level === 'ERROR').slice(-10);
  console.log('🔴 Last 10 Errors:');
  console.table(recentErrors);
  
  // Show critical errors
  console.log('💥 Critical Errors:');
  console.table(errors);
  
  // Show by source
  const bySource = {};
  logs.forEach(l => {
    bySource[l.source] = (bySource[l.source] || 0) + 1;
  });
  console.log('📍 Logs by Source:', bySource);
});
```

### Step 2: Export Full Logs
1. Click HighlightAssist extension icon
2. Click "📥 Export Logs"
3. Type: **json** (or text/csv)
4. Check your Downloads folder for the file

### Step 3: Share Logs
Send the exported JSON file for analysis. It contains:
- All errors with stack traces
- Timestamps for each event
- Which component had the issue
- Full context data

## Common Issues & Quick Fixes

### Issue: "Extension Not Loaded"
**Check:** 
```javascript
chrome.storage.local.get(['highlightAssist_logs'], (r) => {
  const contentLogs = r.highlightAssist_logs.filter(l => l.source === 'content');
  console.table(contentLogs.slice(-5));
});
```

**Fix:**
1. Refresh the page (F5)
2. Check if URL is localhost
3. Reload extension in opera://extensions

---

### Issue: "Start Inspecting Not Working"
**Check:**
```javascript
chrome.storage.local.get(['highlightAssist_logs'], (r) => {
  const overlayLogs = r.highlightAssist_logs.filter(l => l.source === 'overlay');
  console.table(overlayLogs.slice(-5));
});
```

**Fix:**
1. Click "Open GUI Panel" first
2. Then click "Start Inspecting"
3. Check console for errors

---

### Issue: "GUI Panel Not Showing"
**Check:**
```javascript
// Check if overlay loaded
chrome.storage.local.get(['highlightAssist_logs'], (r) => {
  const loadLogs = r.highlightAssist_logs.filter(l => 
    l.message.includes('overlay') || l.message.includes('GUI')
  );
  console.table(loadLogs);
});
```

**Fix:**
1. Press F12 to open DevTools
2. Look for `[data-ha-ui="control-panel"]` element
3. If exists, check CSS display property
4. If not exists, overlay-gui.js didn't load

---

### Issue: "Bridge Not Connecting"
**Check:**
```javascript
chrome.storage.local.get(['highlightAssist_logs'], (r) => {
  const bridgeLogs = r.highlightAssist_logs.filter(l => 
    l.message.includes('bridge') || l.message.includes('WebSocket')
  );
  console.table(bridgeLogs.slice(-10));
});
```

**Fix:**
1. Ensure WebSocket bridge is running on port 5055
2. Check if handshake completed
3. Look for ping/pong messages

---

## Emergency Debug Commands

### See EVERYTHING that happened in last 5 minutes
```javascript
chrome.storage.local.get(['highlightAssist_logs'], (r) => {
  const fiveMinAgo = new Date(Date.now() - 5*60*1000);
  const recent = r.highlightAssist_logs.filter(l => 
    new Date(l.timestamp) >= fiveMinAgo
  );
  console.log(`Found ${recent.length} logs in last 5 minutes`);
  console.table(recent);
});
```

### Find specific error message
```javascript
chrome.storage.local.get(['highlightAssist_logs'], (r) => {
  const searchTerm = 'failed'; // Change this
  const found = r.highlightAssist_logs.filter(l => 
    l.message.toLowerCase().includes(searchTerm.toLowerCase())
  );
  console.log(`Found ${found.length} logs matching "${searchTerm}"`);
  console.table(found);
});
```

### Clear everything and start fresh
```javascript
chrome.storage.local.remove([
  'highlightAssist_logs',
  'highlightAssist_criticalErrors',
  'highlightAssist_lastSaved'
], () => {
  console.log('✅ All logs cleared. Refresh page to start fresh.');
});
```

### Export current session only
```javascript
chrome.storage.local.get(['highlightAssist_logs'], (r) => {
  const logs = r.highlightAssist_logs || [];
  
  // Get current session ID (from most recent log)
  const sessionId = logs[logs.length - 1]?.sessionId;
  const sessionLogs = logs.filter(l => l.sessionId === sessionId);
  
  console.log(`Session ${sessionId}: ${sessionLogs.length} logs`);
  console.table(sessionLogs);
  
  // Download as JSON
  const content = JSON.stringify(sessionLogs, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `session-${sessionId}.json`;
  a.click();
});
```

## Log File Locations

After export, logs are in:
- **Windows**: `C:\Users\[YourName]\Downloads\highlightassist-logs-*.json`
- **Mac**: `~/Downloads/highlightassist-logs-*.json`
- **Linux**: `~/Downloads/highlightassist-logs-*.json`

## What to Include in Bug Reports

1. **Exported log file** (JSON format)
2. **What you were trying to do**
3. **What actually happened**
4. **Timestamp** of when it occurred
5. **Browser version** (Opera GX version number)

## Performance Impact

The logging system:
- ✅ Minimal overhead (<1ms per log)
- ✅ Auto-rotates (keeps only 500 entries)
- ✅ Throttled saves (batches writes)
- ✅ Async storage (doesn't block UI)
- ✅ Color-coded console output

## Privacy

- 🔒 All logs stored **locally only**
- 🔒 No network transmission
- 🔒 You control export/deletion
- 🔒 Only logs localhost URLs

---

**Remember:** Logs are your friend! Export them immediately when something goes wrong, and we can diagnose issues in seconds instead of hours of back-and-forth. 🚀
