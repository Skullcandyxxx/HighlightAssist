// Injected script - runs in page context with access to React/Vite modules
(function() {
  'use strict';

  console.log('[Highlight Assist] Injected script running');

  // Check if already loaded
  if (window.__HIGHLIGHT_ASSIST_LOADED__) {
    console.log('[Highlight Assist] Already loaded, skipping');
    return;
  }
  window.__HIGHLIGHT_ASSIST_LOADED__ = true;

  // Dynamically import the highlight assist module from Vite dev server
  async function loadHighlightAssist() {
    try {
      // Try common Vite ports
      const ports = [5173, 3000, 3001, 5174];
      let loaded = false;

      for (const port of ports) {
        try {
          const moduleUrl = `http://localhost:${port}/src/highlight/HighlightAssistProvider.jsx`;
          
          // Test if server is running
          const response = await fetch(moduleUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log(`[Highlight Assist] Found Vite server on port ${port}`);
            
            // Import the module
            const module = await import(moduleUrl);
            
            // Initialize the tool
            if (module.initHighlightAssist) {
              module.initHighlightAssist();
              loaded = true;
              console.log('[Highlight Assist] Tool initialized successfully');
            } else {
              console.warn('[Highlight Assist] Module loaded but no init function found');
            }
            break;
          }
        } catch (e) {
          // Try next port
          continue;
        }
      }

      if (!loaded) {
        showError('Could not connect to Vite dev server. Make sure your dev server is running on localhost.');
      }
    } catch (error) {
      console.error('[Highlight Assist] Failed to load:', error);
      showError('Failed to load highlight tool: ' + error.message);
    }
  }

  function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.setAttribute('data-ha-ui', 'true');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fee2e2;
      border: 2px solid #ef4444;
      color: #991b1b;
      padding: 16px;
      border-radius: 8px;
      max-width: 400px;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    errorDiv.innerHTML = `
      <strong>⚠️ Highlight Assist</strong><br>
      ${message}
      <button onclick="this.parentElement.remove()" style="
        margin-top: 8px;
        padding: 4px 12px;
        background: #dc2626;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      ">Close</button>
    `;
    document.body.appendChild(errorDiv);

    // Auto-remove after 10 seconds
    setTimeout(() => errorDiv.remove(), 10000);
  }

  // Listen for disable event
  window.addEventListener('highlight-assist-disable', () => {
    window.__HIGHLIGHT_ASSIST_LOADED__ = false;
  });

  // Load the tool
  loadHighlightAssist();
})();
