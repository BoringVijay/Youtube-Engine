#!/usr/bin/env python3
"""Art department: penguin canon, per-video key art and penguin reference, every frame, motion clips.

Big media lives in Drive (videos/<job>/art). jobs/<id>/art.json keeps the manifest so later runs can re-download.
"""
import base64, json, os, subprocess, time
from concurrent.futures import ThreadPoolExecutor

import budget
import drive
import gai

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANON = os.path.join(ROOT, "creative", "penguin-sheet.png")
PENGUIN = ("THE PENGUIN (fixed traits, keep every one): a small, round, egg-shaped Adelie-type penguin, a bit bottom-heavy. Black head and back, clean white belly. "
           "Big round white eye-rings that make it look permanently curious. Small dark beak with an orange tip. Slightly oversized bright orange feet. "
           "Flippers a little too short (it cannot fly). SIGNATURE: three thin stubborn feathers sticking up from the top of its head, slightly bent. Nosy, deadpan, quietly unlucky.")
RULES = ("No watermark, no border, no logos or brand names, no real people, no famous characters. No numbers and no text unless the shot description asks for a sign or label; "
         "then spell it exactly. Keep the bottom fifth of the frame calm for captions. Cinematic composition, one clear focal point.")


def log(*a):
    print(time.strftime("%H:%M:%S"), "[art]", *a, flush=True)


def b64(path):
    return base64.b64encode(open(path, "rb").read()).decode()


def image(prompt, out_png, refs=(), aspect="16:9", job=None, size="2K"):
    parts = [{"inlineData": {"mimeType": "image/png", "data": b64(r)}} for r in refs if r and os.path.exists(r)]
    parts.append({"text": prompt})
    cfg = {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": aspect, "imageSize": size}}
    body = {"contents": [{"role": "user", "parts": parts}], "generationConfig": cfg}
    if job:
        budget.check(job, "image")
    try:
        out, model = gai.generate_any("image", body, timeout=240)
    except RuntimeError as e:
        if "imageSize" in str(e) or "image_size" in str(e):
            cfg.pop("imageSize")
            out, model = gai.generate_any("image", body, timeout=240)
        else:
            raise
    data = base64.b64decode(gai.first_inline(out)["data"])
    tmp = out_png + ".raw"
    open(tmp, "wb").write(data)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, out_png], check=True)
    os.remove(tmp)
    budget.log(job, "image", 1, gai.LAST["backend"])
    return out_png


def ensure_canon():
    if os.path.exists(CANON):
        return CANON
    os.makedirs(os.path.dirname(CANON), exist_ok=True)
    log("designing the canonical penguin sheet")
    image("Character model sheet for an original mascot, designer-vinyl-toy look, soft studio light, plain warm grey background. " + PENGUIN +
          " Top row: front, three-quarter, side and back views. Bottom row, four expressions: curious stare, deadpan side-eye, startled with the head feathers standing up, "
          "embarrassed after falling over. Small clean label 'CURIOUS PENGUIN' in a corner.", CANON, job="canon")
    return CANON


def frame_prompt(shot, d):
    u = d["universe"]
    look = u["look_bible"]
    if shot.get("nerd_bonus"):
        look = ("Technical blueprint plate on cyanotype paper: crisp white linework on Prussian blue, cross-sections, measurement lines and small accurate labels, "
                f"one warm highlight in {u['palette']['accent']}. It is the channel's 'nerd bonus' device.")
    p = f"{shot['prompt']}\n\nVISUAL UNIVERSE: {look}\n"
    if shot.get("penguin"):
        p += (f"\nPENGUIN CAMEO ({shot['penguin'].get('type', '')}): {shot['penguin']['bit']}. Use the penguin exactly as in the penguin reference image, "
              f"rendered as: {u.get('penguin_render', 'part of this universe')}. {PENGUIN}\n")
    else:
        p += "\nNo penguin in this shot.\n"
    return p + "\n" + RULES


class Art:
    def __init__(self, st, d, workdir, aspect="16:9"):
        self.st, self.d, self.job, self.aspect = st, d, st["id"], aspect
        self.dir = workdir
        os.makedirs(self.dir, exist_ok=True)
        self.man_path = os.path.join(ROOT, "jobs", self.job, "art.json")
        self.man = json.load(open(self.man_path)) if os.path.exists(self.man_path) else {"files": {}}
        self.folder = None

    def _folder(self):
        if not self.folder:
            vid = drive.ensure_folder(drive.CFG["videos"], self.job)
            self.folder = drive.ensure_folder(vid, "art")
        return self.folder

    def save(self):
        json.dump(self.man, open(self.man_path, "w"), indent=1)

    def path(self, name):
        return os.path.join(self.dir, name)

    def have(self, name):
        """Local file, or fetch it from Drive if a previous run made it."""
        p = self.path(name)
        if os.path.exists(p):
            return p
        fid = self.man["files"].get(name)
        if fid:
            try:
                return drive.download(fid, p)
            except Exception as e:
                log("re-download failed", name, str(e)[:120])
        return None

    def keep(self, name, mime):
        fid = drive.upload(self._folder(), name, self.path(name), mime)
        self.man["files"][name] = fid
        self.save()
        return fid

    def refs(self):
        """Key art (style anchor) and this universe's penguin, made once per video."""
        u = self.d["universe"]
        key = self.have("key.png")
        if not key:
            image(f"{self.d['thumbnail']['prompt']}\n\nVISUAL UNIVERSE: {u['look_bible']}\n\nIf the penguin appears: use the reference, rendered as {u.get('penguin_render', '')}. {PENGUIN}\n\n{RULES}",
                  self.path("key.png"), refs=[ensure_canon()], job=self.job, aspect=self.aspect)
            self.keep("key.png", "image/png")
            key = self.path("key.png")
        pen = self.have("penguin.png")
        if not pen:
            image(f"The penguin from the reference sheet re-imagined inside this visual universe: {u['look_bible']}\nRender it as: {u.get('penguin_render', '')}. "
                  f"Full body, three-quarter view, neutral pose, plain background in the universe's palette. {PENGUIN}", self.path("penguin.png"),
                  refs=[ensure_canon()], job=self.job, aspect="1:1", size="1K")
            self.keep("penguin.png", "image/png")
            pen = self.path("penguin.png")
        return key, pen

    def frames(self, progress=None, aspect="16:9", suffix=""):
        key, pen = self.refs()
        shots = self.d["shots"]
        done = [0]

        def one(s):
            name = f"{s['id']}{suffix}.png"
            if self.have(name):
                return name
            refs = [key] + ([pen] if s.get("penguin") else [])
            if aspect != "16:9" and suffix:
                wide = self.have(f"{s['id']}.png")
                refs = ([wide] if wide else []) + refs
                prompt = ("Recompose the first reference image as a vertical 9:16 frame: same scene, same style, same characters, re-framed for a phone screen "
                          "with the focal point in the middle third. " + RULES)
            else:
                prompt = frame_prompt(s, self.d)
            for attempt in range(3):
                try:
                    image(prompt, self.path(name), refs=refs, aspect=aspect, job=self.job)
                    self.keep(name, "image/png")
                    break
                except budget.OverBudget:
                    raise
                except Exception as e:
                    log(f"frame {s['id']} attempt {attempt + 1}: {str(e)[:160]}")
                    time.sleep(10 * (attempt + 1))
            done[0] += 1
            if progress:
                progress(done[0], len(shots))
            return name
        with ThreadPoolExecutor(max_workers=4) as ex:
            list(ex.map(one, shots))

    def motion(self, progress=None):
        """Animate the motion shots from their frames. Veo on Vertex (credits), Omni on the AI Studio key otherwise."""
        shots = [s for s in self.d["shots"] if s.get("kind") == "motion"]
        for k, s in enumerate(shots):
            name = f"{s['id']}.mp4"
            if self.have(name):
                continue
            src = self.have(f"{s['id']}.png")
            if not src:
                continue
            prompt = (f"{s.get('motion', '')}\n\nKeep the exact look of the image: {self.d['universe']['look_bible']}\n"
                      "Physically plausible motion, no morphing, no new text, no captions. Ambient sound only, no speech, no music.")
            if s.get("penguin"):
                prompt += f"\nThe penguin keeps its exact design: {PENGUIN}"
            try:
                budget.check(self.job, "video_per_sec", 8)
                if gai.backend() == "vertex":
                    data, model = gai.veo_any(prompt, b64(src), self.aspect, 8, audio=True)
                else:
                    data, model = gai.omni(prompt, b64(src), self.aspect), "omni"
                open(self.path(name), "wb").write(data)
                budget.log(self.job, "video_per_sec", 8, gai.backend())
                self.keep(name, "video/mp4")
                log(f"motion {s['id']} ok ({model})")
            except budget.OverBudget as e:
                log("motion skipped, budget:", e)
                s["kind"] = "still"
            except Exception as e:
                log(f"motion {s['id']} failed, using the still: {str(e)[:200]}")
                s["kind"] = "still"
            if progress:
                progress(k + 1, len(shots))
