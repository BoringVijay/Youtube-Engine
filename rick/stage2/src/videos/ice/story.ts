// The City the Ice Ate: shot timeline. Core shots live here; sections A/B/C live in shots/a.ts, b.ts, c.ts.
import { Expr } from "../bridge/toon";
import { CAST, soldierIce } from "./cast";
import { FPS, S, sec, talkAt, VO_END, ShotDef, ShotPart } from "./timeline";
import { SHOTS_A } from "./shots/a";
import { SHOTS_B } from "./shots/b";
import { SHOTS_C } from "./shots/c";
export * from "./timeline";

const CORE: ShotPart[] = [
  // 1. Hook (0-3.9 s): Hank shaving his ice wall, roommate pressed to the ceiling in the top bunk
  { a: 0, b: sec(3.86), light: "inside", set: "room", cInf: 13, marks: () => 4,
    cams: [{ f: 0, pos: [0.3, 1.3, 2.9], look: [0.4, 1.3, -1.4], fov: 58 }, { f: sec(3.86), dur: sec(3.86), pos: [0.25, 1.3, 2.4], look: [0.35, 1.32, -1.4], fov: 58 }],
    cast: (f) => [
      { who: CAST.HANK, key: "hank", x: -0.15, y: 0, z: -1.1, expr: "stern", mode: "stand", facing: 1, seed: 3, prop: ["razor", (f / FPS) * 1.6] },
      { who: soldierIce(1), key: "roomie", x: 1.5, y: 2.12, z: -0.7, expr: "pained", mode: "sit", facing: 1, seed: 5, scale: 0.78, headTilt: 0.25 },
    ] },
  // 2. Main Street glide (3.9-12.4 s): theater, barber pole, chapel, reactor door
  { a: sec(3.86), b: sec(12.4), light: "inside", set: "main", cInf: 7,
    cams: [{ f: sec(3.86), pos: [100.4, 1.7, 9], look: [99.6, 2.3, -14], fov: 48 },
           { f: sec(12.4), dur: sec(12.4 - 3.86), pos: [100.5, 1.75, -12], look: [99.4, 2.2, -38], fov: 48 }],
    cast: (f) => {
      const t = S(f - sec(3.86));
      return [
        { who: soldierIce(1), key: "s1", x: 98.4, y: 0, z: 1.5 - t * 1.4, mode: "stroll", phase: t * 0.9, facing: 0, seed: 2 },
        { who: CAST.COOK, key: "cook", x: 102.2, y: 0, z: -4, expr: "whistle", mode: "stand", facing: -1, seed: 8 },
        { who: soldierIce(2), key: "s2", x: 101.9, y: 0, z: -16, expr: "smile", mode: "stand", facing: -1, seed: 5 },
        { who: soldierIce(0), key: "s0", x: 98.6, y: 0, z: -27, expr: "neutral", mode: "stand", facing: 1, seed: 6 },
      ];
    } },
  // 7. The pencil mark (22.2-30.5 s). Night: Hank marks his height. Morning: the mark is lower (the ceiling is coming
  //    down, not Hank). The sergeant laughs, then delivers "Son... you're just growing." with his own lips.
  // night half: blue moonlit room so the time jump reads (same cameras/cast functions as the morning half)
  { a: sec(22.2), b: sec(24.6), light: "night", set: "room", cInf: 12, marks: (f) => (f < sec(23.7) ? 1 : 2),
    cams: [{ f: sec(22.2), pos: [-0.35, 1.55, 1.6], look: [-0.55, 1.6, -1.8], fov: 50 }, { f: sec(24.6), dur: sec(2.4), pos: [-0.38, 1.6, 1.25], look: [-0.58, 1.66, -1.8], fov: 49 }],
    cast: (f) => [{ who: CAST.HANK, key: "hank", x: -0.25, y: 0, z: -1.25, mode: "stand", facing: -1, seed: 3, expr: "stern",
      prop: S(f) < 24.0 ? ["pencil", S(f) * 0.8] : null, look: -0.6 }] },
  { a: sec(24.6), b: sec(30.48), light: "inside", set: "room", cInf: 12,
    marks: (f) => (f < sec(23.7) ? 1 : f < sec(24.6) ? 2 : 3),
    cams: [{ f: sec(24.6), pos: [-0.38, 1.6, 1.25], look: [-0.58, 1.66, -1.8], fov: 49 },
           { f: sec(25.7), dur: sec(1.1), pos: [-0.45, 1.75, 0.55], look: [-0.62, 1.78, -1.8], fov: 44 }, // morning: push to the marks
           { f: sec(26.9), dur: 14, pos: [0.15, 1.5, 2.6], look: [0.15, 1.35, -0.8], fov: 52 }],           // sergeant laughs: pull out to the two-shot
    cast: (f) => {
      const t = S(f);
      const night = t < 24.6;
      return [
        { who: CAST.HANK, key: "hank", x: -0.25, y: 0, z: -1.25, mode: "stand", facing: -1, seed: 3,
          expr: night ? "stern" : t < 26.4 ? "shock" : "nervous",
          prop: t < 24.0 ? ["pencil", t * 0.8] : null, look: night ? -0.6 : t < 26.4 ? -0.4 : 0.7 },
        ...(t >= 26.0 ? [{ who: CAST.SERGEANT, key: "sarge", x: 0.5, y: 0, z: -0.35, mode: "stand" as const, facing: -1 as const, seed: 9,
          expr: (t < 27.7 ? "laugh" : "smile") as Expr, talk: talkAt(t, 27.7, 30.45), look: -0.6 }] : []),
      ];
    } },
  // 8. Barber shop (30.5-34.4 s): ceiling so low the barber kneels to cut hair
  { a: sec(30.48), b: sec(34.4), light: "inside", set: "barber", cInf: 11,
    cams: [{ f: sec(30.48), pos: [200.15, 0.95, 3.4], look: [200.05, 0.72, -0.6], fov: 46 }, { f: sec(34.4), dur: sec(3.92), pos: [200.12, 0.95, 2.9], look: [200.05, 0.74, -0.6], fov: 46 }],
    ceil: () => 1.55,
    cast: () => [
      { who: CAST.BARBER, key: "barber", x: 200.4, y: 0.0, z: -0.45, expr: "stern", mode: "sit", facing: -1, seed: 4, prop: ["razor", 0.25] },
      { who: soldierIce(3), key: "cust", x: 199.7, y: 0.28, z: -0.62, expr: "dazed", mode: "sit", facing: 1, seed: 7 },
    ] },
];
// all sections, sorted by start frame; ids are 1-based positions
export const SHOTS: ShotDef[] = [...CORE, ...SHOTS_A, ...SHOTS_B, ...SHOTS_C].sort((x, y) => x.a - y.a).map((s, i) => ({ ...s, id: i + 1 }));
export const TOTAL = VO_END;
/** shot boundaries (frames) that play as portal fly-throughs instead of hard cuts (Afterhour flow study: <= 3 hard cuts a minute) */
const PORTAL_T = [12.4, 14.3, 19.6, 22.2, 30.48, 34.4, 42.5, 48.8, 51.1, 54.7, 60.2, 62.2, 66.7];
export const PORTALS = new Set(SHOTS.map((x) => x.a).filter((a) => PORTAL_T.some((t) => Math.abs(a - t * FPS) <= 3)));
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

