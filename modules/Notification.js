// Notification: Displays success/error messages

export class Notification {
  static showSuccess(msg) {
    Notification._show(msg, 'success');
  }

  static showError(msg) {
    Notification._show(msg, 'error');
  }

  static _show(msg, type) {
    // Simple non-blocking notification (replace with toast/snackbar in real UI)
    const div = document.createElement('div');
    div.textContent = msg;
    div.style.position = 'fixed';
    div.style.bottom = '32px';
    div.style.right = '32px';
    div.style.padding = '12px 24px';
    div.style.background = type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)';
    div.style.color = '#fff';
    div.style.fontSize = '15px';
    div.style.borderRadius = '6px';
    div.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
    div.style.zIndex = 999999;
    document.body.appendChild(div);
    setTimeout(() => {
      div.style.transition = 'opacity 0.5s';
      div.style.opacity = 0;
      setTimeout(() => div.remove(), 500);
    }, 2200);
  }
}
