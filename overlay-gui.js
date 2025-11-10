// ====================================================================
// HighlightAssist - Complete GUI Overlay (Browser Extension Port)
// Original React functionality ported to vanilla JS
// ====================================================================

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__HighlightAssistGUI__) return;
  window.__HighlightAssistGUI__ = true;

  // ====================================================================
  // GLOBAL ERROR HANDLER
  // ====================================================================
  var errorLog = [];
  
  function logError(error, context, stack) {
    var errorInfo = {
      time: new Date().toISOString(),
      message: error.message || String(error),
      context: context || 'Unknown',
      stack: stack || error.stack || new Error().stack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    errorLog.push(errorInfo);
    
    // Keep only last 50 errors
    if (errorLog.length > 50) {
      errorLog.shift();
    }
    
    // Log to console with full details
    console.error('🔴 [HighlightAssist Error]', {
      context: context,
      message: error.message || String(error),
      stack: error.stack,
      time: errorInfo.time
    });
    
    // Also add to internal log if available
    if (typeof log === 'function') {
      log('ERROR in ' + context + ': ' + (error.message || String(error)), 'error');
    }
    
    return errorInfo;
  }
  
  // Global error catcher
  window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('overlay-gui.js')) {
      logError(event.error || new Error(event.message), 'Global Error', event.error?.stack);
      event.preventDefault(); // Prevent default browser error handling
    }
  });
  
  // Unhandled promise rejection catcher
  window.addEventListener('unhandledrejection', function(event) {
    logError(event.reason, 'Unhandled Promise Rejection', event.reason?.stack);
    event.preventDefault();
  });
  
  // Export error log viewer
  window.__HA_getErrors__ = function() {
    console.table(errorLog);
    return errorLog;
  };
  
  window.__HA_clearErrors__ = function() {
    errorLog = [];
    console.log('✅ Error log cleared');
  };

  // ====================================================================
  // ELEMENT ANALYZER (Rule-based, no AI tokens)
  // ====================================================================
  class ElementAnalyzer {
    constructor() {
      this.issues = [];
      this.suggestions = [];
    }

    analyze(element, computedStyles) {
      this.issues = [];
      this.suggestions = [];

      this.checkAccessibility(element, computedStyles);
      this.checkResponsive(element, computedStyles);
      this.checkPerformance(element);
      this.checkSEO(element);
      this.checkLayout(element, computedStyles);

      return {
        issues: this.issues,
        suggestions: this.suggestions,
        severity: this.calculateSeverity()
      };
    }

    checkAccessibility(element, styles) {
      if (element.tagName === 'IMG' && !element.alt) {
        this.issues.push({
          type: 'accessibility',
          severity: 'high',
          message: 'Image missing alt text',
          fix: 'Add alt="" for decorative images or descriptive alt text'
        });
      }

      if (element.tagName === 'INPUT' && (!element.labels || element.labels.length === 0) && !element.getAttribute('aria-label')) {
        this.issues.push({
          type: 'accessibility',
          severity: 'high',
          message: 'Form input missing label',
          fix: 'Add <label> or aria-label attribute'
        });
      }

      if (element.onclick && element.tabIndex === -1 && element.tagName !== 'BUTTON' && element.tagName !== 'A') {
        this.issues.push({
          type: 'accessibility',
          severity: 'medium',
          message: 'Click handler on non-interactive element',
          fix: 'Add tabIndex="0" and keyboard event handlers'
        });
      }
    }

    checkResponsive(element, styles) {
      if (styles.width && styles.width.endsWith('px') && parseInt(styles.width) > 600) {
        this.suggestions.push({
          type: 'responsive',
          message: 'Large fixed width detected',
          reason: 'Consider using max-width or responsive units (%, rem, vw)',
          value: styles.width
        });
      }

      const rect = element.getBoundingClientRect();
      if ((element.tagName === 'BUTTON' || element.tagName === 'A' || element.onclick) &&
          (rect.width < 44 || rect.height < 44)) {
        this.issues.push({
          type: 'responsive',
          severity: 'medium',
          message: 'Touch target too small',
          fix: 'Minimum 44x44px for mobile accessibility',
          snippet: Math.round(rect.width) + 'x' + Math.round(rect.height) + 'px'
        });
      }

      if (element.scrollWidth > element.clientWidth) {
        this.issues.push({
          type: 'responsive',
          severity: 'low',
          message: 'Horizontal overflow detected',
          fix: 'Check for fixed widths or missing overflow handling'
        });
      }
    }

    checkPerformance(element) {
      if (element.tagName === 'IMG') {
        if (!element.loading) {
          this.suggestions.push({
            type: 'performance',
            message: 'Consider lazy loading',
            reason: 'Add loading="lazy" to defer off-screen images',
            fix: 'loading="lazy"'
          });
        }

        if (!element.width && !element.height) {
          this.issues.push({
            type: 'performance',
            severity: 'low',
            message: 'Image missing dimensions',
            fix: 'Add width/height attributes to prevent layout shift'
          });
        }
      }

      if (element.style.length > 3) {
        this.suggestions.push({
          type: 'performance',
          message: 'Heavy inline styles detected',
          reason: 'Move to CSS classes for better caching and reusability'
        });
      }
    }

    checkSEO(element) {
      if (element.tagName === 'A' && !element.textContent.trim() && !element.getAttribute('aria-label')) {
        this.issues.push({
          type: 'seo',
          severity: 'medium',
          message: 'Empty link text',
          fix: 'Add descriptive text or aria-label'
        });
      }

      if (element.tagName === 'H1') {
        const h1Count = document.querySelectorAll('h1').length;
        if (h1Count > 1) {
          this.suggestions.push({
            type: 'seo',
            message: 'Multiple H1 tags detected',
            reason: 'SEO best practice: one H1 per page',
            snippet: h1Count + ' H1 tags found'
          });
        }
      }
    }

    checkLayout(element, styles) {
      if (styles.opacity === '0' || styles.visibility === 'hidden') {
        if (styles.display !== 'none' && element.offsetHeight > 0) {
          this.suggestions.push({
            type: 'layout',
            message: 'Hidden element still occupies space',
            reason: 'Consider using display:none instead'
          });
        }
      }

      const zIndex = parseInt(styles.zIndex);
      if (zIndex > 1000) {
        this.suggestions.push({
          type: 'layout',
          message: 'Very high z-index',
          reason: 'Consider using a z-index scale (1-10) to avoid conflicts',
          snippet: 'z-index: ' + zIndex
        });
      }
    }

    calculateSeverity() {
      const highCount = this.issues.filter(function(i) { return i.severity === 'high'; }).length;
      const mediumCount = this.issues.filter(function(i) { return i.severity === 'medium'; }).length;
      
      if (highCount > 0) return 'high';
      if (mediumCount > 1) return 'medium';
      if (this.issues.length > 0) return 'low';
      return 'none';
    }
  }

  // ====================================================================
  // STATE MANAGEMENT
  // ====================================================================
  const state = {
    isInspecting: false,  // Start with inspection OFF by default
    locked: false,  // Element is locked (frozen) for inspection
    hoveredElement: null,
    selectedElement: null,
    lockedElement: null,  // The currently locked element
    currentRect: null,  // Bounding rectangle of locked/hovered element
    elementAnalysis: null,
    currentSelector: null,
    highlightColor: '#f97316',  // Orange color for highlight
    borderWidth: 2,
    overlayOpacity: 0.35,  // Opacity for visual overlay
    
    // Hover timer for analysis panel
    hoverTimer: null,
    hoverStartTime: null,
    hoverDelay: 3000,  // 3 seconds hover to show analysis
    
    // Auto-lock workflow
    autoLockOnClick: false,  // If true, click anywhere to lock; if false, require Ctrl/Cmd+click
    
    // Element tracking for smooth overlay
    trackedElement: null,
    elementObserver: null,
    lastKnownPosition: null,
    
    // WebSocket bridge
    bridgeWS: null,
    bridgeUrl: 'ws://127.0.0.1:5055/ws',
    bridgeConnected: false,
    bridgeHandshakeComplete: false,
    bridgeLastPing: null,
    
    // Instance management
    availableInstances: [],
    activeInstanceIndex: 0,
    instanceHealth: {},
    
    // Layer system (Photoshop-style)
    inspectedLayers: [],  // History of inspected elements
    maxLayers: 20,
    
    // Layer Inspector Panel
    layerInspectorOpen: false,
    layerInspectorMode: 'inspect',  // 'inspect' or 'document' mode
    layerItems: [],  // Elements at pointer position (z-index stack)
    hiddenLayers: new Map(),  // Map of hidden elements and their original visibility
    documentLayers: [],  // All major layers in document (document mode)
    
    // Mouse position tracking
    mouseX: 0,
    mouseY: 0,
    
    // Console logs
    consoleLogs: []
  };

  const analyzer = new ElementAnalyzer();
  
  // Visual highlight overlay element
  var highlightOverlay = null;

  // ====================================================================
  // SETTINGS PERSISTENCE
  // ====================================================================
  function saveSettings() {
    try {
      const settings = {
        highlightColor: state.highlightColor,
        borderWidth: state.borderWidth,
        overlayOpacity: state.overlayOpacity,
        autoLockOnClick: state.autoLockOnClick,
        bridgeUrl: state.bridgeUrl,
        isInspecting: state.isInspecting  // Save inspection state
      };
      localStorage.setItem('ha-settings', JSON.stringify(settings));
      log('Settings saved', 'info');
    } catch (e) {
      log('Failed to save settings: ' + e.message, 'error');
    }
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('ha-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        state.highlightColor = settings.highlightColor || '#f97316';
        state.borderWidth = settings.borderWidth || 2;
        state.overlayOpacity = settings.overlayOpacity !== undefined ? settings.overlayOpacity : 0.35;
        state.autoLockOnClick = settings.autoLockOnClick || false;
        state.bridgeUrl = settings.bridgeUrl || 'ws://127.0.0.1:5055/ws';
        state.isInspecting = settings.isInspecting !== undefined ? settings.isInspecting : false;  // Load inspection state
        log('Settings loaded', 'info');
        return true;
      }
    } catch (e) {
      log('Failed to load settings: ' + e.message, 'error');
    }
    return false;
  }

  // ====================================================================
  // ANALYSIS PANEL
  // ====================================================================
  function createAnalysisPanel() {
    const panel = document.createElement('div');
    panel.id = 'ha-analysis-panel';
    panel.setAttribute('data-ha-ui', 'true');
    
    Object.assign(panel.style, {
      position: 'fixed',
      // No default left/right/top positioning - will be set by updateAnalysisPanel
      width: '360px',
      maxHeight: 'calc(100vh - 100px)',
      overflowY: 'auto',
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      border: '2px solid #6b7280',
      borderRadius: '8px',
      padding: '16px',
      color: '#f3f4f6',
      fontSize: '13px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
      zIndex: '999998',
      backdropFilter: 'blur(8px)',
      display: 'none',
      cursor: 'default'  // Override crosshair cursor for UI
    });

    return panel;
  }

  function updateAnalysisPanel(panel, analysis, elementRect) {
    if (!analysis) {
      panel.style.display = 'none';
      return;
    }

    const issues = analysis.issues;
    const suggestions = analysis.suggestions;
    const severity = analysis.severity;
    
    const severityColors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
      none: '#6b7280'
    };
    const severityColor = severityColors[severity];

    const severityEmojis = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
      none: '⚪'
    };
    const severityEmoji = severityEmojis[severity];

    panel.style.borderColor = severityColor;
    panel.style.display = 'block';
    
    // Clear default positioning properties FIRST
    panel.style.right = '';
    panel.style.bottom = '';
    
    // Position panel at element center, adjusted for element size
    if (elementRect) {
      var centerX = elementRect.left + (elementRect.width / 2);
      var centerY = elementRect.top + (elementRect.height / 2);
      
      // Panel dimensions
      var panelWidth = 360;
      var panelMaxHeight = Math.min(500, window.innerHeight - 100);
      
      var leftPos, topPos;
      
      // Determine best position based on available space and element size
      var spaceRight = window.innerWidth - elementRect.right;
      var spaceLeft = elementRect.left;
      var spaceBelow = window.innerHeight - elementRect.bottom;
      var spaceAbove = elementRect.top;
      
      // Priority: Try to position near element without covering it
      if (spaceRight >= panelWidth + 40) {
        // Enough space to the right
        leftPos = elementRect.right + 20;
        topPos = Math.max(20, Math.min(elementRect.top, window.innerHeight - panelMaxHeight - 20));
      } else if (spaceBelow >= 300) {
        // Position below element, centered
        leftPos = Math.max(20, Math.min(centerX - panelWidth / 2, window.innerWidth - panelWidth - 20));
        topPos = elementRect.bottom + 20;
      } else if (spaceAbove >= 300) {
        // Position above element, centered
        leftPos = Math.max(20, Math.min(centerX - panelWidth / 2, window.innerWidth - panelWidth - 20));
        topPos = Math.max(20, elementRect.top - panelMaxHeight - 20);
      } else if (spaceLeft >= panelWidth + 40) {
        // Position to the left
        leftPos = Math.max(20, elementRect.left - panelWidth - 20);
        topPos = Math.max(20, Math.min(elementRect.top, window.innerHeight - panelMaxHeight - 20));
      } else {
        // Fallback: top-right corner
        leftPos = window.innerWidth - panelWidth - 20;
        topPos = 20;
      }
      
      panel.style.left = leftPos + 'px';
      panel.style.top = topPos + 'px';
    }

    let html = '<div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">';
    html += '<span style="font-size: 18px;">' + severityEmoji + '</span>';
    html += '<h3 style="margin: 0; font-size: 14px; font-weight: 600; color: ' + severityColor + ';">Element Analysis</h3>';
    html += '</div>';

    if (issues.length > 0) {
      html += '<div style="margin-bottom: 16px;">';
      html += '<h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #ef4444; text-transform: uppercase; letter-spacing: 0.5px;">';
      html += 'Issues Found (' + issues.length + ')';
      html += '</h4>';
      html += '<ul style="margin: 0; padding: 0 0 0 20px; list-style-type: disc;">';

      issues.forEach(function(issue) {
        html += '<li style="margin-bottom: 8px; line-height: 1.5; color: #fca5a5;">';
        html += '<span style="color: #f3f4f6;">' + issue.message + '</span>';
        if (issue.snippet) {
          html += '<code style="display: block; margin-top: 4px; padding: 4px 8px; background-color: rgba(0, 0, 0, 0.4); border-radius: 4px; font-size: 11px; font-family: monospace; color: #fbbf24; overflow: auto;">';
          html += issue.snippet;
          html += '</code>';
        }
        if (issue.fix) {
          html += '<div style="margin-top: 4px; font-size: 11px; color: #6ee7b7;">💡 ' + issue.fix + '</div>';
        }
        html += '</li>';
      });

      html += '</ul></div>';
    }

    if (suggestions.length > 0) {
      html += '<div>';
      html += '<h4 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px;">';
      html += 'Suggestions (' + suggestions.length + ')';
      html += '</h4>';
      html += '<ul style="margin: 0; padding: 0 0 0 20px; list-style-type: disc;">';

      suggestions.forEach(function(suggestion, idx) {
        html += '<li style="margin-bottom: 8px; line-height: 1.5; color: #86efac;">';
        html += '<span style="color: #f3f4f6;">' + suggestion.message + '</span>';
        if (suggestion.reason) {
          html += '<div style="margin-top: 2px; font-size: 11px; color: #9ca3af; font-style: italic;">' + suggestion.reason + '</div>';
        }
        if (suggestion.fix) {
          var escapedFix = suggestion.fix.replace(/"/g, '&quot;');
          html += '<div style="margin-top: 4px;">';
          html += '<code style="display: block; padding: 4px 8px; background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 4px; font-size: 11px; font-family: monospace; color: #6ee7b7; overflow: auto;">';
          html += suggestion.fix;
          html += '</code>';
          html += '<button class="ha-copy-btn" data-copy="' + escapedFix + '" style="margin-top: 4px; padding: 2px 8px; font-size: 10px; background-color: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 3px; color: #6ee7b7; cursor: pointer; font-family: system-ui;">📋 Copy Fix</button>';
          html += '</div>';
        }
        if (suggestion.snippet) {
          html += '<code style="display: block; margin-top: 4px; padding: 4px 8px; background-color: rgba(0, 0, 0, 0.4); border-radius: 4px; font-size: 11px; font-family: monospace; color: #fbbf24;">';
          html += suggestion.snippet;
          html += '</code>';
        }
        html += '</li>';
      });

      html += '</ul></div>';
    }

    // If no issues or suggestions, show "all clear" message
    if (issues.length === 0 && suggestions.length === 0) {
      html += '<div style="padding: 20px; text-align: center;">';
      html += '<div style="font-size: 48px; margin-bottom: 8px;">✅</div>';
      html += '<div style="font-size: 14px; font-weight: 600; color: #10b981; margin-bottom: 4px;">No Issues Found</div>';
      html += '<div style="font-size: 12px; color: #9ca3af;">This element looks good!</div>';
      html += '</div>';
    }
    
    // AI Command Prompt Section - Send to AI with context
    html += '<div style="margin-top: 16px; padding: 12px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.1)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 6px;">';
    html += '<div style="font-size: 10px; font-weight: 600; color: #a78bfa; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">🤖 AI Assistant</div>';
    
    html += '<textarea id="ha-ai-command" placeholder="Ask AI about this element... (e.g., \'Fix accessibility issues\', \'Optimize performance\', \'Explain this code\')" style="width: 100%; min-height: 60px; padding: 8px; background-color: rgba(15, 23, 42, 0.8); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 6px; color: #f1f5f9; font-size: 11px; font-family: system-ui; resize: vertical; margin-bottom: 8px;"></textarea>';
    
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">';
    html += '<button id="ha-send-to-ai" style="padding: 8px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border: none; border-radius: 4px; color: white; font-size: 11px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);" ' + (!state.bridgeConnected ? 'disabled' : '') + '>🚀 Send to AI</button>';
    html += '<button id="ha-copy-context" style="padding: 8px; background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #60a5fa; font-size: 11px; font-weight: 600; cursor: pointer;">📋 Copy Context</button>';
    html += '</div>';
    
    html += '<div style="margin-top: 6px; font-size: 9px; text-align: center;">';
    if (state.bridgeConnected) {
      html += '<span style="color: #10b981;">✓ Bridge connected - AI ready</span>';
    } else {
      html += '<span style="color: #f59e0b;">⚠️ Bridge offline - </span>';
      html += '<a id="ha-open-bridge-tab" href="#" style="color: #60a5fa; text-decoration: underline; font-weight: 600;">click here to connect</a>';
    }
    html += '</div>';
    html += '</div>';

    html += '<div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(107, 114, 128, 0.3); font-size: 11px; color: #9ca3af; font-style: italic;">';
    html += '💡 Rule-based analysis (no AI tokens used)';
    html += '</div>';

    panel.innerHTML = html;

    // Add copy button listeners
    panel.querySelectorAll('.ha-copy-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var text = btn.getAttribute('data-copy');
        navigator.clipboard.writeText(text);
        var original = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(function() { btn.textContent = original; }, 1500);
      });

      btn.addEventListener('mouseenter', function(e) {
        e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
      });

      btn.addEventListener('mouseleave', function(e) {
        e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
      });
    });

    // Add AI Assistant event listeners
    var sendToAiBtn = document.getElementById('ha-send-to-ai');
    if (sendToAiBtn) {
      sendToAiBtn.addEventListener('click', function() {
        var commandInput = document.getElementById('ha-ai-command');
        if (!commandInput) return;
        
        var command = commandInput.value.trim();
        if (!command) {
          log('No AI command entered', 'warning');
          return;
        }

        if (!state.bridgeConnected || !state.bridgeWS) {
          log('Bridge not connected - cannot send to AI', 'error');
          return;
        }

        try {
          var context = buildElementContext();
          var message = {
            type: 'ai_request',
            command: command,
            context: context,
            timestamp: Date.now()
          };

          state.bridgeWS.send(JSON.stringify(message));
          log('Sent AI request: ' + command, 'info');
          
          // Visual feedback
          var originalText = sendToAiBtn.textContent;
          sendToAiBtn.textContent = '✓ Sent!';
          sendToAiBtn.disabled = true;
          setTimeout(function() {
            sendToAiBtn.textContent = originalText;
            sendToAiBtn.disabled = false;
          }, 2000);

          // Clear command input
          commandInput.value = '';

        } catch (error) {
          log('Failed to send AI request: ' + error.message, 'error');
        }
      });
    }

    var copyContextBtn = document.getElementById('ha-copy-context');
    if (copyContextBtn) {
      copyContextBtn.addEventListener('click', function() {
        try {
          var context = buildElementContext();
          var contextText = JSON.stringify(context, null, 2);
          
          navigator.clipboard.writeText(contextText);
          
          var originalText = copyContextBtn.textContent;
          copyContextBtn.textContent = '✓ Copied!';
          setTimeout(function() {
            copyContextBtn.textContent = originalText;
          }, 1500);

          log('Element context copied to clipboard', 'info');
        } catch (error) {
          log('Failed to copy context: ' + error.message, 'error');
        }
      });
    }
    
    // Open Bridge Tab link (when bridge is offline)
    var openBridgeLink = document.getElementById('ha-open-bridge-tab');
    if (openBridgeLink) {
      openBridgeLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        // 1. Show control panel if hidden
        var controlPanel = document.getElementById('ha-control-panel');
        if (controlPanel) {
          if (controlPanel.style.display === 'none' || !controlPanel.style.display) {
            controlPanel.style.display = 'block';
            log('Control panel opened via Bridge shortcut', 'info');
          }
        }
        
        // 2. Switch to Bridge tab
        var bridgeTab = document.querySelector('.ha-tab[data-tab="bridge"]');
        if (bridgeTab) {
          // Remove active from all tabs
          document.querySelectorAll('.ha-tab').forEach(function(t) {
            t.classList.remove('active');
            t.style.backgroundColor = 'transparent';
            t.style.borderBottomColor = 'transparent';
            t.style.color = '#94a3b8';
          });
          
          // Activate Bridge tab
          bridgeTab.classList.add('active');
          bridgeTab.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
          bridgeTab.style.borderBottomColor = '#3b82f6';
          bridgeTab.style.color = '#60a5fa';
          
          // Update UI to show Bridge tab content
          updateUI();
          
          // Highlight animation on the Launch button
          setTimeout(function() {
            var launchBtn = document.getElementById('ha-launch-service');
            if (launchBtn) {
              // Pulse animation
              var pulseCount = 0;
              var pulseInterval = setInterval(function() {
                if (pulseCount >= 6) {
                  clearInterval(pulseInterval);
                  launchBtn.style.transform = '';
                  launchBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                  return;
                }
                
                if (pulseCount % 2 === 0) {
                  launchBtn.style.transform = 'scale(1.1)';
                  launchBtn.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.4), 0 0 20px rgba(16, 185, 129, 0.6)';
                } else {
                  launchBtn.style.transform = 'scale(1)';
                  launchBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                }
                pulseCount++;
              }, 300);
            }
          }, 100);
          
          log('Switched to Bridge tab - click 🚀 Start to launch service', 'info');
        }
      });
    }
  }

  // ====================================================================
  // FLOATING LAYER INSPECTOR PANEL (Photoshop-style)
  // ====================================================================
  function createLayerInspectorPanel() {
    var panel = document.createElement('div');
    panel.id = 'ha-layer-inspector-floating';
    panel.setAttribute('data-ha-ui', 'true');
    
    Object.assign(panel.style, {
      position: 'fixed',
      top: '80px',
      left: '20px',
      width: '360px',
      maxHeight: 'calc(100vh - 100px)',
      backgroundColor: 'rgba(15, 23, 42, 0.97)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '12px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#f1f5f9',
      zIndex: '999998',
      backdropFilter: 'blur(10px)',
      overflow: 'hidden',
      cursor: 'default',
      display: state.layerInspectorOpen ? 'block' : 'none'
    });
    
    panel.innerHTML = '<div id="ha-layer-drag-handle" style="padding: 12px 16px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.1)); border-bottom: 1px solid rgba(16, 185, 129, 0.2); cursor: move;"><div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;"><div><div style="font-weight: 600; font-size: 14px;">🎨 Layer Explorer</div><div style="font-size: 10px; color: #94a3b8;">Photoshop-style inspector</div></div><button id="ha-close-layer-inspector" style="width: 24px; height: 24px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; color: #f87171; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">×</button></div><div style="display: flex; gap: 4px; background: rgba(30, 41, 59, 0.6); border-radius: 6px; padding: 4px;"><button id="ha-layer-mode-inspect" class="ha-layer-mode-btn" data-mode="inspect" style="flex: 1; padding: 6px; background: ' + (state.layerInspectorMode === 'inspect' ? 'rgba(59, 130, 246, 0.3)' : 'transparent') + '; border: 1px solid ' + (state.layerInspectorMode === 'inspect' ? 'rgba(59, 130, 246, 0.4)' : 'transparent') + '; border-radius: 4px; color: ' + (state.layerInspectorMode === 'inspect' ? '#60a5fa' : '#94a3b8') + '; cursor: pointer; font-size: 10px; font-weight: 600;">🔍 Inspect Mode</button><button id="ha-layer-mode-document" class="ha-layer-mode-btn" data-mode="document" style="flex: 1; padding: 6px; background: ' + (state.layerInspectorMode === 'document' ? 'rgba(59, 130, 246, 0.3)' : 'transparent') + '; border: 1px solid ' + (state.layerInspectorMode === 'document' ? 'rgba(59, 130, 246, 0.4)' : 'transparent') + '; border-radius: 4px; color: ' + (state.layerInspectorMode === 'document' ? '#60a5fa' : '#94a3b8') + '; cursor: pointer; font-size: 10px; font-weight: 600;">📄 Document Mode</button></div></div><div id="ha-layer-inspector-content" style="padding: 12px; max-height: calc(100vh - 220px); overflow-y: auto;"></div><div style="padding: 12px; border-top: 1px solid rgba(71, 85, 105, 0.3); display: flex; gap: 8px;"><button id="ha-restore-all-layers" style="flex: 1; padding: 8px; background-color: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; color: #fbbf24; cursor: pointer; font-size: 11px;">👁️ Restore All</button></div>';
    
    return panel;
  }

  function updateLayerInspectorUI() {
    var panel = document.getElementById('ha-layer-inspector-floating');
    if (!panel) return;
    
    var content = panel.querySelector('#ha-layer-inspector-content');
    if (!content) return;
    
    var html = '';
    
    // INSPECT MODE: Show elements at cursor (dynamic, changes with hover/lock)
    if (state.layerInspectorMode === 'inspect') {
      // Show currently hovered/locked element preview
      var activeElement = state.lockedElement || state.hoveredElement;
      
      if (activeElement) {
        var layerInfo = ElementTracker.getLayerInfo(activeElement);
        html += '<div style="margin-bottom: 12px; padding: 12px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.1)); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px;">';
        html += '<div style="font-size: 10px; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">' + (state.locked ? '🔒 Locked Element' : '🎯 Hovered Element') + '</div>';
        html += '<div style="display: flex; align-items: center; gap: 12px;">';
        html += '<img src="' + layerInfo.preview + '" style="width: 80px; height: 60px; border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 6px; object-fit: cover;">';
        html += '<div style="flex: 1;"><div style="font-size: 12px; font-weight: 600; color: #60a5fa; margin-bottom: 4px;">' + layerInfo.tagName + '</div><div style="font-size: 10px; color: #94a3b8;">' + Math.round(layerInfo.rect.width) + ' × ' + Math.round(layerInfo.rect.height) + ' px</div><div style="font-size: 9px; color: #64748b;">z-index: ' + layerInfo.zIndex + ' • ' + layerInfo.position + '</div></div>';
        html += '</div>';
        html += '<div style="margin-top: 8px; padding: 6px; background: rgba(0, 0, 0, 0.3); border-radius: 4px; font-size: 9px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + layerInfo.selector + '</div>';
        html += '</div>';
      }
      
      // Show z-stack at pointer
      if (state.layerItems.length === 0) {
        html += '<div style="padding: 32px; text-align: center; color: #64748b; font-size: 11px; font-style: italic;">';
        html += '<div style="font-size: 32px; margin-bottom: 8px;">🎯</div>';
        html += 'Hover or lock an element<br>to see its layer info';
        html += '</div>';
      } else {
        html += '<div style="font-size: 10px; color: #64748b; margin: 12px 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Z-Stack at Pointer (' + state.layerItems.length + ')</div>';
        
        state.layerItems.forEach(function(item, index) {
          var layerNum = state.layerItems.length - index;
          var isHidden = state.hiddenLayers.has(item.element);
          var isActive = item.element === activeElement;
          
          html += '<div style="margin-bottom: 6px; padding: 8px; background-color: ' + (isActive ? 'rgba(59, 130, 246, 0.15)' : isHidden ? 'rgba(71, 85, 105, 0.2)' : 'rgba(30, 41, 59, 0.6)') + '; border: 1px solid ' + (isActive ? 'rgba(59, 130, 246, 0.4)' : 'rgba(71, 85, 105, 0.3)') + '; border-radius: 6px; ' + (isHidden ? 'opacity: 0.5;' : '') + '">';
          
          html += '<div style="display: flex; align-items: center; gap: 6px;">';
          html += '<img src="' + item.preview + '" style="width: 40px; height: 30px; flex-shrink: 0; border: 1px solid rgba(71, 85, 105, 0.5); border-radius: 4px; object-fit: cover;">';
          html += '<button class="ha-layer-eye-btn" data-layer-index="' + index + '" style="width: 20px; height: 20px; flex-shrink: 0; background: ' + (isHidden ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)') + '; border: 1px solid ' + (isHidden ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)') + '; border-radius: 3px; color: ' + (isHidden ? '#f87171' : '#60a5fa') + '; cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center; padding: 0;">' + (isHidden ? '🚫' : '👁️') + '</button>';
          html += '<div style="flex: 1; min-width: 0;"><div style="font-size: 10px; font-weight: 600; color: ' + (isActive ? '#60a5fa' : '#cbd5e1') + '; display: flex; align-items: center; gap: 4px;"><span style="color: #64748b;">#' + layerNum + '</span> <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + item.tagName + '</span> <span style="font-size: 8px; color: #64748b;">z:' + item.zIndex + '</span></div></div>';
          html += '<button class="ha-layer-lock-btn" data-layer-index="' + index + '" style="padding: 4px 8px; background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #60a5fa; cursor: pointer; font-size: 9px; flex-shrink: 0;">🔒</button>';
          html += '</div>';
          html += '</div>';
        });
      }
    }
    // DOCUMENT MODE: Show all major layers in document (static overview)
    else {
      html += '<div style="font-size: 10px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Document Layers</div>';
      
      // Get all major positioned elements
      if (state.documentLayers.length === 0) {
        // Scan document for major layers
        scanDocumentLayers();
      }
      
      if (state.documentLayers.length === 0) {
        html += '<div style="padding: 32px; text-align: center; color: #64748b; font-size: 11px; font-style: italic;">';
        html += '<div style="font-size: 32px; margin-bottom: 8px;">📄</div>';
        html += 'No positioned layers found<br><button id="ha-rescan-document" style="margin-top: 8px; padding: 6px 12px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #60a5fa; cursor: pointer; font-size: 10px;">Rescan Document</button>';
        html += '</div>';
      } else {
        state.documentLayers.forEach(function(item, index) {
          var isHidden = state.hiddenLayers.has(item.element);
          
          html += '<div style="margin-bottom: 8px; padding: 10px; background-color: ' + (isHidden ? 'rgba(71, 85, 105, 0.2)' : 'rgba(30, 41, 59, 0.6)') + '; border: 1px solid rgba(71, 85, 105, 0.3); border-radius: 6px; ' + (isHidden ? 'opacity: 0.5;' : '') + '">';
          
          html += '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">';
          html += '<img src="' + item.preview + '" style="width: 60px; height: 40px; flex-shrink: 0; border: 1px solid rgba(71, 85, 105, 0.5); border-radius: 4px; object-fit: cover;">';
          html += '<button class="ha-doc-layer-eye-btn" data-doc-layer-index="' + index + '" style="width: 24px; height: 24px; flex-shrink: 0; background: ' + (isHidden ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)') + '; border: 1px solid ' + (isHidden ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)') + '; border-radius: 4px; color: ' + (isHidden ? '#f87171' : '#60a5fa') + '; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; padding: 0;">' + (isHidden ? '🚫' : '👁️') + '</button>';
          html += '<div style="flex: 1; min-width: 0;"><div style="font-size: 11px; font-weight: 600; color: #cbd5e1;"><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + item.tagName + '</span> <span style="font-size: 9px; color: #64748b;">z:' + item.zIndex + '</span></div><div style="font-size: 9px; color: #64748b; margin-top: 2px;">' + Math.round(item.rect.width) + ' × ' + Math.round(item.rect.height) + ' px • ' + item.position + '</div></div>';
          html += '</div>';
          
          html += '<div style="margin-bottom: 6px; padding: 6px; background-color: rgba(0, 0, 0, 0.3); border-radius: 4px; font-size: 10px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + item.selector + '</div>';
          
          html += '<div style="display: flex; gap: 6px;">';
          html += '<button class="ha-doc-layer-lock-btn" data-doc-layer-index="' + index + '" style="flex: 1; padding: 6px; background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #60a5fa; cursor: pointer; font-size: 10px;">🔒 Lock</button>';
          html += '<button class="ha-doc-layer-copy-btn" data-doc-layer-index="' + index + '" style="flex: 1; padding: 6px; background-color: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 4px; color: #6ee7b7; cursor: pointer; font-size: 10px;">📋 Copy</button>';
          html += '</div>';
          
          html += '</div>';
        });
      }
    }
    
    content.innerHTML = html;
    
    // Add event listeners for INSPECT MODE
    content.querySelectorAll('.ha-layer-eye-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var index = parseInt(this.getAttribute('data-layer-index'));
        var item = state.layerItems[index];
        if (item) {
          toggleLayerVisibility(item.element, item.selector);
        }
      });
    });
    
    content.querySelectorAll('.ha-layer-lock-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var index = parseInt(this.getAttribute('data-layer-index'));
        var item = state.layerItems[index];
        if (item) {
          lockElementFromLayer(item.element);
        }
      });
    });
    
    content.querySelectorAll('.ha-layer-copy-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var selector = this.getAttribute('data-selector');
        navigator.clipboard.writeText(selector);
        var original = this.textContent;
        this.textContent = '✓ Copied!';
        var self = this;
        setTimeout(function() { self.textContent = original; }, 1500);
      });
    });
    
    // Add event listeners for DOCUMENT MODE
    content.querySelectorAll('.ha-doc-layer-eye-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var index = parseInt(this.getAttribute('data-doc-layer-index'));
        var item = state.documentLayers[index];
        if (item) {
          toggleLayerVisibility(item.element, item.selector);
        }
      });
    });
    
    content.querySelectorAll('.ha-doc-layer-lock-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var index = parseInt(this.getAttribute('data-doc-layer-index'));
        var item = state.documentLayers[index];
        if (item) {
          lockElementFromLayer(item.element);
        }
      });
    });
    
    content.querySelectorAll('.ha-doc-layer-copy-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var index = parseInt(this.getAttribute('data-doc-layer-index'));
        var item = state.documentLayers[index];
        if (item) {
          navigator.clipboard.writeText(item.selector);
          var original = this.textContent;
          this.textContent = '✓ Copied!';
          var self = this;
          setTimeout(function() { self.textContent = original; }, 1500);
        }
      });
    });
  }

  // ====================================================================
  // MAIN CONTROL PANEL
  // ====================================================================
  function createControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'ha-control-panel';
    panel.setAttribute('data-ha-ui', 'true');
    panel.setAttribute('data-ha-ui', 'control-panel'); // For showControlPanel to find it
    
    Object.assign(panel.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '380px',
      backgroundColor: 'rgba(15, 23, 42, 0.97)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      borderRadius: '12px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      color: '#f1f5f9',
      zIndex: '999999',
      backdropFilter: 'blur(10px)',
      overflow: 'hidden',
      cursor: 'default',  // Override crosshair cursor for UI
      display: 'none'  // HIDDEN BY DEFAULT - only show when user clicks "Open GUI Panel"
    });

    panel.innerHTML = '<div id="ha-drag-handle" style="padding: 12px 16px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.1)); border-bottom: 1px solid rgba(59, 130, 246, 0.2); cursor: move; display: flex; align-items: center; justify-content: space-between;"><div style="display: flex; align-items: center; gap: 8px;"><span style="font-size: 16px;">🔍</span><span style="font-weight: 600; font-size: 14px;">HighlightAssist</span></div><div style="display: flex; gap: 6px;"><button id="ha-minimize" style="width: 24px; height: 24px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #60a5fa; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">−</button><button id="ha-close" style="width: 24px; height: 24px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; color: #f87171; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">×</button></div></div><div id="ha-tabs" style="display: flex; border-bottom: 1px solid rgba(71, 85, 105, 0.3); background-color: rgba(15, 23, 42, 0.5);"><button class="ha-tab active" data-tab="main" style="flex: 1; padding: 10px; background: rgba(59, 130, 246, 0.15); border: none; border-bottom: 2px solid #3b82f6; color: #60a5fa; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">Main</button><button class="ha-tab" data-tab="layers" style="flex: 1; padding: 10px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #94a3b8; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">Component</button><button class="ha-tab" data-tab="settings" style="flex: 1; padding: 10px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #94a3b8; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">Settings</button><button class="ha-tab" data-tab="bridge" style="flex: 1; padding: 10px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #94a3b8; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">Bridge</button><button class="ha-tab" data-tab="console" style="flex: 1; padding: 10px; background: transparent; border: none; border-bottom: 2px solid transparent; color: #94a3b8; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s;">Console</button></div><div id="ha-content" style="max-height: 500px; overflow-y: auto;"></div>';

    return panel;
  }

  function renderMainTab() {
    var html = '<div style="padding: 16px;">';
    
    // Toggle inspect button - show correct state
    var inspectBtnText = state.isInspecting ? '⏸ Stop Inspecting' : '🎯 Start Inspecting';
    var inspectBtnBg = state.isInspecting ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #3b82f6, #2563eb)';
    html += '<button id="ha-toggle-inspect" style="width: 100%; padding: 12px; background: ' + inspectBtnBg + '; border: none; border-radius: 6px; color: white; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: all 0.2s;">' + inspectBtnText + '</button>';
    
    // Lock/Unlock button
    html += '<div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">';
    html += '<button id="ha-lock-element" style="padding: 10px; background-color: ' + (state.locked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)') + '; border: 1px solid ' + (state.locked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(100, 116, 139, 0.3)') + '; border-radius: 6px; color: ' + (state.locked ? '#6ee7b7' : '#94a3b8') + '; cursor: pointer; font-size: 12px; font-weight: 600;" ' + (!state.currentRect && !state.locked ? 'disabled' : '') + '>' + (state.locked ? '🔓 Unlock Element' : '🔒 Lock Element') + '</button>';
    html += '<button id="ha-save-snapshot" style="padding: 10px; background-color: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 6px; color: #c4b5fd; cursor: pointer; font-size: 12px; font-weight: 600;" ' + (!state.currentRect ? 'disabled' : '') + '>📸 Snapshot</button>';
    html += '</div>';
    
    // Info box: Click behavior
    html += '<div style="margin-top: 12px; padding: 10px; background-color: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px;">';
    html += '<div style="font-size: 11px; color: #93c5fd; line-height: 1.5;">';
    html += '💡 <strong>Click</strong> to lock/unlock<br>';
    html += '⌨️ <strong>Ctrl+Click</strong> sends to listener';
    html += '</div>';
    html += '</div>';
    
    // Layer Inspector button
    html += '<div style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">';
    html += '<button id="ha-toggle-layer-inspector" style="padding: 8px; background-color: ' + (state.layerInspectorOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)') + '; border: 1px solid ' + (state.layerInspectorOpen ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)') + '; border-radius: 6px; color: ' + (state.layerInspectorOpen ? '#6ee7b7' : '#60a5fa') + '; cursor: pointer; font-size: 12px; font-weight: 600;">' + (state.layerInspectorOpen ? '🗙 Hide Layers' : '🎨 Layer Explorer') + '</button>';
    html += '<button id="ha-refresh-layers" style="padding: 8px; background-color: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; color: #fbbf24; cursor: pointer; font-size: 12px; font-weight: 600;" ' + (!state.layerInspectorOpen ? 'disabled' : '') + '>🔄 Refresh</button>';
    html += '</div>';
    
    html += '<div id="ha-selector-info" style="margin-top: 16px; padding: 12px; background-color: rgba(30, 41, 59, 0.6); border: 1px solid rgba(71, 85, 105, 0.4); border-radius: 6px; display: none;">';
    html += '<div style="font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Selected Element</div>';
    html += '<code id="ha-current-selector" style="display: block; padding: 8px; background-color: rgba(0, 0, 0, 0.4); border-radius: 4px; font-size: 11px; color: #fbbf24; overflow-wrap: break-word;"></code>';
    html += '<div style="margin-top: 8px; display: flex; gap: 6px;">';
    html += '<button id="ha-copy-selector" style="flex: 1; padding: 6px; background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #60a5fa; cursor: pointer; font-size: 11px;">📋 Copy Selector</button>';
    html += '<button id="ha-copy-xpath" style="flex: 1; padding: 6px; background-color: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 4px; color: #6ee7b7; cursor: pointer; font-size: 11px;">📋 Copy XPath</button>';
    html += '</div></div>';
    html += '<div style="margin-top: 16px; padding: 12px; background-color: rgba(30, 41, 59, 0.4); border: 1px solid rgba(71, 85, 105, 0.3); border-radius: 6px; font-size: 11px; color: #cbd5e1;">';
    html += '<div style="margin-bottom: 6px;">✨ <strong>Inspection Active!</strong> Hover over elements to analyze</div>';
    html += '<div style="margin-top: 4px;">⌨️ <strong>Shortcuts:</strong> Ctrl/Cmd+Shift+H to toggle inspection</div>';
    html += '<div>🎨 Analysis appears in the right panel when issues are detected</div>';
    html += '</div></div>';
    return html;
  }

  // ====================================================================
  // COMPONENT DETECTION HELPERS
  // ====================================================================
  function detectFramework(element) {
    if (!element) return 'Vanilla JS';
    
    // Check for React
    var reactKeys = Object.keys(element).filter(function(key) {
      return key.startsWith('__react') || key.startsWith('_react');
    });
    if (reactKeys.length > 0) return 'React';
    
    // Check for Vue
    if (element.__vue__ || element.__vueParentComponent) return 'Vue';
    
    // Check for Angular
    if (element.ng || element.__ngContext__) return 'Angular';
    
    // Check for Svelte
    if (element.__svelte_meta) return 'Svelte';
    
    // Check for Web Components
    if (element.tagName && element.tagName.includes('-')) return 'Web Component';
    
    return 'Vanilla JS';
  }
  
  function extractComponentInfo(element, framework) {
    var info = {
      componentStack: [],
      props: {},
      state: {},
      events: []
    };
    
    if (!element) return info;
    
    try {
      // Build component hierarchy
      var current = element;
      var depth = 0;
      while (current && depth < 10) {
        var componentName = getComponentName(current, framework);
        if (componentName) {
          info.componentStack.unshift(componentName);
        }
        current = current.parentElement;
        depth++;
      }
      
      // Extract props/attributes
      if (element.attributes) {
        for (var i = 0; i < element.attributes.length; i++) {
          var attr = element.attributes[i];
          info.props[attr.name] = attr.value;
        }
      }
      
      // Framework-specific extraction
      if (framework === 'React') {
        extractReactInfo(element, info);
      } else if (framework === 'Vue') {
        extractVueInfo(element, info);
      } else if (framework === 'Angular') {
        extractAngularInfo(element, info);
      }
      
      // Extract event listeners
      var listeners = getEventListeners(element);
      info.events = Object.keys(listeners).filter(function(event) {
        return listeners[event].length > 0;
      });
      
    } catch (e) {
      log('Error extracting component info: ' + e.message, 'error');
    }
    
    return info;
  }
  
  function getComponentName(element, framework) {
    if (!element) return null;
    
    // Check for custom element/component name
    if (element.dataset && element.dataset.component) {
      return element.dataset.component;
    }
    
    // React component name
    if (framework === 'React') {
      var reactKeys = Object.keys(element).filter(function(key) {
        return key.startsWith('__react') || key.startsWith('_react');
      });
      if (reactKeys.length > 0) {
        var fiber = element[reactKeys[0]];
        if (fiber && fiber.type && fiber.type.name) {
          return fiber.type.name;
        }
        if (fiber && fiber.elementType && fiber.elementType.name) {
          return fiber.elementType.name;
        }
      }
    }
    
    // Vue component name
    if (framework === 'Vue' && element.__vue__) {
      var vueInstance = element.__vue__;
      if (vueInstance.$options && vueInstance.$options.name) {
        return vueInstance.$options.name;
      }
    }
    
    // Fallback to tag name for significant elements
    var tagName = element.tagName.toLowerCase();
    if (['div', 'span'].indexOf(tagName) === -1) {
      return '<' + tagName + '>';
    }
    
    // Check for meaningful class names
    if (element.className && typeof element.className === 'string') {
      var classes = element.className.split(' ')[0];
      if (classes && classes.length < 30) {
        return '.' + classes;
      }
    }
    
    return null;
  }
  
  function extractReactInfo(element, info) {
    try {
      var reactKeys = Object.keys(element).filter(function(key) {
        return key.startsWith('__react') || key.startsWith('_react');
      });
      
      if (reactKeys.length > 0) {
        var fiber = element[reactKeys[0]];
        
        // Extract props
        if (fiber && fiber.memoizedProps) {
          Object.assign(info.props, fiber.memoizedProps);
        }
        
        // Extract state
        if (fiber && fiber.memoizedState) {
          info.state = { hasState: true };
          if (typeof fiber.memoizedState === 'object') {
            Object.assign(info.state, fiber.memoizedState);
          }
        }
      }
    } catch (e) {
      log('Error extracting React info: ' + e.message, 'error');
    }
  }
  
  function extractVueInfo(element, info) {
    try {
      if (element.__vue__) {
        var vueInstance = element.__vue__;
        
        // Extract props
        if (vueInstance.$props) {
          Object.assign(info.props, vueInstance.$props);
        }
        
        // Extract data/state
        if (vueInstance.$data) {
          Object.assign(info.state, vueInstance.$data);
        }
      }
    } catch (e) {
      log('Error extracting Vue info: ' + e.message, 'error');
    }
  }
  
  function extractAngularInfo(element, info) {
    try {
      if (element.__ngContext__) {
        // Angular's context is complex, just note it exists
        info.state = { angularContext: 'present' };
      }
    } catch (e) {
      log('Error extracting Angular info: ' + e.message, 'error');
    }
  }
  
  function getEventListeners(element) {
    // Try to get event listeners (Chrome/Edge specific API)
    if (typeof window.getEventListeners === 'function') {
      return window.getEventListeners(element);
    }
    
    // Fallback: check common event attributes
    var commonEvents = ['click', 'mousedown', 'mouseup', 'mouseover', 'mouseout', 'keydown', 'keyup', 'submit', 'change', 'input', 'focus', 'blur'];
    var listeners = {};
    
    commonEvents.forEach(function(event) {
      if (element['on' + event]) {
        listeners[event] = [{ useCapture: false }];
      }
    });
    
    return listeners;
  }
  
  function truncateValue(value) {
    var str = String(value);
    return str.length > 50 ? str.substring(0, 47) + '...' : str;
  }
  
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Build comprehensive element context for AI assistance
  function buildElementContext() {
    if (!state.currentElement) {
      throw new Error('No element selected');
    }

    var element = state.currentElement;
    var context = {
      selector: state.currentSelector || getSelector(element),
      tagName: element.tagName.toLowerCase(),
      timestamp: Date.now()
    };

    // HTML structure (truncated if too long)
    try {
      var html = element.outerHTML;
      context.html = html.length > 1000 ? html.substring(0, 997) + '...' : html;
      context.innerHTML = element.innerHTML.length > 500 ? element.innerHTML.substring(0, 497) + '...' : element.innerHTML;
      context.textContent = element.textContent ? element.textContent.trim().substring(0, 200) : '';
    } catch (e) {
      context.html = '[Error reading HTML]';
    }

    // Attributes
    context.attributes = {};
    if (element.attributes) {
      for (var i = 0; i < element.attributes.length; i++) {
        var attr = element.attributes[i];
        context.attributes[attr.name] = attr.value;
      }
    }

    // Inline styles
    context.inlineStyles = element.style.cssText || 'none';

    // Computed styles (key properties only to reduce size)
    try {
      var computed = window.getComputedStyle(element);
      context.computedStyles = {
        display: computed.display,
        position: computed.position,
        width: computed.width,
        height: computed.height,
        margin: computed.margin,
        padding: computed.padding,
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        zIndex: computed.zIndex,
        opacity: computed.opacity,
        visibility: computed.visibility
      };
    } catch (e) {
      context.computedStyles = '[Error reading computed styles]';
    }

    // Dimensions and position
    if (state.currentRect) {
      context.dimensions = {
        width: state.currentRect.width,
        height: state.currentRect.height,
        top: state.currentRect.top,
        left: state.currentRect.left,
        right: state.currentRect.right,
        bottom: state.currentRect.bottom
      };
    }

    // Framework detection
    var framework = detectFramework(element);
    context.framework = framework;

    // Component info (if framework detected)
    if (framework !== 'Vanilla JS') {
      try {
        var componentInfo = extractComponentInfo(element, framework);
        context.component = {
          name: componentInfo.name || 'Unknown',
          props: componentInfo.props || {},
          state: componentInfo.state || {},
          events: componentInfo.events || []
        };
      } catch (e) {
        context.component = '[Error extracting component info]';
      }
    }

    // Analysis results (issues and suggestions)
    if (state.elementAnalysis) {
      context.analysis = {
        issues: state.elementAnalysis.issues || [],
        suggestions: state.elementAnalysis.suggestions || [],
        severity: {
          critical: (state.elementAnalysis.issues || []).filter(function(i) { return i.severity === 'critical'; }).length,
          warning: (state.elementAnalysis.issues || []).filter(function(i) { return i.severity === 'warning'; }).length,
          info: (state.elementAnalysis.issues || []).filter(function(i) { return i.severity === 'info'; }).length
        }
      };
    }

    // Parent hierarchy (up to 3 levels)
    context.parents = [];
    var parent = element.parentElement;
    var maxParents = 3;
    while (parent && maxParents > 0) {
      context.parents.push({
        tagName: parent.tagName.toLowerCase(),
        id: parent.id || null,
        className: parent.className || null
      });
      parent = parent.parentElement;
      maxParents--;
    }

    // Event listeners
    try {
      var listeners = getEventListeners(element);
      context.eventListeners = listeners.length > 0 ? listeners : [];
    } catch (e) {
      context.eventListeners = [];
    }

    return context;
  }

  function renderLayersTab() {
    var html = '<div style="padding: 16px;">';
    
    // Header
    html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">';
    html += '<span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">⚛️ Component Inspector</span>';
    html += '<button id="ha-refresh-component" style="padding: 4px 8px; background-color: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #60a5fa; cursor: pointer; font-size: 10px;">🔄 Refresh</button>';
    html += '</div>';
    
    if (!state.currentElement) {
      html += '<div style="padding: 32px; text-align: center; color: #64748b; font-size: 11px; font-style: italic;">';
      html += '<div style="font-size: 32px; margin-bottom: 8px;">⚛️</div>';
      html += 'No element selected<br>Hover or click on an element to inspect';
      html += '</div>';
    } else {
      // Auto-detect framework
      var framework = detectFramework(state.currentElement);
      var componentInfo = extractComponentInfo(state.currentElement, framework);
      
      // Framework Badge
      html += '<div style="margin-bottom: 12px; padding: 8px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 6px; text-align: center;">';
      html += '<span style="font-size: 11px; font-weight: 600; color: #a5b4fc;">🎯 Framework: ' + framework + '</span>';
      html += '</div>';
      
      // Component Stack
      if (componentInfo.componentStack && componentInfo.componentStack.length > 0) {
        html += '<div style="margin-bottom: 16px;">';
        html += '<div style="font-size: 10px; font-weight: 600; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">📚 Component Hierarchy</div>';
        html += '<div style="display: flex; flex-direction: column; gap: 4px;">';
        
        componentInfo.componentStack.forEach(function(comp, idx) {
          var isLast = idx === componentInfo.componentStack.length - 1;
          html += '<div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background-color: ' + (isLast ? 'rgba(59, 130, 246, 0.15)' : 'rgba(30, 41, 59, 0.4)') + '; border-left: 2px solid ' + (isLast ? '#3b82f6' : '#475569') + '; border-radius: 4px;">';
          html += '<span style="font-size: 10px; color: #64748b;">' + '→'.repeat(idx) + '</span>';
          html += '<span style="font-size: 11px; font-weight: 600; color: ' + (isLast ? '#60a5fa' : '#e2e8f0') + ';">' + comp + '</span>';
          html += '</div>';
        });
        
        html += '</div>';
        html += '</div>';
      }
      
      // Props/Attributes
      html += '<div style="margin-bottom: 16px;">';
      html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">';
      html += '<div style="font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">🎛️ Props & Attributes</div>';
      html += '<button id="ha-copy-props" style="padding: 2px 6px; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 3px; color: #34d399; cursor: pointer; font-size: 9px;">Copy JSON</button>';
      html += '</div>';
      
      if (componentInfo.props && Object.keys(componentInfo.props).length > 0) {
        html += '<div style="max-height: 200px; overflow-y: auto; background-color: rgba(15, 23, 42, 0.6); border: 1px solid rgba(71, 85, 105, 0.3); border-radius: 6px; padding: 8px;">';
        Object.entries(componentInfo.props).forEach(function([key, value]) {
          html += '<div style="display: flex; justify-content: space-between; align-items: start; padding: 4px 0; border-bottom: 1px solid rgba(71, 85, 105, 0.2);">';
          html += '<span style="font-size: 10px; font-weight: 600; color: #a78bfa; font-family: monospace;">' + escapeHtml(key) + ':</span>';
          html += '<span style="font-size: 10px; color: #cbd5e1; font-family: monospace; text-align: right; max-width: 60%; word-break: break-all;">' + escapeHtml(truncateValue(value)) + '</span>';
          html += '</div>';
        });
        html += '</div>';
      } else {
        html += '<div style="padding: 12px; text-align: center; color: #64748b; font-size: 10px; background-color: rgba(30, 41, 59, 0.3); border-radius: 4px;">No props detected</div>';
      }
      html += '</div>';
      
      // Event Listeners
      html += '<div style="margin-bottom: 16px;">';
      html += '<div style="font-size: 10px; font-weight: 600; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Event Listeners</div>';
      
      if (componentInfo.events && componentInfo.events.length > 0) {
        html += '<div style="display: flex; flex-wrap: wrap; gap: 4px;">';
        componentInfo.events.forEach(function(event) {
          html += '<div style="padding: 4px 8px; background-color: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 4px; font-size: 9px; color: #fbbf24; font-family: monospace;">' + event + '</div>';
        });
        html += '</div>';
      } else {
        html += '<div style="padding: 12px; text-align: center; color: #64748b; font-size: 10px; background-color: rgba(30, 41, 59, 0.3); border-radius: 4px;">No event listeners</div>';
      }
      html += '</div>';
      
      // State/Data (if available)
      if (componentInfo.state && Object.keys(componentInfo.state).length > 0) {
        html += '<div style="margin-bottom: 16px;">';
        html += '<div style="font-size: 10px; font-weight: 600; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">💾 State/Data</div>';
        html += '<div style="max-height: 150px; overflow-y: auto; background-color: rgba(15, 23, 42, 0.6); border: 1px solid rgba(71, 85, 105, 0.3); border-radius: 6px; padding: 8px;">';
        Object.entries(componentInfo.state).forEach(function([key, value]) {
          html += '<div style="display: flex; justify-content: space-between; align-items: start; padding: 4px 0; border-bottom: 1px solid rgba(71, 85, 105, 0.2);">';
          html += '<span style="font-size: 10px; font-weight: 600; color: #f472b6; font-family: monospace;">' + escapeHtml(key) + ':</span>';
          html += '<span style="font-size: 10px; color: #cbd5e1; font-family: monospace; text-align: right; max-width: 60%; word-break: break-all;">' + escapeHtml(truncateValue(value)) + '</span>';
          html += '</div>';
        });
        html += '</div>';
        html += '</div>';
      }
      
      // Quick Actions
      html += '<div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(71, 85, 105, 0.3);">';
      html += '<div style="font-size: 10px; font-weight: 600; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Quick Actions</div>';
      html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">';
      html += '<button class="ha-component-action" data-action="copy-selector" style="padding: 8px; background-color: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #60a5fa; cursor: pointer; font-size: 10px; font-weight: 600;">📋 Copy Selector</button>';
      html += '<button class="ha-component-action" data-action="copy-xpath" style="padding: 8px; background-color: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 4px; color: #a78bfa; cursor: pointer; font-size: 10px; font-weight: 600;">🎯 Copy XPath</button>';
      html += '<button class="ha-component-action" data-action="log-element" style="padding: 8px; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 4px; color: #34d399; cursor: pointer; font-size: 10px; font-weight: 600;">🖥️ Log to Console</button>';
      html += '<button class="ha-component-action" data-action="highlight-parent" style="padding: 8px; background-color: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 4px; color: #fbbf24; cursor: pointer; font-size: 10px; font-weight: 600;">⬆️ Parent Element</button>';
      html += '</div>';
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }

  function renderSettingsTab() {
    var html = '<div style="padding: 16px;">';
    
    // Highlight Color Picker
    html += '<div style="margin-bottom: 20px;">';
    html += '<label style="display: block; font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Highlight Color</label>';
    html += '<input type="color" id="ha-color-picker" value="' + state.highlightColor + '" style="width: 100%; height: 50px; border: 2px solid rgba(71, 85, 105, 0.4); border-radius: 8px; background-color: rgba(30, 41, 59, 0.6); cursor: pointer;">';
    html += '<div style="margin-top: 6px; font-size: 10px; color: #64748b; text-align: center;">' + state.highlightColor.toUpperCase() + '</div>';
    html += '</div>';
    
    // Overlay Opacity Slider
    html += '<div style="margin-bottom: 20px;">';
    html += '<label style="display: block; font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Overlay Opacity: <span id="ha-opacity-value">' + Math.round(state.overlayOpacity * 100) + '%</span></label>';
    html += '<input type="range" id="ha-opacity-slider" min="0" max="100" value="' + Math.round(state.overlayOpacity * 100) + '" style="width: 100%;">';
    html += '</div>';
    
    // Border Width Slider
    html += '<div style="margin-bottom: 20px;">';
    html += '<label style="display: block; font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Border Width: <span id="ha-width-value">' + state.borderWidth + 'px</span></label>';
    html += '<input type="range" id="ha-width-slider" min="1" max="10" value="' + state.borderWidth + '" style="width: 100%;">';
    html += '</div>';
    
    // Reset Button
    html += '<button id="ha-reset-settings" style="width: 100%; padding: 10px; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; color: #f87171; cursor: pointer; font-size: 12px; font-weight: 600;">🔄 Reset to Defaults</button>';
    html += '</div>';
    return html;
  }

  // Add this after detecting if bridge is not connected
// Enhanced setup wizard with animation
function showSetupWizard() {
  var os = detectOS(); // 'windows', 'mac', or 'linux'
  var installerUrl = 'https://github.com/Skullcandyxxx/HighlightAssist/releases/latest/download/';
  var installerFile = '';
  var icon = '';
  
  if (os === 'windows') {
    installerFile = 'install-windows.bat';
    icon = '';
  } else if (os === 'mac') {
    installerFile = 'install-macos.sh';
    icon = '';
  } else {
    installerFile = 'install-linux.sh';
    icon = '';
  }
  
  var html = '<div style="text-align: center; padding: 20px; animation: fadeIn 0.5s;">';
  
  // Animated icon
  html += '<div style="font-size: 64px; margin-bottom: 16px; animation: bounce 2s infinite;">';
  html += icon;
  html += '</div>';
  
  // Title
  html += '<h3 style="color: #f59e0b; margin-bottom: 8px; font-size: 16px;"> Service Not Detected</h3>';
  html += '<p style="color: #94a3b8; font-size: 12px; margin-bottom: 20px;">Install the bridge service to enable AI features</p>';
  
  // Steps
  html += '<div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: left;">';
  html += '<div style="font-size: 11px; font-weight: 600; color: #60a5fa; margin-bottom: 12px;"> Quick Setup (30 seconds)</div>';
  
  html += '<div style="display: flex; align-items: start; margin-bottom: 10px;">';
  html += '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 10px; font-weight: 700; flex-shrink: 0;">1</div>';
  html += '<div style="color: #cbd5e1; font-size: 11px;">Download installer for ' + os.toUpperCase() + '</div>';
  html += '</div>';
  
  html += '<div style="display: flex; align-items: start; margin-bottom: 10px;">';
  html += '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 10px; font-weight: 700; flex-shrink: 0;">2</div>';
  html += '<div style="color: #cbd5e1; font-size: 11px;">Run the installer (auto-installs Python deps)</div>';
  html += '</div>';
  
  html += '<div style="display: flex; align-items: start;">';
  html += '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 10px; font-weight: 700; flex-shrink: 0;">3</div>';
  html += '<div style="color: #cbd5e1; font-size: 11px;">Click "Start" button above - Done! </div>';
  html += '</div>';
  
  html += '</div>';
  
  // Download button
  html += '<a href="' + installerUrl + installerFile + '" download style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 8px; color: white; font-size: 13px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); transition: transform 0.2s; cursor: pointer;" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">';
  html += ' Download Installer';
  html += '</a>';
  
  // Manual link
  html += '<div style="margin-top: 16px;">';
  html += '<a href="https://github.com/Skullcandyxxx/HighlightAssist#readme" target="_blank" style="color: #60a5fa; font-size: 10px; text-decoration: underline;">View full installation guide </a>';
  html += '</div>';
  
  html += '</div>';
  
  // CSS animations
  html += '<style>';
  html += '@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }';
  html += '@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }';
  html += '</style>';
  
  return html;
}

function detectOS() {
  var platform = navigator.platform.toLowerCase();
  var userAgent = navigator.userAgent.toLowerCase();
  
  if (platform.indexOf('win') !== -1) return 'windows';
  if (platform.indexOf('mac') !== -1 || userAgent.indexOf('mac') !== -1) return 'mac';
  return 'linux';
}


  function renderBridgeTab() {
    var statusColor = state.bridgeConnected ? '#10b981' : '#ef4444';
    var statusText = state.bridgeConnected ? '✓ Connected' : '✗ Disconnected';
    
    var html = '<div style="padding: 16px;">';
    
    // AUTO-DETECTED PROJECT INFO
    var projectPath = window.location.origin;
    var projectName = window.location.hostname.split('.')[0] || 'Unknown';
    var detectedPort = window.location.port || '80';
    
    html += '<div style="margin-bottom: 16px; padding: 12px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.1)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px;">';
    html += '<div style="font-size: 11px; font-weight: 700; color: #a78bfa; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;"><span>🤖</span> AI Bridge Auto-Setup</div>';
    
    html += '<div style="background-color: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 6px; margin-bottom: 10px;">';
    html += '<div style="font-size: 9px; color: #64748b; margin-bottom: 4px;">📁 DETECTED PROJECT</div>';
    html += '<div style="font-size: 11px; font-weight: 600; color: #c4b5fd; margin-bottom: 2px;">' + projectName + '</div>';
    html += '<div style="font-size: 10px; color: #94a3b8; font-family: monospace;">' + projectPath + '</div>';
    html += '</div>';
    
    // Service Status & One-Click Launcher
    html += '<div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 10px;">';
    html += '<div style="background-color: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 6px; border: 1px solid ' + (state.bridgeConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)') + ';">';
    html += '<div style="font-size: 9px; color: #64748b; margin-bottom: 2px;">HighlightAssist Bridge • Port 5055</div>';
    html += '<div style="font-size: 13px; font-weight: 700; color: ' + statusColor + ';">' + (state.bridgeConnected ? '🟢 RUNNING' : '⚫ STOPPED') + '</div>';
    if (state.bridgeConnected && state.bridgeLastPing) {
      var timeSincePing = Math.round((Date.now() - state.bridgeLastPing) / 1000);
      html += '<div style="font-size: 8px; color: #64748b; margin-top: 2px;">Active ' + timeSincePing + 's ago</div>';
    }
    html += '</div>';
    
    html += '<button id="ha-launch-service" style="padding: 10px 16px; background: ' + (state.bridgeConnected ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)') + '; border: none; border-radius: 6px; color: white; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); white-space: nowrap;">';
    html += state.bridgeConnected ? '🛑 Stop' : '🚀 Start';
    html += '</button>';
    html += '</div>';
    
    // Show setup wizard if bridge not connected
    if (!state.bridgeConnected) {
      html += showSetupWizard();
    }
    
    // AI Configuration Helper
    html += '<div style="background-color: rgba(59, 130, 246, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.3); margin-bottom: 10px;">';
    html += '<div style="font-size: 9px; font-weight: 600; color: #60a5fa; margin-bottom: 6px;">💡 AI SETUP GUIDE</div>';
    html += '<div style="font-size: 9px; color: #93c5fd; line-height: 1.4; margin-bottom: 6px;">Configure GitHub Copilot / VSCode AI:</div>';
    html += '<code style="display: block; background-color: rgba(0, 0, 0, 0.4); padding: 6px; border-radius: 4px; font-size: 9px; color: #fbbf24; margin-bottom: 4px; overflow-x: auto; white-space: pre;">ws://localhost:5055/ws</code>';
    html += '<button id="ha-copy-ws-url" style="padding: 4px 8px; background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #60a5fa; cursor: pointer; font-size: 8px; font-weight: 600; width: 100%;">📋 Copy WebSocket URL</button>';
    html += '</div>';
    
    html += '</div>';
    
    // Manual Configuration (Collapsible)
    html += '<details style="margin-bottom: 16px;"><summary style="padding: 10px; background-color: rgba(100, 116, 139, 0.15); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 6px; cursor: pointer; font-size: 10px; font-weight: 600; color: #94a3b8;">⚙️ Manual Configuration</summary>';
    html += '<div style="padding: 12px; background-color: rgba(15, 23, 42, 0.4); border: 1px solid rgba(71, 85, 105, 0.3); border-bottom-left-radius: 6px; border-bottom-right-radius: 6px;">';
    
    // Bridge URL + Quick Presets
    html += '<label style="display: block; font-size: 9px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">🔗 Bridge Endpoint</label>';
    html += '<div style="display: flex; gap: 6px; margin-bottom: 6px;">';
    html += '<input type="text" id="ha-bridge-url" value="' + state.bridgeUrl + '" style="flex: 1; padding: 8px; background-color: rgba(15, 23, 42, 0.8); border: 1px solid rgba(71, 85, 105, 0.4); border-radius: 6px; color: #f1f5f9; font-size: 10px; font-family: monospace;" placeholder="ws://localhost:5055/ws">';
    html += '<button id="ha-save-bridge-url" style="padding: 8px 12px; background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; color: #60a5fa; cursor: pointer; font-size: 10px; font-weight: 600;">💾</button>';
    html += '</div>';
    
    // Quick URL Presets
    html += '<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px;">';
    html += '<button class="ha-bridge-preset" data-url="ws://localhost:5055/ws" style="padding: 4px 8px; background-color: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 4px; color: #94a3b8; cursor: pointer; font-size: 9px;">:5055</button>';
    html += '<button class="ha-bridge-preset" data-url="ws://localhost:3000/ws" style="padding: 4px 8px; background-color: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 4px; color: #94a3b8; cursor: pointer; font-size: 9px;">:3000</button>';
    html += '<button class="ha-bridge-preset" data-url="ws://localhost:8080/ws" style="padding: 4px 8px; background-color: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 4px; color: #94a3b8; cursor: pointer; font-size: 9px;">:8080</button>';
    html += '<button class="ha-bridge-preset" data-url="ws://127.0.0.1:5055/ws" style="padding: 4px 8px; background-color: rgba(100, 116, 139, 0.2); border: 1px solid rgba(100, 116, 139, 0.3); border-radius: 4px; color: #94a3b8; cursor: pointer; font-size: 9px;">127.0.0.1</button>';
    html += '</div>';
    
    // Connect/Disconnect Button (Manual)
    html += '<button id="ha-connect-bridge" style="width: 100%; padding: 10px; background: ' + (state.bridgeConnected ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #3b82f6, #2563eb)') + '; border: none; border-radius: 6px; color: white; font-size: 11px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">';
    html += state.bridgeConnected ? '🔌 Disconnect' : '🔌 Connect Manually';
    html += '</button>';
    
    html += '</div></details>';
    
    // Developer Tools Section
    html += '<div style="margin-bottom: 16px; padding: 12px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px;">';
    html += '<div style="font-size: 10px; font-weight: 600; color: #34d399; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">🛠️ Developer Tools</div>';
    
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">';
    html += '<button id="ha-send-ping" style="padding: 8px; background-color: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #60a5fa; cursor: pointer; font-size: 10px; font-weight: 600;" ' + (!state.bridgeConnected ? 'disabled' : '') + '>📡 Ping</button>';
    html += '<button id="ha-test-connection" style="padding: 8px; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 4px; color: #34d399; cursor: pointer; font-size: 10px; font-weight: 600;" ' + (!state.bridgeConnected ? 'disabled' : '') + '>🧪 Echo</button>';
    html += '</div>';
    
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">';
    html += '<button id="ha-clear-bridge-logs" style="padding: 8px; background-color: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 4px; color: #fbbf24; cursor: pointer; font-size: 10px; font-weight: 600;">🗑️ Clear</button>';
    html += '<button id="ha-export-bridge-data" style="padding: 8px; background-color: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 4px; color: #a78bfa; cursor: pointer; font-size: 10px; font-weight: 600;">📥 Export</button>';
    html += '</div>';
    html += '</div>';
    
    // Custom Message Sender
    html += '<details style="margin-bottom: 16px;"><summary style="padding: 10px; background-color: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 6px; cursor: pointer; font-size: 10px; font-weight: 600; color: #a78bfa;">💬 Custom Message Sender</summary>';
    html += '<div style="padding: 12px; background-color: rgba(15, 23, 42, 0.4); border: 1px solid rgba(71, 85, 105, 0.3); border-bottom-left-radius: 6px; border-bottom-right-radius: 6px;">';
    html += '<textarea id="ha-custom-message" placeholder=\'{"type": "custom", "action": "test", "data": {}}\' style="width: 100%; min-height: 70px; padding: 8px; background-color: rgba(15, 23, 42, 0.8); border: 1px solid rgba(71, 85, 105, 0.4); border-radius: 6px; color: #f1f5f9; font-size: 9px; font-family: monospace; resize: vertical; margin-bottom: 8px;"></textarea>';
    html += '<button id="ha-send-custom-message" style="width: 100%; padding: 8px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border: none; border-radius: 4px; color: white; font-size: 10px; font-weight: 600; cursor: pointer;" ' + (!state.bridgeConnected ? 'disabled' : '') + '>📤 Send JSON</button>';
    html += '</div></details>';
    
    // Message Log (Compact)
    html += '<div style="padding: 10px; background-color: rgba(15, 23, 42, 0.6); border: 1px solid rgba(71, 85, 105, 0.3); border-radius: 6px;">';
    html += '<div style="font-size: 9px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">📨 Recent Messages (3)</div>';
    html += '<div style="max-height: 100px; overflow-y: auto; background-color: rgba(0, 0, 0, 0.4); border: 1px solid rgba(71, 85, 105, 0.2); border-radius: 4px; padding: 6px; font-family: monospace; font-size: 8px;">';
    html += '<div style="color: #64748b; text-align: center; padding: 15px 0; font-size: 9px;">No messages yet</div>';
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    return html;
  }

  function renderConsoleTab() {
    var logs = state.consoleLogs.slice(-50).reverse();
    
    var html = '<div style="padding: 16px;">';
    
    // Error log section
    html += '<div style="margin-bottom: 16px;">';
    html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">';
    html += '<span style="font-size: 11px; font-weight: 600; color: #ef4444;">🔴 Error Log (' + errorLog.length + ')</span>';
    html += '<button id="ha-clear-errors" style="padding: 4px 8px; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; color: #f87171; cursor: pointer; font-size: 10px;">Clear Errors</button>';
    html += '</div>';
    
    if (errorLog.length > 0) {
      html += '<div style="max-height: 200px; overflow-y: auto; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 8px; font-family: monospace; font-size: 10px; margin-bottom: 4px;">';
      errorLog.slice(-10).reverse().forEach(function(err) {
        html += '<div style="margin-bottom: 8px; padding: 6px; background: rgba(0,0,0,0.3); border-left: 3px solid #ef4444; border-radius: 4px;">';
        html += '<div style="color: #fca5a5; font-weight: bold; margin-bottom: 4px;">' + err.context + '</div>';
        html += '<div style="color: #f87171; font-size: 10px; margin-bottom: 4px;">' + err.message + '</div>';
        html += '<div style="color: #64748b; font-size: 9px;">' + new Date(err.time).toLocaleTimeString() + '</div>';
        html += '<button class="ha-show-stack" data-error-index="' + (errorLog.length - errorLog.indexOf(err) - 1) + '" style="margin-top: 4px; padding: 2px 6px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 3px; color: #94a3b8; cursor: pointer; font-size: 9px;">Show Stack</button>';
        html += '</div>';
      });
      html += '</div>';
      html += '<div style="font-size: 9px; color: #64748b; text-align: center;">Showing last 10 errors • Use __HA_getErrors__() in console for all</div>';
    } else {
      html += '<div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 12px; color: #6ee7b7; font-size: 11px; text-align: center;">✅ No errors detected</div>';
    }
    html += '</div>';
    
    // Regular console logs section
    html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">';
    html += '<span style="font-size: 11px; font-weight: 600; color: #94a3b8;">📝 Console Logs (' + state.consoleLogs.length + ')</span>';
    html += '<button id="ha-clear-console" style="padding: 4px 8px; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; color: #f87171; cursor: pointer; font-size: 10px;">Clear Logs</button>';
    html += '</div>';
    html += '<div id="ha-console-logs" style="max-height: 250px; overflow-y: auto; background-color: rgba(0, 0, 0, 0.4); border: 1px solid rgba(71, 85, 105, 0.3); border-radius: 6px; padding: 8px; font-family: monospace; font-size: 11px;">';
    
    if (logs.length > 0) {
      logs.forEach(function(log) {
        var borderColor = log.type === 'error' ? '#ef4444' : (log.type === 'warn' || log.type === 'warning' ? '#f59e0b' : log.type === 'success' ? '#10b981' : '#60a5fa');
        var textColor = log.type === 'error' ? '#fca5a5' : (log.type === 'warn' || log.type === 'warning' ? '#fbbf24' : log.type === 'success' ? '#6ee7b7' : '#94a3b8');
        html += '<div style="margin-bottom: 6px; padding: 4px; border-left: 2px solid ' + borderColor + '; padding-left: 6px; color: ' + textColor + ';">';
        html += '<span style="color: #64748b; font-size: 10px;">[' + log.time + ']</span> ' + log.message;
        if (log.stack && log.type === 'error') {
          html += '<div style="margin-top: 4px; font-size: 9px; color: #64748b; max-height: 60px; overflow: hidden;">' + log.stack.split('\n').slice(0, 3).join('\n') + '</div>';
        }
        html += '</div>';
      });
    } else {
      html += '<div style="color: #64748b; font-style: italic;">No logs yet...</div>';
    }
    
    html += '</div>';
    html += '<div style="margin-top: 8px; font-size: 9px; color: #64748b; text-align: center;">💡 Tip: Use console commands: __HA_getErrors__() • __HA_clearErrors__()</div>';
    html += '</div>';
    return html;
  }

  // ====================================================================
  // HELPER FUNCTIONS
  // ====================================================================
  function getSelector(element) {
    if (element.id) return '#' + element.id;
    if (element.className && typeof element.className === 'string') {
      var classes = element.className.trim().split(/\s+/).join('.');
      if (classes) return element.tagName.toLowerCase() + '.' + classes;
    }
    return element.tagName.toLowerCase();
  }

  function getXPath(element) {
    if (element.id) return '//*[@id="' + element.id + '"]';
    if (element === document.body) return '/html/body';
    
    var ix = 0;
    var siblings = element.parentNode ? element.parentNode.childNodes : [];
    for (var i = 0; i < siblings.length; i++) {
      var sibling = siblings[i];
      if (sibling === element) {
        return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
      }
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++;
      }
    }
  }

  function log(message, type) {
    if (!type) type = 'info';
    var time = new Date().toLocaleTimeString();
    
    // Capture stack trace for error logs
    var stack = null;
    if (type === 'error') {
      try {
        throw new Error();
      } catch (e) {
        stack = e.stack;
      }
    }
    
    var logEntry = { 
      time: time, 
      message: message, 
      type: type,
      stack: stack
    };
    
    state.consoleLogs.push(logEntry);
    
    // Keep only last 200 logs
    if (state.consoleLogs.length > 200) {
      state.consoleLogs.shift();
    }
    
    // Console output with better formatting
    var prefix = '[HighlightAssist ' + time + ']';
    var icon = {
      'error': '🔴',
      'warn': '⚠️',
      'warning': '⚠️',
      'success': '✅',
      'info': 'ℹ️'
    }[type] || 'ℹ️';
    
    if (type === 'error') {
      console.error(icon + ' ' + prefix, message, stack ? '\n' + stack : '');
    } else if (type === 'warn' || type === 'warning') {
      console.warn(icon + ' ' + prefix, message);
    } else {
      console.log(icon + ' ' + prefix, message);
    }
  }
  
  // Enhanced error wrapper for critical functions
  function safeExecute(fn, context, ...args) {
    try {
      return fn.apply(this, args);
    } catch (error) {
      logError(error, context || fn.name || 'Anonymous Function');
      return null;
    }
  }

  // ====================================================================
  // SHARED ELEMENT TRACKER UTILITY
  // ====================================================================
  var ElementTracker = {
    // Get element's absolute position in document with caching
    getAbsoluteRect: function(element) {
      var rect = element.getBoundingClientRect();
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      return {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        bottom: rect.bottom + scrollTop,
        right: rect.right + scrollLeft,
        width: rect.width,
        height: rect.height,
        // Also include viewport coords for checking visibility
        viewportTop: rect.top,
        viewportLeft: rect.left,
        viewportBottom: rect.bottom,
        viewportRight: rect.right
      };
    },
    
    // Check if element is in viewport
    isInViewport: function(rect) {
      return (
        rect.viewportBottom > 0 &&
        rect.viewportTop < window.innerHeight &&
        rect.viewportRight > 0 &&
        rect.viewportLeft < window.innerWidth
      );
    },
    
    // Get element's computed z-index (traverse parents)
    getEffectiveZIndex: function(element) {
      var zIndex = 0;
      var current = element;
      
      while (current && current !== document.body) {
        var computedStyle = window.getComputedStyle(current);
        var currentZ = parseInt(computedStyle.zIndex);
        
        if (!isNaN(currentZ) && currentZ > zIndex) {
          zIndex = currentZ;
        }
        
        current = current.parentElement;
      }
      
      return zIndex;
    },
    
    // Generate element thumbnail/preview as data URL
    generatePreview: function(element, width, height) {
      if (!width) width = 60;
      if (!height) height = 40;
      
      try {
        // Create canvas for thumbnail
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        
        // Get element styles
        var computedStyle = window.getComputedStyle(element);
        var bgColor = computedStyle.backgroundColor;
        var bgImage = computedStyle.backgroundImage;
        
        // Draw background color
        if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, width, height);
        } else {
          // Checkered pattern for transparent
          ctx.fillStyle = '#e5e7eb';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = '#d1d5db';
          for (var i = 0; i < width; i += 8) {
            for (var j = 0; j < height; j += 8) {
              if ((i + j) % 16 === 0) {
                ctx.fillRect(i, j, 8, 8);
              }
            }
          }
        }
        
        // Add element tag indicator
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, height - 12, width, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.fillText(element.tagName.toLowerCase(), 2, height - 3);
        
        return canvas.toDataURL('image/png');
      } catch (e) {
        // Fallback: return solid color based on tag
        var canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, 0, width, height);
        return canvas.toDataURL('image/png');
      }
    },
    
    // Get element layer information
    getLayerInfo: function(element) {
      var computedStyle = window.getComputedStyle(element);
      var rect = this.getAbsoluteRect(element);
      
      return {
        element: element,
        rect: rect,
        selector: getSelector(element),
        tagName: element.tagName.toLowerCase(),
        zIndex: this.getEffectiveZIndex(element),
        position: computedStyle.position,
        opacity: parseFloat(computedStyle.opacity),
        visibility: computedStyle.visibility,
        display: computedStyle.display,
        preview: this.generatePreview(element)
      };
    }
  };

  // ====================================================================
  // VISUAL HIGHLIGHT OVERLAY
  // ====================================================================
  function createHighlightOverlay() {
    if (highlightOverlay) return highlightOverlay;
    
    highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'ha-highlight-overlay';
    highlightOverlay.setAttribute('data-ha-ui', 'true');
    
    Object.assign(highlightOverlay.style, {
      position: 'absolute',  // Changed from fixed for document-based positioning
      pointerEvents: 'none',
      zIndex: '999990',  // Below all GUI panels (999997-999999)
      display: 'none',
      transition: 'all 0.1s ease-out',
      willChange: 'transform'  // GPU acceleration hint
    });
    
    document.body.appendChild(highlightOverlay);
    return highlightOverlay;
  }

  function updateHighlightOverlay(rect, element) {
    if (!highlightOverlay) {
      highlightOverlay = createHighlightOverlay();
    }
    
    if (!rect || !element) {
      highlightOverlay.style.display = 'none';
      return;
    }
    
    // Use shared ElementTracker for consistent positioning
    var absRect = ElementTracker.getAbsoluteRect(element);
    
    // Check if element is in viewport
    if (!ElementTracker.isInViewport(absRect)) {
      highlightOverlay.style.display = 'none';
      return;
    }
    
    var normalizedOpacity = Math.max(0, Math.min(1, state.overlayOpacity));
    
    // Convert hex color to RGB
    var hex = state.highlightColor.replace('#', '');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    
    Object.assign(highlightOverlay.style, {
      display: 'block',
      left: absRect.left + 'px',
      top: absRect.top + 'px',
      width: Math.max(0, absRect.width) + 'px',
      height: Math.max(0, absRect.height) + 'px',
      background: 'rgba(' + r + ', ' + g + ', ' + b + ', 0.65)',
      opacity: normalizedOpacity,
      outline: '4px solid ' + state.highlightColor  // Bolder outline, same color
    });
    
    // Track element for live updates (for draggable/animated elements)
    if (element && state.locked && element !== state.trackedElement) {
      startTrackingElement(element);
    }
  }
  
  function startTrackingElement(element) {
    // Stop tracking previous element
    stopTrackingElement();
    
    state.trackedElement = element;
    
    // Use MutationObserver to detect style/attribute changes (for draggable elements)
    state.elementObserver = new MutationObserver(function(mutations) {
      // Element changed - update overlay position
      if (state.trackedElement && state.locked) {
        var rect = state.trackedElement.getBoundingClientRect();
        updateHighlightOverlay(rect, state.trackedElement);
      }
    });
    
    // Observe attributes (style, class) and subtree changes
    state.elementObserver.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      childList: false,
      subtree: false
    });
  }
  
  function stopTrackingElement() {
    if (state.elementObserver) {
      state.elementObserver.disconnect();
      state.elementObserver = null;
    }
    state.trackedElement = null;
  }

  function hideHighlightOverlay() {
    if (highlightOverlay) {
      highlightOverlay.style.display = 'none';
    }
  }

  // ====================================================================
  // EVENT HANDLERS
  // ====================================================================
  function handleMouseOver(e) {
    try {
      if (!state.isInspecting) return;
      if (e.target.hasAttribute('data-ha-ui')) return;
      
      // Don't inspect HighlightAssist UI elements or their children
      if (e.target.closest('[data-ha-ui]')) return;
      if (e.target.id && (e.target.id.startsWith('ha-') || e.target.id === 'highlight-assist-gui')) return;

      // Clear existing hover timer if switching elements
      if (state.hoverTimer && state.hoveredElement !== e.target) {
        clearTimeout(state.hoverTimer);
        state.hoverTimer = null;
      }

      state.hoveredElement = e.target;
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
      
      // Update visual overlay if not locked
      if (!state.locked) {
        var rect = e.target.getBoundingClientRect();
        state.currentRect = rect;
        state.currentElement = e.target; // Update for Component Inspector
        updateHighlightOverlay(rect, e.target);
        
        // Start hover timer for analysis panel (3 seconds)
        if (!state.hoverTimer) {
          state.hoverStartTime = Date.now();
          var targetElement = e.target;  // Capture target element
          state.hoverTimer = setTimeout(function() {
            // Still hovering same element after 3 seconds - show analysis
            if (state.hoveredElement === targetElement && state.isInspecting && !state.locked) {
              var freshRect = targetElement.getBoundingClientRect();  // Get fresh rect
              var computedStyles = window.getComputedStyle(targetElement);
              var analysis = analyzer.analyze(targetElement, computedStyles);
              var analysisPanel = document.getElementById('ha-analysis-panel');
              if (analysisPanel && analysis) {
                updateAnalysisPanel(analysisPanel, analysis, freshRect);
                log('Analysis panel shown after 3s hover', 'info');
              }
            }
            state.hoverTimer = null;
          }, state.hoverDelay);
        }
      }
      
      // Refresh layer inspector if open
      if (state.layerInspectorOpen) {
        refreshLayerInspector(e.clientX, e.clientY);
      }
    } catch (error) {
      logError(error, 'handleMouseOver');
    }
  }

  function handleMouseOut(e) {
    try {
      if (!state.isInspecting) return;
      if (e.target.hasAttribute('data-ha-ui')) return;
      
      // Don't process HighlightAssist UI elements
      if (e.target.closest('[data-ha-ui]')) return;
      if (e.target.id && (e.target.id.startsWith('ha-') || e.target.id === 'highlight-assist-gui')) return;

      // Clear hover timer when leaving element
      if (state.hoverTimer) {
        clearTimeout(state.hoverTimer);
        state.hoverTimer = null;
      }
      
      // Hide analysis panel and clear current element when mouse leaves (unless element is locked)
      if (!state.locked) {
        state.currentElement = null;
        var analysisPanel = document.getElementById('ha-analysis-panel');
        if (analysisPanel) {
          analysisPanel.style.display = 'none';
        }
      }
    } catch (error) {
      logError(error, 'handleMouseOut');
    }
  }

  function handleClick(e) {
    try {
      if (!state.isInspecting) return;
      if (e.target.hasAttribute('data-ha-ui')) return;
      
      // Don't select HighlightAssist UI elements
      if (e.target.closest('[data-ha-ui]')) return;
      if (e.target.id && (e.target.id.startsWith('ha-') || e.target.id === 'highlight-assist-gui')) return;

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const hasModifier = isMac ? e.metaKey : e.ctrlKey;
    
      // Ctrl/Cmd+Click: Send command to WebSocket listener (shortcut feature)
      if (hasModifier) {
        e.preventDefault();
        e.stopPropagation();
        
        var selector = getSelector(e.target);
        var elementInfo = {
          selector: selector,
          tagName: e.target.tagName,
          id: e.target.id || '',
          className: e.target.className || '',
          text: e.target.textContent.substring(0, 100),
          rect: e.target.getBoundingClientRect()
        };
        
        // Send to WebSocket bridge if connected
        if (state.bridgeConnected && state.bridgeWS) {
          state.bridgeWS.send(JSON.stringify({
            type: 'element_command',
            action: 'select',
            element: elementInfo,
            timestamp: Date.now()
          }));
          log('Ctrl+Click: Sent element to listener - ' + selector, 'success');
        } else {
          log('Ctrl+Click: Bridge not connected - element selector: ' + selector, 'warning');
        }
        return;
      }
      
      // Regular Click: Lock/Unlock element
      e.preventDefault();
      e.stopPropagation();
      
      // If clicking the already locked element, unlock it
      if (state.locked && state.lockedElement === e.target) {
        unlockElement(true); // Pass true to skip resume-hover (we're in a click)
        log('Element unlocked (clicked again)', 'info');
        return;
      }
      
      // If locked on different element, unlock previous and lock new one
      if (state.locked && state.lockedElement !== e.target) {
        unlockElement(true); // Pass true to skip resume-hover (will lock new element immediately)
      }

      // Lock the clicked element
      lockElement(e.target, e.clientX, e.clientY);
      log('Element locked (single click)', 'success');
    } catch (error) {
      logError(error, 'handleClick');
    }
  }

  function lockElement(element, clientX, clientY) {
    // Clear hover timer if active
    if (state.hoverTimer) {
      clearTimeout(state.hoverTimer);
      state.hoverTimer = null;
    }
    
    state.locked = true;
    state.lockedElement = element;
    state.selectedElement = element;
    state.currentElement = element; // For Component Inspector
    state.currentSelector = getSelector(element);
    
    var rect = element.getBoundingClientRect();
    state.currentRect = rect;
    
    // Update visual overlay to stay on this element (pass both rect AND element)
    updateHighlightOverlay(rect, element);
    
    var computedStyles = window.getComputedStyle(element);
    state.elementAnalysis = analyzer.analyze(element, computedStyles);

    // Show analysis panel at element position when locked
    var analysisPanel = document.getElementById('ha-analysis-panel');
    if (analysisPanel && state.elementAnalysis) {
      updateAnalysisPanel(analysisPanel, state.elementAnalysis, rect);
    }

    // Add to layers (Photoshop-style history)
    var timestamp = new Date().toLocaleTimeString();
    state.inspectedLayers.push({
      element: element,
      selector: state.currentSelector,
      tagName: element.tagName,
      timestamp: timestamp,
      analysis: state.elementAnalysis,
      severity: state.elementAnalysis.severity
    });
    
    // Refresh layer inspector if open (at element center)
    if (state.layerInspectorOpen) {
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      refreshLayerInspector(centerX, centerY);
    }
    
    // Keep only max layers
    if (state.inspectedLayers.length > state.maxLayers) {
      state.inspectedLayers.shift();
    }

    log('Locked: ' + state.currentSelector, 'success');
    updateUI();
  }

  function unlockElement(skipResumeHover) {
    state.locked = false;
    state.lockedElement = null;
    state.currentElement = null; // Clear for Component Inspector
    state.currentRect = null;
    
    // Stop tracking element mutations
    stopTrackingElement();
    
    // Hide the overlay temporarily
    hideHighlightOverlay();
    
    // Hide analysis panel
    var analysisPanel = document.getElementById('ha-analysis-panel');
    if (analysisPanel) {
      analysisPanel.style.display = 'none';
    }
    
    log('Element unlocked', 'info');
    updateUI();
    
    // Resume hover behavior only if not called from click handler
    if (!skipResumeHover && state.isInspecting && state.hoveredElement) {
      // Re-enable hover highlighting by simulating the current hover state
      var elementAtCursor = document.elementFromPoint(state.mouseX, state.mouseY);
      if (elementAtCursor && !elementAtCursor.hasAttribute('data-ha-ui') && !elementAtCursor.closest('[data-ha-ui]')) {
        var rect = elementAtCursor.getBoundingClientRect();
        state.currentRect = rect;
        state.currentElement = elementAtCursor;
        updateHighlightOverlay(rect, elementAtCursor);
      }
    }
  }

  function toggleInspecting() {
    state.isInspecting = !state.isInspecting;
    
    var btn = document.getElementById('ha-toggle-inspect');
    if (btn) {
      if (state.isInspecting) {
        btn.textContent = '⏸ Stop Inspecting';
        btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        document.body.style.cursor = 'crosshair';
        log('Inspection mode activated', 'info');
      } else {
        btn.textContent = '🎯 Start Inspecting';
        btn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
        document.body.style.cursor = '';
        
        // Unlock element when stopping inspection (skip resume since inspection is off)
        if (state.locked) {
          unlockElement(true);
        }
        
        // Hide visual overlay when stopping
        hideHighlightOverlay();
        state.currentRect = null;
        state.hoveredElement = null;
        
        log('Inspection mode deactivated', 'info');
      }
    }
    
    saveSettings();  // Save inspection state to localStorage
    updateUI();
  }

  function connectBridge() {
    if (state.bridgeConnected) {
      if (state.bridgeWS) {
        state.bridgeWS.close();
      }
      state.bridgeConnected = false;
      state.bridgeHandshakeComplete = false;
      log('Disconnected from bridge', 'info');
      updateUI();
      return;
    }

    var url = document.getElementById('ha-bridge-url').value;
    log('Connecting to bridge: ' + url, 'info');

    try {
      state.bridgeWS = new WebSocket(url);

      state.bridgeWS.onopen = function() {
        state.bridgeConnected = true;
        log('Connected to WebSocket bridge', 'info');
        
        // Send handshake
        state.bridgeWS.send(JSON.stringify({
          type: 'handshake',
          source: 'HighlightAssist',
          version: '2.0',
          timestamp: Date.now()
        }));
        log('Handshake sent', 'info');
        
        updateUI();
      };

      state.bridgeWS.onerror = function(error) {
        log('Bridge connection error: ' + error, 'error');
        state.bridgeConnected = false;
        state.bridgeHandshakeComplete = false;
        updateUI();
      };

      state.bridgeWS.onclose = function() {
        state.bridgeConnected = false;
        state.bridgeHandshakeComplete = false;
        log('Bridge connection closed', 'warn');
        updateUI();
      };

      state.bridgeWS.onmessage = function(event) {
        try {
          var data = JSON.parse(event.data);
          
          if (data.type === 'handshake_ack') {
            state.bridgeHandshakeComplete = true;
            state.bridgeLastPing = Date.now();
            log('Handshake acknowledged', 'info');
            updateUI();
          } else if (data.type === 'pong') {
            state.bridgeLastPing = Date.now();
            updateUI();
          } else {
            log('Bridge message: ' + event.data, 'info');
          }
        } catch (e) {
          log('Bridge message (raw): ' + event.data, 'info');
        }
      };
      
      // Send ping every 30 seconds
      setInterval(function() {
        if (state.bridgeWS && state.bridgeConnected) {
          state.bridgeWS.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        }
      }, 30000);
      
    } catch (error) {
      log('Failed to connect: ' + error.message, 'error');
    }
  }

  // ====================================================================
  // LAYER INSPECTOR (Photoshop-style z-index stack)
  // ====================================================================
  function sampleElementsAtPoint(x, y) {
    // Get all elements at this point, from top to bottom
    var elements = [];
    var maxDepth = 50;  // Prevent infinite loops
    var currentElement = document.elementFromPoint(x, y);
    
    while (currentElement && maxDepth-- > 0) {
      // Skip HighlightAssist UI
      if (currentElement.hasAttribute('data-ha-ui') || 
          currentElement.closest('[data-ha-ui]') ||
          (currentElement.id && currentElement.id.startsWith('ha-'))) {
        // Hide this element temporarily and try again
        var originalPointerEvents = currentElement.style.pointerEvents;
        currentElement.style.pointerEvents = 'none';
        var nextElement = document.elementFromPoint(x, y);
        currentElement.style.pointerEvents = originalPointerEvents;
        
        if (nextElement === currentElement || !nextElement) break;
        currentElement = nextElement;
        continue;
      }
      
      elements.push(currentElement);
      
      // Hide current element to get the one behind it
      var originalPointerEvents = currentElement.style.pointerEvents;
      currentElement.style.pointerEvents = 'none';
      var nextElement = document.elementFromPoint(x, y);
      currentElement.style.pointerEvents = originalPointerEvents;
      
      if (nextElement === currentElement || !nextElement) break;
      currentElement = nextElement;
    }
    
    return elements;
  }

  function getElementPreview(element) {
    var computed = window.getComputedStyle(element);
    var result = {
      background: computed.backgroundColor || 'transparent',
      hasImage: false,
      gradient: null
    };
    
    // Check for background image
    if (computed.backgroundImage && computed.backgroundImage !== 'none') {
      result.hasImage = true;
      if (computed.backgroundImage.startsWith('linear-gradient') || 
          computed.backgroundImage.startsWith('radial-gradient')) {
        result.gradient = computed.backgroundImage;
      }
    }
    
    return result;
  }

  function getElementLabel(element) {
    var label = element.tagName.toLowerCase();
    if (element.id) {
      label += '#' + element.id;
    } else if (element.className && typeof element.className === 'string') {
      var classes = element.className.trim().split(/\s+/);
      if (classes.length > 0 && classes[0]) {
        label += '.' + classes[0];
      }
    }
    return label;
  }

  // Scan document for major positioned layers (Document Mode)
  function scanDocumentLayers() {
    state.documentLayers = [];
    
    // Find all elements with position: fixed, absolute, sticky, or high z-index
    var allElements = document.querySelectorAll('*');
    var significantLayers = [];
    
    allElements.forEach(function(el) {
      // Skip HighlightAssist UI
      if (el.hasAttribute('data-ha-ui') || el.id && el.id.startsWith('ha-')) return;
      
      var computedStyle = window.getComputedStyle(el);
      var position = computedStyle.position;
      var zIndex = parseInt(computedStyle.zIndex);
      
      // Include if: positioned (not static) OR has explicit z-index
      if (position !== 'static' || (!isNaN(zIndex) && zIndex !== 0)) {
        significantLayers.push(el);
      }
    });
    
    // Convert to layer info and sort by z-index
    state.documentLayers = significantLayers.map(function(el) {
      return ElementTracker.getLayerInfo(el);
    }).sort(function(a, b) {
      return b.zIndex - a.zIndex; // Highest z-index first
    });
    
    log('Document scan: ' + state.documentLayers.length + ' layers found', 'info');
  }

  function refreshLayerInspector(x, y) {
    if (!state.layerInspectorOpen) return;
    
    var elements = sampleElementsAtPoint(x, y);
    
    // Use shared ElementTracker for consistent layer information
    state.layerItems = elements.map(function(el) {
      return ElementTracker.getLayerInfo(el);
    }).sort(function(a, b) {
      // Sort by z-index descending (top layers first)
      return b.zIndex - a.zIndex;
    });
    
    // Update layer inspector UI
    updateLayerInspectorUI();
  }

  function toggleLayerVisibility(element, selector) {
    if (state.hiddenLayers.has(element)) {
      // Restore visibility
      var originalVis = state.hiddenLayers.get(element);
      element.style.visibility = originalVis;
      state.hiddenLayers.delete(element);
      log('Layer restored: ' + selector, 'info');
    } else {
      // Hide layer
      var originalVis = element.style.visibility || '';
      state.hiddenLayers.set(element, originalVis);
      element.style.visibility = 'hidden';
      log('Layer hidden: ' + selector, 'info');
    }
    updateLayerInspectorUI();
  }

  function resetHiddenLayers() {
    state.hiddenLayers.forEach(function(originalVis, element) {
      if (element && element.style) {
        element.style.visibility = originalVis;
      }
    });
    state.hiddenLayers.clear();
    updateLayerInspectorUI();
    log('All layers restored', 'info');
  }

  function lockElementFromLayer(element) {
    // Simulate click on this element to lock it
    state.selectedElement = element;
    state.currentSelector = getSelector(element);
    
    var computedStyles = window.getComputedStyle(element);
    state.elementAnalysis = analyzer.analyze(element, computedStyles);
    
    // Add to layers history
    var timestamp = new Date().toLocaleTimeString();
    state.inspectedLayers.push({
      element: element,
      selector: state.currentSelector,
      tagName: element.tagName,
      timestamp: timestamp,
      analysis: state.elementAnalysis,
      severity: state.elementAnalysis.severity
    });
    
    if (state.inspectedLayers.length > state.maxLayers) {
      state.inspectedLayers.shift();
    }
    
    updateUI();
    
    // Scroll element into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    log('Locked onto layer: ' + state.currentSelector, 'success');
  }
  // ====================================================================
  // UI UPDATE
  // ====================================================================
  function updateUI() {
    var content = document.getElementById('ha-content');
    var activeTabElement = document.querySelector('.ha-tab.active');
    
    // Safety check - if no active tab, default to 'main'
    if (!activeTabElement) {
      log('No active tab found, defaulting to main', 'warning');
      return;
    }
    
    var activeTab = activeTabElement.dataset.tab;

    if (activeTab === 'main') {
      content.innerHTML = renderMainTab();
      setupMainTabListeners();
    } else if (activeTab === 'layers') {
      content.innerHTML = renderLayersTab();
      setupLayersTabListeners();
    } else if (activeTab === 'settings') {
      content.innerHTML = renderSettingsTab();
      setupSettingsTabListeners();
    } else if (activeTab === 'bridge') {
      content.innerHTML = renderBridgeTab();
      setupBridgeTabListeners();
    } else if (activeTab === 'console') {
      content.innerHTML = renderConsoleTab();
      setupConsoleTabListeners();
    }

    // Only show analysis panel if element is locked
    var analysisPanel = document.getElementById('ha-analysis-panel');
    if (analysisPanel) {
      if (state.locked && state.elementAnalysis && state.currentRect) {
        updateAnalysisPanel(analysisPanel, state.elementAnalysis, state.currentRect);
      } else {
        analysisPanel.style.display = 'none';
      }
    }
  }

  function setupMainTabListeners() {
    var toggleBtn = document.getElementById('ha-toggle-inspect');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleInspecting);
    
    // Lock/Unlock button
    var lockBtn = document.getElementById('ha-lock-element');
    if (lockBtn) {
      lockBtn.addEventListener('click', function() {
        if (state.locked) {
          unlockElement();
        } else if (state.hoveredElement || state.currentRect) {
          var target = state.lockedElement || state.hoveredElement;
          if (target) {
            lockElement(target, state.mouseX, state.mouseY);
          }
        }
      });
    }
    
    // Snapshot button (placeholder - implement screenshot later)
    var snapshotBtn = document.getElementById('ha-save-snapshot');
    if (snapshotBtn) {
      snapshotBtn.addEventListener('click', function() {
        log('Snapshot feature - coming soon!', 'info');
        // TODO: Implement canvas screenshot of locked element
      });
    }
    
    // Layer inspector toggle
    var layerInspectorBtn = document.getElementById('ha-toggle-layer-inspector');
    if (layerInspectorBtn) {
      layerInspectorBtn.addEventListener('click', function() {
        state.layerInspectorOpen = !state.layerInspectorOpen;
        var panel = document.getElementById('ha-layer-inspector-floating');
        if (panel) {
          panel.style.display = state.layerInspectorOpen ? 'block' : 'none';
        }
        if (state.layerInspectorOpen) {
          log('Layer inspector opened', 'info');
        } else {
          resetHiddenLayers();
          log('Layer inspector closed', 'info');
        }
        updateUI();
      });
    }
    
    // Refresh layers button
    var refreshLayersBtn = document.getElementById('ha-refresh-layers');
    if (refreshLayersBtn) {
      refreshLayersBtn.addEventListener('click', function() {
        // Use stored mouse position or window center
        var x = state.mouseX || window.innerWidth / 2;
        var y = state.mouseY || window.innerHeight / 2;
        refreshLayerInspector(x, y);
        log('Layers refreshed', 'info');
      });
    }
    
    var copySelector = document.getElementById('ha-copy-selector');
    if (copySelector) {
      copySelector.addEventListener('click', function() {
        navigator.clipboard.writeText(state.currentSelector);
        log('Copied selector to clipboard', 'info');
      });
    }

    var copyXPath = document.getElementById('ha-copy-xpath');
    if (copyXPath) {
      copyXPath.addEventListener('click', function() {
        var xpath = getXPath(state.selectedElement);
        navigator.clipboard.writeText(xpath);
        log('Copied XPath to clipboard', 'info');
      });
    }

    if (state.selectedElement) {
      document.getElementById('ha-selector-info').style.display = 'block';
      document.getElementById('ha-current-selector').textContent = state.currentSelector;
    }
  }

  function setupLayersTabListeners() {
    // Refresh component button
    var refreshBtn = document.getElementById('ha-refresh-component');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function() {
        log('Component info refreshed', 'info');
        updateUI();
      });
    }
    
    // Copy props button
    var copyPropsBtn = document.getElementById('ha-copy-props');
    if (copyPropsBtn) {
      copyPropsBtn.addEventListener('click', function() {
        if (state.currentElement) {
          var framework = detectFramework(state.currentElement);
          var componentInfo = extractComponentInfo(state.currentElement, framework);
          navigator.clipboard.writeText(JSON.stringify(componentInfo.props, null, 2));
          log('Props copied to clipboard', 'success');
        }
      });
    }
    
    // Component action buttons
    document.querySelectorAll('.ha-component-action').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = this.getAttribute('data-action');
        
        if (!state.currentElement) {
          log('No element selected', 'warn');
          return;
        }
        
        switch(action) {
          case 'copy-selector':
            navigator.clipboard.writeText(state.currentSelector);
            log('Selector copied to clipboard', 'success');
            break;
            
          case 'copy-xpath':
            var xpath = getXPath(state.currentElement);
            navigator.clipboard.writeText(xpath);
            log('XPath copied to clipboard', 'success');
            break;
            
          case 'log-element':
            console.log('HighlightAssist - Element:', state.currentElement);
            console.log('HighlightAssist - Selector:', state.currentSelector);
            var framework = detectFramework(state.currentElement);
            var componentInfo = extractComponentInfo(state.currentElement, framework);
            console.log('HighlightAssist - Component Info:', componentInfo);
            log('Element logged to console', 'success');
            break;
            
          case 'highlight-parent':
            if (state.currentElement.parentElement) {
              state.currentElement = state.currentElement.parentElement;
              state.currentRect = state.currentElement.getBoundingClientRect();
              state.currentSelector = getSelector(state.currentElement);
              updateHighlightOverlay(state.currentRect, state.currentElement);
              log('Moved to parent element', 'info');
              updateUI();
            } else {
              log('No parent element', 'warn');
            }
            break;
        }
      });
    });
  }

  function setupSettingsTabListeners() {
    var colorPicker = document.getElementById('ha-color-picker');
    var opacitySlider = document.getElementById('ha-opacity-slider');
    var opacityValue = document.getElementById('ha-opacity-value');
    var widthSlider = document.getElementById('ha-width-slider');
    var widthValue = document.getElementById('ha-width-value');

    if (colorPicker) {
      colorPicker.addEventListener('input', function(e) {
        state.highlightColor = e.target.value;
        // Update color display under picker
        var colorDisplay = e.target.nextElementSibling;
        if (colorDisplay) {
          colorDisplay.textContent = e.target.value.toUpperCase();
        }
        // Update overlay if currently shown
        if (state.currentRect && state.currentElement) {
          updateHighlightOverlay(state.currentRect, state.currentElement);
        }
        saveSettings();  // Save to localStorage
      });
    }

    if (opacitySlider) {
      opacitySlider.addEventListener('input', function(e) {
        state.overlayOpacity = parseInt(e.target.value) / 100;
        opacityValue.textContent = e.target.value + '%';
        // Update overlay if currently shown
        if (state.currentRect && state.currentElement) {
          updateHighlightOverlay(state.currentRect, state.currentElement);
        }
        saveSettings();  // Save to localStorage
      });
    }

    if (widthSlider) {
      widthSlider.addEventListener('input', function(e) {
        state.borderWidth = parseInt(e.target.value);
        widthValue.textContent = state.borderWidth + 'px';
        saveSettings();  // Save to localStorage
      });
    }

    var resetBtn = document.getElementById('ha-reset-settings');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        state.highlightColor = '#f97316';  // Orange default
        state.overlayOpacity = 0.35;
        state.borderWidth = 2;
        saveSettings();  // Save reset values
        log('Settings reset to defaults', 'info');
        updateUI();
      });
    }
  }

  function setupBridgeTabListeners() {
    // One-Click Service Launcher
    var launchBtn = document.getElementById('ha-launch-service');
    if (launchBtn) {
      launchBtn.addEventListener('click', function() {
        if (state.bridgeConnected) {
          // Stop service
          if (state.bridgeWS) {
            state.bridgeWS.close();
          }
          log('Bridge service stopped', 'info');
        } else {
          // Auto-start service (attempts to connect)
          log('Attempting to start bridge service...', 'info');
          connectBridge();
          // Note: Actual service startup would require backend script
          // For now, this just attempts connection to existing service
        }
      });
    }
    
    // Copy WebSocket URL button
    var copyWsBtn = document.getElementById('ha-copy-ws-url');
    if (copyWsBtn) {
      copyWsBtn.addEventListener('click', function() {
        var wsUrl = state.bridgeUrl || 'ws://localhost:5055/ws';
        navigator.clipboard.writeText(wsUrl);
        
        var originalText = copyWsBtn.textContent;
        copyWsBtn.textContent = '✅ Copied!';
        setTimeout(function() {
          copyWsBtn.textContent = originalText;
        }, 1500);
        
        log('WebSocket URL copied to clipboard: ' + wsUrl, 'success');
      });
    }
    
    var connectBtn = document.getElementById('ha-connect-bridge');
    if (connectBtn) connectBtn.addEventListener('click', connectBridge);
    
    // Save bridge URL button
    var saveUrlBtn = document.getElementById('ha-save-bridge-url');
    if (saveUrlBtn) {
      saveUrlBtn.addEventListener('click', function() {
        var bridgeUrlInput = document.getElementById('ha-bridge-url');
        if (bridgeUrlInput) {
          state.bridgeUrl = bridgeUrlInput.value;
          saveSettings();
          log('Bridge URL saved: ' + bridgeUrlInput.value, 'success');
        }
      });
    }
    
    // Bridge URL presets
    document.querySelectorAll('.ha-bridge-preset').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var url = this.getAttribute('data-url');
        var bridgeUrlInput = document.getElementById('ha-bridge-url');
        if (bridgeUrlInput) {
          bridgeUrlInput.value = url;
          state.bridgeUrl = url;
          saveSettings();
          log('Bridge URL set to: ' + url, 'info');
        }
      });
    });
    
    // Send ping button
    var pingBtn = document.getElementById('ha-send-ping');
    if (pingBtn) {
      pingBtn.addEventListener('click', function() {
        if (state.bridgeConnected && state.bridgeWS) {
          var pingTime = Date.now();
          state.bridgeWS.send(JSON.stringify({
            type: 'ping',
            timestamp: pingTime
          }));
          log('Ping sent to bridge', 'info');
        } else {
          log('Bridge not connected', 'warn');
        }
      });
    }
    
    // Test echo button
    var testBtn = document.getElementById('ha-test-connection');
    if (testBtn) {
      testBtn.addEventListener('click', function() {
        if (state.bridgeConnected && state.bridgeWS) {
          var testData = {
            type: 'echo_test',
            message: 'Hello from HighlightAssist!',
            timestamp: Date.now()
          };
          state.bridgeWS.send(JSON.stringify(testData));
          log('Test echo sent', 'info');
        } else {
          log('Bridge not connected', 'warn');
        }
      });
    }
    
    // Clear bridge logs button
    var clearLogsBtn = document.getElementById('ha-clear-bridge-logs');
    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', function() {
        log('Bridge logs cleared', 'info');
        // Clear bridge-related logs from console
        state.consoleLogs = state.consoleLogs.filter(function(l) {
          return !l.message.includes('Bridge') && !l.message.includes('WebSocket');
        });
        updateUI();
      });
    }
    
    // Export bridge data button
    var exportBtn = document.getElementById('ha-export-bridge-data');
    if (exportBtn) {
      exportBtn.addEventListener('click', function() {
        var exportData = {
          bridgeUrl: state.bridgeUrl,
          connected: state.bridgeConnected,
          handshakeComplete: state.bridgeHandshakeComplete,
          logs: state.consoleLogs.filter(function(l) {
            return l.message.includes('Bridge') || l.message.includes('WebSocket');
          }),
          timestamp: new Date().toISOString()
        };
        
        var blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'highlightassist-bridge-' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
        
        log('Bridge data exported', 'success');
      });
    }
    
    // Send custom message button
    var sendCustomBtn = document.getElementById('ha-send-custom-message');
    if (sendCustomBtn) {
      sendCustomBtn.addEventListener('click', function() {
        var textarea = document.getElementById('ha-custom-message');
        if (!textarea || !textarea.value.trim()) {
          log('No message to send', 'warn');
          return;
        }
        
        if (!state.bridgeConnected || !state.bridgeWS) {
          log('Bridge not connected', 'warn');
          return;
        }
        
        try {
          var message = JSON.parse(textarea.value);
          state.bridgeWS.send(JSON.stringify(message));
          log('Custom message sent: ' + JSON.stringify(message).substring(0, 50) + '...', 'success');
          textarea.value = ''; // Clear after send
        } catch (e) {
          log('Invalid JSON: ' + e.message, 'error');
        }
      });
    }
    
    // Instance selector listeners (if exists)
    document.querySelectorAll('.ha-instance-item').forEach(function(item) {
      var instanceIndex = parseInt(item.dataset.instanceIndex);
      item.addEventListener('click', function() {
        state.activeInstanceIndex = instanceIndex;
        log('Switched to instance ' + instanceIndex, 'info');
        updateUI();
      });
      
      item.addEventListener('mouseenter', function() {
        if (instanceIndex !== state.activeInstanceIndex) {
          item.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
          item.style.borderColor = 'rgba(59, 130, 246, 0.4)';
        }
      });
      
      item.addEventListener('mouseleave', function() {
        if (instanceIndex !== state.activeInstanceIndex) {
          item.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
          item.style.borderColor = 'rgba(71, 85, 105, 0.3)';
        }
      });
    });
  }

  function setupConsoleTabListeners() {
    var clearBtn = document.getElementById('ha-clear-console');
    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        state.consoleLogs = [];
        log('Console logs cleared', 'info');
        updateUI();
      });
    }
    
    var clearErrorsBtn = document.getElementById('ha-clear-errors');
    if (clearErrorsBtn) {
      clearErrorsBtn.addEventListener('click', function() {
        errorLog = [];
        log('Error log cleared', 'info');
        updateUI();
      });
    }
    
    // Stack trace viewer buttons
    document.querySelectorAll('.ha-show-stack').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var errorIndex = parseInt(this.getAttribute('data-error-index'));
        var error = errorLog[errorIndex];
        if (error && error.stack) {
          console.group('🔴 Error Stack Trace: ' + error.context);
          console.error('Message:', error.message);
          console.error('Time:', error.time);
          console.error('Stack:', error.stack);
          console.groupEnd();
          log('Stack trace logged to console', 'info');
        }
      });
    });
  }

  // ====================================================================
  // INITIALIZATION
  // ====================================================================
  function init() {
    try {
      log('Initializing HighlightAssist GUI...', 'info');
      
      // Clean up any old HighlightAssist UI elements from previous loads
      try {
        document.querySelectorAll('[data-ha-ui]').forEach(function(el) {
          el.remove();
        });
        log('Cleaned up old UI elements', 'info');
      } catch (e) {
        logError(e, 'Cleanup old UI elements');
      }
      
      // Load saved settings first (including isInspecting state)
      try {
        loadSettings();
      } catch (e) {
        logError(e, 'Load settings');
      }
      
      // Create UI panels
      var controlPanel, analysisPanel, layerInspectorPanel;
      
      try {
        controlPanel = createControlPanel();
        log('Control panel created', 'info');
      } catch (e) {
        logError(e, 'Create control panel');
        throw new Error('Failed to create control panel');
      }
      
      try {
        analysisPanel = createAnalysisPanel();
        log('Analysis panel created', 'info');
      } catch (e) {
        logError(e, 'Create analysis panel');
        throw new Error('Failed to create analysis panel');
      }
      
      try {
        layerInspectorPanel = createLayerInspectorPanel();
        log('Layer inspector panel created', 'info');
      } catch (e) {
        logError(e, 'Create layer inspector panel');
        throw new Error('Failed to create layer inspector panel');
      }
      
      try {
        document.body.appendChild(controlPanel);
        document.body.appendChild(analysisPanel);
        document.body.appendChild(layerInspectorPanel);
        log('UI panels attached to DOM', 'info');
      } catch (e) {
        logError(e, 'Append panels to DOM');
        throw new Error('Failed to attach panels to DOM');
      }

    // Set cursor based on loaded inspection state
    document.body.style.cursor = state.isInspecting ? 'crosshair' : '';

    // REMOVED: Visual indicator (defeats non-intrusive purpose)
    // Extension is now completely silent until user clicks "Open GUI Panel"

    document.querySelectorAll('.ha-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        document.querySelectorAll('.ha-tab').forEach(function(t) {
          t.classList.remove('active');
          t.style.backgroundColor = 'transparent';
          t.style.borderBottomColor = 'transparent';
          t.style.color = '#94a3b8';
        });
        
        tab.classList.add('active');
        tab.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
        tab.style.borderBottomColor = '#3b82f6';
        tab.style.color = '#60a5fa';
        
        updateUI();
      });
    });

    var isDragging = false;
    var dragOffset = { x: 0, y: 0 };

    var dragHandle = document.getElementById('ha-drag-handle');
    dragHandle.addEventListener('mousedown', function(e) {
      isDragging = true;
      dragOffset.x = e.clientX - controlPanel.offsetLeft;
      dragOffset.y = e.clientY - controlPanel.offsetTop;
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      controlPanel.style.left = (e.clientX - dragOffset.x) + 'px';
      controlPanel.style.top = (e.clientY - dragOffset.y) + 'px';
      controlPanel.style.right = 'auto';
    });

    document.addEventListener('mouseup', function() {
      isDragging = false;
    });

    document.getElementById('ha-minimize').addEventListener('click', function() {
      var content = document.getElementById('ha-content');
      var tabs = document.getElementById('ha-tabs');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        tabs.style.display = 'flex';
      } else {
        content.style.display = 'none';
        tabs.style.display = 'none';
      }
    });

    document.getElementById('ha-close').addEventListener('click', function() {
      controlPanel.remove();
      analysisPanel.remove();
      layerInspectorPanel.remove();
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyboardShortcuts);
      document.removeEventListener('keydown', trackModifierKey);
      document.removeEventListener('keyup', trackModifierKey);
      log('HighlightAssist GUI closed', 'info');
    });

    // Function to attach layer inspector listeners (for mode switching)
    function attachLayerInspectorListeners() {
      // Mode switcher buttons
      var layerModeBtns = document.querySelectorAll('.ha-layer-mode-btn');
      layerModeBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          var mode = this.getAttribute('data-mode');
          state.layerInspectorMode = mode;
          
          // Recreate panel with new mode
          var oldPanel = document.getElementById('ha-layer-inspector-floating');
          if (oldPanel) oldPanel.remove();
          var newPanel = createLayerInspectorPanel();
          document.body.appendChild(newPanel);
          updateLayerInspectorUI();
          
          // Re-attach all listeners
          attachLayerInspectorListeners();
          
          log('Layer inspector mode: ' + mode, 'info');
        });
      });
      
      // Close button
      var closeLayerInspectorBtn = document.getElementById('ha-close-layer-inspector');
      if (closeLayerInspectorBtn) {
        closeLayerInspectorBtn.addEventListener('click', function() {
          state.layerInspectorOpen = false;
          var panel = document.getElementById('ha-layer-inspector-floating');
          if (panel) panel.style.display = 'none';
          resetHiddenLayers();
          updateUI();
          log('Layer inspector closed', 'info');
        });
      }
      
      // Restore all button
      var restoreAllLayersBtn = document.getElementById('ha-restore-all-layers');
      if (restoreAllLayersBtn) {
        restoreAllLayersBtn.addEventListener('click', function() {
          resetHiddenLayers();
        });
      }
      
      // Rescan document button (document mode)
      var rescanBtn = document.getElementById('ha-rescan-document');
      if (rescanBtn) {
        rescanBtn.addEventListener('click', function() {
          scanDocumentLayers();
          updateLayerInspectorUI();
        });
      }
      
      // Make layer inspector draggable
      var layerDragHandle = document.getElementById('ha-layer-drag-handle');
      var layerIsDragging = false;
      var layerDragOffset = { x: 0, y: 0 };
      
      if (layerDragHandle) {
        layerDragHandle.addEventListener('mousedown', function(e) {
          var panel = document.getElementById('ha-layer-inspector-floating');
          if (!panel) return;
          layerIsDragging = true;
          layerDragOffset.x = e.clientX - panel.offsetLeft;
          layerDragOffset.y = e.clientY - panel.offsetTop;
        });
        
        document.addEventListener('mousemove', function(e) {
          if (!layerIsDragging) return;
          var panel = document.getElementById('ha-layer-inspector-floating');
          if (!panel) return;
          panel.style.left = (e.clientX - layerDragOffset.x) + 'px';
          panel.style.top = (e.clientY - layerDragOffset.y) + 'px';
        });
        
        document.addEventListener('mouseup', function() {
          layerIsDragging = false;
        });
      }
    }

    // Initial attachment of layer inspector listeners
    attachLayerInspectorListeners();

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyboardShortcuts);
    document.addEventListener('keydown', trackModifierKey);
    document.addEventListener('keyup', trackModifierKey);
    
    // Throttle scroll updates for performance
    var scrollTimeout = null;
    var lastScrollUpdate = 0;
    var scrollThrottleMs = 16; // ~60fps
    
    window.addEventListener('scroll', function() {
      var now = Date.now();
      
      // Throttle: only update every 16ms (60fps max)
      if (now - lastScrollUpdate < scrollThrottleMs) {
        // Schedule final update after scrolling stops
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
          updateOverlayPosition();
        }, 50);
        return;
      }
      
      lastScrollUpdate = now;
      updateOverlayPosition();
    }, true);
    
    function updateOverlayPosition() {
      // Only update if inspecting and we have a locked element
      if (state.locked && state.lockedElement) {
        var rect = state.lockedElement.getBoundingClientRect();
        updateHighlightOverlay(rect, state.lockedElement);
        
        // Only update analysis panel position (don't re-analyze on every scroll)
        if (analysisPanel && analysisPanel.style.display !== 'none') {
          // Just reposition the panel, don't re-run analysis
          var panel = analysisPanel;
          var panelWidth = 350;
          var spaceRight = window.innerWidth - rect.right;
          var spaceLeft = rect.left;
          var spaceBelow = window.innerHeight - rect.bottom;
          var spaceAbove = rect.top;
          
          // Clear previous positioning
          panel.style.right = '';
          panel.style.bottom = '';
          panel.style.left = '';
          panel.style.top = '';
          
          // Position based on available space (same logic as updateAnalysisPanel)
          if (spaceRight >= panelWidth + 40) {
            panel.style.left = (rect.right + 20) + 'px';
            panel.style.top = rect.top + 'px';
          } else if (spaceBelow >= 300) {
            panel.style.left = rect.left + 'px';
            panel.style.top = (rect.bottom + 10) + 'px';
          } else if (spaceAbove >= 300) {
            panel.style.left = rect.left + 'px';
            panel.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
          } else if (spaceLeft >= panelWidth + 40) {
            panel.style.right = (window.innerWidth - rect.left + 20) + 'px';
            panel.style.top = rect.top + 'px';
          } else {
            panel.style.top = '80px';
            panel.style.right = '20px';
          }
        }
      }
      // If not locked but hovering, update the hovered element overlay
      else if (state.isInspecting && state.hoveredElement && !state.locked) {
        var rect = state.hoveredElement.getBoundingClientRect();
        updateHighlightOverlay(rect, state.hoveredElement);
      }
    }

    updateUI();
    
    log('HighlightAssist GUI initialized successfully!', 'success');
    
    } catch (error) {
      logError(error, 'Init function');
      
      // Show user-friendly error notification
      var errorDiv = document.createElement('div');
      errorDiv.setAttribute('data-ha-ui', 'true');
      errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(239, 68, 68, 0.95); color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 999999; font-family: system-ui; max-width: 400px;';
      errorDiv.innerHTML = '<div style="font-weight: bold; margin-bottom: 8px;">⚠️ HighlightAssist Error</div><div style="font-size: 13px;">Failed to initialize: ' + error.message + '</div><div style="font-size: 11px; margin-top: 8px; opacity: 0.8;">Check console for details (F12)</div><button id="ha-error-dismiss" style="margin-top: 12px; padding: 6px 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; color: white; cursor: pointer;">Dismiss</button>';
      document.body.appendChild(errorDiv);
      
      // Add dismiss button listener (CSP-compliant)
      var dismissBtn = document.getElementById('ha-error-dismiss');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', function() {
          errorDiv.remove();
        });
      }
      
      // Auto-remove after 10 seconds
      setTimeout(function() {
        if (errorDiv.parentElement) errorDiv.remove();
      }, 10000);
    }
  }

  // MESSAGE LISTENER removed - overlay-gui.js runs in PAGE CONTEXT, not extension context
  // chrome.runtime is UNDEFINED here. Use window messages instead (handled below).

  // WINDOW MESSAGE LISTENER for content script forwarding
  window.addEventListener('message', function(event) {
    // Only accept messages from same window
    if (event.source !== window) return;
    
    if (event.data.type === 'HIGHLIGHT_ASSIST') {
      if (event.data.action === 'toggleInspecting') {
        toggleInspecting();
        // Send response back to content script with actual state
        window.postMessage({
          type: 'HIGHLIGHT_ASSIST_RESPONSE',
          action: 'toggleInspecting',
          isInspecting: state.isInspecting
        }, '*');
      } else if (event.data.action === 'showGui') {
        showControlPanel();
        // Send response back
        window.postMessage({
          type: 'HIGHLIGHT_ASSIST_RESPONSE',
          action: 'showGui',
          success: true
        }, '*');
      } else if (event.data.action === 'getState') {
        // Send current state back
        window.postMessage({
          type: 'HIGHLIGHT_ASSIST_RESPONSE',
          action: 'getState',
          isInspecting: state.isInspecting,
          locked: state.locked
        }, '*');
      }
    }
  });

  // KEYBOARD SHORTCUT HANDLER
  // Ctrl/Cmd+Shift+H: Toggle inspection mode
  // Ctrl/Cmd+Click: Lock hovered element
  function handleKeyboardShortcuts(event) {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const modifier = isMac ? event.metaKey : event.ctrlKey;
    
    // Ctrl/Cmd+Shift+H to toggle inspection
    if (modifier && event.shiftKey && event.key.toLowerCase() === 'h') {
      event.preventDefault();
      toggleInspecting();
      log(state.isInspecting ? 'Inspection enabled (Ctrl/Cmd+Shift+H)' : 'Inspection disabled (Ctrl/Cmd+Shift+H)', 'info');
      return;
    }
  }

  // Track if Ctrl/Cmd key is held during click
  let modifierHeld = false;
  function trackModifierKey(event) {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    modifierHeld = isMac ? event.metaKey : event.ctrlKey;
  }

  function showControlPanel() {
    const panel = document.querySelector('[data-ha-ui="control-panel"]');
    if (panel) {
      panel.style.display = 'block';
      log('GUI panel opened', 'info');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
