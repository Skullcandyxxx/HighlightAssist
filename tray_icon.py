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
    
    def __init__(self, bridge_controller, notifier, service_manager=None):
        self.bridge = bridge_controller
        self.notifier = notifier
        self.service_manager = service_manager
        self.icon: Optional[pystray.Icon] = None
        self._running = False
        
        # Track running dev servers {port: {'process': Popen, 'name': str, 'status': 'starting'|'running'}}
        self.running_servers = {}
        
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
        # Build unified servers menu
        servers_items = self._build_servers_menu()
        
        return pystray.Menu(
            # === HEADER ===
            pystray.MenuItem(
                'HighlightAssist',
                lambda: None,
                enabled=False  # Title item (disabled)
            ),
            pystray.Menu.SEPARATOR,
            
            # === BRIDGE CONTROL ===
            pystray.MenuItem(
                'Start Bridge',
                self._on_start,
                enabled=lambda item: not self.bridge.is_running
            ),
            pystray.MenuItem(
                'Stop Bridge',
                self._on_stop,
                enabled=lambda item: self.bridge.is_running
            ),
            pystray.MenuItem(
                'Restart Bridge',
                self._on_restart,
                enabled=lambda item: self.bridge.is_running
            ),
            pystray.MenuItem(
                'Auto-start Bridge',
                self._on_toggle_autostart,
                checked=lambda item: self.service_manager.auto_start_bridge if self.service_manager else True,
                enabled=lambda item: self.service_manager is not None
            ),
            pystray.Menu.SEPARATOR,
            
            # === SERVERS (COMBINED START/STOP) ===
            pystray.MenuItem(
                'Servers',
                pystray.Menu(*servers_items)
            ),
            pystray.Menu.SEPARATOR,
            
            # === UTILITIES ===
            pystray.MenuItem(
                '🌐 Open Dashboard',
                self._on_open_dashboard,
                default=True  # Double-click action
            ),
            pystray.MenuItem(
                'Status',
                self._on_status
            ),
            pystray.MenuItem(
                'Open Logs',
                self._on_open_logs
            ),
            pystray.Menu.SEPARATOR,
            
            # === EXIT ===
            pystray.MenuItem(
                'Exit',
                self._on_exit
            )
        )
    
    def _build_servers_menu(self) -> list:
        """Build unified servers menu with start/stop for all projects and running servers"""
        try:
            import socket
            
            items = []
            
            # === SECTION 1: RUNNING SERVERS (with stop option) ===
            # Expanded port list for better detection
            common_ports = [
                3000, 3001, 3002, 3003,  # React, Next.js, Express
                4200, 4201,               # Angular
                5000, 5001, 5002,         # Flask, Python
                5173, 5174, 5175,         # Vite
                8000, 8001, 8080, 8081,   # Django, HTTP servers
                9000, 9001                # Generic dev servers
            ]
            detected_servers = {}
            
            # Check managed servers (started by HighlightAssist)
            for port, info in list(self.running_servers.items()):
                process = info.get('process')
                if process and process.poll() is not None:
                    # Process died, remove it
                    del self.running_servers[port]
                    continue
                
                detected_servers[port] = {
                    'name': info['name'],
                    'status': info['status'],
                    'managed': True
                }
            
            # Scan for external servers with longer timeout (try both IPv4 and IPv6)
            def is_port_open(p):
                # Try IPv4 first
                try:
                    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                        s.settimeout(0.5)  # Increased from 0.2s
                        result = s.connect_ex(('127.0.0.1', p))
                        if result == 0:
                            return True
                except:
                    pass
                
                # Try IPv6 if IPv4 failed
                try:
                    with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as s:
                        s.settimeout(0.5)
                        result = s.connect_ex(('::1', p))
                        return result == 0
                except:
                    return False
            
            for port in common_ports:
                if port not in detected_servers and is_port_open(port):
                    # Found external server - try to match to project
                    server_name = f"Server on :{port}"
                    if self.service_manager and hasattr(self.service_manager, 'project_manager'):
                        for project in self.service_manager.project_manager.projects:
                            if project.get('dev_port') == port:
                                server_name = project.get('name', server_name)
                                break
                    
                    detected_servers[port] = {
                        'name': server_name,
                        'status': 'running',
                        'managed': False
                    }
            
            # Add running servers section
            if detected_servers:
                items.append(pystray.MenuItem('═══ RUNNING SERVERS ═══', lambda i, it: None, enabled=False))
                
                for port in sorted(detected_servers.keys()):
                    info = detected_servers[port]
                    name = info['name']
                    managed = info['managed']
                    
                    # Update status for managed servers - use Unicode symbols
                    if managed and is_port_open(port):
                        self.running_servers[port]['status'] = 'running'
                        status_icon = '🟢'  # Green circle
                    elif managed:
                        self.running_servers[port]['status'] = 'starting'
                        status_icon = '🟡'  # Yellow circle
                    else:
                        status_icon = '🟢'  # Green circle for external servers
                    
                    if managed:
                        label = f"  {status_icon} {name} :{port} (Stop)"
                        def make_stop_handler(p, n):
                            return lambda i, it: self._on_stop_server(p, n)
                        items.append(pystray.MenuItem(label, make_stop_handler(port, name)))
                    else:
                        label = f"  {status_icon} {name} :{port} (Open)"
                        def make_open_handler(p):
                            return lambda i, it: self._on_open_browser(p)
                        items.append(pystray.MenuItem(label, make_open_handler(port)))
                
                items.append(pystray.Menu.SEPARATOR)
            
            # === SECTION 2: START NEW SERVERS ===
            if self.service_manager and hasattr(self.service_manager, 'project_manager'):
                projects = self.service_manager.project_manager.projects[:10]
                
                # Filter out projects that are already running
                stopped_projects = [p for p in projects if p.get('dev_port') and p.get('dev_port') not in detected_servers]
                
                if stopped_projects:
                    items.append(pystray.MenuItem('═══ START SERVER ═══', lambda i, it: None, enabled=False))
                    
                    for project in stopped_projects:
                        name = project.get('name', 'Unknown')[:30]
                        port = project.get('dev_port')
                        label = f"  {name} :{port} (Start)"
                        
                        def make_start_handler(proj):
                            return lambda i, it: self._on_open_project(proj)
                        
                        items.append(pystray.MenuItem(label, make_start_handler(project)))
                    
                    items.append(pystray.Menu.SEPARATOR)
            
            # === SECTION 3: ACTIONS & INFO ===
            import datetime
            current_time = datetime.datetime.now().strftime("%H:%M:%S")
            
            items.append(pystray.Menu.SEPARATOR)
            items.append(pystray.MenuItem('═══ ACTIONS ═══', lambda i, it: None, enabled=False))
            items.append(pystray.MenuItem('  🔍 Scan for Projects...', self._on_scan_projects_quick))
            items.append(pystray.MenuItem('  🌐 Scan All Ports (3000-9000)', self._on_scan_all_ports))
            items.append(pystray.MenuItem(f'  🕒 Updated: {current_time}', lambda i, it: None, enabled=False))
            items.append(pystray.MenuItem('  ⟳ Menu auto-refreshes', lambda i, it: None, enabled=False))
            
            return items if items else [pystray.MenuItem('No projects found', lambda i, it: None, enabled=False)]
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Error building servers menu: {e}')
            return [pystray.MenuItem('Error loading servers', lambda i, it: None, enabled=False)]
    
    def _on_scan_projects_quick(self, icon, item):
        """Quick scan with notification - menu will auto-refresh on next open"""
        try:
            self.notifier.notify('HighlightAssist', 'Scanning for projects...')
            
            def scan():
                try:
                    pm = self.service_manager.project_manager
                    projects = pm.scan_common_directories()
                    count = 0
                    for p in projects:
                        if pm.add_recent_project(p):
                            count += 1
                    self.notifier.notify('HighlightAssist', f'Found {len(projects)} projects ({count} new)')
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f'Scan error: {e}')
            
            import threading
            threading.Thread(target=scan, daemon=True).start()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Scan trigger error: {e}')
    
    def _on_scan_all_ports(self, icon, item):
        """Comprehensive port scan 3000-9000 to find ALL running servers"""
        try:
            self.notifier.notify('HighlightAssist', 'Scanning all ports 3000-9000...')
            
            def comprehensive_scan():
                try:
                    import socket
                    import logging
                    logger = logging.getLogger(__name__)
                    
                    found_servers = []
                    
                    # Scan comprehensive range
                    for port in range(3000, 9001):
                        try:
                            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                                s.settimeout(0.3)  # Faster timeout for bulk scan
                                result = s.connect_ex(('localhost', port))
                                if result == 0:
                                    found_servers.append(port)
                                    logger.info(f'Found server on port {port}')
                        except Exception as e:
                            pass  # Ignore individual port errors
                    
                    if found_servers:
                        ports_str = ', '.join([f':{p}' for p in found_servers])
                        self.notifier.notify(
                            'HighlightAssist', 
                            f'Found {len(found_servers)} servers: {ports_str[:100]}'
                        )
                        logger.info(f'Comprehensive scan found servers on ports: {found_servers}')
                    else:
                        self.notifier.notify('HighlightAssist', 'No servers found in range 3000-9000')
                    
                    # Update menu to show results
                    if self.icon:
                        self.icon.update_menu()
                        
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f'Comprehensive scan error: {e}')
                    self.notifier.notify('HighlightAssist', f'Scan error: {str(e)[:50]}')
            
            import threading
            threading.Thread(target=comprehensive_scan, daemon=True).start()
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Scan trigger error: {e}')
    
    def _on_open_browser(self, port: int):
        """Open external server in browser"""
        try:
            import webbrowser
            url = f'http://localhost:{port}'
            webbrowser.open(url)
            self.notifier.notify('HighlightAssist', f'Opening localhost:{port}')
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Error opening browser: {e}')
    
    def _build_projects_items(self) -> list:
        """Build projects submenu items (returns list, not Menu)"""
        try:
            if not self.service_manager or not hasattr(self.service_manager, 'project_manager'):
                return [pystray.MenuItem('No projects available', lambda icon, item: None, enabled=False)]
            
            # Get recent projects
            projects = self.service_manager.project_manager.projects[:5]
            
            items = [
                pystray.MenuItem('Scan for Projects', self._on_scan_projects),
                pystray.Menu.SEPARATOR
            ]
            
            if projects:
                for project in projects:
                    name = project.get('name', 'Unknown')[:30]  # Truncate long names
                    port = project.get('dev_port')
                    
                    label = name
                    if port:
                        label += f" (port {port})"
                    
                    # Create closure with function factory to preserve project
                    def make_handler(proj):
                        return lambda icon, item: self._on_open_project(proj)
                    
                    items.append(pystray.MenuItem(label, make_handler(project)))
            else:
                items.append(pystray.MenuItem('No recent projects', lambda i, it: None, enabled=False))
            
            return items
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Error building projects menu: {e}')
            return [pystray.MenuItem('Error loading projects', lambda i, it: None, enabled=False)]
    
    def _build_running_servers_items(self) -> list:
        """Build running servers submenu with status indicators"""
        try:
            import socket
            
            # Always return at least one item
            if not self.running_servers:
                return [pystray.MenuItem('No servers running', lambda i, it: None, enabled=False)]
            
            items = []
            
            # Check each server status
            for port, info in list(self.running_servers.items()):
                name = info['name']
                status = info['status']
                process = info.get('process')
                
                # Update status based on port check
                def is_port_open(p):
                    try:
                        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                            s.settimeout(0.5)
                            return s.connect_ex(('localhost', p)) == 0
                    except:
                        return False
                
                # Check if process is still alive and port is responding
                if process and process.poll() is not None:
                    # Process died
                    del self.running_servers[port]
                    continue
                elif is_port_open(port):
                    status = 'running'
                    info['status'] = 'running'
                else:
                    status = 'starting'
                    info['status'] = 'starting'
                
                # Status indicator
                if status == 'running':
                    indicator = '[GREEN] '
                elif status == 'starting':
                    indicator = '[YELLOW] '
                else:
                    indicator = '[RED] '
                
                label = f"{indicator}{name} (:{port})"
                
                # Create handler to stop server
                def make_stop_handler(p, n):
                    return lambda i, it: self._on_stop_server(p, n)
                
                items.append(pystray.MenuItem(
                    label, 
                    make_stop_handler(port, name),
                    enabled=True  # Always enabled so you can stop it
                ))
            
            # If all servers were removed (died), show "No servers"
            if not items:
                return [pystray.MenuItem('No servers running', lambda i, it: None, enabled=False)]
            
            return items
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Error building servers menu: {e}')
            return [pystray.MenuItem('Error loading servers', lambda i, it: None, enabled=False)]
    
    def _on_stop_server(self, port: int, name: str):
        """Stop a running dev server"""
        try:
            import logging
            logger = logging.getLogger(__name__)
            
            if port not in self.running_servers:
                self.notifier.notify('HighlightAssist', f'{name} not found')
                return
            
            process = self.running_servers[port].get('process')
            if process:
                logger.info(f'Stopping {name} on port {port} (PID: {process.pid})')
                self.notifier.notify('HighlightAssist', f'Stopping {name}...')
                
                # Terminate process
                process.terminate()
                
                # Wait up to 5 seconds for graceful shutdown
                try:
                    process.wait(timeout=5)
                except:
                    # Force kill if still running
                    process.kill()
                    logger.warning(f'Forcefully killed {name}')
                
                # Remove from tracking
                del self.running_servers[port]
                
                self.notifier.notify('HighlightAssist', f'{name} stopped')
                logger.info(f'{name} stopped successfully')
                
                # Update menu
                if self.icon:
                    self.icon.update_menu()
            else:
                logger.warning(f'No process found for {name}')
                del self.running_servers[port]
                
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Error stopping server: {e}')
            self.notifier.notify('HighlightAssist', f'Error stopping {name}')
    
    def _on_scan_projects(self, icon, item):
        """Scan common directories for projects"""
        try:
            self.notifier.notify('HighlightAssist', 'Scanning for projects...')
            
            def scan():
                try:
                    pm = self.service_manager.project_manager
                    projects = pm.scan_common_directories()
                    for p in projects:
                        pm.add_recent_project(p)
                    self.notifier.notify('HighlightAssist', f'Found {len(projects)} projects')
                    if self.icon:
                        self.icon.update_menu()
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f'Scan error: {e}')
            
            import threading
            threading.Thread(target=scan, daemon=True).start()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Scan trigger error: {e}')
    
    def _on_open_project(self, project: dict):
        """Start dev server and open project in browser"""
        try:
            import socket
            import subprocess
            import webbrowser
            import threading
            import json
            import logging
            from pathlib import Path
            
            logger = logging.getLogger(__name__)
            port = project.get('dev_port')
            name = project.get('name', 'project')
            path = project.get('path')
            
            if not port or not path:
                self.notifier.notify('HighlightAssist', f'Cannot start {name} - missing port or path')
                return
            
            # Check if server is already running (try both IPv4 and IPv6)
            def is_port_open(port):
                # Try IPv4
                try:
                    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                        s.settimeout(0.5)
                        if s.connect_ex(('127.0.0.1', port)) == 0:
                            return True
                except:
                    pass
                
                # Try IPv6
                try:
                    with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as s:
                        s.settimeout(0.5)
                        return s.connect_ex(('::1', port)) == 0
                except:
                    return False
            
            if is_port_open(port):
                # Server already running, just open browser
                url = f'http://localhost:{port}'
                webbrowser.open(url)
                self.notifier.notify('HighlightAssist', f'{name} already running on port {port}')
                self.service_manager.project_manager.add_recent_project(project)
                return
            
            # Start server in background
            def start_server():
                try:
                    project_path = Path(path)
                    
                    # Read package.json to find dev script
                    package_json = project_path / 'package.json'
                    if not package_json.exists():
                        logger.error(f'No package.json found in {path}')
                        self.notifier.notify('HighlightAssist', f'Error: No package.json in {name}')
                        return
                    
                    with open(package_json, 'r', encoding='utf-8') as f:
                        pkg = json.load(f)
                    
                    scripts = pkg.get('scripts', {})
                    
                    # Find the right script (prefer 'dev', fallback to 'start')
                    dev_script = None
                    if 'dev' in scripts:
                        dev_script = 'dev'
                    elif 'start' in scripts:
                        dev_script = 'start'
                    else:
                        logger.error(f'No dev/start script in {name}')
                        self.notifier.notify('HighlightAssist', f'Error: No dev script in {name}')
                        return
                    
                    # Check for package manager (prefer npm, then yarn, then pnpm)
                    package_manager = 'npm'
                    if (project_path / 'yarn.lock').exists():
                        package_manager = 'yarn'
                    elif (project_path / 'pnpm-lock.yaml').exists():
                        package_manager = 'pnpm'
                    
                    # Build command
                    if package_manager == 'yarn':
                        cmd = ['yarn', dev_script]
                    else:
                        cmd = [package_manager, 'run', dev_script]
                    
                    logger.info(f'Starting {name} with: {" ".join(cmd)} in {path}')
                    self.notifier.notify('HighlightAssist', f'Starting {name}...')
                    
                    # Start process (detached, won't block)
                    if sys.platform.startswith('win'):
                        # Windows: CREATE_NEW_CONSOLE to run in separate window
                        proc = subprocess.Popen(
                            cmd,
                            cwd=path,
                            creationflags=subprocess.CREATE_NEW_CONSOLE,
                            shell=True
                        )
                    else:
                        # Unix: detach from parent
                        proc = subprocess.Popen(
                            cmd,
                            cwd=path,
                            start_new_session=True
                        )
                    
                    # Track the server
                    self.running_servers[port] = {
                        'process': proc,
                        'name': name,
                        'status': 'starting',
                        'path': path
                    }
                    
                    # Update menu to show starting status
                    if self.icon:
                        self.icon.update_menu()
                    
                    # Wait for server to start (poll port)
                    import time
                    max_wait = 30  # 30 seconds max
                    for i in range(max_wait):
                        time.sleep(1)
                        if is_port_open(port):
                            # Server is up!
                            if port in self.running_servers:
                                self.running_servers[port]['status'] = 'running'
                            
                            url = f'http://localhost:{port}'
                            webbrowser.open(url)
                            self.notifier.notify('HighlightAssist', f'{name} started on port {port}!')
                            self.service_manager.project_manager.add_recent_project(project)
                            
                            # Update menu to show running status
                            if self.icon:
                                self.icon.update_menu()
                            return
                    
                    # Timeout - but keep tracking in case it starts later
                    logger.warning(f'Server did not start within {max_wait}s')
                    self.notifier.notify('HighlightAssist', f'{name} is starting... (check console)')
                    
                except Exception as e:
                    logger.exception(f'Error starting server: {e}')
                    self.notifier.notify('HighlightAssist', f'Error starting {name}: {str(e)[:50]}')
                    # Remove from tracking on error
                    if port in self.running_servers:
                        del self.running_servers[port]
            
            # Start in background thread
            threading.Thread(target=start_server, daemon=True).start()
            
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Open project error: {e}')
    
    def _on_start(self, icon, item):
        """Start bridge server"""
        result = self.bridge.start()
        if result['status'] == 'started':
            self.notifier.notify('HighlightAssist', f'Bridge started on port {self.bridge.port}')
            # Update icon to purple (active state)
            if self.icon:
                self.icon.icon = self.create_icon_image('active')
        elif result['status'] == 'already_running':
            self.notifier.notify('HighlightAssist', f'Bridge already running on port {self.bridge.port}')
            # Make sure icon is purple if bridge is running
            if self.icon:
                self.icon.icon = self.create_icon_image('active')
        else:
            self.notifier.notify('HighlightAssist', f'Failed to start: {result.get("error", "Unknown")}')
            # Keep icon gray on error
            if self.icon:
                self.icon.icon = self.create_icon_image('error')
    
    def _on_stop(self, icon, item):
        """Stop bridge server"""
        result = self.bridge.stop()
        if result['status'] == 'stopped':
            self.notifier.notify('HighlightAssist', 'Bridge stopped')
            # Update icon to gray (idle state)
            if self.icon:
                self.icon.icon = self.create_icon_image('idle')
        elif result['status'] == 'not_running':
            self.notifier.notify('HighlightAssist', 'Bridge is not running')
            # Make sure icon is gray
            if self.icon:
                self.icon.icon = self.create_icon_image('idle')
        else:
            self.notifier.notify('HighlightAssist', f'Failed to stop: {result.get("error", "Unknown")}')
    
    def _on_restart(self, icon, item):
        """Restart bridge server"""
        result = self.bridge.restart()
        if result['status'] == 'started':
            self.notifier.notify('HighlightAssist', 'Bridge restarted')
            # Update icon to purple (active state)
            if self.icon:
                self.icon.icon = self.create_icon_image('active')
        else:
            self.notifier.notify('HighlightAssist', f'Failed to restart: {result.get("error", "Unknown")}')
            # Update to error state
            if self.icon:
                self.icon.icon = self.create_icon_image('error')
    
    def _on_toggle_autostart(self, icon, item):
        """Toggle auto-start bridge setting"""
        if not self.service_manager:
            return
        
        # Toggle the setting
        self.service_manager.auto_start_bridge = not self.service_manager.auto_start_bridge
        
        # Notify user
        status = "enabled" if self.service_manager.auto_start_bridge else "disabled"
        self.notifier.notify('HighlightAssist', f'Auto-start bridge {status}')
        
        # Update menu (pystray will refresh the checked state)
        if self.icon:
            self.icon.update_menu()
            
    def _on_status(self, icon, item):
        """Show status notification"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            is_running = self.bridge.is_running
            
            if is_running:
                port_info = f"Port: {self.bridge.port}"
                if self.bridge._thread and self.bridge._thread.is_alive():
                    mode_info = "Mode: In-process"
                elif self.bridge.pid:
                    mode_info = f"PID: {self.bridge.pid}"
                else:
                    mode_info = "Mode: Active"
                
                uptime = self.bridge.get_uptime()
                uptime_info = f"Uptime: {int(uptime)}s" if uptime > 0 else ""
                
                message = f"Bridge Running\n{port_info}\n{mode_info}\n{uptime_info}".strip()
            else:
                message = "Bridge Stopped"
            
            logger.info(f'Status: {message}')
            self.notifier.notify('HighlightAssist Status', message)
                    
        except Exception as e:
            logger.exception(f'Error in _on_status: {e}')
    
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
    
    def _on_open_dashboard(self, icon, item):
        """Open web dashboard in default browser"""
        import webbrowser
        dashboard_url = 'http://127.0.0.1:9999'
        webbrowser.open(dashboard_url)
        self.notifier.notify('HighlightAssist', 'Opening dashboard...')
    
    def _on_exit(self, icon, item):
        """Exit application"""
        self.notifier.notify('HighlightAssist', 'Shutting down...')
        if self.bridge.is_running:
            self.bridge.stop()
        icon.stop()
        self._running = False
    
    def run(self):
        """Start system tray icon (blocking)"""
        if not HAS_TRAY:
            print("❌ Cannot start tray icon - pystray not installed")
            return
        
        # Determine initial icon state based on bridge status
        initial_state = 'active' if self.bridge.is_running else 'idle'
        initial_icon = self.create_icon_image(initial_state)
        
        # Create tray icon
        self.icon = pystray.Icon(
            'HighlightAssist',
            initial_icon,
            'HighlightAssist - Visual UI Debugger',
            menu=self.create_menu()
        )
        
        self._running = True
        status = "Bridge running" if self.bridge.is_running else "Bridge stopped"
        print(f"System tray icon started - {status}")
        print("   Right-click icon for menu")
        print("   Double-click for status")
        
        # Run (blocks until icon.stop() called)
        self.icon.run()
    
    def stop(self):
        """Stop tray icon"""
        if self.icon:
            self.icon.stop()
            self._running = False
