// Universal highlight tool - injected by the extension
(function() {
  'use strict';

  // Prevent double-loading
  if (window.__highlightAssistLoaded) {
    console.log('HighlightAssist already loaded');
    return;
  }
  window.__highlightAssistLoaded = true;

  let isActive = false;
  let currentTooltip = null;
  let highlightedElement = null;

  // Styles for highlighting
  const style = document.createElement('style');
  style.textContent = `
    .highlight-assist-active {
      outline: 2px solid #667eea !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
    }

    .highlight-assist-tooltip {
      position: fixed;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      line-height: 1.6;
      z-index: 999999;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 400px;
      backdrop-filter: blur(10px);
    }

    .highlight-assist-tooltip-row {
      display: flex;
      gap: 8px;
      margin: 4px 0;
    }

    .highlight-assist-tooltip-label {
      font-weight: 600;
      opacity: 0.9;
      min-width: 60px;
    }

    .highlight-assist-tooltip-value {
      font-family: 'Courier New', monospace;
      background: rgba(255,255,255,0.2);
      padding: 2px 6px;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);

  // Get element info
  function getElementInfo(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className ? `.${Array.from(element.classList).join('.')}` : '';
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);

    return {
      tag,
      id,
      classes,
      position: computedStyle.position,
      display: computedStyle.display,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top),
      left: Math.round(rect.left)
    };
  }

  // Create tooltip
  function createTooltip(element, mouseX, mouseY) {
    const info = getElementInfo(element);
    
    const tooltip = document.createElement('div');
    tooltip.className = 'highlight-assist-tooltip';
    
    tooltip.innerHTML = `
      <div class="highlight-assist-tooltip-row">
        <span class="highlight-assist-tooltip-label">Tag:</span>
        <span class="highlight-assist-tooltip-value">&lt;${info.tag}&gt;</span>
      </div>
      ${info.id ? `
      <div class="highlight-assist-tooltip-row">
        <span class="highlight-assist-tooltip-label">ID:</span>
        <span class="highlight-assist-tooltip-value">${info.id}</span>
      </div>` : ''}
      ${info.classes ? `
      <div class="highlight-assist-tooltip-row">
        <span class="highlight-assist-tooltip-label">Classes:</span>
        <span class="highlight-assist-tooltip-value">${info.classes}</span>
      </div>` : ''}
      <div class="highlight-assist-tooltip-row">
        <span class="highlight-assist-tooltip-label">Position:</span>
        <span class="highlight-assist-tooltip-value">${info.position}</span>
      </div>
      <div class="highlight-assist-tooltip-row">
        <span class="highlight-assist-tooltip-label">Size:</span>
        <span class="highlight-assist-tooltip-value">${info.width}×${info.height}px</span>
      </div>
    `;

    // Position tooltip near cursor
    tooltip.style.left = (mouseX + 15) + 'px';
    tooltip.style.top = (mouseY + 15) + 'px';

    // Adjust if tooltip goes off screen
    document.body.appendChild(tooltip);
    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth) {
      tooltip.style.left = (mouseX - tooltipRect.width - 15) + 'px';
    }
    if (tooltipRect.bottom > window.innerHeight) {
      tooltip.style.top = (mouseY - tooltipRect.height - 15) + 'px';
    }

    return tooltip;
  }

  // Mouse move handler
  function handleMouseMove(e) {
    if (!isActive) return;

    // Remove previous highlight
    if (highlightedElement) {
      highlightedElement.classList.remove('highlight-assist-active');
    }

    // Remove previous tooltip
    if (currentTooltip) {
      currentTooltip.remove();
      currentTooltip = null;
    }

    // Get element under cursor
    const element = e.target;
    
    // Don't highlight the tooltip itself
    if (element.classList.contains('highlight-assist-tooltip')) return;

    // Highlight element
    element.classList.add('highlight-assist-active');
    highlightedElement = element;
  }

  // Mouse click handler
  function handleClick(e) {
    if (!isActive) return;

    e.preventDefault();
    e.stopPropagation();

    const element = e.target;
    
    // Remove old tooltip
    if (currentTooltip) {
      currentTooltip.remove();
    }

    // Create and show tooltip
    currentTooltip = createTooltip(element, e.clientX, e.clientY);

    // Log to console for developers
    console.log('HighlightAssist - Element Info:', getElementInfo(element), element);
  }

  // Enable highlighting
  function enable() {
    if (isActive) return;
    
    isActive = true;
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    
    console.log('✅ HighlightAssist enabled');
  }

  // Disable highlighting
  function disable() {
    if (!isActive) return;
    
    isActive = false;
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);

    // Clean up
    if (highlightedElement) {
      highlightedElement.classList.remove('highlight-assist-active');
      highlightedElement = null;
    }
    if (currentTooltip) {
      currentTooltip.remove();
      currentTooltip = null;
    }

    console.log('❌ HighlightAssist disabled');
  }

  // Expose API
  window.HighlightAssist = {
    enable,
    disable,
    isActive: () => isActive
  };

  console.log('🎨 HighlightAssist loaded and ready!');
})();
