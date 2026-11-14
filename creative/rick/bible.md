# Rick Shots: the channel's rulebook

Decided by Vijay on 2026-11-14: from now on the channel makes one kind of video, Rick Shots. Flat 2D doodle characters in a sunlit, hand-painted 3D world, built in code, about 60 seconds, a true hidden-reason story or a strictly logical what-if. Everything made before this date was experimentation.

Read with `rick/references/` (the measured style rules, prompt templates, scene format and stage) and `creative/references/rick/playbook.md` (Gemini's study of 28 reference Shorts, 9.3M median views).

## 1. The look (measured, frame by frame)
- 1080x1920, 30 fps, 56 to 66 s. Median shot 1.17 s, about 30 view changes a minute, at most 1 hard cut. The camera always glides between setups (about 0.8 s, eased) and mostly pushes in.
- Characters: big round off-white head about as wide as the body, dot eyes, thick brows, stick limbs, no feet. Flat cutouts that stand in real 3D light and cast real shadows, with a soft contact shadow under the feet so nobody floats.
- Ink outline 10 px #271925 on everything. Shadows are tinted (red-brown, blue, violet), never pure black.
- Every surface is a hand-painted texture. The sky and distance are one painted backdrop, blurred.
- Captions: 1 to 2 words, white heavy sans with a dark outline, centred at y 1350, changing on the word.
- The light flips once, on the "You see..." pivot: warm day into the world's second mood.

## 2. The story (from the hits vs misses)
1. **Physical stakes on screen.** A crash, a flood, a riot, money burning. Abstract systems stall unless they become a physical object.
2. **Show the obvious approach failing first.** Machine guns vs emus. The viewer should think "I'd have done that too".
3. **Open on an action.** A character does something that looks stupid, wrong or impossible. Never "look at this" or "did you know".
4. **Two sides, colour-coded.** People vs birds, a city vs a river, a gambler vs the casino.
5. **The smart prop.** An ordinary object shown early is the key at the end.
6. **Explain with something from home.** A household analogy (soup, a lift, braking hard in a car) in under 15 seconds.
7. **Ironic karma ending,** then the last line loops into the first.
8. **Small cast, few places.** 2 or 3 characters, 3 or 4 locations, 1 or 2 macro inserts that carry the facts.

## 3. Realism (Vijay: "super realistic, grounded, relatable")
- True stories: every name, date, number and place is fact-checked from at least two sources before a script exists. Numbers on screen match the voice and the fact sheet exactly.
- Period and place are right: uniforms, vehicles, money, signage language, weather and landscape of the real year and country. The doodle style is the only thing that isn't realistic.
- What-ifs follow real physics and believable motives (greed, pride, laziness, fear). No rule appears only to rescue the ending. Framed as a story, never as fact.
- Real-world logic in every shot: objects keep their size, position and state between shots, light comes from one consistent sun, nothing teleports.

## 4. The penguin trademark (Vijay, 2026-11-14)
There is no penguin character any more. The penguin lives on as the world's brand: a small, simple penguin symbol that appears wherever a real logo would, the way Penguin Books' logo turns up on shelves everywhere.
- One canonical mark: a flat, single-colour penguin silhouette (egg-shaped body, short flippers, three-feather tuft on the head), no text. Saved once at `rick/brand/penguin-mark.png` and reused, never redrawn per video.
- Where it goes: the logo on a laptop, the badge on a truck grille, a newspaper masthead emblem, a cereal box, a bank's sign, a soldier's cap badge, a vending machine, a stamp on a crate. It replaces real brands (never an Apple, Ford or Coca-Cola logo).
- 1 to 3 placements per video, small, never the subject of a shot, never on a serious or tragic beat. At least one is subtle enough that most people miss it first time.
- Never write the word "Penguin" next to it. The symbol alone is ours; the name belongs to a real publisher.
- Placed as a decal card in the stage, so it is pixel-identical in every video.

## 5. Continuity (what stops the AI look)
- One master image job per character; every later image of it uses that job as the reference and starts with: "Exact same art style as the reference images (same character design language, same line weight, same shading)."
- Shots start on spoken words ("say:"), so picture and voice can't drift apart.
- Stop-frame check on every video before the full render, and a numbers comparison against a reference frame. Fix every flag.
- A world's assets (cast, faces, textures, props, backdrop, music bed) are a permanent library. Reuse them; never regenerate what exists.

## 6. Topics
- Lead with true hidden-reason and loophole stories; frame sci-fi as a "What if...?" question.
- Title formulas that travel: "Why [group] [does something counter-intuitive]", "How [everyday object] saved [group] from [disaster]", "Why perfect [thing] doesn't work", "How [underdog] beat [system] with [simple object]", "Why [institution] did [bizarre thing]".
- Gate: name the physical thing that fails on screen in the first 20 seconds and the obvious approach that fails. No answer, no script.

## 7. Money (Vijay: "be careful with this money")
- Images: Nano Banana Pro on the Google credits (cap in config/budget.json). Music: Lyria on Google. Voice: ElevenLabs v3 on fal. fal has its own cap (fal_total_usd).
- Iterate on text and images, never on renders. No automatic retries on paid calls; Vijay approves characters before anything else is made, and the stills sheet before the final render.
- Backgrounds are removed for free by `puppet.py` (plain backdrop keying). Small props are code primitives. 3D models only for hero props that are on screen a lot.
- Signs with numbers, reports and scoreboards are drawn in code as image cards, not generated.

## 8. Quality bar
Vijay's 7 standards (creative/bible.md) apply to every Rick Short: satisfying visuals, clean transitions, compelling story, logical consistency, audio-visual sync, factual accuracy, premium execution. Quality beats speed. A Short that misses one is fixed before Vijay sees it.
