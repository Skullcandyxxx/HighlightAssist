Param(
    [string]$HostExePath,
    [string]$ExtensionId
)

if (-not $HostExePath) {
    Write-Host "Usage: .\register_native_host_windows.ps1 -HostExePath 'C:\full\path\to\highlightassist-native-host.exe' -ExtensionId '<your-extension-id>'"
    exit 1
}

if (-not (Test-Path $HostExePath)) {
    Write-Host "Host executable not found at: $HostExePath" -ForegroundColor Red
    exit 1
}

$template = Join-Path $PSScriptRoot '..\manifests\com.highlightassist.bridge.json.tpl'
$tmpl = Get-Content $template -Raw
$manifest = $tmpl -replace '\{\{HOST_PATH\}\}', ($HostExePath -replace '\\','\\\\') -replace '\{\{EXTENSION_ID\}\}', $ExtensionId

$local = [Environment]::GetFolderPath('LocalApplicationData')
$chromeDir = Join-Path $local 'Google\Chrome\User Data\NativeMessagingHosts'
$edgeDir = Join-Path $local 'Microsoft\Edge\User Data\NativeMessagingHosts'

New-Item -ItemType Directory -Force -Path $chromeDir | Out-Null
New-Item -ItemType Directory -Force -Path $edgeDir | Out-Null

$chromePath = Join-Path $chromeDir 'com.highlightassist.bridge.json'
$edgePath = Join-Path $edgeDir 'com.highlightassist.bridge.json'

Set-Content -Path $chromePath -Value $manifest -Encoding UTF8
Set-Content -Path $edgePath -Value $manifest -Encoding UTF8

Write-Host "Wrote manifests to:" -ForegroundColor Green
Write-Host "  $chromePath"
Write-Host "  $edgePath"

Write-Host "If you use Firefox, see its native messaging docs to install the manifest for Firefox profiles." -ForegroundColor Yellow
