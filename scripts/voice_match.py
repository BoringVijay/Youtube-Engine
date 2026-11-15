#!/usr/bin/env python3
"""Find the ElevenLabs voice closest to the reference narrator (study only; reference audio never leaves the runner).

1. yt-dlp pulls the audio of a few reference Shorts; we cut clean 15 s windows.
2. Each candidate voice reads the same original line on fal (v3 and multilingual v2).
3. Score = speaker-embedding similarity (resemblyzer) + pitch match (librosa pyin) + pace.
Writes rick/voice-match/results.json and the candidate mp3s (ours, not the reference's).
"""
import json, os, subprocess, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fal, budget

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "rick", "voice-match")
TMP = "/tmp/vm"
os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
REFS = ["7xS87iActkU", "Mz72MuPgnGY", "VS1Z_Q-Klt8", "0m6G8pDtzNs"]
TEXT = ("He shaved the walls of his bedroom every morning, because the walls were trying to eat him. "
        "You see, it's 1960, and Hank lives thirty feet under the ice in Greenland.")
VOICES = ["Brian", "Chris", "Eric", "Roger", "George", "Callum", "Liam", "Will", "Daniel", "Bill", "Charlie", "River"]
# round 2 (Vijay: none of the first three, look wider): legacy/default names fal may accept, v2 only
WIDE = ["Adam", "Antoni", "Josh", "Sam", "Arnold", "Clyde", "Dave", "Fin", "Harry", "James", "Jeremy", "Joseph", "Michael", "Patrick", "Thomas", "Ethan", "Drew", "Paul"]
MODELS = {"v3": "fal-ai/elevenlabs/tts/eleven-v3", "v2": "fal-ai/elevenlabs/tts/multilingual-v2"}
JOB = "voice-match"

def sh(*a):
    subprocess.run(a, check=True)

def refs():
    clips = []
    for vid in REFS:
        dst = f"{TMP}/ref_{vid}.m4a"
        try:
            if not os.path.exists(dst):
                sh("yt-dlp", "-q", "-f", "bestaudio[ext=m4a]/bestaudio", "-o", dst, f"https://www.youtube.com/shorts/{vid}")
            for i, start in enumerate((3, 20, 38)):
                c = f"{TMP}/ref_{vid}_{i}.wav"
                sh("ffmpeg", "-y", "-loglevel", "error", "-ss", str(start), "-t", "14", "-i", dst, "-ac", "1", "-ar", "16000", c)
                clips.append(c)
        except Exception as e:
            print("ref failed", vid, e)
    return clips

def candidates():
    made = []
    for v in VOICES + WIDE:
        for mk, ep in MODELS.items():
            if v in WIDE and mk != "v2": continue
            out = f"{OUT}/{v}_{mk}.mp3"
            if not os.path.exists(out):
                budget.check(JOB, "fal_tts_1k_chars", len(TEXT) / 1000)
                try:
                    res = fal.run(ep, {"text": TEXT, "voice": v}, timeout=300, tag=f"{JOB}:{v}_{mk}")
                    fal.download(res["audio"]["url"], out)
                    budget.log(JOB, "fal_tts_1k_chars", len(TEXT) / 1000, "fal")
                except Exception as e:
                    print("tts failed", v, mk, e); continue
            made.append((v, mk, out))
    return made

# Reference narrator, measured in a real browser (YouTube blocks datacenter downloads), 2 videos x 25 s,
# with the same 40 ms autocorrelation pitch tracker used below: median 181-201 Hz, IQR ~150-250 Hz.
REF = {"f0_med": 191.0, "f0_iqr": 77.0, "wps": 3.7}

def pitch(path):
    import numpy as np, librosa
    x, sr = librosa.load(path, sr=48000, mono=True)
    W, H = int(0.04 * sr), int(0.02 * sr); lo, hi = sr // 300, sr // 65; f = []
    for i in range(0, len(x) - W, H):
        fr = x[i:i + W]; e = float((fr ** 2).sum())
        if (e / W) ** 0.5 < 0.02 * max(1e-6, float(np.abs(x).max())) / 0.6: continue
        ac = np.correlate(fr, fr, "full")[W - 1:]
        L = lo + int(np.argmax(ac[lo:hi])); 
        if ac[L] / (e + 1e-9) > 0.35: f.append(sr / L)
    f = np.sort(np.array(f)); q = lambda p: float(f[int(p * (len(f) - 1))]) if len(f) else 0.0
    return q(.5), q(.75) - q(.25)

def main():
    import librosa
    rows = []
    for v, mk, path in candidates():
        med, iqr = pitch(path)
        dur = librosa.get_duration(path=path); wps = len(TEXT.split()) / dur
        score = 100 - abs(med - REF["f0_med"]) * 0.6 - abs(iqr - REF["f0_iqr"]) * 0.3 - abs(wps - REF["wps"]) * 12
        rows.append({"voice": v, "model": mk, "f0_med": round(med, 1), "f0_iqr": round(iqr, 1), "wps": round(wps, 2), "score": round(score, 1), "file": os.path.relpath(path, ROOT)})
        print(rows[-1])
    rows.sort(key=lambda r: -r["score"])
    json.dump({"reference": REF, "text": TEXT, "ranked": rows}, open(f"{OUT}/results.json", "w"), indent=1)
    print("TOP:", rows[:5])

if __name__ == "__main__":
    main()
