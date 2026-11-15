// Video A, section B shots (lines 8-15, 26.811-63.397 s). Only the section-B helper edits this file.
// 8 calendar rip + confetti -> 9 GPU whiteboard / blank faces / "gas powered unicorn?" -> 10 the bet, ANYONE ANYTHING, not just games, the stock falls through the floor
// -> 11 2012 dorm (CAT ✓, two cards, crushes everyone) -> 12 the jacket drops (the ONE jacket moment) -> 13 box with a bow up the stairs to the tiny lab
// -> ChatGPT queue -> scale leap to a planet of queues -> $5T -> tiny Japan vs one chip.
import { ShotPart, Spot, sec, S, talkAt } from "../timeline";
import { Outfit, SKINS } from "../../bridge/toon";
import { CAST, crowd } from "../cast";
import {
  B_OFFICE as OX, B_CONF as CF, B_STAGE as SX, B_WALL as WX, B_DORM as DX, B_SKY as KX, B_LAB as LX, B_SCALE as SC,
  DESKS_B, CONF_SEATS, STAGE_FOLK, TILE_T0, TILE_DT, RIP, JL, LAB, LABBOX, stairY, POLE, patchY, DORM_FOLK, SCALE, scaleTheta, ss, spring, clamp01,
} from "../sets/b";

const MKT: Outfit = { jacket: "#ff7a3a", pants: "#2c3144", boots: "#2a2420", hat: "hair", hair: "#2a1a10", skin: SKINS[1], buttons: "#ffd23f" };
const bob = (t: number, ph = 0) => 0.012 * Math.sin(t * 2.1 + ph);

// ---------------------------------------------------------------- 8. calendar rips off (26.811-29.354)
const s1: ShotPart = {
  a: sec(26.811), b: sec(29.354), light: "inside", set: "b_office", cInf: 11,
  cams: [{ f: sec(26.811), pos: [OX + 0.05, 1.75, 1.8], look: [OX, 1.85, -4.5], fov: 38 },
         { f: sec(27.5), dur: sec(0.7), pos: [OX + 0.0, 1.8, 0.9], look: [OX, 1.9, -4.5], fov: 36 },
         { f: sec(29.354), dur: sec(1.7), pos: [OX + 0.35, 1.7, 4.8], look: [OX - 0.1, 1.55, -3.2], fov: 46 }],
  cast: (f) => {
    const t = S(f), u = t - RIP, hop = u > 0.4 ? 0.22 * Math.abs(Math.sin((u - 0.4) * 7)) * Math.exp(-(u - 0.4) * 0.5) : 0;
    const out: Spot[] = DESKS_B.map(([x, z], i) => ({
      who: crowd([2, 3, 5, 1][i]), key: "w" + i, x: OX + x, y: 0.35 + (u > 0.4 ? 0.1 * Math.abs(Math.sin((u - 0.4) * 8 + i)) : 0.01 * Math.sin(t * 7 + i)), z: z - 0.62, mode: "sit", seed: 40 + i,
      expr: u < 0 ? "shock" : u < 0.4 ? "dazed" : "laugh", wave: u > 0.4 ? 1 : 0, look: 0.2 * (i % 3 - 1),
    }));
    out.push({ who: CAST.JENSEN_1993, key: "j93", x: OX - 0.95, y: hop, z: -3.75, mode: "stand", seed: 3, expr: u < 0 ? "nervous" : u < 0.4 ? "shock" : "laugh", wave: u > 0.3 ? 1 : 0.5, look: 0.5, facing: 1 });
    return out;
  },
};

// ---------------------------------------------------------------- 9. GPU on the whiteboard (29.354-31.4)
const s2: ShotPart = {
  a: sec(29.354), b: sec(31.4), portal: true, light: "inside", set: "b_conf", cInf: 10,
  cams: [{ f: sec(29.354), pos: [CF + 0.5, 1.6, 2.6], look: [CF + 0.1, 1.8, -4.2], fov: 48 },
         { f: sec(31.4), dur: sec(2.0), pos: [CF + 0.35, 1.7, 1.6], look: [CF + 0.15, 1.85, -4.2], fov: 46 }],
  cast: (f) => {
    const t = S(f);
    return [
      { who: MKT, key: "mkt", x: CF + 1.3, y: 0, z: -3.6, mode: "stand", seed: 7, expr: t < 30.95 ? "grin" : "laugh", talk: talkAt(t, 29.354, 31.4), wave: 1, look: -0.6, facing: -1 },
      { who: CAST.JENSEN_1993, key: "j93", x: CF - 1.3, y: 0, z: -1.3, mode: "stand", seed: 3, expr: t < 30.6 ? "nervous" : "stern", look: 0.6, facing: 1 },
    ];
  },
};
// ---------------------------------------------------------------- nobody knows what a GPU is (31.4-33.541)
const UNI = 2;
const seatSpots = (t: number, n = 8): Spot[] => CONF_SEATS.slice(0, n).map(([x, y, z], i) => {
  const uni = i === UNI;
  return { who: crowd([1, 4, 2, 5, 0, 3, 4, 2][i]), key: "au" + i, x: CF + x, y: y + bob(t, i), z, mode: "sit", seed: 60 + i,
    expr: uni ? (t > 32.15 ? "smile_closed" : "dazed") : (["neutral", "dazed", "stern", "neutral", "dazed", "neutral", "stern", "dazed"][i] as Spot["expr"]),
    talk: uni ? talkAt(t, 32.15, 33.45) : 0, look: Math.sign(-x) * 0.3 };
});
const s3: ShotPart = {
  a: sec(31.4), b: sec(33.541), light: "inside", set: "b_conf", cInf: 11,
  cams: [{ f: sec(31.4), pos: [CF + 0.7, 1.55, -3.1], look: [CF + 0.1, 1.3, 4.0], fov: 52 },
         { f: sec(33.541), dur: sec(2.1), pos: [CF - 0.9, 1.6, -2.4], look: [CF - 1.1, 1.7, 3.2], fov: 44 }],
  cast: (f) => {
    const t = S(f); const out = seatSpots(t);
    out.push({ who: crowd(3), key: "headchair", x: CF, y: 0.35, z: 7.7, mode: "sit", seed: 71, expr: "neutral", look: 0 });
    return out;
  },
};

// ---------------------------------------------------------------- 10. the bet: everything onto the table (33.541-35.16)
const s4: ShotPart = {
  a: sec(33.541), b: sec(35.16), light: "inside", set: "b_conf", cInf: 10,
  cams: [{ f: sec(33.541), pos: [CF - 0.6, 1.5, 5.9], look: [CF + 0.1, 1.0, -1.0], fov: 46 },
         { f: sec(35.16), dur: sec(1.6), pos: [CF - 0.35, 1.45, 4.9], look: [CF + 0.1, 1.05, 0.0], fov: 42 }],
  cast: (f) => {
    const t = S(f), out = seatSpots(t, 6).map((c, i) => ({ ...c, expr: (t > 33.95 ? (i % 2 ? "shock" : "dazed") : c.expr) as Spot["expr"], talk: 0 as 0 | 1 | 2 }));
    out.push({ who: CAST.JENSEN_1993, key: "j93", x: CF, y: 0, z: -0.2, mode: "stand", seed: 3, expr: t < 33.9 ? "stern" : "grin", wave: 0.9, look: 0, talk: talkAt(t, 33.541, 34.7) });
    return out;
  },
};

// ---------------------------------------------------------------- ANYONE. ANYTHING. (35.16-37.2) and "not just games" (37.2-38.96)
const folk = (t: number, game: boolean): Spot[] => STAGE_FOLK.map((p, i) => {
  const on = t > TILE_T0 + i * TILE_DT + 0.1;
  return { who: crowd(p.v), key: "fk" + i, x: SX + p.x, y: 0.005 * Math.sin(t * 6 + i), z: p.z, mode: "stand", seed: 80 + i,
    expr: game ? (t > 37.6 ? "dazed" : "shock") : on ? (i % 2 ? "laugh" : "grin") : "smile", wave: game ? 0 : on ? 0.5 + 0.5 * Math.abs(Math.sin(t * 5 + i)) : 0.2, look: 0.2 };
});
const s5: ShotPart = {
  a: sec(35.16), b: sec(37.2), portal: true, light: "inside", set: "b_stage", cInf: 10,
  cams: [{ f: sec(35.16), pos: [SX + 0.1, 1.9, 6.0], look: [SX - 0.1, 3.0, -4.0], fov: 46 },
         { f: sec(37.2), dur: sec(2.0), pos: [SX - 0.1, 1.8, 4.2], look: [SX - 0.1, 3.0, -4.0], fov: 43 }],
  cast: (f) => {
    const t = S(f), out = folk(t, false);
    out.push({ who: CAST.JENSEN_1993, key: "j93", x: SX - 1.9, y: 0, z: -0.4, mode: "stand", seed: 3, expr: "grin", wave: 1, look: 0.5, facing: 1, talk: talkAt(t, 35.16, 36.95) });
    return out;
  },
};
const s6: ShotPart = {
  a: sec(37.2), b: sec(38.96), light: "inside", set: "b_stage", cInf: 10,
  cams: [{ f: sec(37.2), pos: [SX + 0.5, 2.0, 4.6], look: [SX, 3.2, -4.0], fov: 44 },
         { f: sec(38.96), dur: sec(1.7), pos: [SX + 0.1, 1.9, 3.6], look: [SX, 3.3, -4.0], fov: 40 }],
  cast: (f) => {
    const t = S(f), out = folk(t, true);
    out.push({ who: CAST.JENSEN_1993, key: "j93", x: SX - 1.9, y: 0, z: -0.4, mode: "stand", seed: 3, expr: t < 37.6 ? "grin" : "smile_closed", wave: 0.4, look: 0.5, facing: 1 });
    return out;
  },
};

// ---------------------------------------------------------------- Wall Street hates it: the stock falls through the floor (38.96-40.018)
const s7: ShotPart = {
  a: sec(38.96), b: sec(40.018), portal: true, light: "inside", set: "b_wall", cInf: 10,
  cams: [{ f: sec(38.96), pos: [WX + 0.5, 1.7, 4.2], look: [WX + 0.4, 2.0, -3.8], fov: 46 },
         { f: sec(39.5), dur: sec(0.45), pos: [WX + 0.8, 1.6, 3.0], look: [WX + 1.0, 1.0, -3.7], fov: 46 },
         { f: sec(40.018), dur: sec(0.5), pos: [WX + 1.0, 2.0, 2.4], look: [WX + 1.1, 0.1, -3.0], fov: 48 }],
  cast: (f) => {
    const t = S(f), shock = t > 39.1;
    return [
      { who: CAST.JENSEN_2012, key: "j12", x: WX - 1.0, y: 0, z: -0.2, mode: "stand", seed: 3, expr: t < 39.0 ? "nervous" : "shock", look: 0.5, facing: 1 },
      { who: crowd(0), key: "tr0", x: WX - 2.4, y: 0, z: -1.0, mode: "stand", seed: 91, expr: shock ? "shock" : "stern", wave: shock ? 1 : 0, look: 0.4 },
      { who: crowd(5), key: "tr1", x: WX - 0.7, y: 0, z: -2.5, mode: "stand", seed: 92, expr: shock ? "dazed" : "stern", look: 0.3 },
      { who: crowd(3), key: "tr2", x: WX + 2.6, y: 0, z: -1.2, mode: "stand", seed: 93, expr: shock ? "shock" : "neutral", wave: shock ? 1 : 0, look: -0.5, facing: -1 },
      { who: CAST.SUIT, key: "tr3", x: WX + 3.0, y: 0, z: 0.4, mode: "stand", seed: 94, expr: shock ? "nervous" : "stern", look: -0.4, facing: -1 },
    ];
  },
};

// ---------------------------------------------------------------- 11. 2012 dorm (40.018-45.65)
const dormFolk = (t: number, cele: boolean): Spot[] => [
  { who: CAST.GEEK, key: "ga", x: DX - 1.1, y: 0.35, z: -2.2, mode: "sit", seed: 101, expr: cele ? "laugh" : t < 41.5 ? "neutral" : "smile", look: 0.5, wave: cele ? 1 : 0 },
  { who: CAST.INTERN, key: "gb", x: DX + 1.95, y: 0, z: -2.2, mode: "stand", seed: 102, expr: cele ? "laugh" : "dazed", look: -0.6, facing: -1, wave: cele ? 1 : 0 },
  { who: crowd(2), key: "gc", x: DX - 1.85, y: 0.55, z: -2.0, mode: "sit", seed: 103, expr: cele ? "grin" : "neutral", look: 0.4 },
];
const s8: ShotPart = {
  a: sec(40.018), b: sec(42.56), portal: true, light: "inside", set: "b_dorm", cInf: 10,
  cams: [{ f: sec(40.018), pos: [DX + 0.4, 1.5, 2.9], look: [DX + 0.1, 1.4, -3.0], fov: 48 },
         { f: sec(42.56), dur: sec(1.9), pos: [DX - 0.1, 1.4, -0.5], look: [DX - 0.15, 1.36, -3.0], fov: 42 }],
  cast: (f) => dormFolk(S(f), false),
};
const s9: ShotPart = {
  a: sec(42.56), b: sec(44.46), light: "inside", set: "b_dorm", cInf: 9,
  cams: [{ f: sec(42.56), pos: [DX + 1.15, 1.3, -0.8], look: [DX + 1.08, 1.27, -3.1], fov: 46 },
         { f: sec(44.46), dur: sec(1.9), pos: [DX + 1.05, 1.28, -1.3], look: [DX + 1.05, 1.25, -3.1], fov: 44 }],
  cast: () => [],
};
const s10: ShotPart = {
  a: sec(44.46), b: sec(45.65), light: "inside", set: "b_dorm", cInf: 10,
  cams: [{ f: sec(44.46), pos: [DX - 2.15, 1.5, -0.2], look: [DX + 2.3, 1.5, 0.55], fov: 50 },
         { f: sec(45.65), dur: sec(1.2), pos: [DX - 1.95, 1.5, 0.0], look: [DX + 2.3, 1.55, 0.6], fov: 46 }],
  cast: (f) => {
    const t = S(f), j = Math.abs(Math.sin(t * 8));
    return [
      { who: CAST.GEEK, key: "ga", x: DX + 0.9, y: 0.12 * j, z: -0.45, mode: "stand", seed: 101, expr: "laugh", wave: 1, look: 0.3 },
      { who: CAST.INTERN, key: "gb", x: DX + 0.9, y: 0.12 * Math.abs(Math.sin(t * 8 + 1.5)), z: 1.95, mode: "stand", seed: 102, expr: "laugh", wave: 1, look: -0.3 },
    ];
  },
};

// ---------------------------------------------------------------- 12. you built the engine of AI: the jacket drops (45.65-48.539)
const JX = KX - 0.0;
const s11: ShotPart = {
  a: sec(45.65), b: sec(47.02), portal: true, light: "day", set: "b_sky", cInf: 10,
  cams: [{ f: sec(45.65), pos: [KX - 0.2, 1.5, 7.0], look: [KX - 0.9, 2.3, -3.0], fov: 46 },
         { f: sec(47.02), dur: sec(1.4), pos: [KX - 0.2, 1.4, 4.4], look: [KX - 0.6, 2.2, -3.0], fov: 42 }],
  cast: (f) => {
    const t = S(f);
    return [{ who: CAST.JENSEN_2012, key: "j12", x: JX, y: 0, z: -2.2, mode: "stand", seed: 3, expr: t < 46.4 ? "smile_closed" : t < 46.8 ? "dazed" : "shock", headTilt: t > 46.4 ? -5 : 0, look: 0, talk: 0 }];
  },
};
const s12: ShotPart = {
  a: sec(47.02), b: sec(48.539), light: "day", set: "b_sky", cInf: 9,
  cams: [{ f: sec(47.02), pos: [KX + 0.9, 0.5, 2.0], look: [KX, 3.6, -2.2], fov: 52 },
         { f: sec(47.9), dur: 14, pos: [KX - 0.5, 1.25, 3.2], look: [KX - 0.2, 1.4, -2.2], fov: 42 },
         { f: sec(48.539), dur: sec(0.8), pos: [KX - 0.3, 1.3, 2.4], look: [KX - 0.1, 1.45, -2.2], fov: 38 }],
  cast: (f) => {
    const t = S(f), u = t - JL;
    if (u < 0) return [{ who: CAST.JENSEN_2012, key: "j12", x: JX, y: 0, z: -2.2, mode: "stand", seed: 3, expr: "shock", headTilt: -6, look: 0 }];
    const pulse = 1 + 0.14 * Math.exp(-u * 5) * Math.cos(u * 16) + 0.04;
    return [{ who: CAST.JENSEN, key: "jen", x: JX, y: 0.12 * Math.max(0, Math.sin(u * 9)) * Math.exp(-u * 1.5), z: -2.2, mode: "stand", seed: 3, expr: u < 0.5 ? "laugh" : "grin", wave: 1, look: 0, scale: pulse }];
  },
};

// ---------------------------------------------------------------- 13. the box with a bow up the stairs (48.539-52.647)
const T13 = 48.539;
const jx = (t: number) => Math.min(3.0, -3.2 + (t - T13) * 1.9);
const jPos = (t: number) => { const x = jx(t); return { x: LX + x, y: stairY(x), z: LAB.z }; };
const placeBox = (t: number) => {
  const g = LABBOX.g; if (!g) return; const p = jPos(t), d = ss(51.4, 51.95, t);
  g.position.set(p.x + (LX + 4.15 - p.x) * d, p.y + 0.42 + 0.025 * Math.sin(t * 9) * (1 - d) + (LAB.landY - p.y - 0.42) * d, LAB.z + 0.45 + (-0.85 - LAB.z - 0.45) * d); g.scale.setScalar(0.9);
};
const carry = (t: number): Spot => { const p = jPos(t), moving = jx(t) < 3.0; return { who: CAST.JENSEN, key: "jen", x: p.x, y: p.y, z: p.z, mode: moving ? "stroll" : "stand", phase: t * 2.7, facing: 1, seed: 3, expr: t < 51.9 ? "grin" : "relief_open", look: 0.4 }; };
const s13: ShotPart = {
  a: sec(48.539), b: sec(50.6), portal: true, light: "day", set: "b_lab", cInf: 10,
  cams: [{ f: sec(48.539), pos: [LX - 3.0, 1.5, 5.2], look: [LX - 2.4, 0.9, -0.6], fov: 48 },
         { f: sec(50.6), dur: sec(2.0), pos: [LX - 0.2, 2.5, 4.8], look: [LX + 0.9, 1.9, -0.6], fov: 44 }],
  cast: (f) => [carry(S(f))],
  anim: (f) => placeBox(S(f)),
};
const labFolk = (t: number): Spot[] => [
  { who: CAST.INTERN, key: "lf0", x: LX + 4.2, y: LAB.landY, z: -1.4, mode: "stand", seed: 111, expr: t < 51.5 ? "neutral" : "laugh", wave: t > 51.5 ? 1 : 0, look: -0.4, facing: -1 },
  { who: CAST.GEEK, key: "lf1", x: LX + 5.15, y: LAB.landY, z: -1.0, mode: "stand", seed: 112, expr: t < 51.5 ? "neutral" : "shock", look: -0.5, facing: -1, wave: t > 51.7 ? 0.6 : 0 },
  { who: crowd(4), key: "lf2", x: LX + 3.2, y: LAB.landY, z: -1.3, mode: "stand", seed: 113, expr: t < 51.5 ? "neutral" : "grin", look: 0.5, facing: 1, wave: t > 51.5 ? 1 : 0 },
];
const s14: ShotPart = {
  a: sec(50.6), b: sec(52.647), light: "day", set: "b_lab", cInf: 10,
  cams: [{ f: sec(50.6), pos: [LX + 0.6, 3.0, 5.4], look: [LX + 2.8, 3.0, -0.8], fov: 46 },
         { f: sec(52.647), dur: sec(2.0), pos: [LX + 2.1, 3.3, 3.7], look: [LX + 3.9, 3.2, -0.9], fov: 40 }],
  cast: (f) => { const t = S(f); return [carry(t), ...labFolk(t)]; },
  anim: (f) => placeBox(S(f)),
};
const queue = (t: number): Spot[] => Array.from({ length: 15 }, (_, i) => {
  const x = 2.5 - i * 0.68, t0 = 52.8 + i * 0.12, k = spring(t, t0, 12, 5);
  return { who: i % 4 === 0 ? CAST.SUIT : crowd(i), key: "q" + i, x: LX + x, y: stairY(x) + 0.0, z: -0.1 + (((i * 7) % 3) - 1) * 0.32, mode: "stand", seed: 120 + i, scale: Math.max(0.001, k),
    expr: (["nervous", "neutral", "dazed", "stern", "smile"][i % 5]) as Spot["expr"], look: 0.4 };
});
const s15: ShotPart = {
  a: sec(52.647), b: sec(54.74), light: "day", set: "b_lab", cInf: 11,
  cams: [{ f: sec(52.647), pos: [LX + 1.2, 3.3, 7.4], look: [LX + 1.4, 2.6, -1.0], fov: 50 },
         { f: sec(54.74), dur: sec(2.1), pos: [LX - 1.8, 3.9, 9.8], look: [LX + 0.2, 2.9, -1.4], fov: 54 }],
  cast: (f) => { const t = S(f); return [carry(t), ...labFolk(t).map((s) => ({ ...s, expr: "laugh" as Spot["expr"], wave: 1 })), ...queue(t)]; },
  anim: (f) => placeBox(S(f)),
};

// ---------------------------------------------------------------- 14. scale leap: one box to a planet of queues (54.74-57.462)
const D = (d: number): [number, number, number] => [POLE[0], POLE[1] + 0.55 * d + 0.2, POLE[2] + 0.835 * d];
const QS = Array.from({ length: 9 }, (_, i) => ({ x: ((i * 5) % 3 - 1) * 0.35, z: -1.3 - i * 1.15 }));
const s16: ShotPart = {
  a: sec(54.74), b: sec(57.462), portal: true, light: "night", set: "b_planet", cInf: 12,
  cams: [{ f: sec(54.74), pos: D(3.4), look: [POLE[0], 0.7, POLE[2]], fov: 40 },
         { f: sec(55.1), dur: 30, pos: D(8), look: [POLE[0], 0.3, POLE[2] - 1], fov: 42 },
         { f: sec(55.5), dur: 30, pos: D(20), look: [POLE[0], -3, POLE[2] - 2], fov: 46 },
         { f: sec(55.95), dur: 30, pos: D(48), look: [POLE[0], -18, POLE[2] - 3], fov: 50 },
         { f: sec(56.5), dur: 34, pos: D(90), look: [POLE[0], -35, POLE[2] - 3], fov: 56 },
         { f: sec(57.462), dur: 40, pos: D(100), look: [POLE[0], -40, POLE[2]], fov: 60 }],
  cast: (f) => {
    const t = S(f);
    return QS.map((q, i) => ({ who: i % 3 === 0 ? CAST.SUIT : crowd(i + 1), key: "pq" + i, x: POLE[0] + q.x, y: patchY(q.x, q.z) + bob(t, i) * 0.3, z: POLE[2] + q.z, mode: "stand" as const, seed: 140 + i,
      expr: (["nervous", "neutral", "dazed", "stern", "smile"][i % 5]) as Spot["expr"], look: 0.2 }));
  },
};

// ---------------------------------------------------------------- 15. five trillion (57.462-60.82) and tiny Japan vs one chip (60.82-63.397)
const s17: ShotPart = {
  a: sec(57.462), b: sec(60.82), portal: true, light: "inside", set: "b_scale", cInf: 10,
  cams: [{ f: sec(57.462), pos: [SC + 1.8, 1.8, 6.3], look: [SC - 0.2, 3.8, -2.5], fov: 52 },
         { f: sec(60.82), dur: sec(3.3), pos: [SC + 0.5, 2.0, 4.7], look: [SC - 0.1, 3.7, -2.2], fov: 50 }],
  cast: (f) => {
    const t = S(f), hit = t > 59.0 ? Math.exp(-(t - 59.0) * 4) : 0;
    return [
      { who: CAST.JENSEN, key: "jen", x: SC, y: 1.0 + 0.06 * Math.abs(Math.sin(t * 7)) * (t > 59 ? 1 : 0.3), z: -2.0, mode: "stand", seed: 3, expr: t < 59.0 ? "smile" : "laugh", wave: 1, look: 0, scale: 1 + 0.08 * hit },
      ...[-2.2, -1.2, 1.3, 2.4].map((x, i) => ({ who: crowd(i + 2), key: "cr" + i, x: SC + x, y: 0.1 * Math.abs(Math.sin(t * 6 + i)) * (t > 57.8 ? 1 : 0), z: 0.1 + (i % 2) * 0.7, mode: "stand" as const, seed: 150 + i, expr: (t > 57.8 ? "laugh" : "smile") as Spot["expr"], wave: t > 57.8 ? 1 : 0, look: 0 })),
    ];
  },
};
const s18: ShotPart = {
  a: sec(60.82), b: sec(63.397), light: "inside", set: "b_scale", cInf: 10,
  cams: [{ f: sec(60.82), pos: [SC + 0.3, 1.9, 5.0], look: [SC, 1.8, -2.0], fov: 46 },
         { f: sec(61.95), dur: sec(0.55), pos: [SC + 1.0, 1.2, 3.5], look: [SC + 0.9, 0.9, -2.0], fov: 42 },
         { f: sec(63.397), dur: sec(1.4), pos: [SC + 1.3, 1.0, 2.8], look: [SC + 0.9, 0.8, -2.0], fov: 38 }],
  cast: (f) => {
    const t = S(f), th = scaleTheta(t), down = t > SCALE.hit + 0.35;
    return [
      { who: CAST.JENSEN, key: "jen", x: SC + 2.7, y: 0.12 * Math.abs(Math.sin(t * 8)) * (down ? 1 : 0), z: -1.0, mode: "stand", seed: 3, expr: down ? "laugh" : "grin", wave: down ? 1 : 0.4, look: -0.5, facing: -1 },
      { who: CAST.SUIT, key: "eco", x: SC - 2.6, y: 0, z: -1.2, mode: "stand", seed: 31, expr: t < SCALE.hit ? "neutral" : "shock", look: 0.5, facing: 1, tilt: down ? 1.5 * Math.sin(t * 20) : 0 },
      { who: crowd(5), key: "cb", x: SC - 1.5, y: 0, z: -3.3, mode: "stand", seed: 160, expr: Math.abs(th) > 0.1 ? "shock" : "neutral", look: 0.3 },
    ];
  },
};
void clamp01; void DORM_FOLK; void spring;

export const SHOTS_B: ShotPart[] = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18];
