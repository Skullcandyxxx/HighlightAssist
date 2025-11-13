// Popup UI controller
document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const openGuiBtn = document.getElementById('openGuiBtn');
  const statusDiv = document.getElementById('status');
  const settingsBtn = document.getElementById('settingsBtn');

  // Check if daemon is running
  let daemonConnected = false;
  
  async function checkDaemonConnection() {
    try {
      const response = await fetch('http://localhost:5055/health', {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      return false;
    }
  }
  
  // Check daemon on popup load
  daemonConnected = await checkDaemonConnection();
  console.log('Daemon connection status:', daemonConnected);
  
  // Helper: Scan for running localhost servers
  async function scanRunningLocalhostServers() {
    const commonPorts = [3000, 3001, 4200, 5000, 5173, 5174, 8000, 8080, 8081, 8888, 9000];
    const running = [];
    
    for (const port of commonPorts) {
      try {
        const response = await fetch(`http://localhost:${port}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(500)
        });
        
        // Server responded - try to identify type
        let type = 'Development server';
        const contentType = response.headers.get('content-type');
        const server = response.headers.get('server');
        
        if (contentType?.includes('text/html')) {
          if (server?.toLowerCase().includes('vite')) type = 'Vite';
          else if (server?.toLowerCase().includes('webpack')) type = 'Webpack Dev Server';
          else type = 'Web Server';
        }
        
        running.push({ port, type });
      } catch (e) {
        // Port not responding
      }
    }
    
    return running;
  }
  
  // Helper: Get recent projects from storage
  async function getRecentProjects() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['recentProjects'], (data) => {
        const projects = data.recentProjects || [];
        resolve(projects.slice(0, 5)); // Last 5 projects
      });
    });
  }
  
  // Helper: Save project to recents
  async function saveToRecentProjects(path, name) {
    chrome.storage.local.get(['recentProjects'], (data) => {
      const projects = data.recentProjects || [];
      
      // Remove if already exists
      const filtered = projects.filter(p => p.path !== path);
      
      // Add to front
      filtered.unshift({ path, name, timestamp: Date.now() });
      
      // Keep only last 10
      const updated = filtered.slice(0, 10);
      
      chrome.storage.local.set({ recentProjects: updated });
    });
  }
  
  // Helper: Auto-detect dev command from project folder
  async function autoDetectDevCommand(projectPath) {
    // This would need to communicate with daemon to read files
    // For now, return common defaults
    // TODO: Add bridge API to read package.json/requirements.txt
    return null; // Let user's specified command be used
  }
  
  // Load running servers from storage
  chrome.storage.local.get(['runningServers'], (result) => {
    if (result.runningServers) {
      // Convert array back to Map
      runningServers = new Map(result.runningServers);
      updateServerManagement();
    }
  });
  
  // Update daemon status badge
  function updateDaemonStatusBadge(connected) {
    const badge = document.getElementById('daemonStatus');
    const icon = document.getElementById('daemonIcon');
    const state = document.getElementById('daemonState');
    const osIcon = document.getElementById('osIcon');
    const startServerSection = document.getElementById('startServerSection');
    
    badge.style.display = 'block';
    badge.className = 'daemon-badge ' + (connected ? 'connected' : 'disconnected');
    icon.textContent = connected ? '✅' : '🔌';
    
    // Show action button based on connection status
    if (connected) {
      state.innerHTML = 'Connected & Ready <span style="font-size: 10px; opacity: 0.7; margin-left: 8px; cursor: pointer;" id="stopDaemonBtn">⏹️ Stop</span>';
    } else {
      state.innerHTML = 'Not Running <span style="font-size: 10px; opacity: 0.7; margin-left: 8px; cursor: pointer;" id="startDaemonBtn">▶️ Start</span>';
    }
    
    // Show/hide start server button based on connection
    if (startServerSection) {
      startServerSection.style.display = connected ? 'block' : 'none';
    }
    
    // Detect OS and show icon
    const platform = navigator.platform.toLowerCase();
    let osText = '🖥️ Windows';
    if (platform.includes('mac')) {
      osText = '🍎 macOS';
    } else if (platform.includes('linux')) {
      osText = '🐧 Linux';
    }
    osIcon.textContent = osText;
    
    // Add event listeners for start/stop buttons
    setTimeout(() => {
      const startBtn = document.getElementById('startDaemonBtn');
      const stopBtn = document.getElementById('stopDaemonBtn');
      
      if (startBtn) {
        startBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await startDaemon();
        });
      }
      
      if (stopBtn) {
        stopBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await stopDaemon();
        });
      }
    }, 100);
  }
  
  // Start daemon service
  async function startDaemon() {
    const platform = navigator.platform.toLowerCase();
    let instructions = '';
    
    if (platform.includes('win')) {
      instructions = `
        <div style="text-align: left; line-height: 1.8;">
          <strong>Start HighlightAssist Daemon on Windows:</strong><br><br>
          <strong>Method 1: From Start Menu</strong><br>
          1️⃣ Press <kbd>Windows</kbd> key<br>
          2️⃣ Type "HighlightAssist"<br>
          3️⃣ Click the app to start<br>
          4️⃣ Purple tray icon will appear<br><br>
          
          <strong>Method 2: From Installation Folder</strong><br>
          1️⃣ Go to: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-size: 11px;">C:\\Program Files\\HighlightAssist</code><br>
          2️⃣ Double-click <strong>service_manager_v2.exe</strong><br><br>
          
          <strong>Method 3: Auto-start (recommended)</strong><br>
          The daemon should auto-start with Windows if you checked the option during installation.
        </div>
      `;
    } else if (platform.includes('mac')) {
      instructions = `
        <div style="text-align: left; line-height: 1.8;">
          <strong>Start HighlightAssist Daemon on macOS:</strong><br><br>
          1️⃣ Open <strong>Terminal</strong><br>
          2️⃣ Run: <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 3px;">python3 ~/HighlightAssist/service_manager_v2.py &</code><br>
          3️⃣ Daemon starts in background
        </div>
      `;
    } else {
      instructions = `
        <div style="text-align: left; line-height: 1.8;">
          <strong>Start HighlightAssist Daemon on Linux:</strong><br><br>
          1️⃣ Open terminal<br>
          2️⃣ Run: <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 3px;">systemctl --user start highlightassist</code><br>
          3️⃣ Or run directly: <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 3px;">python3 ~/highlightassist/service_manager_v2.py &</code>
        </div>
      `;
    }
    
    await showCustomModal({
      icon: '▶️',
      title: 'Start Daemon',
      body: `<div style="padding: 12px;">${instructions}</div>`,
      buttons: [
        { text: 'Got it', value: true, primary: true, onClick: async () => {
          // Recheck daemon status after user clicks
          setTimeout(async () => {
            daemonConnected = await checkDaemonConnection();
            updateDaemonStatusBadge(daemonConnected);
          }, 1000);
        }}
      ]
    });
  }
  
  // Stop daemon service
  async function stopDaemon() {
    const confirmHTML = `
      <div style="text-align: center; padding: 12px;">
        <div style="font-size: 14px; color: #64748b; margin-bottom: 16px;">
          This will stop the daemon service. You won't be able to start localhost servers until you restart it.
        </div>
        <div style="background: #fef3c7; padding: 10px; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 12px;">
          💡 <strong>Tip:</strong> You can stop the daemon from the system tray icon instead (right-click → Quit)
        </div>
      </div>
    `;
    
    const result = await showCustomModal({
      icon: '⚠️',
      title: 'Stop Daemon?',
      body: confirmHTML,
      buttons: [
        { text: 'Cancel', value: false, primary: false },
        { text: 'Stop Daemon', value: true, primary: true }
      ]
    });
    
    if (!result) return;
    
    const state = document.getElementById('daemonState');
    state.innerHTML = 'Stopping... ⏳';
    
    try {
      // Try HTTP shutdown endpoint first (more reliable than WebSocket)
      const response = await fetch('http://localhost:5055/shutdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'shutdown' }),
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        // Success - update UI after a moment
        setTimeout(async () => {
          daemonConnected = await checkDaemonConnection();
          updateDaemonStatusBadge(daemonConnected);
          
          showCustomModal({
            icon: '✅',
            title: 'Daemon Stopped',
            body: '<div style="text-align: center; padding: 20px;">The daemon has been stopped successfully.</div>',
            buttons: [{ text: 'OK', value: true, primary: true }]
          });
        }, 1500);
        return;
      }
    } catch (httpError) {
      console.log('HTTP shutdown failed, trying WebSocket...', httpError);
    }
    
    try {
      // Fallback to WebSocket
      const ws = new WebSocket('ws://localhost:5055/ws');
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'shutdown',
          data: {}
        }));
        
        // Update UI after sending command
        setTimeout(async () => {
          daemonConnected = await checkDaemonConnection();
          updateDaemonStatusBadge(daemonConnected);
        }, 1500);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        state.innerHTML = 'Not Running <span style="font-size: 10px; opacity: 0.7; margin-left: 8px; cursor: pointer;" id="startDaemonBtn">▶️ Start</span>';
        
        showCustomModal({
          icon: '❌',
          title: 'Stop Failed',
          body: `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 14px; color: #dc2626; margin-bottom: 12px;">Failed to stop daemon via extension.</div>
              <div style="font-size: 12px; color: #64748b;">
                Please use the system tray icon instead:<br>
                Right-click the tray icon → <strong>Quit</strong>
              </div>
            </div>
          `,
          buttons: [{ text: 'OK', value: true, primary: true }]
        });
      };
      
      // Set timeout for WebSocket
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }, 3000);
      
    } catch (error) {
      console.error('Failed to stop daemon:', error);
      state.innerHTML = 'Not Running <span style="font-size: 10px; opacity: 0.7; margin-left: 8px; cursor: pointer;" id="startDaemonBtn">▶️ Start</span>';
      
      showCustomModal({
        icon: '❌',
        title: 'Error',
        body: `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 14px; color: #dc2626; margin-bottom: 12px;">Unable to communicate with daemon.</div>
            <div style="font-size: 12px; color: #64748b;">
              The daemon may already be stopped, or you can stop it manually:<br>
              Right-click the purple tray icon → <strong>Quit</strong>
            </div>
          </div>
        `,
        buttons: [{ text: 'OK', value: true, primary: true }]
      });
    }
  }
  
  updateDaemonStatusBadge(daemonConnected);

  // Server Management
  let runningServers = new Map(); // Track running servers: { port => { name, command, pid, cwd } }
  
  function updateServerManagement() {
    const serverMgmt = document.getElementById('serverManagement');
    const serverList = document.getElementById('serverList');
    const serverCount = document.getElementById('serverCount');
    
    if (runningServers.size > 0) {
      serverMgmt.style.display = 'block';
      serverCount.textContent = runningServers.size;
      
      // Build server list HTML
      let html = '';
      for (const [port, server] of runningServers) {
        html += `
          <div class="server-item" data-port="${port}">
            <div class="server-info">
              <div class="server-name">
                <span>${server.name}</span>
                <span class="server-status running">Running</span>
              </div>
              <div class="server-details">
                <span>📍 localhost:${port}</span>
                <span>📂 ${server.cwd.substring(server.cwd.lastIndexOf('\\\\') + 1)}</span>
              </div>
            </div>
            <div class="server-actions">
              <button class="server-btn server-btn-view" data-action="view" data-port="${port}">🌐 Open</button>
              <button class="server-btn server-btn-restart" data-action="restart" data-port="${port}">🔄</button>
              <button class="server-btn server-btn-stop" data-action="stop" data-port="${port}">⏹️</button>
            </div>
          </div>
        `;
      }
      serverList.innerHTML = html;
      serverList.classList.add('expanded');
      
      // Add event listeners to buttons
      document.querySelectorAll('.server-btn').forEach(btn => {
        btn.addEventListener('click', handleServerAction);
      });
    } else {
      serverMgmt.style.display = 'none';
    }
  }
  
  async function handleServerAction(e) {
    const action = e.currentTarget.getAttribute('data-action');
    const port = parseInt(e.currentTarget.getAttribute('data-port'));
    const server = runningServers.get(port);
    
    if (!server) return;
    
    if (action === 'view') {
      // Open in new tab
      chrome.tabs.create({ url: `http://localhost:${port}` });
    } else if (action === 'stop') {
      // Stop server via daemon
      if (daemonConnected) {
        try {
          const ws = new WebSocket('ws://localhost:5055/ws');
          ws.onopen = () => {
            ws.send(JSON.stringify({
              type: 'stop_server',
              data: { port: port, pid: server.pid }
            }));
            ws.close();
          };
          
          // Remove from list
          runningServers.delete(port);
          updateServerManagement();
          
          // Save to storage
          chrome.storage.local.set({ runningServers: Array.from(runningServers.entries()) });
          
        } catch (error) {
          console.error('Failed to stop server:', error);
        }
      }
    } else if (action === 'restart') {
      // Restart server
      if (daemonConnected) {
        // Stop then start
        handleServerAction({ currentTarget: { getAttribute: (k) => k === 'data-action' ? 'stop' : port.toString() }});
        setTimeout(() => {
          // Re-execute start command
          executeCommandViaDaemon(server.command, server.cwd, port);
        }, 1000);
      }
    }
  }
  
  // Toggle server list
  const toggleServersBtn = document.getElementById('toggleServers');
  const serverListEl = document.getElementById('serverList');
  if (toggleServersBtn) {
    toggleServersBtn.addEventListener('click', () => {
      serverListEl.classList.toggle('expanded');
      toggleServersBtn.classList.toggle('expanded');
    });
  }

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

  // Custom Modal Dialog Helper
  function showCustomModal(config) {
    return new Promise((resolve) => {
      const modal = document.getElementById('customModal');
      const modalIcon = document.getElementById('modalIcon');
      const modalTitle = document.getElementById('modalTitle');
      const modalBody = document.getElementById('modalBody');
      const modalFooter = document.getElementById('modalFooter');

      // Set content
      modalIcon.textContent = config.icon || '🚀';
      modalTitle.textContent = config.title || 'Dialog';
      modalBody.innerHTML = config.body || '';
      modalFooter.innerHTML = '';

      // Add buttons
      if (config.buttons) {
        config.buttons.forEach(btn => {
          const button = document.createElement('button');
          button.className = `modal-btn ${btn.primary ? 'modal-btn-primary' : 'modal-btn-secondary'}`;
          button.textContent = btn.text;
          button.addEventListener('click', async () => {
            // Execute onClick handler if provided (may be async)
            if (btn.onClick) {
              await btn.onClick();
            }
            // Close modal after onClick completes
            modal.classList.remove('active');
            resolve(btn.value);
          });
          modalFooter.appendChild(button);
        });
      }

      // Show modal
      modal.classList.add('active');

      // Close on overlay click (use addEventListener instead of onclick)
      const overlayClickHandler = (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          modal.removeEventListener('click', overlayClickHandler);
          resolve(null);
        }
      };
      modal.addEventListener('click', overlayClickHandler);
    });
  }

  // Show daemon installation prompt
  async function showDaemonInstallPrompt() {
    // Detect platform
    const platform = navigator.platform.toLowerCase();
    let platformName = 'Windows';
    let installSteps = '';
    // Professional installer for Windows, packages for other platforms
    let downloadLink = 'https://github.com/Skullcandyxxx/HighlightAssist/releases/download/v1.2.2/HighlightAssist-Setup-v1.2.2.exe';
    
    if (platform.includes('mac')) {
      platformName = 'macOS';
      downloadLink = 'https://github.com/Skullcandyxxx/HighlightAssist/releases/download/v1.2.2/HighlightAssist-macOS-v1.2.2.zip';
      installSteps = `
        <ol style="text-align: left; padding-left: 20px; margin: 12px 0; line-height: 1.8; color: #64748b; font-size: 12px;">
          <li>Download and extract the ZIP file</li>
          <li>Open Terminal in the extracted folder</li>
          <li>Run: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">chmod +x install-macos.sh</code></li>
          <li>Run: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">./install-macos.sh</code></li>
          <li>Daemon will auto-start with system tray icon</li>
        </ol>
      `;
    } else if (platform.includes('linux')) {
      platformName = 'Linux';
      downloadLink = 'https://github.com/Skullcandyxxx/HighlightAssist/releases/download/v1.2.2/HighlightAssist-Linux-v1.2.2.zip';
      installSteps = `
        <ol style="text-align: left; padding-left: 20px; margin: 12px 0; line-height: 1.8; color: #64748b; font-size: 12px;">
          <li>Download and extract the ZIP file</li>
          <li>Open terminal in the extracted folder</li>
          <li>Run: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">chmod +x install-linux.sh</code></li>
          <li>Run: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">sudo ./install-linux.sh</code></li>
          <li>Daemon will auto-start as systemd service</li>
        </ol>
      `;
    } else {
      // Windows - Professional installer
      installSteps = `
        <ol style="text-align: left; padding-left: 20px; margin: 12px 0; line-height: 1.8; color: #64748b; font-size: 12px;">
          <li><strong>Download</strong> the installer (HighlightAssist-Setup-v1.2.2.exe)</li>
          <li><strong>Double-click</strong> the installer to start setup wizard</li>
          <li><strong>Choose</strong> installation directory (or use default)</li>
          <li><strong>Select options:</strong>
            <ul style="margin: 4px 0; padding-left: 20px;">
              <li>Create desktop shortcut (optional)</li>
              <li>Start automatically with Windows (recommended)</li>
            </ul>
          </li>
          <li>Click <strong>Install</strong> and wait for completion</li>
          <li>Daemon launches automatically with purple tray icon (H)</li>
        </ol>
        <div style="background: #eff6ff; border-left: 3px solid #3b82f6; padding: 8px 12px; margin: 8px 0; border-radius: 4px; font-size: 11px; color: #1e40af;">
          <strong>💡 Professional Installer:</strong> Full setup wizard with directory selection, uninstaller, and Start Menu shortcuts - just like any Windows application!
        </div>
      `;
    }
    
    const installHTML = `
      <div class="modal-subtitle">The HighlightAssist Daemon is required to start development servers from the extension.</div>
      
      <div style="background: #f0fdf4; border-left: 3px solid #10b981; padding: 12px; margin: 12px 0; border-radius: 6px;">
        <div style="font-weight: 600; color: #047857; margin-bottom: 6px;">📦 Installation Steps for ${platformName}:</div>
        ${installSteps}
      </div>
      
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 12px; border-radius: 8px; margin: 16px 0;">
        <div style="font-weight: 600; color: #92400e; margin-bottom: 6px;">⚙️ Daemon Features:</div>
        <ul style="margin: 0; padding-left: 20px; color: #78350f; line-height: 1.6;">
          <li>Automatically start dev servers from the extension</li>
          <li>Manage localhost environments without terminal</li>
          <li>Background service with purple gradient tray icon</li>
          <li>Auto-starts with your OS</li>
        </ul>
      </div>
      
      <div style="margin: 16px 0;">
        <div style="font-weight: 600; color: #475569; margin-bottom: 8px;">Installation Steps:</div>
        <ol style="padding-left: 20px; margin: 0; line-height: 1.8; color: #64748b;">
          <li>Download the daemon for <strong>${platformName}</strong></li>
          <li>Extract the archive</li>
          <li>Run the installer (install-${platformName.toLowerCase()}.sh or .bat)</li>
          <li>Reload this extension</li>
        </ol>
      </div>
      
      <div class="modal-info">
        ✅ After installation, the daemon runs automatically in the background (system tray icon)<br>
        ✅ Enables server management: start, stop, restart localhost servers<br>
        ✅ Auto-starts with your computer - no manual launch needed
      </div>
      
      ${platformName === 'Windows' ? `
      <div class="modal-warning" style="margin-top: 12px; padding: 10px; background: rgba(251, 191, 36, 0.1); border-left: 3px solid #fbbf24; border-radius: 4px; font-size: 12px;">
        <strong>⚠️ Windows SmartScreen Warning:</strong><br>
        When you run the installer, Windows will show "Windows protected your PC".<br>
        <strong>This is normal for unsigned apps.</strong><br>
        <br>
        <strong>To install:</strong><br>
        1️⃣ Click <strong>"More info"</strong> link<br>
        2️⃣ Click <strong>"Run anyway"</strong> button<br>
        3️⃣ Continue with installation
      </div>
      ` : ''}
    `;
    
    const result = await showCustomModal({
      icon: '🔌',
      title: 'Install HighlightAssist Daemon',
      body: installHTML,
      buttons: [
        { text: 'Not Now', value: false, primary: false },
        { 
          text: `Download for ${platformName}`, 
          value: true, 
          primary: true,
          onClick: async () => {
            // Open download link in new tab
            await chrome.tabs.create({ url: downloadLink });
            // Small delay to ensure tab opens before modal closes
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      ]
    });
    
    return result;
  }

  // Shared function to add server launcher button handlers
  function addServerLauncherHandlers() {
    // Start dev server button
    const startBtn = document.getElementById('startDevServer');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        // Check if daemon is connected first
        if (!daemonConnected) {
          await showDaemonInstallPrompt();
          return;
        }
        
        // Server type selection with custom modal
        const serverTypes = [
          { name: 'Vite', desc: 'React/Vue/Svelte', cmd: 'npm run dev', port: 5173 },
          { name: 'Create React App', desc: 'React', cmd: 'npm start', port: 3000 },
          { name: 'Next.js', desc: 'React Framework', cmd: 'npm run dev', port: 3000 },
          { name: 'Angular', desc: 'Angular CLI', cmd: 'ng serve', port: 4200 },
          { name: 'Python HTTP', desc: 'Simple Server', cmd: 'python -m http.server', port: 8000 },
          { name: 'Flask', desc: 'Python Web', cmd: 'flask run', port: 5000 },
          { name: 'Custom', desc: 'Your Command', cmd: null, port: null }
        ];
        
        // Build server selection list
        let listHTML = '<div class="modal-subtitle">Select your project type:</div>';
        listHTML += '<ul class="modal-list">';
        serverTypes.forEach((type, i) => {
          listHTML += `
            <li class="modal-list-item" data-index="${i}">
              <strong>${type.name}</strong> - ${type.desc}
              ${type.cmd ? `<br><span style="font-size: 12px; color: #64748b; font-family: monospace;">${type.cmd} (port ${type.port})</span>` : ''}
            </li>
          `;
        });
        listHTML += '</ul>';
        
        const choice = await showCustomModal({
          icon: '⚡',
          title: 'Start Development Server',
          body: listHTML,
          buttons: [
            { text: 'Cancel', value: null, primary: false }
          ]
        });
        
        // Add click handlers to list items
        setTimeout(() => {
          document.querySelectorAll('.modal-list-item').forEach(item => {
            item.addEventListener('click', async () => {
              const index = parseInt(item.getAttribute('data-index'));
              const selected = serverTypes[index];
              let command = selected.cmd;
              let port = selected.port;
              
              // Close selection modal
              document.getElementById('customModal').classList.remove('active');
              
              // If custom command, ask for details
              if (!command) {
                const customHTML = `
                  <div class="modal-subtitle">Enter your server start command:</div>
                  <input type="text" class="modal-input" id="customCommand" placeholder="npm run dev" value="npm run dev">
                  <div class="modal-subtitle" style="margin-top: 16px;">Enter the port:</div>
                  <input type="number" class="modal-input" id="customPort" placeholder="3000" value="3000">
                `;
                
                await showCustomModal({
                  icon: '⚙️',
                  title: 'Custom Server Configuration',
                  body: customHTML,
                  buttons: [
                    { text: 'Cancel', value: null, primary: false },
                    { 
                      text: 'Continue', 
                      value: true, 
                      primary: true,
                      onClick: () => {
                        command = document.getElementById('customCommand').value;
                        port = document.getElementById('customPort').value;
                        if (command && port) {
                          showInstructions(command, port);
                        }
                      }
                    }
                  ]
                });
                
                // Focus first input
                setTimeout(() => document.getElementById('customCommand')?.focus(), 100);
                return;
              }
              
              // Show folder selection and execute command via daemon
              showFolderSelectionAndExecute(command, port);
            });
          });
        }, 100);
        
        async function showFolderSelectionAndExecute(command, port) {
          // Scan for running localhost servers first
          const runningServers = await scanRunningLocalhostServers();
          
          // Get recent projects
          const recentProjects = await getRecentProjects();
          
          // Build running servers section
          let runningServersHTML = '';
          if (runningServers.length > 0) {
            runningServersHTML = `
              <div style="background: #ecfdf5; border-left: 3px solid #10b981; padding: 12px; margin-bottom: 16px; border-radius: 6px;">
                <div style="font-weight: 600; color: #065f46; margin-bottom: 8px;">✅ Running Servers Detected:</div>
                ${runningServers.map(server => `
                  <button class="detected-server-btn" data-port="${server.port}" style="width: 100%; text-align: left; padding: 8px 12px; margin: 4px 0; background: white; border: 1px solid #d1fae5; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
                    <div style="font-weight: 600; color: #059669;">localhost:${server.port}</div>
                    <div style="font-size: 11px; color: #6b7280;">${server.type || 'Development server'}</div>
                  </button>
                `).join('')}
              </div>
            `;
          }
          
          // Build recent projects section
          let recentProjectsHTML = '';
          if (recentProjects.length > 0) {
            recentProjectsHTML = `
              <div style="margin-bottom: 16px;">
                <div class="modal-subtitle">Recent Projects:</div>
                <select class="modal-input" id="recentProjects" style="margin-bottom: 8px;">
                  <option value="">-- Select a recent project --</option>
                  ${recentProjects.map(proj => `
                    <option value="${proj.path}">${proj.name} (${proj.path})</option>
                  `).join('')}
                </select>
              </div>
            `;
          }
          
          const folderHTML = `
            ${runningServersHTML}
            
            ${recentProjectsHTML}
            
            <div class="modal-subtitle">Or browse for project folder:</div>
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <input type="text" class="modal-input" id="projectPath" placeholder="Paste path or click Browse..." value="" style="flex: 1;">
              <button id="browseFolderBtn" style="padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; white-space: nowrap;">
                📁 Browse
              </button>
            </div>
            
            <div class="modal-info" style="margin-bottom: 12px;">
              💡 <strong>Tip:</strong> Extension will auto-detect dev server command from package.json, requirements.txt, etc.
            </div>
            
            <div class="modal-subtitle">Command to execute:</div>
            <input type="text" class="modal-input" id="executeCommand" value="${command}" style="background: #f1f5f9;">
          `;
          
          const result = await showCustomModal({
            icon: '📁',
            title: 'Select Project Folder',
            body: folderHTML,
            buttons: [
              { text: 'Cancel', value: null, primary: false },
              { 
                text: '🚀 Start Server', 
                value: true, 
                primary: true,
                onClick: async () => {
                  const projectPath = document.getElementById('projectPath').value;
                  if (!projectPath) {
                    alert('Please select a project folder or detected server');
                    return;
                  }
                  
                  // Auto-detect command if not specified
                  let finalCommand = document.getElementById('executeCommand').value;
                  if (!finalCommand || finalCommand === command) {
                    finalCommand = await autoDetectDevCommand(projectPath) || command;
                  }
                  
                  // Send command to daemon via WebSocket
                  await executeCommandViaDaemon(finalCommand, projectPath, port);
                }
              }
            ]
          });
          
          // Setup event handlers after modal renders
          setTimeout(() => {
            // Recent projects dropdown
            const recentSelect = document.getElementById('recentProjects');
            if (recentSelect) {
              recentSelect.addEventListener('change', (e) => {
                const input = document.getElementById('projectPath');
                if (input && e.target.value) {
                  input.value = e.target.value;
                }
              });
            }
            
            // Detected server buttons
            const serverBtns = document.querySelectorAll('.detected-server-btn');
            serverBtns.forEach(btn => {
              btn.addEventListener('click', async () => {
                const port = btn.dataset.port;
                chrome.tabs.create({ url: `http://localhost:${port}` });
              });
              
              // Hover effect
              btn.addEventListener('mouseenter', () => {
                btn.style.background = '#d1fae5';
                btn.style.transform = 'translateX(4px)';
              });
              btn.addEventListener('mouseleave', () => {
                btn.style.background = 'white';
                btn.style.transform = 'translateX(0)';
              });
            });
            
            // Browse folder button
            const browseBtn = document.getElementById('browseFolderBtn');
            const projectPathInput = document.getElementById('projectPath');
            
            if (browseBtn && projectPathInput) {
              browseBtn.addEventListener('click', async () => {
                // Show OS-specific instructions with visual guide
                const platform = navigator.platform.toLowerCase();
                let instructions = '';
                let example = '';
                
                if (platform.includes('win')) {
                  instructions = `
                    <div style="text-align: left; line-height: 1.8;">
                      <strong>Windows:</strong><br>
                      1️⃣ Open <strong>File Explorer</strong><br>
                      2️⃣ Navigate to your project folder<br>
                      3️⃣ Click the <strong>address bar</strong> at top<br>
                      4️⃣ Press <kbd>Ctrl+C</kbd> to copy<br>
                      5️⃣ Come back here and paste with <kbd>Ctrl+V</kbd>
                    </div>
                  `;
                  example = 'C:\\Users\\YourName\\Projects\\MyApp';
                } else if (platform.includes('mac')) {
                  instructions = `
                    <div style="text-align: left; line-height: 1.8;">
                      <strong>macOS:</strong><br>
                      1️⃣ Open <strong>Finder</strong><br>
                      2️⃣ Navigate to your project folder<br>
                      3️⃣ Right-click the folder → <strong>"Get Info"</strong><br>
                      4️⃣ Find "Where:" and copy the path<br>
                      5️⃣ Come back here and paste
                    </div>
                  `;
                  example = '/Users/YourName/Projects/MyApp';
                } else {
                  instructions = `
                    <div style="text-align: left; line-height: 1.8;">
                      <strong>Linux:</strong><br>
                      1️⃣ Open your file manager<br>
                      2️⃣ Navigate to your project folder<br>
                      3️⃣ Copy the path from address bar<br>
                      4️⃣ Or right-click → Properties → copy location<br>
                      5️⃣ Come back here and paste
                    </div>
                  `;
                  example = '/home/username/projects/myapp';
                }
                
                const helpHTML = `
                  <div style="padding: 20px;">
                    ${instructions}
                    <div style="background: #f1f5f9; padding: 12px; margin-top: 16px; border-radius: 6px; font-family: monospace; font-size: 11px; color: #64748b;">
                      Example: ${example}
                    </div>
                  </div>
                `;
                
                showCustomModal({
                  icon: '📂',
                  title: 'How to Get Folder Path',
                  body: helpHTML,
                  buttons: [{ text: 'Got it', value: true, primary: true }]
                });
              });
            }
            
            // Auto-focus input
            const input = document.getElementById('projectPath');
            if (input) {
              chrome.storage.local.get(['lastProjectPath'], (data) => {
                if (data.lastProjectPath) {
                  input.value = data.lastProjectPath;
                }
              });
              input.focus();
            }
          }, 100);
        }
        
        async function executeCommandViaDaemon(command, cwd, port) {
          try {
            // Save path for next time
            chrome.storage.local.set({ lastProjectPath: cwd });
            
            // Save to recent projects
            const projectName = cwd.split(/[/\\]/).pop() || 'Project';
            await saveToRecentProjects(cwd, projectName);
            
            // Show loading state
            const loadingHTML = `
              <div style="text-align: center; padding: 20px;">
                <div style="font-size: 40px; margin-bottom: 16px;">⏳</div>
                <div style="font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">Starting Server...</div>
                <div style="font-size: 12px; color: #64748b;">
                  Running: <code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${command}</code><br>
                  In: <code style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 10px;">${cwd}</code>
                </div>
              </div>
            `;
            
            showCustomModal({
              icon: '🚀',
              title: 'Executing Command',
              body: loadingHTML,
              buttons: []
            });
            
            // Connect to WebSocket bridge
            const ws = new WebSocket('ws://localhost:5055/ws');
            
            ws.onopen = () => {
              console.log('WebSocket connected to daemon bridge');
              
              // Send command execution request
              const request = {
                type: 'execute_command',
                data: {
                  command: command,
                  cwd: cwd,
                  port: port,
                  timestamp: new Date().toISOString()
                }
              };
              
              ws.send(JSON.stringify(request));
              console.log('Command sent to daemon:', request);
            };
            
            ws.onmessage = (event) => {
              const response = JSON.parse(event.data);
              console.log('Daemon response:', response);
              
              if (response.type === 'command_started') {
                // Command started successfully
                
                // Add server to running servers Map
                runningServers.set(port, {
                  name: selectedServerType.name,
                  command: command,
                  pid: response.pid,
                  cwd: cwd
                });
                
                // Update server management UI
                updateServerManagement();
                
                // Save to storage for persistence
                chrome.storage.local.set({ runningServers: Array.from(runningServers.entries()) });
                
                setTimeout(() => {
                  document.getElementById('customModal').classList.remove('active');
                  
                  // Show success and open localhost tab
                  const successHTML = `
                    <div style="text-align: center; padding: 20px;">
                      <div style="font-size: 40px; margin-bottom: 16px;">✅</div>
                      <div style="font-size: 14px; font-weight: 600; color: #059669; margin-bottom: 8px;">Server Started!</div>
                      <div style="font-size: 12px; color: #64748b; margin-bottom: 16px;">
                        Your development server is now running on port ${port}
                      </div>
                    </div>
                  `;
                  
                  showCustomModal({
                    icon: '🎉',
                    title: 'Success',
                    body: successHTML,
                    buttons: [
                      { 
                        text: `Open localhost:${port}`, 
                        value: true, 
                        primary: true,
                        onClick: () => {
                          chrome.tabs.create({ url: `http://localhost:${port}` });
                          window.close();
                        }
                      }
                    ]
                  });
                }, 1000);
                
                ws.close();
              } else if (response.type === 'command_error') {
                // Command failed
                document.getElementById('customModal').classList.remove('active');
                
                const errorHTML = `
                  <div style="padding: 12px; background: #fee2e2; border-radius: 6px; margin-bottom: 12px;">
                    <div style="font-weight: 600; color: #991b1b; margin-bottom: 4px;">❌ Error</div>
                    <div style="font-size: 11px; color: #7f1d1d; font-family: monospace;">${response.error || 'Unknown error'}</div>
                  </div>
                  <div class="modal-subtitle">You can try running the command manually:</div>
                  <ol style="padding-left: 20px; margin: 8px 0; line-height: 1.6; color: #64748b; font-size: 11px;">
                    <li>Open terminal in: <code style="font-family: monospace;">${cwd}</code></li>
                    <li>Run: <code style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">${command}</code></li>
                  </ol>
                `;
                
                showCustomModal({
                  icon: '⚠️',
                  title: 'Command Failed',
                  body: errorHTML,
                  buttons: [
                    { text: 'Close', value: false, primary: true }
                  ]
                });
                
                ws.close();
              }
            };
            
            ws.onerror = (error) => {
              console.error('WebSocket error:', error);
              document.getElementById('customModal').classList.remove('active');
              
              const errorHTML = `
                <div class="modal-subtitle">Unable to connect to daemon bridge.</div>
                <div class="modal-info">
                  The daemon may have stopped. Try restarting it or run the command manually.
                </div>
              `;
              
              showCustomModal({
                icon: '❌',
                title: 'Connection Error',
                body: errorHTML,
                buttons: [
                  { text: 'Close', value: false, primary: true }
                ]
              });
            };
            
            // Timeout after 30 seconds
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
                document.getElementById('customModal').classList.remove('active');
                
                showCustomModal({
                  icon: '⏱️',
                  title: 'Timeout',
                  body: '<div class="modal-subtitle">Command execution timed out. The server may still be starting in the background.</div>',
                  buttons: [
                    { 
                      text: `Try opening localhost:${port}`, 
                      value: true, 
                      primary: true,
                      onClick: () => {
                        chrome.tabs.create({ url: `http://localhost:${port}` });
                        window.close();
                      }
                    }
                  ]
                });
              }
            }, 30000);
            
          } catch (error) {
            console.error('Error executing command:', error);
            document.getElementById('customModal').classList.remove('active');
            
            showCustomModal({
              icon: '❌',
              title: 'Error',
              body: `<div class="modal-subtitle">Failed to execute command: ${error.message}</div>`,
              buttons: [
                { text: 'Close', value: false, primary: true }
              ]
            });
          }
        }
      });
    }
    
    // Connect to localhost button
    const connectBtn = document.getElementById('connectToLocalhost');
    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        const portHTML = `
          <div class="modal-subtitle">Enter the port number for your localhost server:</div>
          <input type="number" class="modal-input" id="portInput" placeholder="3000" value="3000" autofocus>
          <div class="modal-info" style="margin-top: 12px;">
            <strong>Common ports:</strong><br>
            • 3000 (React/Next.js)<br>
            • 5173 (Vite)<br>
            • 8080 (Generic)<br>
            • 4200 (Angular)<br>
            • 5000 (Flask)<br>
            • 8000 (Python HTTP)
          </div>
        `;
        
        const result = await showCustomModal({
          icon: '🌐',
          title: 'Connect to Localhost',
          body: portHTML,
          buttons: [
            { text: 'Cancel', value: null, primary: false },
            { 
              text: 'Connect', 
              value: true, 
              primary: true,
              onClick: () => {
                const port = document.getElementById('portInput').value;
                if (port && !isNaN(port)) {
                  const url = `http://localhost:${port}`;
                  chrome.tabs.create({ url });
                  window.close();
                } else {
                  alert('Please enter a valid port number');
                }
              }
            }
          ]
        });
        
        // Focus input and handle Enter key
        setTimeout(() => {
          const input = document.getElementById('portInput');
          if (input) {
            input.focus();
            input.select();
            input.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') {
                document.querySelector('.modal-btn-primary').click();
              }
            });
          }
        }, 100);
      });
    }
  }

  // TODO: Move popup styles to popup.css for better performance and caching
  // (Styles for .localhost-link, .title, .short)

  if (!isLocalhost) {
    // Find all localhost tabs
    const allTabs = await chrome.tabs.query({});
    const localhostTabs = allTabs.filter(t => isLocalDevelopment(t.url));

    if (localhostTabs.length > 0) {
      // Show clickable links to localhost tabs + option to start new server
      let html = '<div style="display: flex; align-items: center; gap: 12px;"><div class="status-icon">⚠️</div><div>Not on localhost</div></div>';
      html += '<div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Click to switch to existing tab:</div>';
      html += '<div style="max-height: 120px; overflow-y: auto; margin-top: 6px;">';

      localhostTabs.forEach((localhostTab, index) => {
        const tabTitle = localhostTab.title.substring(0, 40) + (localhostTab.title.length > 40 ? '...' : '');
        const tabUrl = new URL(localhostTab.url);
        const shortUrl = tabUrl.hostname + ':' + (tabUrl.port || '80') + tabUrl.pathname.substring(0, 20);

        html += `<div class="localhost-link" data-tab-id="${localhostTab.id}" data-window-id="${localhostTab.windowId}" style="
          padding: 8px;
          margin: 4px 0;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        ">
          <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 2px;">🌐 ${tabTitle}</div>
          <div style="font-size: 11px; color: #64748b; font-family: monospace;">${shortUrl}</div>
        </div>`;
      });

      html += '</div>';
      
      // Add "or start new server" section
      html += '<div style="font-size: 10px; color: #94a3b8; margin-top: 8px; text-align: center;">OR</div>';
      html += `
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button id="startDevServer" class="server-btn-start" style="
            flex: 1;
            padding: 10px 12px;
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 3px 10px rgba(139, 92, 246, 0.3);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          ">
            <span>⚡</span> Start New
          </button>
          
          <button id="connectToLocalhost" class="server-btn-connect" style="
            flex: 1;
            padding: 10px 12px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          ">
            <span>🌐</span> Connect
          </button>
        </div>
      `;

      statusDiv.innerHTML = html;
      statusDiv.className = 'status-card inactive';

      // Add click handlers to switch to localhost tabs
      setTimeout(() => {
        document.querySelectorAll('.localhost-link').forEach(link => {
          // Add hover effect
          link.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(59, 130, 246, 0.2)';
          });
          link.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(59, 130, 246, 0.1)';
          });
          
          // Add click handler
          link.addEventListener('click', async () => {
            const tabId = parseInt(link.getAttribute('data-tab-id'));
            const windowId = parseInt(link.getAttribute('data-window-id'));
            await chrome.windows.update(windowId, { focused: true });
            await chrome.tabs.update(tabId, { active: true });
            window.close(); // Close popup after switching
          });
        });
        
        // Add hover effects to server buttons
        document.querySelectorAll('.server-btn-start, .server-btn-connect').forEach(btn => {
          btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            if (this.classList.contains('server-btn-start')) {
              this.style.boxShadow = '0 5px 14px rgba(139, 92, 246, 0.4)';
            } else {
              this.style.boxShadow = '0 5px 14px rgba(16, 185, 129, 0.4)';
            }
          });
          btn.addEventListener('mouseleave', function() {
            this.style.transform = '';
            if (this.classList.contains('server-btn-start')) {
              this.style.boxShadow = '0 3px 10px rgba(139, 92, 246, 0.3)';
            } else {
              this.style.boxShadow = '0 3px 10px rgba(16, 185, 129, 0.3)';
            }
          });
        });
        
        // Add server launcher buttons (same logic as no-localhost case)
        addServerLauncherHandlers();
      }, 100);
    } else {
      // Allow user to start or connect to localhost
      statusDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="status-icon">⚠️</div>
          <div>No localhost server detected</div>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">Start a dev server or connect to existing one:</div>
        
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button id="startDevServer" class="server-btn-start" style="
            flex: 1;
            padding: 12px 16px;
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          ">
            <span>⚡</span> Start Server
          </button>
          
          <button id="connectToLocalhost" class="server-btn-connect" style="
            flex: 1;
            padding: 12px 16px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          ">
            <span>🌐</span> Connect
          </button>
        </div>
        
        <div style="font-size: 10px; color: #94a3b8; margin-top: 8px; text-align: center;">
          Start: Launch dev server in terminal • Connect: Open existing server
        </div>
      `;
      statusDiv.className = 'status-card inactive';

      // Add click handlers
      setTimeout(() => {
        // Add hover effects to server buttons
        document.querySelectorAll('.server-btn-start, .server-btn-connect').forEach(btn => {
          btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            if (this.classList.contains('server-btn-start')) {
              this.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
            } else {
              this.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
            }
          });
          btn.addEventListener('mouseleave', function() {
            this.style.transform = '';
            if (this.classList.contains('server-btn-start')) {
              this.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
            } else {
              this.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }
          });
        });
        
        addServerLauncherHandlers();
      }, 100);
    }
    
    // Disable buttons when not on localhost
    toggleBtn.disabled = true;
    openGuiBtn.disabled = true;
    toggleBtn.style.opacity = '0.5';
    openGuiBtn.style.opacity = '0.5';
    toggleBtn.style.cursor = 'not-allowed';
    openGuiBtn.style.cursor = 'not-allowed';
    return; // Exit early to prevent normal UI update
  }

  // Check if tool is active
  chrome.storage.local.get(['highlightAssistActive'], (result) => {
    const isActive = result.highlightAssistActive || false;
    updateUI(isActive);
  });

  // Debounce helper
  function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
      if (timer) return;
      timer = setTimeout(() => {
        fn.apply(this, args);
        timer = null;
      }, delay);
    };
  }

  // Toggle inspection button click (debounced)
  toggleBtn.addEventListener('click', debounce(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    toggleBtn.disabled = true;
    toggleBtn.innerHTML = '<span>⏳</span> Loading...';
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleInspecting' });
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
  }, 400));

  // Open GUI Panel button (debounced)
  openGuiBtn.addEventListener('click', debounce(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'showGui' });
      window.close();
    } catch (error) {
      console.error('Failed to open GUI:', error);
      showError('Extension not loaded. Please refresh the page.');
    }
  }, 400));

  // Simple folder browser - no framework selection needed
  async function showSimpleFolderBrowser() {
    // Scan for running localhost servers first
    const runningServers = await scanRunningLocalhostServers();
    
    // Get recent projects
    const recentProjects = await getRecentProjects();
    
    // Build running servers section
    let runningServersHTML = '';
    if (runningServers.length > 0) {
      runningServersHTML = `
        <div style="background: #ecfdf5; border-left: 3px solid #10b981; padding: 12px; margin-bottom: 16px; border-radius: 6px;">
          <div style="font-weight: 600; color: #065f46; margin-bottom: 8px;">✅ Running Servers Detected:</div>
          ${runningServers.map(server => `
            <button class="detected-server-btn" data-port="${server.port}" style="width: 100%; text-align: left; padding: 8px 12px; margin: 4px 0; background: white; border: 1px solid #d1fae5; border-radius: 4px; cursor: pointer; transition: all 0.2s;">
              <div style="font-weight: 600; color: #059669;">localhost:${server.port}</div>
              <div style="font-size: 11px; color: #6b7280;">${server.type || 'Development server'} - Click to open</div>
            </button>
          `).join('')}
        </div>
      `;
    }
    
    // Build recent projects section
    let recentProjectsHTML = '';
    if (recentProjects.length > 0) {
      recentProjectsHTML = `
        <div style="margin-bottom: 16px;">
          <div class="modal-subtitle">📂 Recent Projects:</div>
          <select class="modal-input" id="recentProjects" style="margin-bottom: 8px;">
            <option value="">-- Select a recent project --</option>
            ${recentProjects.map(proj => `
              <option value="${proj.path}">${proj.name}</option>
            `).join('')}
          </select>
        </div>
      `;
    }
    
    const platform = navigator.platform.toLowerCase();
    let browseInstructions = '';
    
    if (platform.includes('win')) {
      browseInstructions = `
        <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 12px; line-height: 1.6; margin-bottom: 12px;">
          <strong>📁 How to get folder path:</strong><br>
          1. Open File Explorer → Navigate to project<br>
          2. Click address bar at top<br>
          3. Copy path (Ctrl+C) and paste below
        </div>
      `;
    } else if (platform.includes('mac')) {
      browseInstructions = `
        <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 12px; line-height: 1.6; margin-bottom: 12px;">
          <strong>📁 How to get folder path:</strong><br>
          1. Open Finder → Navigate to project<br>
          2. Right-click folder → "Get Info"<br>
          3. Copy "Where" path and paste below
        </div>
      `;
    } else {
      browseInstructions = `
        <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 12px; line-height: 1.6; margin-bottom: 12px;">
          <strong>📁 How to get folder path:</strong><br>
          Open terminal, navigate to project, and run: <code>pwd</code>
        </div>
      `;
    }
    
    const folderHTML = `
      ${runningServersHTML}
      ${recentProjectsHTML}
      
      ${browseInstructions}
      
      <div class="modal-subtitle">Project Folder Path:</div>
      <input type="text" class="modal-input" id="projectPath" placeholder="Paste your project folder path here..." style="margin-bottom: 12px;">
      
      <div class="modal-info">
        💡 <strong>Auto-detection:</strong> Extension will scan your project and detect:
        <ul style="margin: 8px 0 0 20px; font-size: 12px;">
          <li>npm/yarn/pnpm scripts from package.json</li>
          <li>Python virtual environments (.venv, venv)</li>
          <li>requirements.txt or pyproject.toml</li>
          <li>Common dev server commands</li>
        </ul>
      </div>
    `;
    
    const result = await showCustomModal({
      icon: '📁',
      title: 'Select Your Project Folder',
      body: folderHTML,
      buttons: [
        { text: 'Cancel', value: null, primary: false },
        { 
          text: '🔍 Auto-Detect & Start', 
          value: true, 
          primary: true,
          onClick: async () => {
            const projectPath = document.getElementById('projectPath').value.trim();
            if (!projectPath) {
              alert('❌ Please enter your project folder path');
              return false; // Keep modal open
            }
            
            // Send to daemon to auto-detect and start
            await autoDetectAndStartServer(projectPath);
            return true; // Close modal
          }
        }
      ]
    });
    
    // Setup event handlers after modal renders
    setTimeout(() => {
      // Recent projects dropdown
      const recentSelect = document.getElementById('recentProjects');
      if (recentSelect) {
        recentSelect.addEventListener('change', (e) => {
          const input = document.getElementById('projectPath');
          if (input && e.target.value) {
            input.value = e.target.value;
          }
        });
      }
      
      // Detected server buttons
      const serverBtns = document.querySelectorAll('.detected-server-btn');
      serverBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
          const port = btn.dataset.port;
          chrome.tabs.create({ url: `http://localhost:${port}` });
          document.getElementById('customModal').classList.remove('active');
        });
        
        // Hover effect
        btn.addEventListener('mouseenter', () => {
          btn.style.background = '#d1fae5';
          btn.style.transform = 'translateX(4px)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'white';
          btn.style.transform = 'translateX(0)';
        });
      });
    }, 100);
  }

  // Auto-detect project type and start server
  async function autoDetectAndStartServer(projectPath) {
    try {
      // Show loading state
      showCustomModal({
        icon: '⏳',
        title: 'Auto-Detecting Project...',
        body: '<div style="text-align: center; padding: 20px;">Scanning your project folder...</div>',
        buttons: []
      });
      
      // Send to daemon to detect project type
      const ws = new WebSocket('ws://localhost:5055/ws');
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'auto_detect_project',
          data: { path: projectPath }
        }));
      };
      
      ws.onmessage = async (event) => {
        const response = JSON.parse(event.data);
        
        if (response.type === 'project_detected') {
          const { command, port, projectType, venv } = response.data;
          
          // Show confirmation with detected info
          const confirmHTML = `
            <div style="background: #ecfdf5; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
              <div style="font-weight: 600; color: #065f46; margin-bottom: 8px;">✅ Project Detected:</div>
              <div style="font-size: 13px; color: #047857;">
                <strong>Type:</strong> ${projectType}<br>
                ${venv ? `<strong>Virtual Env:</strong> ${venv}<br>` : ''}
                <strong>Command:</strong> <code>${command}</code><br>
                <strong>Port:</strong> ${port}
              </div>
            </div>
            <div class="modal-info">Ready to start your development server?</div>
          `;
          
          const confirm = await showCustomModal({
            icon: '🚀',
            title: 'Start Development Server?',
            body: confirmHTML,
            buttons: [
              { text: 'Cancel', value: false, primary: false },
              { text: '🚀 Start Server', value: true, primary: true }
            ]
          });
          
          if (confirm) {
            // Execute the detected command
            ws.send(JSON.stringify({
              type: 'execute_command',
              data: { command, cwd: projectPath, port }
            }));
            
            // Save to recent projects
            const projectName = projectPath.split(/[\\/]/).pop();
            await saveToRecentProjects(projectPath, projectName);
            
            showSuccess(`✅ Server started on port ${port}!`);
          }
        } else if (response.type === 'error') {
          showError(`❌ ${response.message || 'Failed to detect project type'}`);
        }
        
        ws.close();
      };
      
      ws.onerror = () => {
        showError('❌ Failed to connect to daemon. Make sure it\'s running.');
      };
      
    } catch (error) {
      console.error('Auto-detect error:', error);
      showError('❌ Failed to auto-detect project: ' + error.message);
    }
  }

  // Start New Server button
  const startNewServerBtn = document.getElementById('startNewServerBtn');
  if (startNewServerBtn) {
    startNewServerBtn.addEventListener('click', async () => {
      // Simplified: Just show folder browser, no framework selection
      await showSimpleFolderBrowser();
    });
    
    // Hover effect
    startNewServerBtn.addEventListener('mouseenter', () => {
      startNewServerBtn.style.transform = 'translateY(-2px)';
      startNewServerBtn.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
    });
    startNewServerBtn.addEventListener('mouseleave', () => {
      startNewServerBtn.style.transform = 'translateY(0)';
      startNewServerBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
    });
  }

  // Export Logs button (debounced)
  document.getElementById('exportLogsBtn').addEventListener('click', debounce(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const format = prompt('Export format (json/text/csv):', 'json');
    if (!format) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'exportLogs', format });
      showSuccess('Logs exported successfully!');
    } catch (error) {
      console.error('Failed to export logs:', error);
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
  }, 400));

  // Enhanced Settings button functionality for cross-browser compatibility (debounced, non-blocking notification)
  settingsBtn.addEventListener('click', debounce(async () => {
    try {
      const storage = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) ? chrome.storage.local :
                      (typeof browser !== 'undefined' && browser.storage && browser.storage.local) ? browser.storage.local : null;
      if (!storage) {
        showError('Settings are not supported in this browser. Please use a compatible browser like Chrome, Firefox, or Opera.');
        return;
      }
      const result = await storage.get([
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
      const message = `HighlightAssist Stats:\nTotal Logs: ${stats.totalLogs}\nCritical Errors: ${stats.criticalErrors}\nLast Saved: ${lastSaved}\n` +
        Object.entries(stats.byLevel).map(([level, count]) => `  ${level}: ${count}`).join('\n');
      showSuccess(message);
      console.log('Full settings:', result);
    } catch (error) {
      showError('Failed to load settings. Please try again later.');
      console.error('Settings button error:', error);
    }
  }, 400));

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
