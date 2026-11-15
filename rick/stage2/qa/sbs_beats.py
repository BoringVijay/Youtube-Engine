#!/usr/bin/env python3
"""Storyboard gate: one side-by-side sheet per beat still, against the nearest reference frame.
Usage: python3 qa/sbs_beats.py <stills_dir> [out_dir]   (out_dir defaults to <stills_dir>/sbs)
Nearest = smallest distance in a coarse colour signature (8x8x8 RGB histogram + luma/saturation), so each beat is
judged next to the reference shot with the closest light and palette. Writes sbs_<still>.jpg + nearest.txt."""
import glob, os, subprocess, sys
import numpy as np
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
REFS = sorted(glob.glob(os.path.join(ROOT, "creative/skills/cartoon-3d-short/references/frames/*.jpg")))
SBS = os.path.join(ROOT, "creative/skills/cartoon-3d-short/templates/scripts/sbs_sheet.py")
def sig(p):
    a = np.asarray(Image.open(p).convert("RGB").resize((90, 160)), np.float32) / 255
    h, _ = np.histogramdd(a.reshape(-1, 3), bins=(8, 8, 8), range=[(0, 1)] * 3)
    mx, mn = a.max(-1), a.min(-1)
    return np.concatenate([h.ravel() / h.sum(), [a.mean() * 4, ((mx - mn) / np.maximum(mx, 1e-6)).mean() * 4]])
src = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(src, "sbs"); os.makedirs(out, exist_ok=True)
R = {r: sig(r) for r in REFS}
log = []
for p in sorted(glob.glob(os.path.join(src, "*.jpg")) + glob.glob(os.path.join(src, "*.png"))):
    s = sig(p); best = min(R, key=lambda r: np.abs(R[r] - s).sum())
    o = os.path.join(out, "sbs_" + os.path.splitext(os.path.basename(p))[0] + ".jpg")
    subprocess.run(["python3", SBS, o, "--ours", p, "--ref", best], check=True)
    log.append(f"{os.path.basename(p)} -> {os.path.basename(best)}")
open(os.path.join(out, "nearest.txt"), "w").write("\n".join(log) + "\n"); print("\n".join(log))
