# Cross-Platform Build Script
# Builds standalone executables for Windows, Linux, and macOS

# Windows (.exe)
pyinstaller --onefile --noconsole --name HighlightAssist-Service service-manager.py

# Linux (binary)
# Run on Linux: pyinstaller --onefile --name HighlightAssist-Service service-manager.py

# macOS (app bundle)  
# Run on macOS: pyinstaller --onefile --windowed --name HighlightAssist-Service service-manager.py
