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

## 4. The penguin universe (Vijay, 2026-11-14)
There is no penguin character. The penguin lives on as a hidden universe inside every world, the way Pixar hides the Pizza Planet truck: the businesses, signs and products of each world quietly belong to a penguin and Antarctica brand family.
- **Every video: one obvious, one subtle.** Obvious: a named place or product the story passes through ("South Pole Pizza", "Emperor Savings & Loan", "Adélie Air", "Gentoo Motors", "Krill Coffee Co.", "90°S"). Subtle: something most people miss first time (a cloud shaped like a penguin, "77°S" scratched on a crate, a tuxedo-black-and-white car, an iceberg on a calendar, a fridge magnet, a penguin-footprint degree symbol).
- **Never the same reference twice in a row.** Rotate brands and invent new ones. They fit the world's era and place: a 1932 crate says "Emperor Munitions Co.", a 2091 ad says "Adélie Air".
- **Premium design.** Every brand is a real-looking modern or period identity with good typography. Penguins in logos have eyes and character, never a plain blob silhouette.
- **Never real penguin IP.** No Penguin Books, Pingu, Club Penguin, Tux (Linux), the Pittsburgh Penguins, Batman's Penguin or the Madagascar penguins.
- **Never on a serious or tragic beat, never the subject of a shot.**
- The brand family lives in `rick/brand/`. Signs are image cards placed in the stage, so a brand looks identical wherever it reappears.

## 4b. House style and creative direction (Vijay, 2026-11-14)
The bar: it should feel like a premium drama series or top creator content, almost too good to be free. Real places, relatable people, physical stakes, one unexpected creative element, a reason for every shot. Nothing flashy, nothing that looks AI-made.
- **Colour:** natural, colourful, realistic palettes that fit the place and era (the wheat-field style frame is the reference). Blue is a rare accent: ice blue #8FD8F5 on one small thing per video at most (a ribbon, a sign, a light). Never a blue wash or a blue grade.
- **Captions:** the measured Rick style: heavy modern sans, 1 to 2 words, white fill with a black outline, centred at y 1350, changing on the word. Occasionally one keyword in a colour that belongs to the story (warning red, sun yellow), or black text on a light plate when the shot is bright. Clean and simple; no gimmick animations.
- **Line and light:** deep navy-plum outline #1F1A2E with rounded ends, flat colour with one cel-shadow tone and a soft warm rim light, a very fine paper grain. 2 or 3 meaningful costume details per character, all on the torso and head; limbs stay simple sticks for the rig.
- **People:** natural skin tones (test 2026-11-14), dot eyes with a tiny highlight. The cast comes from wherever the story really happens, with authentic, respectful clothing.
- **Every shot earns its place:** if a shot doesn't move the story, carry a fact or land a joke, it goes.

## 4c. Sound (Vijay, 2026-11-14)
- **Voice: Chris (ElevenLabs v3) on every video.** Same voice, delivery shifts with the story through sparing v3 tags ([deadpan], [sighs], [mischievously], [laughs softly], [curious]): 3 or 4 per video, never theatrical. Calm and matter-of-fact by default.
- **Music bed:** quiet under the voice, lifted only in gaps.
- **Scene cues:** a sneaky tiptoe cue for background gags, a pompous cue for overconfidence, silence right before a punchline.
- **Stings on funny beats, 3 to 6 per video:** record scratch, crickets, sad trombone, a tiny kazoo fanfare, a bonk. They make the edit feel human-made. All original (generated or YouTube Audio Library), never ripped from TikTok or Instagram.
- The sound library lives in each project's sfx/ and is copied forward and reused.

## 5. Continuity (what stops the AI look)
- Style test lessons (2026-11-14): characters are generated one per image with the approved master as reference. A multi-character sheet drifted into generic corporate vector art. Flat graphics (logos, signs, badges) can share one sheet and be cropped, and look just as good. The rig needs stick arms and a head about as wide as the torso; tailored coat sleeves break the puppet slicing, so styling goes on the torso, not the limbs.
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
