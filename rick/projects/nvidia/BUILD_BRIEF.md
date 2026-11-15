# Nvidia two-parter: build brief (read this fully, then your section)

Goal: two Rick Shots videos, premium look, every shot intentional. Bar: Claude-as-critic scores every shot 8+ (rulebook section 13) before it ships. Vijay renders on his Mac and wants the best output.

## Read first (in this order)
1. `creative/rick/rulebook.md` (hard rules section 2, density section 7, scoring section 13, two-part rule section 20)
2. `rick/projects/nvidia/scripts.md` (the locked scripts: the Picture column is your shot list, 🔥 visual roast, 💭 relatable thought, 🥚 easter egg: ALL must appear on screen as written, funnier is allowed, new facts are not)
3. `rick/stage2/public/nva/lines.json` or `nvb/lines.json` (exact start/end seconds of every spoken line) and `words.json` (per-word times). These are the timing truth.
4. The Camp Century build as the pattern: `rick/stage2/src/videos/ice/` (`sets/a.ts`, `shots/a.ts`, `world.ts`, `timeline.ts`). Study how a set is built (SetCtx, boxGeo, quad, ctex painted textures, lamp/wash), how a shot is defined (ShotDef: a, b, light, set, cams, cInf, cast, anim), and how characters are posed (Spot).

## Layout
- Video A: `src/videos/nva/` (composition `NvAShort`). Video B: `src/videos/nvb/` (`NvBShort`). Same engine as Camp Century (world.ts is a copy, do not edit it).
- One helper owns one section of one video. You edit ONLY `sets/<x>.ts` and `shots/<x>.ts` of your video (x = a, b or c). Nothing else.
- Your world x-range is `SECTION_X[X]` in `world.ts` (A: 400/500/600, B: 700/800/900, C: 1000/1100/1200/1300), one 100 m slot per set. Put your set at your slot centre (each file already imports the pattern, see ice/sets/a.ts).
- Characters: `import { CAST, crowd } from "../cast"` (shared by both videos, do NOT edit). JENSEN (leather jacket, silver hair, THE look), JENSEN_TEEN, JENSEN_1993, JENSEN_2012 (hair is the era clock), ALICE (cream blazer, long black hair, dress silhouette; her red handbag and sunglasses are SET pieces or drawn props you add near her hands, never a new Outfit), SUIT, AGENT, INTERN, GEEK, crowd(v). The same person must look identical in every shot of both videos. Extra background people: build with `crowd(v)` or locally-defined Outfits in your shots file.
- Lights available: "day" | "golden" | "inside" | "night" | "arctic" | "lab". Do not add presets. For colour, paint it into the set (neon, screens, lamps) and use `lamp()`/`wash()`.
- Character held props only: icecream, shako, hammer, razor, pencil. Anything else (phone, bag, sign, cup, lanyard) is a mesh you build in the set or a `placeProp`, positioned by the shot's `anim`/`cast` time function. Do not edit toon.ts.

## Shot rules
- Every shot starts on a spoken-line boundary from lines.json (use `sec(t)`), or on a word inside a line when the picture has a beat. A shot's `b` is the next shot's `a`. Cover 0 .. last line end exactly (sections tile the timeline: your first shot starts at your first line's start, minus 0 gap handling: the first shot of section B/C starts where the previous section ends = the start of its first line).
- Portals: set `portal: true` on the shot you enter through a portal (hub/location change). About 2 of every 3 boundaries are portals; a hard cut is a deliberate punch (the "Here's where it gets messy" beat).
- Camera: every shot moves (`cams` with a push-in, drift, or reveal), never a static hold. 9:16 vertical, subject not dead centre in more than 1 shot in 4. Keep `cInf` 7-13 for soft depth.
- Density: 5+ readable things in a medium or wide shot, with background chaos nobody acknowledges.
- Text: drawn in code (ctex canvas), never generated. Legible at phone size (large, bold, high contrast).
- Roasts/gags: stage them in the picture exactly as the Picture column says. Draw them big enough to read at phone size and hold them 1 s+.
- Pencil caption pops are automatic (Nva/Nvb.tsx). Do not touch captions.
- Fourth-wall glance: once per video, at the end only (final shot): the character or penguin looks at the lens.
- Penguin: the "WRONG POLE" sticker/penguin cameo appears where the script says (ice/sets has `penguinSticker` in world.ts).
- Facts: nothing on screen that isn't in the script's fact notes. Real people appear only as the invented cartoon designs in cast.ts. No intimate imagery, no real logos beyond plain text labels (e.g. "NVIDIA" typed on a sign is fine, no logo art).

## Check your work (this machine is slow, budget it)
- Render stills with `cd rick/stage2 && PROPS='{"preview":true,"post":{"lens":false}}' COMP=NvAShort ./still.sh /tmp/<tag>_ f1,f2,f3 0.3` (use NvBShort for video B). One still takes about 20-60 s and renders queue on a lock shared with the other helpers: pick 1-2 frames per shot (early and late), batch them in ONE call, stitch with ffmpeg into one contact sheet (`ffmpeg -i ... tile`), and look at the sheet.
- Do at most 3 render rounds. Round 1 after all your sets+shots exist. Fix what is broken or weak (blank walls, floating things, text unreadable, character gaps, a shot under 8). Final round confirms.
- Score each of your shots 0-10 honestly in your report. Anything below 8 after round 3: say what is wrong and why.
- Commit your two files and your contact sheets (`rick/projects/nvidia/review/<video><section>.jpg`) with `git pull --rebase` first, then push. Co-author line is required on commits:
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_019SFnnnsRcFFt6tsbMJcrpo`.
- The repo remote is renamed: `git remote set-url origin https://github.com/BoringVijay/Youtube-Engine.git` if a push is refused.
- Report back in under 200 words: shots built, per-shot scores, known weaknesses, anything the director should change.
