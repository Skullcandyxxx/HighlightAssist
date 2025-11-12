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

mkdir -p "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
mkdir -p "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"

echo "$MANIFEST" > "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.highlightassist.bridge.json"
echo "$MANIFEST" > "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.highlightassist.bridge.json"

echo "Wrote manifests to:" 
echo "  $HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.highlightassist.bridge.json"
echo "  $HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts/com.highlightassist.bridge.json"

echo "For Firefox, install per-profile as documented in MDN." 
