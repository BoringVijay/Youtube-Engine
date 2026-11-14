# Learnings

Rules our own videos taught us. feedback-loop writes here. Overrides generic advice.

## Rules
- 2026-11-14, from the Rick study (28 Shorts, views 136K to 34M, creative/references/rick/): hits put physical stakes on screen and show the obvious approach failing before the clever one wins; plain explainers of abstract systems (slot machines 136K, painkillers 320K) were the bottom of the set. Encoded as "Grounded storytelling" in creative/bible.md.
- 2026-11-14: Gemini judges camera motion at about 1 frame a second, so it reads fast glides as hard cuts. Trust frame-level measurement (shortkit) for camera and pacing; trust Gemini for story, topic and title patterns.

## Hunches (n < 3)
- 2026-11-14 (Rick stage, Emu War pilot): The stills check catches technical faults, not taste; look at every contact sheet yourself. What broke v1 and the fix that stuck: (1) glides between locations fly the camera over empty ground, so cut on every location change and into every close-up card; (2) close-up cards must be square-on (yaw 0, pitch 0) and sized to fit the 9:16 frame; (3) front-facing face swaps on a side-view body read as an owl at a distance, so use them only in close-ups and reset to the side head after; (4) anything a character stands behind (fence posts, wire, walls) must sit below or beside the face in close-ups; (5) thin walls for wheat or hedges, never deep slabs that show their top from above; (6) blurring a wrapped backdrop needs neighbours past its edges or a pale seam shows in the sky. Software rendering is about 4-5 s a frame at 1080x1920: render in 16 parallel chunks (about 11 min, about 130 Actions minutes). Mix at -14 LUFS for Shorts (it came out at -18 LUFS without normalising).

