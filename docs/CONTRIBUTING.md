#  Contributing to HighlightAssist

Thank you for your interest in contributing! We welcome contributions from developers of all skill levels.

##  Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)

---

##  Code of Conduct

Be respectful, inclusive, and professional. We're all here to make great developer tools!

---

##  How Can I Contribute?

###  Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/Skullcandyxxx/HighlightAssist/issues) to avoid duplicates.

When creating a bug report, include:
- **Clear title** and **description**
- **Steps to reproduce** the behavior
- **Expected** vs **actual** behavior
- **Screenshots** or **GIFs** if applicable
- **Environment details** (browser, OS, extension version)
- **Console errors** from DevTools

Use the [Bug Report template](../.github/ISSUE_TEMPLATE/bug_report.md).

###  Suggesting Features

Feature requests are welcome! Use the [Feature Request template](../.github/ISSUE_TEMPLATE/feature_request.md).

Include:
- **Clear description** of the feature
- **Problem it solves**
- **Use cases** and examples
- **UI/UX mockups** (if applicable)

###  Code Contributions

1. **Fork** the repository
2. **Create** a feature branch (\git checkout -b feature/amazing-feature\)
3. **Make** your changes
4. **Test** thoroughly
5. **Commit** with clear messages (\git commit -m 'Add amazing feature'\)
6. **Push** to your branch (\git push origin feature/amazing-feature\)
7. **Open** a Pull Request

---

##  Development Setup

### Prerequisites

- **Node.js** 16+ (for icon generation only, optional)
- **Git**
- **Chrome/Edge/Opera** browser for testing

### Local Setup

\\\ash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/HighlightAssist.git
cd HighlightAssist

# Install dependencies (optional, for icon generation)
npm install

# Load extension in browser
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the HighlightAssist folder
\\\

### Project Structure

\\\
HighlightAssist/
 manifest.json          # Extension configuration (Manifest V3)
 popup.html/js         # Extension popup UI
 background.js         # Service worker
 content.js            # Content script (runs on pages)
 injected.js           # Page context script
 overlay-gui.js        # On-page GUI (main feature)
 error-handler.js      # Error logging
 logger.js             # Logging utility
 icons/                # Extension icons
 docs/                 # Documentation
 .github/              # GitHub templates
 archive/              # Archived development notes
\\\

---

##  Pull Request Process

### Before Submitting

1. **Update documentation** if you've changed functionality
2. **Test on multiple browsers** (Chrome, Edge, Opera minimum)
3. **Ensure no console errors** or warnings
4. **Follow coding standards** (see below)
5. **Update CHANGELOG** if applicable

### PR Requirements

- **Descriptive title** (e.g., "Add component hierarchy display to Inspector tab")
- **Clear description** of what changed and why
- **Link to related issue** (if applicable)
- **Screenshots/GIFs** for UI changes
- **Test results** from multiple browsers

### Review Process

1. Maintainers will review your PR within **3-5 business days**
2. Address any **requested changes**
3. Once approved, your PR will be **merged**
4. Your contribution will be **credited** in the release notes!

---

##  Coding Standards

### JavaScript Style

- **Use vanilla JavaScript** (no frameworks in core extension)
- **Avoid \ar\**, use \const\/\let\
- **Use meaningful variable names** (e.g., \currentElement\ not \el\)
- **Add comments** for complex logic
- **Use JSDoc** for function documentation

### Example:

\\\javascript
/**
 * Locks the currently hovered element for inspection
 * @param {HTMLElement} element - The element to lock
 * @param {boolean} skipResumeHover - Whether to skip resuming hover mode
 */
function lockElement(element, skipResumeHover) {
  if (!element) return;
  
  state.currentElement = element;
  state.isInspecting = false;
  
  updateHighlightOverlay(element);
  updateUI();
  
  log('Element locked: ' + getSelector(element), 'info');
}
\\\

### HTML/CSS Style

- **Use semantic HTML**
- **Inline styles** are okay for dynamically generated UI (overlay-gui.js)
- **BEM naming** for CSS classes (if using separate stylesheets)
- **Mobile-first** approach (even though we're desktop-only for now)

### Commit Messages

Use clear, descriptive commit messages:

\\\ash
 Good:
git commit -m "Add React component detection to Inspector tab"
git commit -m "Fix bridge connection status indicator"
git commit -m "Improve AI Assistant offline link UX"

 Bad:
git commit -m "fix bug"
git commit -m "updates"
git commit -m "asdf"
\\\

Use prefixes:
- \\ or \eat:\ - New feature
- \\ or \ix:\ - Bug fix
- \\ or \docs:\ - Documentation
- \\ or \style:\ - Code formatting
- \\ or \efactor:\ - Code refactoring
- \\ or \perf:\ - Performance improvement
- \\ or \	est:\ - Tests

---

##  Testing Guidelines

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] **Extension loads** without errors in browser
- [ ] **Popup opens** and displays correctly
- [ ] **GUI panel** opens when clicking "Open GUI Panel"
- [ ] **Element inspection** works (click elements)
- [ ] **Component detection** works (React/Vue/Angular/Svelte)
- [ ] **Bridge tab** displays correctly
- [ ] **Settings** persist after reload
- [ ] **Keyboard shortcut** (Ctrl+Shift+H) works
- [ ] **Console logs** appear in Console tab
- [ ] **No CSP violations** in browser console

### Browser Testing

Test on at least **2 browsers**:
-  Chrome (primary)
-  Edge
-  Opera GX (recommended)
-  Brave (optional)
-  Firefox (if supporting)

### Localhost Testing

Test on different dev servers:
-  Vite (\localhost:5173\)
-  Create React App (\localhost:3000\)
-  Next.js (\localhost:3000\)
-  Custom port (e.g., \localhost:8080\)

---

##  Additional Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

---

##  Recognition

All contributors will be:
- **Credited** in release notes
- **Listed** in CONTRIBUTORS.md (coming soon)
- **Thanked** in commit messages

---

##  Questions?

- Open an [issue](https://github.com/Skullcandyxxx/HighlightAssist/issues)
- Email: glfalliance@gmail.com

---

**Thank you for contributing to HighlightAssist! **
