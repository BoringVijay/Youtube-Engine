#!/usr/bin/env python3
"""Topic scout. Pulls live signals, has Gemini turn them into idea cards, attaches REAL numbers.

Rule: every number on a card comes from a source API. Gemini only writes words
(question, angle, summary, series, audience) and subjective 1-5 scores.

Env: GEMINI_API_KEY, YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (optional, for competition check)
Output: deck/cards.json (pool, newest first), deck/seen.json (topic keys already used), deck/last_run.json
"""
import datetime as dt, hashlib, json, os, random, re, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECK = os.path.join(ROOT, "deck")
UA = "YoutubeEngineScout/1.0 (personal research tool; contact chaitanya.n321@gmail.com)"
NOW = dt.datetime.now(dt.timezone.utc)
POOL_MAX = 400
MODEL = os.environ.get("SCOUT_MODEL", "gemini-2.5-flash")
log = lambda *a: print("[scout]", *a, flush=True)


def get(url, headers=None, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def get_json(url, headers=None):
    return json.loads(get(url, headers))


def safe(name, fn):
    try:
        out = fn()
        log(f"{name}: {len(out)} items")
        return out
    except Exception as e:  # one dead source never kills the run
        log(f"{name}: skipped ({type(e).__name__}: {str(e)[:120]})")
        return []


# ---------- Sources ----------
SKIP_WIKI = re.compile(r"^(Main_Page|Special:|Wikipedia:|Portal:|File:|Help:|Talk:|Category:|Template:|User:|.*_\(disambiguation\)$|Deaths_in_|List_of_|\d{4}_in_)")


def wiki_top():
    out = []
    for back in (1, 2):
        day = NOW - dt.timedelta(days=back)
        url = f"https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/{day:%Y/%m/%d}"
        try:
            arts = get_json(url)["items"][0]["articles"]
            break
        except Exception:
            continue
    else:
        return out
    for a in arts[:120]:
        t = a["article"]
        if SKIP_WIKI.match(t):
            continue
        out.append({"src": "wikipedia", "title": t.replace("_", " "), "url": f"https://en.wikipedia.org/wiki/{urllib.parse.quote(t)}",
                    "metric": {"wiki_views_24h": a["views"]}, "key": t})
    return out[:60]


def wiki_change(article_key):
    end = (NOW - dt.timedelta(days=1)).strftime("%Y%m%d")
    start = (NOW - dt.timedelta(days=8)).strftime("%Y%m%d")
    url = ("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/"
           f"{urllib.parse.quote(article_key, safe='')}/daily/{start}/{end}")
    items = get_json(url)["items"]
    views = [i["views"] for i in items]
    if len(views) < 3:
        return None
    last, base = views[-1], max(1, sum(views[:-1]) / (len(views) - 1))
    return {"wiki_views_24h": last, "wiki_change_pct": round((last - base) / base * 100), "wiki_7d": views}


def google_trends():
    out = []
    ns = {"ht": "https://trends.google.com/trending/rss"}
    for geo in ("US", "IN"):
        root = ET.fromstring(get(f"https://trends.google.com/trending/rss?geo={geo}"))
        for it in root.iter("item"):
            title = it.findtext("title") or ""
            traffic = it.findtext("ht:approx_traffic", namespaces=ns) or ""
            pub = it.findtext("pubDate") or ""
            news = [n.findtext("ht:news_item_url", namespaces=ns) for n in it.findall("ht:news_item", ns)]
            out.append({"src": f"google_trends_{geo}", "title": title, "url": news[0] if news and news[0] else
                        f"https://trends.google.com/trends/explore?geo={geo}&q={urllib.parse.quote(title)}",
                        "metric": {"google_searches": traffic, "google_geo": geo}, "time": pub})
    return out


REDDIT_SUBS = ["OutOfTheLoop", "explainlikeimfive", "todayilearned", "Damnthatsinteresting", "interestingasfuck",
               "CryptoCurrency", "singularity", "technology", "IndiaInvestments", "wallstreetbets", "AskHistorians",
               "space", "Futurology", "movies", "NoStupidQuestions"]


def reddit():
    out = []
    for sub in REDDIT_SUBS:
        try:
            data = get_json(f"https://www.reddit.com/r/{sub}/top.json?t=day&limit=8&raw_json=1")
        except Exception:
            continue
        for c in data["data"]["children"]:
            p = c["data"]
            if p.get("stickied") or p.get("over_18"):
                continue
            out.append({"src": f"reddit_r/{sub}", "title": p["title"], "url": "https://www.reddit.com" + p["permalink"],
                        "metric": {"reddit_upvotes": p["ups"], "reddit_comments": p["num_comments"]},
                        "time": dt.datetime.fromtimestamp(p["created_utc"], dt.timezone.utc).isoformat()})
        time.sleep(1.2)
    return out


def hacker_news():
    ids = get_json("https://hacker-news.firebaseio.com/v0/topstories.json")[:30]
    out = []
    for i in ids:
        it = get_json(f"https://hacker-news.firebaseio.com/v0/item/{i}.json")
        if not it or it.get("type") != "story":
            continue
        out.append({"src": "hacker_news", "title": it.get("title", ""), "url": it.get("url") or f"https://news.ycombinator.com/item?id={i}",
                    "metric": {"hn_points": it.get("score", 0), "hn_comments": it.get("descendants", 0)},
                    "time": dt.datetime.fromtimestamp(it["time"], dt.timezone.utc).isoformat()})
    return out


def polymarket():
    data = get_json("https://gamma-api.polymarket.com/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=20")
    return [{"src": "polymarket", "title": m.get("question", ""), "url": f"https://polymarket.com/event/{m.get('slug','')}",
             "metric": {"bet_volume_24h_usd": round(float(m.get("volume24hr") or 0))}} for m in data]


def crypto_hacks():
    data = get_json("https://api.llama.fi/hacks")
    cutoff = (NOW - dt.timedelta(days=21)).timestamp()
    recent = [h for h in data if h.get("date", 0) >= cutoff]
    return [{"src": "defillama_hacks", "title": f"{h.get('name')} hack: ${round((h.get('amount') or 0)/1e6,1)}M via {h.get('technique') or 'unknown'}",
             "url": h.get("source") or "https://defillama.com/hacks", "metric": {"hack_usd": h.get("amount")},
             "time": dt.datetime.fromtimestamp(h["date"], dt.timezone.utc).isoformat()} for h in recent]


# ---------- Gemini ----------
def gemini(prompt, temperature=0.9):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": temperature}}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", "x-goog-api-key": os.environ["GEMINI_API_KEY"]})
    with urllib.request.urlopen(req, timeout=180) as r:
        resp = json.load(r)
    text = resp["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(text)


SERIES = ["What If? (stickman)", "What Actually Happened (mini-doc)", "How It Works (cutaway)",
          "Money Moves (charts)", "True Weird Stories (comic)", "Versus (scoreboard)"]
AUDIENCES = ["general curious", "students", "tech & AI", "finance & crypto", "movie & pop culture", "India-first"]

CARD_RULES = f"""You are the topic editor for a YouTube channel of animated explainers: curious, funny, smart, never generic.
Series: {SERIES}. Audiences: {AUDIENCES}.
For each card write:
- question: what a normal person would type or wonder (max 12 words)
- hook: a first line for the video (max 10 words, no greetings)
- about: 2 plain sentences on what the topic is and why it's interesting now
- surprise: the single "wait, what?" fact (only facts present in the input; otherwise a question to verify)
- series: one of the series; audience: one of the audiences
- format: "short" | "long" | "both"
- scores 1-5 with a 6-word reason each: curiosity, explainability (drawable with simple animation), shelf_life (worth watching in 6 months), money (advertiser value)
- risk: "" or a short note (tragedy, legal, medical, needs copyrighted footage)
Never invent numbers. Skip pure celebrity gossip, sports scores, obituaries and anything needing copyrighted footage.
Return JSON: {{"cards":[{{"refs":[indices of input items used],"question":"","hook":"","about":"","surprise":"","series":"","audience":"","format":"","scores":{{"curiosity":[n,"why"],"explainability":[n,"why"],"shelf_life":[n,"why"],"money":[n,"why"]}},"risk":""}}]}}"""


def write_hot_cards(items):
    lines = [f"[{i}] ({it['src']}) {it['title']}" for i, it in enumerate(items)]
    prompt = (CARD_RULES + "\n\nTurn these live signals into 25-40 distinct cards. Merge items about the same story. "
              "Prefer stories with a mechanism to explain. Signals:\n" + "\n".join(lines))
    return gemini(prompt).get("cards", [])


def write_evergreen_cards(n, seen_questions):
    avoid = "\n".join(list(seen_questions)[-150:])
    prompt = (CARD_RULES + f"\n\nWrite {n} evergreen and wildcard cards with NO news hook: bizarre what-ifs, how everyday things "
              "secretly work, weird true history, science scenarios, money mysteries, apocalypse thought experiments, "
              "movie-logic breakdowns (no clips needed). Mix all series and audiences. Make them surprising and specific. "
              "Use refs: []. Avoid these already-used questions:\n" + avoid)
    return gemini(prompt, temperature=1.1).get("cards", [])


# ---------- YouTube competition check ----------
def yt_token():
    try:
        data = urllib.parse.urlencode({"client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
                                       "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
        return json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", data))["access_token"]
    except Exception as e:
        log("youtube token: skipped", e)
        return None


def yt_competition(token, query):
    h = {"Authorization": f"Bearer {token}"}
    after = (NOW - dt.timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    q = urllib.parse.urlencode({"part": "snippet", "q": query, "type": "video", "maxResults": 10, "order": "viewCount", "publishedAfter": after})
    res = get_json(f"https://www.googleapis.com/youtube/v3/search?{q}", h)
    ids = [i["id"]["videoId"] for i in res.get("items", [])]
    if not ids:
        return {"yt_videos_7d": 0}
    vids = get_json("https://www.googleapis.com/youtube/v3/videos?" + urllib.parse.urlencode({"part": "statistics,snippet", "id": ",".join(ids)}), h)
    best = max(vids["items"], key=lambda v: int(v["statistics"].get("viewCount", 0)))
    return {"yt_videos_7d": res.get("pageInfo", {}).get("totalResults", len(ids)), "yt_top_views": int(best["statistics"].get("viewCount", 0)),
            "yt_top_title": best["snippet"]["title"], "yt_top_url": f"https://youtu.be/{best['id']}"}


# ---------- Scoring (all from numbers above) ----------
def traffic_num(s):
    m = re.match(r"([\d.]+)\s*([KM]?)", (s or "").replace(",", ""))
    if not m:
        return 0
    return float(m.group(1)) * {"": 1, "K": 1e3, "M": 1e6}[m.group(2)]


def demand_index(st):
    import math
    parts = []
    if st.get("wiki_views_24h"): parts.append(min(1, math.log10(st["wiki_views_24h"] + 1) / 6))
    if st.get("google_searches"): parts.append(min(1, math.log10(traffic_num(st["google_searches"]) + 1) / 6.3))
    if st.get("reddit_upvotes"): parts.append(min(1, math.log10(st["reddit_upvotes"] + 1) / 5))
    if st.get("hn_points"): parts.append(min(1, math.log10(st["hn_points"] + 1) / 3.3))
    if st.get("bet_volume_24h_usd"): parts.append(min(1, math.log10(st["bet_volume_24h_usd"] + 1) / 7.5))
    if not parts:
        return None
    boost = 0.1 if (st.get("wiki_change_pct") or 0) > 100 else 0
    return round(min(1, max(parts) * 0.7 + (sum(parts) / len(parts)) * 0.3 + boost) * 100)


def competition_index(st):
    if "yt_videos_7d" not in st:
        return None
    import math
    n, top = st.get("yt_videos_7d", 0), st.get("yt_top_views", 0)
    return round(min(1, (math.log10(n + 1) / 3) * 0.4 + (math.log10(top + 1) / 7) * 0.6) * 100)


def finalize(card, items, kind):
    refs = [items[i] for i in card.get("refs", []) if isinstance(i, int) and 0 <= i < len(items)]
    stats, sources, times = {}, [], []
    for r in refs:
        for k, v in r["metric"].items():
            if isinstance(v, (int, float)) and isinstance(stats.get(k), (int, float)):
                stats[k] = max(stats[k], v)
            else:
                stats.setdefault(k, v)
        sources.append({"src": r["src"], "title": r["title"], "url": r["url"]})
        if r.get("time"):
            times.append(r["time"])
        if r["src"] == "wikipedia":
            ch = safe_one(lambda: wiki_change(r["key"]))
            if ch:
                stats.update(ch)
    origin = None
    if times:
        def parse(t):
            try:
                return dt.datetime.fromisoformat(t.replace("Z", "+00:00"))
            except ValueError:
                return dt.datetime.strptime(t, "%a, %d %b %Y %H:%M:%S %z")
        parsed = sorted(((parse(t), t) for t in times), key=lambda x: x[0])
        origin = {"time": parsed[0][0].isoformat(), "hours_ago": round((NOW - parsed[0][0]).total_seconds() / 3600, 1)}
    sc = card.get("scores", {})
    sub = {k: (v[0] if isinstance(v, list) else v) for k, v in sc.items()}
    q = card.get("question", "").strip()
    return {
        "id": hashlib.sha1((q + NOW.isoformat()).encode()).hexdigest()[:12],
        "key": re.sub(r"[^a-z0-9]+", "-", q.lower())[:80],
        "created_at": NOW.isoformat(), "kind": kind,
        "question": q, "hook": card.get("hook", ""), "about": card.get("about", ""), "surprise": card.get("surprise", ""),
        "series": card.get("series", ""), "audience": card.get("audience", ""), "format": card.get("format", "both"),
        "scores": sc, "risk": card.get("risk", ""),
        "stats": stats, "origin": origin, "sources": sources,
        "demand": demand_index(stats), "competition": None,
        "quality": round(sum(sub.get(k, 3) for k in ("curiosity", "explainability", "shelf_life", "money")) / 20 * 100),
    }


def safe_one(fn):
    try:
        return fn()
    except Exception:
        return None


def main():
    os.makedirs(DECK, exist_ok=True)
    pool = json.load(open(os.path.join(DECK, "cards.json"))) if os.path.exists(os.path.join(DECK, "cards.json")) else []
    seen = set(json.load(open(os.path.join(DECK, "seen.json")))) if os.path.exists(os.path.join(DECK, "seen.json")) else set()

    items = []
    for name, fn in [("wikipedia", wiki_top), ("google_trends", google_trends), ("reddit", reddit),
                     ("hacker_news", hacker_news), ("polymarket", polymarket), ("crypto_hacks", crypto_hacks)]:
        items += safe(name, fn)
    random.shuffle(items)
    items = items[:220]

    new = []
    if items:
        for c in safe("gemini_hot", lambda: write_hot_cards(items)):
            new.append(finalize(c, items, "hot"))
    for c in safe("gemini_evergreen", lambda: write_evergreen_cards(15, [p["question"] for p in pool])):
        new.append(finalize(c, items, "evergreen"))

    new = [c for c in new if c["question"] and c["key"] not in seen]
    tok = yt_token() if os.environ.get("YT_REFRESH_TOKEN") else None
    if tok:  # search costs quota; check the 25 most promising
        ranked = sorted(new, key=lambda c: (c["demand"] or 0) + c["quality"], reverse=True)[:25]
        for c in ranked:
            st = safe_one(lambda: yt_competition(tok, c["question"]))
            if st:
                c["stats"].update(st)
                c["competition"] = competition_index(c["stats"])

    for c in new:
        d, comp = c["demand"], c["competition"]
        c["opportunity"] = round((d if d is not None else 45) * 0.45 + c["quality"] * 0.4 + (100 - (comp if comp is not None else 50)) * 0.15)
        seen.add(c["key"])

    pool = (new + pool)[:POOL_MAX]
    json.dump(pool, open(os.path.join(DECK, "cards.json"), "w"), indent=1)
    json.dump(sorted(seen), open(os.path.join(DECK, "seen.json"), "w"))
    json.dump({"ran_at": NOW.isoformat(), "new_cards": len(new), "pool": len(pool), "signals": len(items)},
              open(os.path.join(DECK, "last_run.json"), "w"), indent=1)
    log(f"done: {len(new)} new cards, pool {len(pool)}")
    if not new:
        sys.exit("No cards produced. Check the logs above.")


if __name__ == "__main__":
    main()
