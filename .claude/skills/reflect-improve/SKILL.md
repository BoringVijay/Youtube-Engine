---
name: reflect-improve
description: Curious Penguin retro. Reads review notes, redo requests, spend, review sheets and YouTube numbers, finds what is working, and makes at most 3 evidence-backed changes to the creative bible, director, voice, scout or budget, logged in CHANGELOG.md. Run weekly or on demand.
---

# Reflect & Improve

The engine only gets better if every video teaches something and the lesson lands in a file the engine reads. This skill is that loop. Run it weekly (scheduled) and whenever Vijay asks ("reflect", "what did we learn", "improve the engine").

## Where the evidence lives (repo BoringVijay/Youtube-Engine)
- `jobs/*/state.json`: stage history, `notes_in` (his approve and redo notes, the strongest signal), `cost`, `universe`, `cameos`, `meta`
- `jobs/*/direction.json`: the universe, look bible, shot list, cameos, overlays the director chose
- `jobs/*/review/*.jpg`: contact sheets of every cut. Look at them (Read the images). Judge them against `creative/bible.md`
- `jobs/*/sections.json`, `words.json`: voice takes, alignment match rate
- `ledger/ledger.json`: spend per video and per kind (image, video, tts, text)
- `logs/produce-last.log`, `logs/scout-last.log`: errors, retries, rate limits, timings
- `analytics/*.json` (once the analytics sync exists): views, CTR, average % viewed, retention, subs, comments. Comments mentioning the penguin are gold
- `deck/cards.json` + panel swipes (Drive outbox `swipes` export when available): which topics he likes vs passes
- `learnings.md` (rules + hunches) and `CHANGELOG.md` (what changed before, and what we expected)

## Steps
1. **Check last week's bets.** Read `CHANGELOG.md`. For every change with an expected result, say whether it happened. Revert anything that did not help after 2 weeks.
2. **Read his notes first.** Every redo or approve note is a direct instruction about taste. Any pattern he asked for twice becomes a rule.
3. **Look at the cuts.** For each new review sheet: are shots varied (no repeated compositions)? Is the penguin on model (eye-rings, orange beak, orange feet, three-feather tuft)? Any text glitches, logos, stick figures, empty frames? Do overlays carry real numbers with units? Note concrete failures with the shot id.
4. **Numbers (when analytics exist).** Rank videos by average % viewed (Shorts) and CTR x average view duration (long). Find each video's steepest retention drop and look up the line and shot playing there. Compare winners vs losers on: universe, hook shot, first 3 seconds, cut rhythm, cameo count and type, motion shots, voice, length, topic type.
5. **Craft and cost.** From logs and ledger: average cost per test cut and per final, time per stage, failure causes. Flag anything trending toward the per-video cap or the $280 total before 2027-02-04.
6. **Write lessons** to `learnings.md` as short rules with evidence and a date, e.g. `- Claymation universes keep 12% more viewers past 0:30 than paper (n=4). 2026-11-21`. Need n >= 3 videos or 2 of his notes; otherwise file it under Hunches.
7. **Change at most 3 things**, smallest effective edits, only where evidence supports them:
   - `creative/bible.md`: universes to favour or retire, cinematography, cameo rules, sound rules
   - `scripts/director.py` prompt: shot count, motion picks, overlay rules, banned patterns
   - `scripts/voice.py` PROFILE or `config/voice.json`: delivery notes, narrator, accent
   - `scripts/scout.py` weights or sources: what topics to surface more
   - `config/budget.json`: caps and price estimates (never raise the total above what Vijay approved)
8. **Changelog.** Append to `CHANGELOG.md`: date, what changed, the evidence, and what you expect to see next time. Commit with a clear message and push.
9. **Report** to Vijay in 5 lines max: what worked, what didn't, the 3 changes, what to watch. Casual, punchy, no em dashes.

## Guardrails
- One video is a story, not a rule. Don't chase a single outlier.
- Never weaken accuracy, copyright or safety rules to chase views. Never add copyrighted audio or real logos.
- Keep the penguin's fixed traits. Never make it the narrator.
- Don't rewrite his voice: lessons about scripts adjust structure and delivery, not his wording.
- If evidence is thin, change nothing and say so.
