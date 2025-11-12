/**
 * ElementAnalyzer - Framework detection and element analysis
 * Extracts component info, CSS properties, and builds AI context
 */

export class ElementAnalyzer {
  constructor(stateManager) {
    this.stateManager = stateManager;
  }
  
  /**
   * Analyze element and extract key information
   */
  analyzeElement(element) {
    const framework = this.detectFramework(element);
    const selector = this.getSelector(element);
    const textContent = element.textContent ? element.textContent.trim().substring(0, 100) : '';
    
    return {
      element,
      tagName: element.tagName.toLowerCase(),
      selector,
      textContent,
      framework,
      id: element.id || null,
      className: element.className || null
    };
  }
  
  /**
   * Build full context for AI assistant
   */
  buildFullContext(element) {
    const selector = this.getSelector(element);
    const framework = this.detectFramework(element);
    
    const context = {
      selector,
      tagName: element.tagName.toLowerCase(),
      framework,
      timestamp: Date.now()
    };
    
    // HTML structure (truncated)
    try {
      const html = element.outerHTML;
      context.html = html.length > 1000 ? html.substring(0, 997) + '...' : html;
      context.innerHTML = element.innerHTML.length > 500 
        ? element.innerHTML.substring(0, 497) + '...' 
        : element.innerHTML;
      context.textContent = element.textContent 
        ? element.textContent.trim().substring(0, 200) 
        : '';
    } catch (e) {
      context.html = '[Error reading HTML]';
    }
    
    // Attributes
    context.attributes = {};
    if (element.attributes) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        context.attributes[attr.name] = attr.value;
      }
    }
    
    // Computed styles (selected properties)
    const computedStyle = window.getComputedStyle(element);
    context.styles = {
      display: computedStyle.display,
      position: computedStyle.position,
      width: computedStyle.width,
      height: computedStyle.height,
      margin: computedStyle.margin,
      padding: computedStyle.padding,
      backgroundColor: computedStyle.backgroundColor,
      color: computedStyle.color,
      fontSize: computedStyle.fontSize,
      fontFamily: computedStyle.fontFamily,
      zIndex: computedStyle.zIndex
    };
    
    // Dimensions
    const rect = element.getBoundingClientRect();
    context.dimensions = {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left
    };
    
    // Component info (if applicable)
    if (framework !== 'Vanilla JS') {
      context.componentInfo = this.extractComponentInfo(element, framework);
    }
    
    return context;
  }
  
  /**
   * Detect framework used by element
   */
  detectFramework(element) {
    if (!element) return 'Vanilla JS';
    
    // React
    const reactKeys = Object.keys(element).filter(key =>
      key.startsWith('__react') || key.startsWith('_react')
    );
    if (reactKeys.length > 0) return 'React';
    
    // Vue
    if (element.__vue__ || element.__vueParentComponent) return 'Vue';
    
    // Angular
    if (element.ng || element.__ngContext__) return 'Angular';
    
    // Svelte
    if (element.__svelte_meta) return 'Svelte';
    
    // Web Components
    if (element.tagName && element.tagName.includes('-')) return 'Web Component';
    
    return 'Vanilla JS';
  }
  
  /**
   * Extract component information based on framework
   */
  extractComponentInfo(element, framework) {
    const info = {
      componentStack: [],
      props: {},
      state: {},
      events: []
    };
    
    try {
      if (framework === 'React') {
        this.extractReactInfo(element, info);
      } else if (framework === 'Vue') {
        this.extractVueInfo(element, info);
      }
    } catch (e) {
      console.error('[ElementAnalyzer] Component extraction error:', e);
    }
    
    return info;
  }
  
  /**
   * Extract React component info
   */
  extractReactInfo(element, info) {
    const reactKeys = Object.keys(element).filter(key =>
      key.startsWith('__react') || key.startsWith('_react')
    );
    
    if (reactKeys.length > 0) {
      const fiber = element[reactKeys[0]];
      
      // Props
      if (fiber && fiber.memoizedProps) {
        Object.assign(info.props, fiber.memoizedProps);
      }
      
      // State
      if (fiber && fiber.memoizedState) {
        info.state = { hasState: true };
      }
      
      // Component name
      if (fiber && fiber.type && fiber.type.name) {
        info.componentStack.push(fiber.type.name);
      }
    }
  }
  
  /**
   * Extract Vue component info
   */
  extractVueInfo(element, info) {
    if (element.__vue__) {
      const vueInstance = element.__vue__;
      
      // Props
      if (vueInstance.$props) {
        Object.assign(info.props, vueInstance.$props);
      }
      
      // Data/state
      if (vueInstance.$data) {
        Object.assign(info.state, vueInstance.$data);
      }
      
      // Component name
      if (vueInstance.$options && vueInstance.$options.name) {
        info.componentStack.push(vueInstance.$options.name);
      }
    }
  }
  
  /**
   * Generate unique CSS selector for element
   */
  getSelector(element) {
    if (!element) return '';
    
    // Use ID if available
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Build selector path
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      // Add class if available
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(c => c);
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.');
        }
      }
      
      // Add nth-child if needed for uniqueness
      const siblings = current.parentElement 
        ? Array.from(current.parentElement.children).filter(el => el.tagName === current.tagName)
        : [];
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
      
      // Limit path length
      if (path.length >= 4) break;
    }
    
    return path.join(' > ');
  }
}
