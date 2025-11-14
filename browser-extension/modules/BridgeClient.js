/**
 * BridgeClient - WebSocket client for bridge communication
 * Handles connection, reconnection, and message passing to bridge.py
 */

export class BridgeClient {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.pendingRequests = new Map();
  }
  
  /**
   * Toggle connection to bridge
   */
  toggleConnection() {
    const connected = this.stateManager.get('bridgeConnected');
    
    if (connected) {
      this.disconnect();
    } else {
      this.connect();
    }
  }
  
  /**
   * Connect to WebSocket bridge
   */
  connect() {
    const url = this.stateManager.get('bridgeUrl');
    
    try {
      this.stateManager.addLog(`Connecting to bridge: ${url}`, 'info', 'bridge');
      
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        this.onOpen();
      };
      
      this.ws.onmessage = (event) => {
        this.onMessage(event);
      };
      
      this.ws.onerror = (error) => {
        this.onError(error);
      };
      
      this.ws.onclose = () => {
        this.onClose();
      };
      
    } catch (error) {
      this.stateManager.addLog(`Connection failed: ${error.message}`, 'error', 'bridge');
    }
  }
  
  /**
   * Handle WebSocket open
   */
  onOpen() {
    this.stateManager.update({
      bridgeConnected: true,
      bridgeWS: this.ws,
      bridgeLastPing: Date.now()
    });
    
    this.reconnectAttempts = 0;
    this.stateManager.addLog('Bridge connected', 'success', 'bridge');
    
    // Update UI
    this.updateBridgeStatus('🟢 Bridge connected', '#10b981');
    
    const btn = document.getElementById('ha-bridge-connect');
    if (btn) {
      btn.textContent = '🔌 Disconnect';
      btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    }
  }
  
  /**
   * Handle incoming message
   */
  onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'pong') {
        this.stateManager.set('bridgeLastPing', Date.now());
      } else if (data.type === 'ai_response') {
        this.stateManager.addLog('Received AI response', 'info', 'bridge');
      }
      
    } catch (error) {
      console.error('[BridgeClient] Message parse error:', error);
    }
  }
  
  /**
   * Handle WebSocket error
   */
  onError(error) {
    console.error('[BridgeClient] WebSocket error:', error);
    this.stateManager.addLog('Bridge connection error', 'error', 'bridge');
  }
  
  /**
   * Handle WebSocket close
   */
  onClose() {
    this.stateManager.update({
      bridgeConnected: false,
      bridgeWS: null
    });
    
    this.stateManager.addLog('Bridge disconnected', 'warn', 'bridge');
    
    // Update UI
    this.updateBridgeStatus('⚫ Bridge disconnected', '#64748b');
    
    const btn = document.getElementById('ha-bridge-connect');
    if (btn) {
      btn.textContent = '🔌 Connect to Bridge';
      btn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    }
    
    // Auto-reconnect if not manually disconnected
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }
  
  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.stateManager.addLog(`Reconnect attempt ${this.reconnectAttempts}`, 'info', 'bridge');
      this.connect();
    }, delay);
  }
  
  /**
   * Disconnect from bridge
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.stateManager.update({
      bridgeConnected: false,
      bridgeWS: null
    });
  }
  
  /**
   * Send element data to AI via bridge
   */
  async sendToAI(elementContext) {
    if (!this.stateManager.get('bridgeConnected')) {
      throw new Error('Bridge not connected');
    }
    
    const message = {
      type: 'ai_request',
      context: elementContext,
      timestamp: Date.now()
    };
    
    this.ws.send(JSON.stringify(message));
    this.stateManager.addLog('Sent element context to AI', 'info', 'bridge');
  }
  
  /**
   * Update bridge status UI
   */
  updateBridgeStatus(text, color) {
    const statusDiv = document.getElementById('ha-bridge-status');
    if (statusDiv) {
      statusDiv.innerHTML = `<div style="color: ${color};">${text}</div>`;
    }
  }
  
  /**
   * Handle native host response (from content script)
   */
  handleNativeResponse(data) {
    const pending = this.pendingRequests.get(data.requestId);
    if (!pending) return;
    
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(data.requestId);
    
    const response = data.response || {};
    if (response.success === false) {
      pending.reject(new Error(response.error || 'Native host error'));
    } else {
      pending.resolve(response);
    }
  }
}
