"""Cross-platform notification system."""
from __future__ import annotations

import logging
import subprocess
import sys
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class Notifier(ABC):
    """Abstract notification interface."""
    
    @abstractmethod
    def notify(self, title: str, message: str) -> bool:
        """Send notification. Returns True if successful."""
        pass


class WindowsNotifier(Notifier):
    """Windows notification using win10toast."""
    
    def __init__(self):
        self._toaster = None
        try:
            from win10toast import ToastNotifier
            self._toaster = ToastNotifier()
        except ImportError:
            logger.debug('win10toast not available')
    
    def notify(self, title: str, message: str) -> bool:
        if not self._toaster:
            return False
        try:
            # Use threaded=True and suppress errors to avoid WPARAM issues
            self._toaster.show_toast(
                title, 
                message, 
                threaded=True, 
                duration=4,
                icon_path=None  # Don't use custom icon to avoid issues
            )
            return True
        except Exception as e:
            logger.debug(f'Windows notification failed: {e}')
            return False


class MacOSNotifier(Notifier):
    """macOS notification using pync."""
    
    def __init__(self):
        self._available = False
        try:
            import pync  # type: ignore # Optional: macOS only
            self._pync = pync
            self._available = True
        except ImportError:
            logger.debug('pync not available')
    
    def notify(self, title: str, message: str) -> bool:
        if not self._available:
            return False
        try:
            self._pync.notify(message, title=title)
            return True
        except Exception:
            logger.exception('macOS notification failed')
            return False


class LinuxNotifier(Notifier):
    """Linux notification using notify-send."""
    
    def notify(self, title: str, message: str) -> bool:
        try:
            subprocess.Popen(['notify-send', title, message], 
                           stdout=subprocess.DEVNULL, 
                           stderr=subprocess.DEVNULL)
            return True
        except FileNotFoundError:
            logger.debug('notify-send not found')
            return False
        except Exception:
            logger.exception('Linux notification failed')
            return False


class LoggerNotifier(Notifier):
    """Fallback notifier that logs to logger."""
    
    def notify(self, title: str, message: str) -> bool:
        logger.info('[NOTIFY] %s: %s', title, message)
        return True


class NotificationManager:
    """Manages platform-specific notifications with fallback chain."""
    
    def __init__(self):
        self._notifiers: list[Notifier] = []
        self._setup_notifiers()
    
    def _setup_notifiers(self):
        """Setup notifier chain based on platform."""
        if sys.platform.startswith('win'):
            self._notifiers.append(WindowsNotifier())
        elif sys.platform.startswith('darwin'):
            self._notifiers.append(MacOSNotifier())
        elif sys.platform.startswith('linux'):
            self._notifiers.append(LinuxNotifier())
        
        # Always add logger fallback
        self._notifiers.append(LoggerNotifier())
    
    def notify(self, title: str, message: str):
        """Send notification using first available notifier."""
        for notifier in self._notifiers:
            if notifier.notify(title, message):
                return
        logger.warning('All notifiers failed for: %s - %s', title, message)
