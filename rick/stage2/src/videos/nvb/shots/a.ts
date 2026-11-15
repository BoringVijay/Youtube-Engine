// Video B, section A shots (lines 1-8, 0 - 28.196 s). Only the section-A helper edits this file.
// 13 shots: globe | chair | crowd turns | family tree | stairs+penguin | three lobbies | arcade | seal | padlock | dish building | peel | red carpet | forklift Tetris
import { ShotPart, ShotDef, Spot, Key, sec, S, camAt, talkAt } from "../timeline";
import { Outfit, Expr } from "../../bridge/toon";
import { CAST, crowd } from "../cast";
import { GEAR, placeGear, N_GLOBE, N_STAGE, N_TREE, N_STAIRS, N_BANK, N_ARCADE, N_DISH, N_VAULT, N_CARPET, N_TETRIS, SET, STAGE, TREE, STAIR, ARC, VAULT, DISH, BUBBLE, TETRIS } from "../sets/a";

const K = (t: number, pos: [number, number, number], look: [number, number, number], fov: number, dur?: number): Key => ({ f: sec(t), pos, look, fov, ...(dur !== undefined ? { dur: sec(dur) } : {}) });
const camPos = (s: ShotPart, f: number) => camAt(s as ShotDef, f).pos;
const at = (f: number) => S(f);
const gearOf = (s: ShotPart, g: keyof typeof GEAR, f: number, p: Parameters<typeof placeGear>[2]) => placeGear(GEAR[g], camPos(s, f), p);
const NOODLE: Outfit = { ...crowd(1), jacket: "#e07a3a", hair: "#2a2420" };

// ---------- 1 (0 - 2.52) "Imagine you're the most searched name on the planet": globe of phones, one asks how to fold a fitted sheet
const A1: ShotPart = { a: sec(0), b: sec(2.52), light: "night", set: SET.globe, cInf: 9,
  cams: [K(0, [N_GLOBE - 0.9, 1.15, 4.4], [N_GLOBE + 0.2, 3.1, -7], 54), K(2.52, [N_GLOBE + 0.12, 2.72, -2.15], [N_GLOBE + 0.24, 2.71, -4.7], 34, 2.52)],
  cast: (f) => [{ who: CAST.ALICE, key: "aliceG", x: N_GLOBE - 1.7, y: 0, z: -2.9, mode: "stand", facing: 0, seed: 21, expr: at(f) < 1.2 ? "nervous" : "shock", look: 0.3 }],
  anim: (f) => gearOf(A1, "globe", f, { x: N_GLOBE - 1.7, y: 0, z: -2.9, shades: 1, bag: true }) };

// ---------- 2 (2.52 - 5.24) "The boss of the world's most powerful company just quit.": the chair in the spotlight, jacket draped, spinning
const noodle = (f: number, x = STAGE.noodle[0], z = STAGE.noodle[2]): Spot => { const t = at(f); return { who: NOODLE, key: "noodle", x, y: 0, z, mode: "stand", facing: 0, seed: 9, expr: "neutral", look: -0.7, talk: Math.floor(t * 3.2) % 2 ? 2 : 0 }; };
const A2: ShotPart = { a: sec(2.52), b: sec(5.24), portal: true, light: "night", set: SET.stage, cInf: 10,
  cams: [K(2.52, [N_STAGE + 0.5, 0.85, 3.2], [STAGE.chair[0] - 0.2, 0.95, 0.1], 44), K(5.24, [N_STAGE - 0.55, 1.35, 1.45], [STAGE.chair[0], 0.95, 0.1], 36, 2.72)],
  cast: (f) => [noodle(f)] };

// ---------- 3 (5.24 - 7.108) "And everyone thinks it's because of you.": 880 heads whip round to the lens, one guy keeps slurping
const A3: ShotPart = { a: sec(5.24), b: sec(7.108), light: "night", set: SET.stage, cInf: 8,
  cams: [K(5.24, [N_STAGE + 1.6, 3.5, 6.2], [N_STAGE + 0.3, 3.1, -10], 60), K(7.108, [N_STAGE + 0.75, 1.5, -0.4], [STAGE.noodle[0], 1.25, STAGE.noodle[2]], 40, 1.868)],
  cast: (f) => [noodle(f)] };

// ---------- 4 (7.108 - 9.041) "Your name is Alice Huang. No relation.": the internet family tree, red string, giant X
const A4: ShotPart = { a: sec(7.108), b: sec(9.041), portal: true, light: "inside", set: SET.tree, cInf: 10,
  cams: [K(7.108, [N_TREE - 0.5, 2.1, 6.0], [N_TREE, 2.7, -4.2], 52), K(9.041, [N_TREE + 0.15, 2.45, 3.5], [N_TREE, 2.75, -4.2], 52, 1.933)],
  cast: (f) => { const t = at(f); return [{ who: CAST.ALICE, key: "aliceT", x: N_TREE - 1.5, y: 0, z: -1.2, mode: "stand", facing: 0, seed: 22, expr: (t < TREE.xAt ? "neutral" : "smile") as Expr, look: 0.4 }]; },
  anim: (f) => gearOf(A4, "tree", f, { x: N_TREE - 1.5, y: 0, z: -1.2, shades: 1, bag: true }) };

// ---------- 5 (9.041 - 10.26) "You start in finance.": up the staircase of spreadsheets to the elevator, penguin in a suit inside
const walkZ = (t: number) => -1.5 - (t - 9.041) * 2.0;
const A5: ShotPart = { a: sec(9.041), b: sec(10.26), portal: true, light: "lab", set: SET.stairs, cInf: 9,
  cams: [K(9.041, [N_STAIRS - 0.4, 1.35, 1.4], [N_STAIRS, 3.7, -10], 50), K(10.26, [N_STAIRS + 0.1, 2.15, -1.2], [N_STAIRS, 4.5, -10.6], 42, 1.219)],
  cast: (f) => { const z = walkZ(at(f)); return [{ who: CAST.ALICE, key: "aliceS", x: N_STAIRS - 0.8, y: STAIR.y(z), z, mode: "stroll", phase: at(f) * 2.2, facing: 0, seed: 23, expr: "smile_closed", look: 0.2 }]; },
  anim: (f) => { const z = walkZ(at(f)); gearOf(A5, "stairs", f, { x: N_STAIRS - 0.8, y: STAIR.y(z), z, shades: 1, bag: true }); } };

// ---------- 6 (10.26 - 12.214) "HSBC. CITIC. A Shanghai fund.": one dolly through three lobbies (portals in a row)
const L = (k: number, dz: number) => BANK_Z[k] + dz;
const BANK_Z = [-2, -10, -18];
const A6: ShotPart = { a: sec(10.26), b: sec(12.214), light: "inside", set: SET.bank, cInf: 10,
  cams: [K(10.26, [N_BANK, 1.65, 1.3], [N_BANK, 2.75, -6], 52), K(10.72, [N_BANK, 1.75, -6.7], [N_BANK, 2.85, -14], 52, 0.4), K(11.3, [N_BANK, 1.75, -14.7], [N_BANK, 2.85, -22], 52, 0.5), K(12.214, [N_BANK + 0.15, 1.5, -18.3], [N_BANK, 2.4, -22], 46, 0.914)],
  cast: (f) => { const t = at(f); return [
    { who: CAST.SUIT, key: "clerk1", x: N_BANK - 2.3, y: 0, z: L(0, -1.1), mode: "stand", seed: 31, expr: "smile_closed" },
    { who: CAST.ALICE, key: "aliceB1", x: N_BANK + 1.4, y: 0, z: L(0, -1.8), mode: "stand", seed: 24, expr: "smile", look: -0.3 },
    { who: crowd(2), key: "cust1", x: N_BANK + 1.5, y: 0, z: L(0, 1.3), mode: "stand", seed: 32, expr: "neutral", look: 0.4 },
    { who: crowd(4), key: "clerk2", x: N_BANK - 2.3, y: 0, z: L(1, -1.1), mode: "stand", seed: 33, expr: "smile_closed" },
    { who: crowd(5), key: "cust2", x: N_BANK + 1.5, y: 0, z: L(1, 0.2), mode: "stand", seed: 34, expr: t < 10.8 ? "neutral" : "nervous", look: -0.4 },
    { who: CAST.ALICE, key: "aliceB3", x: N_BANK - 1.6, y: 0, z: L(2, -1.0), mode: "stand", seed: 24, expr: "smile", look: 0.3 },
    { who: CAST.SUIT, key: "suit3a", x: N_BANK + 1.7, y: 0, z: L(2, 1.0), mode: "stand", seed: 35, expr: "neutral", look: -0.3 },
    { who: crowd(0), key: "suit3b", x: N_BANK + 2.3, y: 0, z: L(2, -1.2), mode: "stand", seed: 36, expr: "smile_closed", look: -0.2 },
  ]; },
  anim: (f) => { const t = at(f); gearOf(A6, "bank1", f, { x: N_BANK + 1.4, y: 0, z: L(0, -1.8), shades: 1, bag: true }); gearOf(A6, "bank2", f, { x: N_BANK - 1.6, y: 0, z: L(2, -1.0), shades: t > 11.3 ? 2 : 1, bag: true, bagSide: -1 }); } };

// ---------- 7 (12.214 - 14.54) "That fund backs a game company": the 7ROAD cabinet, coins pouring from a funnel
const A7: ShotPart = { a: sec(12.214), b: sec(14.54), portal: true, light: "night", set: SET.arcade, cInf: 10,
  cams: [K(12.214, [N_ARCADE - 0.9, 1.55, 4.0], [N_ARCADE + 0.2, 1.9, -6.2], 50), K(14.54, [N_ARCADE - 0.15, 1.75, -0.2], [N_ARCADE, 1.55, -6.2], 40, 2.326)],
  cast: (f) => { const t = at(f); return [
    { who: CAST.GEEK, key: "geekA", x: N_ARCADE - 1.7, y: 0, z: -5.2, mode: "stand", seed: 37, expr: t < 13.4 ? "grin" : "laugh", look: 0.5 },
    { who: CAST.SUIT, key: "suitA", x: N_ARCADE + 1.7, y: 0, z: -5.0, mode: "stand", seed: 38, expr: "smile_closed", look: -0.5 },
  ]; } };

// ---------- 8 (14.54 - 15.842) "whose owners include the Chinese government.": an official seal gets stamped onto the cabinet
const hit = 14.74;
const A8: ShotPart = { a: sec(14.54), b: sec(15.842), light: "night", set: SET.arcade, cInf: 9,
  cams: [K(14.54, [N_ARCADE + 0.25, 1.45, -3.2], [N_ARCADE, 1.15, -6.1], 38), K(hit, [N_ARCADE + 0.2, 1.4, -3.6], [N_ARCADE, 1.1, -6.1], 36, hit - 14.54),
         K(hit + 0.1, [N_ARCADE + 0.26, 1.37, -3.6], [N_ARCADE, 1.1, -6.1], 36, 0.1), K(hit + 0.2, [N_ARCADE + 0.14, 1.43, -3.6], [N_ARCADE, 1.1, -6.1], 36, 0.1),
         K(15.842, [N_ARCADE + 0.1, 1.3, -4.4], [N_ARCADE, 1.15, -6.1], 34, 1.5)] };

// ---------- 9 (15.842 - 18.567) "Then America bans its best AI chips from China.": padlock slams onto the glowing crate
const sl = VAULT.slamAt;
const A9: ShotPart = { a: sec(15.842), b: sec(18.567), portal: true, light: "lab", set: SET.vault, cInf: 10,
  cams: [K(15.842, [N_VAULT - 0.7, 1.6, 3.4], [N_VAULT, 0.95, -3.2], 46), K(sl, [N_VAULT - 0.45, 1.4, 1.1], [N_VAULT, 0.8, -3.2], 40, sl - 15.842), K(sl + 0.1, [N_VAULT - 0.38, 1.36, 1.1], [N_VAULT, 0.8, -3.2], 40, 0.1), K(sl + 0.2, [N_VAULT - 0.52, 1.43, 1.1], [N_VAULT, 0.8, -3.2], 40, 0.1),
         K(18.567, [N_VAULT + 0.9, 1.2, 0.2], [N_VAULT, 0.95, -3.2], 38, 2.2)],
  cast: (f) => { const t = at(f); return [
    { who: CAST.GEEK, key: "geekV", x: N_VAULT + 2.0, y: 0, z: -2.6, mode: "stand", facing: -1, seed: 39, expr: (t < sl + 0.1 ? "grin" : "shock") as Expr, look: -0.6 },
    { who: CAST.AGENT, key: "agentV", x: N_VAULT - 2.2, y: 0, z: -3.6, mode: "stand", facing: 1, seed: 40, expr: (t < sl + 0.6 ? "neutral" : "smile_closed") as Expr, look: 0.6 },
  ]; } };

// ---------- 10 (18.567 - 21.4) "Months later, a quiet little Singapore company gets a new name.": 40 dishes, a very quiet caption
const A10: ShotPart = { a: sec(18.567), b: sec(21.4), portal: true, light: "day", set: SET.dish, cInf: 10,
  cams: [K(18.567, [N_DISH + 0.9, 1.7, 15.5], [N_DISH, 5.2, -3], 50), K(21.4, [N_DISH + 0.3, 3.4, 10.0], [N_DISH - 0.1, 6.2, -3], 46, 2.833)],
  cast: (f) => { const t = at(f); return [
    { who: crowd(3), key: "pass1", x: N_DISH - 4.5 + (t - 18.5) * 0.9, y: 0.12, z: -1.4, mode: "stroll", phase: t * 1.5, seed: 41, expr: "neutral" },
    { who: crowd(5), key: "pass2", x: N_DISH + 5.5 - (t - 18.5) * 0.8, y: 0.12, z: -0.8, mode: "stroll", phase: t * 1.4, facing: -1, seed: 42, expr: "smile_closed" },
  ]; } };

// ---------- 11 (21.4 - 24.353) "Megaspeed. Guess who's running it.": she peels off 7ROAD, slaps on MEGASPEED, sunglasses down
const ALX = DISH.basket[0], ALY = DISH.basket[1] + 0.03, ALZ = DISH.basket[2] - 0.05;
const A11: ShotPart = { a: sec(21.4), b: sec(24.353), light: "day", set: SET.dish, cInf: 9,
  cams: [K(21.4, [N_DISH + 0.3, 3.6, 8.0], [N_DISH - 0.1, 3.9, -3], 40), K(23.2, [N_DISH - 0.1, 3.5, 6.4], [N_DISH - 0.5, 3.8, -3], 40, 1.8), K(23.9, [N_DISH - 1.1, 3.6, 4.7], [ALX + 0.1, 3.7, ALZ], 33, 0.7), K(24.353, [N_DISH - 1.4, 3.6, 4.1], [ALX + 0.1, 3.75, ALZ], 31, 0.45)],
  cast: (f) => { const t = at(f); const wv = t < DISH.peelAt - 0.1 ? 0.2 : t < DISH.landAt + 0.2 ? 0.5 + 0.5 * Math.sin(t * 14) : 0.0;
    return [{ who: CAST.ALICE, key: "aliceD", x: ALX, y: ALY, z: ALZ, mode: "stand", facing: 0, seed: 25, expr: (t < DISH.landAt ? "stern" : t < 23.36 ? "grin" : "smile") as Expr, look: 0.5, ...(wv > 0 ? { wave: wv } : {}) }]; },
  anim: (f) => { const t = at(f); gearOf(A11, "dish", f, { x: ALX, y: ALY, z: ALZ, shades: t < 23.45 ? 1 : 2, bag: true, bagSide: -1 }); } };

// ---------- 12 (24.353 - 26.1) "It becomes an official Nvidia partner.": red carpet, gold badge, paparazzi
const ALC = (t: number) => -3.5 + (t - 24.353) * 3.4;
const paparazzi = (t: number): Spot[] => [[-1, 5.2], [1, 3.4], [-1, 1.6], [1, -0.4], [-1, -2.2], [1, -4.0], [-1, 7.0], [1, 6.2]].map(([s, z], i) => ({ who: crowd(i + 6), key: "pap" + i, x: N_CARPET + s * 2.35, y: 0, z, mode: "stand", facing: -s as -1 | 1, seed: 50 + i, expr: (Math.floor(t * 5 + i) % 3 === 0 ? "laugh" : "grin") as Expr, look: -s * 0.4 }));
const A12: ShotPart = { a: sec(24.353), b: sec(26.1), portal: true, light: "golden", set: SET.carpet, cInf: 9,
  cams: [K(24.353, [N_CARPET - 0.55, 0.8, 9.8], [N_CARPET + 0.1, 1.25, 1.5], 48), K(26.1, [N_CARPET - 0.3, 1.0, 5.7], [N_CARPET + 0.2, 1.3, 0.5], 42, 1.747)],
  cast: (f) => [{ who: CAST.ALICE, key: "aliceC", x: N_CARPET + 0.35, y: 0, z: ALC(at(f)), mode: "stroll", phase: at(f) * 1.4, facing: 0, seed: 26, expr: "grin", look: 0 }, ...paparazzi(at(f))],
  anim: (f) => gearOf(A12, "carpet", f, { x: N_CARPET + 0.35, y: 0, z: ALC(at(f)), shades: 1, bag: true, badge: true }) };

// ---------- 13 (26.1 - 28.196) "And it buys chips. Lots of chips.": forklifts stack server racks like Tetris, a row clears (bloop), the intern doubts
const A13: ShotPart = { a: sec(26.1), b: sec(28.196), portal: true, light: "inside", set: SET.tetris, cInf: 10,
  cams: [K(26.1, [N_TETRIS + 0.8, 3.4, 8.2], [N_TETRIS + 0.45, 3.3, -9], 48), K(28.196, [N_TETRIS + 0.7, 3.1, 6.3], [N_TETRIS + 0.45, 3.2, -9], 46, 2.096)],
  cast: (f) => { const t = at(f); const tk = (t > BUBBLE.at && t < 28.15) ? (Math.floor(t * 7) % 2 ? 2 : 1) : 0;
    return [{ who: CAST.INTERN, key: "intern", x: N_TETRIS + 1.25, y: 0, z: 1.4, mode: "stand", facing: 0, seed: 27, expr: (t < BUBBLE.at ? "nervous" : "shock") as Expr, look: -0.5, talk: tk as 0 | 1 | 2 }]; } };
void talkAt; void TETRIS; void ARC; void DISH;

export const SHOTS_A: ShotPart[] = [A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, A11, A12, A13];
