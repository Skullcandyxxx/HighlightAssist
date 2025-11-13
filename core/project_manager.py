"""
Project Manager for HighlightAssist
Scans for and manages development projects
"""
import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class ProjectManager:
    """Manages project detection and suggestions"""
    
    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize project manager
        
        Args:
            config_dir: Directory to store project config (default: AppData/Local/HighlightAssist)
        """
        if config_dir is None:
            config_dir = Path(os.getenv('LOCALAPPDATA', os.path.expanduser('~/.local/share'))) / 'HighlightAssist'
        
        self.config_dir = Path(config_dir)
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.projects_file = self.config_dir / 'projects.json'
        
        # Load saved projects
        self.projects = self._load_projects()
        
        # Auto-scan on first run if no projects found
        if not self.projects:
            logger.info('No saved projects found, performing initial scan...')
            try:
                detected = self.scan_common_directories()
                for project in detected:
                    self.add_recent_project(project)
                logger.info(f'Initial scan complete: {len(detected)} projects found')
            except Exception as e:
                logger.error(f'Initial scan failed: {e}')
        
        logger.info(f'Project manager initialized with {len(self.projects)} saved projects')
    
    def _load_projects(self) -> List[Dict]:
        """Load projects from config file"""
        try:
            if self.projects_file.exists():
                with open(self.projects_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get('projects', [])
        except Exception as e:
            logger.error(f'Error loading projects: {e}')
        
        return []
    
    def _save_projects(self):
        """Save projects to config file"""
        try:
            data = {
                'projects': self.projects,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.projects_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f'Error saving projects: {e}')
    
    def scan_directory(self, directory: Path, max_depth: int = 3) -> List[Dict]:
        """Scan directory for projects with package.json
        
        Args:
            directory: Root directory to scan
            max_depth: Maximum depth to search
            
        Returns:
            List of detected projects
        """
        projects = []
        
        try:
            directory = Path(directory)
            if not directory.exists() or not directory.is_dir():
                return projects
            
            # Recursive scan with depth limit
            def scan_recursive(path: Path, depth: int = 0):
                if depth > max_depth:
                    return
                
                try:
                    # Check for package.json
                    package_json = path / 'package.json'
                    if package_json.exists():
                        project = self._analyze_project(path, package_json)
                        if project:
                            projects.append(project)
                        return  # Don't scan subdirectories of detected projects
                    
                    # Scan subdirectories
                    for item in path.iterdir():
                        if item.is_dir() and not item.name.startswith('.') and item.name not in ['node_modules', 'dist', 'build', '__pycache__']:
                            scan_recursive(item, depth + 1)
                            
                except PermissionError:
                    pass  # Skip directories we can't access
                except Exception as e:
                    logger.debug(f'Error scanning {path}: {e}')
            
            scan_recursive(directory)
            
        except Exception as e:
            logger.error(f'Error scanning directory {directory}: {e}')
        
        return projects
    
    def _analyze_project(self, path: Path, package_json: Path) -> Optional[Dict]:
        """Analyze project and extract metadata
        
        Args:
            path: Project directory
            package_json: Path to package.json
            
        Returns:
            Project metadata dict or None
        """
        try:
            with open(package_json, 'r', encoding='utf-8') as f:
                pkg = json.load(f)
            
            # Detect framework
            framework = 'Unknown'
            dev_server_port = None
            
            deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
            
            if 'vite' in deps:
                framework = 'Vite'
                dev_server_port = 5173
            elif 'react-scripts' in deps or '@vitejs/plugin-react' in deps:
                framework = 'React'
                dev_server_port = 3000
            elif 'next' in deps:
                framework = 'Next.js'
                dev_server_port = 3000
            elif 'vue' in deps:
                framework = 'Vue'
                dev_server_port = 8080
            elif '@angular/core' in deps:
                framework = 'Angular'
                dev_server_port = 4200
            elif 'svelte' in deps:
                framework = 'Svelte'
                dev_server_port = 5173
            
            # Check for dev script
            scripts = pkg.get('scripts', {})
            has_dev_script = 'dev' in scripts or 'start' in scripts or 'serve' in scripts
            
            return {
                'name': pkg.get('name', path.name),
                'path': str(path.absolute()),
                'framework': framework,
                'version': pkg.get('version', '0.0.0'),
                'description': pkg.get('description', ''),
                'dev_port': dev_server_port,
                'has_dev_script': has_dev_script,
                'scripts': list(scripts.keys()),
                'last_detected': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.debug(f'Error analyzing project at {path}: {e}')
            return None
    
    def scan_common_directories(self) -> List[Dict]:
        """Scan common development directories for projects
        
        Returns:
            List of detected projects
        """
        all_projects = []
        
        # Common dev directories
        common_dirs = [
            Path('D:/Projects'),
            Path(os.path.expanduser('~/Documents/Projects')),
            Path(os.path.expanduser('~/Projects')),
            Path(os.path.expanduser('~/Dev')),
            Path(os.path.expanduser('~/Development')),
            Path('C:/Projects'),
            Path('C:/Dev'),
        ]
        
        for directory in common_dirs:
            if directory.exists():
                logger.info(f'Scanning {directory} for projects...')
                projects = self.scan_directory(directory, max_depth=2)
                all_projects.extend(projects)
                logger.info(f'Found {len(projects)} projects in {directory}')
        
        return all_projects
    
    def add_recent_project(self, project: Dict):
        """Add or update a recently used project
        
        Args:
            project: Project metadata dict
        """
        # Remove if already exists
        self.projects = [p for p in self.projects if p.get('path') != project.get('path')]
        
        # Add to front (most recent)
        project['last_used'] = datetime.now().isoformat()
        self.projects.insert(0, project)
        
        # Keep only last 20
        self.projects = self.projects[:20]
        
        self._save_projects()
    
    def get_suggestions(self, include_scan: bool = False) -> Dict:
        """Get project suggestions
        
        Args:
            include_scan: Whether to scan common directories (slow)
            
        Returns:
            Dict with recent and detected projects
        """
        result = {
            'recent': self.projects,
            'detected': []
        }
        
        if include_scan:
            result['detected'] = self.scan_common_directories()
        
        return result
    
    def search_projects(self, query: str) -> List[Dict]:
        """Search projects by name or path
        
        Args:
            query: Search query
            
        Returns:
            Matching projects
        """
        query = query.lower()
        return [
            p for p in self.projects
            if query in p.get('name', '').lower() or query in p.get('path', '').lower()
        ]
