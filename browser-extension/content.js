// Content script - runs on localhost pages
console.log('[Highlight Assist] Content script loaded');

let overlayLoaded = false;
let overlayReady = false;
let pendingResponse = null;
let messageQueue = [];

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
  
  // NEW: Handle overlay ready signal (HANDSHAKE PROTOCOL)
  if (data.type === 'HIGHLIGHT_ASSIST_READY') {
    console.log('[Highlight Assist] ✅ Overlay confirmed ready');
    overlayReady = true;
    overlayLoaded = true;
    
    // Flush queued messages
    messageQueue.forEach(msg => {
      console.log('[Highlight Assist] Sending queued message:', msg);
      window.postMessage(msg, '*');
    });
    messageQueue = [];
    
    if (typeof logger !== 'undefined') {
      logger.success('Overlay ready and initialized', { timestamp: data.timestamp }, 'content');
    }
  }
  
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
      }
      
      // Send message (will be queued if overlay not ready)
      sendToOverlay({ 
        type: 'HIGHLIGHT_ASSIST', 
        action: 'toggleInspecting' 
      });
      
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
      }, 2000); // Increased to 2s for OOP init time
      
      return true; // Keep channel open for async response
    } 
    
    if (request.action === 'showGui') {
      // Load overlay if not loaded
      if (!overlayLoaded) {
        loadOverlayGui();
      }
      
      // Send message (will be queued if overlay not ready)
      sendToOverlay({ 
        type: 'HIGHLIGHT_ASSIST', 
        action: 'showGui' 
      });
      
      // Wait for response
      pendingResponse = (data) => {
        sendResponse({ success: true, panelShown: data.panelShown || data.success });
      };
      
      // Timeout fallback
      setTimeout(() => {
        if (pendingResponse) {
          sendResponse({ success: false, error: 'Timeout waiting for overlay' });
          pendingResponse = null;
        }
      }, 2000);
      
      if (typeof logger !== 'undefined') {
        logger.success('GUI panel request sent', {}, 'content');
      }
      
      return true; // Keep channel open
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

// Helper function to send messages to overlay with queue support
function sendToOverlay(message) {
  if (!overlayReady) {
    // Queue message for later
    console.log('[Highlight Assist] Queuing message (overlay not ready):', message);
    messageQueue.push(message);
    
    // Load overlay if not already loading
    if (!overlayLoaded) {
      loadOverlayGui();
    }
  } else {
    // Send immediately
    console.log('[Highlight Assist] Sending message to overlay:', message);
    window.postMessage(message, '*');
  }
}

function loadOverlayGui() {
  if (overlayLoaded) {
    console.log('[Highlight Assist] Overlay already loaded');
    if (typeof logger !== 'undefined') {
      logger.debug('Overlay already loaded', {}, 'content');
    }
    return;
  }

  console.log('[Highlight Assist] Loading OOP overlay GUI...');
  if (typeof logger !== 'undefined') {
    logger.info('Loading OOP overlay GUI', {}, 'content');
  }

  try {
    // Inject the NEW OOP overlay-gui.js script
    const script = document.createElement('script');
    script.type = 'module'; // ES6 module support
    script.src = chrome.runtime.getURL('overlay-gui-oop.js');
    script.dataset.highlightAssist = 'overlay'; // Mark for debugging
    
    script.onload = function() {
      console.log('[Highlight Assist] OOP overlay script loaded, waiting for init...');
      if (typeof logger !== 'undefined') {
        logger.success('OOP overlay script loaded', {}, 'content');
      }
      // Don't set overlayLoaded here - wait for HIGHLIGHT_ASSIST_READY signal
    };
    
    script.onerror = function(error) {
      console.error('[Highlight Assist] Failed to load overlay GUI:', error);
      if (typeof logger !== 'undefined') {
        logger.error('Failed to load overlay GUI', { error }, 'content');
      }
      overlayLoaded = false;
      overlayReady = false;
    };
    
    // Don't remove script - allows DevTools inspection
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


