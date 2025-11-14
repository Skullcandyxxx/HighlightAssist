/**
 * LayerInspector - Z-index stack analysis and layer visibility toggling
 * Photoshop-style layer inspector for overlapping elements
 */

export class LayerInspector {
  constructor(stateManager, uiRenderer) {
    this.stateManager = stateManager;
    this.uiRenderer = uiRenderer;
  }
  
  /**
   * Sample all elements at a given point (z-index stack)
   */
  sampleElementsAtPoint(x, y) {
    const elements = [];
    let element = document.elementFromPoint(x, y);
    
    while (element && elements.length < 20) {
      // Skip HighlightAssist UI
      if (element.hasAttribute('data-ha-ui') || element.closest('[data-ha-ui]')) {
        break;
      }
      
      elements.push(element);
      
      // Hide element temporarily to get element below
      const originalPointerEvents = element.style.pointerEvents;
      element.style.pointerEvents = 'none';
      
      element = document.elementFromPoint(x, y);
      
      // Restore pointer events
      elements[elements.length - 1].style.pointerEvents = originalPointerEvents;
    }
    
    // Restore all
    elements.forEach(el => {
      el.style.pointerEvents = '';
    });
    
    return elements;
  }
  
  /**
   * Open layer explorer panel at mouse position
   */
  openLayerExplorer(x, y) {
    const layers = this.sampleElementsAtPoint(x, y);
    
    this.stateManager.update({
      sampledLayers: layers,
      layerExplorerOpen: true
    });
    
    this.renderLayerExplorer(x, y, layers);
  }
  
  /**
   * Render layer explorer floating panel
   */
  renderLayerExplorer(x, y, layers) {
    // Remove existing panel
    const existing = document.querySelector('[data-ha-ui="layer-explorer"]');
    if (existing) existing.remove();
    
    const panel = document.createElement('div');
    panel.setAttribute('data-ha-ui', 'layer-explorer');
    panel.style.cssText = `
      position: fixed;
      left: ${x + 20}px;
      top: ${y}px;
      width: 320px;
      max-height: 500px;
      overflow-y: auto;
      background: rgba(15, 23, 42, 0.98);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 8px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      z-index: 1000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #e2e8f0;
      padding: 12px;
    `;
    
    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 700; color: #a78bfa;">
          🎨 Layer Stack (${layers.length})
        </div>
        <button id="ha-close-layer-explorer" style="
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
        ">×</button>
      </div>
      
      <div id="ha-layers-stack">
        ${layers.map((el, index) => this.renderLayerItem(el, index)).join('')}
      </div>
      
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(148, 163, 184, 0.2);">
        <button id="ha-restore-all-layers" style="
          width: 100%;
          padding: 8px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        ">👁️ Restore All Layers</button>
      </div>
    `;
    
    panel.innerHTML = html;
    document.body.appendChild(panel);
    
    // Bind events
    this.bindLayerExplorerEvents(panel, layers);
  }
  
  /**
   * Render individual layer item
   */
  renderLayerItem(element, index) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const className = element.className && typeof element.className === 'string'
      ? `.${element.className.split(' ').slice(0, 2).join('.')}`
      : '';
    
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);
    const bgColor = computedStyle.backgroundColor;
    const zIndex = computedStyle.zIndex;
    
    return `
      <div class="ha-layer-item" data-layer-index="${index}" style="
        padding: 10px;
        background: rgba(30, 41, 59, 0.6);
        border-radius: 6px;
        margin-bottom: 8px;
        cursor: pointer;
        border: 1px solid rgba(148, 163, 184, 0.1);
        transition: all 0.2s;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="font-size: 11px; font-weight: 600; color: #c4b5fd;">
            ${tag}${id}${className}
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="ha-layer-toggle" data-layer-index="${index}" title="Toggle visibility" style="
              background: rgba(96, 165, 250, 0.2);
              border: none;
              color: #60a5fa;
              width: 24px;
              height: 24px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            ">👁️</button>
            <button class="ha-layer-lock" data-layer-index="${index}" title="Lock for inspection" style="
              background: rgba(16, 185, 129, 0.2);
              border: none;
              color: #10b981;
              width: 24px;
              height: 24px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
            ">🔒</button>
          </div>
        </div>
        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 4px;">
          ${Math.round(rect.width)}×${Math.round(rect.height)}px • z-index: ${zIndex}
        </div>
        <div style="
          height: 24px;
          background: ${bgColor};
          border-radius: 4px;
          border: 1px solid rgba(148, 163, 184, 0.3);
        "></div>
      </div>
    `;
  }
  
  /**
   * Bind layer explorer events
   */
  bindLayerExplorerEvents(panel, layers) {
    // Close button
    const closeBtn = panel.querySelector('#ha-close-layer-explorer');
    closeBtn?.addEventListener('click', () => {
      panel.remove();
      this.stateManager.set('layerExplorerOpen', false);
    });
    
    // Restore all button
    const restoreBtn = panel.querySelector('#ha-restore-all-layers');
    restoreBtn?.addEventListener('click', () => {
      this.restoreAllLayers();
    });
    
    // Toggle visibility buttons
    const toggleBtns = panel.querySelectorAll('.ha-layer-toggle');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.layerIndex);
        this.toggleLayerVisibility(layers[index]);
      });
    });
    
    // Lock buttons
    const lockBtns = panel.querySelectorAll('.ha-layer-lock');
    lockBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.layerIndex);
        this.lockLayer(layers[index]);
      });
    });
  }
  
  /**
   * Toggle layer visibility
   */
  toggleLayerVisibility(element) {
    const hiddenLayers = this.stateManager.get('hiddenLayers');
    
    if (hiddenLayers.has(element)) {
      // Restore visibility
      const originalDisplay = hiddenLayers.get(element);
      element.style.display = originalDisplay;
      hiddenLayers.delete(element);
      this.stateManager.addLog('Layer restored', 'info', 'layers');
    } else {
      // Hide layer
      const originalDisplay = element.style.display;
      hiddenLayers.set(element, originalDisplay);
      element.style.display = 'none';
      this.stateManager.addLog('Layer hidden', 'info', 'layers');
    }
  }
  
  /**
   * Lock layer for inspection
   */
  lockLayer(element) {
    const eventHandler = this.stateManager.get('eventHandler');
    if (eventHandler && eventHandler.lockElement) {
      eventHandler.lockElement(element);
    }
    
    // Close layer explorer
    const panel = document.querySelector('[data-ha-ui="layer-explorer"]');
    if (panel) panel.remove();
    
    this.stateManager.set('layerExplorerOpen', false);
  }
  
  /**
   * Restore all hidden layers
   */
  restoreAllLayers() {
    const hiddenLayers = this.stateManager.get('hiddenLayers');
    
    hiddenLayers.forEach((originalDisplay, element) => {
      element.style.display = originalDisplay;
    });
    
    hiddenLayers.clear();
    this.stateManager.addLog('All layers restored', 'success', 'layers');
  }
}
