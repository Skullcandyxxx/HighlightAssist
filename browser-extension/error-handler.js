// Global Error Handler for HighlightAssist
// Catches and logs all errors with context

class ErrorHandler {
  constructor(logger) {
    this.logger = logger;
    this.errorCount = 0;
    this.maxErrors = 100;
    this.errors = [];
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        type: 'uncaught_error'
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: 'Unhandled Promise Rejection',
        reason: event.reason,
        promise: event.promise,
        type: 'unhandled_rejection'
      });
    });

    // Catch Chrome runtime errors
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (chrome.runtime.lastError) {
          this.handleError({
            message: 'Chrome Runtime Error',
            error: chrome.runtime.lastError,
            request,
            sender,
            type: 'chrome_runtime'
          });
        }
      });
    }
  }

  handleError(errorInfo) {
    this.errorCount++;
    
    const errorEntry = {
      id: this.errorCount,
      timestamp: new Date().toISOString(),
      ...errorInfo,
      url: window.location?.href,
      userAgent: navigator.userAgent,
      stack: errorInfo.error?.stack || new Error().stack
    };

    this.errors.push(errorEntry);
    
    // Keep only last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to logger
    if (this.logger) {
      this.logger.error(
        errorInfo.message || 'Unknown error',
        errorEntry,
        'error-handler'
      );
    } else {
      console.error('[ErrorHandler]', errorEntry);
    }

    // Store critical errors
    this.saveCriticalError(errorEntry);

    return errorEntry;
  }

  async saveCriticalError(errorEntry) {
    try {
      const result = await chrome.storage.local.get(['highlightAssist_criticalErrors']);
      const criticalErrors = result.highlightAssist_criticalErrors || [];
      
      criticalErrors.push(errorEntry);
      
      // Keep only last 20 critical errors
      const trimmed = criticalErrors.slice(-20);
      
      await chrome.storage.local.set({
        highlightAssist_criticalErrors: trimmed
      });
    } catch (e) {
      console.error('[ErrorHandler] Failed to save critical error:', e);
    }
  }

  wrap(fn, context = 'anonymous') {
    const handler = this;
    return function(...args) {
      try {
        const result = fn.apply(this, args);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          return result.catch(error => {
            handler.handleError({
              message: `Error in ${context}`,
              error,
              type: 'wrapped_promise',
              context,
              args
            });
            throw error;
          });
        }
        
        return result;
      } catch (error) {
        handler.handleError({
          message: `Error in ${context}`,
          error,
          type: 'wrapped_function',
          context,
          args
        });
        throw error;
      }
    };
  }

  async safeExecute(fn, fallback = null, context = 'safeExecute') {
    try {
      return await fn();
    } catch (error) {
      this.handleError({
        message: `Safe execution failed in ${context}`,
        error,
        type: 'safe_execute',
        context
      });
      return fallback;
    }
  }

  getErrors(filter = {}) {
    let filtered = [...this.errors];

    if (filter.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }

    if (filter.since) {
      const sinceDate = new Date(filter.since);
      filtered = filtered.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    if (filter.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  }

  getStats() {
    const stats = {
      total: this.errorCount,
      stored: this.errors.length,
      byType: {}
    };

    this.errors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }

  clearErrors() {
    this.errors = [];
    this.errorCount = 0;
    if (this.logger) {
      this.logger.info('Errors cleared', {}, 'error-handler');
    }
  }
}

// Create global error handler (will be initialized with logger)
let errorHandler = null;

// Initialize when logger is available
if (typeof logger !== 'undefined') {
  errorHandler = new ErrorHandler(logger);
} else {
  // Wait for logger to be available
  setTimeout(() => {
    if (typeof logger !== 'undefined') {
      errorHandler = new ErrorHandler(logger);
    }
  }, 100);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}
