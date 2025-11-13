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
    }

    async init() {
        console.log('[Popup] Initializing v2.0...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Detect OS and setup download links
        this.setupDownloadLinks();
        
        // Initial status check
        await this.checkStatuses();
        
        // Start periodic updates (every 5 seconds)
        this.updateInterval = setInterval(() => this.checkStatuses(), 5000);
        
        // Load servers
        await this.scanServers();
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
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.scanServers();
        });

        // Start inspect button
        document.getElementById('startInspectBtn').addEventListener('click', () => {
            this.startInspecting();
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            // TODO: Open settings page
            console.log('Settings clicked');
        });

        // Docs link
        document.getElementById('docsLink').addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://github.com/Skullcandyxxx/HighlightAssist' });
        });
    }

    async checkStatuses() {
        // Check daemon (health server on port 5056)
        try {
            const response = await fetch('http://localhost:5056/ping', {
                method: 'GET',
                signal: AbortSignal.timeout(1000)
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
            this.daemonRunning = false;
            this.bridgeRunning = false;
            this.updateStatusPill('daemonStatus', false);
            this.updateStatusPill('bridgeStatus', false);
            this.toggleInstallSection(true); // Show installation section
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
            const response = await fetch('http://localhost:5055/ping', {
                method: 'GET',
                signal: AbortSignal.timeout(1000)
            });
            
            if (response.ok) {
                this.bridgeRunning = true;
                this.updateStatusPill('bridgeStatus', true);
            } else {
                this.bridgeRunning = false;
                this.updateStatusPill('bridgeStatus', false);
            }
        } catch (error) {
            this.bridgeRunning = false;
            this.updateStatusPill('bridgeStatus', false);
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
            // Check if bridge is running
            if (!this.bridgeRunning) {
                console.log('[Popup] Bridge not running, starting it...');
                // Try to start bridge via TCP command
                await this.sendBridgeCommand('start');
                await new Promise(resolve => setTimeout(resolve, 2000));
                await this.checkBridge();
            }

            if (!this.bridgeRunning) {
                throw new Error('Bridge not available');
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
            console.error('[Popup] Scan error:', error);
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
            // Send command via TCP to service manager
            const response = await fetch('http://localhost:5054', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            return response.ok;
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
