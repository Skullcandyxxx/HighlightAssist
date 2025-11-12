// Background service worker
console.log('[Highlight Assist] Background service worker initialized');

const NATIVE_HOST_NAME = 'com.highlightassist.bridge';

function sendNativeBridgeCommand(command, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      { command, payload },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[Highlight Assist] Native host error:', chrome.runtime.lastError.message);
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
          return;
        }
        resolve({
          success: true,
          response: response || {}
        });
      }
    );
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Highlight Assist] Extension installed - Welcome!');
    
    // Set default state
    chrome.storage.local.set({ 
      highlightAssistActive: false,
      autoEnableOnLocalhost: false,
      preferredPort: 5173
    });

    // Open welcome page - HighlightAssist GitHub repository
    chrome.tabs.create({
      url: 'https://github.com/Skullcandyxxx/HighlightAssist'
    });
  } else if (details.reason === 'update') {
    console.log('[Highlight Assist] Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-highlight') {
    console.log('[Highlight Assist] Keyboard shortcut triggered');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.storage.local.get(['highlightAssistActive'], (result) => {
          const newState = !result.highlightAssistActive;
          chrome.storage.local.set({ highlightAssistActive: newState });
          
          chrome.tabs.sendMessage(tabs[0].id, {
            action: newState ? 'enable' : 'disable'
          });
        });
      }
    });
  }
});

// Listen for tab updates to auto-enable if configured
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isLocalhost = tab.url.startsWith('http://localhost') || 
                       tab.url.startsWith('http://127.0.0.1') ||
                       tab.url.includes('.local');
    
    if (isLocalhost) {
      chrome.storage.local.get(['autoEnableOnLocalhost', 'highlightAssistActive'], (result) => {
        if (result.autoEnableOnLocalhost && !result.highlightAssistActive) {
          chrome.storage.local.set({ highlightAssistActive: true });
          chrome.tabs.sendMessage(tabId, { action: 'enable' });
        }
      });
    }
  }
});

// Handle browser action badge
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.highlightAssistActive) {
    const isActive = changes.highlightAssistActive.newValue;
    
    // Update badge
    chrome.action.setBadgeText({ 
      text: isActive ? 'ON' : ''
    });
    
    chrome.action.setBadgeBackgroundColor({ 
      color: isActive ? '#10b981' : '#64748b'
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) {
    return false;
  }

  if (message.action === 'bridgeNativeCommand') {
    const command = message.command || 'bridge_status';
    sendNativeBridgeCommand(command, message.payload || {})
      .then(sendResponse);
    return true; // keep channel open for async response
  }

  return false;
});

