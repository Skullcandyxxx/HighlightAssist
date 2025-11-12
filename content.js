// Content script - runs on localhost pages
console.log('[Highlight Assist] Content script loaded');

let overlayLoaded = false;
let pendingResponse = null;

// Wait for logger to be available
setTimeout(() => {
  if (typeof logger !== 'undefined') {
    logger.info('Content script loaded', { url: window.location.href }, 'content');
  }
}, 100);

// Listen for responses from overlay-gui.js
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data || {};
  
  if (data.type === 'HIGHLIGHT_ASSIST_RESPONSE') {
    // Handle response from overlay-gui
    if (pendingResponse) {
      pendingResponse(data);
      pendingResponse = null;
    }
  }

  if (data.type === 'HIGHLIGHT_ASSIST_NATIVE_REQUEST') {
    chrome.runtime.sendMessage({
      action: 'bridgeNativeCommand',
      command: data.command,
      payload: data.payload || {}
    }, (response) => {
      const hasError = chrome.runtime.lastError;
      const payload = hasError ? {
        success: false,
        error: chrome.runtime.lastError.message
      } : (response || { success: false, error: 'NO_RESPONSE' });

      window.postMessage({
        type: 'HIGHLIGHT_ASSIST_NATIVE_RESPONSE',
        requestId: data.requestId,
        command: data.command,
        response: payload
      }, '*');
    });
  }

  if (data.type === 'HIGHLIGHT_ASSIST_STORAGE') {
    // Proxy storage requests to extension storage (chrome.storage.local)
    const reqId = data.requestId;
    const op = data.op || 'get';
    const key = data.key;
    const value = data.value;

    try {
      if (op === 'get') {
        chrome.storage.local.get(key, (result) => {
          window.postMessage({
            type: 'HIGHLIGHT_ASSIST_STORAGE_RESPONSE',
            requestId: reqId,
            ok: true,
            value: result[key]
          }, '*');
        });
      } else if (op === 'set') {
        const obj = {};
        obj[key] = value;
        chrome.storage.local.set(obj, () => {
          window.postMessage({ type: 'HIGHLIGHT_ASSIST_STORAGE_RESPONSE', requestId: reqId, ok: true }, '*');
        });
      } else if (op === 'remove') {
        chrome.storage.local.remove(key, () => {
          window.postMessage({ type: 'HIGHLIGHT_ASSIST_STORAGE_RESPONSE', requestId: reqId, ok: true }, '*');
        });
      } else if (op === 'getAll') {
        chrome.storage.local.get(null, (result) => {
          window.postMessage({ type: 'HIGHLIGHT_ASSIST_STORAGE_RESPONSE', requestId: reqId, ok: true, value: result }, '*');
        });
      } else {
        window.postMessage({ type: 'HIGHLIGHT_ASSIST_STORAGE_RESPONSE', requestId: reqId, ok: false, error: 'unknown_op' }, '*');
      }
    } catch (e) {
      window.postMessage({ type: 'HIGHLIGHT_ASSIST_STORAGE_RESPONSE', requestId: reqId, ok: false, error: e.message }, '*');
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Highlight Assist] Message received:', request);
  
  if (typeof logger !== 'undefined') {
    logger.debug('Message received from popup', { action: request.action }, 'content');
  }

  try {
    if (request.action === 'toggleInspecting') {
      // Load overlay if not loaded
      if (!overlayLoaded) {
        loadOverlayGui();
        // Wait for overlay to load before sending message
        setTimeout(() => {
          window.postMessage({ 
            type: 'HIGHLIGHT_ASSIST', 
            action: 'toggleInspecting' 
          }, '*');
        }, 500);
      } else {
        // Forward to overlay-gui.js
        window.postMessage({ 
          type: 'HIGHLIGHT_ASSIST', 
          action: 'toggleInspecting' 
        }, '*');
      }
      
      // Wait for overlay to respond with actual state
      pendingResponse = (data) => {
        sendResponse({ success: true, isInspecting: data.isInspecting });
        if (typeof logger !== 'undefined') {
          logger.success('Inspection toggled', { isInspecting: data.isInspecting }, 'content');
        }
      };
      
      // Timeout fallback
      setTimeout(() => {
        if (pendingResponse) {
          sendResponse({ success: true, isInspecting: false });
          pendingResponse = null;
        }
      }, 1000);
      
      return true; // Keep channel open for async response
    } 
    
    if (request.action === 'showGui') {
      // Load overlay if not loaded
      if (!overlayLoaded) {
        loadOverlayGui();
        // Wait for overlay to load before showing GUI
        setTimeout(() => {
          window.postMessage({ 
            type: 'HIGHLIGHT_ASSIST', 
            action: 'showGui' 
          }, '*');
        }, 500);
      } else {
        // Show the GUI panel
        window.postMessage({ 
          type: 'HIGHLIGHT_ASSIST', 
          action: 'showGui' 
        }, '*');
      }
      
      sendResponse({ success: true });
      if (typeof logger !== 'undefined') {
        logger.success('GUI panel opened', {}, 'content');
      }
    }

    if (request.action === 'getState') {
      // Forward to overlay and wait for response
      window.postMessage({ 
        type: 'HIGHLIGHT_ASSIST', 
        action: 'getState' 
      }, '*');
      
      sendResponse({ success: true, isInspecting: true });
    }

    if (request.action === 'exportLogs') {
      if (typeof logger !== 'undefined') {
        logger.downloadLogs(request.format || 'json');
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Logger not available' });
      }
    }

    if (request.action === 'getLogs') {
      if (typeof logger !== 'undefined') {
        const logs = logger.getLogs(request.filter || {});
        sendResponse({ success: true, logs });
      } else {
        sendResponse({ success: false, error: 'Logger not available' });
      }
    }
    
  } catch (error) {
    console.error('[Highlight Assist] Error handling message:', error);
    if (typeof logger !== 'undefined') {
      logger.error('Message handling failed', { 
        error: error.message, 
        stack: error.stack,
        action: request.action 
      }, 'content');
    }
    sendResponse({ success: false, error: error.message });
  }
});

// Check if tool should be active on page load
chrome.storage.local.get(['highlightAssistActive'], (result) => {
  // REMOVED AUTO-LOAD: Extension loads silently, user must click "Open GUI Panel" to show it
  // This makes the extension non-intrusive
  if (result.highlightAssistActive === true) {
    // Only auto-load if explicitly enabled (not by default)
    loadOverlayGui();
  }
});

function loadOverlayGui() {
  if (overlayLoaded) {
    console.log('[Highlight Assist] Overlay already loaded');
    if (typeof logger !== 'undefined') {
      logger.debug('Overlay already loaded', {}, 'content');
    }
    return;
  }

  console.log('[Highlight Assist] Loading overlay GUI');
  if (typeof logger !== 'undefined') {
    logger.info('Loading overlay GUI', {}, 'content');
  }

  try {
    // Inject the overlay-gui.js script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('overlay-gui.js');
    script.onload = function() {
      console.log('[Highlight Assist] Overlay GUI loaded');
      if (typeof logger !== 'undefined') {
        logger.success('Overlay GUI loaded successfully', {}, 'content');
      }
      overlayLoaded = true;
      this.remove();
    };
    script.onerror = function(error) {
      console.error('[Highlight Assist] Failed to load overlay GUI', error);
      if (typeof logger !== 'undefined') {
        logger.error('Failed to load overlay GUI', { error }, 'content');
      }
      overlayLoaded = false;
    };
    
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error('[Highlight Assist] Exception loading overlay:', error);
    if (typeof logger !== 'undefined') {
      logger.error('Exception loading overlay', { 
        error: error.message,
        stack: error.stack 
      }, 'content');
    }
  }
}

// REMOVED: Auto-load on localhost - extension should be non-intrusive
// User must click "Open GUI Panel" button to activate
// window.addEventListener('load', () => {
//   const isLocalhost = window.location.hostname === 'localhost' || 
//                      window.location.hostname === '127.0.0.1' ||
//                      window.location.hostname.includes('.local');
//   
//   if (isLocalhost) {
//     if (typeof logger !== 'undefined') {
//       logger.info('Localhost detected, auto-loading overlay', { 
//         hostname: window.location.hostname 
//       }, 'content');
//     }
//     loadOverlayGui();
//   }
// });


