#!/usr/bin/env python3
"""Spend ledger. Every paid call is logged with an estimated cost; the engine checks caps before spending.

ledger/ledger.json: {"entries": [{"at", "job", "kind", "units", "usd", "backend"}], "total": usd}
"""
import datetime as dt, json, os, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config", "budget.json")))
PATH = os.path.join(ROOT, "ledger", "ledger.json")
_lock = threading.Lock()


class OverBudget(RuntimeError):
    pass


def _load():
    if os.path.exists(PATH):
        return json.load(open(PATH))
    return {"entries": [], "total": 0.0}


def _save(d):
    os.makedirs(os.path.dirname(PATH), exist_ok=True)
    json.dump(d, open(PATH, "w"), indent=1)


def price(kind, units=1.0):
    return round(CFG["prices_usd"][kind] * units, 4)


def spent(job=None):
    d = _load()
    return round(sum(e["usd"] for e in d["entries"] if job is None or e.get("job") == job), 3)


def check(job, kind, units=1.0, cap=None):
    """Raise OverBudget if this call would cross the per-video or total cap."""
    cost = price(kind, units)
    if spent() + cost > CFG["total_usd"]:
        raise OverBudget(f"total budget of ${CFG['total_usd']} reached (spent ${spent():.2f})")
    cap = cap or CFG["per_video_usd"]
    if job and spent(job) + cost > cap:
        raise OverBudget(f"video cap ${cap} reached for {job} (spent ${spent(job):.2f})")
    return cost


def log(job, kind, units=1.0, backend=""):
    with _lock:
        d = _load()
        usd = price(kind, units)
        d["entries"].append({"at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "job": job, "kind": kind,
                             "units": round(units, 2), "usd": usd, "backend": backend})
        d["total"] = round(sum(e["usd"] for e in d["entries"]), 3)
        _save(d)
        return usd


def summary():
    d = _load()
    by_job = {}
    for e in d["entries"]:
        by_job[e.get("job") or "other"] = round(by_job.get(e.get("job") or "other", 0) + e["usd"], 3)
    return {"total": d["total"], "cap": CFG["total_usd"], "window_ends": CFG["window_ends"], "per_video_cap": CFG["per_video_usd"], "by_job": by_job}
