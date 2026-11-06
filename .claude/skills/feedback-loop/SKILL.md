---
name: feedback-loop
description: Weekly retro for the WHAT IF? channel. Reads YouTube analytics and the user's review notes, finds what worked and what didn't, and updates learnings.md, the script rubric, hook library and scout weights with a dated changelog.
---

# Feedback Loop

The system gets better only if every video teaches us something and that lesson ends up in the files the other skills read. Run weekly, and after any video that over- or under-performs by 3x.

## Inputs
- `analytics/latest.json`: per video views, CTR, average % viewed, retention curve points, subs gained, comments
- `jobs/*/script.json` for those videos (hook pattern, structure, jokes, take)
- `reviews/*.md`: the user's notes from the control panel (rejections, edits, "send back" reasons)

## Steps
1. **Rank** last week's videos by average % viewed (Shorts) and by CTR × average view duration (long).
2. **Find the drop points.** For each video, the second where retention falls fastest. Look up the line and visual playing there.
3. **Compare winners vs losers** on: hook pattern, first visual, word count, topic category, joke density, take strength, voice style.
4. **Read the user's edits.** Any phrase or pattern the user changed twice or more becomes a rule.
5. **Write lessons** to `learnings.md` as short rules with evidence: `- Absurd-number hooks beat questions (avg 78% vs 61% viewed, n=6). 2026-11-14`
   - A lesson needs n ≥ 3 videos or 2 user edits. Below that, log it under "Hunches".
6. **Patch the system**, only where evidence supports it:
   - `script-forge/references/hooks.md`: promote or demote patterns
   - `script-forge/references/rubric.md`: tighten a bar that let a weak video through
   - `topic-scout` weights: if a factor predicts views better, shift up to 0.05 per week
   - `voice-bible.md`: add banned phrases the user cut
7. **Changelog**: append to `CHANGELOG.md` what changed, why, and what result we expect next week. Next run checks whether it happened; revert changes that didn't help after 2 weeks.

## Guardrails
- Never chase a single viral outlier. One video is a story, not a rule.
- Never change more than 3 things per week, or we won't know what worked.
- Never loosen accuracy or safety rules for views.
