@echo off
echo =============================================
echo  Highlight Assist - Icon Generator Helper
echo =============================================
echo.
echo To create proper PNG icons from the SVG:
echo.
echo OPTION 1 - Online Converter (Easiest):
echo   1. Go to: https://cloudconvert.com/svg-to-png
echo   2. Upload: icons\icon.svg
echo   3. Convert at 512x512px
echo   4. Download the PNG
echo   5. Use image editor to resize to: 16, 32, 48, 128px
echo.
echo OPTION 2 - Use Inkscape (Free):
echo   1. Install Inkscape: https://inkscape.org/
echo   2. Run these commands:
echo      inkscape icons\icon.svg -w 16 -h 16 -o icons\icon16.png
echo      inkscape icons\icon.svg -w 32 -h 32 -o icons\icon32.png
echo      inkscape icons\icon.svg -w 48 -h 48 -o icons\icon48.png
echo      inkscape icons\icon.svg -w 128 -h 128 -o icons\icon128.png
echo.
echo OPTION 3 - Use ImageMagick:
echo   convert icons\icon.svg -resize 16x16 icons\icon16.png
echo   convert icons\icon.svg -resize 32x32 icons\icon32.png
echo   convert icons\icon.svg -resize 48x48 icons\icon48.png
echo   convert icons\icon.svg -resize 128x128 icons\icon128.png
echo.
echo Current Status:
dir /b icons\*.png 2>nul
if errorlevel 1 (
    echo   [x] No PNG icons found - using placeholders
) else (
    echo   [OK] PNG icons found
)
echo.
pause
