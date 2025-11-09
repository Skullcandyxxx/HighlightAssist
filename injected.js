// Universal injected script - works on ANY localhost page// Injected script - runs in page context with access to React/Vite modules

(function() {(function() {

  'use strict';  'use strict';



  console.log('[HighlightAssist] Injected script running');  console.log('[Highlight Assist] Injected script running');

  

  // Check if already loaded  // Check if already loaded

  if (window.__HIGHLIGHT_ASSIST_LOADED__) {  if (window.__HIGHLIGHT_ASSIST_LOADED__) {

    console.log('[HighlightAssist] Already loaded, skipping');    console.log('[Highlight Assist] Already loaded, skipping');

    return;    return;

  }  }

  window.__HIGHLIGHT_ASSIST_LOADED__ = true;  window.__HIGHLIGHT_ASSIST_LOADED__ = true;



  // Load the universal highlight tool  // Dynamically import the highlight assist module from Vite dev server

  async function loadHighlightTool() {  async function loadHighlightAssist() {

    try {    try {

      // Get the extension URL (works in both Chrome and Firefox)      // Try common Vite ports

      const extensionUrl = chrome.runtime.getURL('highlight-tool.js');      const ports = [5173, 3000, 3001, 5174];

            let loaded = false;

      const script = document.createElement('script');

      script.src = extensionUrl;      for (const port of ports) {

      script.onload = () => {        try {

        console.log('[HighlightAssist] ✅ Tool loaded successfully');          const moduleUrl = `http://localhost:${port}/src/highlight/HighlightAssistProvider.jsx`;

      };          

      script.onerror = (error) => {          // Test if server is running

        console.error('[HighlightAssist] ❌ Failed to load tool:', error);          const response = await fetch(moduleUrl, { method: 'HEAD' });

        showError('Failed to load highlight tool');          if (response.ok) {

      };            console.log(`[Highlight Assist] Found Vite server on port ${port}`);

                  

      document.head.appendChild(script);            // Import the module

            const module = await import(moduleUrl);

    } catch (error) {            

      console.error('[HighlightAssist] Error:', error);            // Initialize the tool

      showError('Failed to initialize: ' + error.message);            if (module.initHighlightAssist) {

    }              module.initHighlightAssist();

  }              loaded = true;

              console.log('[Highlight Assist] Tool initialized successfully');

  function showError(message) {            } else {

    const errorDiv = document.createElement('div');              console.warn('[Highlight Assist] Module loaded but no init function found');

    errorDiv.setAttribute('data-ha-ui', 'true');            }

    errorDiv.style.cssText = `            break;

      position: fixed;          }

      top: 20px;        } catch (e) {

      right: 20px;          // Try next port

      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);          continue;

      border: 2px solid #ef4444;        }

      color: #991b1b;      }

      padding: 16px;

      border-radius: 12px;      if (!loaded) {

      max-width: 400px;        showError('Could not connect to Vite dev server. Make sure your dev server is running on localhost.');

      z-index: 2147483647;      }

      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;    } catch (error) {

      font-size: 14px;      console.error('[Highlight Assist] Failed to load:', error);

      box-shadow: 0 4px 12px rgba(0,0,0,0.3);      showError('Failed to load highlight tool: ' + error.message);

    `;    }

    errorDiv.innerHTML = `  }

      <strong>⚠️ HighlightAssist</strong><br>

      ${message}  function showError(message) {

      <button onclick="this.parentElement.remove()" style="    const errorDiv = document.createElement('div');

        margin-top: 8px;    errorDiv.setAttribute('data-ha-ui', 'true');

        padding: 6px 12px;    errorDiv.style.cssText = `

        background: #dc2626;      position: fixed;

        color: white;      top: 20px;

        border: none;      right: 20px;

        border-radius: 6px;      background: #fee2e2;

        cursor: pointer;      border: 2px solid #ef4444;

        font-size: 12px;      color: #991b1b;

        font-weight: 600;      padding: 16px;

      ">Close</button>      border-radius: 8px;

    `;      max-width: 400px;

    document.body.appendChild(errorDiv);      z-index: 2147483647;

      font-family: system-ui, -apple-system, sans-serif;

    // Auto-remove after 10 seconds      font-size: 14px;

    setTimeout(() => errorDiv.remove(), 10000);      box-shadow: 0 4px 12px rgba(0,0,0,0.15);

  }    `;

    errorDiv.innerHTML = `

  // Listen for messages from content script      <strong>⚠️ Highlight Assist</strong><br>

  window.addEventListener('message', (event) => {      ${message}

    if (event.source !== window) return;      <button onclick="this.parentElement.remove()" style="

            margin-top: 8px;

    if (event.data.type === 'HIGHLIGHT_ASSIST_ENABLE') {        padding: 4px 12px;

      if (window.HighlightAssist) {        background: #dc2626;

        window.HighlightAssist.enable();        color: white;

      }        border: none;

    } else if (event.data.type === 'HIGHLIGHT_ASSIST_DISABLE') {        border-radius: 4px;

      if (window.HighlightAssist) {        cursor: pointer;

        window.HighlightAssist.disable();        font-size: 12px;

      }      ">Close</button>

    }    `;

  });    document.body.appendChild(errorDiv);



  // Load the tool    // Auto-remove after 10 seconds

  loadHighlightTool();    setTimeout(() => errorDiv.remove(), 10000);

})();  }


  // Listen for disable event
  window.addEventListener('highlight-assist-disable', () => {
    window.__HIGHLIGHT_ASSIST_LOADED__ = false;
  });

  // Load the tool
  loadHighlightAssist();
})();
