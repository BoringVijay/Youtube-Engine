---
name: topic-scout
description: Find and score WHAT IF? video topics from mainstream and offbeat sources (Reddit, YouTube outliers, X, Wikipedia spikes, crypto hack trackers, prediction markets), then write the top picks to the control panel queue.
---

# Topic Scout

Goal: every run, hand the user **5 ranked topics** that are hot, explainable with stickman visuals, and still worth watching in 6 months. Plus 2 evergreen picks for slow days.

## 1. Sweep sources (skip any that fail, note which)
Hot right now:
- **Wikipedia top pageviews**, yesterday, en + India (`wikimedia.org/api/rest_v1/metrics/pageviews/top/...`). New entries in the top 100 are gold.
- **r/OutOfTheLoop** (people literally asking "what happened?"), r/explainlikeimfive, r/NoStupidQuestions, r/todayilearned
- **r/CryptoCurrency, r/Bitcoin**, plus **rekt.news** and DeFiLlama's hacks list for crypto heists
- **r/singularity, r/LocalLLaMA, Hacker News front page** for AI and tech
- **r/IndiaInvestments, r/IndianStreetBets, r/wallstreetbets** for finance weirdness
- **Polymarket / Kalshi** top markets: what people are betting money on is what they care about
- **YouTube outliers**: videos in our formats with views > 5x the channel's subscribers in the last 14 days
- **X**: lists of journalists and researchers in AI, crypto security, finance (use search for the topic + "thread")

Evergreen and weird:
- r/AskScience, r/AskHistorians, r/AskEngineers, r/Damnthatsinteresting, r/interestingasfuck, r/whatif
- Wikipedia "Did you know" and "Unusual articles" lists
- Patents, court filings and old newspaper archives for strange true stories
- Our own comments: questions viewers asked under past videos

## 2. Turn raw items into topics
For each candidate, write: the question a normal person would type, the surprise, why it suits stickman visuals, 2-3 source links. Drop anything that needs real footage to make sense, or that is mainly a tragedy with nothing to explain.

## 3. Score (1-5 each, weighted)
| Factor | Weight | 5 means |
| --- | --- | --- |
| Heat | 0.20 | Spiking in the last 24-72 h across 2+ sources |
| Curiosity gap | 0.25 | A "wait, how?" question most people can't answer |
| Explainability | 0.15 | Clear mechanism, drawable in simple shapes |
| Gap | 0.15 | Top YouTube results are old, dry, or missing |
| Shelf life | 0.15 | Still worth watching in 6 months |
| Money | 0.10 | Topic attracts higher-paying advertisers (finance, tech) |

Total ≥ 3.6 → recommend. Below → park in the Evergreen Bank with a note.

Gate (creative/bible.md, Grounded storytelling): before recommending, write one line answering "what physical thing fails on screen in the first 20 seconds?" and one line naming the obvious approach that fails. No answer, no recommendation. Tag ideas that fit the Rick Shots lane (a true hidden-reason or loophole story with two sides and a karma ending) with `"lane": "rick"`.

## 4. Safety screen
Skip or flag: active tragedies with victims still being counted, medical advice, specific trading calls, defamation risk about private people, anything needing copyrighted footage.

## 5. Output
Append to `queue/ideas.json` (one object per topic): `id, created_at, question, angle, surprise, format_suggestion (short|long|both), score_breakdown, total, sources[], risks[]`. Never repeat a topic already in `history/topics.json`.
