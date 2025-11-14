// NativeBridge: Handles communication with native host/service

export class NativeBridge {
  constructor() {
    this.listeners = [];
  }

  connect() {
    // Connect to native host (stub)
  }

  disconnect() {
    // Disconnect from native host (stub)
  }

  sendMessage(msg) {
    // Send message to native host (stub)
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify(event) {
    this.listeners.forEach(fn => fn(event));
  }
}
