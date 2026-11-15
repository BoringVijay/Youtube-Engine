#!/bin/bash
# Camp Century: full-quality render on your Mac's GPU. Double-click this file (or run it in Terminal).
# Needs Node.js 18+ (https://nodejs.org). Output: out/camp-century.mp4
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js is not installed. Get the LTS installer from https://nodejs.org, then run this again."; read -n1; exit 1; }
echo "Installing (first run only, ~1 min)..."; npm ci --no-audit --no-fund --loglevel=error || exit 1
START=$(date +%s)
npx remotion render src/index.tsx IceShort out/camp-century.mp4 --gl=angle --concurrency=50% --crf=18 --timeout=300000 --log=info
CODE=$?
if [ $CODE -ne 0 ] || [ ! -f out/camp-century.mp4 ]; then echo ""; echo "RENDER FAILED (code $CODE). Screenshot the lines above and send them to Claude."; read -n1; exit 1; fi
echo ""; echo "Done in $(( ($(date +%s) - START) / 60 )) min -> $(pwd)/out/camp-century.mp4"; open out 2>/dev/null; read -n1 -p "Press any key to close"
