"""HighlightAssist System Tray Icon
Beautiful tray icon matching popup/overlay purple gradient theme
"""
import os
import sys
from pathlib import Path
from typing import Optional

try:
    import pystray
    from PIL import Image, ImageDraw, ImageFont
    HAS_TRAY = True
except ImportError:
    HAS_TRAY = False
    print("⚠️  pystray not installed. System tray icon disabled.")
    print("   Install with: pip install pystray pillow")


class HighlightAssistTray:
    """System tray icon with purple gradient theme matching popup/overlay"""
    
    def __init__(self, bridge_controller, notifier):
        self.bridge = bridge_controller
        self.notifier = notifier
        self.icon: Optional[pystray.Icon] = None
        self._running = False
        
    def create_icon_image(self, status: str = 'idle') -> Image.Image:
        """Create beautiful gradient icon matching popup theme
        
        Args:
            status: 'idle' (gray), 'active' (purple), 'error' (red)
        """
        # Create 64x64 icon (high-DPI support)
        size = 64
        image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        
        # Color schemes matching popup.html gradients
        colors = {
            'idle': {
                'start': (148, 163, 184),  # #94a3b8 (slate)
                'end': (100, 116, 139),     # #64748b (darker slate)
                'accent': (226, 232, 240)   # #e2e8f0 (light)
            },
            'active': {
                'start': (139, 92, 246),    # #8b5cf6 (purple from popup)
                'end': (124, 58, 237),      # #7c3aed (darker purple)
                'accent': (233, 213, 255)   # #e9d5ff (light purple)
            },
            'error': {
                'start': (239, 68, 68),     # #ef4444 (red)
                'end': (220, 38, 38),       # #dc2626 (darker red)
                'accent': (254, 202, 202)   # #fecaca (light red)
            }
        }
        
        color_scheme = colors.get(status, colors['idle'])
        
        # Draw circular gradient background
        for i in range(size):
            # Gradient from center to edge
            progress = i / size
            r = int(color_scheme['start'][0] + (color_scheme['end'][0] - color_scheme['start'][0]) * progress)
            g = int(color_scheme['start'][1] + (color_scheme['end'][1] - color_scheme['start'][1]) * progress)
            b = int(color_scheme['start'][2] + (color_scheme['end'][2] - color_scheme['start'][2]) * progress)
            
            # Draw circle with gradient
            draw.ellipse(
                [i//2, i//2, size - i//2, size - i//2],
                fill=(r, g, b, 255),
                outline=None
            )
        
        # Draw "H" letter in center (HighlightAssist logo)
        try:
            # Try to use system font
            font_size = 36
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            # Fallback to default font
            font = ImageFont.load_default()
        
        # Draw white "H" in center
        text = "H"
        # Get text bounding box
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Center the text
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - 2  # Slight adjustment
        
        # Draw text with shadow for depth
        draw.text((x+1, y+1), text, fill=(0, 0, 0, 80), font=font)  # Shadow
        draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)  # White text
        
        return image
    
    def create_menu(self) -> pystray.Menu:
        """Create context menu matching extension theme"""
        return pystray.Menu(
            pystray.MenuItem(
                '🎨 HighlightAssist',
                lambda: None,
                enabled=False  # Title item (disabled)
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                '▶️  Start Bridge',
                self._on_start,
                enabled=lambda item: not self.bridge.is_running
            ),
            pystray.MenuItem(
                '⏸️  Stop Bridge',
                self._on_stop,
                enabled=lambda item: self.bridge.is_running
            ),
            pystray.MenuItem(
                '🔄 Restart Bridge',
                self._on_restart,
                enabled=lambda item: self.bridge.is_running
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                '📊 Status',
                self._on_status,
                default=True  # Double-click action
            ),
            pystray.MenuItem(
                '📂 Open Logs',
                self._on_open_logs
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                '❌ Exit',
                self._on_exit
            )
        )
    
    def _on_start(self, icon, item):
        """Start bridge server"""
        result = self.bridge.start()
        if result['status'] == 'started':
            self.notifier.notify('HighlightAssist', f'✅ Bridge started on port {self.bridge.port}')
            icon.icon = self.create_icon_image('active')
        else:
            self.notifier.notify('HighlightAssist', f'❌ Failed to start: {result.get("error", "Unknown")}')
    
    def _on_stop(self, icon, item):
        """Stop bridge server"""
        result = self.bridge.stop()
        if result['status'] == 'stopped':
            self.notifier.notify('HighlightAssist', '⏸️  Bridge stopped')
            icon.icon = self.create_icon_image('idle')
        else:
            self.notifier.notify('HighlightAssist', f'❌ Failed to stop: {result.get("error", "Unknown")}')
    
    def _on_restart(self, icon, item):
        """Restart bridge server"""
        result = self.bridge.restart()
        if result['status'] == 'started':
            self.notifier.notify('HighlightAssist', '🔄 Bridge restarted')
            icon.icon = self.create_icon_image('active')
        else:
            self.notifier.notify('HighlightAssist', f'❌ Failed to restart: {result.get("error", "Unknown")}')
    
    def _on_status(self, icon, item):
        """Show current status"""
        status = "🟢 Running" if self.bridge.is_running else "⚫ Stopped"
        port_info = f"Port: {self.bridge.port}" if self.bridge.is_running else ""
        pid_info = f"PID: {self.bridge.pid}" if self.bridge.pid else ""
        
        message = f"{status}\n{port_info}\n{pid_info}".strip()
        self.notifier.notify('HighlightAssist Status', message)
    
    def _on_open_logs(self, icon, item):
        """Open log directory"""
        log_dir = Path.home() / '.highlightassist' / 'logs'
        if sys.platform.startswith('win'):
            log_dir = Path(os.environ.get('LOCALAPPDATA', '.')) / 'HighlightAssist' / 'logs'
        
        if log_dir.exists():
            if sys.platform.startswith('win'):
                os.startfile(log_dir)
            elif sys.platform == 'darwin':
                os.system(f'open "{log_dir}"')
            else:
                os.system(f'xdg-open "{log_dir}"')
    
    def _on_exit(self, icon, item):
        """Exit application"""
        self.notifier.notify('HighlightAssist', '👋 Shutting down...')
        if self.bridge.is_running:
            self.bridge.stop()
        icon.stop()
        self._running = False
    
    def run(self):
        """Start system tray icon (blocking)"""
        if not HAS_TRAY:
            print("❌ Cannot start tray icon - pystray not installed")
            return
        
        # Create initial icon (idle state)
        initial_icon = self.create_icon_image('idle')
        
        # Create tray icon
        self.icon = pystray.Icon(
            'HighlightAssist',
            initial_icon,
            'HighlightAssist - Visual UI Debugger',
            menu=self.create_menu()
        )
        
        self._running = True
        print("🎨 System tray icon started (purple gradient theme)")
        print("   Right-click icon for menu")
        print("   Double-click for status")
        
        # Run (blocks until icon.stop() called)
        self.icon.run()
    
    def stop(self):
        """Stop tray icon"""
        if self.icon:
            self.icon.stop()
            self._running = False


def main():
    """Standalone tray icon test"""
    from core.bridge_controller import BridgeController
    from core.notifier import NotificationManager
    
    bridge = BridgeController(port=5055)
    notifier = NotificationManager()
    
    tray = HighlightAssistTray(bridge, notifier)
    
    print("""
╔═══════════════════════════════════════════════════════════╗
║        HighlightAssist System Tray v1.0                   ║
╚═══════════════════════════════════════════════════════════╝

🎨 Theme: Purple gradient (matches popup/overlay)
📍 Tray icon active in system tray
🖱️  Right-click for menu
👆 Double-click for status

Menu Options:
  ▶️  Start Bridge - Launch WebSocket server
  ⏸️  Stop Bridge - Stop server
  🔄 Restart Bridge - Restart server
  📊 Status - Show current status
  📂 Open Logs - Open log directory
  ❌ Exit - Close application
    """)
    
    try:
        tray.run()
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        tray.stop()


if __name__ == '__main__':
    main()
