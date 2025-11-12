// OverlayPanel: Handles overlay UI rendering and updates

export class OverlayPanel {
  constructor(stateManager, projectManager, notification) {
    this.stateManager = stateManager;
    this.projectManager = projectManager;
    this.notification = notification;
    this.state = {};
    this.domCache = {};
    this.stateManager.subscribe((newState) => this.update(newState));
    // ...initialize DOM refs, etc.
  }

  // Shallow compare two objects
  shallowEqual(objA, objB) {
    if (objA === objB) return true;
    if (!objA || !objB) return false;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (let key of keysA) {
      if (objA[key] !== objB[key]) return false;
    }
    return true;
  }

  // Cache and retrieve DOM nodes by selector
  getDom(selector) {
    if (!this.domCache[selector]) {
      const panel = document.getElementById('overlay-panel');
      if (panel) {
        this.domCache[selector] = panel.querySelector(selector);
      }
    }
    return this.domCache[selector];
  }

  render() {
    // Example: update a status element only if value changed
    const statusEl = this.getDom('.overlay-status');
    if (statusEl && statusEl.textContent !== this.state.status) {
      statusEl.textContent = this.state.status;
    }
    // ...existing code for other UI updates, using getDom for caching...
  }

  // Called by StateManager on state change
  update(newState) {
    if (this.shallowEqual(this.state, newState)) return; // No update needed
    this.state = { ...newState };
    this.render();
  }

  showNotification(message, type = 'info') {
    if (this.notification) {
      this.notification.notify(message, type);
    }
  }
}
