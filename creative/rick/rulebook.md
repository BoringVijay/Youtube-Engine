# Rick Shots: the craft rulebook (v2)

Rewritten 2026-11-15. Version 1 had grown by appending, and its sections contradicted each other (length, pace, captions, critic, animation method). This version is one consistent set of rules. The old text is in git history.

Evidence behind it:
- The teardown of the reference channel: 151 videos, `creative/references/winners/ricksclips3000/`.
- The measured look reports: 32,337 frames, `creative/skills/cartoon-3d-short/references/reports/`.
- Vijay's notes on the Emu War pilot (rated 5/10) and his decisions of 14-15 Nov.

When this file and any other disagree, this file wins.

## 0. North star

**Premium execution, unhinged creativity.** The reactions we design for:
- "this is too premium for YouTube"
- "wait, I didn't know this"
- "who does that?"
- "WTF is happening"
- "oh my god 😂"

**The look:** flat 2D doodle characters living in a painted 3D world, as close to the reference grammar as we can get.

**What makes it ours** (the reference doesn't do these):
1. **Background chaos.** Things happen behind the story that nobody on screen acknowledges.
2. **The penguin hunt.** Every video hides two penguin details, one obvious and one subtle. The pinned comment asks who found both. It gives people a reason to rewatch and to comment.
3. **Five lanes**, not one: what-if, apocalyptic and survival, how-it-really-works, exploration, weird true stories.
4. **A recurring face.** Mukluk-style running characters that cross videos (a dog, a smug bird, the same unlucky everyman) so regular viewers get rewarded.

## 1. How a video gets made

Problems are cheapest on paper, so every stage has a gate.

| # | Stage | Output | Gate |
|---|---|---|---|
| 1 | Topic | Anti-obvious test; Demand and Whitespace measured on YouTube | Vijay picks |
| 2 | Paper | 10 hooks scored; 3 script directions; one two-column script with facts and sources | Vijay approves the script |
| 3 | Voice | Final narration recorded, word timings fixed by hand | Listening check |
| 4 | Storyboard | One engine still per beat, real cast, sets and light | Vijay approves the frames |
| 5 | Animatic | Half-resolution full motion with the real voice | Vijay approves pace and gags |
| 6 | Final | Full render, sound, captions, QA | Vijay approves, then scheduled upload |

**The critic is Claude.** At every stage Claude scores the work against section 13, looks at every still and at frame strips of the whole cut, compares against reference frames with numbers (not taste), and keeps fixing until every area scores 8 or more. The scores and what changed go to Vijay with the work. A second opinion from Gemini is optional, never the judge.

**Voice comes before picture.** Everything on screen is timed to the spoken words, so the voice is locked first.

## 2. Hard rules (any one fails the render)

1. No protagonist. Every video has a person (or animal) doing something that looks stupid or insane, with stakes.
2. A fact on screen or in the voice that isn't in the sourced facts list.
3. A frame held with nothing moving: every hold creeps (push-in), every character blinks and breathes.
4. A broken character: gaps at joints, torn shapes, two designs for one person, a head over one third of body height.
5. One actor doing what the story says a group did. Crowds show real scale (100+ in the wide).
6. The camera showing a set edge, a void, or a blank wall filling the frame.
7. A sparse frame: fewer than 5 readable things in a medium or wide shot (see the density budget in section 7).
8. The main subject dead centre in more than 1 shot in 4.
9. A big action with no reaction within 2 seconds.
10. Comic music under a tense beat, or music that never stops.
11. The voice sped up, or its pauses cut, to hit a length. Rewrite the script instead.
12. Text inside a generated image. All readable text is drawn in code.
13. A joke that needs niche knowledge. Test: would a 15-year-old in India and a 45-year-old in the US both get it?
14. Anything copied from the reference channel: stories, lines, characters, shots. Never name it in a video.
15. Real penguin IP, ripped trending or meme audio, an API key in chat.

## 3. Story template

Every script fits these beats. Score each 1-10 before writing.

| Beat | Share | Job |
|---|---|---|
| Hook | ~6 % | Line 1, 8-16 words: someone does something that looks insane, with stakes. Frame 1 shows the act. Alternatives: "If you X, you'd Y", or "X is illegal, yet Y" |
| Setting | ~12 % | Present tense, place, year, stakes. "You see," can open it |
| Doubters | ~12 % | Someone mocks the hero with one meme-able line. This is the main comedy slot |
| Escalation | ~25 % | 3-5 steps, each bigger, with numbers that grow or shrink. Light shows time passing |
| Wait-what | ~5 % | The viewer's question, said out loud |
| Mechanism | ~25 % | The real explanation through an everyday analogy that gets its own mini-scene |
| Payoff | ~15 % | Ironic reversal, ideally the doubter undone by their own choice. A physical spectacle on the last word, cut mid-motion so it loops |

- **The hero should be vindicated.** The strongest reference videos have a hero who looks wrong and turns out right.
- **What-ifs** run in second person and end by handing the viewer a moral choice ("would you?").
- **True beats invented.** The mechanism must be real. Characters may be composites; say so in the description.
- A new "wait, what?" every 5-7 seconds: new information, a new place, a reversal or a gag.

## 4. Script and voice

- **Length:** 55-65 s. **Pace:** 3.5-3.9 words a second, so about 205-240 words. No dead air, no intro, no outro, no call to action. The voice starts on frame 1.
- **Sentences:** short, plain spoken English, contractions, one idea each, punch word last. About 13 words on average.
- **"You see,"** is the house pivot. Use it once or twice.
- **Specific numbers** beat adjectives.
- **Quips** from characters are read by the narrator in a slightly different tone, as the reference does. No separate character voices unless a gag needs one.
- **The two-column script** is the core document: voice-over | picture | background gag. A line with nothing happening on the right is cut.
- **Narrator:** one bright, expressive male voice, matched to the reference by measurement (median pitch about 190 Hz, wide range, deadpan delivery). ElevenLabs, chosen by test and a blind pick. Multilingual v2 for steady narration, v3 only for acted lines.
- **Listening check** before any picture work: a robotic, mis-stressed or rushed line is regenerated.

## 5. Comedy

- **Relatable beats clever.** The best gags are things everyone has done: ignoring a ringing phone, pretending to work, "it's fine" while everything burns.
- **Three slots per video:**
  - the doubter's quip
  - one literal illustration of a figure of speech ("his face goes purple" → he turns purple)
  - one callback at the end
- **Background gags** in at least half the shots. They never get a close-up and nobody reacts to them.
- **Deadpan narrator.** He plays the absurd dead serious.
- **Punch up, never at victims.** Tragedy gets respect or a different topic.

## 6. Picture: how it's built

**The world and the characters are built in code**, the way the reference is built. This is what keeps characters identical in every shot and stops the "AI look".

- **Engine:** `rick/stage2/` (three.js inside Remotion): two-tone shading, painted textures, ink pass, lens blur, bloom, grade.
- **Characters:** drawn in code (section 8).
- **Painted art:** Nano Banana Pro makes textures, sky and far-background paintings, posters and labels (text added in code).
- **Hero props:** the 3-6 objects a story turns on are real 3D models, generated image-to-3D and then inked and shaded by the engine. Small props are code primitives and CC0 kit pieces.
- **AI video:** at most 2 effect shots per video, and only when code can't do the shot. Start frame rendered by the engine.

## 7. Picture: what a frame needs

**Density budget.** The reference's frames are full. Ours must be too.
- A medium or wide shot has at least: 5 readable props, 1 foreground element passing the lens, 1 readable sign or label, 1 light source in frame, and 3 depth layers.
- A close-up has a designed background (not a blank wall) and one prop that tells you where we are.

**Light is the storyteller.**
- Day for normal, golden for change, night-blue for danger or scheming, warm interior for the reveal.
- Warm key against cool shadow in every frame. Shadows are coloured and lifted, never black or grey.
- Interiors get pools of warm light from visible lamps, with cool ice or night beyond them.
- Day median brightness about 0.57; saturated colour; no crushed blacks.

**Camera (measured from the reference).**
- It almost never stops: about 65 % of frames move, and holds keep pushing in.
- Moves glide in and out over about 23 frames. No snaps. No hand-held wobble.
- Impacts get a 6-8 frame kick that flips direction every frame.
- Within one place the camera travels: follow an object, whip pan, fly through. Between places, cut or use a 6-8 frame dissolve.
- Per 10 seconds: at least one wide, one medium and one close shot. 1-2 epic scale wides per video.
- Depth of field on close and medium shots (about a third of screen time), focused on the eyes. Wides stay sharp.

**Motion.**
- Something visibly changes every 1.5-2 seconds.
- Acting lands 0-3 frames before the word.
- Walks are bouncy with planted feet. Blinks every 0.5-2.3 seconds.
- Every action has effects: dust, sparks, speed lines, splashes, as flat 2D sprites in the 3D scene.
- The ending is a physical spectacle.

## 8. Characters

- **Drawn in code** with the toon kit: bean heads, stick limbs, ink-dot hands, one continuous plum outline. About 3.5 heads tall. No gaps are possible because nothing is cut into layers.
- **Identity comes from costume:** hats, hoods, moustaches, colours. Every character passes the silhouette test.
- **Cast sheet first** for each video: every character, front view, three expressions. No two characters may be confused at phone size.
- **Acting range:** 14 expressions, props in hand, sit, walk, fall, wave. New poses are added to the kit, never faked by tilting a card.
- **One trait per character,** shown in motion: the cocky sergeant, the tired barber.
- **A global cast:** varied skin tones, places and eras.
- **Animals** get the same care: real anatomy first, then stylise.

## 9. Sets and props

- **Build a set kit, not one-off sets.** Rooms, tunnels, streets and landscapes come from reusable parts (walls, floors, ceilings, doors, windows, lamps, furniture), so each new video adds to a library.
- Build wider than the camera sees. Check the first and last frame of every move.
- At least 3 clearly different places per video, plus the analogy mini-set.
- Period-accurate props. One design per prop.
- **Penguin details:** one obvious, one subtle, premium-looking, with eyes, different every video (a brand, a sticker, a calendar, a constellation).
- Colours: natural and varied. Blue only as a hint, never the theme.

## 10. Sound

- **Score:** original, synthesized in code, mock-epic and played straight. It follows the beats and leaves gaps. Lyria is the fallback.
- **Effects:** every visible action has a sound. A whoosh on big camera moves. Half a second of silence before the biggest moment.
- **Mix:** music and effects 5-10 dB under the voice, the whole mix at -14 LUFS, voice clear on a phone speaker.
- Original audio only.

## 11. Captions

- Reference style: one word at a time (two at most), white, bold and heavy, black outline, at about 65 % of the height.
- Hard swap on each word, timed to the voice. Never over a face.
- Dates and places appear as a prop in the scene (a sign, a calendar, a newspaper), not as an overlay.

## 12. Facts

- Every claim has a source in the brief.
- When sources disagree, use the cautious wording ("as early as").
- Dramatise, never invent: composites and obvious gags are fine, fake numbers and fake quotes are not.
- Politically live topics are told with dates and facts only.
- No gore.

## 13. The critic's scorecard

Score each 1-10. Ship at 8 or more on every line.

| Area | What a 10 looks like |
|---|---|
| Hook | Frame 1 shows the insane act; line 1 makes you need the answer |
| Story | Every beat of the template lands; the hero is vindicated; the payoff is ironic |
| Comedy | A laugh beat every 8-10 s; all pass the universal test |
| Voice | Sounds human, right pace, no robotic line |
| Characters | Consistent, expressive, acting on the word; no glitches |
| Density | Every frame meets the budget; background gags present |
| Light and colour | Warm against cool; light changes with the story; matches reference numbers |
| Camera | Always alive, glides, right shot sizes; no dead holds |
| Sound | Every action heard; music lands and leaves |
| Continuity | Props, costumes, positions and light direction hold across cuts |
| Second watch | Both penguins, at least 3 hidden gags, a loop that works |
| Phone test | At phone size, sound off, the story still reads |

Method: stills of every shot, frame strips of the full cut, side-by-sides with reference frames, and measured comparisons (brightness, saturation, ink density, camera speed).

## 14. Lanes and formats

| Lane | Shape |
|---|---|
| Weird true mechanism | He did X that looks insane; the real reason |
| Survival | The obvious move kills you; the weird one saves you |
| Apocalyptic | A true story that turns into "and today it would be worse" |
| Exploration | A place with one impossible rule |
| What-if | Second person, ends on "would you?" |

Never the same lane three times in a row.

## 15. Topics

- **Anti-obvious test:** list what any chatbot suggests first, and ban it. Dig in court filings, old newspapers, manuals, patents, niche forums.
- **Measure, don't guess.** Demand is the biggest Short on a sibling topic. Whitespace is the biggest Short on the exact premise, plus the count of 1M+ Shorts in the top 25 results. Keep them as separate scores. A topic needs 6 or more on both.
- A topic with no protagonist and no real mechanism is rejected.

## 16. Running the channel

- **Title and first frame tell the same story as the hook.** Title patterns that work: "Why X...", "How X...", "The X That Y".
- **Cadence:** 2-3 a week. Consistency beats bursts.
- **Pinned comment:** the penguin hunt question.
- **Description:** sources, and a note when a character is a composite.
- **After 48 hours:** viewed-vs-swiped, average percentage viewed, where the drops are and which beat was on screen. One drop is noise; the same drop in 3 videos becomes a rule here.
- **Every 10 videos:** the 3 best and 3 worst side by side, then update this file.
- Variety protects monetisation: rotate lanes, casts, places and palettes.

## 17. Money

- Check `config/budget.json` before any paid step, and say the cost first.
- Google credit: painted art, the occasional effect shot. fal: voice, hero 3D props.
- Keys live in GitHub secrets. Google login is keyless.
- GitHub Actions: renders run in parallel chunks; avoid wasteful reruns.

## 18. Lessons that built these rules

- **Emu War (5/10):** it illustrated sentences instead of staging scenes. Sliced AI characters tore at the joints. One shooter, no scale, music everywhere.
- **Voice:** compressing pauses and speeding up 8 % made it robotic.
- **First Camp Century stills:** correct style, but empty and flat. That's where the density budget and the light rules in section 7 came from.
- **GitHub minutes:** an hourly job on a private repo burned the free tier.

## 19. Voice pacing (15 Nov)
- The reference narrator barely pauses. Get there with punctuation: write the TTS text with commas and run-ons where the reference would keep going, and keep full stops only for real beats. The words stay identical to the approved script.
- ElevenLabs' own speed setting (up to 1.15) is allowed: it's the model pacing itself. Post-processing is not: no time-stretch, no cutting pauses out of the audio.

## 20. Single vs two-part (Vijay, 15 Nov 2026)
- Default: one self-contained Short that pays off its own hook. Serve the reward in the same video.
- Two parts only when the story is naturally too long for one. Each part 60-100 s; part 1 ends on a real cliffhanger, part 2 opens with a 3 s recap and pays it off.
- Claude proposes two parts at the script gate with the reason; Vijay decides.
- A/B test now: one story as a single Short vs the same story as two parts; compare views, retention and subs gained per part.

## 21. Local QA gate (15 Nov 2026)
- Every render ends with `./render-local.sh <Comp> <story.ts> <out.mp4>` (or `npm run qa -- <mp4> <story.ts>` on an existing file). It writes `<out dir>/qa/report.txt` + 2 s contact sheets and fails on any unplanned black, white, frozen or pop frame, or loudness outside -15..-14 LUFS. Portal dives and listed flashes count as planned.
- Mix target is **-14 LUFS** (YouTube playback level). The critic reads the report before Vijay sees the cut.
- Storyboard gate: `python3 qa/sbs_beats.py <stills dir>` makes one side-by-side per beat against the nearest reference frame; scores are given against those sheets.
- Mac renders run `--concurrency=1`: 50% concurrency on the GPU produced tiled frames (Camp Century, 15 Nov).
