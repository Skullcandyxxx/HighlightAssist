// StateManager: centralizes app state

export class StateManager {
  constructor() {
    this.state = {
      selectedProject: null,
      bridgeConnected: false,
      isInspecting: false,
      locked: false,
      lockedElement: null,
      hoveredElement: null,
      layerInspectorOpen: false,
      layerInspectorMode: 'default',
      // ...add more as needed
    };
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    this.state[key] = value;
    this.notify();
  }

  update(obj) {
    Object.assign(this.state, obj);
    this.notify();
  }
}
