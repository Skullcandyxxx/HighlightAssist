// HighlightAssist Logger - Persistent logging system
// Logs are stored in Chrome storage and can be exported to files

class HighlightAssistLogger {
  constructor(maxLogs = 500) {
    this.maxLogs = maxLogs;
    this.sessionId = this.generateSessionId();
    this.logs = [];
    this.initialized = false;
    this.init();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async init() {
    try {
      // Load existing logs from storage
      const result = await chrome.storage.local.get(['highlightAssist_logs']);
      if (result.highlightAssist_logs) {
        this.logs = result.highlightAssist_logs.slice(-this.maxLogs);
      }
      this.initialized = true;
      this.info('Logger initialized', { sessionId: this.sessionId });
    } catch (error) {
      console.error('[Logger] Failed to initialize:', error);
    }
  }

  async log(level, message, data = {}, source = 'unknown') {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      data,
      source,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location?.href : 'background'
    };

    // Add to memory
    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Save to storage (throttled)
    this.scheduleSave();

    // Also log to console with color
    const colors = {
      ERROR: 'color: #ef4444; font-weight: bold',
      WARN: 'color: #f59e0b; font-weight: bold',
      INFO: 'color: #3b82f6',
      DEBUG: 'color: #8b5cf6',
      SUCCESS: 'color: #10b981; font-weight: bold'
    };

    console.log(
      `%c[${level.toUpperCase()}] ${source}`,
      colors[level.toUpperCase()] || '',
      message,
      data
    );

    return entry;
  }

  info(message, data = {}, source = 'app') {
    return this.log('info', message, data, source);
  }

  warn(message, data = {}, source = 'app') {
    return this.log('warn', message, data, source);
  }

  error(message, data = {}, source = 'app') {
    return this.log('error', message, data, source);
  }

  debug(message, data = {}, source = 'app') {
    return this.log('debug', message, data, source);
  }

  success(message, data = {}, source = 'app') {
    return this.log('success', message, data, source);
  }

  // Throttled save to prevent excessive storage writes
  scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveLogs();
    }, 1000); // Save after 1 second of inactivity
  }

  async saveLogs() {
    try {
      await chrome.storage.local.set({
        highlightAssist_logs: this.logs,
        highlightAssist_lastSaved: new Date().toISOString()
      });
    } catch (error) {
      console.error('[Logger] Failed to save logs:', error);
    }
  }

  async getLogs(filter = {}) {
    const { level, source, since, limit } = filter;
    let filtered = [...this.logs];

    if (level) {
      filtered = filtered.filter(log => log.level === level.toUpperCase());
    }

    if (source) {
      filtered = filtered.filter(log => log.source === source);
    }

    if (since) {
      const sinceDate = new Date(since);
      filtered = filtered.filter(log => new Date(log.timestamp) >= sinceDate);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  async exportLogs(format = 'json') {
    const logs = await this.getLogs();
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else if (format === 'text') {
      return logs.map(log => 
        `[${log.timestamp}] [${log.level}] [${log.source}] ${log.message}\n` +
        (Object.keys(log.data).length ? `  Data: ${JSON.stringify(log.data)}\n` : '')
      ).join('\n');
    } else if (format === 'csv') {
      const headers = 'Timestamp,Level,Source,Message,URL,Data\n';
      const rows = logs.map(log =>
        `"${log.timestamp}","${log.level}","${log.source}","${log.message}","${log.url || ''}","${JSON.stringify(log.data).replace(/"/g, '""')}"`
      ).join('\n');
      return headers + rows;
    }

    return logs;
  }

  async downloadLogs(format = 'json') {
    try {
      const content = await this.exportLogs(format);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `highlightassist-logs-${timestamp}.${format === 'csv' ? 'csv' : format === 'text' ? 'txt' : 'json'}`;
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      
      URL.revokeObjectURL(url);
      
      this.success('Logs downloaded', { filename, format }, 'logger');
      return { success: true, filename };
    } catch (error) {
      this.error('Failed to download logs', { error: error.message }, 'logger');
      return { success: false, error: error.message };
    }
  }

  async clearLogs() {
    this.logs = [];
    await chrome.storage.local.remove(['highlightAssist_logs']);
    this.info('Logs cleared', {}, 'logger');
  }

  getStats() {
    const stats = {
      total: this.logs.length,
      byLevel: {},
      bySource: {},
      sessionId: this.sessionId,
      oldestLog: this.logs[0]?.timestamp,
      newestLog: this.logs[this.logs.length - 1]?.timestamp
    };

    this.logs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
    });

    return stats;
  }
}

// Create global logger instance
const logger = new HighlightAssistLogger();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = logger;
}
