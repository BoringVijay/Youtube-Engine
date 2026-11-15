// Video B, section B shots (lines 9-18, 28.196 - 61.085 s). Only the section-B helper edits this file.
// 17 shots: room | hero card flip | gym | JOIN US | comic photos | kiss+scratch | car+kiss cam | bounce | pothole | deflate+cone | van street (hard cut) | van | spit | invoices | tiny box | FOR RENT rack | bell+thought
import { ShotPart, ShotDef, Spot, Key, sec, S, camAt, talkAt } from "../timeline";
import { Expr } from "../../bridge/toon";
import { CAST, crowd } from "../cast";
import { placeGear } from "../sets/a";
import { GEARB, N_ROOM, N_GYM, N_COMIC, N_STREET, N_VANST, N_VAN, N_INV, N_RACK, SB, COMIC, STREET, streetCar, VANST, VANIN, INV, GYMSIGN, THOUGHT } from "../sets/b";

const K = (t: number, pos: [number, number, number], look: [number, number, number], fov: number, dur?: number): Key => ({ f: sec(t), pos, look, fov, ...(dur !== undefined ? { dur: sec(dur) } : {}) });
const camPos = (s: ShotPart, f: number) => camAt(s as ShotDef, f).pos;
const at = (f: number) => S(f);
const sm = (a: number, b: number, t: number) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
const rep = (r: number, t: number) => Math.floor(t * r) % 2 ? 2 : 1;

// ---------- 1 (28.196 - 29.48) "In 2024, you meet the man who makes them.": the results room, cards on every wall
const AL1 = [N_ROOM - 0.8, 0, 2.4] as const;
const B1: ShotPart = { a: sec(28.196), b: sec(29.48), portal: true, light: "inside", set: SB.room, cInf: 10,
  cams: [K(28.196, [N_ROOM + 1.3, 1.5, 7.0], [N_ROOM - 0.4, 2.4, -8], 58), K(29.48, [N_ROOM + 0.6, 1.8, 5.2], [N_ROOM - 0.3, 2.3, -8], 50, 1.284)],
  cast: (f) => { const t = at(f); return [{ who: CAST.ALICE, key: "aliceR", x: AL1[0], y: 0, z: AL1[2], mode: "stand", facing: 0, seed: 61, expr: t < 28.9 ? "smile_closed" : "shock", look: 0.6, talk: talkAt(t, 28.2, 30.3), scale: 1.3 }]; },
  anim: (f) => placeGear(GEARB.room, camPos(B1, f), { x: AL1[0], y: AL1[1], z: AL1[2], shades: 1, bag: true, scale: 1.3 }) };

// ---------- 2 (29.48 - 30.486) "the man who makes them": a card flips open on a Taipei bar, two whiskey glasses
const AL2 = [N_ROOM - 2.0, 0, -4.4] as const;
const B2: ShotPart = { a: sec(29.48), b: sec(30.486), light: "inside", set: SB.room, cInf: 9,
  cams: [K(29.48, [N_ROOM + 0.9, 2.5, -1.0], [N_ROOM, 2.5, -8], 48), K(30.486, [N_ROOM + 0.2, 2.2, -3.4], [N_ROOM, 2.1, -8], 40, 1.006)],
  cast: (f) => [{ who: CAST.ALICE, key: "aliceR2", x: AL2[0], y: 0, z: AL2[2], mode: "stand", facing: 1, seed: 62, expr: "grin", look: 0.7 }],
  anim: (f) => placeGear(GEARB.room, camPos(B2, f), { x: AL2[0], y: AL2[1], z: AL2[2], shades: 1, bag: true }) };

// ---------- 3 (30.486 - 32.56) "And reportedly, you tell people you can get him to": the recruiting booth
const ALG = [N_GYM - 0.2, 0, -4.5] as const;
const gymAnim = (s: ShotPart, sc: number) => (f: number) => { const t = at(f); placeGear(GEARB.gym, camPos(s, f), { x: ALG[0], y: ALG[1], z: ALG[2], shades: 1, bag: false, scale: 1.5 });
  const g = GYMSIGN.g!; const show = t >= 32.5; g.visible = show; if (show) { const cp = camPos(s, f); g.position.set(ALG[0] + 0.8, 2.2, ALG[2] + 0.1); g.rotation.y = Math.atan2(cp[0] - g.position.x, cp[2] - g.position.z); g.scale.setScalar(sc * (0.6 + 0.4 * sm(32.5, 32.72, t))); } };
const B3: ShotPart = { a: sec(30.486), b: sec(32.56), portal: true, light: "inside", set: SB.gym, cInf: 10,
  cams: [K(30.486, [N_GYM - 3.0, 1.5, 3.4], [N_GYM + 0.2, 1.7, -5], 52), K(32.56, [N_GYM - 0.7, 1.5, 0.4], [N_GYM + 0.1, 1.6, -4.5], 42, 2.074)],
  cast: (f) => { const t = at(f); return [{ who: CAST.ALICE, key: "aliceG", x: ALG[0], y: 0, z: ALG[2], mode: "stand", facing: 0, seed: 63, expr: "grin", look: 0.3, talk: talkAt(t, 30.6, 32.5), scale: 1.5 }]; },
  anim: gymAnim(null as unknown as ShotPart, 0.9) };
B3.anim = gymAnim(B3, 0.9);

// ---------- 4 (32.56 - 33.225) "join you.": the JOIN US sign, held up like a gym recruiter
const B4: ShotPart = { a: sec(32.56), b: sec(33.225), light: "inside", set: SB.gym, cInf: 9,
  cams: [K(32.56, [N_GYM + 0.5, 1.9, 1.0], [N_GYM + 0.5, 2.0, -4.4], 48), K(33.225, [N_GYM + 0.5, 1.95, -0.2], [N_GYM + 0.5, 2.0, -4.4], 42, 0.665)],
  cast: (f) => { const t = at(f); return [{ who: CAST.ALICE, key: "aliceG", x: ALG[0], y: 0, z: ALG[2], mode: "stand", facing: 0, seed: 63, expr: "laugh", look: 0.3, talk: talkAt(t, 32.5, 33.1), wave: 0.9, scale: 1.5 }]; },
  anim: gymAnim(null as unknown as ShotPart, 0.95) };
B4.anim = gymAnim(B4, 0.95);

// ---------- 5 (33.225 - 34.36) "Then the photos.": the soap board, flashes, polaroids slap onto the wall
const P0 = COMIC.px[0], PZ = -5.2;
const lovers = (t: number): Spot[] => {
  const k = sm(COMIC.kissAt - 0.35, COMIC.kissAt, t), done = t > COMIC.kissAt;
  return [
    { who: CAST.ALICE, key: "aliceC", x: P0 - 0.75 + k * 0.3, y: 0, z: PZ, mode: "stand", facing: 1, seed: 64, expr: (done ? "smile" : t < 34.4 ? "nervous" : "smile_closed") as Expr, look: 0.5, scale: 1.55, headTilt: done ? 0.16 : 0 },
    { who: CAST.JENSEN, key: "jensC", x: P0 + 0.75, y: 0, z: PZ, mode: "stand", facing: -1, seed: 65, expr: (t < COMIC.kissAt ? "neutral" : t < COMIC.scratchAt + 0.3 ? "shock" : "nervous") as Expr, look: -0.5, scale: 1.55 },
  ];
};
const comicGear = (s: ShotPart) => (f: number) => { const t = at(f), k = sm(COMIC.kissAt - 0.35, COMIC.kissAt, t); placeGear(GEARB.comic, camPos(s, f), { x: P0 - 0.75 + k * 0.3, y: 0, z: PZ, shades: 1, bag: true, scale: 1.55 }); };
const B5: ShotPart = { a: sec(33.225), b: sec(34.36), portal: true, light: "golden", set: SB.comic, cInf: 10,
  cams: [K(33.225, [N_COMIC - 1.2, 3.4, 4.2], [N_COMIC - 3.6, 3.3, -5], 52), K(34.36, [P0 + 0.8, 2.9, 0.6], [P0 - 0.2, 2.8, -5.2], 44, 1.135)],
  cast: (f) => lovers(at(f)), anim: comicGear(null as unknown as ShotPart) };
B5.anim = comicGear(B5);

// ---------- 6 (34.36 - 36.12) "Footage shows a kiss on the cheek.": cheek kiss, hearts pop, record scratch (camera kicks)
const sc = COMIC.scratchAt;
const B6: ShotPart = { a: sec(34.36), b: sec(36.12), light: "golden", set: SB.comic, cInf: 9,
  cams: [K(34.36, [P0 + 0.6, 2.9, -0.2], [P0, 2.8, -5.2], 40), K(35.2, [P0 + 0.2, 2.85, -1.6], [P0, 2.8, -5.2], 34, 0.84), K(sc, [P0 + 0.12, 2.85, -2.2], [P0, 2.8, -5.2], 32, sc - 35.2),
         K(sc + 0.07, [P0 + 0.3, 2.9, -2.1], [P0, 2.8, -5.2], 31, 0.07), K(sc + 0.14, [P0 - 0.1, 2.8, -2.25], [P0, 2.8, -5.2], 31, 0.07), K(36.12, [P0 + 0.05, 2.85, -2.6], [P0, 2.82, -5.2], 30, 0.4)],
  cast: (f) => lovers(at(f)), anim: comicGear(null as unknown as ShotPart) };
B6.anim = comicGear(B6);

// ---------- 7 (36.12 - 38.214) "Then you leave the restaurant in the same car.": both climb into the tiny sedan, the kiss cam finds it
const P2 = COMIC.px[2], CZ = -4.3, CS = 0.92;
const climb = (t: number) => sm(36.7, 37.15, t);
const lovers2 = (t: number): Spot[] => { const u = climb(t), hop = Math.sin(u * Math.PI) * 0.5, inside = t >= 37.15;
  const mk = (who: typeof CAST.ALICE, key: string, off: number, seed: number, from: number, ex: Expr, face: -1 | 1): Spot => ({ who, key, x: P2 + (1 - u) * from + u * off * CS - (1 - u) * 0, y: 0.3 * u * CS + hop, z: inside ? CZ : CZ + 1.0 - u * 1.0, mode: u > 0 && u < 1 ? "stand" : inside ? "stand" : "stroll", phase: t * 2.3, facing: face, seed, expr: ex, scale: 0.85 * CS, look: 0.4 });
  return [mk(CAST.ALICE, "aliceK", -0.5, 66, -2.8 + Math.min(0, (t - 36.12)) * 0, inside ? (t > COMIC.kissCamAt ? "shock" : "smile") : "grin", 1), mk(CAST.JENSEN, "jensK", 0.12, 67, -3.6, inside ? (t > COMIC.kissCamAt ? "shock" : "smile") : "smile_closed", 1)]; };
const B7: ShotPart = { a: sec(36.12), b: sec(38.214), light: "golden", set: SB.comic, cInf: 9,
  cams: [K(36.12, [P2 - 1.8, 1.7, 3.6], [P2 - 0.8, 1.3, -4.3], 46), K(37.3, [P2 - 0.4, 1.9, 3.4], [P2, 1.5, -4.3], 44, 1.18), K(37.7, [P2, 3.0, 5.4], [P2, 3.0, -4.5], 52, 0.4), K(38.214, [P2 + 0.2, 3.3, 5.0], [P2, 3.3, -4.5], 50, 0.514)],
  cast: (f) => lovers2(at(f)) };

// ---------- 8 (38.214 - 39.657) "And the car starts to bounce.": crowd of tiny "…?" heads, the penguin covers its eyes
const SO = STREET.carZ;
const inStreetCar = (t: number): Spot[] => { const s = streetCar(t), wob = Math.sin(t * 18) * 0.0;
  return [{ who: CAST.ALICE, key: "aliceS", x: s.x - 0.45 * 0.85, y: s.y + 0.27, z: SO, mode: "stand", facing: 1, seed: 68, expr: t < 39.64 ? "nervous" : t < 40.4 ? "shock" : "stern", scale: 0.85, look: 0.4 + wob },
          { who: CAST.JENSEN, key: "jensS", x: s.x + 0.15 * 0.85, y: s.y + 0.27, z: SO, mode: "stand", facing: 1, seed: 69, expr: t < 39.64 ? "nervous" : "shock", scale: 0.85, look: 0.4 }]; };
const B8: ShotPart = { a: sec(38.214), b: sec(39.657), portal: true, light: "day", set: SB.street, cInf: 10,
  cams: [K(38.214, [N_STREET - 1.2, 2.0, 10.5], [N_STREET - 0.5, 1.5, 0.2], 56), K(39.657, [N_STREET - 0.8, 1.8, 8.6], [N_STREET - 0.4, 1.4, 0.2], 50, 1.443)],
  cast: (f) => inStreetCar(at(f)) };

// ---------- 9 (39.657 - 41.14) "It was a pothole.": the car rolls off and the giant pothole is revealed
const B9: ShotPart = { a: sec(39.657), b: sec(41.14), light: "day", set: SB.street, cInf: 9,
  cams: [K(39.657, [N_STREET - 0.5, 1.5, 9.0], [STREET.hole + 0.8, 0.8, 0.7], 50), K(40.5, [STREET.hole + 1.5, 2.0, 8.4], [STREET.hole + 1.6, 0.3, 0.7], 48, 0.85), K(41.14, [STREET.hole + 1.6, 2.4, 7.6], [STREET.hole + 1.2, 0.2, 0.7], 46, 0.64)],
  cast: (f) => inStreetCar(at(f)) };

// ---------- 10 (41.14 - 43.231) "But try telling the internet that.": crowd deflates, the SINGAPORE PUBLIC WORKS cone
const B10: ShotPart = { a: sec(41.14), b: sec(43.231), light: "day", set: SB.street, cInf: 10,
  cams: [K(41.14, [STREET.hole - 1.0, 1.6, 9.0], [STREET.hole - 1.4, 1.5, 0.5], 54), K(43.231, [STREET.hole - 1.8, 1.4, 6.8], [STREET.hole - 2.3, 0.9, 2.4], 42, 2.091)],
  cast: (f) => inStreetCar(at(f)) };

// ---------- 11 (43.231 - 44.554) "Here's where it gets messy.": HARD CUT, night, the van on a messy street, one beat of silence (no portal)
const [VX, , VZ] = VANST.van;
const B11: ShotPart = { a: sec(43.231), b: sec(44.554), light: "night", set: SB.vanst, cInf: 10,
  cams: [K(43.231, [N_VANST - 3.6, 1.4, 8.4], [VX + 0.3, 1.5, VZ], 54), K(44.554, [N_VANST - 2.4, 1.5, 5.4], [VX + 0.4, 1.5, VZ], 44, 1.323)] };

// ---------- 12 (44.554 - 48.686) "US investigators are tracking Megaspeed...": van interior, agent with a donut, monitors
const AG = VANIN.agent;
const agent = (t: number, ex: Expr, tk = 0 as 0 | 1 | 2): Spot => ({ who: CAST.AGENT, key: "agentV", x: AG[0], y: 0.08, z: AG[2], mode: "sit", facing: 0, seed: 70, expr: ex, look: -0.5, talk: tk });
const B12: ShotPart = { a: sec(44.554), b: sec(48.686), portal: true, light: "night", set: SB.van, cInf: 9,
  cams: [K(44.554, [N_VAN + 1.0, 1.4, 3.2], [N_VAN + 0.1, 1.3, -1], 56), K(46.4, [N_VAN + 0.6, 1.4, 2.3], [N_VAN + 0.1, 1.3, -2.0], 50, 1.85), K(48.686, [N_VAN + 0.6, 1.3, 2.0], [N_VAN + 0.3, 1.15, 0.3], 44, 2.286)],
  cast: (f) => { const t = at(f); return [agent(t, t < 46.4 ? "neutral" : "nervous", t > 47.0 ? rep(6, t) as 1 | 2 : 0)]; } };

// ---------- 13 (48.686 - 51.469) "And they find you've been in direct contact with Jensen.": agent spits out his coffee
const B13: ShotPart = { a: sec(48.686), b: sec(51.469), light: "night", set: SB.van, cInf: 9,
  cams: [K(48.686, [N_VAN + 0.9, 1.3, 2.9], [N_VAN + 0.2, 1.2, -0.5], 46), K(50.6, [N_VAN + 0.7, 1.35, 2.6], [N_VAN + 0.4, 1.3, 0.3], 40, 1.9), K(VANIN.spitAt, [N_VAN + 0.7, 1.35, 2.5], [N_VAN + 0.5, 1.3, 0.6], 38, 0.22), K(51.469, [N_VAN + 0.6, 1.35, 2.3], [N_VAN + 0.5, 1.3, 0.6], 35, 0.65)],
  cast: (f) => { const t = at(f); return [agent(t, t < 50.1 ? "stern" : t < VANIN.spitAt ? "smile_closed" : "shock", t >= VANIN.spitAt ? rep(14, t) as 1 | 2 : 0)]; } };

// ---------- 14 (51.469 - 54.82) "On paper, Singapore buys about a quarter of Nvidia's sales.": the mountain of SINGAPORE invoices
const [MX, , MZ] = INV.mt;
const clerk = (t: number): Spot[] => [{ who: CAST.SUIT, key: "clerkI", x: MX + 3.9, y: 0, z: 1.2, mode: "stand", facing: -1, seed: 71, expr: t < 53.5 ? "nervous" : "shock", look: -0.5, scale: 1.1 }, { who: crowd(2), key: "clerkI2", x: MX - 4.0, y: 0, z: 0.4, mode: "stroll", phase: t * 1.6, facing: 1, seed: 72, expr: "neutral", scale: 1.0 }];
const B14: ShotPart = { a: sec(51.469), b: sec(54.82), portal: true, light: "inside", set: SB.inv, cInf: 10,
  cams: [K(51.469, [MX + 1.6, 1.3, 7.0], [MX + 0.4, 2.6, MZ], 58), K(54.82, [MX + 0.6, 3.2, 3.6], [MX + 0.2, 3.6, MZ], 50, 3.35)], cast: (f) => clerk(at(f)) };

// ---------- 15 (54.82 - 56.953) "In real life, barely any chips land there.": one tiny cardboard box on a plinth
const [BXP, , BZP] = INV.box;
const B15: ShotPart = { a: sec(54.82), b: sec(56.953), light: "inside", set: SB.inv, cInf: 9,
  cams: [K(54.82, [BXP + 2.4, 1.1, BZP + 3.2], [BXP - 1.0, 1.1, BZP - 1.2], 46), K(56.953, [BXP + 0.7, 0.9, BZP + 1.5], [BXP - 0.05, 0.85, BZP], 34, 2.133)],
  cast: (f) => [{ who: CAST.SUIT, key: "clerkI", x: BXP - 1.8, y: 0, z: BZP + 0.4, mode: "stand", facing: 1, seed: 71, expr: at(f) < 56 ? "nervous" : "sad" as Expr, look: 0.5, scale: 1.0 }] };

// ---------- 16 (56.953 - 59.18) "So people are asking: could China just rent": server rack with a FOR RENT sign
const B16: ShotPart = { a: sec(56.953), b: sec(59.18), portal: true, light: "inside", set: SB.rack, cInf: 10,
  cams: [K(56.953, [N_RACK + 0.9, 1.5, 5.6], [N_RACK - 0.2, 1.5, -3.4], 52), K(59.18, [N_RACK + 0.5, 1.5, 1.8], [N_RACK + 0.1, 1.4, -3.4], 42, 2.227)],
  cast: (f) => [{ who: CAST.INTERN, key: "internR", x: N_RACK + 2.3, y: 0, z: -1.6, mode: "stand", facing: -1, seed: 73, expr: "nervous", look: -0.6 }] };

// ---------- 17 (59.18 - 61.085) "the chips, one border away?": bell dings, the intern thinks "...wait, that's allowed?"
const B17: ShotPart = { a: sec(59.18), b: sec(61.085), light: "inside", set: SB.rack, cInf: 9,
  cams: [K(59.18, [N_RACK + 1.0, 1.4, 3.0], [N_RACK + 1.8, 1.5, -2.5], 54), K(61.085, [N_RACK + 1.5, 1.5, 3.6], [N_RACK + 2.1, 1.7, -1.6], 50, 1.905)],
  cast: (f) => { const t = at(f); return [{ who: CAST.INTERN, key: "internR", x: N_RACK + 2.3, y: 0, z: -1.6, mode: "stand", facing: -1, seed: 73, expr: t < THOUGHT.at ? "nervous" : "shock", look: -0.6 }]; } };
void N_VANST;

export const SHOTS_B: ShotPart[] = [B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11, B12, B13, B14, B15, B16, B17];
