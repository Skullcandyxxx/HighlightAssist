# HighlightAssist Logging System

## Overview

The HighlightAssist extension now includes comprehensive logging and error handling to help diagnose issues without back-and-forth debugging.

## Log Storage Locations

### 1. Chrome Storage (Live Logs)
- **Location**: Chrome extension storage (`chrome.storage.local`)
- **Key**: `highlightAssist_logs`
- **Max Size**: 500 most recent log entries
- **Access**: Via extension popup or DevTools

### 2. Critical Errors
- **Location**: Chrome extension storage
- **Key**: `highlightAssist_criticalErrors`
- **Max Size**: 20 most recent critical errors
- **Auto-saved**: On every critical error

### 3. Exported Log Files
- **Location**: Browser's download folder
- **Formats**: JSON, TXT, CSV
- **Access**: Click "Export Logs" button in extension popup

## How to Access Logs

### Method 1: Export from Popup (Recommended)
1. Click the HighlightAssist extension icon
2. Click "📥 Export Logs" button
3. Choose format (json/text/csv)
4. File will download to your Downloads folder

### Method 2: View in Console
```javascript
// In browser console on any localhost page:

// Get all logs
chrome.storage.local.get(['highlightAssist_logs'], (result) => {
  console.table(result.highlightAssist_logs);
});

// Get critical errors only
chrome.storage.local.get(['highlightAssist_criticalErrors'], (result) => {
  console.table(result.highlightAssist_criticalErrors);
});

// Get log stats
chrome.storage.local.get(['highlightAssist_logs'], (result) => {
  const logs = result.highlightAssist_logs || [];
  const stats = {
    total: logs.length,
    byLevel: {},
    bySource: {}
  };
  
  logs.forEach(log => {
    stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;
  });
  
  console.log('Log Stats:', stats);
  console.log('Recent Errors:', logs.filter(l => l.level === 'ERROR').slice(-10));
});
```

### Method 3: Settings View
1. Click extension icon
2. Click "⚙️ Settings & Preferences"
3. View log statistics in alert

## Log Entry Structure

Each log entry contains:

```json
{
  "timestamp": "2025-11-09T12:34:56.789Z",
  "level": "INFO|WARN|ERROR|DEBUG|SUCCESS",
  "message": "Human-readable message",
  "data": {
    // Additional context data
  },
  "source": "content|popup|overlay|error-handler|logger",
  "sessionId": "session_1699534496789_abc123",
  "url": "http://localhost:3000/page"
}
```

## Error Entry Structure

Critical errors include:

```json
{
  "id": 1,
  "timestamp": "2025-11-09T12:34:56.789Z",
  "message": "Error description",
  "type": "uncaught_error|unhandled_rejection|chrome_runtime|wrapped_function",
  "error": {
    // Error object details
  },
  "stack": "Stack trace...",
  "url": "http://localhost:3000",
  "userAgent": "Mozilla/5.0..."
}
```

## Log Levels

- **ERROR**: Critical failures that prevent functionality
- **WARN**: Non-critical issues that may need attention
- **INFO**: General information about operations
- **DEBUG**: Detailed debugging information
- **SUCCESS**: Successful operations

## Log Sources

- **content**: Content script (content.js)
- **popup**: Extension popup (popup.js)
- **overlay**: On-page overlay GUI (overlay-gui.js)
- **error-handler**: Global error handler
- **logger**: Logging system itself

## Export Formats

### JSON (Recommended for developers)
```json
[
  {
    "timestamp": "2025-11-09T12:34:56.789Z",
    "level": "ERROR",
    "message": "Failed to connect",
    "data": {...},
    "source": "content"
  }
]
```

### Text (Human-readable)
```
[2025-11-09T12:34:56.789Z] [ERROR] [content] Failed to connect
  Data: {"attempt":1,"url":"ws://localhost:5055"}
```

### CSV (For spreadsheet analysis)
```csv
Timestamp,Level,Source,Message,URL,Data
"2025-11-09T12:34:56.789Z","ERROR","content","Failed to connect","http://localhost:3000","{...}"
```

## Troubleshooting with Logs

### Common Issues and What to Look For

#### 1. Extension Not Loading
Look for:
- `level: "ERROR"` in logs
- `source: "content"` entries
- Messages containing "Failed to load overlay"

#### 2. Inspection Not Working
Look for:
- `source: "overlay"` entries
- Messages about "toggleInspecting"
- Any WebSocket connection errors

#### 3. GUI Panel Not Appearing
Look for:
- Messages about "showGui"
- DOM manipulation errors
- Z-index or visibility issues

#### 4. Bridge Connection Issues
Look for:
- WebSocket connection attempts
- Handshake failures
- Port 5055 connection errors

## Automatic Error Handling

The extension now includes:

1. **Global Error Handler**: Catches all uncaught errors and promise rejections
2. **Chrome Runtime Error Handler**: Catches extension-specific errors
3. **Wrapped Functions**: Critical functions are wrapped with error handling
4. **Safe Execution**: Async operations use safe execution wrapper

## Privacy Note

- Logs are stored **locally** in your browser only
- No logs are sent to external servers
- Logs contain URLs you visit (localhost only)
- You control when logs are exported or deleted

## Clearing Logs

To clear all logs:

```javascript
// In browser console
chrome.storage.local.remove([
  'highlightAssist_logs',
  'highlightAssist_criticalErrors',
  'highlightAssist_lastSaved'
]);
```

Or wait - logs auto-rotate and keep only the most recent 500 entries.

## For Developers

### Adding Custom Logs

```javascript
// In any extension script where logger is available
logger.info('Operation completed', { id: 123 }, 'my-component');
logger.warn('Slow operation', { duration: 5000 }, 'my-component');
logger.error('Failed', { reason: 'timeout' }, 'my-component');
logger.debug('State change', { before: 'A', after: 'B' }, 'my-component');
logger.success('Connected!', { port: 5055 }, 'my-component');
```

### Error Wrapping

```javascript
// Wrap risky functions
const safeFunction = errorHandler.wrap(riskyFunction, 'my-function-name');

// Safe async execution
const result = await errorHandler.safeExecute(
  async () => {
    // your async code
  },
  'fallback-value',
  'operation-name'
);
```

## Support

When reporting issues, please:
1. Export logs to JSON
2. Attach the log file to your issue report
3. Include the timestamp of when the issue occurred
4. Note which tab/source had the error

This helps dramatically reduce debugging time! 🚀
