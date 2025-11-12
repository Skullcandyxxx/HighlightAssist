/**
 * UIRenderer - Handles DOM creation and updates for overlay UI
 * Manages control panel, tabs, layer explorer, and visual overlays
 */

export class UIRenderer {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.controlPanel = null;
    this.highlightOverlay = null;
    this.layerExplorerPanel = null;
    
    // Subscribe to state changes
    this.stateManager.subscribe('currentTab', (tab) => this.switchTab(tab));
    this.stateManager.subscribe('panelVisible', (visible) => this.togglePanelVisibility(visible));
  }
  
  /**
   * Create entire overlay UI structure
   */
  createOverlayUI() {
    // Create highlight overlay (blue border around hovered element)
    this.createHighlightOverlay();
    
    // Create main control panel
    this.createControlPanel();
    
    console.log('[UIRenderer] Overlay UI created');
  }
  
  /**
   * Create highlight overlay for visual feedback
   */
  createHighlightOverlay() {
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.setAttribute('data-ha-ui', 'highlight');
    this.highlightOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      border: 2px solid #60a5fa;
      background: rgba(96, 165, 250, 0.1);
      z-index: 999998;
      display: none;
      transition: all 0.1s ease;
    `;
    document.body.appendChild(this.highlightOverlay);
  }
  
  /**
   * Create main control panel with tabs
   */
  createControlPanel() {
    const panel = document.createElement('div');
    panel.setAttribute('data-ha-ui', 'control-panel');
    panel.id = 'highlight-assist-panel';
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      width: 420px;
      max-height: calc(100vh - 40px);
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98));
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #e2e8f0;
      overflow: hidden;
      display: none;
    `;
    
    panel.innerHTML = `
      <!-- Header -->
      <div data-ha-ui="header" style="
        padding: 16px;
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        border-bottom: 1px solid rgba(139, 92, 246, 0.3);
        cursor: move;
        user-select: none;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">🎨</span>
            <h3 style="margin: 0; font-size: 14px; font-weight: 700;">HighlightAssist</h3>
          </div>
          <button id="ha-close-panel" style="
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            line-height: 1;
          ">×</button>
        </div>
      </div>
      
      <!-- Tabs -->
      <div data-ha-ui="tabs" style="
        display: flex;
        gap: 4px;
        padding: 12px 16px;
        background: rgba(15, 23, 42, 0.5);
        border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      ">
        <button class="ha-tab" data-tab="main" style="
          flex: 1;
          padding: 8px 12px;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        ">📊 Main</button>
        <button class="ha-tab" data-tab="layers" style="
          flex: 1;
          padding: 8px 12px;
          background: rgba(71, 85, 105, 0.5);
          border: none;
          border-radius: 6px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        ">🎨 Layers</button>
        <button class="ha-tab" data-tab="bridge" style="
          flex: 1;
          padding: 8px 12px;
          background: rgba(71, 85, 105, 0.5);
          border: none;
          border-radius: 6px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        ">🔌 Bridge</button>
        <button class="ha-tab" data-tab="settings" style="
          flex: 1;
          padding: 8px 12px;
          background: rgba(71, 85, 105, 0.5);
          border: none;
          border-radius: 6px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        ">⚙️ Settings</button>
      </div>
      
      <!-- Tab Content Container -->
      <div data-ha-ui="content" style="
        padding: 16px;
        max-height: calc(100vh - 200px);
        overflow-y: auto;
      ">
        <!-- Main Tab -->
        <div id="ha-tab-main" class="ha-tab-content" style="display: block;">
          <div style="margin-bottom: 16px;">
            <button id="ha-start-inspecting" style="
              width: 100%;
              padding: 12px;
              background: linear-gradient(135deg, #10b981, #059669);
              border: none;
              border-radius: 8px;
              color: white;
              font-size: 13px;
              font-weight: 700;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            ">🚀 Start Inspecting</button>
          </div>
          
          <div id="ha-element-info" style="
            padding: 12px;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 8px;
            font-size: 11px;
            line-height: 1.6;
            color: #94a3b8;
          ">
            <div style="color: #64748b; margin-bottom: 8px;">ℹ️ No element selected</div>
            <div>Hover over elements to inspect them</div>
          </div>
          
          <div style="margin-top: 12px;">
            <button id="ha-send-to-ai" disabled style="
              width: 100%;
              padding: 10px;
              background: rgba(71, 85, 105, 0.5);
              border: none;
              border-radius: 6px;
              color: #64748b;
              font-size: 12px;
              font-weight: 600;
              cursor: not-allowed;
            ">📤 Send to AI</button>
          </div>
        </div>
        
        <!-- Layers Tab -->
        <div id="ha-tab-layers" class="ha-tab-content" style="display: none;">
          <div id="ha-layers-list" style="
            font-size: 11px;
            color: #94a3b8;
          ">
            <div style="color: #64748b; margin-bottom: 8px;">No inspection history yet</div>
          </div>
        </div>
        
        <!-- Bridge Tab -->
        <div id="ha-tab-bridge" class="ha-tab-content" style="display: none;">
          <div style="margin-bottom: 12px;">
            <button id="ha-bridge-connect" style="
              width: 100%;
              padding: 12px;
              background: linear-gradient(135deg, #3b82f6, #2563eb);
              border: none;
              border-radius: 8px;
              color: white;
              font-size: 13px;
              font-weight: 700;
              cursor: pointer;
            ">🔌 Connect to Bridge</button>
          </div>
          
          <div id="ha-bridge-status" style="
            padding: 12px;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 8px;
            font-size: 11px;
            color: #94a3b8;
          ">
            <div style="color: #64748b;">⚫ Bridge disconnected</div>
          </div>
        </div>
        
        <!-- Settings Tab -->
        <div id="ha-tab-settings" class="ha-tab-content" style="display: none;">
          <div style="font-size: 11px; color: #94a3b8;">
            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; cursor: pointer;">
              <input type="checkbox" id="ha-auto-lock" style="cursor: pointer;">
              <span>Auto-lock on click</span>
            </label>
            
            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px; cursor: pointer;">
              <input type="checkbox" id="ha-keyboard-shortcuts" checked style="cursor: pointer;">
              <span>Enable keyboard shortcuts</span>
            </label>
            
            <div style="margin-top: 16px;">
              <div style="color: #64748b; margin-bottom: 4px;">Overlay Opacity</div>
              <input type="range" id="ha-overlay-opacity" min="0.5" max="1" step="0.05" value="0.95" style="width: 100%;">
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    this.controlPanel = panel;
    
    // Make panel draggable
    this.makeDraggable(panel);
  }
  
  /**
   * Make panel draggable
   */
  makeDraggable(panel) {
    const header = panel.querySelector('[data-ha-ui="header"]');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.id === 'ha-close-panel') return;
      isDragging = true;
      initialX = e.clientX - panel.offsetLeft;
      initialY = e.clientY - panel.offsetTop;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      panel.style.left = currentX + 'px';
      panel.style.top = currentY + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
  
  /**
   * Switch active tab
   */
  switchTab(tabName) {
    // Update tab buttons
    const tabs = this.controlPanel.querySelectorAll('.ha-tab');
    tabs.forEach(tab => {
      const isActive = tab.dataset.tab === tabName;
      tab.style.background = isActive 
        ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
        : 'rgba(71, 85, 105, 0.5)';
      tab.style.color = isActive ? 'white' : '#94a3b8';
    });
    
    // Update tab content
    const contents = this.controlPanel.querySelectorAll('.ha-tab-content');
    contents.forEach(content => {
      content.style.display = content.id === `ha-tab-${tabName}` ? 'block' : 'none';
    });
  }
  
  /**
   * Toggle panel visibility
   */
  togglePanelVisibility(visible) {
    if (this.controlPanel) {
      this.controlPanel.style.display = visible ? 'block' : 'none';
    }
  }
  
  /**
   * Update highlight overlay position
   */
  updateHighlight(rect) {
    if (!this.highlightOverlay) return;
    
    this.highlightOverlay.style.display = 'block';
    this.highlightOverlay.style.left = rect.left + window.scrollX + 'px';
    this.highlightOverlay.style.top = rect.top + window.scrollY + 'px';
    this.highlightOverlay.style.width = rect.width + 'px';
    this.highlightOverlay.style.height = rect.height + 'px';
  }
  
  /**
   * Hide highlight overlay
   */
  hideHighlight() {
    if (this.highlightOverlay) {
      this.highlightOverlay.style.display = 'none';
    }
  }
  
  /**
   * Update element info display
   */
  updateElementInfo(elementData) {
    const infoDiv = document.getElementById('ha-element-info');
    if (!infoDiv) return;
    
    const { tagName, selector, textContent, framework } = elementData;
    
    infoDiv.innerHTML = `
      <div style="color: #a78bfa; margin-bottom: 8px; font-weight: 600;">
        ${tagName} ${framework ? `(${framework})` : ''}
      </div>
      <div style="margin-bottom: 6px; font-family: monospace; color: #60a5fa;">
        ${this.escapeHtml(selector)}
      </div>
      ${textContent ? `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.2);">
          <div style="color: #64748b; font-size: 10px; margin-bottom: 4px;">Text Content:</div>
          <div style="color: #94a3b8;">${this.escapeHtml(textContent)}</div>
        </div>
      ` : ''}
    `;
    
    // Enable send to AI button
    const sendBtn = document.getElementById('ha-send-to-ai');
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
      sendBtn.style.color = 'white';
      sendBtn.style.cursor = 'pointer';
    }
  }
  
  /**
   * Clear element info
   */
  clearElementInfo() {
    const infoDiv = document.getElementById('ha-element-info');
    if (infoDiv) {
      infoDiv.innerHTML = `
        <div style="color: #64748b; margin-bottom: 8px;">ℹ️ No element selected</div>
        <div>Hover over elements to inspect them</div>
      `;
    }
    
    const sendBtn = document.getElementById('ha-send-to-ai');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.style.background = 'rgba(71, 85, 105, 0.5)';
      sendBtn.style.color = '#64748b';
      sendBtn.style.cursor = 'not-allowed';
    }
  }
  
  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Destroy overlay UI
   */
  destroyOverlayUI() {
    if (this.highlightOverlay) {
      this.highlightOverlay.remove();
      this.highlightOverlay = null;
    }
    
    if (this.controlPanel) {
      this.controlPanel.remove();
      this.controlPanel = null;
    }
    
    if (this.layerExplorerPanel) {
      this.layerExplorerPanel.remove();
      this.layerExplorerPanel = null;
    }
  }
}
