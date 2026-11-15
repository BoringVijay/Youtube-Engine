# Camp Century: original synthesized score + SFX + mix (voice on top), using the cartoon-3d-short audio kit.
# Music follows the beats of the directed VO (words.json); hard stops on "Son", "Wait." and "And it did."
# Out: rick/stage2/public/ice/mix.mp3 (-15 LUFS integrated, -1.2 dBTP).
import os, subprocess, sys, json
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "creative/skills/cartoon-3d-short/templates/audio"))
from dsp import SR, ns, rng, pan, place, fades, make_ir, convolve_st, integrated, read_wav, write_wav, lp
import instruments as I
import sfx_gen as X

ICE = os.path.join(ROOT, "rick/stage2/public/ice")
DUR = 72.6
N = ns(DUR)
r = rng(7)
m2f = I.m2f
mus, sfx = np.zeros((2, N)), np.zeros((2, N))

def riff(t0, t1, bpm, root, vel=0.55, minor=True, snare=False):
    """mischievous pizzicato ostinato (root, fifth, octave, flat-sixth walk) on eighth notes"""
    q = 60 / bpm / 2
    pat = [0, 7, 12, 7, 0, 7, 8, 7] if minor else [0, 7, 12, 7, 0, 4, 7, 4]
    t, k = t0, 0
    while t < t1 - 0.05:
        place(mus, pan(I.pluck(m2f(root + pat[k % 8]), vel * (1.0 if k % 2 == 0 else 0.7), r, dur=0.5), -0.25 + 0.5 * (k % 2)), t)
        if k % 8 == 0: place(mus, pan(I.pluck(m2f(root - 12), vel * 0.9, r, dur=0.9, bright=0.3), 0.0), t)
        if snare and k % 4 == 2: place(mus, I.brush(0.35, r), t)
        t += q; k += 1

def pad(t0, t1, notes, vel=0.35):
    place(mus, I.pad([m2f(n) for n in notes], t1 - t0, vel, r), t0)

def stopgap(t0, t1):  # hard silence for designed pauses
    a, b = ns(t0), ns(t1)
    fade = min(ns(0.04), b - a)
    mus[:, a:a + fade] *= np.linspace(1, 0, fade)
    mus[:, a + fade:b] = 0

D = 50  # D3
# hook + town (mischief in D minor)
riff(0.0, 12.4, 112, D, 0.5)
for t in np.arange(3.9, 12.4, 2.14): place(mus, pan(I.glock(m2f(86), 0.35, r), 0.4), t)
pad(3.9, 12.4, [D, D + 3, D + 7], 0.22)
# officially / unofficially / Denmark: spy-ish, brushes, hits on the numbers
riff(12.4, 22.2, 112, D, 0.5, snare=True)
place(mus, I.timpani(m2f(D - 10), 0.9, r), 15.9)
place(mus, I.timpani(m2f(D - 5), 0.7, r), 20.5)
place(mus, pan(I.cymbal(0.3, r, dur=1.4), 0.3), 19.6)
# pencil: sparse ticks, silence before "Son" through "...growing"
pad(22.2, 27.6, [D + 3, D + 10], 0.18)
for t in (23.9, 25.3, 25.6, 25.8): place(mus, pan(I.glock(m2f(93), 0.3, r, dur=0.8), 0.5), t)
# escalation: faster, brushes, timpani on spaghetti, dead stop for "Wait."
riff(30.48, 40.0, 126, D + 2, 0.55, snare=True)
pad(34.4, 40.0, [D + 2, D + 5, D + 9], 0.25)
place(mus, I.timpani(m2f(D - 8), 1.0, r), 38.8)
place(mus, I.musicbox(m2f(81), 0.45, r, dur=2.0), 41.7)
# honey explainer: warm, slow vibes in F major
for k, t in enumerate(np.arange(42.5, 51.0, 0.75)):
    place(mus, pan(I.vibes(m2f([65, 69, 72, 76, 72, 69][k % 6]), 0.4, r, dur=1.6), -0.3 + 0.12 * (k % 6)), t)
pad(42.5, 51.1, [53, 57, 60], 0.25)
# 1966: the riff returns, darker; stop for "And it did."
riff(51.1, 59.0, 104, D - 2, 0.5)
pad(51.1, 59.0, [D - 2, D + 1, D + 5], 0.25)
place(mus, I.timpani(m2f(D - 14), 1.0, r, dur=3.0), 59.35)
# numbers: accelerating ticks + rising pad
t = 60.2
while t < 66.6:
    place(mus, pan(I.pluck(m2f(D + 19), 0.4, r, dur=0.3, bright=0.8), 0.35), t)
    t += max(0.18, 0.5 - (t - 60.2) * 0.05)
place(mus, I.timpani(m2f(D - 10), 0.8, r), 62.8)
pad(60.2, 66.7, [D, D + 3, D + 8], 0.3)
# ending: ominous low pad, swell, hold for the penguin, one sting on its "?"
pad(66.7, 72.6, [D - 12, D - 5, D + 1], 0.38)
place(mus, pan(I.cymbal(0.35, r, dur=3.0), -0.2), 69.6)
place(mus, pan(I.glock(m2f(88), 0.55, r, dur=1.5), 0.3), 71.6)
for a, b in ((27.6, 29.95), (40.0, 41.65), (59.05, 59.33)): stopgap(a, b)

# ---- sfx ----
for t in (12.4, 14.3, 19.6, 22.2, 30.48, 34.4, 42.5, 48.8, 51.1, 54.7, 60.2, 62.2, 66.7):
    place(sfx, X.whoosh(0.55, r), t - 0.36, 0.8)
for a, b in ((12.4, 14.3), (51.1, 59.05), (62.2, 66.7)):
    place(sfx, X.breeze(b - a, r, level=0.6), a, 0.7)
for t in (23.7, 24.0): place(sfx, X.clink(r, dur=0.08, bright=0.6), t, 0.5)
place(sfx, X.creak(1.6, r), 38.3, 0.9)
for t in np.arange(34.5, 37.5, 0.37): place(sfx, X.clink(r, dur=0.1, bright=0.9), t, 0.35)  # picks on ice

mus = convolve_st(mus, make_ir(1.1, 3, hf=0.8)) * 0.6 + mus * 0.6
mus, sfx = mus[:, :N], sfx[:, :N]
fades(mus[0]); fades(mus[1])

# ---- mix: voice -15, music -27, sfx -29 LUFS (integrated), then ffmpeg loudness + true-peak limit ----
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f"{ICE}/voice.mp3", "-ar", str(SR), "-ac", "2", "/tmp/ice_voice.wav"], check=True)
vo = read_wav("/tmp/ice_voice.wav")[0]
vo = np.pad(vo, ((0, 0), (0, max(0, N - vo.shape[1]))))[:, :N]
g = lambda x, tgt: x * 10 ** ((tgt - integrated(x)) / 20)
vo, mus, sfx = g(vo, -15.0), g(mus, -27.0), g(sfx, -29.0)
# duck music 3 dB under words
words = json.load(open(f"{ICE}/words.json"))["words"]
env = np.ones(N)
for _, a, b in words: env[ns(max(0, a - 0.05)):ns(b + 0.1)] = 10 ** (-3 / 20)
env = np.convolve(env, np.ones(ns(0.08)) / ns(0.08), mode="same")
mixd = vo + mus * env + sfx
write_wav("/tmp/ice_mix.wav", mixd / max(1.0, np.abs(mixd).max()))
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", "/tmp/ice_mix.wav", "-af", "loudnorm=I=-15:TP=-1.2:LRA=7",
                "-ar", "48000", "-b:a", "192k", f"{ICE}/mix.mp3"], check=True)
print("mix.mp3 written")
