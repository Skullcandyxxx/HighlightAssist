/**
 * overlay-gui.js - NEW Modular OOP Entry Point
 * Replaces the 2262-line monolithic file with clean bootstrapper
 * 
 * Architecture:
 * - OverlayManager: Main orchestrator (lifecycle, init, handshake)
 * - StateManagerEnhanced: Centralized reactive state
 * - UIRenderer: DOM creation and updates
 * - EventHandler: Event delegation and keyboard shortcuts
 * - BridgeClient: WebSocket communication with bridge.py
 * - LayerInspector: Z-index stack analysis
 * - ElementAnalyzer: Framework detection and analysis
 */

import { OverlayManager } from './modules/OverlayManager.js';

console.log('[HighlightAssist] 🚀 Loading OOP overlay system...');

// Create and export singleton instance
const overlayManager = new OverlayManager();

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await overlayManager.init();
    } catch (error) {
      console.error('[HighlightAssist] ❌ Init failed:', error);
    }
  });
} else {
  // DOM already loaded
  overlayManager.init().catch(error => {
    console.error('[HighlightAssist] ❌ Init failed:', error);
  });
}

// Export for external access (debugging, content script)
window.__highlightAssist = overlayManager;

export default overlayManager;
