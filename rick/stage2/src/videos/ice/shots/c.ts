// Section C shots (51.1 s -> end). Only the section-C helper edits this file.
import { Expr, Outfit, SKINS } from "../../bridge/toon";
import { CAST, soldierIce } from "../cast";
import { ShotPart, Spot, sec, VO_END } from "../timeline";

// 2090 visitor: field scientist in shorts and a sun hat, sweating
const SCI2090: Outfit = { jacket: "#e9e6dc", pants: "#d9b77a", boots: "#6a4a32", hat: "cap", cap: "#f2d23a", skin: SKINS[3] };
const T = (f: number) => f / 30;

export const SHOTS_C: ShotPart[] = [
  // C1 "So in 1966," wide: the 1966 sign, the hatch, the crane over the reactor pit
  { a: sec(51.1), b: sec(52.4), light: "arctic", set: "c_surface", cInf: 8,
    cams: [{ f: sec(51.1), pos: [995.6, 1.4, 9.4], look: [999.4, 2.5, -3.5], fov: 50 }, { f: sec(52.4), dur: sec(1.3), pos: [995.9, 1.45, 8.2], look: [999.4, 2.6, -3.5], fov: 50 }],
    cast: () => [
      { who: CAST.GENERAL, key: "gen", x: 999.4, y: 0, z: 1.2, expr: "stern", mode: "stand", facing: -1, seed: 11 },
      { who: soldierIce(0), key: "c1a", x: 1002.4, y: 0, z: -3.6, expr: "neutral", mode: "stand", facing: -1, seed: 2, look: -0.5 },
      { who: soldierIce(1), key: "c1b", x: 998.2, y: 0, z: -4.4, expr: "whistle", mode: "stand", facing: 1, seed: 6 },
    ] },
  // C2 "the army takes the reactor" — low angle, the vessel rises out of the pit on the crane hook
  { a: sec(52.4), b: sec(53.4), light: "arctic", set: "c_surface", cInf: 9,
    cams: [{ f: sec(52.4), pos: [1001.6, 0.55, 3.6], look: [999.1, 3.0, -2.6], fov: 56 }, { f: sec(53.4), dur: sec(1.0), pos: [1001.3, 0.5, 3.0], look: [999.1, 3.6, -2.6], fov: 56 }],
    cast: (f) => [
      { who: soldierIce(1), key: "c1b", x: 1000.6, y: 0, z: -0.4, expr: T(f) > 52.7 ? "shock" : "neutral", mode: "stand", facing: -1, seed: 6, look: -0.4, headTilt: -0.15 },
    ] },
  // C3 "and leaves everything else." — the tug tows the reactor away, then whip-pan to the drums left behind
  { a: sec(53.4), b: sec(54.7), light: "arctic", set: "c_surface", cInf: 7,
    cams: [{ f: sec(53.4), pos: [1009.5, 2.2, 3.5], look: [1005.5, 1.0, -10], fov: 44 },
           { f: sec(54.3), dur: 10, pos: [1001.0, 1.35, 3.0], look: [996.9, 0.6, -1.8], fov: 46 }],
    cast: (f) => [
      { who: CAST.GENERAL, key: "gen", x: 998.6, y: 0, z: 0.3, expr: T(f) > 54.0 ? "smile" : "stern", mode: "stand", facing: 1, seed: 11, look: 0.4 },
    ] },
  // C4 "The fuel," — tunnel, stacked fuel drums, dolly past
  { a: sec(54.7), b: sec(55.5), light: "inside", set: "c_tunnel", cInf: 10,
    cams: [{ f: sec(54.7), pos: [1100.4, 1.3, 4.4], look: [1097.9, 1.1, -1.0], fov: 50 }, { f: sec(55.5), dur: sec(0.8), pos: [1100.2, 1.3, 3.2], look: [1097.9, 1.1, -2.0], fov: 50 }] },
  // C5 "the sewage," — the tank, drips, DO NOT SNIFF
  { a: sec(55.5), b: sec(56.1), light: "inside", set: "c_tunnel", cInf: 10,
    cams: [{ f: sec(55.5), pos: [1098.2, 1.6, -4.6], look: [1100.6, 1.2, -11.6], fov: 50 }, { f: sec(56.1), dur: sec(0.6), pos: [1098.3, 1.55, -5.4], look: [1100.6, 1.2, -11.8], fov: 50 }] },
  // C6 "the radioactive water." — glowing open barrels, push in
  { a: sec(56.1), b: sec(57.3), light: "inside", set: "c_tunnel", cInf: 11,
    cams: [{ f: sec(56.1), pos: [1100.4, 1.7, -13.4], look: [1099.6, 0.8, -18.4], fov: 50 }, { f: sec(57.3), dur: sec(1.2), pos: [1100.2, 1.4, -15.2], look: [1099.6, 0.75, -18.6], fov: 50 }] },
  // C7 "Sure the snow will bury it forever." — the general, smug at the hatch, first flakes
  { a: sec(57.3), b: sec(59.1), light: "golden", set: "c_surface", cInf: 10,
    cams: [{ f: sec(57.3), pos: [1001.4, 1.55, 0.6], look: [1000.4, 1.6, -4.5], fov: 48 }, { f: sec(59.1), dur: sec(1.8), pos: [1001.2, 1.55, -0.3], look: [1000.4, 1.65, -4.5], fov: 48 }],
    cast: (f) => [
      { who: CAST.GENERAL, key: "gen", x: 1000.9, y: 0, z: -3.1, expr: (T(f) > 58.3 ? "grin" : "smile_closed") as Expr, mode: "stand", facing: -1, seed: 11, look: 0.3 },
    ] },
  // C8 "And it did." — night; the drift swallows the hatch. Nobody left.
  { a: sec(59.1), b: sec(60.2), light: "night", set: "c_surface", cInf: 7,
    cams: [{ f: sec(59.1), pos: [997.6, 1.9, 3.2], look: [1000.0, 1.3, -6.5], fov: 46 }, { f: sec(60.2), dur: sec(1.1), pos: [997.3, 2.1, 4.2], look: [1000.0, 1.3, -6.5], fov: 46 }] },
  // C9 "Until scientists ran the numbers." — the lab, the endless printout, the eyes on "numbers"
  { a: sec(60.2), b: sec(62.2), light: "lab", set: "c_lab", cInf: 10,
    cams: [{ f: sec(60.2), pos: [1200.9, 1.45, 3.0], look: [1200.3, 1.25, -1.3], fov: 48 },
           { f: sec(61.65), dur: 8, pos: [1200.6, 1.55, 2.0], look: [1200.4, 1.55, -1.0], fov: 46 }],
    cast: (f) => [
      { who: CAST.SCIENTIST, key: "sci", x: 1200.9, y: 0, z: -0.75, expr: (T(f) > 61.55 ? "shock" : "neutral") as Expr, mode: "stand", facing: -1, seed: 12, look: T(f) > 61.55 ? 0 : -0.7 },
    ] },
  // C10 "As early as 2090, the ice above" — same ice, 2090: slush, puddles, a beach umbrella
  { a: sec(62.2), b: sec(64.4), light: "golden", set: "c_2090", cInf: 8,
    cams: [{ f: sec(62.2), pos: [1303.3, 1.5, 6.4], look: [1300.7, 1.0, -3], fov: 50 }, { f: sec(64.4), dur: sec(2.2), pos: [1302.9, 1.45, 5.0], look: [1300.6, 0.95, -3], fov: 50 }],
    cast: (f) => [
      { who: SCI2090, key: "s90", x: 1300.1, y: 0, z: 0.1, expr: "nervous", mode: "stroll", phase: T(f) * 0.8, facing: -1, seed: 4 },
    ] },
  // C11 "the camp melts faster than it snows." — cross-section: the ice above the camp drops away
  { a: sec(64.4), b: sec(66.7), light: "arctic", set: "c_xs", cInf: 4,
    cams: [{ f: sec(64.4), pos: [1237.5, 1.2, 20], look: [1230.5, -4.6, 0], fov: 48 }, { f: sec(66.7), dur: sec(2.3), pos: [1236.5, 0.6, 18], look: [1230.5, -4.8, 0], fov: 48 }] },
  // C12 "The glacier spent sixty years eating the city." — snow stacks back up, slow push into the camp
  { a: sec(66.7), b: sec(70.5), light: "arctic", set: "c_xs", cInf: 5,
    cams: [{ f: sec(66.7), pos: [1223.5, 0.5, 20], look: [1230, -4.8, 0], fov: 48 }, { f: sec(70.5), dur: sec(3.8), pos: [1228.4, -6.2, 8.5], look: [1230, -7.5, 0], fov: 48 }] },
  // C13 "Now it's spitting it back out." — the junk heaves up out of the melt; the lost penguin. Hold.
  { a: sec(70.5), b: VO_END, light: "golden", set: "c_2090", cInf: 9,
    cams: [{ f: sec(70.5), pos: [1299.0, 1.25, 2.8], look: [1300.0, 0.95, -2.0], fov: 46 }, { f: sec(72.0), dur: sec(1.5), pos: [1299.2, 1.2, 1.9], look: [1300.0, 1.05, -2.0], fov: 44 }],
    cast: (f): Spot[] => [
      { who: SCI2090, key: "s90", x: 1298.8, y: 0, z: -0.7, expr: (T(f) > 71.3 ? "shock" : "nervous") as Expr, mode: "stand", facing: 1, seed: 4, look: 0.5 },
    ] },
];
