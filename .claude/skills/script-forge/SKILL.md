---
name: script-forge
description: Write a Curious Penguin script (Short 35-55s or long 4-7 min) from an approved topic, with hooks, beats, scene plan, voice direction and sound cues, scored against a rubric before it ships.
---

# Script Forge

You write scripts for **Curious Penguin**, a curiosity channel where every video is a different visual universe (see `creative/bible.md`). Never write stick figures into visual cues. Curious topics, explained so a 14-year-old gets it and an engineer nods. Every script goes through the same 7 stages. Never skip a stage. Never ship below the rubric bar.

Read these first, every time:
- `references/voice-bible.md` — who the narrator is, how he talks, humor and opinion rules
- `references/hooks.md` — hook patterns that work and ones that are banned
- `references/structures.md` — beat sheets for each format
- `learnings.md` (repo root) — what our own analytics taught us. **This overrides generic advice.**

## Inputs
- `topic`, `format` (`short` | `long`), optional `angle`, `references` (links or notes from the user), `facts` (from topic-scout)

## Stage 1: Find the angle (do not write yet)
Answer in one line each:
1. **The question a normal person would actually type.** ("How do you steal $6 billion in 20 minutes?")
2. **The surprise.** The one fact that makes people say "wait, what?"
3. **The stakes for the viewer.** Why should someone in Bangalore or Ohio care?
4. **Our take.** One honest opinion we will say out loud. Neutral by default, but the take is never mush.
5. **The roast target.** One thing (never a private person, never a group identity) that deserves a gentle jab.

6. **The penguin's role.** Cast it per `creative/bible.md`: protagonist, sidekick, villain, antagonist, NPC or cameo, whichever makes this story funnier or clearer. If it is a lead, sidekick or villain, write it into the visual cues of most beats. It never speaks; the narrator may mention it in passing.

If you cannot fill 2 and 4, the topic is weak. Say so and stop.

## Stage 2: Facts first
- List every factual claim the script will make, with its source link.
- Numbers: round for the ear ("about six billion"), keep exact values in the fact sheet.
- Unverified claims get cut or framed as "reportedly" / "investigators think". Science must be right. If a what-if scenario involves physics, check the mechanism, not just the conclusion.
- Never invent quotes. Never put words in a real person's mouth.

## Stage 3: Hooks
Write **5 hook options** using different patterns from `references/hooks.md`. Each must:
- Land the core promise in the first sentence (under 2.5 seconds spoken, about 8 words)
- Match the first visual (write the visual next to it)
- Be deliverable by the script. No bait we can't pay off.
Pick the best one and say why in one line.

## Stage 4: Beat sheet
Use the structure for the format from `references/structures.md`. For each beat: purpose, the line of tension it opens or closes, and the visual idea. Mark:
- `[LOOP OPEN]` / `[LOOP CLOSE]` for curiosity loops (long: 2-3 loops, never more than 2 open at once; short: 1 loop)
- `[REHOOK]` every ~45-60s in long videos (a new question, a twist, a stakes raise)
- `[TAKE]` where our opinion lands
- `[JOKE]` where humor lands (short: 1-2, long: one every ~40s, never during the scariest or saddest beat)

## Stage 5: Draft for the ear
Rules:
- Write how people talk. Contractions. Short sentences. One idea per sentence.
- Words per minute: ~165 for narration. Short = 95-150 words. Long 4-7 min = 650-1,150 words.
- Every 2-3 sentences, something changes on screen. Write the visual cue in brackets. Each cue is a new image (new angle, set or detail), never the same hero shot again.
- One number per fact. Use the same rounded figure every time it is said, and keep the exact value in the fact sheet.
- Analogies over jargon. When a nerd term is needed, say it once, then translate ("a private key, basically the master password to the vault").
- Give the nerds one "bonus" detail per segment that's precise and correct.
- No lists announced as lists ("number three..."). Use transitions that pull forward: "But here's the thing." "Which sounds fine. Until..." "And that's where it gets weird."
- End on a payoff or a twist, then a 1-line soft CTA that's in character. Never "smash that like button".

## Stage 6: Punch-up pass
Read the draft as the narrator from `voice-bible.md`. Then:
- Cut 15% of words. Kill every sentence that only restates.
- Replace 3 generic words with specific ones (numbers, names, sensory detail).
- Check every joke: does it come from the subject, not from a template? If it's a meme-format joke, cut it.
- Check the take: is it clear, fair, and said once with confidence?
- Read the first 3 seconds alone. Would you stop scrolling? If not, back to Stage 3.

## Stage 7: Score and ship
Score with `references/rubric.md`. **Ship only if total ≥ 40/50 and no category below 3.** Otherwise revise the weakest category and re-score (max 3 rounds, then flag to the user with the blocker).

## Output (write `jobs/<id>/script.json`)
```json
{
  "id": "", "format": "short|long", "title_options": ["", "", ""],
  "hook_options": [{"line": "", "visual": "", "pattern": ""}], "chosen_hook": 0,
  "beats": [{"t": "0:00", "purpose": "", "vo": "", "visual": "", "sfx": [], "music": "", "tags": ["LOOP OPEN"]}],
  "vo_direction": "overall delivery notes for the TTS style prompt",
  "facts": [{"claim": "", "source": ""}],
  "thumbnail_ideas": [{"text": "max 4 words", "image": ""}],
  "rubric": {"hook": 0, "clarity": 0, "story": 0, "personality": 0, "accuracy": 0, "visuals": 0, "pacing": 0, "payoff": 0, "packaging": 0, "originality": 0, "total": 0},
  "risks": ["anything legally, factually or policy sensitive"]
}
```
Also write `jobs/<id>/script.md`: the clean VO text only, with inline delivery tags for the voice model, like `[beat]`, `[dry]`, `[whisper]`, `[faster]`.
