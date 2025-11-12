#!/usr/bin/env bash
set -euo pipefail

HOST_EXE_PATH=${1:-}
EXTENSION_ID=${2:-}

if [ -z "$HOST_EXE_PATH" ] || [ -z "$EXTENSION_ID" ]; then
  echo "Usage: $0 /full/path/to/highlightassist-native-host "<extension-id>""
  exit 1
fi

TEMPLATE_DIR="$(dirname "$0")/../manifests"
TEMPLATE="$TEMPLATE_DIR/com.highlightassist.bridge.json.tpl"

MANIFEST=$(cat "$TEMPLATE" | sed "s|{{HOST_PATH}}|$HOST_EXE_PATH|g; s|{{EXTENSION_ID}}|$EXTENSION_ID|g")

mkdir -p "$HOME/.config/google-chrome/NativeMessagingHosts"
mkdir -p "$HOME/.config/microsoft-edge/NativeMessagingHosts"

echo "$MANIFEST" > "$HOME/.config/google-chrome/NativeMessagingHosts/com.highlightassist.bridge.json"
echo "$MANIFEST" > "$HOME/.config/microsoft-edge/NativeMessagingHosts/com.highlightassist.bridge.json"

echo "Wrote manifests to:" 
echo "  $HOME/.config/google-chrome/NativeMessagingHosts/com.highlightassist.bridge.json"
echo "  $HOME/.config/microsoft-edge/NativeMessagingHosts/com.highlightassist.bridge.json"

echo "For Firefox, install per-profile as documented in MDN." 
