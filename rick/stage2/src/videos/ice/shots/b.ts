// Section B shots (34.4-51.1 s). Only the section-B helper edits this file.
// Dig montage -> counter -> rails bend like spaghetti -> "Wait." -> honey explainer (pour, creep, push) -> glacier cutaway.
import { ShotPart, Spot, sec, S } from "../timeline";
import { CAST, soldierIce } from "../cast";
import { DIG, MESS, GLAC, TABLE_TOP } from "../sets/b";

const swing = (t: number, ph: number) => 0.5 + 0.5 * Math.sin((t * 1.7 + ph) * Math.PI * 2);
const W = 2.6;
// digging crew along the tunnel walls: [side, z, phase, variant]
const CREW: [number, number, number, number][] = [[-1, 4.2, 0.0, 1], [1, 2.6, 0.35, 2], [-1, -0.8, 0.7, 4], [1, -3.2, 0.15, 5], [-1, -5.8, 0.5, 6], [1, -8.6, 0.85, 7], [-1, -11.5, 0.3, 9], [1, -14.2, 0.6, 10]];
const crew = (t: number, skip = -1): Spot[] => CREW.filter((_, i) => i !== skip).map(([side, z, ph, v], i) => ({
  who: i === 2 ? CAST.HANK_PARKA : soldierIce(v), key: "dig" + i, x: DIG + side * (W - 0.6), y: 0, z, mode: "stand",
  facing: side as -1 | 1, seed: 11 + i, expr: i % 3 === 0 ? "stern" : i % 3 === 1 ? "pained" : "neutral", prop: ["hammer", swing(t, ph)],
}));

export const SHOTS_B: ShotPart[] = [
  // B1 34.4-35.45 "By spring, the crew chops": the tunnel full of diggers, camera dollies in fast
  { a: sec(34.4), b: sec(35.45), light: "inside", set: "dig", cInf: 8,
    cams: [{ f: sec(34.4), pos: [DIG + 0.3, 1.2, 9.0], look: [DIG - 0.2, 1.15, -10], fov: 48 },
           { f: sec(35.45), dur: sec(1.05), pos: [DIG + 0.2, 1.15, 7.2], look: [DIG - 0.3, 1.1, -10], fov: 48 }],
    cast: (f) => crew(S(f)) },
  // B2 35.45-37.56 "a hundred and twenty tons of wall a month": the chalk counter rolls to 120, Hank hacks beside it
  { a: sec(35.45), b: sec(37.56), light: "inside", set: "dig", cInf: 11,
    cams: [{ f: sec(35.45), pos: [DIG + 0.6, 1.35, 1.2], look: [DIG - 1.55, 1.2, -1.9], fov: 50 },
           { f: sec(37.56), dur: sec(2.1), pos: [DIG + 0.3, 1.3, 0.6], look: [DIG - 1.6, 1.2, -1.9], fov: 50 }],
    cast: (f) => {
      const t = S(f);
      return [
        { who: CAST.HANK_PARKA, key: "hankDig", x: DIG - 1.95, y: 0, z: -1.45, mode: "stand", facing: -1, seed: 3, expr: t < 36.7 ? "pained" : "stern", prop: ["hammer", swing(t, 0.2)] },
        { who: soldierIce(4), key: "sledder", x: DIG + 0.3, y: 0, z: -7.0, mode: "stroll", phase: t * 0.9, facing: 0, seed: 6, expr: "nervous" },
        ...crew(t, 2).slice(3),
      ];
    } },
  // B3 37.56-40.06 "and the missile tracks bend like spaghetti.": low on the rail spur; the rails wriggle from 38.3 s
  { a: sec(37.56), b: sec(40.06), light: "inside", set: "dig", cInf: 9,
    cams: [{ f: sec(37.56), pos: [DIG + 0.9, 0.9, -19.5], look: [DIG - 0.1, 0.4, -40], fov: 46 },
           { f: sec(40.06), dur: sec(2.5), pos: [DIG + 0.8, 1.0, -21.0], look: [DIG - 0.1, 0.35, -40], fov: 46 }],
    cast: (f) => {
      const t = S(f);
      return [
        { who: soldierIce(2), key: "railman", x: DIG - 1.55, y: 0, z: -25.2, mode: "stand", facing: 1, seed: 8, expr: t < 38.3 ? "whistle" : t < 38.9 ? "shock" : "dazed", look: 0.5 },
        { who: soldierIce(7), key: "railman2", x: DIG + 1.8, y: 0, z: -37, mode: "stand", facing: -1, seed: 12, expr: t < 38.5 ? "neutral" : "shock" },
      ];
    } },
  // B4 40.06-42.48 "Wait. How does solid ice move?": Hank stops dead, turns to camera; a "?" pops on "How"
  { a: sec(40.06), b: sec(42.48), light: "inside", set: "dig", cInf: 12,
    cams: [{ f: sec(40.06), pos: [DIG + 0.25, 1.5, -24.2], look: [DIG + 0.3, 1.45, -27.5], fov: 44 },
           { f: sec(42.48), dur: sec(2.4), pos: [DIG + 0.25, 1.52, -24.8], look: [DIG + 0.3, 1.5, -27.5], fov: 44 }],
    cast: (f) => {
      const t = S(f);
      return [{ who: CAST.HANK_PARKA, key: "hankWait", x: DIG + 0.3, y: 0, z: -27.0, mode: "stand", facing: 0, seed: 3,
        expr: t < 40.55 ? "shock" : "nervous", look: t < 40.55 ? 0 : 0.6 }];
    } },
  // B5 42.48-44.56 "Ever poured honey on a plate?": insert on the plate, honey ribbon falls and pools
  { a: sec(42.48), b: sec(44.56), light: "inside", set: "mess", cInf: 16,
    cams: [{ f: sec(42.48), pos: [MESS + 0.62, TABLE_TOP + 0.5, 0.62], look: [MESS - 0.02, TABLE_TOP + 0.14, -0.2], fov: 44 },
           { f: sec(44.56), dur: sec(2.08), pos: [MESS + 0.45, TABLE_TOP + 0.4, 0.42], look: [MESS - 0.02, TABLE_TOP + 0.08, -0.17], fov: 44 }],
    cast: () => [] },
  // B6 44.56-45.98 "It creeps.": straight down on the plate, arrows push out with the front
  { a: sec(44.56), b: sec(45.98), light: "inside", set: "mess", cInf: 10,
    cams: [{ f: sec(44.56), pos: [MESS + 0.001, TABLE_TOP + 0.62, -0.149], look: [MESS, TABLE_TOP, -0.15], fov: 40 },
           { f: sec(45.98), dur: sec(1.42), pos: [MESS + 0.001, TABLE_TOP + 0.5, -0.149], look: [MESS, TABLE_TOP, -0.15], fov: 40, roll: 0.12 }],
    cast: () => [] },
  // B7 45.98-48.82 "Too slow to see, too strong to stop.": low across the table; a snail overtakes the honey,
  //    then the honey shoves the tin soldier off the rim; the cook flinches in the background
  { a: sec(45.98), b: sec(48.82), light: "inside", set: "mess", cInf: 18,
    cams: [{ f: sec(45.98), pos: [MESS + 0.02, TABLE_TOP + 0.2, 0.36], look: [MESS + 0.03, TABLE_TOP + 0.02, -0.15], fov: 44 },
           { f: sec(47.06), dur: 12, pos: [MESS + 0.13, TABLE_TOP + 0.15, 0.27], look: [MESS + 0.12, TABLE_TOP + 0.02, -0.15], fov: 42 },
           { f: sec(48.82), dur: sec(1.6), pos: [MESS + 0.16, TABLE_TOP + 0.13, 0.22], look: [MESS + 0.14, TABLE_TOP + 0.02, -0.15], fov: 42 }],
    cast: () => [] },
  // B8 48.82-51.10 "Ice does the same under its own weight.": the ice sheet cut open; dome sags, spreads, tunnels squash
  { a: sec(48.82), b: sec(51.1), light: "arctic", set: "glacier", cInf: 3,
    cams: [{ f: sec(48.82), pos: [GLAC + 4.5, 5.2, 15], look: [GLAC, 2.6, -1.5], fov: 50 },
           { f: sec(51.1), dur: sec(2.28), pos: [GLAC + 3.2, 4.4, 13], look: [GLAC, 2.2, -1.5], fov: 50 }],
    cast: () => [] },
];
