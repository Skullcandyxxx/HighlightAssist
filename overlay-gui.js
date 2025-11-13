// ====================================================================
// HighlightAssist - Complete GUI Overlay (Browser Extension Port)
// Original React functionality ported to vanilla JS

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

  // ====================================================================
  // SETTINGS TAB
  // ====================================================================
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

  // ====================================================================
  // BRIDGE TAB
  // ====================================================================
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
    
    var launchGradient = state.bridgeConnected ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #10b981, #059669)';
    if (state.nativeLaunchInProgress) {
      launchGradient = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
    }
    var launchLabel = state.bridgeConnected ? '🛑 Stop' : (state.nativeLaunchInProgress ? '⏳ Launching…' : '🚀 Start');
    var launchStyles = 'padding: 10px 16px; background: ' + launchGradient + '; border: none; border-radius: 6px; color: white; font-size: 11px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); white-space: nowrap; transition: all 0.2s ease;';
    if (state.nativeLaunchInProgress) {
      launchStyles += ' opacity: 0.85; pointer-events: none; animation: ha-pulse 1.4s ease-in-out infinite;';
    }
    html += '<button id="ha-launch-service" style="' + launchStyles + '">';
    html += launchLabel;
    html += '</button>';
    html += '</div>';
    var nativeStatus = state.nativeHost || {};
    var nativeColor = nativeStatus.running ? '#10b981' : (nativeStatus.available ? '#fbbf24' : '#ef4444');
    var nativeText = nativeStatus.running ? 'Bridge helper ready' : (nativeStatus.available ? 'Helper idle' : 'Helper offline');
    if (state.nativeHostStatusLoading) {
      nativeText = 'Checking helper status…';
      nativeColor = '#60a5fa';
    } else if (nativeStatus.error) {
      nativeText = nativeStatus.error;
      nativeColor = '#f87171';
    }
    html += '<div style="margin-top: -4px; margin-bottom: 12px; font-size: 9px; color: #94a3b8; text-align: right;">';
    html += '<span style="color: ' + nativeColor + '; font-weight: 600;">' + nativeText + '</span>';
    if (nativeStatus.lastChecked) {
      html += '<span style="margin-left: 6px; opacity: 0.7;">• ' + new Date(nativeStatus.lastChecked).toLocaleTimeString() + '</span>';
    }
    html += '</div>';
    
    // AI Configuration Helper
    html += '<div style="background-color: rgba(59, 130, 246, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.3); margin-bottom: 10px;">';
    html += '<div style="font-size: 9px; font-weight: 600; color: #60a5fa; margin-bottom: 6px;">💡 AI SETUP GUIDE</div>';
    html += '<div style="font-size: 9px; color: #93c5fd; line-height: 1.4; margin-bottom: 6px;">Configure GitHub Copilot / VSCode AI:</div>';
    html += '<code style="display: block; background-color: rgba(0, 0, 0, 0.4); padding: 6px; border-radius: 4px; font-size: 9px; color: #fbbf24; margin-bottom: 4px; overflow-x: auto; white-space: pre;">ws://localhost:5055/ws</code>';
    html += '<button id="ha-copy-ws-url" style="padding: 4px 8px; background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 4px; color: #60a5fa; cursor: pointer; font-size: 8px; font-weight: 600; width: 100%;">📋 Copy WebSocket URL</button>';
    html += '</div>';

    // Projects quick-run section (register local workspaces and start commands via native host)
    html += '<div style="background-color: rgba(16, 185, 129, 0.05); padding: 10px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.1); margin-bottom: 10px;">';
    html += '<div style="font-size: 9px; font-weight: 600; color: #10b981; margin-bottom: 6px;">🚀 Projects</div>';
    html += '<div id="ha-projects-list" style="max-height: 160px; overflow-y: auto; margin-bottom: 8px;">';
    html += '<div style="font-size: 10px; color: #94a3b8;">No projects configured. Click "Add Project" to register a workspace.</div>';
    html += '</div>';
    html += '<div style="display:flex; gap:6px;">';
    html += '<button id="ha-add-project" style="flex:1; padding: 6px; background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16,185,129,0.2); border-radius: 6px; color: #10b981; cursor:pointer; font-size: 11px; font-weight:600;">＋ Add Project</button>';
    html += '<button id="ha-refresh-projects" style="padding:6px; background-color: rgba(255,255,255,0.02); border:1px solid rgba(0,0,0,0.05); border-radius:6px; color:#94a3b8; cursor:pointer; font-size:11px;">🔄</button>';
    html += '</div>';
    html += '</div>';
    
    html += '</div>';
    
    // Manual Configuration (Collapsible)</
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
    
    html += '</div>';
    
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
    html += '<div style="margin-top: 8px; font-size: 9px, color: #64748b; text-align: center;">💡 Tip: Use console commands: __HA_getErrors__() • __HA_clearErrors__()</div>';
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
      // Optionally append id or other info here
      // label += '#' + element.id;
    }
    return label;
  }

// (All legacy procedural code removed; see modules for new logic)
// ====================================================================
  // UI UPDATE
  // ====================================================================
// (All legacy procedural code removed; see modules for new logic)

  // ---------------------- Projects: storage and UI -----------------------
  function loadProjectsList() {
    // Get stored projects (key: ha_projects)
    callStorage('get', 'ha_projects').then(function(value) {
      var projects = Array.isArray(value) ? value : [];
      renderProjects(projects);
    }).catch(function() {
      renderProjects([]);
    });
  }

  function saveProjects(projects) {
    return callStorage('set', 'ha_projects', projects);
  }

  function renderProjects(projects) {
    var container = document.getElementById('ha-projects-list');
    if (!container) return;
    container.innerHTML = '';
    if (!projects || projects.length === 0) {
      container.innerHTML = '<div style="font-size: 10px; color: #94a3b8;">No projects configured. Click "Add Project" to register a workspace.</div>';
      return;
    }

    projects.forEach(function(p, idx) {
      var card = document.createElement('div');
      card.style.cssText = 'padding:8px; margin-bottom:6px; background: rgba(255,255,255,0.02); border:1px solid rgba(0,0,0,0.04); border-radius:6px; display:flex; justify-content:space-between; align-items:center;';
      var info = document.createElement('div');
      info.innerHTML = '<div style="font-size:11px; font-weight:600; color:#c4b5fd;">' + escapeHtml(p.name || ('Project ' + (idx+1))) + '</div>' + '<div style="font-size:10px; color:#94a3b8;">' + escapeHtml(p.cwd || '') + '</div>' + '<div style="font-size:10px; color:#94a3b8;">' + escapeHtml(p.command || '') + '</div>';
  var actions = document.createElement('div');
      actions.style.cssText = 'display:flex; gap:6px;';
      var startBtn = document.createElement('button');
      startBtn.textContent = '▶ Start';
      startBtn.style.cssText = 'padding:6px; background:linear-gradient(135deg,#10b981,#059669); color:white; border-radius:6px; border:none; cursor:pointer; font-weight:700;';
      startBtn.addEventListener('click', function() {
        startProject(p);
      });
      var editBtn = document.createElement('button');
      editBtn.textContent = '✎';
      editBtn.style.cssText = 'padding:6px; background:rgba(255,255,255,0.02); border:1px solid rgba(0,0,0,0.05); border-radius:6px; color:#94a3b8; cursor:pointer;';
      editBtn.addEventListener('click', function() { showEditProjectForm(projects, idx); });
      var delBtn = document.createElement('button');
      delBtn.textContent = '🗑';
      delBtn.style.cssText = 'padding:6px; background:rgba(255,0,0,0.02); border:1px solid rgba(255,0,0,0.05); border-radius:6px; color:#f87171; cursor:pointer;';
      delBtn.addEventListener('click', function() { deleteProject(projects, idx); });

      // Show stop button if this project appears to be running according to native host
      var isRunning = false;
      try {
        if (Array.isArray(state.nativeWorkspaces) && state.nativeWorkspaces.length) {
          isRunning = state.nativeWorkspaces.some(function(w) {
            // Match by cwd or by command substring
            try {
              if (w.cwd && p.cwd && w.cwd === p.cwd) return true;
              if (w.command && p.command && w.command.indexOf(p.command) !== -1) return true;
            } catch (e) {}
            return false;
          });
        }
      } catch (e) { isRunning = false; }

      var stopBtn = document.createElement('button');
      stopBtn.textContent = '■ Stop';
      stopBtn.style.cssText = 'padding:6px; background:linear-gradient(135deg,#ef4444,#dc2626); color:white; border-radius:6px; border:none; cursor:pointer; font-weight:700; display:' + (isRunning ? 'inline-flex' : 'none');
      stopBtn.addEventListener('click', function() {
        // UI feedback: disable button and show stopping state
        var originalText = stopBtn.textContent;
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping…';
        stopProject(p).then(function() {
          loadProjectsList();
          refreshNativeWorkspaces();
        }).catch(function(err){
          showError('Stop failed: '+(err && err.message));
        }).finally(function() {
          // Restore button state; if still running hide the button
          try {
            stopBtn.disabled = false;
            stopBtn.textContent = originalText;
            // re-render projects to reflect current state
            callStorage('get', 'ha_projects').then(function(value) { renderProjects(Array.isArray(value) ? value : []); }).catch(function(){ renderProjects([]); });
          } catch (e) {}
        });
      });

      actions.appendChild(startBtn);
      actions.appendChild(stopBtn);
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      card.appendChild(info);
      card.appendChild(actions);
      container.appendChild(card);
    });
  }

  // Enhance the folder/service selection logic to allow users to proceed after selecting a folder and command for running a local host.
  function showAddProjectForm() {
    // Enhanced flow with validation and user guidance
    var name = prompt('Project name (e.g., Portal)');
  if (!name) {
    showNotification('Project name is required.', 'error');
    return;
  }

  var cwd = prompt('Project folder (absolute path)');
  if (!cwd) {
    showNotification('Project folder is required.', 'error');
    return;
  }

  var cmd = prompt('Command to run (e.g., npm run dev)');
  if (!cmd) {
    showNotification('Command is required.', 'error');
    return;
  }

  // Confirm the details with the user before proceeding
  var confirmation = confirm(`Please confirm the project details:\n\nName: ${name}\nFolder: ${cwd}\nCommand: ${cmd}\n\nClick OK to save or Cancel to edit.`);
  if (!confirmation) {
    showNotification('Project setup canceled. Please try again.', 'error');
    return;
  }

    callStorage('get', 'ha_projects').then(function(current) {
        var projects = Array.isArray(current) ? current : [];
        projects.push({ name: name, cwd: cwd, command: cmd });
        saveProjects(projects).then(function() {
            loadProjectsList();
            showSuccess('Project saved successfully! You can now proceed to run the local host.');
        }).catch(function(e) {
            showError('Save failed: ' + e.message);
        });
    }).catch(function() {
        var projects = [{ name: name, cwd: cwd, command: cmd }];
        saveProjects(projects).then(function() {
            loadProjectsList();
            showSuccess('Project saved successfully! You can now proceed to run the local host.');
        }).catch(function(e) {
            showError('Save failed: ' + e.message);
        });
    });
  }

  function showEditProjectForm(projects, idx) {
    var p = projects[idx];
    var name = prompt('Project name', p.name);
    if (name === null) return;
    var cwd = prompt('Project folder (absolute path)', p.cwd);
    if (cwd === null) return;
    var cmd = prompt('Command to run', p.command);
    if (cmd === null) return;
    projects[idx] = { name: name, cwd: cwd, command: cmd };
    saveProjects(projects).then(function(){ loadProjectsList(); showSuccess('Project updated'); }).catch(function(e){ showError('Save failed: '+e.message); });
  }

  function deleteProject(projects, idx) {
    if (!confirm('Delete this project?')) return;
    projects.splice(idx, 1);
    saveProjects(projects).then(function(){ loadProjectsList(); showSuccess('Project removed'); }).catch(function(e){ showError('Delete failed: '+e.message); });
  }

  function startProject(p) {
    if (!p || !p.cwd || !p.command) { showError('Invalid project configuration'); return; }
    // Ask native host to run workspace command
    updateNativeHostState({ running: state.nativeHost.running });
    callNativeHost('run_workspace_command', { cwd: p.cwd, command: p.command, shell: true }, 10000).then(function(resp) {
      if (resp && resp.status === 'started') {
        showSuccess('Project started (pid: ' + resp.pid + ')');
        // Optionally open default URL if provided
        if (p.openUrl) {
          window.open(p.openUrl, '_blank');
        }
      } else {
        showError('Failed to start: ' + (resp && resp.error ? resp.error : JSON.stringify(resp)));
      }
    }).catch(function(err) {
      showError('Native host error: ' + err.message);
    });
  }

  function stopProject(p) {
    // Return a Promise so callers can chain refreshes
    return new Promise(function(resolve, reject) {
      if (!p) return reject(new Error('Invalid project'));

      // Ensure we have a recent list of native workspaces
      var ensureList = Promise.resolve(state.nativeWorkspaces && state.nativeWorkspaces.length ? state.nativeWorkspaces : null);
      // If no cached list, ask native host for current workspaces
      if (!state.nativeWorkspaces || !state.nativeWorkspaces.length) {
        ensureList = callNativeHost('list_workspaces', {}, 4000).then(function(resp) {
          return Array.isArray(resp.workspaces) ? resp.workspaces : [];
        }).catch(function() { return []; });
      }

      ensureList.then(function(list) {
        var found = null;
        try {
          list = Array.isArray(list) ? list : [];
          for (var i = 0; i < list.length; i++) {
            var w = list[i];
            if (!w) continue;
            try {
              if (w.cwd && p.cwd && w.cwd === p.cwd) { found = w; break; }
              if (w.command && p.command && w.command.indexOf(p.command) !== -1) { found = w; break; }
            } catch (e) {}
          }
        } catch (e) { found = null; }

        if (!found) {
          return reject(new Error('No running workspace found for this project'));
        }

        var payload = {};
        if (found.id) payload.id = found.id;
        else if (found.pid) payload.pid = found.pid;

        callNativeHost('kill_workspace', payload, 5000).then(function(resp) {
          if (resp && resp.status === 'stopped') {
            showSuccess('Project stopped (pid: ' + resp.pid + ')');
            // Update local cached list and UI
            refreshNativeWorkspaces();
            resolve(resp);
          } else {
            var err = resp && resp.error ? resp.error : JSON.stringify(resp);
            showError('Failed to stop: ' + err);
            reject(new Error(err));
          }
        }).catch(function(err) {
          showError('Native host error: ' + (err && err.message ? err.message : err));
          reject(err);
        });
      }).catch(function(err) {
        reject(err);
      });
    });
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
          state.nativeLaunchInProgress = true;
          updateUI();
          callNativeHost('stop_bridge')
            .then(function(response) {
              if (state.bridgeWS) {
                state.bridgeWS.close();
              }
              updateNativeHostState({
                running: false,
                available: true,
                lastChecked: Date.now(),
                lastResponse: response,
                error: null
              });
              log('Bridge daemon stop requested', 'info');
            })
            .catch(function(error) {
              log('Failed to stop bridge service: ' + error.message, 'error');
            })
            .finally(function() {
              state.nativeLaunchInProgress = false;
              updateUI();
            });
        } else {
          state.nativeLaunchInProgress = true;
          updateUI();
          log('Requesting native helper to start the bridge…', 'info');
          callNativeHost('start_bridge')
            .then(function(response) {
              updateNativeHostState({
                running: true,
                available: true,
                lastChecked: Date.now(),
                lastResponse: response,
                error: null
              });
              log('Native helper acknowledged bridge start', 'success');
              setTimeout(function() {
                connectBridge();
              }, 600);
            })
            .catch(function(error) {
              log('Bridge launch failed: ' + error.message, 'error');
              updateNativeHostState({
                running: false,
                available: false,
                lastChecked: Date.now(),
                error: error.message
              });
            })
            .finally(function() {
              state.nativeLaunchInProgress = false;
              updateUI();
            });
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

    // Projects UI actions
    var addProjBtn = document.getElementById('ha-add-project');
    if (addProjBtn) {
      addProjBtn.addEventListener('click', function() {
        showAddProjectForm();
      });
    }

    var refreshProjBtn = document.getElementById('ha-refresh-projects');
    if (refreshProjBtn) refreshProjBtn.addEventListener('click', loadProjectsList);

    // Load projects on tab open
    loadProjectsList();
    
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

    refreshNativeHostStatus({ silent: true });
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
    } else if (event.data.type === 'HIGHLIGHT_ASSIST_NATIVE_RESPONSE') {
      var pending = pendingNativeHostRequests.get(event.data.requestId);
      if (!pending) return;
      clearTimeout(pending.timeout);
      pendingNativeHostRequests.delete(event.data.requestId);

      var response = event.data.response || {};
      if (response.success === false) {
        pending.reject(new Error(response.error || 'Native host error'));
      } else {
        var payload = response.response || response;
        payload.__raw = response;
        pending.resolve(payload);
      }
    }
    else if (event.data.type === 'HIGHLIGHT_ASSIST_STORAGE_RESPONSE') {
      var pending = pendingStorageRequests.get(event.data.requestId);
      if (!pending) return;
      clearTimeout(pending.timeout);
      pendingStorageRequests.delete(event.data.requestId);
      if (event.data.ok) {
        pending.resolve(event.data.value !== undefined ? event.data.value : null);
      } else {
        pending.reject(new Error(event.data.error || 'storage_error'));
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
// ...existing code...
