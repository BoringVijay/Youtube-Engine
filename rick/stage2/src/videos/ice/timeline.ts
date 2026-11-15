// The City the Ice Ate: timeline helpers + types shared by story.ts and the per-section shot files (shots/*.ts).
// Timing is the gate-1 script at 3.7 words/s until the real voice + words.json lands; then every
// shot start snaps to its first word (reactions land 0-3 frames before the word, as in the reference).
import { Outfit, Expr, Prop } from "../bridge/toon";
import VO from "../../../public/ice/words.json";
const WORDS = (VO as unknown as { words: [string, number, number][] }).words;

export const FPS = 30;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** reference camera ease: symmetric smootherstep (~10 f in / 10 f out on a 23 f move) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

export type Light = "day" | "golden" | "inside" | "night" | "arctic" | "lab";
export type SetName = string;
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Key = { f: number; dur?: number; pos: V3; look: V3; fov?: number; roll?: number };
export type Spot = {
  who: Outfit; key: string; x: number; y: number; z: number; expr?: Expr; mode?: "stand" | "stroll" | "sit" | "march";
  phase?: number; facing?: -1 | 0 | 1; prop?: Prop; talk?: 0 | 1 | 2; look?: number; seed?: number; scale?: number; headTilt?: number; tilt?: number;
};
export type ShotDef = {
  id: number; a: number; b: number; light: Light; set: SetName; cams: Key[]; cInf: number;
  cast?: (t: number) => Spot[]; marks?: (f: number) => number;
  /** optional per-frame hook for animated set pieces (rails bending, honey creeping, melt) — runs after posing the camera */
  anim?: (f: number) => void; ceil?: (t: number) => number; // barber shop ceiling height over time
};

// local time inside a shot in seconds
export const S = (f: number) => f / FPS;

// shot boundaries snap to the first word of each beat (words.json, voice take "directed edit", 72.5 s)
export const sec = (t: number) => Math.round(t * FPS);
export const VO_END = sec(72.6);

/** lip flap for a line the narrator voices "as" a character: flaps once per ~0.15 s inside each word, closed in the gaps */
export const talkAt = (t: number, from: number, to: number): 0 | 1 | 2 => {
  if (t < from || t > to) return 0;
  const w = WORDS.find((x) => t >= x[1] && t < x[2]);
  if (!w) return 0;
  const n = Math.max(1, Math.round((w[2] - w[1]) / 0.15)), ph = (((t - w[1]) / Math.max(0.05, w[2] - w[1])) * n) % 1;
  return ph < 0.18 ? 1 : ph < 0.72 ? 2 : 1;
};



const full = (k: Key): Cam => ({ pos: k.pos, look: k.look, fov: k.fov ?? 40, roll: k.roll ?? 0 });
const lerp = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
/** camera at frame f: keys glide with the reference ease; a key's dur is the move length ending at key.f */
export const camAt = (s: ShotDef, f: number): Cam => {
  let cur = full(s.cams[0]);
  for (let i = 1; i < s.cams.length; i++) {
    const k = s.cams[i], d = k.dur ?? 24, start = k.f - d;
    if (f < start) break;
    cur = lerp(cur, full(k), d >= 90 ? (f - start) / d : glide((f - start) / d)); // long holds creep linearly (push-in)
  }
  return cur;
};

export type ShotPart = Omit<ShotDef, "id">;
