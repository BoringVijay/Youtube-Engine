// Video A, section A shots (lines 1-7, 0.0-26.811 s). Only the section-A helper edits this file.
// The Denny's booth hub (1) -> three guys (2) -> napkin roast (3) -> portal through the kitchen door to teen Jensen (4) -> NV1 pfft (5)
// -> contract signing (6) -> sweaty handshake (7) -> split-screen call + money (8) -> desks vanish (9) -> wall calendar "30" (10).
import { ShotPart, ShotDef, Spot, sec, S, camAt, talkAt } from "../timeline";
import { Outfit, SKINS } from "../../bridge/toon";
import { CAST, crowd } from "../cast";
import {
  A_BOOTH as BX, A_KITCHEN as KX, A_STAGE as SX, A_BOARD as BDX, A_CALL as CX, A_OFFICE as OX,
  BOOTH_SEAT, STAGE_JENSEN, STAGE_GUESTS, BOARD, CALL, CALL_SCALE, DESKS, poseBoard,
} from "../sets/a";

/** two friends at the booth: distinct silhouettes (stout + blue cap + green flannel / thin + moustache + mustard sweater) */
const FRIEND_A: Outfit = { jacket: "#2f7a5c", pants: "#3b3f52", boots: "#2a2420", hat: "cap", cap: "#2f4a8a", skin: SKINS[0], build: "stout", buttons: "#e8c04a" };
const FRIEND_B: Outfit = { jacket: "#e8b83a", pants: "#4a4f5c", boots: "#2a2420", hat: "hair", hair: "#7a4a2a", skin: SKINS[3], moustache: "#2a201a", buttons: "#a87a1a" };

const seat = (s: readonly [number, number, number]) => ({ x: BX + s[0], y: s[1], z: s[2] });
const bob = (t: number, ph = 0) => 0.012 * Math.sin(t * 2.1 + ph); // breathing

const s1: ShotPart = {
  // 1 (0-3.592) "Imagine you build the most valuable company on Earth. In a Denny's booth." Empty ketchup-stained booth, napkin chip doodle, steaming coffee. Long push in, then dive into the napkin.
  a: sec(0), b: sec(3.592), light: "inside", set: "a_booth", cInf: 9,
  cams: [{ f: sec(0), pos: [BX + 0.7, 2.1, 4.8], look: [BX - 0.05, 1.3, -1.0], fov: 50 },
         { f: sec(3.592), dur: sec(3.592), pos: [BX + 0.1, 1.85, 1.25], look: [BX + 0.0, 0.78, -0.45], fov: 38 }],
};
const s2: ShotPart = {
  // 2 (3.592-5.5) "It's 1993. You're 30." Three guys at the booth, calendar "1993" on the wall behind.
  a: sec(3.592), b: sec(5.5), portal: true, light: "inside", set: "a_booth", cInf: 10,
  cams: [{ f: sec(3.592), pos: [BX + 0.55, 1.5, 4.0], look: [BX - 0.1, 1.05, -1.3], fov: 46 },
         { f: sec(5.5), dur: sec(1.9), pos: [BX + 0.25, 1.42, 3.1], look: [BX - 0.15, 1.1, -1.3], fov: 44 }],
  cast: (f) => {
    const t = S(f), a = seat(BOOTH_SEAT.l), b = seat(BOOTH_SEAT.m), c = seat(BOOTH_SEAT.r);
    return [
      { who: CAST.JENSEN_1993, key: "j93", ...a, y: a.y + bob(t), mode: "sit", seed: 3, expr: t < 4.5 ? "smile" : "grin", look: 0.2, facing: 1 },
      { who: FRIEND_A, key: "frA", ...b, z: b.z + 0.04, y: b.y + bob(t, 1), mode: "sit", seed: 8, expr: "neutral", look: -0.3 },
      { who: FRIEND_B, key: "frB", ...c, z: c.z + 0.02, y: c.y + bob(t, 2), mode: "sit", seed: 12, expr: t < 4.9 ? "nervous" : "smile_closed", look: -0.5, facing: -1 },
    ];
  },
};
const s3: ShotPart = {
  // 3 (5.5-8.312) "You and two friends think computers should draw like video games." The napkin: "GRAPHICS" is a stick figure. Then the camera whips up to the kitchen door and dives in.
  a: sec(5.5), b: sec(8.312), light: "inside", set: "a_booth", cInf: 11,
  cams: [{ f: sec(5.5), pos: [BX + 0.0, 1.8, 1.5], look: [BX - 0.12, 0.92, -0.85], fov: 45 },
         { f: sec(7.8), dur: sec(2.3), pos: [BX - 0.05, 1.62, 1.05], look: [BX - 0.12, 0.86, -0.7], fov: 40 },
         { f: sec(8.312), dur: 15, pos: [BX + 0.95, 1.7, 1.2], look: [BX + 2.8, 1.15, -2.3], fov: 44 }],
  cast: (f) => {
    const t = S(f), a = seat(BOOTH_SEAT.l), b = seat(BOOTH_SEAT.m), c = seat(BOOTH_SEAT.r);
    return [
      { who: CAST.JENSEN_1993, key: "j93", ...a, y: a.y + bob(t), mode: "sit", seed: 3, expr: t < 6.6 ? "smile" : "grin", talk: talkAt(t, 6.1, 7.97), look: 0.4, facing: 1 },
      { who: FRIEND_A, key: "frA", ...b, z: b.z + 0.04, y: b.y + bob(t, 1), mode: "sit", seed: 8, expr: t < 6.7 ? "neutral" : t < 7.7 ? "dazed" : "stern", look: 0.5 },
      { who: FRIEND_B, key: "frB", ...c, z: c.z + 0.02, y: c.y + bob(t, 2), mode: "sit", seed: 12, expr: t < 6.8 ? "smile_closed" : "nervous", look: -0.6, facing: -1 },
    ];
  },
};
const s4: ShotPart = {
  // 4 (8.312-11.012) "Fun fact: as a teenager, you washed dishes at Denny's." Portal through the kitchen door: teen Jensen drowning in plates; the right tower finally goes at "dishes".
  a: sec(8.312), b: sec(11.012), portal: true, light: "lab", set: "a_kitchen", cInf: 10,
  cams: [{ f: sec(8.312), pos: [KX + 0.65, 1.55, 3.7], look: [KX - 0.3, 1.4, -1.4], fov: 47 },
         { f: sec(11.012), dur: sec(2.7), pos: [KX + 0.2, 1.45, 2.7], look: [KX - 0.25, 1.4, -1.4], fov: 42 }],
  cast: (f) => {
    const t = S(f);
    return [
      { who: CAST.JENSEN_TEEN, key: "teen", x: KX - 0.2, y: 0, z: -1.6, mode: "stand", seed: 5, expr: t < 9.8 ? "nervous" : t < 10.5 ? "shock" : "dazed", look: 0.3, headTilt: t > 9.9 ? -4 : 0, tilt: 1.5 * Math.sin(t * 6) },
      { who: crowd(4), key: "cook", x: KX + 1.9, y: 0, z: -0.9, mode: "stand", seed: 17, expr: "whistle", look: -0.8, facing: -1 },
    ];
  },
};
const s5: ShotPart = {
  // 5 (11.012-13.107) "So you build your first chip. It flops." Chip on a pedestal. Jensen's party popper goes pfft (limp streamer), the guests are unimpressed, the chip flops over, balloons sag.
  a: sec(11.012), b: sec(13.107), portal: true, light: "inside", set: "a_stage", cInf: 10,
  cams: [{ f: sec(11.012), pos: [SX + 0.25, 1.6, 4.1], look: [SX + 0.0, 1.3, -1.6], fov: 48 },
         { f: sec(13.107), dur: sec(2.1), pos: [SX + 0.1, 1.5, 3.4], look: [SX + 0.0, 1.3, -1.6], fov: 46 }],
  cast: (f) => {
    const t = S(f), [jx, , jz] = STAGE_JENSEN;
    return [
      { who: CAST.JENSEN_1993, key: "j93", x: jx, y: 0, z: jz, mode: "stand", seed: 3, expr: t < 11.98 ? "grin" : t < 12.4 ? "neutral" : "dazed", wave: 0.5, look: 0.7, facing: 1 },
      { who: crowd(1), key: "g0", x: STAGE_GUESTS[0][0], y: 0, z: STAGE_GUESTS[0][2], mode: "stand", seed: 21, expr: t < 12.0 ? "smile" : "neutral", look: -0.6, facing: -1 },
      { who: crowd(4), key: "g1", x: STAGE_GUESTS[1][0], y: 0, z: STAGE_GUESTS[1][2], mode: "stand", seed: 22, expr: t < 12.0 ? "grin" : "stern", look: -0.5, facing: -1 },
      { who: crowd(2), key: "g2", x: STAGE_GUESTS[2][0], y: 0, z: STAGE_GUESTS[2][2], mode: "stand", seed: 23, expr: t < 12.0 ? "smile" : "whistle", look: 0.8, facing: 1 },
    ];
  },
};
const s6: ShotPart = {
  // 6 (13.107-16.1) "Then a game company pays you to build their console chip." Contract signing across the boardroom table, briefcase of cash, Jensen's sleeve signs.
  a: sec(13.107), b: sec(16.1), portal: true, light: "inside", set: "a_board", cInf: 10,
  cams: [{ f: sec(13.107), pos: [BDX + 0.25, 2.0, 2.8], look: [BDX - 0.05, 0.95, -1.3], fov: 46 },
         { f: sec(16.1), dur: sec(3.0), pos: [BDX + 0.15, 1.85, 2.15], look: [BDX - 0.1, 0.92, -1.2], fov: 42 }],
  cast: (f) => {
    const t = S(f), j = BOARD.jensen, e = BOARD.exec;
    return [
      { who: CAST.JENSEN_1993, key: "j93", x: j[0], y: 0, z: j[2], mode: "stand", seed: 3, expr: t < 14.4 ? "smile" : "grin", look: 0.6, facing: 1 },
      { who: CAST.SUIT, key: "exec", x: e[0], y: 0, z: e[2], mode: "stand", seed: 31, expr: t < 15.2 ? "smile_closed" : "grin", look: -0.6, facing: -1 },
      { who: crowd(5), key: "aide", x: BDX + 1.7, y: 0, z: -2.5, mode: "stand", seed: 33, expr: "neutral", look: -0.9, facing: -1 },
    ];
  },
};
const s7: ShotPart = {
  // 7 (16.1-17.9) "And you realize your design is wrong." Mid-handshake: Jensen sweats (drops fall, "gulp."), the exec beams.
  a: sec(16.1), b: sec(17.9), light: "inside", set: "a_board", cInf: 11,
  cams: [{ f: sec(16.1), pos: [BDX + 0.1, 1.55, 4.7], look: [BDX + 0.0, 1.3, 0.3], fov: 45 },
         { f: sec(17.9), dur: sec(1.8), pos: [BDX + 0.05, 1.5, 4.0], look: [BDX + 0.0, 1.3, 0.3], fov: 41 }],
  cast: (f) => {
    const t = S(f), j = BOARD.shakeJ, e = BOARD.shakeE;
    return [
      { who: CAST.JENSEN_1993, key: "j93", x: j[0], y: 0, z: j[2], mode: "stand", seed: 3, expr: t < 17.3 ? "nervous" : "shock", look: 0.5, facing: 1, tilt: 0.8 * Math.sin(t * 17) },
      { who: CAST.SUIT, key: "exec", x: e[0], y: 0, z: e[2], mode: "stand", seed: 31, expr: "grin", look: -0.5, facing: -1, tilt: 0.8 * Math.sin(t * 17 + 3) },
    ];
  },
  anim: (f) => poseBoard(S(f), camAt({ ...s7, id: 0 } as ShotDef, f).pos),
};
// the signing arm animation needs the camera too (re-declared here so s6 can reference itself)
s6.anim = (f) => poseBoard(S(f), camAt({ ...s6, id: 0 } as ShotDef, f).pos);
const s8: ShotPart = {
  // 8 (17.9-21.899) "So you call them and say: hire someone else. Also, please still pay us. And they do." Split-screen call: Jensen below, the game-company boss above nods slowly and sends the money.
  a: sec(17.9), b: sec(21.899), portal: true, light: "inside", set: "a_call", cInf: 8,
  cams: [{ f: sec(17.9), pos: [CX + 0.05, 2.78, 9.4], look: [CX, 2.7, -3], fov: 34 },
         { f: sec(21.899), dur: sec(4.0), pos: [CX - 0.03, 2.7, 8.4], look: [CX, 2.65, -3], fov: 34 }],
  cast: (f) => {
    const t = S(f), j = CALL.jensen, e = CALL.exec;
    const nod = t > 19.7 ? 0.045 * Math.max(0, Math.sin((t - 19.7) * 3.2)) * (t < 21.3 ? 1 : 0) : 0;
    return [
      { who: CAST.JENSEN_1993, key: "j93", x: j[0], y: 0.14, z: j[2], mode: "stand", seed: 3, expr: t < 19.7 ? "nervous" : t < 21.5 ? "stern" : "relief_open", talk: talkAt(t, 18.9, 21.0), wave: 0.5, look: 0.4, facing: 1, scale: CALL_SCALE },
      { who: CAST.SUIT, key: "execcall", x: e[0], y: 3.3 - nod, z: e[2], mode: "sit", seed: 31, expr: t < 21.1 ? "neutral" : "smile_closed", look: 0.2, headTilt: nod * 40, scale: CALL_SCALE },
    ];
  },
};
const deskSeats = DESKS.map((d, i) => ({ x: OX + d.x, z: d.z - 0.62, t: d.t, v: [0, 2, 3, 1, 5, 4, 6, 7][i] }));
const s9: ShotPart = {
  // 9 (21.899-24.48) "You lay off half the company." Eight desks, four of them vanish one by one in a poof, workers and all.
  a: sec(21.899), b: sec(24.48), portal: true, light: "lab", set: "a_office", cInf: 10,
  cams: [{ f: sec(21.899), pos: [OX + 0.9, 3.7, 8.3], look: [OX - 0.1, 0.9, -1.0], fov: 49 },
         { f: sec(24.48), dur: sec(2.6), pos: [OX + 0.45, 3.0, 6.6], look: [OX - 0.05, 1.0, -1.6], fov: 45 }],
  cast: (f) => {
    const t = S(f);
    const out: Spot[] = deskSeats.filter((d) => d.t < 0 || t < d.t).map((d, i) => ({
      who: crowd(d.v), key: "w" + d.v, x: d.x, y: 0.35 + 0.01 * Math.sin(t * 7 + i), z: d.z, mode: "sit", seed: 40 + i,
      expr: t > 22.9 && d.t < 0 ? "shock" : "neutral", look: 0.2 * (i % 3 - 1),
    }));
    out.push({ who: CAST.JENSEN_1993, key: "j93", x: OX - 0.75, y: 0, z: 4.1, mode: "stand", seed: 3, expr: t < 22.3 ? "neutral" : "stern", look: -0.4, facing: 1 });
    return out;
  },
};
const s10: ShotPart = {
  // 10 (24.48-26.811) "Your motto becomes: we're 30 days from going out of business." The aisle dolly to the wall calendar "30", Jensen sweating beside it, half the desks gone.
  a: sec(24.48), b: sec(26.811), light: "lab", set: "a_office", cInf: 11,
  cams: [{ f: sec(24.48), pos: [OX + 0.12, 1.8, 6.0], look: [OX, 1.8, -4.5], fov: 44 },
         { f: sec(26.811), dur: sec(2.33), pos: [OX + 0.05, 1.75, 1.8], look: [OX, 1.85, -4.5], fov: 38 }],
  cast: (f) => {
    const t = S(f);
    const out: Spot[] = deskSeats.filter((d) => d.t < 0).map((d, i) => ({
      who: crowd(d.v), key: "w" + d.v, x: d.x, y: 0.35 + 0.01 * Math.sin(t * 7 + i), z: d.z, mode: "sit", seed: 40 + i, expr: "shock", look: 0.2 * (i % 3 - 1),
    }));
    out.push({ who: CAST.JENSEN_1993, key: "j93", x: OX - 0.95, y: 0, z: -3.75, mode: "stand", seed: 3, expr: "nervous", talk: talkAt(t, 24.48, 26.13), wave: 0.5, look: 0.5, facing: 1 });
    return out;
  },
};

export const SHOTS_A: ShotPart[] = [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10];
