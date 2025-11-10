// Add this after detecting if bridge is not connected
// Enhanced setup wizard with animation
function showSetupWizard() {
  var os = detectOS(); // 'windows', 'mac', or 'linux'
  var installerUrl = 'https://github.com/Skullcandyxxx/HighlightAssist/releases/latest/download/';
  var installerFile = '';
  var icon = '';
  
  if (os === 'windows') {
    installerFile = 'install-windows.bat';
    icon = '';
  } else if (os === 'mac') {
    installerFile = 'install-macos.sh';
    icon = '';
  } else {
    installerFile = 'install-linux.sh';
    icon = '';
  }
  
  var html = '<div style="text-align: center; padding: 20px; animation: fadeIn 0.5s;">';
  
  // Animated icon
  html += '<div style="font-size: 64px; margin-bottom: 16px; animation: bounce 2s infinite;">';
  html += icon;
  html += '</div>';
  
  // Title
  html += '<h3 style="color: #f59e0b; margin-bottom: 8px; font-size: 16px;"> Service Not Detected</h3>';
  html += '<p style="color: #94a3b8; font-size: 12px; margin-bottom: 20px;">Install the bridge service to enable AI features</p>';
  
  // Steps
  html += '<div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: left;">';
  html += '<div style="font-size: 11px; font-weight: 600; color: #60a5fa; margin-bottom: 12px;"> Quick Setup (30 seconds)</div>';
  
  html += '<div style="display: flex; align-items: start; margin-bottom: 10px;">';
  html += '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 10px; font-weight: 700; flex-shrink: 0;">1</div>';
  html += '<div style="color: #cbd5e1; font-size: 11px;">Download installer for ' + os.toUpperCase() + '</div>';
  html += '</div>';
  
  html += '<div style="display: flex; align-items: start; margin-bottom: 10px;">';
  html += '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 10px; font-weight: 700; flex-shrink: 0;">2</div>';
  html += '<div style="color: #cbd5e1; font-size: 11px;">Run the installer (auto-installs Python deps)</div>';
  html += '</div>';
  
  html += '<div style="display: flex; align-items: start;">';
  html += '<div style="background: #3b82f6; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 10px; font-weight: 700; flex-shrink: 0;">3</div>';
  html += '<div style="color: #cbd5e1; font-size: 11px;">Click "Start" button above - Done! </div>';
  html += '</div>';
  
  html += '</div>';
  
  // Download button
  html += '<a href="' + installerUrl + installerFile + '" download style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 8px; color: white; font-size: 13px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); transition: transform 0.2s; cursor: pointer;" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">';
  html += ' Download Installer';
  html += '</a>';
  
  // Manual link
  html += '<div style="margin-top: 16px;">';
  html += '<a href="https://github.com/Skullcandyxxx/HighlightAssist#readme" target="_blank" style="color: #60a5fa; font-size: 10px; text-decoration: underline;">View full installation guide </a>';
  html += '</div>';
  
  html += '</div>';
  
  // CSS animations
  html += '<style>';
  html += '@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }';
  html += '@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }';
  html += '</style>';
  
  return html;
}

function detectOS() {
  var platform = navigator.platform.toLowerCase();
  var userAgent = navigator.userAgent.toLowerCase();
  
  if (platform.indexOf('win') !== -1) return 'windows';
  if (platform.indexOf('mac') !== -1 || userAgent.indexOf('mac') !== -1) return 'mac';
  return 'linux';
}
