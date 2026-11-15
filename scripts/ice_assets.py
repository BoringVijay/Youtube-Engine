#!/usr/bin/env python3
"""The City the Ice Ate: generate the pilot's paid assets once (idempotent, budget-checked).

voice  : River (ElevenLabs Multilingual v2 on fal) reads the approved script in one take -> voice.mp3
         faster-whisper word timings mapped onto the script's own words -> words.json
art    : Nano Banana Pro painted textures (tileable) and backdrops on the Google credit -> tex/*.png
props  : Nano Banana Pro reference image -> Hunyuan3D v2 white mesh on fal -> props/*.glb (the engine inks and paints them)
"""
import base64, difflib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import art, budget, fal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "rick", "stage2", "public", "ice")
SCRIPT = os.path.join(ROOT, "rick", "projects", "camp-century", "gate1-script.md")
JOB = "camp-century"
for d in ("", "tex", "props", "props/ref"):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)

STYLE = ("hand-painted stylized cartoon game art in the style of a premium animated short: flat colour fields with soft painted shading, "
         "subtle brush texture, thin dark plum ink seams between elements, warm and saturated, no photo realism, no text, no letters, no logos")
TEXTURES = {
    "wall_planks": "seamless tileable texture, front view, vertical pine wall planks of a 1960 army barracks, honey and caramel wood tones, a few knots and nail heads",
    "floor_boards": "seamless tileable texture, top-down view, worn wooden floorboards, warm brown with darker gaps, scuffs from boots",
    "ice_wall": "seamless tileable texture, front view, a wall of compacted glacier ice cut by a machine: pale blue and white horizontal strata, soft tool marks, a few trapped bubbles, cool and luminous",
    "snow_floor": "seamless tileable texture, top-down view, packed trodden snow on a tunnel floor, soft white and lilac with boot prints and sled runner tracks",
    "steel_arch": "seamless tileable texture, corrugated galvanised steel sheet, grey-blue ribs with soft highlights, a few rivets and rust freckles",
    "barber_tiles": "seamless tileable texture, top-down view, black and white checkerboard linoleum floor of a small 1960 barber shop, slightly worn",
    "mess_wall": "seamless tileable texture, front view, painted plywood wall of a 1960 army mess hall, cream upper half and olive green lower half with a wooden rail",
    "crate_wood": "seamless tileable texture, front view, rough army supply crate boards, olive painted wood with stencil-free plain panels and dark seams",
}
BACKDROPS = {
    "ice_sheet_day": ("vertical 9:16 painted background, the endless flat Greenland ice sheet under a deep blue sky with a few long soft clouds, "
                      "a tiny cluster of antennas and a vent stack poking out of the snow in the middle distance, wind-blown snow drifts in front", "9:16"),
    "ice_sheet_golden": ("vertical 9:16 painted background, the Greenland ice sheet at low golden sun, peach and violet sky, long blue shadows on the snow, "
                         "melt ponds glinting turquoise, slushy wet snow surface", "9:16"),
}
PROPS = {
    "bunk_bed": "a 1960 US army steel bunk bed, olive drab frame, grey wool blankets, a pillow, simple sturdy shapes",
    "barber_chair": "a classic 1950s barber chair, red leather seat and backrest, chrome footrest and hydraulic base, rounded friendly shapes",
    "mess_table": "a long wooden army mess hall table with two attached benches, a few metal trays and mugs on top",
    "snow_miller": "a 1959 Peter Snow Miller trench-cutting machine: a boxy yellow tracked vehicle with a big rotating cutter drum on the front and a tall snow-throwing chute",
    "steel_desk": "a grey 1960 army office steel desk with a black rotary telephone, an in-tray of papers and a desk lamp",
    "reactor_console": "a 1960 nuclear reactor control console, grey steel cabinet with round dials, toggle switches, red and green indicator lamps",
}
OBJ = (" Single object centred on a plain pure white background, three-quarter view from slightly above, whole object in frame, "
       "no shadow on the ground, cartoon 3D game asset with clean simple shapes and flat painted colours, no text.")


def vo_lines():
    t = open(SCRIPT).read().split("## Version A")[1].split("**Loop")[0]
    rows = [l.split("|") for l in t.splitlines() if re.match(r"^\| \d+ \|", l)]
    return [r[2].strip() for r in rows]


def voice():
    mp3, words = os.path.join(OUT, "voice.mp3"), os.path.join(OUT, "words.json")
    text = " ".join(vo_lines())  # the script's words: captions and timings use these
    flow = os.path.join(ROOT, "rick", "projects", "camp-century", "vo_tts.txt")  # same words, run-on punctuation (reference delivery)
    tts = open(flow).read().strip() if os.path.exists(flow) else text
    if not os.path.exists(mp3):
        budget.check(JOB, "fal_tts_1k_chars", len(tts) / 1000)
        res = fal.run("fal-ai/elevenlabs/tts/multilingual-v2", {"text": tts, "voice": "River", "stability": 0.45, "similarity_boost": 0.8,
                                                              "style": 0.25, "speed": 1.15}, timeout=600, tag=f"{JOB}:voice")
        raw = mp3 + ".raw.mp3"
        fal.download(res["audio"]["url"], raw)
        budget.log(JOB, "fal_tts_1k_chars", len(text) / 1000, "fal")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-15:TP=-1.5:LRA=9", "-ar", "44100", "-b:a", "160k", mp3], check=True)
        os.remove(raw)
    if not os.path.exists(words):
        import numpy as np
        from faster_whisper import WhisperModel
        pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
        audio = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768.0
        segs, _ = WhisperModel("small.en", device="cpu", compute_type="int8").transcribe(audio, word_timestamps=True, beam_size=5)
        heard = [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or [])]
        norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
        mine = text.split()
        sm = difflib.SequenceMatcher(None, [norm(w) for w in mine], [norm(h[0]) for h in heard], autojunk=False)
        times = [None] * len(mine)
        for b in sm.get_matching_blocks():
            for k in range(b.size):
                times[b.a + k] = [round(heard[b.b + k][1], 3), round(heard[b.b + k][2], 3)]
        known = [i for i, t in enumerate(times) if t]
        for i, t in enumerate(times):
            if t: continue
            p = max([k for k in known if k < i], default=None); n = min([k for k in known if k > i], default=None)
            a = times[p][1] if p is not None else 0.0
            z = times[n][0] if n is not None else a + 0.3
            times[i] = [round(a + (z - a) * 0.1, 3), round(z - (z - a) * 0.1, 3)]
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3], capture_output=True, text=True).stdout)
        json.dump({"voice": "River", "model": "eleven_multilingual_v2", "duration": round(dur, 3), "matched": len(known), "words": [[w, *t] for w, t in zip(mine, times)]},
                  open(words, "w"), indent=0)
        print(f"[voice] {dur:.1f}s, {len(mine)} words, {len(known)} matched, {len(mine) / dur:.2f} w/s")


def textures():
    for k, p in TEXTURES.items():
        out = os.path.join(OUT, "tex", k + ".png")
        if not os.path.exists(out):
            art.image(f"{p}. {STYLE}.", out, aspect="1:1", job=JOB, size="2K"); print("[tex]", k)
    for k, (p, asp) in BACKDROPS.items():
        out = os.path.join(OUT, "tex", k + ".png")
        if not os.path.exists(out):
            art.image(f"{p}. {STYLE}.", out, aspect=asp, job=JOB, size="2K"); print("[backdrop]", k)


def props():
    for k, p in PROPS.items():
        ref, glb = os.path.join(OUT, "props", "ref", k + ".png"), os.path.join(OUT, "props", k + ".glb")
        if not os.path.exists(ref):
            art.image(p + "." + OBJ, ref, aspect="1:1", job=JOB, size="1K"); print("[prop ref]", k)
        if not os.path.exists(glb):
            budget.check(JOB, "fal_3d")
            res = fal.run("fal-ai/hunyuan3d/v2", {"input_image_url": fal.data_uri(ref), "textured_mesh": False, "octree_resolution": 256,
                                                 "num_inference_steps": 50, "guidance_scale": 7.5}, timeout=900, tag=f"{JOB}:3d:{k}")
            fal.download(res["model_mesh"]["url"], glb); budget.log(JOB, "fal_3d", 1, "fal"); print("[3d]", k)


def voice_v3():
    """Expressive takes (ElevenLabs v3 audio tags + written pauses), two stabilities. Picks the take nearest 64 s as voice.mp3."""
    tts = open(os.path.join(ROOT, "rick", "projects", "camp-century", "vo_v3.txt")).read().strip()
    takes = os.path.join(ROOT, "rick", "projects", "camp-century", "takes")
    os.makedirs(takes, exist_ok=True)
    made = []
    for stab in (0.0, 0.5):
        out = os.path.join(takes, f"river_v3_stab{int(stab * 10)}.mp3")
        if not os.path.exists(out):
            budget.check(JOB, "fal_tts_1k_chars", len(tts) / 1000)
            res = fal.run("fal-ai/elevenlabs/tts/eleven-v3", {"text": tts, "voice": "River", "stability": stab}, timeout=600, tag=f"{JOB}:v3:{stab}")
            raw = out + ".raw.mp3"; fal.download(res["audio"]["url"], raw); budget.log(JOB, "fal_tts_1k_chars", len(tts) / 1000, "fal")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-15:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "160k", out], check=True)
            os.remove(raw)
        d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], capture_output=True, text=True).stdout)
        print(f"[v3] stability {stab}: {d:.1f}s"); made.append((abs(d - 64), out))
    best = sorted(made)[0][1]
    mp3 = os.path.join(OUT, "voice.mp3")
    if os.path.exists(mp3): os.replace(mp3, os.path.join(takes, "river_v2_take3_62s.mp3"))
    w = os.path.join(OUT, "words.json")
    if os.path.exists(w): os.remove(w)
    import shutil; shutil.copy(best, mp3); print("[v3] picked", os.path.basename(best))
    voice()  # timings only (voice.mp3 exists)


def voice_mix():
    """Directed VO edit: one clip per beat (v2 narration, v3 acted lines), edges trimmed, inner pauses capped, designed gaps. -> voice.mp3"""
    cfg = json.load(open(os.path.join(ROOT, "rick", "projects", "camp-century", "vo_mix.json")))
    seg_dir = os.path.join(ROOT, "rick", "projects", "camp-century", "takes", "mix"); os.makedirs(seg_dir, exist_ok=True)
    cap, parts = cfg["cap"], []
    for i, sg in enumerate(cfg["segments"]):
        raw = os.path.join(seg_dir, f"{i:02d}_{sg['m']}.mp3")
        if not os.path.exists(raw):
            budget.check(JOB, "fal_tts_1k_chars", len(sg["t"]) / 1000)
            if sg["m"] == "v3":
                res = fal.run("fal-ai/elevenlabs/tts/eleven-v3", {"text": sg["t"], "voice": "River", "stability": 0.5}, timeout=300, tag=f"{JOB}:mix{i}")
            else:
                res = fal.run("fal-ai/elevenlabs/tts/multilingual-v2", {"text": sg["t"], "voice": "River", "stability": 0.4, "similarity_boost": 0.8,
                                                                      "style": 0.4, "speed": 1.12}, timeout=300, tag=f"{JOB}:mix{i}")
            fal.download(res["audio"]["url"], raw); budget.log(JOB, "fal_tts_1k_chars", len(sg["t"]) / 1000, "fal")
        clean = raw.replace(".mp3", ".wav")
        trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03"
        inner = f"silenceremove=stop_periods=-1:stop_duration={cap}:stop_threshold=-45dB:stop_silence={cap - 0.06}"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", f"{trim},areverse,{trim},areverse,{inner}", "-ar", "44100", "-ac", "1", clean], check=True)
        gap = os.path.join(seg_dir, f"gap_{i:02d}.wav")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", str(max(0.01, sg["gap"])), gap], check=True)
        parts += [gap, clean]
    lst = os.path.join(seg_dir, "list.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    mp3 = os.path.join(OUT, "voice.mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-af", "loudnorm=I=-15:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "160k", mp3], check=True)
    w = os.path.join(OUT, "words.json")
    if os.path.exists(w): os.remove(w)
    voice()


def props_tex():
    """Hero props seen up close: textured mesh (UVs + painted texture from the reference)."""
    for k in ("barber_chair", "bunk_bed", "reactor_console"):
        ref, glb = os.path.join(OUT, "props", "ref", k + ".png"), os.path.join(OUT, "props", k + "_tex.glb")
        if os.path.exists(glb): continue
        budget.check(JOB, "fal_3d_tex")
        res = fal.run("fal-ai/hunyuan3d/v2", {"input_image_url": fal.data_uri(ref), "textured_mesh": True, "octree_resolution": 256,
                                             "num_inference_steps": 50, "guidance_scale": 7.5}, timeout=900, tag=f"{JOB}:3dtex:{k}")
        fal.download(res["model_mesh"]["url"], glb); budget.log(JOB, "fal_3d_tex", 1, "fal"); print("[3d tex]", k)


if __name__ == "__main__":
    steps = sys.argv[1:] or ["voice", "textures", "props"]
    for s in steps:
        try:
            globals()[s]()
        except Exception as e:
            print(f"[{s}] FAILED: {e}", flush=True)
    print(budget.summary())
