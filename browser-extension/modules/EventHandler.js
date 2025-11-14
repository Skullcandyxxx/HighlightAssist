/**
 * EventHandler - Centralized event delegation and handling
 * Manages mouse events, keyboard shortcuts, button clicks
 */

export class EventHandler {
  constructor(stateManager, uiRenderer, bridgeClient, layerInspector, elementAnalyzer) {
    this.stateManager = stateManager;
    this.uiRenderer = uiRenderer;
    this.bridgeClient = bridgeClient;
    this.layerInspector = layerInspector;
    this.elementAnalyzer = elementAnalyzer;
    
    // Bound handlers (for cleanup)
    this.handlers = {
      mouseOver: this.handleMouseOver.bind(this),
      click: this.handleClick.bind(this),
      keydown: this.handleKeydown.bind(this),
      keyup: this.handleKeyup.bind(this)
    };
    
    // Modifier key state
    this.modifierHeld = false;
  }
  
  /**
   * Register all event listeners
   */
  registerEventListeners() {
    // Panel button events
    this.registerPanelEvents();
    
    // Document-level inspection events
    document.addEventListener('mouseover', this.handlers.mouseOver);
    document.addEventListener('click', this.handlers.click, true); // Capture phase
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handlers.keydown);
    document.addEventListener('keyup', this.handlers.keyup);
    
    console.log('[EventHandler] Event listeners registered');
  }
  
  /**
   * Register panel-specific events
   */
  registerPanelEvents() {
    const panel = document.querySelector('[data-ha-ui="control-panel"]');
    if (!panel) return;
    
    // Close button
    const closeBtn = panel.querySelector('#ha-close-panel');
    closeBtn?.addEventListener('click', () => {
      this.stateManager.set('panelVisible', false);
    });
    
    // Tab buttons
    const tabButtons = panel.querySelectorAll('.ha-tab');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.stateManager.set('currentTab', btn.dataset.tab);
      });
    });
    
    // Start inspecting button
    const startBtn = panel.querySelector('#ha-start-inspecting');
    startBtn?.addEventListener('click', () => {
      this.toggleInspecting();
    });
    
    // Copy selector button
    const copySelectorBtn = panel.querySelector('#ha-copy-selector');
    copySelectorBtn?.addEventListener('click', () => {
      const selector = this.stateManager.get('currentSelector');
      if (selector) {
        navigator.clipboard.writeText(selector).then(() => {
          this.stateManager.addLog('Copied selector to clipboard', 'success', 'events');
        }).catch(err => {
          this.stateManager.addLog('Failed to copy selector: ' + err.message, 'error', 'events');
        });
      }
    });
    
    // Copy XPath button
    const copyXPathBtn = panel.querySelector('#ha-copy-xpath');
    copyXPathBtn?.addEventListener('click', () => {
      const element = this.stateManager.get('selectedElement');
      if (element) {
        const xpath = this.elementAnalyzer.getXPath(element);
        navigator.clipboard.writeText(xpath).then(() => {
          this.stateManager.addLog('Copied XPath to clipboard', 'success', 'events');
        }).catch(err => {
          this.stateManager.addLog('Failed to copy XPath: ' + err.message, 'error', 'events');
        });
      }
    });
    
    // Send to AI button
    const sendBtn = panel.querySelector('#ha-send-to-ai');
    sendBtn?.addEventListener('click', () => {
      this.sendToAI();
    });
    
    // Bridge connect button
    const bridgeBtn = panel.querySelector('#ha-bridge-connect');
    bridgeBtn?.addEventListener('click', () => {
      this.bridgeClient.toggleConnection();
    });
    
    // Settings checkboxes
    const autoLockCheckbox = panel.querySelector('#ha-auto-lock');
    autoLockCheckbox?.addEventListener('change', (e) => {
      this.stateManager.set('autoLockMode', e.target.checked);
    });
    
    const shortcutsCheckbox = panel.querySelector('#ha-keyboard-shortcuts');
    shortcutsCheckbox?.addEventListener('change', (e) => {
      this.stateManager.set('keyboardShortcutsEnabled', e.target.checked);
    });
    
    const opacitySlider = panel.querySelector('#ha-overlay-opacity');
    opacitySlider?.addEventListener('input', (e) => {
      this.stateManager.set('overlayOpacity', parseFloat(e.target.value));
    });
    
    // Highlight color picker
    const colorPicker = panel.querySelector('#ha-highlight-color');
    colorPicker?.addEventListener('input', (e) => {
      this.stateManager.set('highlightColor', e.target.value);
    });
    
    // Border width slider
    const borderSlider = panel.querySelector('#ha-border-width');
    const borderValue = panel.querySelector('#ha-border-width-value');
    borderSlider?.addEventListener('input', (e) => {
      const width = parseInt(e.target.value);
      this.stateManager.set('borderWidth', width);
      if (borderValue) {
        borderValue.textContent = width + 'px';
      }
    });
  }
  
  /**
   * Toggle inspection mode
   */
  toggleInspecting() {
    const isInspecting = this.stateManager.get('isInspecting');
    this.stateManager.set('isInspecting', !isInspecting);
    
    if (!isInspecting) {
      // Starting inspection
      this.stateManager.addLog('Inspection mode enabled', 'info', 'events');
      const startBtn = document.querySelector('#ha-start-inspecting');
      if (startBtn) {
        startBtn.textContent = '⏸ Stop Inspecting';
        startBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      }
    } else {
      // Stopping inspection
      this.stateManager.addLog('Inspection mode disabled', 'info', 'events');
      this.uiRenderer.hideHighlight();
      const startBtn = document.querySelector('#ha-start-inspecting');
      if (startBtn) {
        startBtn.textContent = '🚀 Start Inspecting';
        startBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      }
    }
  }
  
  /**
   * Handle mouse over event
   */
  handleMouseOver(e) {
    if (!this.stateManager.get('isInspecting')) return;
    if (e.target.hasAttribute('data-ha-ui')) return;
    if (e.target.closest('[data-ha-ui]')) return;
    
    const locked = this.stateManager.get('locked');
    if (locked) return; // Don't update highlight when locked
    
    // Update hovered element
    this.stateManager.set('hoveredElement', e.target);
    this.stateManager.set('mouseX', e.clientX);
    this.stateManager.set('mouseY', e.clientY);
    
    // Update visual highlight
    const rect = e.target.getBoundingClientRect();
    this.stateManager.set('currentRect', rect);
    this.uiRenderer.updateHighlight(rect);
    
    // Analyze element (debounced)
    this.debouncedAnalyze(e.target);
  }
  
  /**
   * Handle click event
   */
  handleClick(e) {
    if (!this.stateManager.get('isInspecting')) return;
    if (e.target.hasAttribute('data-ha-ui')) return;
    if (e.target.closest('[data-ha-ui]')) return;
    
    const autoLock = this.stateManager.get('autoLockMode');
    
    // Check if should lock element
    const shouldLock = autoLock || this.modifierHeld;
    
    if (shouldLock) {
      e.preventDefault();
      e.stopPropagation();
      
      this.lockElement(e.target);
    }
  }
  
  /**
   * Lock element for inspection
   */
  lockElement(element) {
    this.stateManager.update({
      locked: true,
      currentElement: element
    });
    
    // Analyze element fully
    const analysis = this.elementAnalyzer.analyzeElement(element);
    
    // Update UI
    this.uiRenderer.updateElementInfo(analysis);
    
    // Add to history
    this.stateManager.addToHistory(element, analysis.selector);
    
    // Update layer list
    this.updateLayersList();
    
    this.stateManager.addLog(`Locked element: ${analysis.tagName}`, 'success', 'events');
  }
  
  /**
   * Debounced element analysis
   */
  debouncedAnalyze = (() => {
    let timeout;
    return (element) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (!this.stateManager.get('locked')) {
          const analysis = this.elementAnalyzer.analyzeElement(element);
          this.uiRenderer.updateElementInfo(analysis);
        }
      }, 100);
    };
  })();
  
  /**
   * Handle keydown event
   */
  handleKeydown(e) {
    if (!this.stateManager.get('keyboardShortcutsEnabled')) return;
    
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    
    // Track modifier key
    this.modifierHeld = modifier;
    
    // Ctrl/Cmd+Shift+H: Toggle inspection
    if (modifier && e.shiftKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      this.toggleInspecting();
    }
    
    // Escape: Unlock element / Stop inspecting
    if (e.key === 'Escape') {
      if (this.stateManager.get('locked')) {
        this.unlockElement();
      } else if (this.stateManager.get('isInspecting')) {
        this.toggleInspecting();
      }
    }
  }
  
  /**
   * Handle keyup event
   */
  handleKeyup(e) {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const modifier = isMac ? e.metaKey : e.ctrlKey;
    
    if (!modifier) {
      this.modifierHeld = false;
    }
  }
  
  /**
   * Unlock element
   */
  unlockElement() {
    this.stateManager.update({
      locked: false,
      currentElement: null
    });
    
    this.uiRenderer.clearElementInfo();
    this.stateManager.addLog('Element unlocked', 'info', 'events');
  }
  
  /**
   * Send element data to AI via bridge
   */
  async sendToAI() {
    const element = this.stateManager.get('currentElement');
    if (!element) {
      this.stateManager.addLog('No element selected', 'warn', 'events');
      return;
    }
    
    const analysis = this.elementAnalyzer.buildFullContext(element);
    
    try {
      await this.bridgeClient.sendToAI(analysis);
      this.stateManager.addLog('Sent to AI assistant', 'success', 'events');
    } catch (error) {
      this.stateManager.addLog(`AI send failed: ${error.message}`, 'error', 'events');
    }
  }
  
  /**
   * Update layers list in Layers tab
   */
  updateLayersList() {
    const history = this.stateManager.get('inspectionHistory');
    const listDiv = document.getElementById('ha-layers-list');
    
    if (!listDiv) return;
    
    if (history.length === 0) {
      listDiv.innerHTML = '<div style="color: #64748b;">No inspection history yet</div>';
      return;
    }
    
    listDiv.innerHTML = history.slice().reverse().map((item, index) => `
      <div style="
        padding: 10px;
        background: rgba(15, 23, 42, 0.6);
        border-radius: 6px;
        margin-bottom: 8px;
        cursor: pointer;
        border: 1px solid rgba(148, 163, 184, 0.1);
      " data-selector="${this.escapeHtml(item.selector)}">
        <div style="font-weight: 600; color: #a78bfa; margin-bottom: 4px;">
          ${item.tagName}
        </div>
        <div style="font-family: monospace; font-size: 10px; color: #60a5fa; margin-bottom: 4px;">
          ${this.escapeHtml(item.selector)}
        </div>
        ${item.textContent ? `
          <div style="font-size: 10px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${this.escapeHtml(item.textContent)}
          </div>
        ` : ''}
      </div>
    `).join('');
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
   * Unregister all event listeners
   */
  unregisterEventListeners() {
    document.removeEventListener('mouseover', this.handlers.mouseOver);
    document.removeEventListener('click', this.handlers.click, true);
    document.removeEventListener('keydown', this.handlers.keydown);
    document.removeEventListener('keyup', this.handlers.keyup);
    
    console.log('[EventHandler] Event listeners unregistered');
  }
}
