// The City the Ice Ate: shot timeline, cameras, light per shot, lens blur and who stands where.
// Timing is the gate-1 script at 3.7 words/s until the real voice + words.json lands; then every
// shot start snaps to its first word (reactions land 0-3 frames before the word, as in the reference).
import { Outfit, Expr, Prop } from "../bridge/toon";
import { CAST, soldierIce } from "./cast";

export const FPS = 30;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** reference camera ease: symmetric smootherstep (~10 f in / 10 f out on a 23 f move) */
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

export type Light = "day" | "golden" | "inside" | "night";
export type SetName = "room" | "main" | "barber" | "surface";
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type Key = { f: number; dur?: number; pos: V3; look: V3; fov?: number; roll?: number };
export type Spot = {
  who: Outfit; key: string; x: number; y: number; z: number; expr?: Expr; mode?: "stand" | "stroll" | "sit" | "march";
  phase?: number; facing?: -1 | 0 | 1; prop?: Prop; look?: number; seed?: number; scale?: number; headTilt?: number; tilt?: number;
};
export type ShotDef = {
  id: number; a: number; b: number; light: Light; set: SetName; cams: Key[]; cInf: number;
  cast?: (t: number) => Spot[]; ceil?: (t: number) => number; // barber shop ceiling height over time
};

// local time inside a shot in seconds
const S = (f: number) => f / FPS;

export const SHOTS: ShotDef[] = [
  // 1. Hook: Hank shaving his ice wall, roommate pressed to the ceiling in the top bunk
  { id: 1, a: 0, b: 150, light: "inside", set: "room", cInf: 13,
    cams: [{ f: 0, pos: [0.15, 1.35, 3.1], look: [0.15, 1.3, -1.4], fov: 44 }, { f: 150, dur: 150, pos: [0.12, 1.33, 2.55], look: [0.1, 1.32, -1.4], fov: 44 }],
    cast: (f) => [
      { who: CAST.HANK, key: "hank", x: -0.55, y: 0, z: -1.05, expr: "stern", mode: "stand", facing: -1, seed: 3, prop: ["razor", (f / FPS) * 1.6] },
      { who: soldierIce(1), key: "roomie", x: 1.5, y: 2.12, z: -0.7, expr: "pained", mode: "sit", facing: 1, seed: 5, scale: 0.78, headTilt: 0.25 },
    ] },
  // 3. Main Street glide: theater, barber pole, chapel, reactor door
  { id: 2, a: 150, b: 330, light: "inside", set: "main", cInf: 7,
    cams: [{ f: 150, pos: [100.4, 1.7, 9], look: [99.6, 2.3, -14], fov: 48 },
           { f: 330, dur: 180, pos: [100.5, 1.75, -9], look: [99.4, 2.2, -36], fov: 48 }],
    cast: (f) => {
      const t = S(f - 150);
      return [
        { who: soldierIce(1), key: "s1", x: 98.4, y: 0, z: 1.5 - t * 1.4, mode: "stroll", phase: t * 0.9, facing: 0, seed: 2 },
        { who: CAST.COOK, key: "cook", x: 102.2, y: 0, z: -4, expr: "whistle", mode: "stand", facing: -1, seed: 8 },
        { who: soldierIce(2), key: "s2", x: 101.9, y: 0, z: -16, expr: "smile", mode: "stand", facing: -1, seed: 5 },
        { who: soldierIce(0), key: "s0", x: 98.6, y: 0, z: -27, expr: "neutral", mode: "stand", facing: 1, seed: 6 },
      ];
    } },
  // 8. Barber shop: ceiling so low the barber kneels to cut hair
  { id: 3, a: 330, b: 450, light: "inside", set: "barber", cInf: 11,
    cams: [{ f: 330, pos: [200.15, 0.78, 3.4], look: [200.05, 1.0, -0.6], fov: 46 }, { f: 450, dur: 120, pos: [200.12, 0.8, 2.9], look: [200.05, 1.0, -0.6], fov: 46 }],
    ceil: () => 1.55,
    cast: () => [
      { who: CAST.BARBER, key: "barber", x: 200.45, y: 0.12, z: -0.35, expr: "stern", mode: "sit", facing: -1, seed: 4, prop: ["razor", 0.25] },
      { who: soldierIce(3), key: "cust", x: 199.75, y: 0.42, z: -0.7, expr: "dazed", mode: "sit", facing: 1, seed: 7 },
    ] },
];
export const TOTAL = SHOTS[SHOTS.length - 1].b;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

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
