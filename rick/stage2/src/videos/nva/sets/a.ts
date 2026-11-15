// Video A ("The Denny's Booth"), section A sets (lines 1-7, 0.0-26.8 s). Only the section-A helper edits this file.
//
// WORLD SLOTS (all painted in Canvas2D, zero generated assets):
//   x=400  A_BOOTH    the Denny's booth HUB. `buildBooth(ctx, x)` builds the whole diner nook around (x, 0, 0): the booth, table, napkin, coffee,
//                     kitchen swing doors, window, neon, signs. Set name "a_booth".
//   x=500  A_KITCHEN  dish pit behind the swing doors (teen Jensen, plate towers). Set name "a_kitchen".
//   x=530  A_STAGE    the NV1 launch party: pedestal + chip + party popper. Set name "a_stage".
//   x=600  A_BOARD    game-company boardroom (contract signing, handshake). Set name "a_board".
//   x=625  A_CALL     split-screen phone call, two stacked panels + money. Set name "a_call".
//   x=640  A_OFFICE   open-plan office: 8 desks vanish, wall calendar "30". Set name "a_office". `OFFICE.calendar` is the calendar group
//                     (hung on the back wall at (A_OFFICE, 1.9, -4.46), 1.5 x 1.9 m): section B can reuse set "a_office" to rip it off the wall.
//
// HUB EXPORT FOR SECTION C (the hub returns at line 16 and lines 18-20):
//   const h = buildBooth(ctx, X)      -> returns BoothHandles (all positions are LOCAL to the booth centre; add X for world coords)
//     h.plaque        brass plaque + picture light on the back wall, HIDDEN by default (h.plaque.visible = true from 2023)
//     h.tablePhone    smartphone on the table, HIDDEN by default; h.buzz(t, slide, amp) vibrates it and slides it (slide 0..1 across the table);
//                     h.setScreen(texture) swaps its lock screen (ctx.signTex / ctex canvas 512x1024 recommended)
//     h.selfiePhone   phone seen from behind with a flash sprite (h.selfiePhone.userData.flash), HIDDEN by default: put it in the tourist's hand
//                     each frame (card hand for Spot.wave=0.5 is at +0.34*scale m right of the card centre, 1.43*scale m above its feet)
//     h.napkin / h.stick  napkin group with the chip doodle; h.stick is the stick-figure overlay (hidden outside set "a_booth")
//     h.coffee        mug group (steam is always animated)
//   BOOTH_SEAT          seat spots for sit-mode cards: { l, m, r } = [x, y, z] local
//   BOOTH_TOURIST       a free spot in the aisle for a tourist card: [x, y, z] local
//   Camera hints: the booth is lit by `light: "inside"`; table-top shots read best from elevation >= 35 deg (flat napkin / phone);
//   the kitchen swing doors are at local x 2.25..3.35 on the back wall (z=-2.3).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SetCtx } from "../world";
import { lam, boxGeo, quad, V } from "../../bridge/build";
import { ctex } from "../../bridge/paint";
import { twoTone } from "../../bridge/shade";
import { NOINK } from "../../bridge/ink";
import { FPS } from "../timeline";

export const A_BOOTH = 400, A_KITCHEN = 500, A_STAGE = 530, A_BOARD = 600, A_CALL = 625, A_OFFICE = 640;
export const BOOTH_SEAT = { l: [-0.55, 0.36, -1.27], m: [0.0, 0.36, -1.32], r: [0.55, 0.36, -1.27] } as const;
export const BOOTH_TOURIST = [1.35, 0, 0.6] as const;
const INKC = "#241726";

// ---------------------------------------------------------------- small helpers
type G2 = CanvasRenderingContext2D;
type Rnd = () => number;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ss = (a: number, b: number, t: number) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const rr = (g: G2, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const blob = (g: G2, x: number, y: number, r: number, col: string, rnd: Rnd) => {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, rad = r * (0.65 + rnd() * 0.5); const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
  g.closePath(); g.fill();
};
const ketchup = (g: G2, x: number, y: number, r: number, rnd: Rnd) => {
  blob(g, x, y, r, "#a8160f", rnd); blob(g, x - r * 0.12, y - r * 0.12, r * 0.72, "#d8281d", rnd);
  g.strokeStyle = "#c4231b"; g.lineWidth = r * 0.24; g.lineCap = "round";
  for (let k = 0; k < 3; k++) { const dx = (rnd() - 0.5) * r; g.beginPath(); g.moveTo(x + dx, y + r * 0.4); g.lineTo(x + dx + (rnd() - 0.5) * r * 0.3, y + r * (1.2 + rnd() * 0.9)); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.ellipse(x - r * 0.3, y - r * 0.3, r * 0.22, r * 0.11, -0.6, 0, 7); g.fill();
};
const txt = (g: G2, s: string, x: number, y: number, font: string, col: string, align: CanvasTextAlign = "center", stroke?: string, sw = 0) => {
  g.font = font; g.textAlign = align; g.textBaseline = "middle";
  if (stroke) { g.lineWidth = sw; g.strokeStyle = stroke; g.lineJoin = "round"; g.strokeText(s, x, y); }
  g.fillStyle = col; g.fillText(s, x, y);
};
const pen = (g: G2, pts: [number, number][], rnd: Rnd, col = "#2b3560", w = 6, jit = 2.2) => {
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath();
  pts.forEach(([x, y], i) => { const px = x + (rnd() - 0.5) * jit, py = y + (rnd() - 0.5) * jit; if (i) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke();
};

const mats = new Map<string, THREE.MeshLambertMaterial>();
const Lm = (key: string, color: string, map?: () => THREE.Texture) => {
  let m = mats.get(key);
  if (!m) { m = lam("nva_" + key, () => ({ color, ...(map ? { map: map() } : {}) })); m.side = THREE.DoubleSide; mats.set(key, m); }
  return m;
};
const toonCache = new Map<string, THREE.MeshLambertMaterial>();
const toon = (col: string) => { let m = toonCache.get(col); if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide })); toonCache.set(col, m); } return m; };
const basic = (map: THREE.Texture | null, o: { tr?: boolean; hdr?: number; color?: string } = {}) => {
  const m = new THREE.MeshBasicMaterial({ map: map ?? undefined, transparent: !!o.tr, side: THREE.DoubleSide, depthWrite: !o.tr, alphaTest: o.tr ? 0.02 : 0 });
  if (o.color) m.color.set(o.color);
  if (o.hdr) m.color.multiplyScalar(o.hdr);
  return m;
};
const glowMat = (c: SetCtx, col: [number, number, number], op = 1) => new THREE.MeshBasicMaterial({ map: c.glowTex(), color: new THREE.Color(...col), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: op, fog: false });

type PlOpts = { ry?: number; rx?: number; rz?: number; tr?: boolean; noink?: boolean; hdr?: number; parent?: THREE.Object3D; color?: string; order?: number };
/** the per-set toolbox: boxes / cylinders / spheres / quads go into the static batch, decals and dynamic things become meshes */
const kit = (c: SetCtx, ox: number) => {
  const { R, b } = c;
  const bx = (m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0) => b.add(boxGeo(V(ox + x0, y0, z0), V(ox + x1, y1, z1), tile), m);
  const cy = (m: THREE.Material, x: number, z: number, y0: number, y1: number, r0: number, r1 = r0, seg = 18) => {
    const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, seg); g.translate(ox + x, (y0 + y1) / 2, z); b.add(g, m);
  };
  const sp = (m: THREE.Material, x: number, y: number, z: number, r: number, sx = 1, sy = 1, sz = 1) => {
    const g = new THREE.SphereGeometry(r, 14, 10); g.scale(sx, sy, sz); g.translate(ox + x, y, z); b.add(g, m);
  };
  const qd = (m: THREE.Material, a: number[], bb: number[], cc: number[], dd: number[], u1 = 1, v1 = 1) =>
    b.add(quad(V(ox + a[0], a[1], a[2]), V(ox + bb[0], bb[1], bb[2]), V(ox + cc[0], cc[1], cc[2]), V(ox + dd[0], dd[1], dd[2]), u1, v1), m);
  const pl = (tex: THREE.Texture | null, w: number, h: number, x: number, y: number, z: number, o: PlOpts = {}) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(tex, { tr: o.tr, hdr: o.hdr, color: o.color }));
    const par = o.parent ?? R;
    m.position.set(par === R ? ox + x : x, y, z); m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    if (o.noink) m.layers.set(NOINK);
    if (o.order !== undefined) m.renderOrder = o.order;
    par.add(m); return m;
  };
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, parent?: THREE.Object3D) => {
    const m = new THREE.Mesh(geo, mat); const par = parent ?? R; m.position.set(par === R ? ox + x : x, y, z); m.rotation.set(rx, ry, rz); par.add(m); return m;
  };
  /** the dynamic parent group: lives at (ox, 0, 0), children use local coordinates; world.ts shows/hides it by region */
  const group = () => { const g = new THREE.Group(); g.position.set(ox, 0, 0); R.add(g); return g; };
  return { bx, cy, sp, qd, pl, mesh, group };
};
type Kit = ReturnType<typeof kit>;
/** dynamic meshes are created at the origin: park them inside their set so world.ts tags them with the right 100 m region */
const park = (ox: number, ...ms: THREE.Object3D[]) => ms.forEach((m) => m.position.set(ox, 0.01, 0));

// ---------------------------------------------------------------- painted textures: the diner
const floorTex = () => ctex("nva_floor", 256, 256, (g, r) => {
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { g.fillStyle = (i + j) % 2 ? "#2d2a33" : "#f1e6cd"; g.fillRect(i * 128, j * 128, 128, 128); }
  for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(120,90,70,${0.04 + r() * 0.06})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 4 + r() * 18, 2 + r() * 6, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(30,25,30,0.55)"; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
});
const boothWall = () => ctex("nva_bwall", 512, 870, (g, r) => {
  // 2 m x 3.4 m tile: teal wainscot to 1.1 m, chrome chair rail, cream striped paper, red crown
  g.fillStyle = "#f2e4bf"; g.fillRect(0, 0, 512, 870);
  g.fillStyle = "#ead7a8"; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 28, 870);
  g.fillStyle = "#c8962f"; for (let x = 32; x < 512; x += 64) for (let y = 70; y < 590; y += 64) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
  g.fillStyle = "#b8302c"; g.fillRect(0, 0, 512, 34); g.fillStyle = "#e8c04a"; g.fillRect(0, 34, 512, 7);
  g.fillStyle = "#2c9a98"; g.fillRect(0, 590, 512, 280);
  for (let y = 590; y < 870; y += 48) for (let x = 0; x < 512; x += 64) { g.fillStyle = (x / 64 + (y - 590) / 48) % 2 ? "#33a9a6" : "#2a918f"; g.fillRect(x + 2, y + 2, 60, 44); }
  g.strokeStyle = "rgba(20,70,70,0.7)"; g.lineWidth = 3; for (let y = 590; y <= 870; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let x = 0; x <= 512; x += 64) { g.beginPath(); g.moveTo(x, 590); g.lineTo(x, 870); g.stroke(); }
  const gr = g.createLinearGradient(0, 574, 0, 596); gr.addColorStop(0, "#f5f7fa"); gr.addColorStop(0.5, "#aeb7c2"); gr.addColorStop(1, "#6b7580"); g.fillStyle = gr; g.fillRect(0, 574, 512, 20);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(140,110,70,${0.05 + r() * 0.07})`; g.beginPath(); g.ellipse(r() * 512, 200 + r() * 380, 6 + r() * 30, 3 + r() * 14, 0, 0, 7); g.fill(); }
});
const vinylTex = () => ctex("nva_vinyl", 256, 256, (g) => {
  g.fillStyle = "#8a2024"; g.fillRect(0, 0, 256, 256);
  for (let j = -1; j < 5; j++) for (let i = -1; i < 5; i++) {
    const cx = i * 64 + (j % 2 ? 32 : 0), cy = j * 32 + 16;
    g.fillStyle = (i + j) % 2 ? "#962629" : "#7e1c20"; g.beginPath(); g.moveTo(cx, cy - 16); g.lineTo(cx + 32, cy); g.lineTo(cx, cy + 16); g.lineTo(cx - 32, cy); g.closePath(); g.fill();
    g.strokeStyle = "#4e1012"; g.lineWidth = 3; g.stroke();
    g.fillStyle = "#d9776e"; g.beginPath(); g.arc(cx, cy, 3.5, 0, 7); g.fill();
  }
});
const ketchupDecal = () => ctex("nva_kdecal", 512, 256, (g, _r) => {
  const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  g.clearRect(0, 0, 512, 256); ketchup(g, 130, 90, 54, rnd); ketchup(g, 330, 120, 36, rnd); ketchup(g, 440, 60, 22, rnd); ketchup(g, 220, 170, 18, rnd);
});
const tableTex = () => ctex("nva_table", 1024, 512, (g, r) => {
  g.fillStyle = "#c9b48a"; g.fillRect(0, 0, 1024, 512);
  // boomerang laminate pattern
  for (let i = 0; i < 90; i++) {
    const x = r() * 1024, y = r() * 512; g.strokeStyle = i % 2 ? "#b39c70" : "#4a9a96"; g.lineWidth = 6; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26, y - 14); g.lineTo(x + 52, y + 4); g.stroke();
  }
  // coffee rings
  g.strokeStyle = "rgba(110,70,40,0.55)"; g.lineWidth = 7; for (const [x, y] of [[260, 140], [700, 360], [880, 140]]) { g.beginPath(); g.arc(x, y, 40, 0.2, 5.8); g.stroke(); }
  // ketchup crime scene: splat + finger smear + drips
  ketchup(g, 150, 380, 74, r); ketchup(g, 560, 70, 34, r); ketchup(g, 820, 420, 28, r); ketchup(g, 700, 250, 20, r);
  g.strokeStyle = "#c4231b"; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(190, 380); g.quadraticCurveTo(300, 430, 420, 400); g.stroke();
  g.strokeStyle = "#a8160f"; g.lineWidth = 6; g.beginPath(); g.moveTo(190, 384); g.quadraticCurveTo(300, 434, 420, 404); g.stroke();
  g.strokeStyle = "rgba(60,50,60,0.6)"; g.lineWidth = 6; g.strokeRect(3, 3, 1018, 506);
});
const napkinTex = () => ctex("nva_napkin", 512, 512, (g, r) => {
  g.fillStyle = "#f8f4ea"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#e2d9c4"; g.lineWidth = 5; g.strokeRect(14, 14, 484, 484);
  g.fillStyle = "#e9e0cc"; for (let x = 24; x < 500; x += 22) { g.beginPath(); g.arc(x, 24, 3, 0, 7); g.arc(x, 488, 3, 0, 7); g.fill(); }
  blob(g, 420, 430, 22, "rgba(150,100,60,0.35)", r); // coffee drip
  // the doodle: a chip with pins, a crown, $$$ and spark lines (ballpoint)
  const ink = "#16257c";
  g.save(); g.translate(180, 262); g.rotate(-0.08); g.scale(1.3, 1.3);
  pen(g, [[-82, -82], [82, -82], [82, 82], [-82, 82], [-82, -82]], r, ink, 9);
  pen(g, [[-46, -46], [46, -46], [46, 46], [-46, 46], [-46, -46]], r, ink, 7);
  for (let i = -2; i <= 2; i++) for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const px = dx ? dx * 82 : i * 32, py = dy ? dy * 82 : i * 32; pen(g, [[px, py], [px + dx * 30, py + dy * 30]], r, ink, 8, 1);
  }
  pen(g, [[-18, 6], [0, -18], [18, 6], [0, 24], [-18, 6]], r, ink, 6, 1.2);
  g.restore();
  g.save(); g.translate(180, 62); pen(g, [[-40, 18], [-46, -18], [-20, 2], [0, -26], [20, 2], [46, -18], [40, 18], [-40, 18]], r, "#c2371f", 7, 1.5); g.restore();
  for (const [a, x, y] of [[0, 330, 150], [1, 360, 90], [2, 410, 140]] as [number, number, number][]) { txt(g, "$", x + 10, y + 70, "bold 84px sans-serif", "#1f7a3a"); void a; }
  for (let k = 0; k < 6; k++) { const a = -0.3 - k * 0.45; pen(g, [[300 + Math.cos(a) * 20, 250 + Math.sin(a) * 20], [300 + Math.cos(a) * 52, 250 + Math.sin(a) * 52]], r, "#d99a1c", 6, 1); }
});
const stickTex = () => ctex("nva_stick", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  const ink = "#16257c";
  txt(g, "\"GRAPHICS\"", 256, 62, "bold 84px sans-serif", "#c2171f", "center", "#fffdf4", 12);
  pen(g, [[40, 116], [190, 122], [330, 112], [472, 120]], r, "#c2171f", 10, 3);
  pen(g, [[250, 140], [262, 176], [250, 206]], r, ink, 9, 2); pen(g, [[222, 184], [250, 214], [284, 186]], r, ink, 9, 1);
  g.strokeStyle = ink; g.lineWidth = 10; g.fillStyle = "rgba(255,255,255,0.92)"; rr(g, 70, 222, 372, 262, 22); g.fill(); g.stroke();
  g.beginPath(); g.arc(256, 308, 38, 0, 7); g.lineWidth = 10; g.stroke();
  g.fillStyle = ink; g.beginPath(); g.arc(244, 300, 5, 0, 7); g.arc(268, 300, 5, 0, 7); g.fill();
  g.lineWidth = 6; g.beginPath(); g.arc(256, 314, 14, 0.2, Math.PI - 0.2); g.stroke();
  pen(g, [[256, 346], [256, 420]], r, ink, 10, 1.5); pen(g, [[190, 372], [256, 376], [322, 352]], r, ink, 10, 1.5); pen(g, [[256, 420], [216, 468]], r, ink, 10, 1.5); pen(g, [[256, 420], [296, 468]], r, ink, 10, 1.5);
  for (const [x, y] of [[120, 262], [396, 258], [400, 440]]) pen(g, [[x - 12, y], [x + 12, y], [x, y], [x, y - 12], [x, y + 12]], r, "#d98a0a", 7, 1);
});
const nightWindow = () => ctex("nva_night", 512, 384, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#0d1736"); gr.addColorStop(0.55, "#25396b"); gr.addColorStop(1, "#4a5f94"); g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
  g.fillStyle = "#fff"; for (let i = 0; i < 40; i++) { g.globalAlpha = 0.3 + r() * 0.6; g.fillRect(r() * 512, r() * 170, 2.5, 2.5); } g.globalAlpha = 1;
  g.fillStyle = "#1b2038"; g.fillRect(0, 262, 512, 122);
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 3; for (let x = 20; x < 512; x += 84) { g.beginPath(); g.moveTo(x, 384); g.lineTo(x + 22, 270); g.stroke(); }
  for (const x of [90, 380]) { // street lamps with halos
    g.fillStyle = "#39405a"; g.fillRect(x - 3, 130, 6, 140);
    const rg = g.createRadialGradient(x, 128, 0, x, 128, 70); rg.addColorStop(0, "rgba(255,226,150,0.95)"); rg.addColorStop(1, "rgba(255,226,150,0)"); g.fillStyle = rg; g.fillRect(x - 70, 58, 140, 140);
  }
  g.fillStyle = "#7a2530"; rr(g, 200, 276, 120, 44, 16); g.fill(); rr(g, 224, 256, 70, 30, 12); g.fill(); // a parked car
  g.fillStyle = "#ffe9a0"; g.beginPath(); g.arc(205, 300, 8, 0, 7); g.fill();
  g.fillStyle = "#111"; g.beginPath(); g.arc(232, 322, 12, 0, 7); g.arc(292, 322, 12, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,0.08)"; g.beginPath(); g.moveTo(0, 0); g.lineTo(150, 0); g.lineTo(60, 384); g.lineTo(0, 384); g.fill();
});
const neonOpen = () => ctex("nva_neon", 512, 160, (g) => {
  g.clearRect(0, 0, 512, 160);
  g.shadowColor = "#ff3b6e"; g.shadowBlur = 24; txt(g, "OPEN 24 HRS", 256, 82, "bold 96px sans-serif", "#ff8aa6", "center", "#ff2f64", 8);
  g.shadowBlur = 0; g.strokeStyle = "#ff2f64"; g.lineWidth = 6; rr(g, 8, 8, 496, 144, 28); g.stroke();
});
const calendarTex = (key: string, year: string) => ctex(key, 384, 512, (g, r) => {
  g.fillStyle = "#fbf6e8"; g.fillRect(0, 0, 384, 512); g.fillStyle = "#c33a2e"; g.fillRect(0, 0, 384, 150);
  txt(g, year, 192, 82, "bold 112px sans-serif", "#fff"); g.fillStyle = "#c9c2ad"; g.fillRect(0, 150, 384, 8);
  g.fillStyle = "#37323a"; g.font = "bold 28px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i < 7; i++) g.fillText("SMTWTFS"[i], 36 + i * 52, 188);
  for (let d = 0; d < 35; d++) { const x = 36 + (d % 7) * 52, y = 236 + Math.floor(d / 7) * 52; g.fillText(String(d < 30 ? d + 1 : d - 29), x, y); }
  g.strokeStyle = "#c33a2e"; g.lineWidth = 6; g.beginPath(); g.ellipse(36 + ((r() * 0 + 11) % 7) * 52, 236 + 1 * 52, 22, 20, 0, 0, 7); g.stroke();
  g.strokeStyle = INKC; g.lineWidth = 10; g.strokeRect(5, 5, 374, 502);
});
const plaqueTex = () => ctex("nva_plaque", 1024, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 1024, 512); gr.addColorStop(0, "#f4d98a"); gr.addColorStop(0.35, "#c79a3a"); gr.addColorStop(0.65, "#f0cf78"); gr.addColorStop(1, "#a97a22");
  g.fillStyle = gr; rr(g, 0, 0, 1024, 512, 30); g.fill();
  g.strokeStyle = "#6b4a14"; g.lineWidth = 14; rr(g, 28, 28, 968, 456, 14); g.stroke(); g.lineWidth = 5; rr(g, 52, 52, 920, 408, 8); g.stroke();
  txt(g, "THIS BOOTH", 512, 170, "bold 130px serif", "#5a3b0a"); txt(g, "NVIDIA BEGAN HERE", 512, 300, "bold 96px serif", "#5a3b0a");
  txt(g, "1993", 512, 410, "bold 90px serif", "#5a3b0a");
  g.fillStyle = "#6b4a14"; for (const [x, y] of [[80, 80], [944, 80], [80, 432], [944, 432]]) { g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); }
});
const menuBoard = () => ctex("nva_menu", 384, 512, (g, r) => {
  g.fillStyle = "#24302c"; g.fillRect(0, 0, 384, 512); g.strokeStyle = "#8a5a2c"; g.lineWidth = 22; g.strokeRect(11, 11, 362, 490);
  txt(g, "BREAKFAST", 192, 70, "bold 62px sans-serif", "#ffe27a"); txt(g, "ALL DAY", 192, 122, "bold 40px sans-serif", "#ffffff");
  g.fillStyle = "#f3efe2"; g.font = "bold 40px sans-serif"; g.textAlign = "left";
  ["EGGS", "PANCAKES", "HASH BROWNS", "BOTTOMLESS COFFEE"].forEach((s, i) => { const y = 190 + i * 70; g.font = i === 3 ? "bold 30px sans-serif" : "bold 42px sans-serif"; g.fillText(s, 34, y); g.fillStyle = "rgba(243,239,226,0.5)"; for (let x = 34; x < 350; x += 14) g.fillRect(x, y + 22, 7, 3); g.fillStyle = "#f3efe2"; });
  void r;
});
const eggTex = () => ctex("nva_egg", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.lineWidth = 9; g.strokeStyle = INKC; g.fillStyle = "#fffdf4";
  g.beginPath(); g.moveTo(30, 130); g.bezierCurveTo(20, 60, 100, 28, 150, 52); g.bezierCurveTo(230, 40, 250, 130, 214, 190); g.bezierCurveTo(176, 244, 90, 232, 60, 200); g.bezierCurveTo(34, 176, 38, 150, 30, 130); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#ffbf1f"; g.beginPath(); g.arc(128, 124, 44, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.75)"; g.beginPath(); g.ellipse(112, 108, 12, 7, -0.6, 0, 7); g.fill();
});
const clockTex = () => ctex("nva_clock", 256, 256, (g) => {
  g.fillStyle = "#f6f1e6"; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill(); g.lineWidth = 14; g.strokeStyle = "#b8302c"; g.stroke();
  g.strokeStyle = INKC; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 56); g.moveTo(128, 128); g.lineTo(174, 148); g.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 94, 128 + Math.sin(a) * 94); g.lineTo(128 + Math.cos(a) * 106, 128 + Math.sin(a) * 106); g.stroke(); }
});
const doorTex = () => ctex("nva_door", 128, 512, (g) => {
  g.fillStyle = "#e9e1cf"; g.fillRect(0, 0, 128, 512); g.strokeStyle = "#8c8575"; g.lineWidth = 8; g.strokeRect(8, 8, 112, 496);
  g.fillStyle = "#b9b09a"; g.fillRect(0, 440, 128, 72); g.fillStyle = "#6e6757"; g.fillRect(0, 436, 128, 6);
  g.fillStyle = "#c9c1ac"; g.fillRect(40, 280, 48, 70); g.strokeStyle = "#6e6757"; g.lineWidth = 4; g.strokeRect(40, 280, 48, 70);
});
const portTex = () => ctex("nva_port", 128, 128, (g) => {
  const rg = g.createRadialGradient(64, 64, 4, 64, 64, 56); rg.addColorStop(0, "#fff5d0"); rg.addColorStop(1, "#ffb94a"); g.fillStyle = rg; g.beginPath(); g.arc(64, 64, 56, 0, 7); g.fill();
  g.lineWidth = 10; g.strokeStyle = "#5d5748"; g.stroke();
});
const phoneScreen = () => ctex("nva_lock", 256, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#1a2a5e"); gr.addColorStop(1, "#6a2f7a"); g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  txt(g, "9:41", 128, 120, "bold 96px sans-serif", "#ffffff");
  g.fillStyle = "rgba(255,255,255,0.8)"; rr(g, 78, 482, 100, 8, 4); g.fill();
});
const phoneBack = () => ctex("nva_phoneback", 128, 256, (g) => {
  g.fillStyle = "#23252d"; rr(g, 0, 0, 128, 256, 20); g.fill();
  g.fillStyle = "#14151a"; rr(g, 12, 12, 62, 62, 14); g.fill(); g.fillStyle = "#3a3d4a"; g.beginPath(); g.arc(30, 30, 14, 0, 7); g.arc(56, 56, 14, 0, 7); g.fill();
  g.fillStyle = "#c8cbd6"; g.beginPath(); g.arc(84, 30, 7, 0, 7); g.fill();
});
const flashTex = () => ctex("nva_flash", 128, 128, (g) => {
  g.clearRect(0, 0, 128, 128); const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, "rgba(255,255,255,1)"); rg.addColorStop(0.3, "rgba(255,255,230,0.7)"); rg.addColorStop(1, "rgba(255,255,230,0)");
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#fff"; g.lineWidth = 7; g.lineCap = "round";
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 24, 64 + Math.sin(a) * 24); g.lineTo(64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60); g.stroke(); }
});
const puffTex = () => ctex("nva_puff", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.fillStyle = "#fbfbfd"; g.strokeStyle = INKC; g.lineWidth = 9;
  const cs: [number, number, number][] = [[128, 150, 62], [78, 138, 44], [180, 138, 46], [100, 100, 44], [156, 98, 46], [128, 80, 40]];
  for (const [x, y, rad] of cs) { g.beginPath(); g.arc(x, y, rad, 0, 7); g.stroke(); }
  for (const [x, y, rad] of cs) { g.beginPath(); g.arc(x, y, rad - 2, 0, 7); g.fill(); }
  g.fillStyle = "#ffd23a"; for (const [x, y] of [[56, 70], [200, 74], [128, 30]]) { g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, rad = k % 2 ? 7 : 16; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } g.closePath(); g.fill(); g.strokeStyle = INKC; g.lineWidth = 3; g.stroke(); }
});
const dropTex = () => ctex("nva_drop", 128, 192, (g) => {
  g.clearRect(0, 0, 128, 192); g.fillStyle = "#6cc7f5"; g.strokeStyle = INKC; g.lineWidth = 9;
  g.beginPath(); g.moveTo(64, 14); g.bezierCurveTo(70, 60, 112, 90, 108, 126); g.bezierCurveTo(104, 168, 24, 168, 20, 126); g.bezierCurveTo(16, 90, 58, 60, 64, 14); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.ellipse(46, 124, 8, 18, 0.3, 0, 7); g.fill();
});
const billTex = () => ctex("nva_bill", 256, 128, (g) => {
  g.fillStyle = "#7fcf86"; g.strokeStyle = INKC; g.lineWidth = 8; rr(g, 6, 6, 244, 116, 12); g.fill(); g.stroke();
  g.strokeStyle = "#2f7a3c"; g.lineWidth = 4; rr(g, 22, 22, 212, 84, 8); g.stroke();
  g.fillStyle = "#2f7a3c"; g.beginPath(); g.arc(128, 64, 34, 0, 7); g.fill(); txt(g, "$", 128, 66, "bold 56px sans-serif", "#d4f5d6");
});
const gulpTex = (key: string, s: string, col: string) => ctex(key, 384, 192, (g) => {
  g.clearRect(0, 0, 384, 192); g.fillStyle = "#fffdf2"; g.strokeStyle = INKC; g.lineWidth = 9;
  g.beginPath(); g.ellipse(192, 84, 170, 66, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(130, 140); g.lineTo(96, 184); g.lineTo(176, 146); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(132, 138); g.lineTo(168, 144); g.fillStyle = "#fffdf2"; g.fill();
  txt(g, s, 192, 86, "bold 82px sans-serif", col);
});

// ---------------------------------------------------------------- 1. the booth (hub)
export type BoothHandles = {
  root: THREE.Group; plaque: THREE.Group; tablePhone: THREE.Group; selfiePhone: THREE.Group; napkin: THREE.Group; stick: THREE.Mesh; coffee: THREE.Group;
  buzz: (t: number, slide: number, amp?: number) => void; setScreen: (t: THREE.Texture) => void; x: number;
};
export const buildBooth = (c: SetCtx, x: number): BoothHandles => {
  const { R } = c;
  const k = kit(c, x), { bx, cy, sp, qd, pl, mesh } = k;
  const root = new THREE.Group(); root.position.set(x, 0, 0); R.add(root);
  const H = 3.4, XL = -4.5, XR = 4.5, ZB = -2.3, ZF = 6.5;
  const floorM = Lm("floor", "#ffffff", floorTex), wallM = Lm("bwall", "#ffffff", boothWall), vinylM = Lm("vinyl", "#ffffff", vinylTex), tableM = Lm("table", "#ffffff", tableTex);
  const chromeM = Lm("chrome", "#c9d1da"), tealM = Lm("teal", "#2c9a98"), ceilM = Lm("bceil", "#efe6d2"), darkM = Lm("dark", "#3a2a2e"), woodM = Lm("bwood", "#6b4630"), redM = Lm("bred", "#b8302c");
  // shell
  qd(floorM, [XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], 9 / 0.6, 8.8 / 0.6);
  qd(wallM, [XL, 0, ZB], [XR, 0, ZB], [XR, H, ZB], [XL, H, ZB], 4.5, 1);
  qd(wallM, [XL, 0, ZF], [XL, 0, ZB], [XL, H, ZB], [XL, H, ZF], 4.4, 1);
  qd(wallM, [XR, 0, ZB], [XR, 0, ZF], [XR, H, ZF], [XR, H, ZB], 4.4, 1);
  qd(wallM, [XR, 0, ZF], [XL, 0, ZF], [XL, H, ZF], [XR, H, ZF], 4.5, 1);
  qd(ceilM, [XL, H, ZB], [XR, H, ZB], [XR, H, ZF], [XL, H, ZF], 6, 6);
  // booth: back bench (seat + tufted backrest), two partitions, chrome rails
  bx(vinylM, -1.2, 0.0, -1.78, 1.2, 0.2, -0.92, 0.4); bx(vinylM, -1.2, 0.2, -1.78, 1.2, 0.46, -0.92, 0.4);
  bx(vinylM, -1.2, 0.46, -1.88, 1.2, 1.5, -1.74, 0.4);
  bx(chromeM, -1.22, 1.5, -1.9, 1.22, 1.55, -1.72);
  for (const s of [-1, 1]) {
    bx(vinylM, s > 0 ? 1.2 : -1.34, 0, -1.9, s > 0 ? 1.34 : -1.2, 1.15, 1.0, 0.4);
    bx(chromeM, s > 0 ? 1.18 : -1.36, 1.15, -1.92, s > 0 ? 1.36 : -1.18, 1.2, 1.02);
    bx(chromeM, s > 0 ? 1.18 : -1.36, 0, 0.98, s > 0 ? 1.36 : -1.18, 0.05, 1.02);
  }
  bx(tealM, -1.2, 0, -0.93, 1.2, 0.07, -0.9); // kick strip
  // table: pedestal, chrome edge, laminate top
  cy(chromeM, 0, -0.55, 0, 0.04, 0.34, 0.34); cy(chromeM, 0, -0.55, 0.04, 0.68, 0.06, 0.06);
  bx(chromeM, -0.93, 0.665, -1.03, 0.93, 0.715, -0.07); bx(tableM, -0.9, 0.715, -1.0, 0.9, 0.725, -0.1);
  // ketchup decals on the booth itself
  pl(ketchupDecal(), 0.5, 0.25, -0.62, 0.98, -1.735, { tr: true });
  pl(ketchupDecal(), 0.36, 0.18, 0.78, 1.22, -1.735, { tr: true, rz: 0.2 });
  pl(ketchupDecal(), 0.4, 0.2, 0.92, 0.462, -1.35, { tr: true, rx: -Math.PI / 2, rz: 0.4 });
  // wall dressing (back wall): sign, window + neon, clock, calendar, kitchen doors, menu board, framed plaque spot
  pl(c.signTex("nva_dennys", 1024, 300, "#f6e8b8", "#b3262b", "DENNY'S", "bold 190px sans-serif"), 1.9, 0.56, 0, 2.85, ZB + 0.03);
  bx(Lm("wfrm", "#f2e4bf"), -3.42, 1.03, ZB, -1.58, 2.67, ZB + 0.05); pl(nightWindow(), 1.7, 1.52, -2.5, 1.85, ZB + 0.06);
  bx(Lm("wfrm2", "#f2e4bf"), -2.55, 1.1, ZB + 0.055, -2.45, 2.6, ZB + 0.075);
  pl(neonOpen(), 1.2, 0.375, -2.5, 2.22, ZB + 0.2, { noink: true, hdr: 1.9, tr: true });
  c.lamp(x - 2.5, 2.2, ZB + 0.35, 1.5, 0, [1.0, 0.18, 0.32]);
  bx(Lm("valance", "#b8302c"), -3.48, 2.66, ZB, -1.52, 2.9, ZB + 0.14);
  pl(clockTex(), 0.46, 0.46, 0.95, 2.2, ZB + 0.03);
  pl(calendarTex("nva_cal93", "1993"), 0.62, 0.83, -0.85, 2.05, ZB + 0.03);
  pl(c.signTex("nva_nosmoke", 512, 200, "#fff1c6", "#b3262b", "SEAT YOURSELF", "bold 70px sans-serif"), 0.6, 0.23, 1.0, 1.7, ZB + 0.03);
  // kitchen swing doors (the portal target): two leaves, portholes, push plates
  bx(woodM, 2.15, 0, ZB, 3.45, 1.95, ZB + 0.04);
  for (const lx of [2.2, 2.8]) { pl(doorTex(), 0.58, 1.78, lx + 0.28, 0.9, ZB + 0.08); pl(portTex(), 0.3, 0.3, lx + 0.28, 1.35, ZB + 0.09, { noink: true, hdr: 1.5 }); }
  pl(c.signTex("nva_kitchen", 768, 200, "#2b2b30", "#ffe27a", "KITCHEN", "bold 120px sans-serif"), 1.2, 0.3, 2.8, 2.12, ZB + 0.04);
  pl(c.signTex("nva_staff", 768, 130, "#fff1c6", "#b3262b", "STAFF ONLY", "bold 80px sans-serif"), 0.9, 0.15, 2.8, 2.38, ZB + 0.04);
  c.lamp(x + 2.8, 1.4, ZB + 0.4, 1.4, 0, [1.0, 0.8, 0.4]);
  pl(menuBoard(), 0.8, 1.06, 3.95, 1.55, ZB + 0.03);
  // wet floor sign nobody mentions
  const wet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.05), toon("#f2c81f")); wet.position.set(x + 3.7, 0.27, -1.6); wet.rotation.y = 0.5; R.add(wet);
  pl(c.signTex("nva_wet", 256, 340, "#f2c81f", "#1f1f26", "WET FLOOR", "bold 58px sans-serif"), 0.28, 0.42, 3.7, 0.27, -1.57, { ry: 0.5 });
  // plant by the window, coat rack by the right wall
  cy(toon("#c0643a"), -3.9, -1.6, 0, 0.4, 0.22, 0.28);
  for (let i = 0; i < 7; i++) sp(toon(i % 2 ? "#5f9a4a" : "#4f8a3f"), -3.9 + Math.cos(i * 0.9) * 0.2, 0.7 + i * 0.12, -1.6 + Math.sin(i * 0.9) * 0.14, 0.2, 1, 1.5, 0.7);
  // pendant lamps over the table + ceiling troffers
  for (const px of [-1.05, 0.6]) {
    cy(toon("#2b2b30"), px, -0.55, 2.4, H, 0.01, 0.01, 6);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.26, 20, 1, true), toon("#b8302c")); shade.position.set(x + px, 2.27, -0.55); R.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.7, 1.8) })); bulb.position.set(x + px, 2.15, -0.55); bulb.layers.set(NOINK); R.add(bulb);
    c.lamp(x + px, 2.13, -0.55, 0.45, 0.72, [0.7, 0.42, 0.18]);
  }
  for (const tz of [-0.5, 3.4]) { const tr = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.7, 1.4) })); tr.rotation.x = Math.PI / 2; tr.position.set(x, H - 0.02, tz); tr.layers.set(NOINK); R.add(tr); }
  c.wash(x, 1.9, ZB + 0.05, 7, 3.2, 0, 0.42);
  // ---- table clutter (props are ~1.4x real size so they sit right next to the big cartoon heads); the middle of the table stays clear for the napkin
  const chromeT = toon("#c9d1da");
  cy(chromeT, 0.62, -0.88, 0.725, 0.97, 0.05, 0.05, 10); // napkin dispenser
  bx(chromeM, 0.5, 0.725, -0.95, 0.74, 0.95, -0.82);
  pl(c.penguinSticker(), 0.08, 0.08, 0.62, 0.84, -0.815); // the quiet penguin: sticker on the napkin dispenser
  cy(toon("#c8201c"), -0.78, -0.86, 0.725, 0.9, 0.05, 0.05, 12); cy(toon("#c8201c"), -0.78, -0.86, 0.9, 0.97, 0.05, 0.02, 12); cy(toon("#f4f1ea"), -0.78, -0.86, 0.97, 1.0, 0.03, 0.03, 10); // ketchup bottle
  cy(toon("#f2c81f"), -0.64, -0.88, 0.725, 0.88, 0.04, 0.04, 12); cy(toon("#f4f1ea"), -0.64, -0.88, 0.88, 0.9, 0.025, 0.025, 8); // mustard
  cy(toon("#f4f1ea"), 0.8, -0.3, 0.725, 0.8, 0.07, 0.07, 14); bx(chromeM, 0.74, 0.8, -0.35, 0.86, 0.83, -0.25); // sugar caddy
  for (let i = 0; i < 4; i++) cy(toon(["#f4f1ea", "#e8c04a", "#f4f1ea", "#e8c04a"][i]), 0.2 + i * 0.045, -0.9, 0.725, 0.77, 0.03, 0.03, 8); // creamers
  cy(toon("#f4f1ea"), -0.72, -0.5, 0.725, 0.735, 0.2, 0.2, 20); cy(toon("#e5b25a"), -0.72, -0.5, 0.735, 0.77, 0.15, 0.15, 18); cy(toon("#c7822c"), -0.72, -0.5, 0.77, 0.79, 0.12, 0.12, 14); cy(toon("#f9e27a"), -0.72, -0.5, 0.79, 0.81, 0.04, 0.04, 8); // pancake plate
  cy(toon("#f4f1ea"), 0.64, -0.6, 0.725, 0.735, 0.2, 0.2, 20); sp(toon("#fff1b8"), 0.6, 0.76, -0.6, 0.07, 1.2, 0.4, 1); sp(toon("#f4f1ea"), 0.7, 0.76, -0.58, 0.06, 1, 0.5, 1); // egg plate
  // napkin (flat, doodle) + stick figure overlay (revealed at 6.6 s)
  const napkin = new THREE.Group(); napkin.position.set(-0.12, 0.727, -0.5); napkin.rotation.y = 0.1; root.add(napkin);
  pl(napkinTex(), 0.64, 0.64, 0, 0, 0, { parent: napkin, rx: -Math.PI / 2, hdr: 1.12 });
  const stick = pl(stickTex(), 0.64, 0.64, 0, 0.004, 0, { parent: napkin, rx: -Math.PI / 2, tr: true, order: 3, hdr: 1.05 }); stick.visible = false;
  // the hero coffee mug with steam
  const coffee = new THREE.Group(); coffee.position.set(0.36, 0.725, -0.36); root.add(coffee);
  const mug = (px: number, pz: number, col: string) => {
    const g = new THREE.Group(); g.position.set(px, 0, pz);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.15, 20), toon(col)); body.position.y = 0.075; g.add(body);
    const hdl = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 14), toon(col)); hdl.position.set(0.105, 0.078, 0); g.add(hdl);
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.074, 20), toon("#4a2c18")); top.rotation.x = -Math.PI / 2; top.position.y = 0.146; g.add(top); return g;
  };
  coffee.add(mug(0, 0, "#f6f1e6"));
  const m3 = mug(0.5, 0.0, "#e8c04a"); m3.position.set(0.36, 0, 0.18); coffee.add(m3); // a second mug lives with the group so it moves with the hub
  const puffs: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat(c, [0.95, 0.95, 1.0], 0.8)); p.layers.set(NOINK); p.renderOrder = 6; coffee.add(p); puffs.push(p); }
  // phone on the table (2023+, hidden here), selfie phone, brass plaque (hidden here)
  const tablePhone = new THREE.Group(); tablePhone.position.set(0.62, 0.737, -0.5); tablePhone.visible = false; root.add(tablePhone);
  const pbody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.016, 0.25), toon("#1c1d24")); tablePhone.add(pbody);
  const pscr = new THREE.Mesh(new THREE.PlaneGeometry(0.108, 0.232), new THREE.MeshBasicMaterial({ map: phoneScreen(), color: new THREE.Color(1.3, 1.3, 1.3) })); pscr.rotation.x = -Math.PI / 2; pscr.position.y = 0.0085; pscr.layers.set(NOINK); tablePhone.add(pscr);
  const selfiePhone = new THREE.Group(); selfiePhone.visible = false; root.add(selfiePhone);
  const sbody = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.34, 0.025), toon("#23252d")); selfiePhone.add(sbody);
  const sback = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.32), new THREE.MeshBasicMaterial({ map: phoneBack() })); sback.position.z = 0.014; selfiePhone.add(sback);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: flashTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: new THREE.Color(1.6, 1.6, 1.4) }));
  flash.position.set(-0.04, 0.1, 0.06); flash.layers.set(NOINK); flash.visible = false; selfiePhone.add(flash); selfiePhone.userData.flash = flash;
  const plaque = new THREE.Group(); plaque.position.set(0, 1.78, ZB + 0.03); plaque.visible = false; root.add(plaque);
  pl(plaqueTex(), 0.84, 0.42, 0, 0, 0.01, { parent: plaque });
  const lampBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.07), toon("#c79a3a")); lampBar.position.set(0, 0.34, 0.06); plaque.add(lampBar);
  const lampGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), glowMat(c, [1.0, 0.82, 0.45], 0.55)); lampGlow.position.set(0, 0.0, 0.05); lampGlow.layers.set(NOINK); plaque.add(lampGlow);
  void mesh; void sp; void darkM; void redM;

  c.onFrame((f, set) => {
    const t = f / FPS;
    puffs.forEach((p, i) => {
      const u = (t * 0.55 + i / puffs.length) % 1, wob = Math.sin(t * 2.3 + i * 1.7) * 0.04 * u;
      p.position.set(0.0 + wob + u * 0.03, 0.2 + u * 0.42, 0.02); p.scale.setScalar(0.07 + u * 0.2); (p.material as THREE.MeshBasicMaterial).opacity = 0.7 * Math.sin(Math.PI * Math.min(1, u * 1.05)) ** 0.7;
    });
    if (set === "a_booth") { const u = ss(6.6, 6.95, t); stick.visible = u > 0; stick.scale.setScalar(0.6 + 0.4 * u + 0.12 * Math.sin(Math.PI * u)); } else stick.visible = false;
  });
  const phoneRest = new THREE.Vector3(0.62, 0.737, -0.5);
  const buzz = (t: number, slide: number, amp = 1) => {
    tablePhone.position.set(phoneRest.x - slide * 0.62 + Math.sin(t * 95) * 0.004 * amp, phoneRest.y, phoneRest.z + slide * 0.22 + Math.cos(t * 83) * 0.003 * amp);
    tablePhone.rotation.y = Math.sin(t * 70) * 0.03 * amp + slide * 0.5;
  };
  const setScreen = (tx: THREE.Texture) => { (pscr.material as THREE.MeshBasicMaterial).map = tx; (pscr.material as THREE.MeshBasicMaterial).needsUpdate = true; };
  return { root, plaque, tablePhone, selfiePhone, napkin, stick, coffee, buzz, setScreen, x };
};

// ---------------------------------------------------------------- 2. kitchen dish pit
const tileTex = () => ctex("nva_ktile", 256, 256, (g, r) => {
  g.fillStyle = "#f2f1ea"; g.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = (i + j) % 2 ? "#ecebe2" : "#f6f5ee"; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
  g.strokeStyle = "#a5a898"; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
  for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(150,130,60,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 24, 4 + r() * 10, 0, 0, 7); g.fill(); }
});
const quarryTex = () => ctex("nva_quarry", 256, 256, (g, r) => {
  g.fillStyle = "#6a3a2a"; g.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = ["#9a5238", "#8a4630", "#a65c3e", "#93503a"][(i * 3 + j) % 4]; g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(40,25,20,${0.08 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 5 + r() * 20, 3 + r() * 8, r(), 0, 7); g.fill(); }
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(150,200,230,0.28)"; g.beginPath(); g.ellipse(r() * 256, r() * 256, 18 + r() * 24, 8 + r() * 10, 0, 0, 7); g.fill(); } // puddles
});
const ticketsTex = () => ctex("nva_tickets", 768, 256, (g, r) => {
  g.clearRect(0, 0, 768, 256); g.fillStyle = "#9aa3ad"; g.fillRect(0, 20, 768, 14);
  const lines = ["EGGS", "EGGS", "EGGS x2", "EGGS??", "EGGS"];
  lines.forEach((s, i) => {
    const x = 20 + i * 148; g.save(); g.translate(x + 60, 140); g.rotate((r() - 0.5) * 0.14); g.fillStyle = i % 2 ? "#fffbe8" : "#fff4b8"; g.strokeStyle = "#8b8678"; g.lineWidth = 4; g.fillRect(-60, -110, 120, 220); g.strokeRect(-60, -110, 120, 220);
    txt(g, s, 0, -70, "bold 32px sans-serif", "#b3262b"); g.strokeStyle = "#6b6a72"; g.lineWidth = 4; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-42, -20 + k * 34); g.lineTo(-42 + 40 + r() * 40, -20 + k * 34); g.stroke(); } g.restore();
  });
});
const signHands = () => ctex("nva_washhands", 512, 256, (g) => {
  g.fillStyle = "#2f7fc1"; rr(g, 4, 4, 504, 248, 22); g.fill(); g.strokeStyle = INKC; g.lineWidth = 9; g.stroke();
  txt(g, "WASH HANDS", 256, 96, "bold 92px sans-serif", "#fff"); txt(g, "(NOT PLATES. HANDS.)", 256, 190, "bold 40px sans-serif", "#ffe27a");
});
const plateGeos = (n: number, r: number) => {
  const w: THREE.BufferGeometry[] = [], bl: THREE.BufferGeometry[] = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.CylinderGeometry(r, r * 0.8, 0.026, 14).toNonIndexed(); g.translate(0, i * 0.026 + 0.013, 0);
    (i % 7 === 0 ? bl : w).push(g);
  }
  return { white: mergeGeometries(w.map((g) => { g.deleteAttribute("uv"); return g; }), false), blue: bl.length ? mergeGeometries(bl.map((g) => { g.deleteAttribute("uv"); return g; }), false) : null };
};
export const KITCHEN = { towerR: null as THREE.Group | null, towerL: null as THREE.Group | null };

const buildKitchen = (c: SetCtx) => {
  const ox = A_KITCHEN, k = kit(c, ox), { bx, cy, sp, qd, pl, mesh } = k, { R } = c;
  const H = 3.2, XL = -3.4, XR = 3.4, ZB = -3.0, ZF = 5.0;
  const tile = Lm("ktile", "#ffffff", tileTex), floor = Lm("quarry", "#ffffff", quarryTex), steel = Lm("ksteel", "#aeb6c0"), steelD = Lm("ksteelD", "#7c8591"), ceil = Lm("kceil", "#e6e2d4");
  const greenS = Lm("kgreen", "#3c9a62");
  qd(floor, [XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], 6.8 / 0.5, 8 / 0.5);
  qd(tile, [XL, 0, ZB], [XR, 0, ZB], [XR, H, ZB], [XL, H, ZB], 6.8 / 0.5, H / 0.5);
  qd(tile, [XL, 0, ZF], [XL, 0, ZB], [XL, H, ZB], [XL, H, ZF], 8 / 0.5, H / 0.5);
  qd(tile, [XR, 0, ZB], [XR, 0, ZF], [XR, H, ZF], [XR, H, ZB], 8 / 0.5, H / 0.5);
  qd(ceil, [XL, H, ZB], [XR, H, ZB], [XR, H, ZF], [XL, H, ZF], 4, 4);
  bx(greenS, XL, 1.28, ZB + 0.001, XR, 1.4, ZB + 0.02); // green tile stripe
  // sinks along the back wall
  bx(steel, -2.6, 0, ZB, 0.5, 0.88, ZB + 0.95); bx(steelD, -2.6, 0.88, ZB, 0.5, 0.94, ZB + 0.95);
  for (const [a, b2] of [[-2.5, -1.5], [-1.38, -0.38], [-0.26, 0.4]]) { bx(Lm("kwater", "#6e9ab0"), a, 0.935, ZB + 0.08, b2, 0.955, ZB + 0.85); }
  for (let i = 0; i < 16; i++) sp(toon("#ffffff"), -2.4 + ((i * 0.37) % 2.7), 0.98 + (i % 3) * 0.04, ZB + 0.25 + ((i * 0.31) % 0.5), 0.1 + (i % 4) * 0.02, 1, 0.8, 1); // suds
  cy(Lm("kchrome", "#d5dce4"), -1.0, ZB + 0.12, 0.94, 1.55, 0.035, 0.035, 10);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 10), Lm("kchrome", "#d5dce4"), -1.0, 1.55, ZB + 0.33, Math.PI / 2, 0, 0);
  // dish machine (right)
  bx(steel, 1.0, 0, ZB, 2.8, 1.25, ZB + 1.4); bx(steelD, 1.0, 1.25, ZB, 2.8, 1.35, ZB + 1.4); bx(steel, 1.15, 1.35, ZB, 2.65, 2.3, ZB + 1.0);
  bx(Lm("kdoor", "#8d96a2"), 1.12, 0.3, ZB + 1.4, 2.68, 1.15, ZB + 1.44);
  pl(c.signTex("nva_hot", 512, 200, "#e23a2e", "#fff6d8", "HOT!", "bold 130px sans-serif"), 0.5, 0.2, 1.4, 1.0, ZB + 1.46);
  pl(c.signTex("nva_hotter", 512, 200, "#1f1f26", "#ffe27a", "STILL HOT", "bold 80px sans-serif"), 0.5, 0.2, 2.3, 1.0, ZB + 1.46);
  cy(steelD, 1.9, ZB + 0.5, 2.3, H, 0.14, 0.14, 12);
  // hanging pot rack + shelves + wall dressing
  bx(Lm("krack", "#4a505c"), -2.8, 2.15, ZB + 0.02, 0.6, 2.2, ZB + 0.12);
  const iron = twoTone(new THREE.MeshLambertMaterial({ color: "#3b3f4a", side: THREE.DoubleSide }));
  for (let i = 0; i < 5; i++) {
    const px = -2.5 + i * 0.62;
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.05, 16), iron); pan.rotation.x = Math.PI / 2; pan.position.set(ox + px, 1.88, ZB + 0.12); R.add(pan);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.03), iron); hd.position.set(ox + px, 2.09, ZB + 0.12); hd.rotation.z = Math.PI / 2 - 0.05; R.add(hd);
  }
  for (let i = 0; i < 3; i++) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.24, 14), toon(["#8d96a2", "#b5bcc6", "#8d96a2"][i])); pot.position.set(ox - 2.6 + i * 0.5, 2.72, ZB + 0.2); R.add(pot); }
  bx(steelD, -2.9, 2.55, ZB, 0.7, 2.6, ZB + 0.4);
  pl(signHands(), 0.82, 0.41, -2.0, 2.95 - 0.28, ZB + 0.03);
  pl(clockTex(), 0.4, 0.4, -0.4, 2.55, ZB + 0.03);
  pl(ticketsTex(), 1.7, 0.57, 2.1, 2.02 + 0.2, ZB + 0.04, { tr: true });
  // the egg that has been sliding down the tile wall since lunch
  const egg = pl(eggTex(), 0.34, 0.34, 0.95, 2.55, ZB + 0.035, { tr: true });
  // plate towers (the drowning): left tower (1.7 m), right tower (2.1 m, leans), cart of low stacks
  const whiteM = toon("#f6f4ec"), blueM = toon("#5b8fd1");
  const mkTower = (n: number, r: number, px: number, pz: number) => {
    const gp = new THREE.Group(); gp.position.set(ox + px, 0, pz); R.add(gp);
    const { white, blue } = plateGeos(n, r);
    gp.add(new THREE.Mesh(white, whiteM)); if (blue) gp.add(new THREE.Mesh(blue, blueM));
    return gp;
  };
  const towerL = mkTower(64, 0.2, -0.95, -1.15); towerL.position.y = 0.0;
  const towerR = mkTower(78, 0.21, 0.5, -1.0);
  KITCHEN.towerL = towerL; KITCHEN.towerR = towerR;
  // plinths under the towers + the cart
  bx(steelD, -0.9, 0.68, -1.35, 0.5, 0.74, -0.75); bx(Lm("kcartleg", "#59606b"), -0.88, 0, -1.33, -0.82, 0.68, -1.27); bx(Lm("kcartleg", "#59606b"), 0.42, 0, -1.33, 0.48, 0.68, -1.27);
  bx(Lm("kcartleg", "#59606b"), -0.88, 0, -0.83, -0.82, 0.68, -0.77); bx(Lm("kcartleg", "#59606b"), 0.42, 0, -0.83, 0.48, 0.68, -0.77);
  const addStack = (n: number, r: number, px: number, py: number, pz: number) => {
    const { white, blue } = plateGeos(n, r); const m = new THREE.Matrix4().makeTranslation(ox + px, py, pz);
    c.b.add(white, whiteM, m); if (blue) c.b.add(blue, blueM, m);
  };
  addStack(18, 0.19, -0.66, 0.74, -1.05); addStack(26, 0.2, -0.22, 0.74, -0.95); addStack(15, 0.18, 0.16, 0.74, -1.05); addStack(10, 0.19, -0.42, 0.74, -0.78); addStack(8, 0.19, -0.02, 0.74, -0.78);
  addStack(26, 0.2, -1.5, 0.0, -0.45); addStack(18, 0.19, 1.2, 0.0, -0.2); addStack(32, 0.2, -2.2, 0.0, -1.7); addStack(14, 0.2, -0.9, 0.0, -0.15); addStack(20, 0.2, 0.2, 0.0, -0.2); addStack(9, 0.2, -0.35, 0.0, -0.1); // floor stacks
  bx(Lm("krack2", "#3c6fb0"), 1.05, 0, -0.6, 1.9, 0.14, 0.1); bx(Lm("krack2", "#3c6fb0"), 1.05, 0.14, -0.6, 1.9, 0.28, 0.1); // bus tubs
  for (let i = 0; i < 4; i++) addStack(10 + i, 0.17, 1.2 + i * 0.2, 0.28, -0.25);
  // colour + clutter: mop bucket, extinguisher, yellow towels, bowls, order bell, warm heat lamps
  bx(Lm("kbucket", "#f2c81f"), -3.1, 0, -0.2, -2.55, 0.5, 0.4); mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6), toon("#8a6a40"), -2.9, 0.95, 0.1, 0, 0, 0.12);
  cy(Lm("kext", "#d12b2b"), 3.15, -2.6, 0, 0.7, 0.1, 0.1, 12); cy(toon("#2b2b30"), 3.15, -2.6, 0.7, 0.78, 0.03, 0.03, 8);
  pl(c.signTex("nva_fire", 256, 160, "#fff1c6", "#d12b2b", "FIRE", "bold 80px sans-serif"), 0.26, 0.16, 3.15, 1.0, -2.95);
  for (let i = 0; i < 4; i++) bx(Lm("kowel" + (i % 2), i % 2 ? "#f2c81f" : "#e8453c"), -2.9 + i * 0.12, 1.55, ZB + 0.02, -2.8 + i * 0.12, 1.95, ZB + 0.06);
  for (let i = 0; i < 4; i++) cy(toon(["#e8453c", "#3b82c4", "#f2d23a", "#5ab07a"][i]), 1.2 + i * 0.3, ZB + 0.2, 2.6, 2.72, 0.13, 0.1, 12); // stacked colour bowls
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon("#d6a53a")); bell.position.set(ox + 2.7, 1.4, ZB + 0.3); R.add(bell);
  for (const lx of [1.4, 2.2]) { c.lamp(ox + lx, 1.95, ZB + 0.4, 0.6, 0, [1.0, 0.55, 0.2]); }
  // lamp, fluorescent strips, steam from the machine, flying plates
  for (const lx of [-1.0, 1.2]) { const tr = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 2.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.9, 1.7) })); tr.rotation.x = Math.PI / 2; tr.position.set(ox + lx, H - 0.02, -0.5); tr.layers.set(NOINK); R.add(tr); c.lamp(ox + lx, H - 0.1, -0.5, 2.2, 0, [0.7, 0.9, 0.8]); }
  c.wash(ox, 1.7, ZB + 0.04, 7, 3.2, 0, 0.3);
  const steam: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat(c, [0.9, 0.95, 1.0], 0.8)); p.layers.set(NOINK); p.renderOrder = 6; R.add(p); steam.push(p); }
  const fly: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) { const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.03, 14), i % 3 ? whiteM : blueM); R.add(pm); fly.push(pm); pm.visible = false; }
  park(ox, ...steam, ...fly);
  c.onFrame((f, set) => {
    if (set !== "a_kitchen") return;
    const t = f / FPS;
    // sliding egg (0.03 m/s) and the wobbling towers
    egg.position.y = 2.55 - 0.03 * (t - 8.3);
    const wob = (amp: number, ph: number) => amp * Math.sin(t * 6.1 + ph);
    towerL.rotation.z = wob(0.012, 0) + 0.02 * ss(8.6, 10.3, t);
    const fall = ss(9.82, 10.5, t); // the right tower finally goes at "dishes"
    towerR.rotation.z = -0.045 + wob(0.014, 1.3) - 0.9 * fall * fall;
    towerR.position.y = -0.0 - 0.0 * fall;
    steam.forEach((p, i) => { const u = (t * 0.5 + i / steam.length) % 1; p.position.set(ox + 1.0 + u * 0.8, 1.2 + u * 1.5, ZB + 1.55); p.scale.setScalar(0.3 + u * 0.9); (p.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - u) * Math.min(1, u * 6); });
    fly.forEach((pm, i) => {
      const t0 = 9.84 + i * 0.045, u = t - t0; pm.visible = u > 0 && u < 1.1;
      if (!pm.visible) return;
      const vx = 1.2 + (i % 4) * 0.45, vy = 1.8 + (i % 3) * 0.5; pm.position.set(ox + 0.5 + vx * u * 0.9 - 0.4 * (i % 2), 2.0 + vy * u - 5.0 * u * u, -1.0 + (i % 3 - 1) * 0.3 + u * 0.9); pm.rotation.set(u * 9, u * 5, u * (6 + i));
    });
  });
};

// ---------------------------------------------------------------- 3. NV1 launch stage
const bannerTex = () => ctex("nva_banner", 1024, 256, (g) => {
  g.fillStyle = "#f2d23a"; g.fillRect(0, 0, 1024, 256); g.strokeStyle = INKC; g.lineWidth = 14; g.strokeRect(7, 7, 1010, 242);
  txt(g, "NV1 LAUNCH PARTY", 512, 120, "bold 138px sans-serif", "#c22d2a", "center", INKC, 8);
  for (let i = 0; i < 12; i++) { g.fillStyle = ["#e8453c", "#3b82c4", "#5ab07a"][i % 3]; g.fillRect(40 + i * 82, 196, 30, 30); }
});
const chipTex = () => ctex("nva_chip", 512, 512, (g) => {
  g.fillStyle = "#2c3340"; rr(g, 0, 0, 512, 512, 40); g.fill();
  g.fillStyle = "#1c212b"; rr(g, 40, 40, 432, 432, 24); g.fill(); g.strokeStyle = "#e8b83a"; g.lineWidth = 8; rr(g, 40, 40, 432, 432, 24); g.stroke();
  g.strokeStyle = "rgba(232,184,58,0.5)"; g.lineWidth = 5; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(80 + i * 58, 80); g.lineTo(80 + i * 58, 120); g.moveTo(80 + i * 58, 392); g.lineTo(80 + i * 58, 432); g.stroke(); }
  txt(g, "NV1", 256, 262, "bold 190px sans-serif", "#f5d667", "center", "#7a5a12", 6);
  g.fillStyle = "#e8b83a"; g.font = "bold 28px sans-serif"; g.textAlign = "center"; g.fillText("1995", 256, 392);
});
const curtainTex = () => ctex("nva_curtain", 256, 256, (g) => {
  for (let i = 0; i < 8; i++) { const gr = g.createLinearGradient(i * 32, 0, i * 32 + 32, 0); gr.addColorStop(0, "#6e1020"); gr.addColorStop(0.5, "#c0283c"); gr.addColorStop(1, "#6e1020"); g.fillStyle = gr; g.fillRect(i * 32, 0, 32, 256); }
});
const popTex = () => ctex("nva_pfft", 512, 256, (g) => {
  g.clearRect(0, 0, 512, 256); g.fillStyle = "#fffdf0"; g.strokeStyle = INKC; g.lineWidth = 12; g.beginPath();
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, rad = i % 2 ? 100 : 124; g.lineTo(256 + Math.cos(a) * rad * 1.8, 128 + Math.sin(a) * rad * 0.9); }
  g.closePath(); g.fill(); g.stroke(); txt(g, "pfft...", 256, 130, "bold 120px sans-serif", "#c22d2a", "center", INKC, 7);
});
const popperTex = () => ctex("nva_popper", 128, 256, (g) => {
  g.fillStyle = "#e8453c"; g.strokeStyle = INKC; g.lineWidth = 8; g.beginPath(); g.moveTo(64, 20); g.lineTo(112, 236); g.lineTo(16, 236); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#f2d23a"; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(64 + (i - 1.5) * 8, 50 + i * 46); g.lineTo(64 + (i - 1.5) * 8 + 22, 50 + i * 46 + 24); g.lineTo(64 + (i - 1.5) * 8 - 22, 50 + i * 46 + 24); g.closePath(); g.fill(); }
  g.beginPath(); g.moveTo(64, 20); g.lineTo(112, 236); g.lineTo(16, 236); g.closePath(); g.stroke();
});
export const STAGE = { chip: null as THREE.Group | null };
/** jensen at the stage is at x+1.05; popper tip (the hand: +0.34 m right, 1.43 m up) is the streamer origin */
export const STAGE_JENSEN = [A_STAGE - 1.0, 0, -1.15] as const;
export const STAGE_GUESTS = [[A_STAGE + 1.05, 0, -1.55], [A_STAGE + 1.7, 0, -1.95], [A_STAGE - 1.85, 0, -2.0]] as const;

const buildStage = (c: SetCtx) => {
  const ox = A_STAGE, k = kit(c, ox), { bx, cy, sp, qd, pl } = k, { R } = c;
  const H = 4.2, XL = -4.2, XR = 4.2, ZB = -3.2, ZF = 5.5;
  const dark = Lm("sdark", "#2a2236"), floor = Lm("sfloor", "#6b4a3a"), curt = Lm("scurt", "#ffffff", curtainTex), gold = Lm("sgold", "#e8b83a"), marble = Lm("smarble", "#f4f1ea");
  qd(floor, [XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], 4, 4);
  qd(dark, [XL, 0, ZB], [XR, 0, ZB], [XR, H, ZB], [XL, H, ZB]);
  qd(dark, [XL, 0, ZF], [XL, 0, ZB], [XL, H, ZB], [XL, H, ZF]); qd(dark, [XR, 0, ZB], [XR, 0, ZF], [XR, H, ZF], [XR, H, ZB]);
  qd(dark, [XL, H, ZB], [XR, H, ZB], [XR, H, ZF], [XL, H, ZF]);
  for (const s of [-1, 1]) { qd(curt, [s > 0 ? 1.7 : -3.7, 0, ZB + 0.12], [s > 0 ? 3.7 : -1.7, 0, ZB + 0.12], [s > 0 ? 3.7 : -1.7, H, ZB + 0.12], [s > 0 ? 1.7 : -3.7, H, ZB + 0.12], 2, 1); bx(gold, s > 0 ? 1.65 : -3.75, H - 0.2, ZB + 0.05, s > 0 ? 3.75 : -1.65, H, ZB + 0.2); }
  // backdrop panel with starburst
  const burst = ctex("nva_burst", 512, 512, (g) => {
    const gr = g.createRadialGradient(256, 300, 20, 256, 300, 360); gr.addColorStop(0, "#5a4aa8"); gr.addColorStop(1, "#1d1840"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.fillStyle = "rgba(255,230,140,0.10)"; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginPath(); g.moveTo(256, 300); g.arc(256, 300, 420, a, a + 0.14); g.closePath(); g.fill(); }
  });
  pl(burst, 3.2, 3.6, 0, 1.85, ZB + 0.08);
  // pedestal + display stand
  cy(gold, 0, -1.7, 0, 0.08, 0.5, 0.5, 24); cy(marble, 0, -1.7, 0.08, 0.96, 0.4, 0.34, 24); cy(gold, 0, -1.7, 0.96, 1.02, 0.44, 0.44, 24);
  bx(gold, -0.12, 1.02, -1.78, 0.12, 1.1, -1.62); // chip stand foot
  const chip = new THREE.Group(); chip.position.set(ox, 1.07, -1.62); R.add(chip); STAGE.chip = chip;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.07), toon("#2c3340")); slab.position.set(0, 0.31, 0); chip.add(slab);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshBasicMaterial({ map: chipTex(), color: new THREE.Color(1.2, 1.2, 1.2) })); face.position.set(0, 0.31, 0.038); chip.add(face);
  for (let i = 0; i < 7; i++) for (const s of [-1, 1]) {
    const pa = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.03), toon("#e8b83a")); pa.position.set(-0.27 + i * 0.09, 0.31 + s * 0.36, 0); chip.add(pa);
    const pb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.03), toon("#e8b83a")); pb.position.set(s * 0.36, 0.04 + i * 0.09, 0); chip.add(pb);
  }
  // spotlight cone + pool
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.6, 28, 1, true), new THREE.MeshBasicMaterial({ map: c.glowTex(), color: new THREE.Color(1.0, 0.9, 0.6), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  cone.position.set(ox, 2.55, -1.7); cone.layers.set(NOINK); R.add(cone);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), glowMat(c, [0.9, 0.7, 0.34], 0.6)); pool.rotation.x = -Math.PI / 2; pool.position.set(ox, 0.02, -1.6); pool.layers.set(NOINK); R.add(pool);
  // banner (droops on the right), streamers, confetti on the floor
  const banner = pl(bannerTex(), 3.4, 0.85, 0, 3.4, ZB + 0.3, { rz: -0.035 });
  for (let i = 0; i < 10; i++) { const cf = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.04), toon(["#e8453c", "#3b82c4", "#f2d23a", "#5ab07a"][i % 4])); cf.rotation.set(-Math.PI / 2, 0, i); cf.position.set(ox - 1.6 + (i * 0.37) % 3.2, 0.02, -0.6 + ((i * 0.53) % 1.4)); R.add(cf); }
  // little table with a "cake" and a sad drink; balloons tied to the pedestal base
  bx(Lm("stab", "#d9d2c0"), -3.3, 0, -1.9, -2.2, 0.8, -1.2); cy(toon("#f7c6d9"), -2.75, -1.55, 0.8, 1.05, 0.28, 0.28, 18); cy(toon("#ffffff"), -2.75, -1.55, 1.05, 1.1, 0.26, 0.26, 18);
  pl(c.signTex("nva_cake", 384, 150, "#f7c6d9", "#c22d2a", "CONGRATS", "bold 74px sans-serif"), 0.36, 0.14, -2.75, 0.92, -1.27);
  const balloons: THREE.Group[] = [];
  [["#e8453c", -0.4], ["#3b82c4", 0.1], ["#f2d23a", 0.5], ["#5ab07a", 0.9]].forEach(([col, px], i) => {
    const g = new THREE.Group(); g.position.set(ox + (px as number) - 0.5, 0, -2.2 + i * 0.05); R.add(g);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(col as string).multiplyScalar(1.15) })); bl.scale.set(1, 1.18, 1); bl.name = "bl"; g.add(bl);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), toon("#d9d2c0")); st.name = "st"; g.add(st); balloons.push(g);
  });
  // streamer: a chain of coloured strips (the limp one)
  const strip: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.07), new THREE.MeshBasicMaterial({ color: ["#e8453c", "#f2d23a", "#3b82c4"][i % 3], side: THREE.DoubleSide })); m.visible = false; R.add(m); strip.push(m); }
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), new THREE.MeshBasicMaterial({ map: popTex(), transparent: true, depthWrite: false })); pf.visible = false; pf.layers.set(NOINK); R.add(pf);
  const popper = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.34), new THREE.MeshBasicMaterial({ map: popperTex(), transparent: true, alphaTest: 0.05, side: THREE.DoubleSide })); R.add(popper);
  const bits: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.03), new THREE.MeshBasicMaterial({ color: ["#e8453c", "#f2d23a", "#3b82c4", "#5ab07a"][i % 4], side: THREE.DoubleSide })); m.visible = false; R.add(m); bits.push(m); }
  STAGE_GUESTS.forEach(([gx, , gz], i) => { // party hats on the guests' heads (their cards are posed by the shot at the same spots)
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 14), toon(["#e8453c", "#3b82c4", "#f2d23a"][i])); hat.position.set(gx + 0.02, 1.76, gz + 0.03); hat.rotation.z = -0.25 + i * 0.2; R.add(hat);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), toon("#ffffff")); pom.position.set(gx + 0.02 + Math.sin(-hat.rotation.z) * 0.15, 1.78 + 0.15, gz + 0.03); R.add(pom);
  });
  void banner; void sp;
  park(ox, ...strip, ...bits, pf, popper);
  const JX = STAGE_JENSEN[0], JY = 0, JZ = STAGE_JENSEN[2];
  c.onFrame((f, set) => {
    if (set !== "a_stage") return;
    const t = f / FPS, T0 = 11.95; // pfft on "chip."
    // the popper in Jensen's raised hand (wave 0.5 -> hand at +0.34, 1.43), pointed up-left toward the chip
    const hx = JX + 0.34, hy = JY + 1.43 + 0.02 * Math.sin(t * 9), hz = JZ + 0.06;
    popper.position.set(hx + 0.03, hy + 0.13, hz); popper.rotation.z = -0.32;
    const tipX = hx + 0.1, tipY = hy + 0.3;
    // streamer: shoots out, curls, goes limp
    const u = t - T0, L = u < 0 ? 0 : 0.95 * ss(0, 0.5, u);
    strip.forEach((m, i) => {
      const s = (i / strip.length) * L; m.visible = u > 0 && s > 0.001;
      const dirx = 0.55, diry = 0.8, droop = 2.1 * s * s * (0.6 + 0.8 * ss(0.2, 1.0, u));
      m.position.set(tipX + dirx * s * 1.3, tipY + diry * s * 0.9 - droop, hz + 0.03); m.rotation.z = Math.atan2(diry * 0.9 - 4.2 * s * (0.6 + 0.8 * ss(0.2, 1.0, u)), dirx * 1.3);
    });
    bits.forEach((m, i) => { const v = u - 0.0; m.visible = v > 0 && v < 1.2; if (!m.visible) return; const a = 1.6 + i * 0.35; m.position.set(tipX + Math.cos(a) * v * 0.5 * (1 + i % 3 * 0.4), tipY + Math.sin(a) * v * 0.6 - 1.6 * v * v, hz + 0.02); m.rotation.z = v * (4 + i); });
    const pu = ss(T0, T0 + 0.18, t) * (1 - ss(T0 + 1.15, T0 + 1.4, t)); pf.visible = pu > 0.01; pf.position.set(tipX + 0.55, tipY + 0.55, hz + 0.1); pf.scale.setScalar(0.4 + 0.7 * pu + 0.05 * Math.sin(t * 14));
    // the chip flops forward off the stand after "It flops": tips flat, then slides off the front edge and hangs limp
    const u1 = ss(12.3, 12.62, t), u2 = ss(12.62, 12.95, t);
    chip.rotation.x = 1.5 * u1 + 0.9 * u2; chip.position.set(ox, 1.07 - 0.5 * u2, -1.62 + 0.62 * u2);
    // balloons sag
    balloons.forEach((g, i) => {
      const sag = ss(12.3, 12.9, t) * (0.5 + i * 0.1), sw = 0.03 * Math.sin(t * 1.4 + i);
      const h = 1.55 - 0.85 * sag; const bl = g.getObjectByName("bl")!, st = g.getObjectByName("st")!;
      bl.position.set(sw, 1.12 + h * 0.6, 0); bl.scale.set(1 + 0.25 * sag, 1.18 - 0.52 * sag, 1 + 0.2 * sag);
      st.scale.y = h * 0.6; st.position.set(sw * 0.5, 0.55 * h * 0.6 + 0.4, 0);
    });
  });
};

// ---------------------------------------------------------------- shared character-adjacent props: a stick arm (like the engine's own arms: thin coloured stroke, ink outline, ink-dot hand)
export type StickArm = THREE.Group & { userData: { ink: THREE.Mesh; fill: THREE.Mesh; hand: THREE.Mesh } };
export const makeArm = (parent: THREE.Object3D, col: string): StickArm => {
  const g = new THREE.Group() as StickArm;
  const ink = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: INKC, side: THREE.DoubleSide }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
  const hand = new THREE.Mesh(new THREE.CircleGeometry(1, 14), new THREE.MeshBasicMaterial({ color: INKC, side: THREE.DoubleSide }));
  ink.position.z = 0; fill.position.z = 0.001; hand.position.z = 0.002; g.add(ink, fill, hand); g.userData = { ink, fill, hand }; parent.add(g); return g;
};
/** lay an arm from shoulder a to hand b in the plane z (positions are world, absolute) */
export const layArm = (g: StickArm, a: [number, number], b: [number, number], z: number, w = 0.036) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  g.position.set(a[0], a[1], z); g.rotation.set(0, 0, Math.atan2(dy, dx));
  const { ink, fill, hand } = g.userData; ink.scale.set(len, w + 0.014, 1); ink.position.x = len / 2; fill.scale.set(len, w, 1); fill.position.x = len / 2; hand.scale.setScalar(w * 0.95); hand.position.x = len;
};

// ---------------------------------------------------------------- 4. boardroom: contract signing + handshake
const contractTex = () => ctex("nva_contract", 512, 640, (g, r) => {
  g.fillStyle = "#fffdf6"; g.fillRect(0, 0, 512, 640); g.strokeStyle = "#cfc6ae"; g.lineWidth = 6; g.strokeRect(10, 10, 492, 620);
  txt(g, "CONTRACT", 256, 62, "bold 84px serif", INKC); g.fillStyle = "#b3262b"; g.fillRect(60, 104, 392, 9);
  txt(g, "CONSOLE CHIP DEAL", 256, 148, "bold 40px sans-serif", "#3c4a6b");
  txt(g, "X", 54, 222, "bold 64px sans-serif", INKC, "left"); g.strokeStyle = INKC; g.lineWidth = 6; g.beginPath(); g.moveTo(96, 236); g.lineTo(336, 236); g.stroke();
  g.fillStyle = "#f2c81f"; g.strokeStyle = INKC; g.lineWidth = 5; rr(g, 352, 190, 140, 66, 10); g.fill(); g.stroke(); txt(g, "SIGN HERE", 422, 224, "bold 27px sans-serif", "#b3262b");
  g.fillStyle = "#8c8678"; for (let y = 296; y < 540; y += 30) g.fillRect(60, y, 390 - r() * 90, 10);
  g.fillStyle = "#3d9a50"; g.beginPath(); g.arc(256, 584, 38, 0, 7); g.fill(); g.strokeStyle = INKC; g.lineWidth = 5; g.stroke(); txt(g, "$", 256, 587, "bold 56px sans-serif", "#e9ffe9");
});
const signatureTex = () => ctex("nva_signature", 256, 96, (g) => {
  g.clearRect(0, 0, 256, 96); g.strokeStyle = "#1f2a8a"; g.lineWidth = 7; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(10, 62);
  g.bezierCurveTo(30, 6, 54, 100, 76, 40); g.bezierCurveTo(90, 8, 100, 90, 124, 46); g.bezierCurveTo(140, 20, 154, 82, 176, 44); g.bezierCurveTo(196, 10, 212, 70, 246, 36); g.stroke();
});
const boardWall = () => ctex("nva_boardwall", 512, 870, (g, r) => {
  g.fillStyle = "#2f4a3c"; g.fillRect(0, 0, 512, 870);
  g.fillStyle = "#38564a"; for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 64, 870);
  g.fillStyle = "#5a3a26"; g.fillRect(0, 560, 512, 310); g.strokeStyle = "#3a2416"; g.lineWidth = 6;
  for (let x = 0; x <= 512; x += 128) { g.strokeRect(x + 12, 580, 104, 270); }
  g.fillStyle = "#8a5d3b"; g.fillRect(0, 548, 512, 16); g.fillStyle = "#e8c04a"; g.fillRect(0, 0, 512, 10);
  for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`; g.fillRect(r() * 512, r() * 540, 4, 30 + r() * 80); }
});
const carpetTex = (key: string, a: string, b2: string) => ctex(key, 128, 128, (g, r) => {
  g.fillStyle = a; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? b2 : "rgba(0,0,0,0.12)"; g.fillRect(r() * 128, r() * 128, 3, 3); }
});
const gameTv = () => ctex("nva_gametv", 256, 256, (g) => {
  g.fillStyle = "#12142a"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#4fd1a5"; g.fillRect(0, 190, 256, 66);
  g.fillStyle = "#fff"; for (let i = 0; i < 20; i++) g.fillRect((i * 83) % 256, (i * 47) % 170, 3, 3);
  g.fillStyle = "#f2d23a"; g.fillRect(60, 130, 36, 36); g.fillStyle = "#e8453c"; g.fillRect(150, 160, 44, 30); g.fillStyle = "#3b82c4"; g.fillRect(110, 90, 22, 22);
  txt(g, "GAME OVER?", 128, 40, "bold 30px sans-serif", "#ff6a8a");
});
export const BOARD = { exec: [A_BOARD + 0.6, 0, -2.0] as const, jensen: [A_BOARD - 0.7, 0, -2.0] as const, shakeJ: [A_BOARD - 0.5, 0, 0.3] as const, shakeE: [A_BOARD + 0.5, 0, 0.3] as const };
const buildBoard = (c: SetCtx) => {
  const ox = A_BOARD, k = kit(c, ox), { bx, cy, qd, pl } = k, { R } = c;
  const H = 3.4, XL = -4.2, XR = 4.2, ZB = -2.9, ZF = 6;
  const wall = Lm("bdwall", "#ffffff", boardWall), carpet = Lm("bdcarpet", "#ffffff", () => carpetTex("nva_carpet1", "#4c3b5e", "#5d4a72")), ceil = Lm("bdceil", "#d9d2c0"), table = Lm("bdtable", "#7a4a2c"), tableTop = Lm("bdtop", "#8d5a36");
  qd(carpet, [XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], 8, 9);
  qd(wall, [XL, 0, ZB], [XR, 0, ZB], [XR, H, ZB], [XL, H, ZB], 4.2, 1); qd(wall, [XL, 0, ZF], [XL, 0, ZB], [XL, H, ZB], [XL, H, ZF], 4.4, 1); qd(wall, [XR, 0, ZB], [XR, 0, ZF], [XR, H, ZF], [XR, H, ZB], 4.4, 1);
  qd(ceil, [XL, H, ZB], [XR, H, ZB], [XR, H, ZF], [XL, H, ZF]);
  // table (the people stand behind it)
  bx(tableTop, -2.1, 0.72, -1.8, 2.1, 0.8, -0.35); bx(table, -2.0, 0, -1.7, -1.85, 0.72, -0.45); bx(table, 1.85, 0, -1.7, 2.0, 0.72, -0.45); bx(table, -2.0, 0.55, -1.7, 2.0, 0.72, -1.65);
  // contract + briefcase of cash + pens
  const contract = pl(contractTex(), 0.64, 0.8, -0.55, 0.812, -1.2, { rx: -Math.PI / 2, hdr: 1.1 });
  const sig = pl(signatureTex(), 0.26, 0.1, -0.66, 0.816, -1.33, { rx: -Math.PI / 2, tr: true }); sig.visible = false;
  bx(Lm("bcase", "#5a3a26"), 0.2, 0.8, -1.4, 0.95, 0.9, -0.9); bx(Lm("bcasel", "#6b4630"), 0.2, 0.9, -1.43, 0.95, 0.95, -1.39);
  for (let i = 0; i < 6; i++) bx(Lm("bcash", "#7fcf86"), 0.23 + (i % 3) * 0.23, 0.9, -1.35 + Math.floor(i / 3) * 0.2, 0.43 + (i % 3) * 0.23, 0.99, -1.2 + Math.floor(i / 3) * 0.2);
  for (let i = 0; i < 3; i++) pl(c.signTex("nva_dollar" + i, 128, 128, "#d4f5d6", "#2f7a3c", "$", "bold 100px sans-serif"), 0.1, 0.1, 0.33 + i * 0.23, 0.994, -1.27, { rx: -Math.PI / 2 });
  // wall dressing: GAME CO. sign, console poster, CRT playing a game, plant, window
  pl(c.signTex("nva_gameco", 1024, 300, "#1c2b4b", "#ffd23a", "GAME CO.", "bold 190px sans-serif"), 2.0, 0.58, 0, 2.7, ZB + 0.03);
  cy(toon("#7b4a2c"), 3.5, -2.3, 0, 0.5, 0.25, 0.3, 14); for (let i = 0; i < 6; i++) k.sp(toon(i % 2 ? "#4f8a3f" : "#5f9a4a"), 3.5 + Math.cos(i * 1.1) * 0.22, 0.85 + i * 0.14, -2.3 + Math.sin(i * 1.1) * 0.12, 0.24, 1, 1.5, 0.7);
  bx(Lm("tvbody", "#2b2b34"), -3.6, 0.9, ZB, -2.3, 2.1, ZB + 0.7); pl(gameTv(), 1.0, 0.9, -2.95, 1.5, ZB + 0.72, { noink: true, hdr: 1.25 });
  bx(Lm("tvstand", "#4a3a2c"), -3.7, 0, ZB, -2.2, 0.9, ZB + 0.7);
  pl(c.signTex("nva_poster", 384, 512, "#e8453c", "#fff5d0", "PLAY!", "bold 110px sans-serif"), 0.62, 0.82, 2.35, 1.95, ZB + 0.03);
  const win = ctex("nva_bdwin", 512, 384, (g, r) => { const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#ffd7a0"); gr.addColorStop(1, "#ff9a6a"); g.fillStyle = gr; g.fillRect(0, 0, 512, 384); g.fillStyle = "#6a4a6e"; for (let i = 0; i < 12; i++) { const h = 100 + r() * 180; g.fillRect(i * 44, 384 - h, 40, h); } g.fillStyle = "#ffe9a0"; for (let i = 0; i < 40; i++) g.fillRect(r() * 512, 220 + r() * 160, 5, 7); });
  bx(Lm("bdfrm", "#e8dcc0"), -1.65, 1.2, ZB, 1.65, 2.2, ZB + 0.05); pl(win, 3.1, 0.9, 0, 1.7, ZB + 0.06);
  for (const px of [-1.1, 1.1]) { cy(toon("#2b2b30"), px, -1.2, 2.5, H, 0.01, 0.01, 6); const sh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.22, 20, 1, true), toon("#2f6a4a")); sh.position.set(ox + px, 2.42, -1.2); R.add(sh); const bl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.7, 1.8) })); bl.position.set(ox + px, 2.3, -1.2); bl.layers.set(NOINK); R.add(bl); c.lamp(ox + px, 2.3, -1.2, 1.5, 0.8, [1.0, 0.7, 0.34]); }
  c.wash(ox, 1.8, ZB + 0.05, 7, 3.2, 0, 0.35);
  // the handshake: two sleeves + a clasped fist, positioned between Jensen and the exec by the animation
  const armJ = makeArm(R, "#6a7078"), armE = makeArm(R, "#222a3c");
  const clasp = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshBasicMaterial({ color: INKC })); R.add(clasp);
  const penM = new THREE.Group(); // a fat yellow pencil held in Jensen's ink-dot hand
  const pInk = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), new THREE.MeshBasicMaterial({ color: INKC })); const pFill = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.032), new THREE.MeshBasicMaterial({ color: "#f2c23a" })); pFill.position.z = 0.001;
  const pTip = new THREE.Mesh(new THREE.CircleGeometry(0.02, 3), new THREE.MeshBasicMaterial({ color: "#e7c9a0" })); pTip.position.set(-0.1, 0, 0.002); pTip.rotation.z = Math.PI; penM.add(pInk, pFill, pTip); R.add(penM);
  const drops: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.15), new THREE.MeshBasicMaterial({ map: dropTex(), transparent: true, alphaTest: 0.05, side: THREE.DoubleSide })); d.visible = false; R.add(d); drops.push(d); }
  const gulp = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshBasicMaterial({ map: gulpTex("nva_gulp", "gulp.", "#2b3a6b"), transparent: true, alphaTest: 0.05, depthWrite: false })); gulp.visible = false; gulp.layers.set(NOINK); R.add(gulp);
  void contract;
  for (const m of [armJ, armE, clasp, penM, sig, gulp, ...drops]) { m.position.set(ox, 0, 0); m.visible = false; }
  BOARD_H.armJ = armJ; BOARD_H.armE = armE; BOARD_H.clasp = clasp; BOARD_H.pen = penM; BOARD_H.sig = sig; BOARD_H.gulp = gulp; BOARD_H.drops = drops;
};
export const BOARD_H = { armJ: null as StickArm | null, armE: null as StickArm | null, clasp: null as THREE.Mesh | null, pen: null as THREE.Group | null, sig: null as THREE.Mesh | null, gulp: null as THREE.Mesh | null, drops: [] as THREE.Mesh[] };
const projZ = (cam: number[], p: number[], z: number): [number, number] => { const k = (cam[2] - z) / (cam[2] - p[2]); return [cam[0] + (p[0] - cam[0]) * k, cam[1] + (p[1] - cam[1]) * k]; };
/** per-frame boardroom animation, called from the shots' anim hook with the shot camera position.
 *  Signing (13.1-16.0): Jensen's stick arm reaches the pencil on the contract's signature line. Handshake (16.0-17.9): both arms meet mid-pump, sweat falls, "gulp." */
export const poseBoard = (t: number, cam: number[]) => {
  const H = BOARD_H; if (!H.armJ) return;
  const signing = t < 15.95;
  if (signing) {
    const jx = BOARD.jensen[0], prog = ss(14.2, 15.5, t), z = -1.33;
    const S0 = projZ(cam, [jx + 0.16, 1.1, BOARD.jensen[2]], z);
    const tip: [number, number] = [A_BOARD - 0.79 + 0.26 * prog + 0.012 * Math.sin(t * 26), 0.85 + 0.014 * Math.abs(Math.sin(t * 19))];
    H.armJ!.visible = true; layArm(H.armJ!, S0, [tip[0] + 0.06, tip[1] + 0.085], z + 0.01);
    H.pen!.visible = true; H.pen!.position.set(tip[0] + 0.03, tip[1] + 0.045, z + 0.02); H.pen!.rotation.z = 0.95;
    H.sig!.visible = t > 14.2; H.sig!.scale.x = 0.12 + 0.88 * prog; H.sig!.position.x = A_BOARD - 0.79 + 0.13 * (0.12 + 0.88 * prog) - 0.0;
    H.armE!.visible = false; H.clasp!.visible = false; H.gulp!.visible = false; H.drops.forEach((d) => (d.visible = false));
    return;
  }
  const J = BOARD.shakeJ, E = BOARD.shakeE, z = 0.28;
  const pump = 0.05 * Math.sin(t * 17), my = 1.0 + pump;
  const sj = projZ(cam, [J[0] + 0.16, 1.1, J[2]], z), se = projZ(cam, [E[0] - 0.16, 1.1, E[2]], z), mx = (sj[0] + se[0]) / 2;
  H.armJ!.visible = true; H.armE!.visible = true; H.clasp!.visible = true; H.pen!.visible = false; H.sig!.visible = false;
  layArm(H.armJ!, sj, [mx - 0.02, my], z + 0.02); layArm(H.armE!, se, [mx + 0.02, my], z + 0.02);
  H.clasp!.position.set(mx, my, z + 0.04); H.clasp!.scale.setScalar(1 + 0.15 * Math.sin(t * 17));
  H.drops.forEach((d, i) => {
    const per = 0.8, u = (((t - 16.1) / per + i / H.drops.length) % 1 + 1) % 1, side = i % 2 ? 1 : -1;
    d.visible = t > 16.05; d.position.set(J[0] + side * (0.3 + 0.07 * (i % 3)), 1.78 - 0.45 * u * u - 0.2 * u, J[2] + 0.1); d.scale.setScalar(0.75 + 0.35 * Math.sin(Math.PI * Math.min(1, u * 1.1)));
  });
  H.gulp!.visible = t > 16.9 && t < 17.9; H.gulp!.position.set(J[0] - 0.55, 2.05, J[2] + 0.1); H.gulp!.scale.setScalar(0.5 + 0.7 * ss(16.9, 17.1, t));
};

// ---------------------------------------------------------------- 5. split-screen call
const panelFrame = (key: string, label: string, tag: string, live: boolean) => ctex(key, 768, 600, (g) => {
  g.clearRect(0, 0, 768, 600);
  g.strokeStyle = "#0e1226"; g.lineWidth = 34; rr(g, 6, 6, 756, 588, 44); g.stroke();
  g.strokeStyle = "#f4f1ea"; g.lineWidth = 8; rr(g, 24, 24, 720, 552, 30); g.stroke();
  g.fillStyle = "rgba(14,18,38,0.86)"; rr(g, 40, 500, 330, 70, 18); g.fill(); txt(g, label, 70, 536, "bold 44px sans-serif", "#ffffff", "left");
  g.fillStyle = "rgba(14,18,38,0.86)"; rr(g, 540, 40, 190, 56, 14); g.fill();
  if (live) { g.fillStyle = "#ff3b3b"; g.beginPath(); g.arc(572, 68, 11, 0, 7); g.fill(); txt(g, tag, 676, 70, "bold 34px sans-serif", "#fff"); }
  else { g.fillStyle = "#44d17a"; g.beginPath(); g.arc(572, 68, 11, 0, 7); g.fill(); txt(g, tag, 676, 70, "bold 34px sans-serif", "#fff"); }
});
export const CALL_SCALE = 1.2;
export const CALL = { jensen: [A_CALL - 0.1, 0, -2.5] as const, exec: [A_CALL + 0.1, 3.0, -2.5] as const };
const buildCall = (c: SetCtx) => {
  const ox = A_CALL, k = kit(c, ox), { bx, cy, qd, pl, sp } = k, { R } = c;
  const bg = Lm("cbg", "#0e1226"); qd(bg, [-6, -2, -3.6], [6, -2, -3.6], [6, 9, -3.6], [-6, 9, -3.6]);
  // top panel (exec's penthouse): y 2.95..5.25; bottom panel (Jensen's closet office): y 0.1..2.4
  const wallTop = ctex("nva_ctop", 512, 384, (g, r) => { const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#ffc986"); gr.addColorStop(1, "#ff8f6a"); g.fillStyle = gr; g.fillRect(0, 0, 512, 384); g.fillStyle = "#e8d6b0"; g.fillRect(0, 280, 512, 104); g.fillStyle = "#5a3a4c"; for (let i = 0; i < 10; i++) { const h = 60 + r() * 120; g.fillRect(30 + i * 46, 280 - h, 40, h); } g.fillStyle = "#ffe9a0"; for (let i = 0; i < 40; i++) g.fillRect(30 + r() * 440, 150 + r() * 120, 4, 6); g.strokeStyle = "#8a5a3a"; g.lineWidth = 12; g.strokeRect(0, 0, 512, 384); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 384); g.stroke(); });
  const wallBot = ctex("nva_cbot", 512, 384, (g, r) => { g.fillStyle = "#8c8a7a"; g.fillRect(0, 0, 512, 384); g.fillStyle = "#7a7868"; for (let i = 0; i < 8; i++) g.fillRect(i * 64, 0, 28, 384);
    g.fillStyle = "#24508f"; g.fillRect(40, 40, 170, 120); g.strokeStyle = "#e9f1ff"; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(52, 60 + i * 18); g.lineTo(150 + r() * 40, 60 + i * 18); g.stroke(); } g.strokeStyle = "#e9f1ff"; g.strokeRect(80, 70, 70, 60);
    g.fillStyle = "#fff4a0"; for (let i = 0; i < 8; i++) { g.save(); g.translate(260 + (i % 4) * 56, 60 + Math.floor(i / 4) * 56); g.rotate((r() - 0.5) * 0.3); g.fillRect(0, 0, 44, 44); g.restore(); }
    g.fillStyle = "#5b4a3a"; g.fillRect(0, 330, 512, 54); });
  pl(wallTop, 3.2, 2.4, 0, 4.1, -3.55); pl(wallBot, 3.2, 2.4, 0, 1.25, -3.55);
  // exec: floor, big desk, leather chair back, trophy shelf, GAME CO sign
  bx(Lm("cfloor", "#6b4630"), -1.6, 2.95, -3.5, 1.6, 3.0, -1.2);
  bx(Lm("cdesk", "#4a2e1c"), -1.2, 3.62, -2.4, 1.2, 3.72, -1.75); bx(Lm("cdesk2", "#3a2415"), -1.15, 3.0, -2.35, 1.15, 3.62, -2.3);
  bx(Lm("cchair", "#7a3b2c"), -0.45, 3.0, -3.0, 0.45, 4.35, -2.85); bx(Lm("cchair", "#7a3b2c"), -0.55, 3.0, -2.95, 0.55, 3.3, -2.6);
  pl(c.signTex("nva_cgameco", 768, 200, "#1c2b4b", "#ffd23a", "GAME CO.", "bold 120px sans-serif"), 0.9, 0.23, -0.85, 4.95, -3.52);
  bx(Lm("cshelf", "#4a3a2c"), 0.9, 3.9, -3.5, 1.58, 3.95, -3.2); for (let i = 0; i < 3; i++) cy(toon("#f2d23a"), 1.05 + i * 0.22, -3.35, 3.95, 4.15, 0.06, 0.04, 8);
  cy(toon("#c9d1da"), 0.95, -2.0, 3.72, 3.74, 0.14, 0.14, 12); // laptop-ish pad where the money starts
  bx(Lm("claptop", "#aeb6c0"), 0.55, 3.72, -2.2, 1.0, 3.76, -1.85); bx(Lm("clapscr", "#2c3340"), 0.55, 3.76, -2.22, 1.0, 4.08, -2.18);
  pl(c.signTex("nva_send", 256, 160, "#3ddc7a", "#10351f", "SEND", "bold 70px sans-serif"), 0.2, 0.125, 0.78, 3.92, -2.17, { noink: true, hdr: 1.3 });
  cy(toon("#cfe9f6"), -0.9, -2.05, 3.72, 3.8, 0.04, 0.04, 8);
  bx(Lm("cphone", "#2b2b30"), -0.8, 3.72, -2.0, -0.45, 3.78, -1.8); // desk phone (speaker mode)
  // Jensen's side: desk, stacks of paper, desk phone, noodles
  bx(Lm("cfloor2", "#5b4a3a"), -1.6, 0.1, -3.5, 1.6, 0.14, -1.2);
  bx(Lm("cdesk3", "#7a5a3c"), -1.3, 0.72, -2.3, 1.2, 0.8, -1.7); bx(Lm("cdesk4", "#5b4228"), -1.25, 0.14, -2.25, 1.15, 0.72, -2.2);
  for (let i = 0; i < 5; i++) bx(Lm("cpaper", "#f6f1e6"), -1.1 + i * 0.12, 0.8, -2.2, -1.0 + i * 0.12, 0.8 + 0.08 + (i % 3) * 0.06, -2.05);
  bx(Lm("cphone2", "#2b2b30"), 0.35, 0.8, -2.12, 0.78, 0.86, -1.92); cy(toon("#e8453c"), 0.95, -2.0, 0.8, 0.92, 0.07, 0.06, 10); cy(toon("#f6f1e6"), 0.95, -2.0, 0.92, 0.95, 0.07, 0.07, 10);
  pl(c.signTex("nva_chipsign", 384, 170, "#fff4a0", "#24508f", "CHIP PLANS", "bold 56px sans-serif"), 0.5, 0.22, 0.95, 1.95, -3.5);
  sp(toon("#c9824a"), -1.45, 0.4, -2.9, 0.3, 1, 1, 1); // a cardboard box blob in the corner
  bx(Lm("cbox", "#c9a46a"), -1.58, 0.14, -3.3, -1.0, 0.72, -2.7);
  // frames in front of everything + divider + bills
  const frameTop = pl(panelFrame("nva_ftop", "GAME CO. BOSS", "LIVE", true), 3.3, 2.58, 0, 4.1, -1.9, { tr: true, order: 5 });
  const frameBot = pl(panelFrame("nva_fbot", "YOU", "LIVE", true), 3.3, 2.58, 0, 1.25, -1.9, { tr: true, order: 5 });
  void frameTop; void frameBot;
  const bills: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: billTex(), transparent: true, alphaTest: 0.05, side: THREE.DoubleSide })); m.visible = false; m.renderOrder = 8; R.add(m); bills.push(m); }
  const toast = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.34), new THREE.MeshBasicMaterial({ map: c.signTex("nva_sent", 768, 220, "#3ddc7a", "#10351f", "SENT", "bold 120px sans-serif"), transparent: true, depthWrite: false })); toast.visible = false; toast.renderOrder = 9; R.add(toast);
  const handset = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.06), toon("#2b2b30")); R.add(handset);
  const cord: THREE.Mesh[] = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 10), toon("#2b2b30")); R.add(m); cord.push(m); }
  park(ox, ...bills, toast, handset, ...cord);
  c.onFrame((f, set) => {
    if (set !== "a_call") return;
    const t = f / FPS, [jx] = CALL.jensen;
    // handset sits in Jensen's raised hand (wave 0.5): +0.34 m, 1.43 m up from the card (card feet at y=0.14 on his side)
    const hx = jx + 0.34 * CALL_SCALE, hy = 0.14 + 1.43 * CALL_SCALE;
    handset.position.set(hx + 0.02, hy + 0.0 + 0.01 * Math.sin(t * 7), -2.42); handset.rotation.z = 0.15; handset.scale.setScalar(1.2);
    cord.forEach((m, i) => { const u = i / (cord.length - 1); m.position.set(hx + 0.05 - 0.2 * Math.sin(u * 2.4) , hy - 0.25 - (hy - 0.92) * u, -2.4); m.rotation.y = 1.2; });
    // money: 14 bills leave the SEND laptop at "And they do" and land on Jensen's desk
    bills.forEach((m, i) => {
      const t0 = 21.12 + i * 0.055, u = (t - t0) / 0.78; m.visible = u > 0 && u < 1;
      if (!m.visible) return;
      const sx = ox + 0.8, sy = 3.95, ex = ox - 0.1 + (i % 5 - 2) * 0.22, ey = 0.9 + (i % 3) * 0.04; const e = u * u * (3 - 2 * u);
      m.position.set(sx + (ex - sx) * e + 0.3 * Math.sin(u * 6 + i), sy + (ey - sy) * e + 0.5 * Math.sin(u * Math.PI), -1.95); m.rotation.z = u * 7 + i; m.scale.setScalar(0.8 + 0.4 * Math.sin(u * Math.PI));
    });
    toast.visible = t > 21.12 && t < 21.9; toast.position.set(ox + 0.1, 3.4, -1.95); toast.scale.setScalar(0.3 + 0.8 * ss(21.12, 21.3, t));
  });
};

// ---------------------------------------------------------------- 6. the open office: desks vanish, calendar "30"
const calendar30 = () => ctex("nva_cal30", 512, 640, (g) => {
  g.fillStyle = "#fffdf6"; g.fillRect(0, 0, 512, 640); g.fillStyle = "#c33a2e"; g.fillRect(0, 0, 512, 150);
  txt(g, "DAYS LEFT", 256, 82, "bold 92px sans-serif", "#ffffff");
  txt(g, "30", 256, 366, "bold 470px sans-serif", "#1f2230", "center", "#fffdf6", 6);
  g.fillStyle = "#c9c2ad"; g.fillRect(0, 150, 512, 8);
  g.strokeStyle = INKC; g.lineWidth = 14; g.strokeRect(7, 7, 498, 626);
  g.fillStyle = "#d8d2be"; g.fillRect(30, 590, 452, 22);
});
const circleTex = () => ctex("nva_circ30", 512, 640, (g) => {
  g.clearRect(0, 0, 512, 640); g.strokeStyle = "#e0262a"; g.lineWidth = 18; g.lineCap = "round"; g.beginPath(); g.ellipse(256, 372, 232, 214, -0.06, 0.3, 0.3 + Math.PI * 2 + 0.5); g.stroke();
});
const crtTex = () => ctex("nva_crt", 128, 128, (g) => { g.fillStyle = "#0e2a1a"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#4fe38a"; for (let i = 0; i < 8; i++) g.fillRect(10, 14 + i * 13, 30 + ((i * 37) % 70), 5); });
const officeWall = () => ctex("nva_owall", 512, 870, (g, r) => {
  g.fillStyle = "#b9955a"; g.fillRect(0, 0, 512, 870); g.fillStyle = "#ad8a52"; for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 6, 870);
  g.fillStyle = "#5e8a86"; g.fillRect(0, 560, 512, 310); g.fillStyle = "#4a706c"; for (let x = 0; x < 512; x += 85) g.fillRect(x, 560, 4, 310);
  g.fillStyle = "#e8e0c8"; g.fillRect(0, 548, 512, 14);
  for (let i = 0; i < 24; i++) { g.fillStyle = `rgba(70,50,30,${0.05 + r() * 0.06})`; g.beginPath(); g.ellipse(r() * 512, r() * 860, 10 + r() * 40, 6 + r() * 18, 0, 0, 7); g.fill(); }
});
const ceilTile = () => ctex("nva_ctile", 128, 128, (g) => { g.fillStyle = "#b9b5a4"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#b9b3a0"; g.lineWidth = 3; g.strokeRect(0, 0, 128, 128); g.fillStyle = "#cfc9b6"; for (let i = 0; i < 20; i++) g.fillRect((i * 37) % 128, (i * 59) % 128, 2, 2); });
export const OFFICE = { calendar: null as THREE.Group | null, units: [] as THREE.Group[], x: A_OFFICE };
/** desk slots: [x, z, vanishTime] (vanishTime = -1: stays). Seated card positions are exported for the shots. */
export const DESKS: { x: number; z: number; t: number }[] = [
  { x: -1.15, z: -3.2, t: 22.30 }, { x: 1.15, z: -3.2, t: -1 }, { x: -1.15, z: -1.2, t: -1 }, { x: 1.15, z: -1.2, t: 23.05 },
  { x: -1.15, z: 0.8, t: -1 }, { x: 1.15, z: 0.8, t: 22.55 }, { x: -1.15, z: 2.8, t: 22.80 }, { x: 1.15, z: 2.8, t: -1 },
];
const buildOffice = (c: SetCtx) => {
  const ox = A_OFFICE, k = kit(c, ox), { bx, cy, qd, pl, sp } = k, { R } = c;
  const H = 3.3, XL = -3.8, XR = 3.8, ZB = -4.5, ZF = 9;
  const wall = Lm("owall", "#ffffff", officeWall), carpet = Lm("ocarpet", "#ffffff", () => carpetTex("nva_carpet2", "#2f4a5e", "#3b5a70")), ceil = Lm("oceil", "#ffffff", ceilTile);
  qd(carpet, [XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], 7.6 / 0.6, 13.5 / 0.6);
  qd(wall, [XL, 0, ZB], [XR, 0, ZB], [XR, H, ZB], [XL, H, ZB], 3.8, 1); qd(wall, [XL, 0, ZF], [XL, 0, ZB], [XL, H, ZB], [XL, H, ZF], 6.75, 1); qd(wall, [XR, 0, ZB], [XR, 0, ZF], [XR, H, ZF], [XR, H, ZB], 6.75, 1);
  qd(ceil, [XL, H, ZB], [XR, H, ZB], [XR, H, ZF], [XL, H, ZF], 7.6 / 0.6, 13.5 / 0.6);
  // window with blinds on the left wall, notice boards on the right, plant + water cooler on the back wall
  const city = ctex("nva_ocity", 512, 384, (g, r) => { const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#b9c9e6"); gr.addColorStop(1, "#f0d6b0"); g.fillStyle = gr; g.fillRect(0, 0, 512, 384); g.fillStyle = "#6e7a9a"; for (let i = 0; i < 9; i++) { const h = 80 + r() * 200; g.fillRect(i * 58, 384 - h, 52, h); } g.fillStyle = "rgba(255,255,255,0.55)"; for (let y = 0; y < 384; y += 24) g.fillRect(0, y, 512, 10); });
  pl(city, 3.2, 1.8, XL + 0.05, 1.9, -1.0, { ry: Math.PI / 2 }); pl(city, 3.2, 1.8, XL + 0.05, 1.9, 2.8, { ry: Math.PI / 2 });
  bx(Lm("ofrm", "#8a8068"), XL, 0.95, -2.65, XL + 0.08, 2.9, -2.55); bx(Lm("ofrm", "#8a8068"), XL, 0.95, 0.65, XL + 0.08, 2.9, 0.75); bx(Lm("ofrm", "#8a8068"), XL, 0.95, 4.45, XL + 0.08, 2.9, 4.55);
  pl(c.signTex("nva_pizza", 640, 400, "#fff1c6", "#b3262b", "PIZZA FRIDAY", "bold 80px sans-serif"), 1.2, 0.75, XR - 0.05, 1.9, -0.2, { ry: -Math.PI / 2 });
  pl(c.signTex("nva_pizzax", 640, 120, "#e23a2e", "#fff6d8", "CANCELLED", "bold 70px sans-serif"), 1.0, 0.19, XR - 0.06, 1.9, -0.2, { ry: -Math.PI / 2, rz: 0.12 });
  pl(c.signTex("nva_cubes", 768, 200, "#2b2f45", "#f6f1e6", "ENGINEERING", "bold 100px sans-serif"), 1.5, 0.39, -2.3, 2.9, ZB + 0.03);
  cy(toon("#8fb8d8"), -3.3, -4.0, 0, 0.9, 0.2, 0.2, 14); cy(toon("#cfe9f6"), -3.3, -4.0, 0.9, 1.25, 0.18, 0.18, 14); // water cooler
  // desk units: dynamic groups so each one can vanish; they carry desk, chair, monitor, mug, plant
  const units: THREE.Group[] = [];
  const deskM = toon("#8f6a3c"), deskD = toon("#6a4a28"), chairM = toon("#2c4a7a"), beigeM = toon("#bfb48c");
  DESKS.forEach((d, i) => {
    const u = new THREE.Group(); u.position.set(ox + d.x, 0, d.z); R.add(u); units.push(u);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; u.add(m); return m; };
    add(new THREE.BoxGeometry(1.5, 0.07, 0.8), deskM, 0, 0.74, 0); add(new THREE.BoxGeometry(0.07, 0.72, 0.74), deskD, -0.7, 0.36, 0); add(new THREE.BoxGeometry(0.07, 0.72, 0.74), deskD, 0.7, 0.36, 0); add(new THREE.BoxGeometry(1.4, 0.5, 0.05), deskD, 0, 0.5, -0.34);
    add(new THREE.BoxGeometry(0.5, 0.42, 0.44), beigeM, 0.45, 1.0, -0.1, -0.3); add(new THREE.BoxGeometry(0.4, 0.3, 0.02), new THREE.MeshBasicMaterial({ map: crtTex() }), 0.43, 1.02, 0.13, -0.3);
    add(new THREE.BoxGeometry(0.46, 0.04, 0.16), beigeM, 0.0, 0.79, 0.22); add(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 10), toon(["#e8453c", "#5ab07a", "#3b82c4", "#f2d23a"][i % 4]), -0.5, 0.82, 0.2);
    add(new THREE.BoxGeometry(0.5, 0.06, 0.5), chairM, 0, 0.42, -0.62); add(new THREE.BoxGeometry(0.5, 0.55, 0.06), chairM, 0, 0.72, -0.9); add(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), toon("#2b2b30"), 0, 0.2, -0.62);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), toon("#fffdf6")); paper.rotation.x = -Math.PI / 2; paper.position.set(-0.3, 0.785, 0.0); paper.rotation.z = i; u.add(paper);
  });
  OFFICE.units = units;
  // the wall calendar (group, so section B can rip it off) + red circle
  const cal = new THREE.Group(); cal.position.set(ox + 0.0, 1.9, ZB + 0.04); R.add(cal); OFFICE.calendar = cal;
  const calM = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9), new THREE.MeshBasicMaterial({ map: calendar30(), color: new THREE.Color(1.1, 1.1, 1.05) })); cal.add(calM);
  const circ = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9), new THREE.MeshBasicMaterial({ map: circleTex(), transparent: true, depthWrite: false })); circ.position.z = 0.01; circ.visible = false; cal.add(circ);
  const nail = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), toon("#c9d1da")); nail.position.set(0, 0.98, 0.03); cal.add(nail);
  // fluorescent troffers (one flickers) + poof clouds + overall wash
  const troffers: THREE.Mesh[] = [];
  for (const [tx, tz] of [[0, -3.0], [0, -0.8], [0, 1.4], [0, 3.6], [0, 5.8]]) { const tr = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.95, 1.8) })); tr.rotation.x = Math.PI / 2; tr.position.set(ox + tx, H - 0.02, tz); tr.layers.set(NOINK); R.add(tr); troffers.push(tr); c.lamp(ox + tx, H - 0.1, tz, 2.4, 0, [0.7, 0.85, 0.75]); }
  // wall dressing: whiteboard with a sad chart, wall clock, teamwork poster, filing cabinet + plant
  const chart = ctex("nva_chart", 512, 384, (g, r) => { g.fillStyle = "#f6f6f0"; g.fillRect(0, 0, 512, 384); g.strokeStyle = "#8a8a90"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 374); txt(g, "SALES", 256, 50, "bold 64px sans-serif", "#2b3a8a");
    g.strokeStyle = "#d12b2b"; g.lineWidth = 14; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(40, 120); g.lineTo(140, 150 + r() * 10); g.lineTo(220, 200); g.lineTo(300, 230); g.lineTo(400, 300); g.lineTo(470, 350); g.stroke();
    g.fillStyle = "#d12b2b"; g.beginPath(); g.moveTo(470, 360); g.lineTo(440, 330); g.lineTo(490, 320); g.closePath(); g.fill(); });
  pl(chart, 1.3, 0.98, -2.45, 1.75, ZB + 0.03);
  pl(clockTex(), 0.42, 0.42, 2.05, 2.5, ZB + 0.03);
  pl(c.signTex("nva_team", 384, 512, "#2b3a6b", "#f6f1e6", "TEAMWORK", "bold 64px sans-serif"), 0.5, 0.66, 2.25, 1.55, ZB + 0.03);
  bx(Lm("ocab", "#8d96a2"), 2.9, 0, ZB, 3.5, 1.35, ZB + 0.55); bx(Lm("ocab2", "#6e7886"), 2.9, 0.42, ZB + 0.55, 3.5, 0.45, ZB + 0.56); bx(Lm("ocab2", "#6e7886"), 2.9, 0.9, ZB + 0.55, 3.5, 0.93, ZB + 0.56);
  cy(toon("#c0643a"), 3.2, ZB + 0.28, 1.35, 1.6, 0.12, 0.15, 12); for (let i = 0; i < 5; i++) sp(toon(i % 2 ? "#5f9a4a" : "#4f8a3f"), 3.2 + Math.cos(i * 1.3) * 0.12, 1.85 + i * 0.07, ZB + 0.28 + Math.sin(i * 1.3) * 0.08, 0.16, 1, 1.6, 0.6);
  // what a layoff leaves behind: a box with a plant and a mug on the floor where each desk was
  const left: THREE.Group[] = [];
  DESKS.forEach((d) => {
    const g = new THREE.Group(); g.position.set(ox + d.x, 0, d.z); g.visible = false; R.add(g); left.push(g);
    const bxm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.34, 0.42), toon("#c9a46a")); bxm.position.y = 0.17; g.add(bxm);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.4), toon("#b8905a")); lid.position.set(-0.15, 0.35, 0); lid.rotation.z = 0.5; g.add(lid);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.1, 10), toon("#c0643a")); pot.position.set(0.12, 0.39, 0); g.add(pot);
    for (let i = 0; i < 4; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), toon(i % 2 ? "#5f9a4a" : "#4f8a3f")); lf.scale.set(1, 1.5, 0.6); lf.position.set(0.12 + (i - 1.5) * 0.04, 0.55 + (i % 2) * 0.05, 0); g.add(lf); }
    const mg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 10), toon("#e8453c")); mg.position.set(-0.05, 0.39, 0.1); g.add(mg);
  });
  const puffs: THREE.Mesh[] = [];
  for (let i = 0; i < DESKS.length; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: puffTex(), transparent: true, alphaTest: 0.03, depthWrite: false })); p.visible = false; p.renderOrder = 7; R.add(p); puffs.push(p); }
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), new THREE.MeshBasicMaterial({ visible: false })); R.add(ring);
  void sp; void ring;
  park(ox, ...puffs, ring);
  c.onFrame((f, set) => {
    if (set !== "a_office") return;
    const t = f / FPS;
    DESKS.forEach((d, i) => {
      const u = t - d.t, gone = d.t > 0 && u >= 0;
      units[i].visible = !gone; left[i].visible = gone && u > 0.25; const p = puffs[i]; p.visible = gone && u < 0.9;
      if (p.visible) { p.position.set(ox + d.x, 1.0 + 0.3 * u, d.z + 0.1); p.scale.setScalar(0.4 + 2.4 * ss(0, 0.5, u)); (p.material as THREE.MeshBasicMaterial).opacity = 1 - ss(0.45, 0.9, u); }
    });
    circ.visible = t > 24.78; circ.scale.setScalar(0.6 + 0.4 * ss(24.78, 25.0, t));
    troffers.forEach((tr, i) => { const fl = i === 2 ? (Math.sin(t * 31) > 0.2 ? 1 : 0.35) : 1; (tr.material as THREE.MeshBasicMaterial).color.setRGB(1.9 * fl, 1.95 * fl, 1.8 * fl); });
  });
};

// ---------------------------------------------------------------- entry
export const BOOTH_A: { h: BoothHandles | null } = { h: null };
export const buildA = (c: SetCtx) => {
  BOOTH_A.h = buildBooth(c, A_BOOTH);
  buildKitchen(c);
  buildStage(c);
  buildBoard(c);
  buildCall(c);
  buildOffice(c);
};
