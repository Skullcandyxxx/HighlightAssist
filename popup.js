// Popup UI controller
document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const statusDiv = document.getElementById('status');
  const settingsBtn = document.getElementById('settingsBtn');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if on localhost
  const isLocalhost = tab.url.startsWith('http://localhost') || 
                     tab.url.startsWith('http://127.0.0.1') ||
                     tab.url.includes('.local');

  if (!isLocalhost) {
    statusDiv.innerHTML = '<div class="status-icon">⚠️</div><div>Not on localhost</div>';
    statusDiv.className = 'status-card inactive';
    toggleBtn.disabled = true;
    toggleBtn.textContent = '❌ Only works on localhost';
    toggleBtn.style.opacity = '0.5';
    toggleBtn.style.cursor = 'not-allowed';
    return;
  }

  // Check if tool is active
  chrome.storage.local.get(['highlightAssistActive'], (result) => {
    const isActive = result.highlightAssistActive || false;
    updateUI(isActive);
  });

  // Toggle button click
  toggleBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Add loading state
    toggleBtn.disabled = true;
    toggleBtn.innerHTML = '<span>⏳</span> Loading...';
    
    chrome.storage.local.get(['highlightAssistActive'], async (result) => {
      const isActive = result.highlightAssistActive || false;
      const newState = !isActive;

      // Save state
      chrome.storage.local.set({ highlightAssistActive: newState });

      // Send message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: newState ? 'enable' : 'disable'
        });
        
        updateUI(newState);
      } catch (error) {
        console.error('Failed to toggle:', error);
        showError('Failed to toggle tool. Please refresh the page.');
      } finally {
        toggleBtn.disabled = false;
      }
    });
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    // For now, just show storage settings in console
    chrome.storage.local.get(null, (data) => {
      console.log('Current settings:', data);
      alert('Settings:\n' + JSON.stringify(data, null, 2) + '\n\nCheck console for details');
    });
  });

  function updateUI(isActive) {
    if (isActive) {
      statusDiv.innerHTML = '<div class="status-icon">🟢</div><div>Tool is Active</div>';
      statusDiv.className = 'status-card active';
      toggleBtn.innerHTML = '<span>🛑</span> Disable Highlight Tool';
      toggleBtn.className = 'btn-danger';
    } else {
      statusDiv.innerHTML = '<div class="status-icon">⚫</div><div>Tool is Inactive</div>';
      statusDiv.className = 'status-card inactive';
      toggleBtn.innerHTML = '<span>🚀</span> Enable Highlight Tool';
      toggleBtn.className = 'btn-primary';
    }
  }

  function showError(message) {
    const tempStatus = statusDiv.innerHTML;
    const tempClass = statusDiv.className;
    
    statusDiv.innerHTML = '<div class="status-icon">❌</div><div>' + message + '</div>';
    statusDiv.className = 'status-card inactive';
    
    setTimeout(() => {
      statusDiv.innerHTML = tempStatus;
      statusDiv.className = tempClass;
    }, 3000);
  }
});
