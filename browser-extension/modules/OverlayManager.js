/**
 * OverlayManager - Main orchestrator for HighlightAssist overlay system
 * Replaces the 2262-line monolithic overlay-gui.js with modular OOP architecture
 */

import { StateManagerEnhanced } from './StateManagerEnhanced.js';
import { UIRenderer } from './UIRenderer.js';
import { EventHandler } from './EventHandler.js';
import { BridgeClient } from './BridgeClient.js';
import { LayerInspector } from './LayerInspector.js';
import { ElementAnalyzer } from './ElementAnalyzer.js';

export class OverlayManager {
  constructor() {
    // Core components
    this.stateManager = null;
    this.uiRenderer = null;
    this.eventHandler = null;
    this.bridgeClient = null;
    this.layerInspector = null;
    this.elementAnalyzer = null;
    
    // Initialization state
    this.initialized = false;
    this.ready = false;
  }
  
  /**
   * Initialize overlay - THIS IS THE MISSING init() FUNCTION!
   */
  async init() {
    if (this.initialized) {
      console.warn('[OverlayManager] Already initialized');
      return;
    }
    
    console.log('[OverlayManager] Initializing overlay system...');
    
    try {
      // 1. Initialize state manager
      this.stateManager = new StateManagerEnhanced();
      await this.stateManager.loadSettings();
      this.stateManager.addLog('Overlay initializing', 'info', 'manager');
      
      // 2. Initialize UI renderer
      this.uiRenderer = new UIRenderer(this.stateManager);
      this.uiRenderer.createOverlayUI();
      
      // 3. Initialize component analyzers
      this.elementAnalyzer = new ElementAnalyzer(this.stateManager);
      this.layerInspector = new LayerInspector(this.stateManager, this.uiRenderer);
      
      // 4. Initialize bridge client
      this.bridgeClient = new BridgeClient(this.stateManager);
      
      // 5. Initialize event handler (must be last - needs all components)
      this.eventHandler = new EventHandler(
        this.stateManager,
        this.uiRenderer,
        this.bridgeClient,
        this.layerInspector,
        this.elementAnalyzer
      );
      this.eventHandler.registerEventListeners();
      
      // 6. Set up message listener for content script communication
      this.setupMessageListener();
      
      // 7. Mark as initialized
      this.initialized = true;
      this.ready = true;
      
      // 8. Signal ready to content script (FIXES THE BUG!)
      window.postMessage({
        type: 'HIGHLIGHT_ASSIST_READY',
        timestamp: Date.now()
      }, '*');
      
      this.stateManager.addLog('Overlay initialized successfully', 'success', 'manager');
      console.log('[OverlayManager] ✅ Overlay ready');
      
    } catch (error) {
      console.error('[OverlayManager] Initialization failed:', error);
      this.stateManager?.addLog(`Init failed: ${error.message}`, 'error', 'manager');
      throw error;
    }
  }
  
  /**
   * Setup message listener for content script communication
   */
  setupMessageListener() {
    window.addEventListener('message', (event) => {
      // Only accept messages from same window
      if (event.source !== window) return;
      
      const { type, action } = event.data || {};
      
      if (type === 'HIGHLIGHT_ASSIST') {
        this.handleContentScriptMessage(action, event.data);
      } else if (type === 'HIGHLIGHT_ASSIST_NATIVE_RESPONSE') {
        this.bridgeClient.handleNativeResponse(event.data);
      } else if (type === 'HIGHLIGHT_ASSIST_STORAGE_RESPONSE') {
        this.stateManager.handleStorageResponse(event.data);
      }
    });
  }
  
  /**
   * Handle messages from content script
   */
  handleContentScriptMessage(action, data) {
    console.log(`[OverlayManager] Received action: ${action}`);
    
    switch (action) {
      case 'toggleInspecting':
        this.eventHandler.toggleInspecting();
        // Send response back
        window.postMessage({
          type: 'HIGHLIGHT_ASSIST_RESPONSE',
          action: 'toggleInspecting',
          isInspecting: this.stateManager.get('isInspecting')
        }, '*');
        break;
        
      case 'showGui':
        this.showControlPanel();
        // Send response back
        window.postMessage({
          type: 'HIGHLIGHT_ASSIST_RESPONSE',
          action: 'showGui',
          success: true,
          panelShown: true
        }, '*');
        break;
        
      case 'hideGui':
        this.hideControlPanel();
        window.postMessage({
          type: 'HIGHLIGHT_ASSIST_RESPONSE',
          action: 'hideGui',
          success: true
        }, '*');
        break;
        
      case 'getState':
        // Send current state back
        window.postMessage({
          type: 'HIGHLIGHT_ASSIST_RESPONSE',
          action: 'getState',
          isInspecting: this.stateManager.get('isInspecting'),
          locked: this.stateManager.get('locked'),
          panelVisible: this.stateManager.get('panelVisible')
        }, '*');
        break;
        
      default:
        console.warn(`[OverlayManager] Unknown action: ${action}`);
    }
  }
  
  /**
   * Show control panel
   */
  showControlPanel() {
    const panel = document.querySelector('[data-ha-ui="control-panel"]');
    if (panel) {
      panel.style.display = 'block';
      this.stateManager.set('panelVisible', true);
      this.stateManager.addLog('GUI panel opened', 'info', 'manager');
    }
  }
  
  /**
   * Hide control panel
   */
  hideControlPanel() {
    const panel = document.querySelector('[data-ha-ui="control-panel"]');
    if (panel) {
      panel.style.display = 'none';
      this.stateManager.set('panelVisible', false);
      this.stateManager.addLog('GUI panel closed', 'info', 'manager');
    }
  }
  
  /**
   * Clean up and destroy overlay
   */
  destroy() {
    console.log('[OverlayManager] Destroying overlay...');
    
    if (this.eventHandler) {
      this.eventHandler.unregisterEventListeners();
    }
    
    if (this.bridgeClient) {
      this.bridgeClient.disconnect();
    }
    
    if (this.uiRenderer) {
      this.uiRenderer.destroyOverlayUI();
    }
    
    this.initialized = false;
    this.ready = false;
    
    this.stateManager?.addLog('Overlay destroyed', 'info', 'manager');
  }
  
  /**
   * Get current state snapshot
   */
  getState() {
    return this.stateManager?.getSnapshot() || null;
  }
}

// Create singleton instance
const overlayManager = new OverlayManager();

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    overlayManager.init().catch(error => {
      console.error('[OverlayManager] Auto-init failed:', error);
    });
  });
} else {
  // DOM already loaded
  overlayManager.init().catch(error => {
    console.error('[OverlayManager] Auto-init failed:', error);
  });
}

// Export for external access
export default overlayManager;
