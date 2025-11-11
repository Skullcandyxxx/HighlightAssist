// Popup UI controller
document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const openGuiBtn = document.getElementById('openGuiBtn');
  const statusDiv = document.getElementById('status');
  const settingsBtn = document.getElementById('settingsBtn');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Helper function to check if URL is local development
  function isLocalDevelopment(url) {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check for localhost variants
      if (hostname === 'localhost') return true;
      
      // Check for 127.0.0.0/8 (127.0.0.1 - 127.255.255.255)
      if (hostname.match(/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) return true;
      
      // Check for IPv6 localhost
      if (hostname === '::1' || hostname === '[::1]') return true;
      
      // Check for .local domains (mDNS)
      if (hostname.endsWith('.local')) return true;
      
      // Check for 0.0.0.0 (listen on all interfaces)
      if (hostname === '0.0.0.0') return true;
      
      // Check for 10.0.0.0/8 (private network)
      if (hostname.match(/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) return true;
      
      // Check for 172.16.0.0/12 (private network)
      if (hostname.match(/^172\.(1[6-9]|2[0-9]|3[01])\.\d{1,3}\.\d{1,3}$/)) return true;
      
      // Check for 192.168.0.0/16 (private network)
      if (hostname.match(/^192\.168\.\d{1,3}\.\d{1,3}$/)) return true;
      
      return false;
    } catch (e) {
      return false;
    }
  }

  // Check if on localhost
  const isLocalhost = isLocalDevelopment(tab.url);

  // Inject popup CSS for hover effects (CSP-safe replacement for inline handlers)
  (function injectPopupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .localhost-link { transition: all 0.2s; }
      .localhost-link:hover { background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.5); }
      .localhost-link .title { font-size: 11px; font-weight: 600; color: #60a5fa; margin-bottom: 2px; }
      .localhost-link .short { font-size: 9px; color: #94a3b8; }
    `;
    document.head.appendChild(style);
  })();

  if (!isLocalhost) {
    // Find all localhost tabs
    const allTabs = await chrome.tabs.query({});
    const localhostTabs = allTabs.filter(t => isLocalDevelopment(t.url));
    
    if (localhostTabs.length > 0) {
      // Show clickable links to localhost tabs
      let html = '<div style="display: flex; align-items: center; gap: 12px;"><div class="status-icon">⚠️</div><div>Not on localhost</div></div>';
      html += '<div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Click to switch to localhost tab:</div>';
      html += '<div style="max-height: 150px; overflow-y: auto; margin-top: 6px;">';
      
      localhostTabs.forEach((localhostTab, index) => {
        const tabTitle = localhostTab.title.substring(0, 40) + (localhostTab.title.length > 40 ? '...' : '');
        const tabUrl = new URL(localhostTab.url);
        const shortUrl = tabUrl.hostname + ':' + (tabUrl.port || '80') + tabUrl.pathname.substring(0, 20);
        
        html += `<div class="localhost-link" data-tab-id="${localhostTab.id}" style="
          padding: 8px;
          margin: 4px 0;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 6px;
          cursor: pointer;
        ">
          <div class="title">🌐 ${tabTitle}</div>
          <div class="short">${shortUrl}</div>
        </div>`;
      });
      
      html += '</div>';
      
      statusDiv.innerHTML = html;
      
      // Add click handlers to switch to localhost tabs
      setTimeout(() => {
        document.querySelectorAll('.localhost-link').forEach(link => {
          link.addEventListener('click', async () => {
            const tabId = parseInt(link.getAttribute('data-tab-id'));
            await chrome.tabs.update(tabId, { active: true });
            window.close(); // Close popup after switching
          });
        });
      }, 100);
    } else {
      // No localhost tabs found - show message to open one
      const wrapper = document.createElement('div');
      const statusRow = document.createElement('div');
      statusRow.style.cssText = 'display: flex; align-items: center; gap: 12px;';
      statusRow.innerHTML = '<div class="status-icon">⚠️</div><div>Not on localhost</div>';
      
      const message = document.createElement('div');
      message.style.cssText = 'font-size: 11px; color: #94a3b8; margin-top: 8px;';
      message.textContent = 'No localhost tabs found';
      
      const openBtn = document.createElement('button');
      openBtn.id = 'openLocalhostBtn';
      openBtn.style.cssText = 'margin-top: 8px; padding: 6px 12px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; color: #60a5fa; cursor: pointer; font-size: 11px; width: 100%;';
      openBtn.textContent = '🌐 Open localhost:3000';
      
      wrapper.appendChild(statusRow);
      wrapper.appendChild(message);
      wrapper.appendChild(openBtn);
      
      statusDiv.innerHTML = '';
      statusDiv.appendChild(wrapper);
      
      // Add handler to open localhost in new tab
      openBtn.addEventListener('click', async () => {
        await chrome.tabs.create({ url: 'http://localhost:3000' });
        window.close();
      });
    }
    
    statusDiv.className = 'status-card inactive';
    toggleBtn.disabled = true;
    toggleBtn.textContent = '❌ Only works on localhost';
    toggleBtn.style.opacity = '0.5';
    toggleBtn.style.cursor = 'not-allowed';
    openGuiBtn.disabled = true;
    openGuiBtn.style.opacity = '0.5';
    return;
  }

  // Check if tool is active
  chrome.storage.local.get(['highlightAssistActive'], (result) => {
    const isActive = result.highlightAssistActive || false;
    updateUI(isActive);
  });

  // Toggle inspection button click
  toggleBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Add loading state
    toggleBtn.disabled = true;
    toggleBtn.innerHTML = '<span>⏳</span> Loading...';
    
    try {
      // Send message to toggle inspection mode
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleInspecting'
      });
      
      if (response && response.success) {
        const newState = response.isInspecting;
        chrome.storage.local.set({ highlightAssistActive: newState });
        updateUI(newState);
      }
    } catch (error) {
      console.error('Failed to toggle:', error);
      showError('Extension not loaded on this page. Please refresh.');
    } finally {
      toggleBtn.disabled = false;
    }
  });

  // Open GUI Panel button
  openGuiBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showGui'
      });
      
      // Close popup after opening GUI
      window.close();
    } catch (error) {
      console.error('Failed to open GUI:', error);
      showError('Extension not loaded. Please refresh the page.');
    }
  });

  // Export Logs button
  document.getElementById('exportLogsBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const format = prompt('Export format (json/text/csv):', 'json');
    if (!format) return;
    
    try {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'exportLogs',
        format: format
      });
      
      showSuccess('Logs exported successfully!');
    } catch (error) {
      console.error('Failed to export logs:', error);
      
      // Fallback: Export from storage directly
      try {
        const result = await chrome.storage.local.get(['highlightAssist_logs']);
        const logs = result.highlightAssist_logs || [];
        
        let content;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let filename;
        
        if (format === 'json') {
          content = JSON.stringify(logs, null, 2);
          filename = `highlightassist-logs-${timestamp}.json`;
        } else if (format === 'text') {
          content = logs.map(log => 
            `[${log.timestamp}] [${log.level}] [${log.source}] ${log.message}\n` +
            (Object.keys(log.data || {}).length ? `  Data: ${JSON.stringify(log.data)}\n` : '')
          ).join('\n');
          filename = `highlightassist-logs-${timestamp}.txt`;
        } else {
          content = 'Timestamp,Level,Source,Message,URL,Data\n' +
            logs.map(log =>
              `"${log.timestamp}","${log.level}","${log.source}","${log.message}","${log.url || ''}","${JSON.stringify(log.data || {}).replace(/"/g, '""')}"`
            ).join('\n');
          filename = `highlightassist-logs-${timestamp}.csv`;
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
        
        showSuccess(`Logs exported: ${filename}`);
      } catch (exportError) {
        showError('Failed to export logs: ' + exportError.message);
      }
    }
  });

  // Settings button
  settingsBtn.addEventListener('click', async () => {
    // Show settings including log stats
    const result = await chrome.storage.local.get([
      'highlightAssist_logs',
      'highlightAssist_criticalErrors',
      'highlightAssist_lastSaved'
    ]);
    
    const logs = result.highlightAssist_logs || [];
    const errors = result.highlightAssist_criticalErrors || [];
    const lastSaved = result.highlightAssist_lastSaved || 'Never';
    
    const stats = {
      totalLogs: logs.length,
      criticalErrors: errors.length,
      lastSaved: lastSaved,
      byLevel: {}
    };
    
    logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    });
    
    const message = `HighlightAssist Stats:\n\n` +
      `Total Logs: ${stats.totalLogs}\n` +
      `Critical Errors: ${stats.criticalErrors}\n` +
      `Last Saved: ${lastSaved}\n\n` +
      `By Level:\n` +
      Object.entries(stats.byLevel).map(([level, count]) => 
        `  ${level}: ${count}`
      ).join('\n') +
      `\n\nClick "Export Logs" to download full logs.`;
    
    alert(message);
    console.log('Full settings:', result);
  });

  function updateUI(isActive) {
    statusDiv.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 12px;';
    
    if (isActive) {
      wrapper.innerHTML = '<div class="status-icon">🟢</div><div>🎯 Inspection Active</div>';
      statusDiv.className = 'status-card active';
      toggleBtn.innerHTML = '<span>⏸</span> Stop Inspecting';
      toggleBtn.className = 'btn-danger';
    } else {
      wrapper.innerHTML = '<div class="status-icon">⚫</div><div>⏸ Inspection Paused</div>';
      statusDiv.className = 'status-card inactive';
      toggleBtn.innerHTML = '<span>▶</span> Start Inspecting';
      toggleBtn.className = 'btn-primary';
    }
    
    statusDiv.appendChild(wrapper);
  }

  function showError(message) {
    const tempStatus = statusDiv.innerHTML;
    const tempClass = statusDiv.className;
    
    statusDiv.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 12px;';
    wrapper.innerHTML = '<div class="status-icon">❌</div><div>' + message + '</div>';
    statusDiv.appendChild(wrapper);
    statusDiv.className = 'status-card inactive';
    
    setTimeout(() => {
      statusDiv.innerHTML = tempStatus;
      statusDiv.className = tempClass;
    }, 3000);
  }

  function showSuccess(message) {
    const tempStatus = statusDiv.innerHTML;
    const tempClass = statusDiv.className;
    
    statusDiv.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; gap: 12px;';
    wrapper.innerHTML = '<div class="status-icon">✅</div><div>' + message + '</div>';
    statusDiv.appendChild(wrapper);
    statusDiv.className = 'status-card active';
    
    setTimeout(() => {
      statusDiv.innerHTML = tempStatus;
      statusDiv.className = tempClass;
    }, 2000);
  }
});
