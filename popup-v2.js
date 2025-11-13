/**
 * HighlightAssist v2.0 - Modern Popup Controller
 * Professional localhost management system
 */

class PopupController {
    constructor() {
        this.daemonRunning = false;
        this.bridgeRunning = false;
        this.servers = [];
        this.updateInterval = null;
        this.modalOpen = false; // Prevent multiple modals
    }

    async init() {
        console.log('[Popup] Initializing v2.0...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Detect OS and setup download links
        this.setupDownloadLinks();
        
        // Initial status check (MUST happen before scanServers)
        await this.checkStatuses();
        
        // Load servers only if bridge is running
        if (this.bridgeRunning) {
            await this.scanServers();
        } else {
            console.log('[Popup] Bridge not running, skipping server scan');
        }
        
        // Start periodic updates (every 5 seconds)
        this.updateInterval = setInterval(() => this.checkStatuses(), 5000);
    }

    setupDownloadLinks() {
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = navigator.platform.toLowerCase();
        const version = '2.0.0'; // Update this when version changes
        
        let detectedOS = 'Windows';
        let downloadUrl = `https://github.com/Skullcandyxxx/HighlightAssist/releases/download/v${version}/HighlightAssist-Setup-v${version}.exe`;
        let fileSize = '~15 MB';
        let icon = '🪟';
        let fileName = `HighlightAssist-Setup-v${version}.exe`;
        let installType = 'installer';
        
        // Detect OS
        if (userAgent.indexOf('mac') !== -1 || platform.indexOf('mac') !== -1) {
            detectedOS = 'macOS';
            fileName = `HighlightAssist-macOS-v${version}.tar.gz`;
            downloadUrl = `https://github.com/Skullcandyxxx/HighlightAssist/releases/download/v${version}/${fileName}`;
            fileSize = '~8 MB';
            icon = '🍎';
            installType = 'package';
        } else if (userAgent.indexOf('linux') !== -1 || platform.indexOf('linux') !== -1) {
            detectedOS = 'Linux';
            fileName = `HighlightAssist-Linux-v${version}.deb`;
            downloadUrl = `https://github.com/Skullcandyxxx/HighlightAssist/releases/download/v${version}/${fileName}`;
            fileSize = '~10 MB';
            icon = '🐧';
            installType = 'package';
        }
        
        // Update detected OS text
        const detectedOSElement = document.getElementById('detectedOS');
        if (detectedOSElement) {
            detectedOSElement.textContent = detectedOS;
        }
        
        // Update description for packages
        const installerDesc = document.getElementById('installerDesc');
        if (installerDesc) {
            if (installType === 'package') {
                installerDesc.textContent = `Native ${detectedOS} package - easy installation`;
            } else {
                installerDesc.textContent = `Direct download - no GitHub account needed`;
            }
        }
        
        // Create download buttons
        const downloadButtons = document.getElementById('downloadButtons');
        if (downloadButtons) {
            downloadButtons.innerHTML = ''; // Clear existing
            
            // Primary download button for detected OS
            const primaryButton = document.createElement('a');
            primaryButton.href = downloadUrl;
            primaryButton.className = 'btn btn-primary btn-sm';
            primaryButton.style.textDecoration = 'none';
            primaryButton.innerHTML = `${icon} Download for ${detectedOS} <span style="opacity: 0.8; font-size: 10px;">(${fileSize})</span>`;
            primaryButton.download = fileName;
            downloadButtons.appendChild(primaryButton);
            
            // For Linux, add alternative formats
            if (detectedOS === 'Linux') {
                const rpmButton = document.createElement('a');
                rpmButton.href = `https://github.com/Skullcandyxxx/HighlightAssist/releases/download/v${version}/HighlightAssist-Linux-v${version}.rpm`;
                rpmButton.className = 'btn btn-secondary btn-sm';
                rpmButton.style.textDecoration = 'none';
                rpmButton.innerHTML = '📦 Download RPM (Fedora/RHEL)';
                rpmButton.download = `HighlightAssist-Linux-v${version}.rpm`;
                downloadButtons.appendChild(rpmButton);
            }
            
            // Secondary link to all downloads
            const allDownloadsLink = document.createElement('a');
            allDownloadsLink.href = `https://github.com/Skullcandyxxx/HighlightAssist/releases/tag/v${version}`;
            allDownloadsLink.className = 'btn btn-secondary btn-sm';
            allDownloadsLink.style.textDecoration = 'none';
            allDownloadsLink.target = '_blank';
            allDownloadsLink.innerHTML = '📦 All Downloads (Windows, macOS, Linux)';
            downloadButtons.appendChild(allDownloadsLink);
        }
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.scanServers();
        });

        // Start inspect button
        document.getElementById('startInspectBtn')?.addEventListener('click', () => {
            this.startInspecting();
        });

        // Start New Server button
        document.getElementById('startNewServerBtn')?.addEventListener('click', async () => {
            await this.showFolderBrowser();
        });

        // Settings button
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            // TODO: Open settings page
            console.log('Settings clicked');
        });

        // Docs link
        document.getElementById('docsLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://github.com/Skullcandyxxx/HighlightAssist' });
        });
    }

    async checkStatuses() {
        // Check daemon (health server on port 5056)
        try {
            const response = await fetch('http://localhost:5056/ping', {
                method: 'GET',
                signal: AbortSignal.timeout(5000) // 5 seconds - bridge can be slow in thread mode
            });
            
            if (response.ok) {
                this.daemonRunning = true;
                this.updateStatusPill('daemonStatus', true);
                this.toggleInstallSection(false); // Hide installation section
                
                // If daemon is running, check bridge
                await this.checkBridge();
            } else {
                this.daemonRunning = false;
                this.bridgeRunning = false;
                this.updateStatusPill('daemonStatus', false);
                this.updateStatusPill('bridgeStatus', false);
                this.toggleInstallSection(true); // Show installation section
            }
        } catch (error) {
            // Services not running - this is normal if not installed
            this.daemonRunning = false;
            this.bridgeRunning = false;
            this.updateStatusPill('daemonStatus', false);
            this.updateStatusPill('bridgeStatus', false);
            this.toggleInstallSection(true); // Show installation section
            // Don't log as error - this is expected behavior
        }
    }

    toggleInstallSection(show) {
        const installSection = document.getElementById('installSection');
        if (installSection) {
            installSection.style.display = show ? 'block' : 'none';
        }
    }

    async checkBridge() {
        try {
            // Use health server to check bridge status (avoids GIL issues with thread-mode bridge)
            const response = await fetch('http://localhost:5056/health', {
                method: 'GET',
                signal: AbortSignal.timeout(5000) // 5 seconds
            });
            
            if (response.ok) {
                const data = await response.json();
                // Health server returns bridge.status: "running" or "stopped"
                this.bridgeRunning = data.bridge?.status === 'running';
                this.updateStatusPill('bridgeStatus', this.bridgeRunning);
            } else {
                this.bridgeRunning = false;
                this.updateStatusPill('bridgeStatus', false);
            }
        } catch (error) {
            // Health server not available - service manager not running
            this.bridgeRunning = false;
            this.updateStatusPill('bridgeStatus', false);
            // Don't log as error - this is expected behavior
        }
    }

    updateStatusPill(id, active) {
        const pill = document.getElementById(id);
        if (active) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    }

    async scanServers() {
        console.log('[Popup] Scanning for servers...');
        
        const loadingState = document.getElementById('loadingState');
        const serverGrid = document.getElementById('serverGrid');
        const emptyState = document.getElementById('emptyState');
        
        // Show loading
        loadingState.style.display = 'block';
        serverGrid.style.display = 'none';
        emptyState.style.display = 'none';

        try {
            // Check if bridge is running first
            await this.checkBridge();
            
            if (!this.bridgeRunning) {
                console.log('[Popup] Bridge not running, attempting to start...');
                // Try to start bridge via TCP command
                const started = await this.sendBridgeCommand('start');
                
                if (started) {
                    // Wait for bridge to start
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await this.checkBridge();
                }
            }

            if (!this.bridgeRunning) {
                // Don't throw error, just show empty state
                console.log('[Popup] Bridge not available - install service manager or start bridge manually');
                loadingState.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }

            // Scan servers via bridge API
            const response = await fetch('http://localhost:5055/scan-servers', {
                method: 'GET',
                signal: AbortSignal.timeout(10000) // 10 second timeout for scanning
            });

            if (!response.ok) {
                throw new Error('Scan failed');
            }

            const data = await response.json();
            this.servers = data.servers || [];

            console.log('[Popup] Found servers:', this.servers);

            // Hide loading
            loadingState.style.display = 'none';

            if (this.servers.length > 0) {
                // Show servers
                this.renderServers();
                serverGrid.style.display = 'grid';
            } else {
                // Show empty state
                emptyState.style.display = 'block';
            }

        } catch (error) {
            // Only log actual errors, not expected "bridge offline" state
            if (error.message !== 'Bridge not available') {
                console.warn('[Popup] Scan error:', error.message);
            }
            loadingState.style.display = 'none';
            emptyState.style.display = 'block';
        }
    }

    renderServers() {
        const serverGrid = document.getElementById('serverGrid');
        serverGrid.innerHTML = '';

        this.servers.forEach(server => {
            const card = document.createElement('div');
            card.className = 'server-card';
            card.onclick = () => this.connectToServer(server);

            // Determine icon class based on framework
            let iconClass = 'unknown';
            const framework = server.framework.toLowerCase();
            if (framework.includes('vite')) iconClass = 'vite';
            else if (framework.includes('react')) iconClass = 'react';
            else if (framework.includes('node')) iconClass = 'node';
            else if (framework.includes('django')) iconClass = 'django';

            // Determine emoji for framework
            let emoji = '🌐';
            if (iconClass === 'vite') emoji = '⚡';
            else if (iconClass === 'react') emoji = '⚛️';
            else if (iconClass === 'node') emoji = '🟢';
            else if (iconClass === 'django') emoji = '🐍';

            card.innerHTML = `
                <div class="server-icon ${iconClass}">
                    ${emoji}
                </div>
                <div class="server-info">
                    <div class="server-name">${server.framework}</div>
                    <div class="server-url">${server.url}</div>
                </div>
                <div class="server-badge">Port ${server.port}</div>
            `;

            serverGrid.appendChild(card);
        });
    }

    async connectToServer(server) {
        console.log('[Popup] Connecting to:', server);
        
        // Open server in new tab
        chrome.tabs.create({ url: server.url });
        
        // Save to recent connections
        this.saveRecentConnection(server);
    }

    async saveRecentConnection(server) {
        try {
            const result = await chrome.storage.local.get(['recentConnections']);
            let connections = result.recentConnections || [];
            
            // Add server with timestamp
            connections.unshift({
                ...server,
                timestamp: Date.now()
            });
            
            // Keep only last 10
            connections = connections.slice(0, 10);
            
            await chrome.storage.local.set({ recentConnections: connections });
        } catch (error) {
            console.error('[Popup] Error saving connection:', error);
        }
    }

    async sendBridgeCommand(action) {
        try {
            // Send command via HTTP to health server (port 5056 supports POST /command)
            const response = await fetch('http://localhost:5056/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.status === 'started' || result.status === 'already_running';
            }
            return false;
        } catch (error) {
            console.error('[Popup] Bridge command error:', error);
            return false;
        }
    }

    async startInspecting() {
        console.log('[Popup] Starting inspection...');
        
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            console.error('[Popup] No active tab');
            return;
        }

        // Check if on localhost
        const isLocalhost = tab.url.includes('localhost') || 
                          tab.url.includes('127.0.0.1') ||
                          tab.url.includes('.local');

        if (!isLocalhost) {
            alert('HighlightAssist only works on localhost development servers');
            return;
        }

        // Send message to content script to show GUI
        try {
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'showGui'
            });
            
            if (response?.success) {
                console.log('[Popup] GUI opened successfully');
                window.close(); // Close popup
            } else {
                console.error('[Popup] Failed to open GUI:', response);
            }
        } catch (error) {
            console.error('[Popup] Error opening GUI:', error);
            alert('Extension not loaded on this page. Refresh the page and try again.');
        }
    }

    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    // ============ FOLDER BROWSER & PROJECT MANAGEMENT ============

    async showFolderBrowser() {
        // Prevent multiple folder browsers
        if (this.modalOpen) {
            console.log('[Popup] Folder browser already open');
            return;
        }
        
        console.log('[Popup] Opening folder browser...');
        
        // Get recent projects
        const recentProjects = await this.getRecentProjects();
        
        // Build recent projects HTML
        let recentProjectsHTML = '';
        if (recentProjects.length > 0) {
            recentProjectsHTML = `
                <div style="margin-bottom: 16px;">
                    <div class="modal-subtitle">📂 Recent Projects (click to use):</div>
                    <div id="recentProjectsList" style="max-height: 200px; overflow-y: auto;">
                        ${recentProjects.map(proj => `
                            <button class="recent-project-btn" data-path="${proj.path.replace(/\\/g, '\\\\')}" style="
                                width: 100%;
                                text-align: left;
                                padding: 10px;
                                margin: 4px 0;
                                background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                                border: 2px solid #e2e8f0;
                                border-radius: 8px;
                                cursor: pointer;
                                transition: all 0.2s;
                                font-size: 12px;
                            ">
                                <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">📁 ${proj.name}</div>
                                <div style="font-size: 10px; color: #64748b; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${proj.path}</div>
                            </button>
                        `).join('')}
                    </div>
                    <div style="text-align: center; margin: 8px 0; font-size: 11px; color: #94a3b8;">OR</div>
                </div>
            `;
        }
        
        // Platform-specific instructions
        const platform = navigator.platform.toLowerCase();
        let browseInstructions = '';
        let examplePath = '';
        
        if (platform.includes('win')) {
            examplePath = 'C:\\Users\\YourName\\Projects\\my-app';
            browseInstructions = `
                <div style="background: #dbeafe; padding: 10px; border-radius: 6px; font-size: 11px; line-height: 1.6; margin-bottom: 12px; border-left: 3px solid #3b82f6;">
                    <strong>🪟 Windows Quick Tip:</strong><br>
                    • Open File Explorer → Navigate to your project folder<br>
                    • Click the <strong>address bar</strong> (shows full path)<br>
                    • Press <strong>Ctrl+C</strong> to copy → Paste below with <strong>Ctrl+V</strong>
                </div>
            `;
        } else if (platform.includes('mac')) {
            examplePath = '/Users/yourname/Projects/my-app';
            browseInstructions = `
                <div style="background: #dbeafe; padding: 10px; border-radius: 6px; font-size: 11px; line-height: 1.6; margin-bottom: 12px; border-left: 3px solid #3b82f6;">
                    <strong>🍎 macOS Quick Tip:</strong><br>
                    • Open Finder → Navigate to your project<br>
                    • Right-click folder → Hold <strong>Option</strong> key<br>
                    • Click "<strong>Copy as Pathname</strong>" → Paste below
                </div>
            `;
        } else {
            examplePath = '/home/username/projects/my-app';
            browseInstructions = `
                <div style="background: #dbeafe; padding: 10px; border-radius: 6px; font-size: 11px; line-height: 1.6; margin-bottom: 12px; border-left: 3px solid #3b82f6;">
                    <strong>🐧 Linux Quick Tip:</strong><br>
                    • Open terminal and navigate to project<br>
                    • Run: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">pwd</code><br>
                    • Copy the output and paste below
                </div>
            `;
        }
        
        const folderHTML = `
            ${recentProjectsHTML}
            ${browseInstructions}
            
            <div class="modal-subtitle">Enter Project Folder Path:</div>
            <input type="text" class="modal-input" id="projectPath" placeholder="${examplePath}" style="margin-bottom: 8px;">
            
            <div class="modal-info" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #93c5fd; padding: 10px; border-radius: 8px; font-size: 11px; color: #1e40af;">
                ✨ <strong>Smart Detection:</strong> We'll scan your project for:
                <div style="font-size: 11px; margin-top: 6px; padding-left: 12px;">
                    • npm/yarn scripts (package.json)<br>
                    • Python environments (.venv, requirements.txt)<br>
                    • Common framework configs (vite, next, etc.)
                </div>
            </div>
        `;
        
        const result = await this.showModal({
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
                        const input = document.getElementById('projectPath');
                        const path = input?.value?.trim();
                        
                        if (!path) {
                            alert('Please enter a project folder path');
                            return false; // Don't close modal
                        }
                        
                        // Disable button to prevent double-clicks
                        const btn = event.target;
                        const originalText = btn.textContent;
                        btn.disabled = true;
                        btn.textContent = '⏳ Detecting...';
                        
                        try {
                            // Save to recent projects
                            const folderName = path.split(/[\\/]/).pop() || 'Unknown';
                            await this.saveToRecentProjects(path, folderName);
                            
                            // Auto-detect and start server via bridge
                            console.log('[Popup] Starting auto-detection for:', path);
                            
                            const result = await this.autoDetectProject(path);
                            
                            if (result.success) {
                                const { projectType, command, port, venv } = result;
                                
                                // Show detection results
                                let venvInfo = venv ? `\n🐍 Virtual Env: ${venv}` : '';
                                const message = `✅ Project Detected!\n\n📦 Type: ${projectType}\n🚀 Command: ${command}\n🌐 Port: ${port}${venvInfo}\n\nReady to start server?`;
                                
                                if (confirm(message)) {
                                    // TODO: Send command to daemon to start server
                                    console.log('[Popup] Starting server:', { path, command, port });
                                    alert(`Server starting at ${path}\n(Full daemon integration coming soon)`);
                                }
                                
                                return true; // Close modal
                            } else {
                                alert(`❌ Could not detect project type.\n\n${result.error || 'Make sure the path is correct and contains package.json or Python files.'}`);
                                btn.disabled = false;
                                btn.textContent = originalText;
                                return false; // Keep modal open
                            }
                        } catch (error) {
                            console.error('[Popup] Auto-detect error:', error);
                            alert(`❌ Error: ${error.message}\n\nMake sure the bridge is running.`);
                            btn.disabled = false;
                            btn.textContent = originalText;
                            return false; // Keep modal open
                        }
                    }
                }
            ]
        });
        
        // Setup event handlers after modal renders
        setTimeout(() => {
            // Recent project buttons - click to use
            const recentBtns = document.querySelectorAll('.recent-project-btn');
            recentBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const path = btn.getAttribute('data-path');
                    const input = document.getElementById('projectPath');
                    if (input) {
                        input.value = path;
                        input.focus();
                        // Highlight the input
                        input.style.background = '#dbeafe';
                        input.style.borderColor = '#3b82f6';
                        setTimeout(() => {
                            input.style.background = '';
                            input.style.borderColor = '';
                        }, 1000);
                    }
                });
                
                // Hover effect
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)';
                    btn.style.borderColor = '#a78bfa';
                    btn.style.transform = 'translateY(-2px)';
                    btn.style.boxShadow = '0 3px 10px rgba(139, 92, 246, 0.2)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
                    btn.style.borderColor = '#e2e8f0';
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = '';
                });
            });
        }, 100);
    }

    async getRecentProjects() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['recentProjects'], (data) => {
                resolve(data.recentProjects || []);
            });
        });
    }

    async saveToRecentProjects(path, name) {
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

    async autoDetectProject(projectPath) {
        console.log('[Popup] Auto-detecting project at:', projectPath);
        
        return new Promise((resolve, reject) => {
            // Connect to bridge WebSocket
            const ws = new WebSocket('ws://localhost:5055/ws');
            
            let timeoutId = setTimeout(() => {
                ws.close();
                reject(new Error('Bridge connection timeout. Make sure the service is running.'));
            }, 10000); // 10 second timeout
            
            ws.onopen = () => {
                console.log('[Popup] WebSocket connected, sending auto-detect request');
                
                // Send auto-detect message
                ws.send(JSON.stringify({
                    type: 'auto_detect_project',
                    data: {
                        path: projectPath
                    }
                }));
            };
            
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('[Popup] Received:', message);
                    
                    if (message.type === 'project_detected') {
                        clearTimeout(timeoutId);
                        ws.close();
                        
                        resolve({
                            success: true,
                            projectType: message.data.projectType,
                            command: message.data.command,
                            port: message.data.port,
                            venv: message.data.venv
                        });
                    } else if (message.type === 'error') {
                        clearTimeout(timeoutId);
                        ws.close();
                        
                        resolve({
                            success: false,
                            error: message.message
                        });
                    }
                } catch (error) {
                    console.error('[Popup] Error parsing message:', error);
                }
            };
            
            ws.onerror = (error) => {
                clearTimeout(timeoutId);
                console.error('[Popup] WebSocket error:', error);
                reject(new Error('Failed to connect to bridge. Make sure the service is running.'));
            };
            
            ws.onclose = () => {
                clearTimeout(timeoutId);
                console.log('[Popup] WebSocket closed');
            };
        });
    }

    showModal(config) {
        // Prevent multiple modals
        if (this.modalOpen) {
            console.warn('[Popup] Modal already open, ignoring request');
            return Promise.resolve(null);
        }
        
        this.modalOpen = true;
        
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.2s ease;
            `;
            
            // Create modal dialog
            const dialog = document.createElement('div');
            dialog.className = 'modal-dialog';
            dialog.style.cssText = `
                background: white;
                border-radius: 16px;
                padding: 20px;
                width: 90%;
                max-width: 380px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease;
            `;
            
            // Header
            const header = document.createElement('div');
            header.className = 'modal-header';
            header.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 14px;
                padding-bottom: 14px;
                border-bottom: 2px solid #f1f5f9;
            `;
            
            const icon = document.createElement('div');
            icon.className = 'modal-icon';
            icon.textContent = config.icon || '🚀';
            icon.style.cssText = `
                width: 36px;
                height: 36px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            `;
            
            const title = document.createElement('div');
            title.className = 'modal-title';
            title.textContent = config.title || 'Dialog';
            title.style.cssText = `
                font-size: 16px;
                font-weight: 700;
                color: #1e293b;
            `;
            
            header.appendChild(icon);
            header.appendChild(title);
            
            // Body
            const body = document.createElement('div');
            body.className = 'modal-body';
            body.innerHTML = config.body || '';
            body.style.cssText = 'margin-bottom: 16px;';
            
            // Footer
            const footer = document.createElement('div');
            footer.className = 'modal-footer';
            footer.style.cssText = `
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            `;
            
            // Buttons
            (config.buttons || []).forEach(btnConfig => {
                const btn = document.createElement('button');
                btn.className = btnConfig.primary ? 'modal-btn-primary' : 'modal-btn-secondary';
                btn.textContent = btnConfig.text;
                btn.style.cssText = `
                    padding: 9px 18px;
                    border: none;
                    border-radius: 7px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                `;
                
                if (btnConfig.primary) {
                    btn.style.cssText += `
                        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                        color: white;
                        box-shadow: 0 3px 10px rgba(139, 92, 246, 0.3);
                    `;
                } else {
                    btn.style.cssText += `
                        background: #f1f5f9;
                        color: #64748b;
                    `;
                }
                
                btn.addEventListener('click', async () => {
                    if (btnConfig.onClick) {
                        const shouldClose = await btnConfig.onClick();
                        if (shouldClose === false) return; // Don't close modal
                    }
                    
                    this.modalOpen = false; // Clear flag
                    document.body.removeChild(overlay);
                    resolve(btnConfig.value);
                });
                
                footer.appendChild(btn);
            });
            
            // Assemble dialog
            dialog.appendChild(header);
            dialog.appendChild(body);
            dialog.appendChild(footer);
            overlay.appendChild(dialog);
            
            // Add to document
            document.body.appendChild(overlay);
            
            // Close on overlay click
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.modalOpen = false; // Clear flag
                    document.body.removeChild(overlay);
                    resolve(null);
                }
            });
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const controller = new PopupController();
    await controller.init();

    // Cleanup on unload
    window.addEventListener('unload', () => {
        controller.cleanup();
    });
});
