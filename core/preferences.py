"""Preferences Manager - Persistent user settings across dashboard/tray/extension

Stores user preferences in JSON file with automatic save/load.
Provides centralized access to settings like auto-start, ports, UI preferences, etc.
"""
import json
import logging
from pathlib import Path
from typing import Any, Dict
import os
import sys

logger = logging.getLogger(__name__)


class PreferencesManager:
    """Manages persistent user preferences."""
    
    DEFAULT_PREFERENCES = {
        # Bridge settings
        "auto_start_bridge": True,
        "bridge_port": 5055,
        
        # Dashboard settings
        "dashboard_port": 9999,
        "refresh_interval": 5,  # seconds
        
        # Project scanning
        "scan_interval": 60,  # seconds
        "auto_scan_on_startup": True,
        "watched_directories": [],
        
        # Server management
        "default_ports": {
            "react": 3000,
            "vite": 5173,
            "next": 3000,
            "angular": 4200,
            "vue": 8080
        },
        "auto_restart_on_crash": True,
        
        # Notifications
        "enable_notifications": True,
        "notify_on_bridge_start": True,
        "notify_on_bridge_stop": False,
        "notify_on_server_start": True,
        
        # UI preferences
        "theme": "purple-gradient",  # purple-gradient, blue, dark, light
        "animations_enabled": True,
        "compact_mode": False,
        
        # Logging
        "log_level": "INFO",  # DEBUG, INFO, WARNING, ERROR
        "max_log_size_mb": 10,
        "log_retention_days": 7
    }
    
    def __init__(self):
        # Determine preferences file location
        if sys.platform.startswith('win'):
            self.prefs_dir = Path(os.environ.get('LOCALAPPDATA', '.')) / 'HighlightAssist'
        else:
            self.prefs_dir = Path.home() / '.highlightassist'
        
        self.prefs_dir.mkdir(parents=True, exist_ok=True)
        self.prefs_file = self.prefs_dir / 'preferences.json'
        
        # Load preferences
        self.prefs = self._load()
        logger.info(f'Preferences loaded from {self.prefs_file}')
    
    def _load(self) -> Dict[str, Any]:
        """Load preferences from file, or create with defaults."""
        if self.prefs_file.exists():
            try:
                with open(self.prefs_file, 'r', encoding='utf-8') as f:
                    loaded = json.load(f)
                
                # Merge with defaults (adds any new keys from updates)
                merged = self.DEFAULT_PREFERENCES.copy()
                merged.update(loaded)
                
                # Save back to add any new default keys
                if len(merged) > len(loaded):
                    self._save(merged)
                
                return merged
            except Exception as e:
                logger.error(f'Failed to load preferences: {e}')
                logger.info('Using default preferences')
                return self.DEFAULT_PREFERENCES.copy()
        else:
            # First run - create with defaults
            prefs = self.DEFAULT_PREFERENCES.copy()
            self._save(prefs)
            logger.info('Created default preferences file')
            return prefs
    
    def _save(self, prefs: Dict[str, Any] = None):
        """Save preferences to file."""
        try:
            data = prefs if prefs is not None else self.prefs
            with open(self.prefs_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.debug('Preferences saved')
        except Exception as e:
            logger.error(f'Failed to save preferences: {e}')
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a preference value."""
        return self.prefs.get(key, default)
    
    def set(self, key: str, value: Any):
        """Set a preference value and save."""
        self.prefs[key] = value
        self._save()
        logger.debug(f'Preference updated: {key} = {value}')
    
    def get_all(self) -> Dict[str, Any]:
        """Get all preferences."""
        return self.prefs.copy()
    
    def update_multiple(self, updates: Dict[str, Any]):
        """Update multiple preferences at once."""
        self.prefs.update(updates)
        self._save()
        logger.info(f'Updated {len(updates)} preferences')
    
    def reset(self):
        """Reset all preferences to defaults."""
        self.prefs = self.DEFAULT_PREFERENCES.copy()
        self._save()
        logger.info('Preferences reset to defaults')
    
    def reset_key(self, key: str):
        """Reset a single key to its default value."""
        if key in self.DEFAULT_PREFERENCES:
            self.prefs[key] = self.DEFAULT_PREFERENCES[key]
            self._save()
            logger.info(f'Reset preference: {key}')
    
    # Convenience methods for common settings
    @property
    def auto_start_bridge(self) -> bool:
        return self.get('auto_start_bridge', True)
    
    @auto_start_bridge.setter
    def auto_start_bridge(self, value: bool):
        self.set('auto_start_bridge', value)
    
    @property
    def enable_notifications(self) -> bool:
        return self.get('enable_notifications', True)
    
    @enable_notifications.setter
    def enable_notifications(self, value: bool):
        self.set('enable_notifications', value)
