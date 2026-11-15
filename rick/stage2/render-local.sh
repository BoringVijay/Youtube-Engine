#!/bin/bash
# Local render + QA gate, one command:  ./render-local.sh <Composition> <story.ts> <out.mp4> [flashA,flashB]
#   e.g. ./render-local.sh IceShort src/videos/ice/story.ts out/camp-century.mp4 116,120
# Renders on the Mac GPU one frame at a time (higher concurrency tiled frames on 15 Nov), then runs qa/run_qa.sh:
# report + contact sheets land in <out dir>/qa/. Exits non-zero if the render or the QA gate fails.
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] && BX=(--browser-executable="$CHROME") || BX=()
npx remotion render src/index.tsx "$1" "$3" --gl=angle --concurrency=1 --crf=18 --timeout=300000 "${BX[@]}" || { echo "RENDER FAILED"; exit 1; }
./qa/run_qa.sh "$3" "$2" "$4"
