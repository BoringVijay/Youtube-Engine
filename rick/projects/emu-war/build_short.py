#!/usr/bin/env python3
"""Builds short.json for the Emu War pilot from the storyboard in the Rick Shots bible.
Every cue phrase is checked against audio/words.json before anything is written."""
import json, os, random, re

os.chdir(os.path.dirname(os.path.abspath(__file__)))
random.seed(7)
W = json.load(open('audio/words.json'))['words']
tok = lambda x: re.sub(r"[^a-z0-9' ]+", " ", x.lower().replace("’", "'")).split()
wn = ["".join(tok(w['w'])) for w in W]


def check(ph):
    want = tok(ph.split('#')[0])
    for i in range(len(wn) - len(want) + 1):
        if all(wn[i + j] == t for j, t in enumerate(want)):
            return W[i]['t0']
    raise SystemExit("MISSING: " + ph)


A, B, C, R, I = (0, 0, 0), (70, 0, 0), (0, 0, -70), (0, 0, 45), (-70, 0, 0)  # farm, dam, office, road, close-up cards
P = lambda o, x, y, z: [o[0] + x, o[1] + y, o[2] + z]

chars = [
    {"id": "major", "puppet": "rigs/major", "pos": P(A, 0, 0, 0), "height": 1.8, "face": "neutral"},
    {"id": "farmer", "puppet": "rigs/farmer", "pos": P(A, -4.5, 0, 1.5), "height": 1.8, "face": "neutral"},
    {"id": "gunner", "puppet": "rigs/gunner", "pos": P(A, 5.5, 0, 1.5), "height": 1.75},
    {"id": "driver", "puppet": "rigs/driver", "pos": P(A, 6.6, 0, 1.4), "height": 1.75, "flip": True},
    {"id": "major-b", "puppet": "rigs/major", "pos": P(B, -1.2, 0, 2), "height": 1.8, "face": "neutral"},
    {"id": "minister", "puppet": "rigs/minister", "pos": P(C, 0, 0, 0), "height": 1.75, "face": "neutral"},
    {"id": "minister-phone", "puppet": "rigs/minister-phone", "pos": P(C, 6, 0, 0), "height": 1.75},
    {"id": "major-salute", "puppet": "rigs/major-salute", "pos": P(R, 0, 0, 0), "height": 1.8},
    {"id": "major-defeat", "puppet": "rigs/major-defeat", "pos": P(R, 30, 0, 0), "height": 1.8},
    {"id": "emu-sprint", "puppet": "rigs/emu-sprint", "pos": P(B, -8, 0, -2), "height": 1.6},
]
for i in range(14):
    chars.append({"id": f"emu-a{i}", "puppet": "rigs/emu", "pos": P(A, -7 + i * 1.05 + random.uniform(-.3, .3), 0, -5.5 - random.uniform(0, 6)),
                  "height": 1.7 + random.uniform(-.1, .1), "flip": random.random() < .5, "face": random.choice(["neutral", "smug", "bored"])})
for i in range(10):
    chars.append({"id": f"emu-b{i}", "puppet": "rigs/emu", "pos": P(B, 1 + i * 0.9 + random.uniform(-.3, .3), 0, -3 - random.uniform(0, 4)),
                  "height": 1.7 + random.uniform(-.1, .1), "flip": random.random() < .5, "face": "neutral"})

props = [
    {"type": "wall", "pos": P(A, 0, 0, -11), "size": [30, 0.95, 12], "texture": "tex/wheat.png", "repeat": [8, 1]},
    {"type": "house", "pos": P(A, -9, 0, -3), "size": [5, 3, 4], "wall": "tex/wood.png", "roof": "#8d9298", "rotY": 15},
    *[{"type": "post", "pos": P(A, x, 0, -4.6), "h": 1.3, "color": "#6b5a48"} for x in range(-10, 12, 2)],
    {"type": "wall", "pos": P(A, 0, 0.9, -4.6), "size": [22, 0.03, 0.03], "color": "#4a4040"},
    {"type": "crate", "pos": P(R, 1.4, 0, 0.4), "size": [1.1, 0.7, 0.7], "texture": "cards/crate.png"},
    {"type": "crate", "pos": P(R, 2.5, 0, 0.2), "size": [1.1, 0.7, 0.7], "texture": "cards/crate.png", "rotY": -12},
    {"type": "plane", "pos": P(R, -3.2, 0, -1), "size": [4.4, 3.2], "image": "cards-final/truck.png"},
    {"type": "plane", "pos": P(R, 27, 0, -1), "size": [4.4, 3.2], "image": "cards-final/truck.png"},
    {"type": "crate", "pos": P(A, 3.6, 0, 1.2), "size": [1.1, 0.7, 0.7], "texture": "cards/crate.png", "rotY": 8},
    {"type": "plane", "pos": P(B, 0.3, 0, 2.2), "size": [1.6, 1.2], "image": "cards-final/lewis-gun.png"},
    {"type": "box", "pos": P(B, 4, 0.005, -4), "size": [16, 0.02, 12], "texture": "tex/mud.png", "repeat": [4, 3]},
    {"type": "box", "pos": P(B, 5, 0.02, -6), "size": [9, 0.03, 4], "color": "#7f9ea8"},
    {"type": "tree", "pos": P(B, -6, 0, -12), "scale": 2.2, "color": "#6f8f5a"},
    {"type": "tree", "pos": P(B, 14, 0, -10), "scale": 2.6, "color": "#6f8f5a"},
    {"type": "box", "pos": P(C, 0, 0.01, 0), "size": [9, 0.02, 8], "color": "#5a3a28"},
    {"type": "wall", "pos": P(C, 0, 0, -2.5), "size": [9, 3.4, 0.2], "texture": "tex/panelling.png", "repeat": [3, 1]},
    {"type": "plane", "pos": P(C, 1.4, 0, 0.6), "size": [2.2, 2.1], "image": "cards-final/desk.png"},
    {"type": "wall", "pos": P(C, 6, 0, -2.5), "size": [5, 3.4, 0.2], "texture": "tex/panelling.png", "repeat": [2, 1]},
    {"type": "plane", "pos": P(I, 0, 0, 0), "size": [2.4, 3.6], "image": "cards/newspaper.png"},
    {"type": "plane", "pos": P(I, -12, 0, 0), "size": [3.4, 6.0], "image": "bg/aerial.png"},
    {"type": "plane", "pos": P(I, -24, 0, 0), "size": [2.8, 3.6], "image": "cards-final/report.png"},
    {"type": "plane", "pos": P(I, -36, 0, 0), "size": [3.0, 2.3], "image": "cards-final/lewis-gun.png"},
]

card = lambda o, x, h, dist: {"anchor": [o[0] + x, h, o[2]], "distance": dist}
S = []


def shot(start, **k):
    k["start"] = 0 if start == 0 else "say:" + start
    S.append(k)


shot(0, target="major", headWidth=0.22, yaw=15, zoom=6, pan=[-20, 8], actions=[{"at": 0.2, "who": "major", "face": "smug"}])
shot("fight birds", target="emu-a6", headWidth=0.22, yaw=-18, zoom=5)
shot("And the birds won", target="major", headWidth=0.1, yaw=28, zoom=-4, actions=[{"at": 0.5, "who": "major", "face": "confused", "pose": {"head": 8}}])
shot("Western Australia", **card(I, -12, 3.0, 6.2), zoom=8)
shot("Then about twenty thousand", target="emu-a3", headWidth=0.09, yaw=10, pitch=8, zoom=3, pan=[30, 0])
shot("start eating everything", target="emu-a9", headWidth=0.28, yaw=-12, zoom=7, actions=[{"at": 0.1, "who": "emu-a9", "face": "bored"}])
shot("The farmers are", target="farmer", headWidth=0.2, yaw=-10, zoom=5, actions=[{"at": 0.3, "who": "farmer", "face": "shouting", "shake": 0.5}])
shot("machine guns", **card(I, 0, 1.8, 3.6), zoom=10)
shot("And the government says", target="minister-phone", headWidth=0.2, yaw=12, zoom=4)
shot("sure", target="minister", headWidth=0.3, yaw=-6, zoom=12, actions=[{"at": 0.05, "who": "minister", "face": "delighted"}])
shot("So Major Meredith", target="major-salute", headWidth=0.16, yaw=25, zoom=4, pan=[-30, 0])
shot("ten thousand rounds", anchor=[R[0] + 1.9, 0.45, R[2] + 0.6], distance=2.4, yaw=6, zoom=7)
shot("First battle", target="emu-b4", headWidth=0.09, yaw=-14, pitch=6, zoom=3)
shot("The emus walk into range", target="emu-b2", headWidth=0.16, yaw=10, zoom=4,
     actions=[{"at": 0.2, "who": "emu-b2", "to": P(B, 2.6, 0, -1.6), "walk": True, "over": 1.6}])
shot("Fire", target="major-b", headWidth=0.22, yaw=-20, zoom=10, actions=[{"at": 0.0, "who": "major-b", "face": "shouting", "shake": 0.6}])
shot("Twelve birds", target="emu-b6", headWidth=0.14, yaw=14, zoom=5,
     actions=[{"at": 0.0, "who": "emu-b6", "face": "startled", "hop": 0.3}, {"at": 0.1, "who": "emu-b7", "face": "startled", "hop": 0.25}])
shot("the gun jams", **card(I, -36, 1.15, 3.0), zoom=9)
shot("Next a thousand emus", target="emu-b5", headWidth=0.07, yaw=0, pitch=35, zoom=3)
shot("Fire#2", target="major-b", headWidth=0.2, yaw=18, zoom=8, actions=[{"at": 0.0, "who": "major-b", "face": "shouting"}])
shot("And they scatter", target="emu-b3", headWidth=0.1, yaw=-6, pitch=20, zoom=-5,
     actions=[{"at": 0.0, "who": f"emu-b{i}", "to": P(B, 1 + i * 0.9 + (i - 5) * 2.5, 0, -3 - (i % 3) * 3 + (i % 2) * 6), "walk": True, "over": 1.4} for i in range(10)])
shot("Like they planned it", target="emu-b8", headWidth=0.3, yaw=-14, zoom=6, actions=[{"at": 0.0, "who": "emu-b8", "face": "sly"}])
shot("Six days in", target="major", headWidth=0.2, yaw=-22, zoom=-3, actions=[{"at": 0.0, "who": "major", "face": "exhausted"}])
shot("Nobody agrees", target="gunner", headWidth=0.16, yaw=8, zoom=4,
     actions=[{"at": 0.0, "who": "gunner", "shake": 0.4}, {"at": 0.0, "who": "driver", "shake": 0.4}])
shot("You see", target="emu-b1", headWidth=0.22, yaw=12, zoom=3)
shot("fifty kilometres", target="emu-sprint", headWidth=0.12, yaw=0, zoom=2, pan=[-120, 0],
     actions=[{"at": 0.0, "who": "emu-sprint", "to": P(B, 10, 0, -2), "over": 2.0}])
shot("tiny groups", target="emu-b5", headWidth=0.06, yaw=4, pitch=40, zoom=-6)
shot("nothing to aim at", target="major-b", headWidth=0.22, yaw=-10, zoom=5, actions=[{"at": 0.0, "who": "major-b", "face": "confused", "pose": {"head": -8}}])
shot("So the army goes home", target="major-defeat", headWidth=0.14, yaw=-18, zoom=-3)
shot("The army comes back", target="major-salute", headWidth=0.16, yaw=-20, zoom=5)
shot("Final report", **card(I, -24, 1.8, 3.8), zoom=8)
shot("Exactly ten bullets", target="minister", headWidth=0.26, yaw=10, zoom=9, actions=[{"at": 0.0, "who": "minister", "face": "shocked"}])
shot("The army lost no one", target="major", headWidth=0.12, yaw=-30, zoom=-3, actions=[{"at": 0.0, "who": "major", "face": "neutral"}])
shot("The emus kept the wheat", target="emu-a7", headWidth=0.12, yaw=8, zoom=3,
     actions=[{"at": 0.0, "who": "emu-a7", "face": "smug"}, {"at": 0.0, "who": "emu-a5", "face": "smug"}])
shot("And that's how", target="major", headWidth=0.22, yaw=15, zoom=6, pan=[-20, 8], actions=[{"at": 0.2, "who": "major", "face": "smug"}])
for s in S:
    if s["start"] != 0:
        check(s["start"][4:])

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
        "day": {"sun": {"azimuth": 35, "elevation": 34, "color": "#ffd9a8", "intensity": 2.5}, "sky": {"top": "#6f95d6", "horizon": "#f4c08a"},
                "fill": {"sky": "#9fb0ff", "ground": "#6a3b6e", "intensity": 1.1}},
        "dusk": {"sun": {"azimuth": -40, "elevation": 16, "color": "#ffb48c", "intensity": 1.1}, "sky": {"top": "#1d2a6e", "horizon": "#6a68b4"},
                 "fill": {"sky": "#5464c8", "ground": "#3a2f6a", "intensity": 0.95}, "exposure": 1.1, "cutoutTint": "#b4b2dc"},
    },
    "lighting": [{"t": 0, "mood": "day"}, {"t": "say:You see", "mood": "dusk", "fade": 0.8}, {"t": "say:The army comes back", "mood": "day", "fade": 1.0}],
    "ground": {"texture": "tex/dirt-final.png", "repeat": [60, 60], "color": "#b9673d"},
    "backdrop": {"image": "bg/day.png", "blur": 4},
    "ink": {"set": 4}, "contactShadow": 0.6,
    "characters": chars, "props": props, "shots": S, "end": "audio",
}
json.dump(short, open('short.json', 'w'), indent=1)
print(len(S), "shots,", len(chars), "characters,", len(props), "props,", len(sfx), "sounds; all phrases found")
