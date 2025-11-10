// Background service worker
console.log('[Highlight Assist] Background service worker initialized');

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

