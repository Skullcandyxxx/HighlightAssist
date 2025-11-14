# Extension Integration Testing Guide

## Test Environment Setup

### ✅ Prerequisites Verified
- [x] Service manager running (bridge on port 5055)
- [x] Test server running (http://127.0.0.1:3000)
- [x] Test page created (test-page.html with 7 test sections)
- [x] Extension loaded in browser

### Test Page URL
```
http://127.0.0.1:3000/test-page.html
```

## Manual Testing Checklist

### Phase 1: Basic Overlay Loading

**1.1 Open Extension Popup**
- [ ] Click HighlightAssist extension icon in toolbar
- [ ] Popup shows "Inspection Paused" status
- [ ] Two main buttons visible: "🚀 Enable Highlight Tool" and "🎨 Open GUI Panel"

**1.2 Load OOP Overlay**
- [ ] Click "🎨 Open GUI Panel" button
- [ ] Overlay panel appears in top-left (draggable)
- [ ] Four tabs visible: Main | Layers | Bridge | Settings
- [ ] Panel has purple gradient header with "HighlightAssist" title

### Phase 2: Main Tab - Core Features

**2.1 Start Inspection**
- [ ] Click "🚀 Start Inspecting" button
- [ ] Button changes to "⏸ Stop Inspecting"
- [ ] Cursor changes to crosshair when hovering over page elements

**2.2 Element Highlighting**
- [ ] Hover over "Primary Button" → blue/purple highlight appears
- [ ] Highlight follows cursor smoothly
- [ ] Highlight shows correct element boundaries

**2.3 Element Locking**
- [ ] Click on "Primary Button" to lock it
- [ ] Element info display updates with:
  - Tag name: `button`
  - CSS selector (e.g., `button.test-button.btn-primary`)
  - Text content: "Primary Button"

**2.4 Copy Selector Button (NEW FEATURE)**
- [ ] "📋 Copy Selector" button is **disabled** when no element selected
- [ ] After locking element, button becomes **enabled** (blue background)
- [ ] Click "Copy Selector"
- [ ] Open browser console (F12)
- [ ] Paste selector (Ctrl+V)
- [ ] Should see CSS selector like: `button.test-button.btn-primary`
- [ ] Test in console: `document.querySelector('[PASTED_SELECTOR]')`
- [ ] Should return the button element

**2.5 Copy XPath Button (NEW FEATURE)**
- [ ] "🎯 Copy XPath" button is **disabled** when no element selected
- [ ] After locking element, button becomes **enabled** (purple background)
- [ ] Click "Copy XPath"
- [ ] Open browser console
- [ ] Paste XPath (Ctrl+V)
- [ ] Should see XPath like: `/html/body/div/div[2]/div/button[1]`
- [ ] For element with ID (#unique-button-123), XPath should be: `//*[@id="unique-button-123"]`
- [ ] Test in console: `document.evaluate('[PASTED_XPATH]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue`
- [ ] Should return the element

**2.6 Send to AI Button**
- [ ] Button is **disabled** when no element selected
- [ ] After locking element, button becomes **enabled** (orange gradient)
- [ ] Click "📤 Send to AI"
- [ ] Check service manager terminal for bridge logs
- [ ] Should see output like:
   ```
   🤖 AI Command: No command
   📋 Element Context:
      Tag: button
      Classes: test-button btn-primary
      ID: btn-primary
      Text: Primary Button...
   ```

### Phase 3: Settings Tab - Customization

**3.1 Navigate to Settings**
- [ ] Click "Settings" tab
- [ ] Settings content appears

**3.2 Auto-lock Mode**
- [ ] "Auto-lock on click" checkbox is visible
- [ ] Toggle checkbox on/off
- [ ] When ON: Click element immediately locks it
- [ ] When OFF: Need Ctrl+Click to lock

**3.3 Keyboard Shortcuts**
- [ ] "Enable keyboard shortcuts" checkbox visible (default: checked)
- [ ] Toggle off → Test `Ctrl+Shift+H` (should not toggle inspection)
- [ ] Toggle on → Test `Ctrl+Shift+H` (should toggle inspection)

**3.4 Overlay Opacity**
- [ ] "Overlay Opacity" slider visible (range: 0.5-1.0)
- [ ] Drag slider left → Overlay panel becomes more transparent
- [ ] Drag slider right → Overlay panel becomes opaque

**3.5 Highlight Color Picker (NEW FEATURE)**
- [ ] "Highlight Color" label visible
- [ ] Color input shows default color: #8b5cf6 (purple)
- [ ] Click color picker
- [ ] Browser color picker dialog opens
- [ ] Select red color: #ef4444
- [ ] Close color picker
- [ ] Hover over elements → Highlight should now be **red** (not purple)
- [ ] Border color and background tint should both be red

**3.6 Border Width Slider (NEW FEATURE)**
- [ ] "Border Width" label visible with value display: "2px"
- [ ] Slider shows value: 2 (default)
- [ ] Drag slider to 1 → Display updates to "1px"
- [ ] Hover over element → Border should be **very thin**
- [ ] Drag slider to 8 → Display updates to "8px"
- [ ] Hover over element → Border should be **very thick**
- [ ] Drag slider to 4 → Display updates to "4px"
- [ ] Border width should be visibly medium

**3.7 Settings Persistence**
- [ ] Change highlight color to #10b981 (green)
- [ ] Change border width to 6px
- [ ] Close overlay panel (click X button)
- [ ] Reopen panel (click "Open GUI Panel" in popup)
- [ ] Go to Settings tab
- [ ] Color picker should show #10b981 (green)
- [ ] Border width should show 6px
- [ ] Hover over elements → Highlight should be green with thick border

### Phase 4: Bridge Tab - WebSocket Communication

**4.1 Bridge Connection**
- [ ] Click "Bridge" tab
- [ ] "🔌 Connect to Bridge" button visible (blue gradient)
- [ ] Status shows "⚫ Bridge disconnected"
- [ ] Click "Connect to Bridge"
- [ ] Button changes to "🔌 Disconnect" (red gradient)
- [ ] Status changes to "🟢 Bridge connected"

**4.2 Send to AI via Bridge**
- [ ] Go to Main tab
- [ ] Inspect and lock "Send This to AI" button
- [ ] Click "📤 Send to AI"
- [ ] Check service manager terminal
- [ ] Should see AI request logged with full element context:
   ```
   🤖 AI Command: No command
   📋 Element Context:
      Tag: button
      Classes: test-button btn-info
      ID: bridge-test-button
      Text: Send This to AI
      Attributes: {...}
   ⏰ Timestamp: 2025-11-13T...
   ```

**4.3 Bridge Disconnection**
- [ ] Go to Bridge tab
- [ ] Click "Disconnect"
- [ ] Button changes back to "Connect to Bridge"
- [ ] Status changes to "⚫ Bridge disconnected"
- [ ] Try "Send to AI" in Main tab
- [ ] Should see error: "Bridge not connected"

### Phase 5: Layers Tab - History & Inspector

**5.1 Inspection History**
- [ ] Click "Layers" tab
- [ ] Inspect multiple elements (buttons, divs, spans)
- [ ] History list shows last inspected elements
- [ ] Each entry shows: Tag name, selector snippet, timestamp
- [ ] Maximum 20 entries visible

**5.2 Re-select from History**
- [ ] Click any entry in history list
- [ ] Element should be re-selected in Main tab
- [ ] Selector should update
- [ ] Copy Selector/XPath buttons should work

**5.3 Layer Explorer (Photoshop-style)**
- [ ] Go to Main tab
- [ ] Click "🎨 Layer Explorer" button (if available)
- [ ] Floating panel shows z-index stack at cursor position
- [ ] Each layer shows: tag, dimensions, background preview
- [ ] Click 👁️ icon → Layer becomes hidden
- [ ] Click 🔒 icon → Layer becomes locked/selected
- [ ] Click "Restore All" → All layers become visible again

### Phase 6: Edge Cases & Error Handling

**6.1 Nested Elements**
- [ ] Inspect deeply nested element (e.g., "Deep Nested Span 2")
- [ ] Selector should be accurate
- [ ] XPath should show full path with indices: `/html/body/div/div[3]/div[2]/div/div/span`

**6.2 Elements with Multiple Classes**
- [ ] Inspect "Text with multiple classes"
- [ ] Selector should include multiple classes
- [ ] Test selector in console → Should uniquely identify element

**6.3 Elements with IDs**
- [ ] Inspect "Button with Unique ID" (#unique-button-123)
- [ ] Selector should be: `#unique-button-123`
- [ ] XPath should be: `//*[@id="unique-button-123"]` (shortcut form)

**6.4 Framework Detection**
- [ ] Inspect any element on test page
- [ ] Element info should show: "Vanilla JS" (no framework)
- [ ] On React/Vue/Angular pages, should detect framework correctly

**6.5 Rapid Element Switching**
- [ ] Rapidly hover over many elements
- [ ] Highlight should follow smoothly without lag
- [ ] No visual glitches or flickering

**6.6 Panel Dragging**
- [ ] Click and drag panel header
- [ ] Panel should move smoothly
- [ ] Panel should stay within viewport boundaries

### Phase 7: Performance Testing

**7.1 Overlay Load Time**
- [ ] Measure time from "Open GUI Panel" click to panel visible
- [ ] Should be < 500ms
- [ ] Console should show: "Overlay GUI loaded"

**7.2 Inspection Responsiveness**
- [ ] Hover over 10+ elements rapidly
- [ ] Highlight should appear instantly (< 50ms)
- [ ] No lag or stuttering

**7.3 Memory Usage**
- [ ] Open browser DevTools → Performance tab
- [ ] Start inspection
- [ ] Hover over 50+ elements
- [ ] Stop inspection
- [ ] Memory should not continuously increase (no leaks)

**7.4 Bridge Communication Speed**
- [ ] Send element to AI
- [ ] Check timestamp in bridge logs
- [ ] Should be < 100ms from click to bridge receiving message

## Test Results Template

```markdown
## Test Results - [Date]

**Environment:**
- Browser: [Chrome/Edge/Opera] [Version]
- OS: Windows 11
- Service Manager: Running
- Bridge: Connected on port 5055

**Phase 1: Basic Overlay Loading**
- [✅/❌] Popup opens correctly
- [✅/❌] OOP overlay loads
- [✅/❌] Four tabs visible

**Phase 2: Main Tab**
- [✅/❌] Start/Stop inspection works
- [✅/❌] Element highlighting works
- [✅/❌] Element locking works
- [✅/❌] Copy Selector button (NEW)
- [✅/❌] Copy XPath button (NEW)
- [✅/❌] Send to AI button

**Phase 3: Settings Tab**
- [✅/❌] Auto-lock toggle
- [✅/❌] Keyboard shortcuts toggle
- [✅/❌] Overlay opacity slider
- [✅/❌] Highlight color picker (NEW)
- [✅/❌] Border width slider (NEW)
- [✅/❌] Settings persist

**Phase 4: Bridge Tab**
- [✅/❌] Connect/Disconnect works
- [✅/❌] Status updates correctly
- [✅/❌] Send to AI logs in terminal

**Phase 5: Layers Tab**
- [✅/❌] History displays
- [✅/❌] Re-select from history works

**Phase 6: Edge Cases**
- [✅/❌] Nested elements
- [✅/❌] Multiple classes
- [✅/❌] Elements with IDs
- [✅/❌] Framework detection

**Phase 7: Performance**
- Overlay load time: [X]ms
- Highlight response time: [X]ms
- Memory usage: Stable / Growing

**Issues Found:**
1. [Description]
2. [Description]

**Overall Status:** ✅ PASS / ❌ FAIL
```

## Automated Testing (Future)

For future automation, consider:
1. Puppeteer/Playwright tests for overlay loading
2. WebSocket mock server for bridge testing
3. Visual regression testing for highlight appearance
4. Performance benchmarks with Lighthouse

## Known Issues & Workarounds

1. **Issue:** WPARAM TypeError in service manager logs
   - **Impact:** None (cosmetic tray icon warning)
   - **Workaround:** Ignore

2. **Issue:** Dashboard port conflict (10048)
   - **Impact:** Dashboard falls back to port 10000-10009
   - **Workaround:** Use `.\cleanup.ps1` before starting

3. **Issue:** Clipboard API requires HTTPS or localhost
   - **Impact:** Copy buttons only work on localhost
   - **Workaround:** Test on localhost (already doing this)

## Success Criteria

### Minimum Viable (MVP)
- ✅ Overlay loads without errors
- ✅ Element inspection works
- ✅ Copy Selector copies to clipboard
- ✅ Copy XPath copies to clipboard
- ✅ Settings persist
- ✅ Bridge receives AI requests

### Full Feature Complete
- ✅ All 4 new features work (Copy Selector, XPath, Color Picker, Border Width)
- ✅ All settings save/load correctly
- ✅ Bridge communication verified in logs
- ✅ No console errors
- ✅ Performance < 500ms load time
- ✅ Memory stable (no leaks)

---

**Next Steps After Testing:**
1. Document any bugs found
2. Fix critical issues
3. Rebuild frozen executable with fixes
4. Create release notes for v3.4
5. Update documentation
6. Commit changes
