// Content script - runs on localhost pages
console.log('[Highlight Assist] Content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Highlight Assist] Message received:', request);

  if (request.action === 'enable') {
    enableHighlightTool();
  } else if (request.action === 'disable') {
    disableHighlightTool();
  }

  sendResponse({ success: true });
});

// Check if tool should be active on page load
chrome.storage.local.get(['highlightAssistActive'], (result) => {
  if (result.highlightAssistActive) {
    enableHighlightTool();
  }
});

function enableHighlightTool() {
  console.log('[Highlight Assist] Enabling tool');

  // Inject the highlight assist script
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
    this.remove();
    console.log('[Highlight Assist] Injected script loaded');
  };
  (document.head || document.documentElement).appendChild(script);
}

function disableHighlightTool() {
  console.log('[Highlight Assist] Disabling tool');
  
  // Remove all highlight assist UI elements
  document.querySelectorAll('[data-ha-ui]').forEach(el => el.remove());
  
  // Dispatch event to clean up
  window.dispatchEvent(new CustomEvent('highlight-assist-disable'));
}
