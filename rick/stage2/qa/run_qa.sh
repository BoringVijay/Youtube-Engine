#!/bin/bash
# Local QA gate, run right after a render: ./qa/run_qa.sh <final.mp4> <story.ts> [flashA,flashB]
# Writes <video dir>/qa/report.txt + 2 s contact sheets. Exit 1 on any unplanned black/white/frozen/pop frame or loudness outside -15..-14 LUFS.
cd "$(dirname "$0")/.."
miss=""; for t in ffmpeg ffprobe python3 node; do command -v $t >/dev/null || miss="$miss $t"; done
[ -n "$miss" ] && { echo "MISSING ON PATH:$miss  (mac: brew install ffmpeg python)"; exit 2; }
python3 -c "import numpy, PIL" 2>/dev/null || { echo "MISSING python packages: pip3 install numpy pillow"; exit 2; }
VID="$1"; STORY="$2"; OUT="$(dirname "$VID")/qa"; mkdir -p "$OUT"
node qa/dump-shots.mjs "$STORY" "$OUT/shots.json" "$3" || exit 2
python3 ../../creative/skills/cartoon-3d-short/templates/scripts/short_qa.py "$VID" "$OUT" "$OUT/shots.json" > /dev/null || exit 2
cp "$OUT/report.md" "$OUT/report.txt"
python3 - "$OUT/report.txt" <<'P'
import re, sys
r = open(sys.argv[1]).read(); fails = []
m = re.search(r"I:\s*(-?[\d.]+) LUFS", r)
if not m or not -15.0 <= float(m.group(1)) <= -14.0: fails.append(f"loudness {m.group(1) if m else '?'} LUFS (gate -15..-14, target -14)")
for k, pat in (("black", r"black \[(.*?)\]"), ("white", r"unplanned white \[(.*?)\]"), ("frozen", r"frozen spans >=12f \[(.*?)\]"), ("pops", r"POPS[^:]*: \[(.*?)\]")):
    m = re.search(pat, r)
    if m and m.group(1).strip(): fails.append(f"{k}: {m.group(1)[:200]}")
open(sys.argv[1], "a").write("\nGATE: " + ("FAIL\n- " + "\n- ".join(fails) if fails else "PASS") + "\n")
print(open(sys.argv[1]).read()); sys.exit(1 if fails else 0)
P
