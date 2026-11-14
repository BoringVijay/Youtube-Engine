# RicksClips3000: full channel teardown (2026-11-15)

Method: reverse-engineer-winner on all 151 Shorts. Sources:
- **Channel list, views and publish dates:** the YouTube page data.
- **Transcripts:** word-timed for 149 of 151 (two have no captions).
- **Frames:**
  - Per-frame stats with the caption band masked, on the newest videos (only 4 captured at 19+ fps, the rest too thin).
  - Contact sheets at one frame per 2 s for 9 explainers we had no sheets for.
  - The 20 contact sheets (1,200 frames) and 7 measured reports in `creative/skills/cartoon-3d-short/references/` (32,337 frames measured).
  - A thumbnail wall of all 151.

Private study only. Never copy their scripts, characters or shots, and never name the channel in our videos.

## 1. The channel has had three lives

| Era | Dates | Videos | What it is | Median views | Total |
|---|---|---|---|---|---|
| A. Movie recaps | Aug 2025 - Feb 2026 | 8 | Live-action sci-fi film clips with narration, 71-109 s, "#shorts #movie" | 39K | ~16M (15M is one fluke) |
| B. Comic skits | Apr - Aug 2026 | 114 | Someone's comic panels voiced as a 5-20 s one-joke skit, over Minecraft parkour footage | 544K (45 of 114 over 1M) | ~158M |
| C. Doodle explainers | 6 Oct - 13 Nov 2026 | 29 | Original animated story-explainers, 31-78 s (median 61 s), 2D for 3 videos, then 3D from about 10 Oct | **9.3M** | **~271M in 5.5 weeks** |

**What changed when views jumped 17x:** an original story with a hidden mechanism, told in 60 s, in a premium look. The posting rate did NOT drop: they went to almost one a day (29 videos in 39 days).

The seed was already in era A. The only movie recap that popped (15M, "He Was A Genius") is a man doing something that looks stupid with money. The trick is explained at the end. Every sci-fi what-if recap around it ("Would You Play?", "A World Based On Ratings") died at 20-40K. Era C is that one winner, rebuilt as an original.

## 2. Inside era C: which premise types win (29 videos)

| Premise type | Videos | Median | Range |
|---|---|---|---|
| **Weird action → hidden real mechanism** ("He did X that looks insane... you see, Y") | 21 | **9.6M** | 1.6M - 34M |
| What-if, second person, ending on "would you?" | 2 | 5.6M | 3.9M - 7.2M |
| Survival fact, 2D | 1 | 1.0M | |
| Fiction-world parable (memories as money, the button town) | 2 | 2.2M | 0.55M - 3.8M |
| Escalating list ("Levels of pirate cannonballs") | 1 | 9.8M | |
| **Pure explainer with no character story** (painkillers, slot machines) | 2 | **0.23M** | 0.14M - 0.32M |

Rules this proves:
- The **character doing something strange with stakes** carries the video, not the fact. The same science with no protagonist got 2-3 % of the views.
- **Pure fiction underperforms true or "really happened" mechanisms.** The viewer's payoff is "wait, that's real?".
- **What-ifs work when they end on a moral choice** put to the viewer ("would you still step inside?"). That is a comment-starter.
- Short is fine when the story is there: 39-41 s videos did 16M, 6.7M and 1.6M. The two 31-34 s flops failed because they had no protagonist, not because of length.

## 3. Script anatomy (measured over the 29 transcripts)

- **Length and pace:** 55-67 s typical, 3.4-4.1 words/s (median 3.7). There are almost no pauses, but the sentences are written short. The voice is not sped up.
- **Hook:** sentence one, 5-23 words (median about 14), as one of three patterns:
  - **Third-person absurd action (17 of 29):** "He [did insane thing with an object]", then the story drops into present tense. The hook is the moment that makes sense only at the end.
  - **Second-person rule or question (10):** "If you X, you'd Y" / "Imagine you're...".
  - **Paradox:** "X is illegal, yet...".
- **"You see," pivot:** in 19 of 29. Sometimes it comes as line 2 (backfill the context), sometimes at about 65 % (the mechanism).
- **The mechanism is always an everyday analogy:**
  - blowing on soup
  - a phone sliding off a table
  - a car taking a hairpin
  - floor buttons in a lift
  - a house full of smoke alarms
- **A mocking-crowd beat:** someone laughs at the hero with a one-line quip. The quip is a meme-able joke line ("are we fighting them or grating cheese?", "Barbie's going to love it in here"). This is the comedy engine: the doubters get a funny line, then they get proved wrong.
- **Wait-what beat:** "Wait, what?" / "How is that possible?" / "Wait, practiced?" spoken by the narrator at about 40 % (explicit in 6; implied as a doubter's question in most others).
- **Escalation with numbers that shrink or grow:**
  - gaps "a coin" → "a sheet of paper"
  - 15 → 20 minutes
  - 1 inch a night
  - 47 → 48 scratches
- **Ironic payoff on the last word.** The video ends mid-motion on that word, so it loops. Many end on the destroyer (the rival, the pirates, the doubter) getting hit by their own choice.
- **No outro, no call to action, no logo.** The voice starts on frame 1.

## 4. Picture and edit (measured)

- **Literal illustration of every line:**
  - "his face goes purple" → the boss turns purple
  - "the newspapers call it" → a newspaper insert
  - "a week went by" → a bird nests on the king's head
- **Time and mood are told with light:** day → golden → night-blue for danger or scheming → warm candle or galley for the reveal. A whole-video luma shift of 0.46 → 0.32 when a storm hits.
- **Scale shots:** an aerial of 10,000 soldiers as tiny figures, a canyon, an army packed shoulder to shoulder. Each video has 1-2 epic wides, the rest is close and mid.
- **Analogy scene:** the "you see" analogy gets its own mini-set (soup bowl top-down, car on a hairpin road, blueprint diagram).
- **The ending is a spectacle:** 4 of the newest 6 end on an explosion, derailment or wave hit. Big physical payoff on the final word.
- **Props carry the joke:** a "YEARS AT WAR 099→100" counter, then "DAYS OF PEACE 001" as the callback; a STORM OIL tin; a STEP INSIDE? sign.
- **Camera:**
  - Moves in about 65-97 % of frames. No dead holds.
  - Older videos: 0-3 hard cuts. The newest six: 10-17 visual jumps per 63 s, so the edit is getting faster.
  - Ease-in-out glides of about 23 f; 6-7 f impact kicks. Details in `creative/skills/cartoon-3d-short/references/reports/motion.md`.
- **Characters:**
  - White bean heads, stick limbs, hats and moustaches for identity.
  - Faces react on the word; the hats are what makes the cast readable.
  - The head is big but sits on a body with a clear costume. That is a cartoon proportion, not the pasted-on look we got wrong in the Emu War.
- **Captions:** one word at a time, white bold with a black outline, at about 60-74 % of the height.

## 5. What we take, what we never take

Take the structure:
- an absurd action hook
- a doubters' quip
- "wait, what"
- escalating numbers
- the "you see" plus an everyday analogy
- an ironic final-word payoff
- lighting by beat, a spectacle ending, literal illustration

Never take: their stories, their lines or quips, their characters or looks shot for shot, or their name. Our edge over them:
- our niche lanes (survival, apocalyptic, exploration) where they have almost nothing
- our second-watch background chaos, which they barely do (their backgrounds are clean)
- relatable meme comedy in the quips

## 6. The blueprint applied to our five lanes

Test hooks (to validate the blueprint; facts to be checked before use):
- **Exploration / weird true:** "He walked his dog into a cave, and only the dog collapsed." (Grotta del Cane: a CO2 layer that sits at knee height.)
- **Survival:** "He filled his bathtub the minute the power went out, and the whole street laughed at him."
- **What-if (second person + choice):** "Imagine every ad on Earth disappeared tomorrow. You'd lose more than you think." It ends on "would you pay for it?".
- **Apocalyptic:** open on one absurd action that only makes sense in the collapse, then the mechanism, then the ironic payoff.

See `blueprint.v1.json` for the beat template and `theme.v1.json` for the archetypes.
