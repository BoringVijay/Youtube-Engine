# YouTube Engine

The engine behind the channel: topic scouting, scripts, voice, rendering, upload, analytics and comment replies. The control panel lives as a Claude artifact; this repo does the heavy lifting on GitHub Actions.

## Layout
- `.claude/skills/` — script-forge, topic-scout, feedback-loop (the quality rules)
- `src/` — Remotion design kit and video templates
- `jobs/<id>/` — one folder per video: script, assets, renders
- `queue/`, `history/`, `analytics/`, `reviews/` — engine state
- `learnings.md`, `CHANGELOG.md` — what the channel has learned, and what changed

## Secrets (repo Settings > Secrets and variables > Actions)
| Name | What |
| --- | --- |
| `GEMINI_API_KEY` | From aistudio.google.com |
| `YT_CLIENT_ID` | `client_id` from the OAuth JSON |
| `YT_CLIENT_SECRET` | `client_secret` from the OAuth JSON |
| `YT_REFRESH_TOKEN` | Printed by `scripts/get_youtube_token.py` |

Never commit keys. `.gitignore` blocks the usual files.

## Render locally
```
npm install
npx remotion render src/index.ts MoonShort out/moon.mp4
```
