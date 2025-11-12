/**
 * Enhanced StateManager - Complete implementation for OOP overlay
 * Replaces the stub version with full functionality
 */

export class StateManagerEnhanced {
  constructor() {
    // Core inspection state
    this.state = {
      // Inspection mode
      isInspecting: false,
      locked: false,
      
      // Current element tracking
      currentElement: null,
      hoveredElement: null,
      currentSelector: '',
      currentRect: null,
      trackedElement: null,
      
      // Mouse tracking
      mouseX: 0,
      mouseY: 0,
      hoverTimer: null,
      
      // UI state
      panelVisible: true,
      currentTab: 'main',
      layerExplorerOpen: false,
      
      // Layer inspector
      sampledLayers: [],
      hiddenLayers: new Map(),
      
      // Bridge connection
      bridgeUrl: 'ws://localhost:5055',
      bridgeWS: null,
      bridgeConnected: false,
      bridgeLastPing: null,
      
      // Settings
      autoLockMode: false,
      keyboardShortcutsEnabled: true,
      overlayOpacity: 0.95,
      
      // History
      inspectionHistory: [],
      
      // Logs
      logs: [],
      
      // Storage request tracking
      pendingStorageRequests: new Map()
    };
    
    // State change listeners (key-specific)
    this.listeners = new Map();
    
    // Auto-save debounce timer
    this.saveTimer = null;
  }
  
  get(key) {
    return this.state[key];
  }
  
  set(key, value) {
    const oldValue = this.state[key];
    this.state[key] = value;
    this.notify(key, value, oldValue);
    
    if (this.shouldAutoSave(key)) {
      this.scheduleSave();
    }
  }
  
  update(changes) {
    Object.entries(changes).forEach(([key, value]) => {
      this.set(key, value);
    });
  }
  
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
    
    return () => {
      const callbacks = this.listeners.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    };
  }
  
  notify(key, newValue, oldValue) {
    const callbacks = this.listeners.get(key) || [];
    callbacks.forEach(cb => {
      try {
        cb(newValue, oldValue);
      } catch (error) {
        console.error(`[StateManager] Listener error for ${key}:`, error);
      }
    });
  }
  
  shouldAutoSave(key) {
    return ['bridgeUrl', 'autoLockMode', 'keyboardShortcutsEnabled', 'overlayOpacity', 'inspectionHistory'].includes(key);
  }
  
  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveSettings(), 500);
  }
  
  async saveSettings() {
    const settings = {
      bridgeUrl: this.state.bridgeUrl,
      autoLockMode: this.state.autoLockMode,
      keyboardShortcutsEnabled: this.state.keyboardShortcutsEnabled,
      overlayOpacity: this.state.overlayOpacity,
      inspectionHistory: this.state.inspectionHistory.slice(-20)
    };
    
    try {
      await this.storageSet('highlightAssist_settings', settings);
      console.log('[StateManager] Settings saved');
    } catch (error) {
      console.error('[StateManager] Save failed:', error);
    }
  }
  
  async loadSettings() {
    try {
      const settings = await this.storageGet('highlightAssist_settings');
      if (settings) {
        this.update({
          bridgeUrl: settings.bridgeUrl || this.state.bridgeUrl,
          autoLockMode: settings.autoLockMode || false,
          keyboardShortcutsEnabled: settings.keyboardShortcutsEnabled !== false,
          overlayOpacity: settings.overlayOpacity || 0.95,
          inspectionHistory: settings.inspectionHistory || []
        });
        console.log('[StateManager] Settings loaded');
      }
    } catch (error) {
      console.error('[StateManager] Load failed:', error);
    }
  }
  
  storageGet(key) {
    return new Promise((resolve, reject) => {
      const requestId = `storage_${Date.now()}_${Math.random()}`;
      
      const timeout = setTimeout(() => {
        this.state.pendingStorageRequests.delete(requestId);
        reject(new Error('Storage timeout'));
      }, 5000);
      
      this.state.pendingStorageRequests.set(requestId, { resolve, reject, timeout });
      
      window.postMessage({
        type: 'HIGHLIGHT_ASSIST_STORAGE',
        requestId,
        op: 'get',
        key
      }, '*');
    });
  }
  
  storageSet(key, value) {
    return new Promise((resolve, reject) => {
      const requestId = `storage_${Date.now()}_${Math.random()}`;
      
      const timeout = setTimeout(() => {
        this.state.pendingStorageRequests.delete(requestId);
        reject(new Error('Storage timeout'));
      }, 5000);
      
      this.state.pendingStorageRequests.set(requestId, { resolve, reject, timeout });
      
      window.postMessage({
        type: 'HIGHLIGHT_ASSIST_STORAGE',
        requestId,
        op: 'set',
        key,
        value
      }, '*');
    });
  }
  
  handleStorageResponse(data) {
    const pending = this.state.pendingStorageRequests.get(data.requestId);
    if (!pending) return;
    
    clearTimeout(pending.timeout);
    this.state.pendingStorageRequests.delete(data.requestId);
    
    if (data.ok) {
      pending.resolve(data.value);
    } else {
      pending.reject(new Error(data.error || 'storage_error'));
    }
  }
  
  addLog(message, level = 'info', source = 'overlay') {
    const log = { timestamp: Date.now(), level, message, source };
    this.state.logs.push(log);
    
    if (this.state.logs.length > 100) this.state.logs.shift();
    
    const styles = { info: 'color: #60a5fa', success: 'color: #10b981', warn: 'color: #fbbf24', error: 'color: #ef4444' };
    console.log(`%c[HighlightAssist] ${message}`, styles[level] || '');
  }
  
  addToHistory(element, selector) {
    const entry = {
      selector,
      tagName: element.tagName.toLowerCase(),
      textContent: element.textContent ? element.textContent.trim().substring(0, 50) : '',
      timestamp: Date.now()
    };
    
    const isDupe = this.state.inspectionHistory.some(h => h.selector === selector && Date.now() - h.timestamp < 1000);
    if (!isDupe) {
      this.state.inspectionHistory.push(entry);
      if (this.state.inspectionHistory.length > 20) this.state.inspectionHistory.shift();
      this.set('inspectionHistory', this.state.inspectionHistory);
    }
  }
  
  resetInspection() {
    this.update({
      isInspecting: false,
      locked: false,
      currentElement: null,
      hoveredElement: null,
      currentSelector: '',
      currentRect: null
    });
  }
  
  getSnapshot() {
    return { ...this.state };
  }
}
