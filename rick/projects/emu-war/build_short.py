#!/usr/bin/env python3
"""Builds short.json for the Emu War pilot (v2).
v2 fixes from the first stills check: hard cuts between locations and into close-up cards (no 70 m glides),
tighter framing, emus in front of the wheat with their natural side heads (front faces only in close-ups),
no fake water or ball trees, a real office floor, crates as wood boxes with a keyed front, warm golden hour
instead of a purple dusk. Every cue phrase is checked against audio/words.json before anything is written."""
import json, os, random, re

os.chdir(os.path.dirname(os.path.abspath(__file__)))
random.seed(7)
W = json.load(open('audio/words.json'))['words']
tok = lambda x: re.sub(r"[^a-z0-9' ]+", " ", x.lower().replace("’", "'")).split()
wn = ["".join(tok(w['w'])) for w in W]


def check(ph):
    want, nth = tok(ph.split('#')[0]), int(ph.split('#')[1]) if '#' in ph else 1
    for i in range(len(wn) - len(want) + 1):
        if all(wn[i + j] == t for j, t in enumerate(want)):
            nth -= 1
            if not nth:
                return W[i]['t0']
    raise SystemExit("MISSING: " + ph)


# locations: farm, dam, office, second office (phone call), road, close-up board
LOC = {"A": (0, 0, 0), "B": (70, 0, 0), "C": (0, 0, -70), "C2": (45, 0, -70), "R": (0, 0, 45), "I": (-70, 0, 0)}
P = lambda o, x, y, z: [LOC[o][0] + x, LOC[o][1] + y, LOC[o][2] + z]

chars = [
    {"id": "major", "puppet": "rigs/major", "pos": P("A", 0, 0, 0), "height": 1.8},
    {"id": "farmer", "puppet": "rigs/farmer", "pos": P("A", -3.2, 0, 0.8), "height": 1.8},
    {"id": "gunner", "puppet": "rigs/gunner", "pos": P("A", 5.5, 0, 1.5), "height": 1.75},
    {"id": "driver", "puppet": "rigs/driver", "pos": P("A", 6.6, 0, 1.4), "height": 1.75, "flip": True},
    {"id": "major-b", "puppet": "rigs/major", "pos": P("B", -1.6, 0, 2.2), "height": 1.8},
    {"id": "minister", "puppet": "rigs/minister", "pos": P("C", -0.6, 0, 0.4), "height": 1.75},
    {"id": "minister-phone", "puppet": "rigs/minister-phone", "pos": P("C2", -0.6, 0, 0.4), "height": 1.75},
    {"id": "major-salute", "puppet": "rigs/major-salute", "pos": P("R", 0, 0, 0), "height": 1.8},
    {"id": "major-defeat", "puppet": "rigs/major-defeat", "pos": P("R", 30, 0, 0), "height": 1.8},
    {"id": "emu-sprint", "puppet": "rigs/emu-sprint", "pos": P("B", -9, 0, -2.5), "height": 1.7},
]
# farm emus: in the field between the fence (z -4.6) and the wheat (front edge z -8), natural side heads
for i in range(14):
    chars.append({"id": f"emu-a{i}", "puppet": "rigs/emu", "pos": P("A", -7 + i * 1.05 + random.uniform(-.3, .3), 0, -5.4 - random.uniform(0, 2.2)),
                  "height": 1.75 + random.uniform(-.1, .1), "flip": random.random() < .5})
# dam emus
for i in range(10):
    chars.append({"id": f"emu-b{i}", "puppet": "rigs/emu", "pos": P("B", 1 + i * 0.9 + random.uniform(-.3, .3), 0, -3 - random.uniform(0, 4)),
                  "height": 1.75 + random.uniform(-.1, .1), "flip": random.random() < .5})

crate = lambda o, x, z, ry=0: [
    {"type": "box", "pos": P(o, x, 0, z), "size": [1.12, 0.75, 0.7], "texture": "tex/wood.png", "repeat": [1, 1], "rotY": ry},
    {"type": "plane", "pos": P(o, x, 0, z + 0.36), "size": [1.12, 0.75], "image": "cards-final/crate-front.png", "rotY": ry}]
office = lambda o: [
    {"type": "box", "pos": P(o, 0, 0.005, 0), "size": [24, 0.02, 24], "texture": "tex/wood.png", "repeat": [6, 6]},
    {"type": "wall", "pos": P(o, 0, 0, -2.4), "size": [24, 4, 0.2], "texture": "tex/panelling.png", "repeat": [8, 1]},
    {"type": "wall", "pos": P(o, -5, 0, 4), "size": [0.2, 4, 13], "texture": "tex/panelling.png", "repeat": [4, 1]},
    {"type": "plane", "pos": P(o, 1.5, 0, 0.2), "size": [2.2, 2.1], "image": "cards-final/desk.png"}]

props = [
    # farm
    {"type": "wall", "pos": P("A", 0, 0, -14), "size": [40, 1.1, 12], "texture": "tex/wheat.png", "repeat": [10, 1]},
    {"type": "house", "pos": P("A", -14, 0, -2), "size": [5, 3, 4], "wall": "tex/wood.png", "roof": "#8d9298", "rotY": 25},
    *[{"type": "post", "pos": P("A", x, 0, -4.6), "h": 1.3, "color": "#6b5a48"} for x in range(-12, 14, 2)],
    {"type": "wall", "pos": P("A", 0, 0.95, -4.6), "size": [26, 0.03, 0.03], "color": "#4a4040"},
    *crate("A", 3.4, 1.4, 8),
    # dam: the gun in the dirt, wheat far behind
    {"type": "wall", "pos": P("B", 4, 0, -16), "size": [40, 1.1, 8], "texture": "tex/wheat.png", "repeat": [10, 1]},
    {"type": "plane", "pos": P("B", 0.2, 0, 2.3), "size": [1.6, 1.2], "image": "cards-final/lewis-gun.png"},
    # road: truck, crates
    {"type": "plane", "pos": P("R", -3.4, 0, -1.2), "size": [4.4, 3.2], "image": "cards-final/truck.png"},
    *crate("R", 1.5, 0.3), *crate("R", 2.7, 0.1, -10),
    {"type": "plane", "pos": P("R", 27.5, 0, -1.2), "size": [4.4, 3.2], "image": "cards-final/truck.png"},
    # offices
    *office("C"), *office("C2"),
    # close-up board: papers on a wooden desk
    {"type": "wall", "pos": P("I", -18, 0, -0.15), "size": [60, 9, 0.1], "texture": "tex/wood.png", "repeat": [12, 2]},
    {"type": "plane", "pos": P("I", 0, 0.6, 0), "size": [2.4, 3.6], "image": "cards/newspaper.png"},
    {"type": "plane", "pos": P("I", -12, 0.3, 0), "size": [3.4, 6.0], "image": "bg/aerial.png"},
    {"type": "plane", "pos": P("I", -24, 0.6, 0), "size": [2.8, 3.6], "image": "cards-final/report.png"},
]

S = []


def shot(start, loc, **k):
    k.setdefault("zoom", 3)
    k.setdefault("frameY", 0.14)
    k["start"] = 0 if start == 0 else "say:" + start
    k["_loc"] = loc
    S.append(k)


def card(start, x, h, w, y0, fill=0.86, **k):
    """Square-on close-up of a paper on the board, sized so the whole sheet fits the 9:16 frame."""
    t = 0.36397  # tan(20 deg), default fov 40
    d = max(w / fill / (2 * t * 9 / 16), h / 0.96 / (2 * t))
    shot(start, "I", anchor=[LOC["I"][0] + x, y0 + h / 2, LOC["I"][2]], distance=round(d, 2), yaw=0, pitch=0, frameY=0, **{"zoom": 2, **k})


face = lambda who, f, at=0.0, **x: {"at": at, "who": who, "face": f, **x}

shot(0, "A", target="major", headWidth=0.34, yaw=15, pan=[-14, 4], actions=[face("major", "smug", 0.2)])
shot("fight birds", "A", target="emu-a6", headWidth=0.11, yaw=-8, pitch=9)
shot("And the birds won", "A", target="major", headWidth=0.3, yaw=25, zoom=-3, actions=[face("major", "confused", 0.5, pose={"head": 8})])
card("Western Australia", -12, 6.0, 3.4, 0.3, fill=0.95, zoom=3)
shot("Then about twenty thousand", "A", target="emu-a3", headWidth=0.09, yaw=10, pitch=12, pan=[24, 0])
shot("start eating everything", "A", target="emu-a9", headWidth=0.42, yaw=-12, actions=[face("emu-a9", "bored")])
shot("The farmers are", "A", target="farmer", headWidth=0.34, yaw=-10, actions=[face("farmer", "shouting", 0.3, shake=0.5)])
card("machine guns", 0, 3.6, 2.4, 0.6)
shot("And the government says", "C2", target="minister-phone", headWidth=0.3, yaw=12)
shot("sure", "C", target="minister", headWidth=0.42, yaw=-6, zoom=6, actions=[face("minister", "delighted", 0.05)])
shot("So Major Meredith", "R", target="major-salute", headWidth=0.28, yaw=22, pan=[-20, 0])
shot("ten thousand rounds", "R", anchor=P("R", 1.5, 0.4, 0.66), distance=1.9, yaw=4, pitch=4, frameY=0.1)
shot("First battle", "B", target="emu-b4", distance=13, yaw=-4, pitch=10, frameY=0.05)
shot("The emus walk into range", "B", target="emu-b2", headWidth=0.18, yaw=12,
     actions=[{"at": 0.2, "who": "emu-b2", "to": P("B", 2.4, 0, -1.4), "walk": True, "over": 1.6}])
shot("Fire", "B", target="major-b", headWidth=0.36, yaw=-20, zoom=8, actions=[face("major-b", "shouting", shake=0.6)])
shot("Twelve birds", "B", target="emu-b6", headWidth=0.4, yaw=14,
     actions=[face("emu-b6", "startled", hop=0.3), face("emu-b7", "startled", 0.1, hop=0.25)])
shot("the gun jams", "B", anchor=P("B", 0.2, 0.6, 2.3), distance=2.1, yaw=18, pitch=6, frameY=0.05, zoom=-2)
shot("Next a thousand emus", "B", anchor=P("B", 5, 0.8, -5), distance=15, yaw=0, pitch=30, frameY=0)
shot("Fire#2", "B", target="major-b", headWidth=0.3, yaw=18, zoom=8, actions=[face("major-b", "shouting")])
shot("And they scatter", "B", anchor=P("B", 5, 0.5, -4), distance=17, yaw=-6, pitch=34, frameY=0, zoom=-4,
     actions=[{"at": 0.0, "who": f"emu-b{i}", "to": P("B", 1 + i * 0.9 + (i - 5) * 2.5, 0, -3 - (i % 3) * 3 + (i % 2) * 6), "walk": True, "over": 1.4}
              for i in range(10)])
shot("Like they planned it", "B", target="emu-b8", headWidth=0.44, yaw=-14, zoom=4, actions=[face("emu-b8", "sly")])
shot("Six days in", "A", target="major", headWidth=0.32, yaw=-16, zoom=-2, actions=[face("major", "exhausted")])
shot("Nobody agrees", "A", anchor=P("A", 6.05, 1.55, 1.45), distance=3.6, yaw=0, pitch=4,
     actions=[{"at": 0.0, "who": "gunner", "shake": 0.4}, {"at": 0.1, "who": "driver", "shake": 0.4}])
shot("You see", "B", target="emu-b1", headWidth=0.22, yaw=12)
shot("fifty kilometres", "B", target="emu-sprint", headWidth=0.13, yaw=0, zoom=1,
     actions=[{"at": 0.0, "who": "emu-sprint", "to": P("B", 12, 0, -2.5), "over": 2.2}])
shot("tiny groups", "B", anchor=P("B", 5, 0.5, -5), distance=19, yaw=4, pitch=40, frameY=0, zoom=-4)
shot("nothing to aim at", "B", target="major-b", headWidth=0.34, yaw=-10, actions=[face("major-b", "confused", pose={"head": -8})])
shot("So the army goes home", "R", target="major-defeat", headWidth=0.26, yaw=-16, zoom=-3)
shot("The army comes back", "R", target="major-salute", headWidth=0.3, yaw=-20)
shot("Guns on trucks", "R", anchor=P("R", -3.4, 1.4, -1.2), distance=6.5, yaw=-12, pitch=4, frameY=0.05, zoom=4)
shot("One more month", "R", target="major-salute", headWidth=0.22, yaw=8, zoom=-3)
card("Final report", -24, 3.6, 2.8, 0.6, zoom=3)
shot("Exactly ten bullets", "C", target="minister", headWidth=0.42, yaw=10, zoom=8, actions=[face("minister", "shocked")])
shot("The army lost no one", "A", target="major", headWidth=0.26, yaw=20, zoom=-3, actions=[face("major", "neutral")])
shot("The emus kept the wheat", "A", target="emu-a7", headWidth=0.4, yaw=8,
     actions=[face("emu-a7", "smug"), face("emu-a6", "smug", 0.15)])
shot("And that's how", "A", target="major", headWidth=0.34, yaw=15, pan=[-14, 4], actions=[face("major", "smug", 0.2)])

# put front-facing emu faces back to the side head after their close-up; hard cut between locations
for i, s in enumerate(S):
    if s["start"] != 0:
        check(s["start"][4:])
    for a in list(s.get("actions", [])):
        if a["who"].startswith("emu-") and "face" in a and i + 1 < len(S):
            S[i + 1].setdefault("actions", []).insert(0, {"at": 0.0, "who": a["who"], "face": "default", "ease": 0})
    if i + 1 < len(S) and (S[i + 1]["_loc"] != s["_loc"] or "I" in (s["_loc"], S[i + 1]["_loc"])):
        s["out"] = "cut"
cuts = sum(1 for s in S if s.get("out") == "cut")
for s in S:
    del s["_loc"]

sfx = [
    {"file": "sfx/kazoo-fanfare.mp3", "at": "say:won", "offset": 0.35, "db": -12, "len": 1.6},
    {"file": "sfx/paper-thud.mp3", "at": "say:machine guns", "offset": 0.05, "db": -8},
    {"file": "sfx/phone-ring.mp3", "at": "say:And the government says", "offset": -0.6, "db": -14, "len": 1.0},
    {"file": "audio/cue-march.mp3", "at": "say:So Major Meredith", "db": -16, "len": 5.5},
    {"file": "sfx/gun-burst.mp3", "at": "say:Fire", "offset": 0.15, "db": -10, "len": 1.2},
    {"file": "sfx/bonk.mp3", "at": "say:jams", "offset": 0.05, "db": -8},
    {"file": "sfx/sad-trombone.mp3", "at": "say:jams", "offset": 0.45, "db": -12, "len": 2.0},
    {"file": "sfx/gun-burst.mp3", "at": "say:Fire#2", "offset": 0.15, "db": -10, "len": 1.0},
    {"file": "audio/cue-sneaky.mp3", "at": "say:Every direction", "db": -15, "len": 4.0},
    {"file": "sfx/crickets.mp3", "at": "say:Nobody agrees", "offset": 0.7, "db": -13, "len": 1.4},
    {"file": "sfx/whoosh.mp3", "at": "say:fifty kilometres", "db": -12},
    {"file": "sfx/typewriter-ding.mp3", "at": "say:Final report", "db": -12},
    {"file": "sfx/record-scratch.mp3", "at": "say:Exactly ten", "offset": -0.25, "db": -12, "len": 0.8},
]
for x in sfx:
    check(x["at"][4:])

short = {
    "fps": 30,
    "audio": {"voice": "audio/voice-edit.mp3", "music": "audio/music-lyria.mp3", "musicDb": -21, "sfx": sfx},
    "words": "audio/words.json", "captions": {"wordsPer": 1}, "font": "fonts/Montserrat-ExtraBold.ttf",
    "moods": {
        "day": {"sun": {"azimuth": 35, "elevation": 38, "color": "#ffe2b8", "intensity": 2.6}, "sky": {"top": "#7fa3dc", "horizon": "#f6cf9a"},
                "fill": {"sky": "#b5c2ff", "ground": "#7a4a3e", "intensity": 1.15}},
        "golden": {"sun": {"azimuth": -30, "elevation": 12, "color": "#ffb878", "intensity": 2.2}, "sky": {"top": "#58689e", "horizon": "#f5a865"},
                   "fill": {"sky": "#c7b0e6", "ground": "#7d4636", "intensity": 1.05}, "exposure": 1.05, "cutoutTint": "#ffe6cc"},
    },
    "lighting": [{"t": 0, "mood": "day"}, {"t": "say:You see", "mood": "golden", "fade": 0.6}, {"t": "say:The army comes back", "mood": "day", "fade": 0.6}],
    "ground": {"texture": "tex/dirt-final.png", "repeat": [60, 60], "color": "#b9673d"},
    "backdrop": {"image": "bg/day.png", "blur": 4},
    "ink": {"set": 4}, "contactShadow": 0.6,
    "characters": chars, "props": props, "shots": S, "end": "audio",
}
json.dump(short, open('short.json', 'w'), indent=1)
print(len(S), "shots,", cuts, "cuts,", len(chars), "characters,", len(props), "props,", len(sfx), "sounds; all phrases found")
