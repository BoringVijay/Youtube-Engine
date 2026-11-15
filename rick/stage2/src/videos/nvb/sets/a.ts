// Video B ("The Most Searched Name on Earth"), section A sets (script lines 1-8, 0 - 28.2 s). Only the section-A helper edits this file.
// Everything is code: Canvas2D ctex textures, box/quad meshes, existing kit materials. No generated art.
// World slots (one 100 m region per hundred, several sub-sets 30-40 m apart inside a region, camera x decides the region):
//   region 4: N_TREE 360 (family tree), N_GLOBE 400 (globe of phones), N_STAGE 440 (chair + crowd of 880 heads)
//   region 5: N_STAIRS 470 (spreadsheet staircase + elevator penguin), N_BANK 500 (three lobbies along -z), N_ARCADE 530
//   region 6: N_DISH 560 (the 40-dish building), N_VAULT 595 (crate + padlock), N_CARPET 622 (red carpet), N_TETRIS 645 (forklift Tetris well)
// REUSE FOR LATER SECTIONS
//   buildChair(ctx, x, { z?, y?, angle? }) -> { root, spin(angle) }  the leather-jacket chair from line 2. Line 23 (section C) calls it at
//     its own slot and holds it still: const ch = buildChair(ctx, X, { z: -1 }); ch.spin(0.6); (a copy: nothing is shared with the stage).
//   penguinTex(look)  -> ctex of the suit-wearing penguin (look -1, 0, 1)  (the one cameo is in the stairs elevator)
//   makeGear(ctx, x) / placeGear(gear, camPos, {x,y,z,bag,shades,badge})  Alice's red handbag, sunglasses (up = on her head, down = on eyes)
//     and the gold partner badge as camera-facing meshes aligned to the CAST.ALICE card (hand at +0.26 m, 0.68 m high; head 1.39 m).
//     Call placeGear from a shot's anim(f); it must be created at build time at an x inside your own region.
//   sign(key, w, h, bg, fg, lines, px)  plain painted plaque texture.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SetCtx } from "../world";
import { boxGeo, quad, V } from "../../bridge/build";
import { ctex } from "../../bridge/paint";
import { twoTone } from "../../bridge/shade";
import { NOINK } from "../../bridge/ink";
import { FPS } from "../timeline";

export const N_TREE = 360, N_GLOBE = 400, N_STAGE = 440;
export const N_STAIRS = 470, N_BANK = 500, N_ARCADE = 530;
export const N_DISH = 560, N_VAULT = 595, N_CARPET = 622, N_TETRIS = 645;
export const SET = { globe: "nvb_a_globe", stage: "nvb_a_stage", tree: "nvb_a_tree", stairs: "nvb_a_stairs", bank: "nvb_a_bank", arcade: "nvb_a_arcade",
  vault: "nvb_a_vault", dish: "nvb_a_dish", carpet: "nvb_a_carpet", tetris: "nvb_a_tetris" } as const;
const INKC = "#241726";
const D = THREE.DoubleSide;
const sm = (a: number, b: number, t: number) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
const hash = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const back = (u: number) => { const c1 = 1.9, c3 = c1 + 1, x = Math.max(0, Math.min(1, u)); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

// ---------- materials ----------
const mc = new Map<string, THREE.MeshLambertMaterial>();
/** toon-shaded flat colour, both faces */
const T = (col: string) => { let m = mc.get(col); if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: col, side: D })); mc.set(col, m); } return m; };
const tc = new Map<string, THREE.MeshLambertMaterial>();
/** toon-shaded painted texture */
const TX = (tex: THREE.Texture, tint = "#ffffff") => { const k = tex.uuid + tint; let m = tc.get(k); if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ map: tex, color: tint, side: D })); tc.set(k, m); } return m; };
const GL = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: D });
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const M4 = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));

/** plain painted plaque */
export const sign = (key: string, w: number, h: number, bg: string, fg: string, lines: string | string[], px = 80, border = INKC) => ctex(key, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.lineWidth = Math.max(8, px * 0.12); g.strokeStyle = border; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
  const L = Array.isArray(lines) ? lines : [lines]; g.fillStyle = fg; g.font = `bold ${px}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  L.forEach((s, i) => g.fillText(s, w / 2, h / 2 + (i - (L.length - 1) / 2) * px * 1.08 + px * 0.04));
});

// ---------- placement helpers (every top-level object gets its region explicitly: no bbox guessing) ----------
const regionOf = (x: number) => Math.round(x / 100);
const put = <O extends THREE.Object3D>(c: SetCtx, o: O, x = o.position.x): O => { c.R.add(o); o.userData.region = regionOf(x); return o; };
const mesh = (c: SetCtx, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, noInk = false) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); if (noInk) m.layers.set(NOINK); return put(c, m, x);
};
/** painted plane (unlit), optionally see-through; ink outline unless noInk */
const pl = (c: SetCtx, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, trans = false, noInk = false, tint = 1) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: trans, alphaTest: trans ? 0.4 : 0, side: D, color: new THREE.Color(tint, tint, tint) }));
  m.position.set(x, y, z); m.rotation.y = ry; if (noInk) m.layers.set(NOINK); return put(c, m, x);
};
const bx = (c: SetCtx, mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0) =>
  c.b.add(boxGeo(V(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), V(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)), tile), mat);
const qd = (c: SetCtx, mat: THREE.Material, a: [number, number, number], b: [number, number, number], cc: [number, number, number], d: [number, number, number], u = 1, v = 1) =>
  c.b.add(quad(V(...a), V(...b), V(...cc), V(...d), u, v), mat);
/** floor facing up, ceiling facing down, back wall facing +z */
const floor = (c: SetCtx, mat: THREE.Material, x0: number, x1: number, zNear: number, zFar: number, y = 0, u = 1, v = 1) => qd(c, mat, [x0, y, zNear], [x1, y, zNear], [x1, y, zFar], [x0, y, zFar], u, v);
const ceil = (c: SetCtx, mat: THREE.Material, x0: number, x1: number, zNear: number, zFar: number, y: number, u = 1, v = 1) => qd(c, mat, [x0, y, zFar], [x1, y, zFar], [x1, y, zNear], [x0, y, zNear], u, v);
const wallZ = (c: SetCtx, mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z: number, u = 1, v = 1) => qd(c, mat, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], u, v);
const wallX = (c: SetCtx, mat: THREE.Material, x: number, zNear: number, zFar: number, y0: number, y1: number, u = 1, v = 1) => qd(c, mat, [x, y0, zNear], [x, y0, zFar], [x, y1, zFar], [x, y1, zNear], u, v);
const bulb = (c: SetCtx, x: number, y: number, z: number, r = 0.08, col: [number, number, number] = [3.2, 2.6, 1.6]) =>
  mesh(c, new THREE.SphereGeometry(r, 10, 8), GL(...col), x, y, z, 0, 0, 0, true);
const cylG = (r0: number, r1: number, h: number, seg = 16) => new THREE.CylinderGeometry(r0, r1, h, seg);
const addCyl = (c: SetCtx, mat: THREE.Material, r0: number, r1: number, h: number, x: number, y: number, z: number, seg = 14, rx = 0, rz = 0) =>
  c.b.add(cylG(r0, r1, h, seg), mat, M4(x, y, z, rx, 0, rz));
const addSph = (c: SetCtx, mat: THREE.Material, r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) =>
  c.b.add(new THREE.SphereGeometry(r, 12, 9), mat, M4(x, y, z, 0, 0, 0, sx, sy, sz));
const plant = (c: SetCtx, x: number, z: number, s = 1) => {
  addCyl(c, T("#b4572f"), 0.2 * s, 0.15 * s, 0.4 * s, x, 0.2 * s, z);
  for (let i = 0; i < 6; i++) { const a = i * 1.1 + x; addSph(c, T(i % 2 ? "#4f9a45" : "#3d8a3b"), 0.2 * s, x + Math.cos(a) * 0.12 * s, (0.6 + i * 0.13) * s, z + Math.sin(a) * 0.12 * s, 0.9, 1.9, 0.7); }
};
const rect = (c: SetCtx, tex: THREE.Texture | null, col: string, w: number, h: number, x: number, y: number, z: number, ry = 0) =>
  tex ? pl(c, tex, w, h, x, y, z, ry) : mesh(c, new THREE.PlaneGeometry(w, h), GL(...(new THREE.Color(col).toArray() as [number, number, number])), x, y, z, 0, ry, 0, true);

// ---------- penguin in a suit (the one cameo) ----------
export const penguinTex = (look: -1 | 0 | 1) => ctex("nbA_peng" + look, 256, 384, (g) => {
  g.clearRect(0, 0, 256, 384); g.lineJoin = "round"; g.lineWidth = 8; g.strokeStyle = INKC;
  const ell = (x: number, y: number, rx: number, ry: number, fill: string, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fillStyle = fill; g.fill(); g.stroke(); };
  ell(98, 354, 28, 11, "#f2a33a"); ell(158, 354, 28, 11, "#f2a33a");                 // feet
  ell(128, 236, 84, 122, "#1d2433");                                                   // suit body
  ell(54, 238, 17, 64, "#1d2433", 0.22); ell(202, 238, 17, 64, "#1d2433", -0.22);      // flippers
  g.fillStyle = "#8a5a34"; rr(g, 186, 286, 66, 50, 8); g.fill(); g.stroke();           // briefcase
  g.strokeStyle = INKC; g.lineWidth = 6; g.beginPath(); g.arc(219, 286, 14, Math.PI, 0); g.stroke(); g.lineWidth = 8;
  ell(202, 288, 9, 9, "#1d2433");                                                       // flipper holding it
  g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(128, 150); g.lineTo(164, 262); g.lineTo(128, 330); g.lineTo(92, 262); g.closePath(); g.fill(); g.stroke(); // shirt
  g.fillStyle = "#2b3550"; g.beginPath(); g.moveTo(96, 160); g.lineTo(128, 228); g.lineTo(104, 316); g.lineTo(58, 270); g.lineTo(70, 190); g.closePath(); g.fill(); g.stroke(); // lapels
  g.beginPath(); g.moveTo(160, 160); g.lineTo(128, 228); g.lineTo(152, 316); g.lineTo(198, 270); g.lineTo(186, 190); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#d9473b"; g.beginPath(); g.moveTo(128, 176); g.lineTo(116, 226); g.lineTo(128, 270); g.lineTo(140, 226); g.closePath(); g.fill(); g.stroke();
  ell(128, 122, 66, 60, "#1d2433");                                                     // head
  ell(102, 116, 21, 22, "#ffffff"); ell(154, 116, 21, 22, "#ffffff");                  // eyes
  g.fillStyle = INKC; g.beginPath(); g.arc(102 + look * 8, 120, 9, 0, 7); g.arc(154 + look * 8, 120, 9, 0, 7); g.fill();
  g.fillStyle = "#f2a33a"; g.beginPath(); g.moveTo(110, 142); g.lineTo(146, 142); g.lineTo(128, 172); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(98 + look * 8, 114, 3.5, 0, 7); g.arc(150 + look * 8, 114, 3.5, 0, 7); g.fill();
});

// ============================================================ Alice's gear (billboards aligned to her card)
export type Gear = { root: THREE.Group; bag: THREE.Group; up: THREE.Group; down: THREE.Group; badge: THREE.Group };
const shadesMesh = (w: number) => {
  const g = new THREE.Group(), blk = T("#16121a");
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(w * 0.46, w * 0.3, 0.02), blk); l.position.set(s * w * 0.26, 0, 0); g.add(l);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.16, w * 0.04), GL(1.6, 1.6, 1.8)); gl.position.set(s * w * 0.26 - w * 0.07, w * 0.07, 0.012); gl.rotation.z = 0.5; gl.layers.set(NOINK); g.add(gl); }
  const br = new THREE.Mesh(new THREE.BoxGeometry(w * 0.12, w * 0.04, 0.02), blk); g.add(br);
  return g;
};
export const makeGear = (c: SetCtx, x: number): Gear => {
  const root = new THREE.Group(); root.position.set(x, 0, 0); root.visible = false;
  const red = T("#d6253a"), dk = T("#8f1626"), gold = T("#e8b93a");
  const bag = new THREE.Group();
  bag.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.25, 0.1), red));
  const fl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.108), dk); fl.position.y = 0.085; bag.add(fl);
  const cl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, 0.114), gold); cl.position.y = 0.05; bag.add(cl);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.014, 6, 16, Math.PI), dk); hd.position.y = 0.125; bag.add(hd);
  bag.position.set(0.26, 0.45, 0.05); root.add(bag);
  const up = shadesMesh(0.4); up.position.set(0, 1.55, 0.06); up.rotation.z = 0.12; root.add(up);
  const down = shadesMesh(0.44); down.position.set(0, 1.37, 0.07); root.add(down);
  const badge = new THREE.Group();
  for (const s of [-1, 1]) { const rb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.01), T(s < 0 ? "#d9473b" : "#f2d23a")); rb.position.set(s * 0.07, 1.14, 0.02); rb.rotation.z = -s * 0.32; badge.add(rb); }
  const md = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 28), gold); md.rotation.x = Math.PI / 2; md.position.set(0, 0.93, 0.05); badge.add(md);
  const bt = ctex("nbA_badge", 256, 256, (g) => {
    g.fillStyle = "#f2c53a"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = INKC; g.stroke();
    g.strokeStyle = "#b8872a"; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.stroke();
    g.fillStyle = INKC; g.font = "bold 40px sans-serif"; g.textAlign = "center"; g.fillText("OFFICIAL", 128, 112); g.font = "bold 38px sans-serif"; g.fillText("PARTNER", 128, 158);
    g.fillStyle = "#b8872a"; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 1.2566; g.beginPath(); g.arc(128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80, 5, 0, 7); g.fill(); }
  });
  const bp = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28), new THREE.MeshBasicMaterial({ map: bt, side: D })); bp.position.set(0, 0.93, 0.065); badge.add(bp);
  root.add(badge);
  put(c, root, x); GEARS.push(root);
  return { root, bag, up, down, badge };
};
const GEARS: THREE.Group[] = [];
/** call from anim(f): billboard the gear onto the Alice card at (x,y,z) as seen from camPos. shades: 0 none, 1 pushed up on her head, 2 on her eyes */
export const placeGear = (g: Gear, cam: [number, number, number], p: { x: number; y: number; z: number; bag?: boolean; shades?: 0 | 1 | 2; badge?: boolean; bagSide?: -1 | 1; scale?: number }) => {
  g.root.visible = true; g.root.position.set(p.x, p.y, p.z); g.root.rotation.y = Math.atan2(cam[0] - p.x, cam[2] - p.z); g.root.scale.setScalar(p.scale ?? 1);
  g.bag.visible = p.bag ?? true; g.bag.position.x = 0.26 * (p.bagSide ?? 1);
  g.up.visible = (p.shades ?? 1) === 1; g.down.visible = p.shades === 2; g.badge.visible = !!p.badge;
};

// ============================================================ the chair with Jensen's leather jacket (line 2; reused by line 23)
export const buildChair = (c: SetCtx, x: number, o: { z?: number; y?: number; angle?: number } = {}) => {
  const root = new THREE.Group(); root.position.set(x, o.y ?? 0, o.z ?? 0);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); root.add(m); return m; };
  const maroon = T("#9b2f3f"), steel = T("#aab2bd"), dark = T("#3a3f4c");
  add(cylG(0.07, 0.07, 0.06), dark, 0, 0.17, 0); add(cylG(0.035, 0.035, 0.32), steel, 0, 0.34, 0);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(new THREE.BoxGeometry(0.34, 0.035, 0.05), dark, Math.cos(a) * 0.17, 0.1, Math.sin(a) * 0.17, 0, -a, 0); add(new THREE.SphereGeometry(0.04, 8, 6), steel, Math.cos(a) * 0.33, 0.05, Math.sin(a) * 0.33); }
  add(new THREE.BoxGeometry(0.58, 0.1, 0.54), maroon, 0, 0.52, 0);
  add(new THREE.BoxGeometry(0.56, 0.68, 0.1), maroon, 0, 0.92, -0.26, -0.08);
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.06, 0.05, 0.42), dark, s * 0.31, 0.74, -0.03); add(new THREE.BoxGeometry(0.05, 0.22, 0.05), dark, s * 0.31, 0.63, 0.12); }
  // the jacket, draped over the back and down the armrests: THE look (black leather, silver zip, lapels)
  const lea = T("#23232b"), lea2 = T("#3d3d4a"), zip = T("#c9ced6");
  const jk = new THREE.Group(); jk.position.set(0, 0, -0.17); root.add(jk);
  const ja = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); jk.add(m); return m; };
  ja(new THREE.BoxGeometry(0.62, 0.64, 0.17), lea, 0, 0.98, 0, -0.06);
  ja(new THREE.BoxGeometry(0.66, 0.1, 0.19), lea, 0, 1.31, -0.01, -0.1);                 // shoulders / collar line
  for (const s of [-1, 1]) {
    ja(cylG(0.075, 0.062, 0.62, 10), lea, s * 0.37, 0.98, 0.09, 0.28, 0, s * 0.1);        // sleeves hang forward over the arms
    ja(new THREE.SphereGeometry(0.068, 10, 8), lea2, s * 0.385, 0.67, 0.26);
    ja(new THREE.BoxGeometry(0.2, 0.3, 0.04), lea2, s * 0.15, 1.16, 0.1, 0.1, 0, -s * 0.52);  // lapel
    ja(new THREE.BoxGeometry(0.16, 0.03, 0.03), lea2, s * 0.15, 0.82, 0.095);               // pocket flap
    ja(new THREE.BoxGeometry(0.05, 0.05, 0.03), zip, s * 0.23, 1.31, 0.09);                 // stud
  }
  ja(new THREE.BoxGeometry(0.025, 0.58, 0.02), zip, 0, 0.98, 0.095);
  ja(new THREE.PlaneGeometry(0.1, 0.4), GL(0.9, 0.9, 1.1), 0.2, 1.05, 0.092, 0, 0, 0.12).layers.set(NOINK);   // leather shine
  // speed arcs (flat, translucent, spin faster than the chair)
  const arcs: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) { const a = new THREE.Mesh(new THREE.TorusGeometry(0.62 + i * 0.12, 0.012, 5, 28, 1.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.4, 1.5), transparent: true, opacity: 0.55, side: D })); a.rotation.x = Math.PI / 2; a.position.y = 0.3 + i * 0.5; a.layers.set(NOINK); root.add(a); arcs.push(a); }
  const chair = new THREE.Group(); root.children.slice().forEach((ch) => { if (!arcs.includes(ch as THREE.Mesh)) { root.remove(ch); chair.add(ch); } }); root.add(chair);
  put(c, root, x);
  const spin = (a: number) => { chair.rotation.y = a; arcs.forEach((m, i) => { m.rotation.z = -a * (1.6 + i * 0.4) + i * 2; m.visible = o.angle === undefined; }); };
  spin(o.angle ?? 0);
  return { root, spin };
};

// ============================================================ shared state read by shots
export const GEAR: Record<string, Gear> = {};
/** the stage chair: shots can read its spin if they want */
let STAGE_CAM_X = N_STAGE + 2, STAGE_CAM_Z = 7;

// ============================================================ line 1: globe of phones
const phoneTex = (ph: number) => ctex("nbA_ph" + ph, 360, 590, (g) => {
  g.fillStyle = "#f3f6fc"; g.fillRect(0, 0, 360, 590);
  g.fillStyle = "#2a2f3f"; g.fillRect(0, 0, 360, 36); g.fillStyle = "#ffffff"; g.font = "bold 22px sans-serif"; g.textAlign = "left"; g.fillText("9:41", 14, 26);
  g.fillStyle = "#4c7cf0"; g.fillRect(250, 12, 26, 14); g.fillRect(286, 12, 26, 14); g.fillRect(322, 12, 24, 14);
  g.fillStyle = "#ffffff"; rr(g, 12, 56, 336, 100, 50); g.fill(); g.lineWidth = 7; g.strokeStyle = "#4c7cf0"; g.stroke();
  g.strokeStyle = "#4c7cf0"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.arc(54, 104, 16, 0, 7); g.stroke(); g.beginPath(); g.moveTo(66, 116); g.lineTo(80, 130); g.stroke();
  const typed = ["who", "who is al", "who is alice h", "who is alice h"][ph];
  g.fillStyle = "#1d2433"; g.font = "bold 31px sans-serif"; g.textAlign = "left"; g.fillText(typed + (ph % 2 ? "|" : ""), 92, 116);
  for (let i = 0; i < 5; i++) {
    const y = 190 + i * 70;
    g.strokeStyle = "#9aa5bd"; g.lineWidth = 5; g.beginPath(); g.arc(40, y + 20, 10, 0, 7); g.stroke(); g.beginPath(); g.moveTo(47, y + 28); g.lineTo(54, y + 35); g.stroke();
    g.fillStyle = i < 2 ? "#aeb8cc" : "#d3dae8"; rr(g, 76, y + 6, 190 + ((i * 53) % 70), 24, 12); g.fill();
  }
  g.fillStyle = "#e0e6f2"; rr(g, 20, 560 - 90, 320, 70, 14); g.fill();
});
const oddTex = () => ctex("nbA_phodd", 360, 590, (g) => {
  g.fillStyle = "#f3f6fc"; g.fillRect(0, 0, 360, 590);
  g.fillStyle = "#2a2f3f"; g.fillRect(0, 0, 360, 36); g.fillStyle = "#ffffff"; g.font = "bold 22px sans-serif"; g.textAlign = "left"; g.fillText("9:41", 14, 26);
  g.fillStyle = "#ffffff"; rr(g, 12, 52, 336, 150, 40); g.fill(); g.lineWidth = 8; g.strokeStyle = "#f2a33a"; g.stroke();
  g.strokeStyle = "#f2a33a"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.arc(50, 90, 14, 0, 7); g.stroke(); g.beginPath(); g.moveTo(60, 100); g.lineTo(72, 112); g.stroke();
  g.fillStyle = "#1d2433"; g.font = "bold 40px sans-serif"; g.textAlign = "left"; g.fillText("how to fold a", 84, 112); g.fillText("fitted sheet", 84, 164);
  // a hopeless crumpled sheet
  g.fillStyle = "#cfe4f7"; g.strokeStyle = INKC; g.lineWidth = 8; g.lineJoin = "round";
  g.beginPath(); g.moveTo(70, 400); g.lineTo(120, 270); g.lineTo(190, 330); g.lineTo(250, 250); g.lineTo(300, 390); g.lineTo(270, 470); g.lineTo(160, 500); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = "#8fb6dc"; g.lineWidth = 6; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(110 + i * 28, 330 + (i % 2) * 40); g.quadraticCurveTo(150 + i * 20, 400, 130 + i * 30, 470); g.stroke(); }
  g.fillStyle = "#e2463a"; g.font = "bold 70px sans-serif"; g.textAlign = "center"; g.fillText("?!", 296, 270);
});
const gridTex = () => ctex("nbA_grid", 512, 512, (g) => {
  g.fillStyle = "#101c3e"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#2f8ad0"; g.lineWidth = 5; for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  g.strokeStyle = "#1f4f8f"; g.lineWidth = 2; for (let i = 64; i < 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  g.fillStyle = "#4fb0f0"; for (let i = 0; i < 20; i++) g.fillRect((i * 97) % 512, (i * 211) % 512, 10, 10);
});
const holoTex = (key: string, text: string) => ctex("nbA_holo" + key, 768, 192, (g) => {
  g.fillStyle = "rgba(10,40,90,0.9)"; rr(g, 6, 6, 756, 180, 90); g.fill(); g.lineWidth = 10; g.strokeStyle = "#5fd0ff"; g.stroke();
  g.strokeStyle = "#5fd0ff"; g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); g.arc(96, 92, 30, 0, 7); g.stroke(); g.beginPath(); g.moveTo(118, 114); g.lineTo(144, 140); g.stroke();
  g.fillStyle = "#ffffff"; g.font = "bold 66px sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(text, 176, 100);
});

const buildGlobe = (c: SetCtx) => {
  const ox = N_GLOBE, gy = 3.0, gz = -7, R0 = 2.35;
  const gm = TX(gridTex()); gm.map!.repeat.set(6, 8); gm.map!.needsUpdate = true;
  floor(c, gm, ox - 14, ox + 14, 8, -28, 0, 1, 1);
  const floorM = new THREE.Mesh(new THREE.PlaneGeometry(28, 36), new THREE.MeshBasicMaterial({ map: gridTex(), color: new THREE.Color(0.0, 0.0, 0.0), transparent: true, opacity: 0, side: D })); void floorM;
  // pillar + base disc
  addCyl(c, T("#2a3a62"), 1.15, 1.3, 0.14, ox, 0.07, gz); addCyl(c, T("#33477a"), 0.26, 0.3, 0.9, ox, 0.55, gz);
  mesh(c, new THREE.TorusGeometry(1.2, 0.04, 6, 40), GL(0.5, 1.4, 2.6), ox, 0.16, gz, Math.PI / 2, 0, 0, true);
  const globe = new THREE.Group(); globe.position.set(ox, gy, gz); put(c, globe, ox);
  const core = new THREE.Mesh(new THREE.SphereGeometry(R0 - 0.3, 24, 16), T("#0c1530")); globe.add(core);
  const scr = [0, 1, 2, 3].map((i) => new THREE.MeshBasicMaterial({ map: phoneTex(i), color: new THREE.Color(1.12, 1.12, 1.14) }));
  const oddM = new THREE.MeshBasicMaterial({ map: oddTex(), color: new THREE.Color(1.12, 1.12, 1.14) });
  const cases = ["#1d2433", "#2b3550", "#e8ecf4", "#3b82c4", "#d9473b", "#5ab07a", "#8a5ac9", "#f2a33a"].map(T);
  const screens: THREE.Mesh[] = [];
  const NVP = 124, ga = Math.PI * (3 - Math.sqrt(5));
  const mkPhone = (n: THREE.Vector3, k: number, odd = false) => {
    const g = new THREE.Group(), w = odd ? 0.66 : 0.58, h = odd ? 1.08 : 0.95;
    g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), cases[(k * 3) % cases.length]));
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.07), odd ? oddM : scr[k % 4]); s.position.z = 0.032; g.add(s); if (!odd) screens.push(s);
    g.position.copy(n).multiplyScalar(R0 + (odd ? 0.05 : 0)); g.up.set(Math.abs(n.y) > 0.97 ? 0 : 0, Math.abs(n.y) > 0.97 ? 0 : 1, Math.abs(n.y) > 0.97 ? 1 : 0);
    g.lookAt(g.position.clone().add(n)); g.rotateZ((hash(k) - 0.5) * 0.35); globe.add(g);
  };
  for (let i = 0; i < NVP; i++) { const y = 1 - (i + 0.5) * (2 / NVP), r = Math.sqrt(1 - y * y), th = i * ga; mkPhone(V(Math.cos(th) * r, y, Math.sin(th) * r), i); }
  // the one odd phone faces the lens at the end of the shot (the globe has turned by OMEGA * 2.52 s by then)
  const OMEGA = 0.5, endA = OMEGA * 2.52; const w = V(0.1, -0.12, 1).normalize();
  const lc = w.clone().applyAxisAngle(V(0, 1, 0), -endA); mkPhone(lc, 999, true);
  // stars + rings + hologram search bars
  const sp: number[] = []; for (let i = 0; i < 260; i++) sp.push(ox + (hash(i, 1) - 0.5) * 60, 0.5 + hash(i, 2) * 22, gz - 4 - hash(i, 3) * 26);
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: new THREE.Color(2, 2, 2.4), size: 0.16, sizeAttenuation: true })); stars.layers.set(NOINK); stars.frustumCulled = false; put(c, stars, ox);
  const rings = [0, 1].map((i) => mesh(c, new THREE.TorusGeometry(3.5 + i * 0.7, 0.025, 6, 64), GL(0.6, 1.5, 2.8), ox, gy, gz, Math.PI / 2 + 0.35 - i * 0.7, 0, 0.3 * (i ? -1 : 1), true));
  const holos: [number, number, number, number, string][] = [[-8, 3.2, -14, 0.25, "who is alice h…"], [8.5, 5.4, -15, -0.3, "who is alice h…"], [-5, 7.8, -19, 0.1, "who is alice h…"], [5.5, 1.8, -17, -0.15, "who is alice h…"], [0, 9.5, -21, 0, "who is alice h…"], [-10.5, 7, -17, 0.4, "who is alice h…"], [11, 8.4, -20, -0.4, "who is alice h…"]];
  const hm = holos.map(([dx, y, z, ry, t], i) => pl(c, holoTex("a" + (i % 2), t), 3.6, 0.9, ox + dx, y, z, ry, true, true, 1.25));
  for (let i = 0; i < 8; i++) c.lamp(ox + (hash(i, 7) - 0.5) * 16, 0.04, gz - 3 - hash(i, 8) * 12, 2.4, 0, [0.15, 0.35, 0.8]);
  c.lamp(ox, gy, gz, 11, 0, [0.28, 0.5, 1.0]);
  c.onFrame((f, set) => {
    const t = f / FPS;
    globe.rotation.y = OMEGA * t; globe.rotation.z = 0.2;
    rings.forEach((r, i) => { r.rotation.z = (i ? -1 : 1) * t * 0.4; });
    hm.forEach((h, i) => { h.position.y += Math.sin(t * 1.2 + i) * 0.0008; });
    if (set !== SET.globe) return;
    const ph = Math.floor(t * 3.2);
    screens.forEach((s, i) => { s.material = scr[(ph + (i % 4) + Math.floor(i / 5)) % 4]; });
  });
};

// ============================================================ lines 2: the stage, the chair, a thousand heads
const ROWS = 24, COLS = 42, DX = 0.62, DZ = 0.62, RISE = 0.3, Z0 = -3.95;
const NOODLE_X = N_STAGE + 0.35, NOODLE_Z = -3.62;
export const STAGE = { chair: [N_STAGE - 1.5, 0, 0.1] as [number, number, number], noodle: [NOODLE_X, 0, NOODLE_Z] as [number, number, number], turnAt: 5.62 };
const bowlTex = () => ctex("nbA_noodle", 64, 256, (g) => {
  g.clearRect(0, 0, 64, 256); g.strokeStyle = INKC; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(8, 60, 56, 100, 28, 160); g.bezierCurveTo(12, 200, 44, 220, 32, 250); g.stroke();
  g.strokeStyle = "#f6e3a1"; g.lineWidth = 9; g.beginPath(); g.moveTo(32, 6); g.bezierCurveTo(8, 60, 56, 100, 28, 160); g.bezierCurveTo(12, 200, 44, 220, 32, 250); g.stroke();
});
const bannerTex = () => ctex("nbA_jumbo", 1024, 400, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 400); gr.addColorStop(0, "#1b3a8f"); gr.addColorStop(1, "#0d1f55"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 400);
  g.fillStyle = "#e23a2e"; g.fillRect(0, 30, 330, 90); g.fillStyle = "#ffffff"; g.font = "bold 62px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BREAKING", 165, 77);
  g.font = "bold 76px sans-serif"; g.fillText("BOSS OF THE WORLD'S MOST", 512, 200); g.fillText("POWERFUL COMPANY QUITS", 512, 290);
  g.fillStyle = "#f2d23a"; g.fillRect(0, 350, 1024, 50); g.fillStyle = INKC; g.font = "bold 34px sans-serif"; g.fillText("WHO IS ALICE?   WHY NOW?   WHO IS ALICE?   WHY NOW?", 512, 376);
  g.lineWidth = 14; g.strokeStyle = INKC; g.strokeRect(7, 7, 1010, 386);
});
const signStick = (c: SetCtx, tex: THREE.Texture, x: number, y: number, z: number, ry: number) => { mesh(c, new THREE.BoxGeometry(0.03, 0.9, 0.03), T("#e8cfa0"), x, y - 0.5, z); return pl(c, tex, 0.9, 0.55, x, y, z, ry); };

const buildStage = (c: SetCtx) => {
  const ox = N_STAGE;
  const stage = T("#2c2f55");
  floor(c, T("#1d2140"), ox - 22, ox + 22, 12, -3.4, 0, 1, 1);
  // stage disc with rings under the chair
  const ringT = ctex("nbA_stagering", 512, 512, (g) => { g.fillStyle = "#232850"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 6; i++) { g.strokeStyle = i % 2 ? "#3a4388" : "#f2c14e"; g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 40 + i * 40, 0, 7); g.stroke(); } });
  const disc = mesh(c, new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({ map: ringT, side: D }), STAGE.chair[0], 0.012, STAGE.chair[2], -Math.PI / 2, 0, 0); void disc;
  // tiers
  for (let r = 0; r < ROWS; r++) {
    const z = Z0 - r * DZ, y = r * RISE;
    bx(c, r % 2 ? stage : T("#3a3f78"), ox - 16, 0, z - DZ / 2, ox + 16, y + 0.02, z + DZ / 2);
    if (r % 6 === 0) { for (const s of [-1, 1]) bx(c, T("#e8cfa0"), ox + s * 16 - 0.05, y, z - 0.05, ox + s * 16 + 0.05, y + 1.0, z + 0.05); }
  }
  // arena shell: back wall, side walls, ceiling rig
  const Zb = Z0 - ROWS * DZ - 1.2, Hy = 16;
  wallZ(c, T("#171a38"), ox - 22, ox + 22, 0, Hy, Zb, 1, 1);
  wallX(c, T("#1a1e40"), ox - 22, 12, Zb, 0, Hy); wallX(c, T("#1a1e40"), ox + 22, 12, Zb, 0, Hy);
  ceil(c, T("#12142c"), ox - 22, ox + 22, 12, Zb, Hy);
  for (let i = 0; i < 9; i++) { const zz = 10 - i * 4.4; for (const s of [-1, 1]) { bx(c, T("#2a2f55"), ox + s * 8 - 0.3, Hy - 1.2, zz - 0.2, ox + s * 8 + 0.3, Hy, zz + 0.2); bulb(c, ox + s * 8, Hy - 1.35, zz, 0.2, [3, 2.8, 2.2]); } }
  for (let i = 0; i < 14; i++) c.lamp(ox + (i % 7 - 3) * 6, 11.5, 6 - Math.floor(i / 7) * 14, 3.4, 0, [0.5, 0.45, 0.35]);
  // jumbotron
  pl(c, bannerTex(), 15, 5.9, ox, 10.2, Zb + 0.1, 0, false, true, 1.0);
  c.lamp(ox, 10.2, Zb + 0.4, 9, 0, [0.35, 0.5, 1.0]);
  // flag pennants + foam signs scattered in the stands
  const q1 = sign("nbA_q1", 320, 200, "#ffffff", "#e23a2e", ["WHO IS", "ALICE?"], 64), q2 = sign("nbA_q2", 320, 200, "#f2d23a", INKC, ["WHY??"], 90), q3 = sign("nbA_q3", 320, 200, "#d9f0ff", "#1b3a8f", ["???"], 100);
  const spots: [number, number, THREE.Texture][] = [[-5.6, 9, q1], [3.9, 7, q2], [7.4, 12, q3], [-2.2, 14, q1], [-9.2, 6, q2], [10.5, 5, q1]];
  spots.forEach(([dx, r, t]) => signStick(c, t, ox + dx, r * RISE + 2.15, Z0 - r * DZ + 0.15, 0));
  // barrier + the noodle man's bowl
  bx(c, T("#d9473b"), ox - 16, 0, -3.3, ox + 16, 0.86, -3.12); bx(c, T("#ffffff"), ox - 16, 0.64, -3.11, ox + 16, 0.74, -3.1);
  // crowd
  const crowdN = ROWS * COLS;
  const skins = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067", "#8d5a3a"].map((s) => new THREE.Color(s));
  const hairs = ["#2a2420", "#7a4a2a", "#17141a", "#b9b2a6", "#c9a24a", "#5a3b2a"].map((s) => new THREE.Color(s));
  const shirts = ["#d9473b", "#3b82c4", "#e0b43a", "#5ab07a", "#8a5ac9", "#e07a3a", "#ffffff", "#3b3f52"].map((s) => new THREE.Color(s));
  const white = () => twoTone(new THREE.MeshLambertMaterial({ color: "#ffffff", side: D }));
  const inst = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.InstancedMesh(geo, mat, crowdN); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; return put(c, m, ox); };
  const headG = new THREE.SphereGeometry(0.25, 16, 12);
  const hairTop = new THREE.SphereGeometry(0.262, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.5), hairBack = new THREE.SphereGeometry(0.262, 14, 10, Math.PI, Math.PI, 0, Math.PI * 0.82);
  const hairG = mergeGeometries([hairTop.toNonIndexed(), hairBack.toNonIndexed()], false);
  const heads = inst(headG, white()), hair = inst(hairG, white()), eyeL = inst(new THREE.SphereGeometry(0.042, 8, 6), T(INKC)), eyeR = inst(new THREE.SphereGeometry(0.042, 8, 6), T(INKC));
  const mouth = inst(new THREE.SphereGeometry(0.04, 8, 6), T("#5a1e28")), bodies = inst(new THREE.BoxGeometry(0.5, 0.62, 0.3), white());
  const info: { x: number; y: number; z: number; yaw0: number; t0: number; yawT: number; row: number; skip: boolean }[] = [];
  const dm = new THREE.Object3D(), col = new THREE.Color();
  let n = 0;
  for (let r = 0; r < ROWS; r++) for (let k = 0; k < COLS; k++) {
    const hx = ox + (k - (COLS - 1) / 2) * DX + (r % 2 ? DX / 2 : 0), hz = Z0 - r * DZ, hy = r * RISE + 1.18;
    const skip = r === 0 && Math.abs(hx - NOODLE_X) < 0.7;
    const side = hash(n, 4) < 0.5 ? -1 : 1, yaw0 = skip ? 0 : side * (0.75 + hash(n, 5) * 1.6) + (hash(n, 6) < 0.1 ? Math.PI * side : 0);
    info.push({ x: hx, y: hy, z: hz, yaw0, t0: STAGE.turnAt + hash(n, 7) * 0.4 + r * 0.004, yawT: Math.atan2(STAGE_CAM_X - hx, STAGE_CAM_Z - hz), row: r, skip });
    // static bits
    dm.position.set(hx, hy - 0.62, hz); dm.rotation.set(0, 0, 0); dm.scale.setScalar(skip ? 0.0001 : 1); dm.updateMatrix(); bodies.setMatrixAt(n, dm.matrix);
    col.copy(shirts[Math.floor(hash(n, 8) * shirts.length)]); bodies.setColorAt(n, col);
    dm.position.set(hx, hy, hz); dm.updateMatrix(); heads.setMatrixAt(n, dm.matrix); col.copy(skins[Math.floor(hash(n, 9) * skins.length)]); heads.setColorAt(n, col);
    hair.setColorAt(n, hairs[Math.floor(hash(n, 10) * hairs.length)]);
    n++;
  }
  const upd = (t: number) => {
    const o = new THREE.Object3D();
    info.forEach((h, i) => {
      let yaw = h.yaw0;
      if (!h.skip) { const u = (t - h.t0) / 0.2; if (u >= 1) yaw = h.yawT; else if (u > 0) yaw = h.yaw0 + (h.yawT - h.yaw0) * back(u); }
      const sc = h.skip ? 0.0001 : 1;
      o.rotation.set(0, yaw, 0); o.scale.setScalar(sc);
      o.position.set(h.x, h.y, h.z); o.updateMatrix(); hair.setMatrixAt(i, o.matrix);
      const bob = h.skip ? 0 : Math.max(0, Math.sin((t - h.t0 + 0.2) * 14)) * (t > h.t0 + 0.2 && t < h.t0 + 0.9 ? 0.02 : 0);
      for (const [m, ex, ey, ez, s] of [[eyeL, -0.092, 0.035, 0.226, 1], [eyeR, 0.092, 0.035, 0.226, 1], [mouth, 0, -0.1, 0.235, t > h.t0 && t < h.t0 + 1.6 ? 1.5 : 0.7]] as [THREE.InstancedMesh, number, number, number, number][]) {
        const ox2 = Math.sin(yaw) * ez + Math.cos(yaw) * ex, oz2 = Math.cos(yaw) * ez - Math.sin(yaw) * ex;
        o.position.set(h.x + ox2, h.y + ey + bob, h.z + oz2); o.rotation.set(0, yaw, 0); o.scale.setScalar(sc * s); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      }
    });
    for (const m of [hair, eyeL, eyeR, mouth]) m.instanceMatrix.needsUpdate = true;
    if (hair.instanceColor) hair.instanceColor.needsUpdate = true;
  };
  for (const m of [heads, bodies]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  // noodle man's bowl, strand, steam
  const bowl = new THREE.Group(); bowl.position.set(NOODLE_X, 0.86, NOODLE_Z + 0.55); put(c, bowl, ox);
  const bowlM = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), T("#ffffff")); bowlM.position.y = 0.17; bowl.add(bowlM);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 6, 24), T("#d9473b")); rim.rotation.x = Math.PI / 2; rim.position.y = 0.17; bowl.add(rim);
  const nood = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), T("#f6e3a1")); nood.rotation.x = -Math.PI / 2; nood.position.y = 0.16; bowl.add(nood);
  for (const s of [-1, 1]) { const ck = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.38, 5), T("#3b2a1e")); ck.position.set(s * 0.04 + 0.1, 0.34, -0.02); ck.rotation.z = 0.25; bowl.add(ck); }
  const strand = pl(c, bowlTex(), 0.1, 0.42, NOODLE_X + 0.02, 1.12, NOODLE_Z + 0.5, 0, true, true);
  const steam: THREE.Mesh[] = [0, 1, 2].map((i) => mesh(c, new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: c.glowTex(), color: new THREE.Color(0.9, 0.9, 0.95), transparent: true, depthWrite: false, opacity: 0.5 }), NOODLE_X, 1.1, NOODLE_Z + 0.5, 0, 0, 0, true));
  // chair + spotlight
  const chair = buildChair(c, STAGE.chair[0], { z: STAGE.chair[2] });
  const cone = mesh(c, new THREE.CylinderGeometry(0.4, 2.1, 15, 28, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.38, 0.33, 0.2), transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending, side: D }),
    STAGE.chair[0], 7.5, STAGE.chair[2], 0, 0, 0, true); cone.renderOrder = 3;
  c.lamp(STAGE.chair[0], 3.0, STAGE.chair[2] + 0.2, 4.2, 0, [1.0, 0.82, 0.5]);
  c.onFrame((f, set) => {
    if (set !== SET.stage) return;
    const t = f / FPS - 2.52, ts = f / FPS;
    chair.spin(ts * 3.1);
    upd(ts);
    const k = (ts * 0.9) % 1;
    strand.position.y = 1.0 + 0.2 * (0.5 - 0.5 * Math.cos(ts * 5.4)); strand.scale.y = 0.55 + 0.45 * (0.5 - 0.5 * Math.cos(ts * 5.4)); strand.rotation.z = Math.sin(ts * 3) * 0.12;
    steam.forEach((s, i) => { const u = (k + i / 3) % 1; s.position.set(NOODLE_X + 0.04 + Math.sin(u * 6 + i) * 0.04, 1.08 + u * 0.5, NOODLE_Z + 0.58); s.scale.setScalar(0.4 + u); (s.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - u); });
    void t;
  });
};

// ============================================================ line 3: the internet's family tree
const faceCard = (key: string, w: number, h: number, o: { hair: string; skin: string; style: "swept" | "long" | "bald" | "bob" | "cap" | "bun"; grin?: boolean; shades?: boolean; label?: string; bg?: string; collar?: string; fontPx?: number }) =>
  ctex(key, w, h, (g) => {
    g.fillStyle = o.bg ?? "#ffffff"; g.fillRect(0, 0, w, h); g.lineWidth = 10; g.strokeStyle = INKC; g.strokeRect(5, 5, w - 10, h - 10);
    const cx = w / 2, cy = h * 0.42, R = w * 0.3;
    g.lineJoin = "round"; g.lineWidth = 8; g.strokeStyle = INKC;
    if (o.style === "long") { g.fillStyle = o.hair; rr(g, cx - R * 1.15, cy - R * 1.0, R * 2.3, h * 0.55, R * 0.6); g.fill(); g.stroke(); }
    if (o.collar) { g.fillStyle = o.collar; g.beginPath(); g.moveTo(cx - R * 1.3, h * 0.78); g.quadraticCurveTo(cx, cy + R * 0.9, cx + R * 1.3, h * 0.78); g.lineTo(cx + R * 1.3, h * 0.86); g.lineTo(cx - R * 1.3, h * 0.86); g.closePath(); g.fill(); g.stroke(); }
    g.fillStyle = o.skin; g.beginPath(); g.ellipse(cx, cy, R, R * 1.08, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = o.hair;
    if (o.style === "swept") { g.beginPath(); g.moveTo(cx - R * 1.02, cy - R * 0.1); g.bezierCurveTo(cx - R * 1.1, cy - R * 1.5, cx + R * 0.7, cy - R * 1.6, cx + R * 1.1, cy - R * 0.5); g.bezierCurveTo(cx + R * 0.4, cy - R * 0.95, cx - R * 0.3, cy - R * 0.6, cx - R * 1.02, cy - R * 0.1); g.fill(); g.stroke(); }
    if (o.style === "long") { g.beginPath(); g.moveTo(cx - R * 1.04, cy + R * 0.1); g.bezierCurveTo(cx - R * 1.1, cy - R * 1.5, cx + R * 1.1, cy - R * 1.5, cx + R * 1.04, cy + R * 0.1); g.bezierCurveTo(cx + R * 0.6, cy - R * 0.7, cx - R * 0.6, cy - R * 0.7, cx - R * 1.04, cy + R * 0.1); g.fill(); g.stroke(); }
    if (o.style === "bob") { g.beginPath(); g.moveTo(cx - R * 1.05, cy + R * 0.5); g.bezierCurveTo(cx - R * 1.2, cy - R * 1.6, cx + R * 1.2, cy - R * 1.6, cx + R * 1.05, cy + R * 0.5); g.lineTo(cx + R * 0.8, cy - R * 0.2); g.lineTo(cx - R * 0.8, cy - R * 0.2); g.closePath(); g.fill(); g.stroke(); }
    if (o.style === "cap") { g.fillStyle = "#3b82c4"; g.beginPath(); g.moveTo(cx - R * 1.05, cy - R * 0.2); g.bezierCurveTo(cx - R, cy - R * 1.4, cx + R, cy - R * 1.4, cx + R * 1.05, cy - R * 0.2); g.lineTo(cx + R * 1.5, cy - R * 0.2); g.lineTo(cx - R * 1.05, cy - R * 0.2); g.fill(); g.stroke(); }
    if (o.style === "bun") { g.beginPath(); g.arc(cx, cy - R * 1.25, R * 0.4, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(cx, cy - R * 0.55, R * 1.02, R * 0.6, 0, Math.PI, 0); g.fill(); g.stroke(); }
    if (o.shades) { g.fillStyle = "#16121a"; rr(g, cx - R * 0.95, cy - R * 1.12, R * 0.88, R * 0.34, R * 0.1); g.fill(); rr(g, cx + R * 0.07, cy - R * 1.12, R * 0.88, R * 0.34, R * 0.1); g.fill(); }
    g.fillStyle = INKC; g.beginPath(); g.arc(cx - R * 0.36, cy + R * 0.08, R * 0.1, 0, 7); g.arc(cx + R * 0.36, cy + R * 0.08, R * 0.1, 0, 7); g.fill();
    g.lineWidth = 7; g.lineCap = "round"; g.beginPath();
    if (o.grin) { g.fillStyle = "#5a1e28"; g.moveTo(cx - R * 0.45, cy + R * 0.42); g.quadraticCurveTo(cx, cy + R * 1.0, cx + R * 0.45, cy + R * 0.42); g.closePath(); g.fill(); g.stroke(); }
    else { g.moveTo(cx - R * 0.3, cy + R * 0.5); g.quadraticCurveTo(cx, cy + R * 0.62, cx + R * 0.3, cy + R * 0.5); g.stroke(); }
    g.fillStyle = INKC; g.font = `bold ${o.fontPx ?? Math.round(w * 0.2)}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(o.label ?? "HUANG", cx, h * 0.92);
  });
const redX = () => ctex("nbA_redx", 512, 512, (g) => {
  g.lineCap = "round";
  for (const [w, col] of [[96, INKC], [76, "#ffffff"], [58, "#e0202e"]] as [number, string][]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(50, 50); g.lineTo(462, 462); g.moveTo(462, 50); g.lineTo(50, 462); g.stroke(); }
});
const noteTex = (key: string, lines: string[]) => ctex(key, 256, 256, (g) => {
  g.fillStyle = "#ffe46a"; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 232, 256, 24); g.strokeStyle = INKC; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248);
  g.fillStyle = "#c2271d"; g.font = "bold 42px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; lines.forEach((s, i) => g.fillText(s, 128, 128 + (i - (lines.length - 1) / 2) * 50));
});
export const TREE = { board: [N_TREE, 2.7, -4.12] as [number, number, number], xAt: 8.2, alice: [N_TREE - 2.4, 0, 0.2] as [number, number, number] };
const buildTree = (c: SetCtx) => {
  const ox = N_TREE, zb = -4.2;
  floor(c, c.M.planks, ox - 7.5, ox + 7.5, 8, zb, 0, 3, 3);
  wallZ(c, T("#5b3f35"), ox - 7.5, ox + 7.5, 0, 6, zb, 1, 1); wallX(c, T("#4d352d"), ox - 7.5, 8, zb, 0, 6); wallX(c, T("#4d352d"), ox + 7.5, 8, zb, 0, 6);
  ceil(c, T("#3a2923"), ox - 7.5, ox + 7.5, 8, zb, 6);
  bx(c, T("#2c1d19"), ox - 7.5, 0, zb + 0.01, ox + 7.5, 0.5, zb + 0.06);
  // the board: cork, frame, title
  const cork = ctex("nbA_cork", 512, 512, (g, r) => { g.fillStyle = "#c28a55"; g.fillRect(0, 0, 512, 512); for (let i = 0; i < 700; i++) { g.fillStyle = r() < 0.5 ? "#a8723f" : "#d9a066"; g.fillRect(r() * 512, r() * 512, 4 + r() * 6, 3 + r() * 4); } });
  const BW = 7.6, BH = 4.3, by = 2.65;
  wallZ(c, TX(cork), ox - BW / 2, ox + BW / 2, by - BH / 2, by + BH / 2, zb + 0.07, 3, 2);
  bx(c, T("#6b3f23"), ox - BW / 2 - 0.15, by - BH / 2 - 0.15, zb + 0.06, ox + BW / 2 + 0.15, by - BH / 2, zb + 0.18); bx(c, T("#6b3f23"), ox - BW / 2 - 0.15, by + BH / 2, zb + 0.06, ox + BW / 2 + 0.15, by + BH / 2 + 0.15, zb + 0.18);
  bx(c, T("#6b3f23"), ox - BW / 2 - 0.15, by - BH / 2, zb + 0.06, ox - BW / 2, by + BH / 2, zb + 0.18); bx(c, T("#6b3f23"), ox + BW / 2, by - BH / 2, zb + 0.06, ox + BW / 2 + 0.15, by + BH / 2, zb + 0.18);
  const zc = zb + 0.12;
  pl(c, sign("nbA_treehead", 1400, 220, "#f4efe0", INKC, ["THE HUANG FAMILY TREE"], 120), 5.0, 0.8, ox, by + BH / 2 + 0.6, zc - 0.02);
  pl(c, sign("nbA_treesub", 700, 110, "#f4efe0", "#c2271d", ["(INTERNET EDITION)"], 62), 2.4, 0.38, ox, by + BH / 2 + 0.09, zc + 0.06 - 0.5 * 0);
  // nodes (board coords u,v in metres) and edges
  const N: [number, number, number][] = [[-1.4, 1.55, 0.62], [0.2, 1.62, 0.62], [1.6, 1.5, 0.62], [-2.5, 0.35, 0.62], [-0.9, 0.5, 0.62], [0.8, 0.5, 0.62], [2.4, 0.4, 0.62], [-1.7, -1.1, 0.62], [-0.2, -1.2, 0.62], [1.0, -1.15, 0.62], [3.0, -1.7, 0.5], [-3.1, -1.65, 0.5]];
  const E: [number, number][] = [[0, 3], [0, 4], [1, 4], [1, 5], [2, 5], [2, 6], [3, 7], [4, 7], [4, 8], [5, 9], [6, 9], [6, 10], [3, 11]];
  const P = (u: number, v: number): [number, number] => [ox + u, by + v];
  const edge = (a: [number, number], b: [number, number], z: number, th: number, mat: THREE.Material) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    return mesh(c, new THREE.BoxGeometry(len, th, th), mat, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z, 0, 0, Math.atan2(dy, dx));
  };
  E.forEach(([i, j]) => edge(P(N[i][0], N[i][1]), P(N[j][0], N[j][1]), zc + 0.01, 0.014, T("#3a3340")));
  const styles: ("swept" | "long" | "bald" | "bob" | "cap" | "bun")[] = ["bob", "cap", "bun", "bald", "swept", "long", "cap", "bun", "bob", "bald", "cap", "bun"];
  N.forEach(([u, v, s], i) => {
    const [x, y] = P(u, v);
    pl(c, faceCard("nbA_hc" + i, 256, 300, { hair: ["#2a2420", "#7a4a2a", "#b9b2a6", "#c9a24a"][i % 4], skin: ["#ffe2c2", "#f5c9a0", "#c99067", "#ecd0b6"][(i * 3) % 4], style: styles[i], grin: i % 3 === 0, bg: i % 2 ? "#fbf6e8" : "#f1f6fb" }), s, s * 1.17, x, y, zc + 0.02 + (i % 3) * 0.003, ((i % 5) - 2) * 0.0);
    bulb(c, x, y + s * 0.62, zc + 0.05, 0.035, [2.4, 0.6, 0.5]);
  });
  // the two big portraits: Jensen (silver swept hair, leather) and Alice (long black hair, shades on head)
  const J = P(-2.2, 1.2), A = P(2.2, -0.85);
  pl(c, faceCard("nbA_jens", 320, 380, { hair: "#cfd0d6", skin: "#ecd0b6", style: "swept", grin: true, collar: "#23232b", label: "HUANG", fontPx: 72 }), 1.15, 1.36, J[0], J[1], zc + 0.04);
  pl(c, faceCard("nbA_alic", 320, 380, { hair: "#16121a", skin: "#f5c9a0", style: "long", grin: false, shades: true, collar: "#efe4cf", label: "HUANG", fontPx: 72 }), 1.15, 1.36, A[0], A[1], zc + 0.04);
  // the red string, pinned at both ends, sagging a little
  const redM = T("#e0202e"); const pa: [number, number] = [J[0] + 0.45, J[1] - 0.45], pb: [number, number] = [A[0] - 0.45, A[1] + 0.35];
  const seg = 10; let prev = pa;
  for (let i = 1; i <= seg; i++) { const u = i / seg, x = pa[0] + (pb[0] - pa[0]) * u, y = pa[1] + (pb[1] - pa[1]) * u - Math.sin(u * Math.PI) * 0.12; edge(prev, [x, y], zc + 0.07, 0.03, redM); prev = [x, y]; }
  for (const p of [pa, pb]) mesh(c, new THREE.SphereGeometry(0.07, 10, 8), T("#e0202e"), p[0], p[1], zc + 0.09);
  for (const p of [pa, pb]) mesh(c, new THREE.SphereGeometry(0.1, 10, 8), T("#a31620"), p[0], p[1], zc + 0.07);
  // sticky notes
  [[-3.1, 0.2, "nbA_n1", ["SAME NAME", "= FAMILY??"], 0.1], [3.05, 1.5, "nbA_n2", ["TRUST ME"], -0.08], [0.3, -0.45, "nbA_n3", ["SPOOKY"], 0.06]].forEach(([u, v, k, l, rz], i) => {
    const [x, y] = P(u as number, v as number); const m = pl(c, noteTex(k as string, l as string[]), 0.7, 0.7, x, y, zc + 0.12 + i * 0.005); m.rotation.z = rz as number;
  });
  // the giant X: hidden until "No relation." (8.2 s)
  const xm = pl(c, redX(), 2.7, 2.7, (J[0] + A[0]) / 2, (J[1] + A[1]) / 2 - 0.06, zc + 0.3, 0, true, true); xm.visible = false;
  // desk, laptop, lamp, mugs in front
  bx(c, c.M.wood, ox + 1.4, 0, -2.6, ox + 4.2, 0.82, -1.1, 1); bx(c, T("#e8cfa0"), ox + 1.35, 0.82, -2.65, ox + 4.25, 0.88, -1.05);
  bx(c, T("#2a2f3f"), ox + 2.4, 0.88, -1.8, ox + 3.2, 0.9, -1.4); bx(c, T("#2a2f3f"), ox + 2.4, 0.88, -1.95, ox + 3.2, 1.35, -1.9);
  pl(c, ctex("nbA_lapscr", 256, 160, (g) => { g.fillStyle = "#eaf3ff"; g.fillRect(0, 0, 256, 160); g.fillStyle = "#1d2433"; g.font = "bold 22px sans-serif"; g.textAlign = "left"; g.fillText("who is alice h…", 16, 50); g.fillStyle = "#c9d6ee"; for (let i = 0; i < 4; i++) g.fillRect(16, 76 + i * 20, 180 + i * 10, 10); }), 0.74, 0.42, ox + 2.8, 1.12, -1.885, 0, false, true, 1.2);
  addCyl(c, T("#f6f1e6"), 0.07, 0.06, 0.12, ox + 3.6, 0.94, -1.5); addCyl(c, T("#d9473b"), 0.07, 0.06, 0.12, ox + 1.9, 0.94, -2.0);
  bx(c, T("#e0a24a"), ox + 1.6, 0.88, -1.4, ox + 2.2, 0.94, -1.1); // pizza box
  addCyl(c, T("#2a2f3f"), 0.14, 0.14, 0.03, ox + 3.9, 0.91, -2.3); addCyl(c, T("#2a2f3f"), 0.02, 0.02, 0.5, ox + 3.9, 1.14, -2.3); mesh(c, new THREE.ConeGeometry(0.2, 0.2, 14, 1, true), T("#2f6a4a"), ox + 3.9, 1.5, -2.3);
  c.lamp(ox + 3.9, 1.46, -2.3, 1.5, 0.9, [1.0, 0.7, 0.35]);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.4, 20, 1, true), T("#c5a23a")); shade.position.set(ox, 5.2, -2.6); put(c, shade, ox);
  mesh(c, cylG(0.01, 0.01, 0.9, 6), T("#2a2420"), ox, 5.8, -2.6); bulb(c, ox, 5.0, -2.6, 0.12, [3.2, 2.8, 1.8]);
  c.lamp(ox, 5.0, -2.6, 2.2, 0, [1.0, 0.75, 0.4]); c.wash(ox, 2.65, zb + 0.2, 8.4, 5.6, 0, 0.55);
  // a bookshelf + files on the left for density
  bx(c, c.M.wood, ox - 6.9, 0, -3.8, ox - 5.4, 2.4, -2.6); for (let i = 0; i < 14; i++) bx(c, [T("#d9473b"), T("#e8cfa0"), T("#3b82c4"), T("#5ab07a")][i % 4], ox - 6.7 + (i % 7) * 0.2, 0.2 + Math.floor(i / 7) * 1.0, -3.0, ox - 6.55 + (i % 7) * 0.2, 0.9 + Math.floor(i / 7) * 1.0, -2.65);
  plant(c, ox - 4.8, -3.4, 1.3);
  c.onFrame((f, set) => {
    if (set !== SET.tree) return;
    const k = (f / FPS - TREE.xAt) / 0.18; xm.visible = k > 0;
    const s = k <= 0 ? 0.001 : k < 1 ? back(k) * 1.0 : 1 + Math.sin((f / FPS - TREE.xAt) * 9) * 0.015 * Math.max(0, 1 - (f / FPS - TREE.xAt - 0.3));
    xm.scale.setScalar(Math.max(0.001, s)); xm.rotation.z = (1 - Math.min(1, Math.max(0, k))) * 0.5;
  });
};

// ============================================================ line 4a: the staircase of spreadsheets and the elevator penguin
const sheetTex = (v: number) => ctex("nbA_sheet" + v, 512, 192, (g, r) => {
  g.fillStyle = v % 2 ? "#ffffff" : "#f7fff7"; g.fillRect(0, 0, 512, 192);
  g.fillStyle = "#d9e0d9"; g.fillRect(0, 0, 512, 28); g.fillRect(0, 0, 44, 192);
  g.strokeStyle = "#5fa66a"; g.lineWidth = 3; for (let x = 44; x <= 512; x += 78) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 192); g.stroke(); } for (let y = 28; y <= 192; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.fillStyle = "#2a3a2d"; g.font = "bold 18px sans-serif"; g.textAlign = "right"; g.textBaseline = "middle";
  for (let rI = 0; rI < 5; rI++) for (let cI = 0; cI < 6; cI++) g.fillText(String(Math.floor(r() * 9000 + 100)), 44 + (cI + 1) * 78 - 8, 28 + rI * 32 + 17);
  g.textAlign = "center"; "ABCDEF".split("").forEach((ch, i) => g.fillText(ch, 44 + i * 78 + 39 + 0, 15));
  g.fillStyle = "#c2271d"; g.fillRect(44 + (v % 4) * 78, 28 + (v % 3) * 32, 78, 32); g.fillStyle = "#fff"; g.textAlign = "right"; g.fillText("#REF!", 44 + (v % 4) * 78 + 70, 28 + (v % 3) * 32 + 17);
});
export const STAIR = { x: N_STAIRS, z0: -1.0, run: 0.42, rise: 0.28, n: 14, y: (z: number) => (((-1.0 - z) / 0.42) + 0.5) * 0.28, top: 14 * 0.28, elevZ: -10.5 };
const buildStairs = (c: SetCtx) => {
  const ox = N_STAIRS, S = STAIR, topY = S.top;
  const W = 4.4, H = 7.2, zb = -13;
  floor(c, TX(ctex("nbA_carp", 256, 256, (g, r) => { g.fillStyle = "#3a4a63"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? "#34445e" : "#42536f"; g.fillRect(r() * 256, r() * 256, 5, 5); } }), "#ffffff"), ox - W, ox + W, 7, -7, 0, 4, 4);
  floor(c, c.M.steel, ox - W, ox + W, -6.9, S.elevZ, topY, 3, 2);
  for (let i = 0; i < S.n; i++) {
    const z0 = S.z0 - i * S.run, z1 = z0 - S.run, y = (i + 1) * S.rise;
    c.b.add(boxGeo(V(ox - 1.7, 0, z1), V(ox + 1.7, y, z0)), TX(sheetTex(i)));
    bx(c, T("#e8f0e8"), ox - 1.72, y - 0.012, z1, ox + 1.72, y + 0.01, z0);
  }
  wallZ(c, T("#d9d4c8"), ox - W, ox + W, 0, H, zb, 1, 1); wallX(c, T("#e3ddd0"), ox - W, 7, zb, 0, H); wallX(c, T("#e3ddd0"), ox + W, 7, zb, 0, H);
  ceil(c, T("#cfd2d6"), ox - W, ox + W, 7, zb, H);
  // back wall of the platform with the elevator opening
  const ez = S.elevZ, ex = 0.85;
  bx(c, T("#aab2bd"), ox - W, topY, ez - 0.3, ox - ex - 0.1, topY + 3.6, ez); bx(c, T("#aab2bd"), ox + ex + 0.1, topY, ez - 0.3, ox + W, topY + 3.6, ez); bx(c, T("#aab2bd"), ox - ex - 0.1, topY + 2.5, ez - 0.3, ox + ex + 0.1, topY + 3.6, ez);
  bx(c, T("#6b727c"), ox - ex - 0.1, topY, ez, ox - ex, topY + 2.5, ez + 0.06); bx(c, T("#6b727c"), ox + ex, topY, ez, ox + ex + 0.1, topY + 2.5, ez + 0.06); bx(c, T("#6b727c"), ox - ex, topY + 2.4, ez, ox + ex, topY + 2.5, ez + 0.06);
  // car: warm light inside, doors slid open
  bx(c, T("#f2dfb0"), ox - ex, topY, ez - 1.6, ox + ex, topY + 2.4, ez - 1.58); bx(c, T("#e9d6a6"), ox - ex, topY, ez - 1.6, ox - ex + 0.02, topY + 2.4, ez); bx(c, T("#e9d6a6"), ox + ex - 0.02, topY, ez - 1.6, ox + ex, topY + 2.4, ez);
  floor(c, T("#8b6b4a"), ox - ex, ox + ex, ez, ez - 1.6, topY + 0.01, 1, 1); ceil(c, T("#fff6d8"), ox - ex, ox + ex, ez, ez - 1.6, topY + 2.4);
  bx(c, T("#c9d0d8"), ox - ex - 0.5, topY, ez, ox - ex, topY + 2.4, ez + 0.05); bx(c, T("#c9d0d8"), ox + ex, topY, ez, ox + ex + 0.5, topY + 2.4, ez + 0.05);
  bulb(c, ox, topY + 2.3, ez - 0.8, 0.12, [3.4, 3, 2.2]); c.lamp(ox, topY + 2.2, ez - 0.7, 2.6, topY, [1.0, 0.8, 0.5]);
  pl(c, sign("nbA_exec", 1100, 230, "#222a3a", "#f2d23a", ["EXECUTIVE FLOOR  ▲"], 92), 3.0, 0.62, ox, topY + 3.05, ez + 0.07);
  pl(c, sign("nbA_ding", 200, 120, "#101828", "#ff7a3a", ["UP"], 62), 0.4, 0.25, ox + 1.55, topY + 1.5, ez + 0.07, 0, false, true, 1.3);
  const peng = [-1, 0, 1].map((l) => penguinTex(l as -1 | 0 | 1));
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.17), new THREE.MeshBasicMaterial({ map: peng[1], transparent: true, alphaTest: 0.5, side: D })); pm.position.set(ox, topY + 0.585, ez - 0.7); put(c, pm, ox);
  // giant pencil banisters
  const slope = Math.atan2(S.rise, S.run), L = (S.n * S.run) / Math.cos(slope) + 0.6;
  for (const s of [-1, 1]) {
    const cz = S.z0 - (S.n * S.run) / 2, cy = (S.n * S.rise) / 2 + 1.0;
    const pg = new THREE.Group(); pg.position.set(ox + s * 1.95, cy, cz); pg.rotation.x = -slope; // rises toward -z
    const body = new THREE.Mesh(cylG(0.11, 0.11, L, 6), T("#f2c23a")); body.rotation.x = Math.PI / 2; pg.add(body);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.35, 6), T("#e7c9a0")); tip.rotation.x = -Math.PI / 2; tip.position.z = L / 2 + 0.17; pg.add(tip);
    const lead = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), T("#2a2420")); lead.rotation.x = -Math.PI / 2; lead.position.z = L / 2 + 0.4; pg.add(lead);
    const fer = new THREE.Mesh(cylG(0.115, 0.115, 0.14, 8), T("#b9c0c8")); fer.rotation.x = Math.PI / 2; fer.position.z = -L / 2 - 0.07; pg.add(fer);
    const er = new THREE.Mesh(cylG(0.11, 0.11, 0.16, 8), T("#e98aa0")); er.rotation.x = Math.PI / 2; er.position.z = -L / 2 - 0.22; pg.add(er);
    put(c, pg, ox);
    for (let i = 0; i < S.n; i += 3) addCyl(c, T("#8d949c"), 0.03, 0.03, 1.0, ox + s * 1.95, (i + 1) * S.rise + 0.5, S.z0 - (i + 0.5) * S.run);
  }
  // charts on the walls, clocks, plants, sticky-note flags
  const chart = (k: number) => ctex("nbA_chart" + k, 384, 256, (g) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 384, 256); g.strokeStyle = INKC; g.lineWidth = 10; g.strokeRect(5, 5, 374, 246);
    g.strokeStyle = k % 2 ? "#2a9d5a" : "#c2271d"; g.lineWidth = 12; g.lineJoin = "round"; g.beginPath(); g.moveTo(30, k % 2 ? 210 : 50); for (let i = 1; i < 8; i++) g.lineTo(30 + i * 46, (k % 2 ? 210 : 50) + (k % 2 ? -1 : 1) * (i * 16 + ((i * 37 + k * 11) % 40))); g.stroke();
    g.fillStyle = INKC; g.font = "bold 28px sans-serif"; g.textAlign = "left"; g.fillText("Q" + (k + 1), 24, 40); });
  for (let k = 0; k < 4; k++) { pl(c, chart(k), 1.6, 1.07, ox - W + 0.04, 3.4 + (k % 2) * 0.1, 3.5 - k * 3.3, Math.PI / 2); pl(c, chart(k + 4), 1.6, 1.07, ox + W - 0.04, 3.3 + (k % 2) * 0.2, 3.0 - k * 3.4, -Math.PI / 2); }
  plant(c, ox - 3.4, 4.2, 1.6); plant(c, ox + 3.4, 2.2, 1.4); plant(c, ox - 3.3, -5.6, 1.5); plant(c, ox + 3.3, -6.3, 1.5);
  for (let i = 0; i < 6; i++) { bulb(c, ox + (i % 2 ? 1 : -1) * 2.3, H - 0.08, 5 - i * 2.9, 0.18, [3, 2.9, 2.6]); c.lamp(ox + (i % 2 ? 1 : -1) * 2.3, H - 0.3, 5 - i * 2.9, 2.2, 0, [0.7, 0.7, 0.62]); }
  bx(c, T("#f2d23a"), ox + 1.6, 0.4, 2.2, ox + 2.4, 0.65, 2.7); // a giant stapler on the floor, ignored
  bx(c, T("#c2271d"), ox + 1.6, 0.65, 2.2, ox + 2.4, 0.78, 2.7);
  c.onFrame((f, set) => {
    if (set !== SET.stairs) return;
    const t = f / FPS, look = t < 9.35 ? 0 : t < 9.75 ? -1 : t < 10.1 ? 1 : 0;
    (pm.material as THREE.MeshBasicMaterial).map = peng[look + 1]; pm.position.y = topY + 0.585 + Math.abs(Math.sin(t * 3)) * 0.012;
  });
};

// ============================================================ line 4b: three bank lobbies in a row along -z
export const BANK = { x: N_BANK, depth: 8, front: (k: number) => 2 - 8 * k, back: (k: number) => -6 - 8 * k, signY: 3.4 };
const buildBank = (c: SetCtx) => {
  const ox = N_BANK, Wd = 3.6, Hh = 4.3;
  type Th = { floorA: string; floorB: string; wall: string; band: string; plaque: [string, string, string]; lines: string[]; px: number; desk: string; deskTop: string; carpet?: string };
  const themes: Th[] = [
    { floorA: "#f2f0ea", floorB: "#c9ccd2", wall: "#f4f1ea", band: "#d71920", plaque: ["#ffffff", "#d71920", "HSBC"], lines: ["HSBC"], px: 220, desk: "#d71920", deskTop: "#f4f1ea" },
    { floorA: "#6d1620", floorB: "#58101a", wall: "#9b1f2b", band: "#e8b93a", plaque: ["#7a1520", "#f2c53a", "CITIC"], lines: ["CITIC"], px: 220, desk: "#7a1520", deskTop: "#e8b93a", carpet: "#e8b93a" },
    { floorA: "#1d2a52", floorB: "#17224a", wall: "#27427a", band: "#8fd0ff", plaque: ["#14224a", "#f2c53a", "SHANGHAI"], lines: ["SHANGHAI", "FUND"], px: 150, desk: "#14224a", deskTop: "#cfd8e8" },
  ];
  themes.forEach((th, k) => {
    const zf = BANK.front(k), zb = BANK.back(k), zc = (zf + zb) / 2;
    const chk = ctex("nbA_chk" + k, 256, 256, (g) => { g.fillStyle = th.floorA; g.fillRect(0, 0, 256, 256); g.fillStyle = th.floorB; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128); if (th.carpet) { g.strokeStyle = th.carpet; g.lineWidth = 8; g.strokeRect(20, 20, 216, 216); } });
    floor(c, TX(chk), ox - Wd, ox + Wd, zf, zb, 0, 3, 4);
    ceil(c, T(k === 2 ? "#12183a" : "#efe9dc"), ox - Wd, ox + Wd, zf, zb, Hh);
    wallX(c, T(th.wall), ox - Wd, zf, zb, 0, Hh); wallX(c, T(th.wall), ox + Wd, zf, zb, 0, Hh);
    for (const s of [-1, 1]) { bx(c, T(th.band), ox + s * Wd - 0.04, 0.95, zb, ox + s * Wd + 0.04, 1.08, zf); bx(c, T(k === 2 ? "#0f1838" : "#8a7a66"), ox + s * Wd - 0.05, 0, zb, ox + s * Wd + 0.05, 0.9, zf); }
    // back wall + arch + plaque
    const ow = 1.15;
    bx(c, T(th.wall), ox - Wd, 0, zb - 0.4, ox - ow, Hh, zb); bx(c, T(th.wall), ox + ow, 0, zb - 0.4, ox + Wd, Hh, zb); bx(c, T(th.wall), ox - ow, 2.6, zb - 0.4, ox + ow, Hh, zb);
    bx(c, T(th.band), ox - ow - 0.12, 0, zb, ox - ow, 2.72, zb + 0.1); bx(c, T(th.band), ox + ow, 0, zb, ox + ow + 0.12, 2.72, zb + 0.1); bx(c, T(th.band), ox - ow - 0.12, 2.6, zb, ox + ow + 0.12, 2.72, zb + 0.1);
    pl(c, sign("nbA_bk" + k, th.lines.length > 1 ? 1100 : 1200, th.lines.length > 1 ? 560 : 440, th.plaque[0], th.plaque[1], th.lines, th.px), 3.0, th.lines.length > 1 ? 1.5 : 1.15, ox, BANK.signY + (th.lines.length > 1 ? 0.0 : 0.0), zb + 0.12);
    // columns, ceiling lights
    for (const s of [-1, 1]) for (const dz of [0.28, 0.72]) { addCyl(c, T(k === 1 ? "#b8892a" : "#e8e4da"), 0.26, 0.26, Hh, ox + s * 2.55, Hh / 2, zf - (zf - zb) * dz, 16); addCyl(c, T(th.band), 0.32, 0.32, 0.12, ox + s * 2.55, 0.06, zf - (zf - zb) * dz, 16); }
    for (const dz of [0.2, 0.55, 0.9]) { bx(c, T("#ffffff"), ox - 0.8, Hh - 0.05, zf - (zf - zb) * dz - 0.2, ox + 0.8, Hh, zf - (zf - zb) * dz + 0.2); c.lamp(ox, Hh - 0.4, zf - (zf - zb) * dz, 2.8, 0, k === 1 ? [1.0, 0.7, 0.35] : k === 2 ? [0.4, 0.6, 1.0] : [0.9, 0.9, 0.85]); }
    // reception desk on the left, queue rope on the right, plants, wall clock
    bx(c, T(th.desk), ox - 3.2, 0, zc - 0.6, ox - 1.4, 1.05, zc + 0.5); bx(c, T(th.deskTop), ox - 3.25, 1.05, zc - 0.65, ox - 1.35, 1.12, zc + 0.55);
    bx(c, T("#2a2f3f"), ox - 2.6, 1.12, zc - 0.2, ox - 1.9, 1.52, zc - 0.12); bx(c, T("#2a2f3f"), ox - 2.35, 1.12, zc - 0.18, ox - 2.15, 1.3, zc - 0.1);
    pl(c, ctex("nbA_scr" + k, 128, 96, (g) => { g.fillStyle = k === 2 ? "#0b2b1c" : "#e6f0ff"; g.fillRect(0, 0, 128, 96); g.strokeStyle = k === 2 ? "#3dff8a" : "#2a7de1"; g.lineWidth = 6; g.beginPath(); g.moveTo(8, 84); g.lineTo(40, 56); g.lineTo(60, 66); g.lineTo(118, 14); g.stroke(); }), 0.64, 0.34, ox - 2.25, 1.36, zc - 0.11, 0, false, true, 1.2);
    for (const dz of [0.15, 0.8]) { addCyl(c, T("#e8b93a"), 0.04, 0.04, 1.0, ox + 2.0, 0.5, zf - (zf - zb) * dz); addCyl(c, T("#e8b93a"), 0.14, 0.14, 0.04, ox + 2.0, 0.02, zf - (zf - zb) * dz); }
    mesh(c, new THREE.BoxGeometry(0.03, 0.03, (zf - zb) * 0.65), T(th.band), ox + 2.0, 0.92, (zf + zb) / 2 - 0.3);
    plant(c, ox + 3.1, zf - 1.2, 1.5); plant(c, ox - 3.05, zb + 1.2, 1.4);
    pl(c, ctex("nbA_clk" + k, 128, 128, (g) => { g.fillStyle = "#f6f1e6"; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = INKC; g.stroke(); g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 24); g.moveTo(64, 64); g.lineTo(92, 74); g.stroke(); }), 0.7, 0.7, ox + Wd - 0.05, 2.7, zc + 1, -Math.PI / 2);
    if (k === 0) { // ATM on the right wall with a "slightly sad" screen
      bx(c, T("#4a505c"), ox + Wd - 0.5, 0, zc - 0.9, ox + Wd - 0.04, 1.8, zc - 0.2); pl(c, sign("nbA_atm", 256, 160, "#101828", "#3dff8a", ["$$$"], 80), 0.5, 0.32, ox + Wd - 0.52, 1.4, zc - 0.55, -Math.PI / 2, false, true, 1.2);
    }
    if (k === 1) for (let i = 0; i < 4; i++) { const lx = ox + (i < 2 ? -1 : 1) * 1.7, lz = zf - 2 - (i % 2) * 3.2; addCyl(c, T("#b8892a"), 0.012, 0.012, 0.8, lx, Hh - 0.4, lz, 6); addSph(c, GL(1.8, 0.2, 0.15) as unknown as THREE.Material, 0.3, lx, Hh - 1.0, lz, 1, 1.15, 1); c.lamp(lx, Hh - 1.0, lz, 1.5, 0, [1.0, 0.25, 0.15]); }
    if (k === 2) { // skyline windows on both walls + a wall screen with a green line going up
      const sky = ctex("nbA_sky", 512, 256, (g, r) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#1b2f6e"); gr.addColorStop(1, "#e08a6a"); g.fillStyle = gr; g.fillRect(0, 0, 512, 256); for (let i = 0; i < 18; i++) { const w = 20 + r() * 34, h = 70 + r() * 150, x = i * 29; g.fillStyle = "#101a3a"; g.fillRect(x, 256 - h, w, h); g.fillStyle = "#ffd36a"; for (let y = 256 - h + 8; y < 250; y += 14) for (let xx = x + 4; xx < x + w - 6; xx += 10) if (r() < 0.5) g.fillRect(xx, y, 5, 7); } g.strokeStyle = "#e8e4da"; g.lineWidth = 12; g.strokeRect(0, 0, 512, 256); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 256); g.stroke(); });
      for (const s of [-1, 1]) pl(c, sky, 3.2, 1.6, ox + s * (Wd - 0.04), 2.2, zc, s * -Math.PI / 2, false, true, 1.05);
    }
  });
};

// ============================================================ line 5: the arcade, the 7ROAD cabinet, the official seal
const marquee = (key: string, text: string, bg: string, fg: string) => sign(key, 512, 150, bg, fg, [text], 96);
const sealTex = () => ctex("nbA_seal", 512, 512, (g) => {
  const cx = 256, cy = 256;
  g.fillStyle = "#c62828"; g.beginPath(); for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r = i % 2 ? 236 : 250; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); g.lineWidth = 12; g.strokeStyle = INKC; g.stroke();
  g.strokeStyle = "#f2d9a0"; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, 200, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, 120, 0, 7); g.stroke();
  g.fillStyle = "#f2d9a0"; g.font = "bold 50px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  const ring = (txt: string, a0: number, dir: number) => { for (let i = 0; i < txt.length; i++) { const a = a0 + dir * (i - (txt.length - 1) / 2) * 0.185; g.save(); g.translate(cx + Math.cos(a) * 160, cy + Math.sin(a) * 160); g.rotate(a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2)); g.fillText(txt[i], 0, 0); g.restore(); } };
  ring("OFFICIAL", -Math.PI / 2, 1); ring("APPROVED", Math.PI / 2, -1);
  g.fillStyle = "#f6c540"; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 40 : 98; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); g.lineWidth = 8; g.strokeStyle = INKC; g.stroke();
});
const pixelTex = (v: number) => ctex("nbA_pix" + v, 128, 160, (g) => {
  g.fillStyle = "#08102a"; g.fillRect(0, 0, 128, 160);
  g.fillStyle = "#ffd23a"; for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) if ((i + j + v) % 3) g.fillRect(14 + i * 14, 14 + j * 14, 10, 8);
  g.fillStyle = "#3dff8a"; g.fillRect(56 + (v ? 10 : -10), 130, 16, 10); g.fillRect(60 + (v ? 10 : -10), 124, 8, 6);
  g.fillStyle = "#ff4a6a"; g.fillRect(30 + v * 40, 70 + v * 6, 6, 12);
});
export const ARC = { x: N_ARCADE, hero: [N_ARCADE, 0, -6.2] as [number, number, number], sealAt: 14.74 };
const buildArcade = (c: SetCtx) => {
  const ox = N_ARCADE, Wd = 7.5, Hh = 4.4, zb = -12;
  const carpet = ctex("nbA_acarpet", 256, 256, (g, r) => { g.fillStyle = "#1b1440"; g.fillRect(0, 0, 256, 256); const cols = ["#ff3d9a", "#27d6ff", "#ffd23a", "#7a5cff"]; for (let i = 0; i < 26; i++) { g.strokeStyle = cols[i % 4]; g.lineWidth = 5; g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.lineTo(x + 30, y + 20); g.lineTo(x + 50, y - 10); g.stroke(); } g.fillStyle = "#ffffff"; for (let i = 0; i < 14; i++) g.fillRect(r() * 256, r() * 256, 4, 4); });
  floor(c, TX(carpet), ox - Wd, ox + Wd, 8, zb, 0, 5, 7);
  wallZ(c, T("#150f33"), ox - Wd, ox + Wd, 0, Hh, zb, 1, 1); wallX(c, T("#150f33"), ox - Wd, 8, zb, 0, Hh); wallX(c, T("#150f33"), ox + Wd, 8, zb, 0, Hh); ceil(c, T("#0d0a24"), ox - Wd, ox + Wd, 8, zb, Hh);
  // neon strips
  const neon: [number, number, number][] = [[3.2, 0.3, 1.0], [0.1, 1.2, 1.5], [0.9, 1.1, 0.2]];
  for (let i = 0; i < 5; i++) { const col = neon[i % 3]; for (const s of [-1, 1]) mesh(c, new THREE.BoxGeometry(0.06, 0.06, 7 + i), GL(col[0] * 1.5, col[1] * 1.5, col[2] * 1.5), ox + s * (Wd - 0.1), 0.8 + i * 0.7, 0 - 2, 0, 0, 0, true); }
  for (let i = 0; i < 6; i++) { const col = neon[i % 3]; mesh(c, new THREE.BoxGeometry(Wd * 2, 0.07, 0.07), GL(col[0] * 1.5, col[1] * 1.5, col[2] * 1.5), ox, 1.0 + (i % 3) * 0.9, zb + 0.06, 0, 0, 0, true); }
  pl(c, sign("nbA_awall", 1400, 230, "#150f33", "#ff3d9a", ["★ ARCADE ★  INSERT COIN  ★ PLAYER 1 ★"], 96, "#27d6ff"), 7.2, 1.2, ox, 3.6, zb + 0.08, 0, false, true, 1.3);
  // cabinets
  const cab = (x: number, z: number, body: string, trim: string, mq: THREE.Texture, ry: number, hero = false) => {
    const w = hero ? 1.2 : 0.95, d = hero ? 1.0 : 0.85, H = hero ? 2.3 : 2.0;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; put(c, g, x);
    const B = T(body), Tm = T(trim);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.x = rx; g.add(m); return m; };
    add(new THREE.BoxGeometry(w, H * 0.6, d), B, 0, H * 0.3, 0); add(new THREE.BoxGeometry(w * 0.96, H * 0.45, d * 0.55), B, 0, H * 0.77, -d * 0.2);
    add(new THREE.BoxGeometry(w * 1.02, 0.08, d * 0.9), Tm, 0, H * 0.58, d * 0.05);                              // control deck
    add(new THREE.BoxGeometry(w * 0.84, H * 0.3, 0.05), new THREE.MeshBasicMaterial({ map: pixelTex(0), color: new THREE.Color(1.3, 1.3, 1.3) }), 0, H * 0.78, d * 0.1 + 0.045, -0.12);
    add(cylG(0.02, 0.02, 0.2, 8), T("#c0c4cc"), -w * 0.22, H * 0.64, d * 0.28); add(new THREE.SphereGeometry(0.06, 10, 8), T("#e23a2e"), -w * 0.22, H * 0.74, d * 0.28);
    for (let i = 0; i < 3; i++) add(cylG(0.035, 0.035, 0.03, 10), T(["#27d6ff", "#ffd23a", "#ff3d9a"][i]), w * 0.08 + i * 0.12, H * 0.6, d * 0.28);
    const mqm = new THREE.Mesh(new THREE.BoxGeometry(w, 0.38, d * 0.5), Tm); mqm.position.set(0, H * 0.99 + 0.1, -d * 0.05); g.add(mqm);
    const mp = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.94, 0.3), new THREE.MeshBasicMaterial({ map: mq, color: new THREE.Color(1.35, 1.35, 1.35), side: D })); mp.position.set(0, H * 0.99 + 0.1, d * 0.2 + 0.01); g.add(mp);
    add(new THREE.BoxGeometry(0.28, 0.12, 0.04), T("#2a2f3f"), 0, H * 0.28, d * 0.5 + 0.01); add(new THREE.BoxGeometry(0.06, 0.02, 0.03), GL(2.4, 2, 0.6), 0, H * 0.28, d * 0.52);
    const sideArt = new THREE.Mesh(new THREE.PlaneGeometry(d * 0.9, H * 0.55), new THREE.MeshBasicMaterial({ color: new THREE.Color(trim), side: D })); sideArt.visible = false; g.add(sideArt);
    c.lamp(x, H * 0.78, z + 0.9, 1.4, 0, hero ? [0.8, 0.5, 1.0] : [0.3, 0.8, 1.0]);
    return g;
  };
  const mqs = [["PIXEL PANIC", "#1d2f8f", "#ffd23a"], ["MEGA RACER", "#8f1d4f", "#27d6ff"], ["SPACE GOBBLER", "#1d8f5a", "#fff"], ["DRAGON DUDES", "#8f5a1d", "#fff"], ["BLOCK BLAST", "#5a1d8f", "#3dff8a"]];
  const sideX = [-5.5, -3.9, -2.3, 2.3, 3.9, 5.5];
  sideX.forEach((sx, i) => { const m = mqs[i % 5]; cab(ox + sx, -9.6 - (i % 2) * 0.4, ["#2b3f9a", "#a02b5a", "#2b9a68", "#9a682b", "#6a2b9a", "#2b8a9a"][i], ["#27d6ff", "#ff3d9a", "#3dff8a", "#ffd23a", "#b79cff", "#ffd23a"][i], marquee("nbA_mq" + i, m[0], m[1], m[2]), 0); });
  [-6.6, 6.6].forEach((sx, i) => cab(ox + sx, -4.2 - i * 2, i ? "#2b9a68" : "#2b3f9a", i ? "#ffd23a" : "#27d6ff", marquee("nbA_mqs" + i, mqs[i * 2][0], mqs[i * 2][1], mqs[i * 2][2]), i ? -Math.PI / 2 + 0.2 : Math.PI / 2 - 0.2));
  // hero cabinet: 7ROAD
  const heroG = cab(ARC.hero[0], ARC.hero[2], "#c9304a", "#ffd23a", marquee("nbA_mq7", "7ROAD", "#14224a", "#ffd23a"), 0, true);
  void heroG;
  // the ceiling-arm stamp + the seal sticker
  const seal = pl(c, sealTex(), 0.62, 0.62, ARC.hero[0], 1.04, ARC.hero[2] + 0.56, 0, true); seal.visible = false;
  const arm = new THREE.Group(); arm.position.set(ARC.hero[0], 1.04, ARC.hero[2] + 0.62); put(c, arm, ox);
  const stampH = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.2), T("#8a5a34")); stampH.position.z = 0.12; arm.add(stampH);
  const stampB = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.14), T("#c62828")); stampB.position.z = 0.0; arm.add(stampB);
  const UD = V(0.5, 0.75, 0.35).normalize();
  const rod = new THREE.Mesh(cylG(0.06, 0.06, 7, 10), T("#8d949c")); rod.position.copy(UD.clone().multiplyScalar(3.6)); rod.position.z += 0.12; rod.quaternion.setFromUnitVectors(V(0, 1, 0), UD); arm.add(rod);
  // coins pouring from the fund funnel into the slot
  const funnel = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 18, 1, true), T("#e8b93a")); funnel.rotation.x = Math.PI; funnel.position.set(ARC.hero[0] - 1.6, 3.5, ARC.hero[2] + 0.8); put(c, funnel, ox);
  pl(c, sign("nbA_fundbag", 512, 128, "#14224a", "#f2c53a", ["SHANGHAI FUND"], 66), 1.2, 0.3, ARC.hero[0] - 1.6, 4.0, ARC.hero[2] + 0.8);
  const coins: THREE.Mesh[] = []; for (let i = 0; i < 16; i++) { const m = mesh(c, cylG(0.07, 0.07, 0.018, 12), GL(2.6, 2.0, 0.5), ox, 3, -5, Math.PI / 2, 0, 0, true); coins.push(m); }
  c.lamp(ARC.hero[0], 1.4, ARC.hero[2] + 1.4, 3.4, 0, [1.0, 0.45, 0.8]); c.lamp(ox, 3.8, -4, 4.2, 0, [0.4, 0.5, 1.0]);
  c.onFrame((f, set) => {
    if (set !== SET.arcade) return;
    const t = f / FPS, u = (t - ARC.sealAt) / 0.14, hit = u >= 1;
    seal.visible = t >= ARC.sealAt + 0.07; const k = Math.max(0, t - ARC.sealAt - 0.07); seal.scale.setScalar(k < 0.2 ? 1 + 0.35 * Math.sin(k / 0.2 * Math.PI) * (1 - k / 0.2) + 0.0 : 1);
    const e = t < ARC.sealAt - 0.4 ? 0 : t < ARC.sealAt ? sm(ARC.sealAt - 0.4, ARC.sealAt, t) : t < ARC.sealAt + 0.55 ? 1 : 1 - sm(ARC.sealAt + 0.55, ARC.sealAt + 1.0, t);
    const off = 1 - e; arm.position.set(ARC.hero[0] + off * 2.6, 1.04 + off * 2.8, ARC.hero[2] + 0.62 + off * 1.4); arm.visible = e > 0.001;
    coins.forEach((m, i) => { const p = ((t * 0.9 + i / coins.length) % 1); m.position.set(ARC.hero[0] - 1.6 + p * 1.6 + Math.sin(i) * 0.08, 3.4 - p * p * 2.0, ARC.hero[2] + 0.8 + (hash(i) - 0.5) * 0.2); m.rotation.y = t * 6 + i; m.rotation.z = t * 5; });
  });
};

// ============================================================ line 6: the crate of glowing chips + the padlock
const chipTex = () => ctex("nbA_chip", 256, 256, (g, r) => {
  g.fillStyle = "#0b1d2a"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#f2c53a"; g.lineWidth = 8; for (let i = 0; i < 8; i++) { const p = 24 + i * 29; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 22); g.moveTo(p, 256); g.lineTo(p, 234); g.moveTo(0, p); g.lineTo(22, p); g.moveTo(256, p); g.lineTo(234, p); g.stroke(); }
  g.fillStyle = "#12425a"; g.fillRect(40, 40, 176, 176); g.strokeStyle = "#5fffe0"; g.lineWidth = 6; g.strokeRect(40, 40, 176, 176);
  for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(60 + r() * 130, 60); g.lineTo(60 + r() * 130, 196); g.stroke(); } g.fillStyle = "#5fffe0"; g.fillRect(100, 100, 56, 56);
});
const padlockTex = () => ctex("nbA_padlock", 256, 256, (g) => {
  g.fillStyle = "#1c3f94"; rr(g, 8, 8, 240, 240, 36); g.fill(); g.lineWidth = 14; g.strokeStyle = INKC; g.stroke(); g.lineWidth = 8; g.strokeStyle = "#f2c53a"; rr(g, 30, 30, 196, 196, 20); g.stroke();
  g.fillStyle = "#ffffff"; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i / 5) * Math.PI * 2; g.beginPath(); for (let k = 0; k < 10; k++) { const aa = a + (k / 10) * Math.PI * 2 / 5 * 0; void aa; } } 
  g.fillStyle = "#ffffff"; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 30 : 76; g.lineTo(128 + Math.cos(a) * r, 108 + Math.sin(a) * r); } g.closePath(); g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  g.fillStyle = INKC; g.beginPath(); g.arc(128, 196, 14, 0, 7); g.fill(); g.fillRect(122, 196, 12, 28);
});
const labelTex = () => ctex("nbA_label", 512, 320, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 320); g.lineWidth = 10; g.strokeStyle = INKC; g.strokeRect(5, 5, 502, 310);
  g.fillStyle = INKC; g.font = "bold 66px sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("TO: CHINA", 28, 80);
  g.font = "bold 38px sans-serif"; g.fillText("AI CHIPS  ·  FRAGILE", 28, 150); for (let i = 0; i < 38; i++) g.fillRect(28 + i * 11, 200, 3 + (i * 7) % 5, 80);
  g.fillStyle = "#1c3f94"; g.beginPath(); g.moveTo(420, 60); g.lineTo(486, 100); g.lineTo(420, 110); g.closePath(); g.fill();
});
export const VAULT = { x: N_VAULT, crate: [N_VAULT, 0, -3.2] as [number, number, number], slamAt: 16.4 };
const buildVault = (c: SetCtx) => {
  const ox = N_VAULT, Wd = 9, Hh = 7, zb = -18, [cx, , cz] = VAULT.crate;
  const conc = ctex("nbA_conc", 256, 256, (g, r) => { g.fillStyle = "#9aa1a8"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.5 ? "#8e959d" : "#a6adb4"; g.fillRect(r() * 256, r() * 256, 10 + r() * 20, 6 + r() * 10); } g.fillStyle = "#f2c53a"; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(i * 60 - 40, 256); g.lineTo(i * 60 - 10, 256); g.lineTo(i * 60 + 30, 232); g.lineTo(i * 60, 232); g.fill(); } });
  floor(c, TX(conc), ox - Wd, ox + Wd, 8, zb, 0, 5, 9);
  wallZ(c, c.M.steel, ox - Wd, ox + Wd, 0, Hh, zb, 4, 2); wallX(c, c.M.steel, ox - Wd, 8, zb, 0, Hh, 8, 2); wallX(c, c.M.steel, ox + Wd, 8, zb, 0, Hh, 8, 2); ceil(c, T("#4a505c"), ox - Wd, ox + Wd, 8, zb, Hh);
  for (let i = 0; i < 8; i++) bx(c, T("#2a2f3f"), ox - Wd, Hh - 0.35, 6 - i * 3.2, ox + Wd, Hh - 0.15, 6 - i * 3.2 + 0.2);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { bx(c, T("#ffffff"), ox + s * 4 - 0.9, Hh - 0.5, 5 - i * 4.0 - 0.1, ox + s * 4 + 0.9, Hh - 0.4, 5 - i * 4.0 + 0.1); c.lamp(ox + s * 4, Hh - 0.7, 5 - i * 4, 2.8, 0, [0.7, 0.8, 0.8]); }
  // pallet racking along both walls, crates glowing teal through the slats
  const glowM = [new THREE.MeshBasicMaterial({ map: chipTex(), color: new THREE.Color(1.3, 1.5, 1.5), side: D })];
  for (const s of [-1, 1]) for (let bay = 0; bay < 5; bay++) {
    const z = 3 - bay * 3.1, x = ox + s * 7.0;
    for (const dz of [-1.4, 1.4]) bx(c, T("#2b6fd9"), x - 0.05, 0, z + dz - 0.05, x + 0.05, 5.2, z + dz + 0.05);
    for (let lv = 0; lv < 3; lv++) {
      const y = 0.5 + lv * 1.65; bx(c, T("#e8742e"), x - 1.0, y, z - 1.5, x + 1.0, y + 0.1, z - 1.3); bx(c, T("#e8742e"), x - 1.0, y, z + 1.3, x + 1.0, y + 0.1, z + 1.5);
      for (const k of [-0.6, 0.6]) { const cr = c.b; cr.add(boxGeo(V(x - 0.45, y + 0.1, z + k - 0.45), V(x + 0.45, y + 1.0, z + k + 0.45), 0.45), c.M.crate);
        const gp = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), glowM[0]); gp.rotation.x = -Math.PI / 2; gp.position.set(x, y + 1.005, z + k); gp.layers.set(NOINK); put(c, gp, ox); }
      c.lamp(x, y + 0.8, z, 1.4, 0, [0.2, 0.9, 0.8]);
    }
  }
  // back wall: sign + dock doors
  pl(c, sign("nbA_vsign", 1500, 300, "#101c2a", "#5fffe0", ["AI CHIPS  ·  RESTRICTED"], 110, "#f2c53a"), 7.2, 1.45, ox, 5.0, zb + 0.1, 0, false, true, 1.15);
  for (const dx of [-5.5, 5.5]) { bx(c, T("#c9d0d8"), ox + dx - 1.5, 0, zb + 0.02, ox + dx + 1.5, 3.4, zb + 0.2); for (let i = 0; i < 8; i++) bx(c, T("#aab2bd"), ox + dx - 1.5, i * 0.42, zb + 0.2, ox + dx + 1.5, i * 0.42 + 0.04, zb + 0.24); }
  // hero crate on a pallet: open top, chip stacks glowing, shipping label on the front
  bx(c, T("#c28a55"), cx - 0.8, 0, cz - 0.55, cx + 0.8, 0.14, cz + 0.55); bx(c, T("#c28a55"), cx - 0.85, 0.14, cz - 0.6, cx + 0.85, 0.2, cz + 0.6);
  const crate = new THREE.Group(); crate.position.set(cx, 0.2, cz); put(c, crate, ox);
  const cm = c.M.crate; const wall = (w: number, h: number, d: number, x: number, y: number, z: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), cm); m.position.set(x, y, z); crate.add(m); };
  wall(1.5, 1.0, 0.1, 0, 0.5, 0.5); wall(1.5, 1.0, 0.1, 0, 0.5, -0.5); wall(0.1, 1.0, 1.0, -0.7, 0.5, 0); wall(0.1, 1.0, 1.0, 0.7, 0.5, 0); wall(1.4, 0.1, 1.0, 0, 0.05, 0);
  for (const dx of [-0.7, 0, 0.7]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.04, 0.14), T("#8a5a34")); m.position.set(dx, 0.5, 0.5); crate.add(m); }
  for (let i = 0; i < 6; i++) { const chip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), [T("#0b1d2a"), T("#0b1d2a"), glowM[0], T("#0b1d2a"), T("#0b1d2a"), T("#0b1d2a")]); chip.position.set(-0.3 + (i % 3) * 0.3, 0.56 + Math.floor(i / 3) * 0.1 + (i % 2) * 0.06, -0.12 + (i % 2) * 0.24); chip.rotation.y = (hash(i) - 0.5) * 0.7; crate.add(chip); }
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.48), new THREE.MeshBasicMaterial({ map: labelTex(), side: D })); lab.position.set(0.14, 0.42, 0.57); crate.add(lab);
  pl(c, sign("nbA_stencil", 512, 128, "#c28a55", "#3b2a1e", ["AI CHIPS"], 84, "#c28a55"), 0.9, 0.22, cx - 0.1, 0.9, cz + 0.56, 0, false, true);
  c.lamp(cx, 1.3, cz, 3.8, 0, [0.15, 1.0, 0.85]); c.lamp(cx, 0.9, cz + 0.8, 2.2, 0, [0.15, 0.9, 0.8]);
  const topGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.0), new THREE.MeshBasicMaterial({ map: c.glowTex(), color: new THREE.Color(0.2, 1.1, 0.9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: D })); topGlow.rotation.x = -Math.PI / 2; topGlow.position.set(cx, 1.45, cz); topGlow.layers.set(NOINK); put(c, topGlow, ox);
  // padlock
  const lock = new THREE.Group(); put(c, lock, ox);
  const lb = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.4, 0.14), T("#1c3f94")); lock.add(lb);
  const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.4), new THREE.MeshBasicMaterial({ map: padlockTex(), transparent: true, side: D })); lf.position.z = 0.075; lock.add(lf);
  const sh = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 8, 20, Math.PI), T("#c9ced6")); sh.position.y = 0.2; lock.add(sh);
  const hasp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.03), T("#6b727c")); hasp.position.set(cx + 0.02, 0.78, cz + 0.58); put(c, hasp, ox);
  const banned = pl(c, sign("nbA_banned", 512, 160, "#fff4f0", "#d9202e", ["BANNED"], 110, "#d9202e"), 0.8, 0.25, cx - 0.35, 0.54, cz + 0.57, 0, true); banned.rotation.z = 0.2; banned.visible = false;
  // dust + sparks
  const dust: THREE.Mesh[] = [], sparks: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) dust.push(mesh(c, new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: c.glowTex(), color: new THREE.Color(0.85, 0.85, 0.8), transparent: true, depthWrite: false, opacity: 0 }), cx, 0.3, cz + 0.7, 0, 0, 0, true));
  for (let i = 0; i < 10; i++) sparks.push(mesh(c, new THREE.SphereGeometry(0.035, 6, 5), GL(3, 2.4, 0.8), cx, 0.8, cz + 0.7, 0, 0, 0, true));
  // forklift idling at the left with a tiny pallet of chips
  const fk = (x: number, z: number, ry: number) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; put(c, g, ox);
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); g.add(o); return o; };
    add(new THREE.BoxGeometry(1.0, 0.7, 1.7), T("#f2b02e"), 0, 0.65, 0.2); add(new THREE.BoxGeometry(0.9, 0.08, 0.9), T("#2a2f3f"), 0, 1.35, 0.55); add(new THREE.BoxGeometry(0.05, 1.0, 0.05), T("#2a2f3f"), -0.4, 1.9, 0.12); add(new THREE.BoxGeometry(0.05, 1.0, 0.05), T("#2a2f3f"), 0.4, 1.9, 0.12);
    add(new THREE.BoxGeometry(0.9, 0.06, 0.05), T("#2a2f3f"), 0, 2.4, 0.12); add(new THREE.BoxGeometry(0.1, 2.4, 0.1), T("#4a505c"), -0.35, 1.2, -0.7); add(new THREE.BoxGeometry(0.1, 2.4, 0.1), T("#4a505c"), 0.35, 1.2, -0.7);
    add(new THREE.BoxGeometry(0.1, 0.06, 1.0), T("#c9d0d8"), -0.3, 0.2, -1.3); add(new THREE.BoxGeometry(0.1, 0.06, 1.0), T("#c9d0d8"), 0.3, 0.2, -1.3);
    for (const [wx, wz] of [[-0.55, 0.9], [0.55, 0.9], [-0.55, -0.1], [0.55, -0.1]]) { const w = add(cylG(0.28, 0.28, 0.2, 14), T("#2a2420"), wx, 0.28, wz); w.rotation.z = Math.PI / 2; }
    add(new THREE.SphereGeometry(0.08, 8, 6), GL(3, 1.2, 0.2), 0, 2.5, 0.55).layers.set(NOINK); return g; };
  fk(ox - 4.2, -1.5, 0.5); fk(ox + 5.0, -6, -0.6);
  c.onFrame((f, set) => {
    if (set !== SET.vault) return;
    const t = f / FPS, ts = VAULT.slamAt, dt = t - ts;
    const fall = sm(ts - 0.3, ts, t), y0 = 5.6, yEnd = 0.62;
    const bounce = dt > 0 && dt < 0.25 ? Math.abs(Math.sin(dt / 0.25 * Math.PI)) * 0.14 * (1 - dt / 0.25) : 0;
    lock.position.set(cx + 0.02, y0 + (yEnd - y0) * (fall * fall) + bounce, cz + 0.72); lock.visible = t > ts - 0.34; lock.rotation.z = (1 - fall) * 0.5;
    const sq = dt > 0 && dt < 0.2 ? 1 - 0.07 * Math.sin(dt / 0.2 * Math.PI) : 1; crate.scale.set(1 + (1 - sq) * 0.6, sq, 1 + (1 - sq) * 0.6);
    crate.position.x = cx + (dt > 0 && dt < 0.3 ? Math.sin(dt * 90) * 0.02 * (1 - dt / 0.3) : 0);
    banned.visible = dt > 0.25;
    dust.forEach((m, i) => { const u = dt / 0.9, a = (i / dust.length) * Math.PI * 2; const on = u > 0 && u < 1; m.visible = on; m.position.set(cx + Math.cos(a) * (0.4 + u * 1.5), 0.2 + u * 0.35, cz + 0.6 + Math.sin(a) * (0.3 + u * 0.9)); m.scale.setScalar(0.5 + u * 1.2); (m.material as THREE.MeshBasicMaterial).opacity = on ? 0.6 * (1 - u) : 0; });
    sparks.forEach((m, i) => { const u = dt / 0.4, a = hash(i, 3) * Math.PI * 2, sp = 1.4 + hash(i, 4) * 1.6; const on = u > 0 && u < 1; m.visible = on; m.position.set(cx + 0.02 + Math.cos(a) * sp * dt, 0.75 + Math.sin(a) * sp * dt - 4 * dt * dt, cz + 0.8 + hash(i, 5) * 0.2); });
    topGlow.material.opacity = 0.8 + Math.sin(t * 5) * 0.12 + (dt > 0 && dt < 0.15 ? 0.6 : 0);
  });
};

// ============================================================ line 7: the quiet little building with 40 satellite dishes
export const DISH = { x: N_DISH, front: -3.0, signY: 4.0, peelAt: 21.35, flyAt: 21.8, landAt: 22.05, basket: [N_DISH - 1.75, 2.5, 1.6] as [number, number, number], capEnd: 21.4 };
const facadeTex = () => ctex("nbA_facade", 640, 704, (g, r) => {
  g.fillStyle = "#e9dfcc"; g.fillRect(0, 0, 640, 704);
  for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? "#e2d6bf" : "#f0e8d6"; g.fillRect(r() * 640, r() * 704, 30 + r() * 50, 14); }
  const cols = 4, rows = 7, ww = 100, wh = 66;
  for (let rI = 0; rI < rows; rI++) for (let cI = 0; cI < cols; cI++) {
    const x = 48 + cI * 150, y = 40 + rI * 94; if (rI >= 5 && (cI === 1 || cI === 2)) continue;
    g.fillStyle = "#5c7f9f"; g.fillRect(x, y, ww, wh); g.fillStyle = "#9bc0dd"; g.fillRect(x, y, ww, wh * 0.45); g.strokeStyle = "#f6f1e6"; g.lineWidth = 8; g.strokeRect(x, y, ww, wh); g.beginPath(); g.moveTo(x + ww / 2, y); g.lineTo(x + ww / 2, y + wh); g.stroke();
    g.fillStyle = "#c9ced6"; g.fillRect(x - 4, y + wh + 2, ww + 8, 10);
  }
  g.fillStyle = "#8d949c"; g.fillRect(0, 0, 640, 8); g.fillRect(0, 696, 640, 8);
});
const dishGeo = (() => {
  const cap = new THREE.SphereGeometry(0.5, 16, 7, 0, Math.PI * 2, 0, 1.0).toNonIndexed(); cap.scale(1, 0.55, 1);
  return cap;
})();
const buildDish = (c: SetCtx) => {
  const ox = N_DISH, zf = DISH.front, H = 11, W = 5.2;
  // ground: street, sidewalk, curb
  floor(c, T("#4a4f5a"), ox - 24, ox + 24, 18, zf + 3.1, 0, 1, 1);
  floor(c, T("#cfc8b8"), ox - 24, ox + 24, zf + 3.1, zf, 0.12, 1, 1); bx(c, T("#b0a998"), ox - 24, 0, zf + 3.05, ox + 24, 0.14, zf + 3.15);
  for (let i = 0; i < 10; i++) bx(c, T("#f4f1ea"), ox - 22 + i * 4.6, 0.012, 9.6, ox - 22 + i * 4.6 + 2.2, 0.02, 9.9);
  floor(c, T("#5f6d4a"), ox - 24, ox + 24, zf, -30, 0, 1, 1);
  // the building
  const fm = TX(facadeTex()); bx(c, T("#d8cfba"), ox - W, 0, zf - 7, ox + W, H, zf);
  wallZ(c, fm, ox - W, ox + W, 0, H, zf + 0.01, 1, 1);
  bx(c, T("#8d949c"), ox - W - 0.1, H, zf - 7.1, ox + W + 0.1, H + 0.35, zf + 0.1);
  bx(c, T("#2a2f3f"), ox - 0.95, 0, zf + 0.02, ox + 0.95, 2.55, zf + 0.12); bx(c, T("#6aa8d4"), ox - 0.85, 0.05, zf + 0.13, ox + 0.85, 2.45, zf + 0.15); bx(c, T("#e23a2e"), ox - 1.4, 2.55, zf + 0.0, ox + 1.4, 2.75, zf + 0.9); // door + awning
  // sign frame (the peel happens here)
  const sy = DISH.signY; bx(c, T("#6b727c"), ox - 2.35, sy - 0.7, zf + 0.02, ox + 2.35, sy + 0.7, zf + 0.09);
  for (const [bx0, by0] of [[-2.2, -0.55], [2.2, -0.55], [-2.2, 0.55], [2.2, 0.55]]) mesh(c, new THREE.SphereGeometry(0.05, 8, 6), T("#c9ced6"), ox + bx0, sy + by0, zf + 0.12);
  const plate7 = pl(c, sign("nbA_7road", 900, 250, "#f6f1e6", "#1c4fa0", ["7ROAD"], 190), 4.2, 1.17, ox, sy, zf + 0.13);
  const plateM = pl(c, sign("nbA_mega", 1300, 250, "#0d1a3a", "#ff4a2e", ["MEGASPEED"], 170, "#ff4a2e"), 4.2, 0.9, ox, sy, zf + 0.14); plateM.visible = false;
  const burst = pl(c, ctex("nbA_burst", 256, 256, (g) => { g.fillStyle = "#ffe46a"; g.strokeStyle = INKC; g.lineWidth = 10; g.beginPath(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 70 : 120; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = INKC; g.font = "bold 60px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("SLAP", 128, 132); }), 1.3, 1.3, ox + 1.4, sy + 0.9, zf + 0.5, 0, true, true); burst.visible = false;
  pl(c, sign("nbA_sg", 512, 150, "#1f7a4a", "#ffffff", ["SINGAPORE"], 84), 1.5, 0.45, ox + 4.7, 1.9, zf + 0.5, 0);
  // dishes: 40 exactly (16 roof, 20 facade grid, 4 on the sidewalk)
  const white = T("#f2f2ee"), grey = T("#c4c9d0"), terra = T("#d98a5f"), pole = T("#8d949c"); let nd = 0;
  const dish = (x: number, y: number, z: number, fx: number, fy: number, fz: number, r: number, m: THREE.Material) => {
    const f = V(fx, fy, fz).normalize(), q = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), f);
    c.b.add(dishGeo, m, new THREE.Matrix4().compose(V(x, y, z), q, V(r * 2, r * 2, r * 2)));
    const tip = V(x, y, z).addScaledVector(f, r * 0.62);
    c.b.add(cylG(0.02, 0.02, r * 0.72, 6), pole, new THREE.Matrix4().compose(V(x, y, z).addScaledVector(f, r * 0.31), q, V(1, 1, 1)));
    c.b.add(new THREE.SphereGeometry(0.06 * (r + 0.3), 8, 6), T("#2a2420"), M4(tip.x, tip.y, tip.z)); nd++;
  };
  for (let i = 0; i < 16; i++) { const x = ox - 4.6 + (i % 8) * 1.3, zz = i < 8 ? zf - 1.0 : zf - 3.6; dish(x, H + 0.35 + 0.55, zz, (hash(i, 11) - 0.5) * 0.6, 0.9, 0.8 + hash(i, 12) * 0.3, 0.62 + hash(i, 13) * 0.35, [white, grey, white, terra][i % 4]); addCyl(c, pole, 0.04, 0.04, 0.5, x, H + 0.6, zz); }
  for (let i = 0; i < 20; i++) { const col = i % 4, row = Math.floor(i / 4), x = ox - 3.8 + col * 2.55 + (row % 2 ? 0.2 : -0.1), y = 2.3 + row * 1.55 + (col === 1 || col === 2 ? 0.0 : 0), zz = zf + 0.4;
    if (y < 3.0 && Math.abs(x - ox) < 2.8) continue; // keep the sign + door clear (replaced below)
    dish(x, y, zz, (hash(i, 21) - 0.5) * 0.9, (hash(i, 22) - 0.3) * 0.5, 1, 0.42 + hash(i, 23) * 0.2, [white, grey, terra, white][(i + row) % 4]); addCyl(c, pole, 0.03, 0.03, 0.45, x, y, zf + 0.2, 8, Math.PI / 2); }
  while (nd < 36) { const i = nd; const x = ox + (i % 2 ? 3.9 : -3.9), y = 1.0 + (i % 5) * 0.4 + 5.6; dish(x, y, zf + 0.4, (hash(i, 31) - 0.5) * 0.9, 0.2, 1, 0.45, [white, grey][i % 2]); addCyl(c, pole, 0.03, 0.03, 0.45, x, y, zf + 0.2, 8, Math.PI / 2); }
  for (let i = 0; i < 4; i++) { const x = ox - 7 + i * 4.6 + (i > 1 ? 1.6 : 0); dish(x, 1.8, zf + 1.6, 0.2 * (i - 1.5), 0.55, 1, 0.9, [white, grey, terra, white][i]); addCyl(c, pole, 0.08, 0.08, 1.7, x, 0.9, zf + 1.6); }
  // neighbours, trees, street furniture
  const towerTex = ctex("nbA_twr", 256, 512, (g, r) => { g.fillStyle = "#b9c4d4"; g.fillRect(0, 0, 256, 512); for (let y = 12; y < 500; y += 26) for (let x = 12; x < 244; x += 28) { g.fillStyle = r() < 0.15 ? "#ffe9a6" : "#5c7f9f"; g.fillRect(x, y, 18, 14); } });
  for (const [dx, h, dz, w] of [[-11.5, 20, -6, 4], [11, 15, -6, 3.6], [-17, 26, -14, 5], [17, 30, -14, 5.5], [-23, 18, -4, 4]] as [number, number, number, number][]) { c.b.add(boxGeo(V(ox + dx - w, 0, dz - 7), V(ox + dx + w, h, dz)), T("#b9c4d4")); wallZ(c, TX(towerTex), ox + dx - w, ox + dx + w, 0, h, dz + 0.01, 1, h / 10); }
  const palm = (x: number, z: number, h: number) => { addCyl(c, T("#8a6a4a"), 0.14, 0.2, h, x, h / 2, z, 8); for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; c.b.add(new THREE.SphereGeometry(0.55, 8, 6), T(i % 2 ? "#3d8a3b" : "#4f9a45"), M4(x + Math.cos(a) * 0.9, h + 0.1, z + Math.sin(a) * 0.9, 0, 0, 0, 1.5, 0.22, 0.5)); } };
  [-8.5, -5.5, 6.8, 9.5, 14, -13].forEach((x, i) => palm(ox + x, zf + 2.4 + (i % 2) * 0.2, 4.6 + (i % 3) * 0.6));
  for (const [x, col] of [[-6, "#d9473b"], [4.2, "#3b82c4"], [11, "#e0b43a"]] as [number, string][]) { const cx0 = ox + x, cz0 = 12; bx(c, T(col), cx0 - 1.0, 0.25, cz0 - 0.5, cx0 + 1.0, 0.8, cz0 + 0.5); bx(c, T(col), cx0 - 0.55, 0.8, cz0 - 0.45, cx0 + 0.55, 1.2, cz0 + 0.45); for (const [wx, wz] of [[-0.6, 0.5], [0.6, 0.5], [-0.6, -0.5], [0.6, -0.5]]) addCyl(c, T("#2a2420"), 0.22, 0.22, 0.14, cx0 + wx, 0.22, cz0 + wz, 10, 0, Math.PI / 2); }
  for (const x of [-9.8, 1.2, 12.5]) { addCyl(c, T("#4a505c"), 0.06, 0.06, 4.6, ox + x, 2.3, zf + 2.8); bulb(c, ox + x, 4.7, zf + 2.8, 0.2, [3, 3, 2.6]); }
  // the caption, painted into the world over the building
  const cap = pl(c, sign("nbA_caption", 1200, 230, "#fff4c2", INKC, ["QUIET LITTLE COMPANY"], 118), 5.2, 1.0, ox, 8.4, zf + 3.4, 0, false, true, 1.05);
  // the cherry picker with Alice's basket
  const [bxx, by, bzz] = DISH.basket;
  bx(c, T("#f2b02e"), bxx - 1.3, 0.3, bzz - 1.4, bxx + 1.3, 1.1, bzz - 0.2); for (const [wx, wz] of [[-0.9, -0.3], [0.9, -0.3], [-0.9, -1.3], [0.9, -1.3]]) addCyl(c, T("#2a2420"), 0.32, 0.32, 0.22, bxx + wx, 0.32, bzz + wz, 12, 0, Math.PI / 2);
  bx(c, T("#c9ced6"), bxx - 0.12, 1.1, bzz - 0.9, bxx + 0.12, by - 0.1, bzz - 0.7); bx(c, T("#8d949c"), bxx - 0.7, by - 0.14, bzz - 0.6, bxx + 0.7, by - 0.04, bzz + 0.7);
  for (const s of [-1, 1]) { bx(c, T("#f2b02e"), bxx + s * 0.7 - 0.04, by, bzz - 0.6, bxx + s * 0.7 + 0.04, by + 0.98, bzz + 0.7); }
  bx(c, T("#f2b02e"), bxx - 0.7, by, bzz + 0.66, bxx + 0.7, by + 0.98, bzz + 0.74); bx(c, T("#f2b02e"), bxx - 0.7, by + 0.9, bzz - 0.6, bxx + 0.7, by + 0.98, bzz - 0.56);
  c.lamp(ox, 6, zf + 2, 12, 0, [1.0, 0.9, 0.7]);
  // animated: dust of the fallen sign, flying plate
  c.onFrame((f, set) => {
    if (set !== SET.dish) return;
    const t = f / FPS;
    cap.visible = t < DISH.capEnd;
    // 7ROAD plate peels off from its left end, then falls
    const pu = sm(DISH.peelAt, DISH.peelAt + 0.45, t), fall = Math.max(0, t - (DISH.peelAt + 0.45));
    plate7.visible = t < DISH.peelAt + 1.3;
    plate7.position.set(ox - pu * 0.5 - fall * 1.2 * 0.3, sy - pu * 0.25 - 4.5 * fall * fall, zf + 0.13 + pu * 0.5 + fall * 0.9);
    plate7.rotation.set(-pu * 0.6 + fall * 4, 0, pu * 0.9 + fall * 3.0, "XYZ");
    plate7.position.y = Math.max(0.2, plate7.position.y);
    // MEGASPEED plate: flies in from the basket and slaps on
    const fu = sm(DISH.flyAt, DISH.landAt, t), arrived = t >= DISH.landAt; plateM.visible = t >= DISH.flyAt;
    plateM.position.set(ox + (1 - fu) * (DISH.basket[0] - ox + 0.3), sy + (1 - fu) * (DISH.basket[1] + 1.0 - sy), zf + 0.14 + (1 - fu) * (DISH.basket[2] - zf));
    const sl = arrived ? Math.max(0, 1 - (t - DISH.landAt) / 0.2) : 0; plateM.scale.setScalar((0.35 + 0.65 * fu) * (1 + 0.1 * sl)); plateM.rotation.z = (1 - fu) * -0.6;
    burst.visible = arrived && t < DISH.landAt + 0.28; burst.scale.setScalar(0.6 + (t - DISH.landAt) * 4);
  });
};

// ============================================================ line 8a: the red carpet and the gold badge
export const CARPET = { x: N_CARPET };
const buildCarpet = (c: SetCtx) => {
  const ox = N_CARPET, zb = -14, Wd = 11;
  floor(c, T("#d6c3a2"), ox - Wd, ox + Wd, 12, zb, 0, 1, 1);
  // red carpet
  const carpetT = ctex("nbA_redcarpet", 128, 256, (g) => { g.fillStyle = "#c2182b"; g.fillRect(0, 0, 128, 256); g.fillStyle = "#a01020"; for (let i = 0; i < 12; i++) g.fillRect(0, i * 22, 128, 8); g.strokeStyle = "#f2c53a"; g.lineWidth = 8; g.strokeRect(6, 0, 116, 256); });
  floor(c, TX(carpetT), ox - 1.35, ox + 1.35, 12, zb + 2, 0.02, 1, 7);
  // stanchions + ropes
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) { const z = 10 - i * 2.4, x = ox + s * 1.75; addCyl(c, T("#e8b93a"), 0.05, 0.05, 1.0, x, 0.5, z, 8); addSph(c, T("#e8b93a"), 0.09, x, 1.04, z); addCyl(c, T("#e8b93a"), 0.2, 0.2, 0.04, x, 0.02, z, 10);
    if (i < 7) { const z2 = z - 2.4; for (let k = 0; k < 4; k++) { const u0 = k / 4, u1 = (k + 1) / 4, y0 = 0.94 - Math.sin(u0 * Math.PI) * 0.16, y1 = 0.94 - Math.sin(u1 * Math.PI) * 0.16; const zm = (z + (z2 - z) * (u0 + u1) / 2), dl = 2.4 / 4; c.b.add(new THREE.BoxGeometry(0.05, 0.05, dl + 0.01), T("#b01020"), M4(x, (y0 + y1) / 2, zm, Math.atan2(y1 - y0, dl) * -1, 0, 0)); } } }
  // backdrop walls with a step-and-repeat banner, entrance arch
  const rep = ctex("nbA_stepr", 512, 512, (g) => { g.fillStyle = "#0d1a3a"; g.fillRect(0, 0, 512, 512); g.fillStyle = "#ffffff"; g.font = "bold 46px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; for (let y = 0; y < 8; y++) for (let x = 0; x < 3; x++) { g.fillStyle = (x + y) % 2 ? "#ffffff" : "#76e05a"; g.fillText("NVIDIA", 85 + x * 170 + (y % 2) * 40, 32 + y * 64); } });
  wallZ(c, TX(rep), ox - Wd, ox + Wd, 0, 6, zb, 6, 3);
  for (const s of [-1, 1]) wallX(c, TX(rep), ox + s * Wd, 12, zb, 0, 6, 8, 3);
  bx(c, T("#e8b93a"), ox - 3.2, 0, zb + 0.02, ox - 2.8, 4.6, zb + 0.6); bx(c, T("#e8b93a"), ox + 2.8, 0, zb + 0.02, ox + 3.2, 4.6, zb + 0.6); bx(c, T("#e8b93a"), ox - 3.2, 4.3, zb + 0.02, ox + 3.2, 4.8, zb + 0.6);
  pl(c, sign("nbA_arch", 1500, 260, "#0d1a3a", "#f2c53a", ["OFFICIAL  PARTNER  EVENT"], 120, "#f2c53a"), 5.6, 0.97, ox, 5.4, zb + 0.62, 0, false, true, 1.2);
  const door = ctex("nbA_hall", 256, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#ffd88a"); gr.addColorStop(1, "#c2182b"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
  pl(c, door, 5.6, 4.2, ox, 2.15, zb + 0.04, 0, false, true, 1.1);
  // search beams + string lights
  const beam = (x: number, rz: number) => { const m = mesh(c, new THREE.CylinderGeometry(0.08, 0.9, 14, 18, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.8, 0.5), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: D }), x, 7, zb + 1, 0, 0, rz, true); m.renderOrder = 3; return m; };
  const beams = [beam(ox - 8, 0.3), beam(ox + 8, -0.3), beam(ox - 5, 0.2), beam(ox + 5, -0.2)];
  for (let i = 0; i < 12; i++) { bulb(c, ox + (i % 2 ? 1 : -1) * (3 + (i % 5)), 5.4 + (i % 3) * 0.2, 9 - i * 1.8, 0.1, [3, 2.6, 1.6]); c.lamp(ox + (i % 2 ? 1 : -1) * (3 + (i % 5)), 5.4, 9 - i * 1.8, 1.6, 0, [1.0, 0.7, 0.35]); }
  // photographers' flashes (billboards: white stars popping at random)
  const flashes: THREE.Mesh[] = [];
  const flashTex = ctex("nbA_flash", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 5; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke(); });
  for (let i = 0; i < 10; i++) { const s = i % 2 ? 1 : -1; flashes.push(mesh(c, new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: flashTex, color: new THREE.Color(2.2, 2.2, 2.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: D }), ox + s * (2.7 + (i % 3) * 0.5), 1.6, 6 - Math.floor(i / 2) * 2.2, 0, 0, 0, true)); }
  plant(c, ox - 4.6, 4, 1.6); plant(c, ox + 4.6, 1.5, 1.6); plant(c, ox - 4.4, -5, 1.7); plant(c, ox + 4.4, -7, 1.7);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const x = ox + s * (6 + i * 1.3), z = 4 - i * 4; addCyl(c, T("#8a6a4a"), 0.15, 0.2, 4.2, x, 2.1, z, 8); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; c.b.add(new THREE.SphereGeometry(0.55, 8, 6), T(k % 2 ? "#3d8a3b" : "#4f9a45"), M4(x + Math.cos(a) * 0.9, 4.3, z + Math.sin(a) * 0.9, 0, 0, 0, 1.5, 0.22, 0.5)); } }
  c.lamp(ox, 2.5, 3, 7, 0, [1.0, 0.7, 0.4]);
  c.onFrame((f, set) => {
    if (set !== SET.carpet) return; const t = f / FPS;
    flashes.forEach((m, i) => { const ph = (t * (1.7 + hash(i, 2) * 1.3) + hash(i, 3) * 5) % 1; const on = ph < 0.1; m.visible = on; m.scale.setScalar(on ? 0.7 + (1 - ph / 0.1) * 1.4 : 0.1); });
    beams.forEach((m, i) => { m.rotation.z = (i % 2 ? -1 : 1) * (0.25 + Math.sin(t * 1.3 + i) * 0.18); });
  });
};

// ============================================================ line 8b: forklifts stack server racks like Tetris, one row clears
export const TETRIS = { x: N_TETRIS, cell: 0.68, cols: 7, rows: 9, z: -9, clearAt: 27.24, bubbleAt: 26.85 };
const rackTex = (ci: number, col: string) => ctex("nbA_rack" + ci, 128, 128, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 128, 128); g.fillStyle = "rgba(0,0,0,0.28)"; for (let i = 0; i < 6; i++) g.fillRect(10, 12 + i * 18, 108, 11);
  for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? "#6dff9a" : "#ffe46a"; g.fillRect(98, 15 + i * 18, 8, 5); }
  g.lineWidth = 8; g.strokeStyle = INKC; g.strokeRect(4, 4, 120, 120);
});
const TCOL = ["#27d6ff", "#ffd23a", "#b366ff", "#3dd56a", "#ff4a5a", "#3b6cff", "#ff9a2e"];
const bloopTex = () => ctex("nbA_bloop", 512, 256, (g) => { g.fillStyle = "#ffffff"; g.strokeStyle = INKC; g.lineWidth = 12; g.beginPath(); for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, r = i % 2 ? 90 : 124; g.lineTo(256 + Math.cos(a) * r * 1.8, 128 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#d9202e"; g.font = "bold 92px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BLOOP!", 256, 132); });
const speechTex = () => ctex("nbA_speech", 640, 380, (g) => {
  g.fillStyle = "#ffffff"; g.strokeStyle = INKC; g.lineWidth = 12; rr(g, 8, 8, 624, 280, 44); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(90, 280); g.lineTo(70, 372); g.lineTo(180, 284); g.closePath(); g.fillStyle = "#ffffff"; g.fill(); g.stroke(); g.fillRect(100, 270, 70, 20);
  g.fillStyle = INKC; g.font = "bold 74px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("is… nobody", 320, 98); g.fillText("checking this?", 320, 200);
});
type Kf = [number, number, number];
const lerpPath = (k: Kf[], t: number): [number, number] => { if (t <= k[0][0]) return [k[0][1], k[0][2]]; for (let i = 1; i < k.length; i++) if (t <= k[i][0]) { const u = sm(k[i - 1][0], k[i][0], t), a = k[i - 1], b = k[i]; return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; } const l = k[k.length - 1]; return [l[1], l[2]]; };
export const BUBBLE = { at: 26.85 };
const buildTetris = (c: SetCtx) => {
  const { x: ox, cell: cs, cols, rows, z: wz } = TETRIS, Wd = 10, zb = -13, Hh = 11;
  const concT = ctex("nbA_tconc", 256, 256, (g, r) => { g.fillStyle = "#8f969e"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 120; i++) { g.fillStyle = r() < 0.5 ? "#838a93" : "#9aa1a9"; g.fillRect(r() * 256, r() * 256, 12 + r() * 20, 6 + r() * 10); } g.fillStyle = "#f2c53a"; g.fillRect(0, 0, 256, 10); g.fillRect(0, 246, 256, 10); });
  floor(c, TX(concT), ox - Wd, ox + Wd, 12, zb, 0, 6, 8);
  const carpetT = ctex("nbA_redcarpet2", 128, 256, (g) => { g.fillStyle = "#c2182b"; g.fillRect(0, 0, 128, 256); g.fillStyle = "#a01020"; for (let i = 0; i < 12; i++) g.fillRect(0, i * 22, 128, 8); g.strokeStyle = "#f2c53a"; g.lineWidth = 8; g.strokeRect(6, 0, 116, 256); });
  floor(c, TX(carpetT), ox - 1.2, ox + 1.2, 12, wz + 1.2, 0.02, 1, 6);
  wallZ(c, c.M.steel, ox - Wd, ox + Wd, 0, Hh, zb, 5, 3); wallX(c, c.M.steel, ox - Wd, 12, zb, 0, Hh, 8, 3); wallX(c, c.M.steel, ox + Wd, 12, zb, 0, Hh, 8, 3); ceil(c, T("#4a505c"), ox - Wd, ox + Wd, 12, zb, Hh);
  for (let i = 0; i < 6; i++) { bx(c, T("#2a2f3f"), ox - Wd, Hh - 0.4, 9 - i * 3.6, ox + Wd, Hh - 0.2, 9 - i * 3.6 + 0.25); for (const s of [-1, 1]) { bx(c, T("#ffffff"), ox + s * 4.5 - 1, Hh - 0.55, 8 - i * 3.6, ox + s * 4.5 + 1, Hh - 0.45, 8 - i * 3.6 + 0.2); c.lamp(ox + s * 4.5, Hh - 0.8, 8 - i * 3.6, 3.0, 0, [1.0, 0.85, 0.6]); } }
  // the well: dark grid panel, frame posts, floor plate, glowing grid lines
  const gx0 = ox - (cols * cs) / 2, gx1 = ox + (cols * cs) / 2, gy1 = rows * cs + 0.14;
  const wellBack = ctex("nbA_well", 512, 512, (g) => { g.fillStyle = "#0a0e22"; g.fillRect(0, 0, 512, 512); g.strokeStyle = "#27d6ff"; g.globalAlpha = 0.35; g.lineWidth = 3; for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo((i / cols) * 512, 0); g.lineTo((i / cols) * 512, 512); g.stroke(); } for (let j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(0, (j / rows) * 512); g.lineTo(512, (j / rows) * 512); g.stroke(); } });
  pl(c, wellBack, gx1 - gx0, gy1 - 0.14, ox, 0.14 + (gy1 - 0.14) / 2, wz - 0.5, 0, false, true, 1.1);
  for (const x of [gx0 - 0.12, gx1 + 0.12]) bx(c, T("#4a505c"), x - 0.1, 0, wz - 0.6, x + 0.1, gy1 + 0.4, wz + 0.2);
  bx(c, T("#4a505c"), gx0 - 0.22, 0, wz - 0.6, gx1 + 0.22, 0.14, wz + 0.2); bx(c, T("#4a505c"), gx0 - 0.22, gy1 + 0.2, wz - 0.6, gx1 + 0.22, gy1 + 0.4, wz + 0.2);
  pl(c, sign("nbA_tsign", 1100, 190, "#101828", "#ffd23a", ["RECEIVING DOCK  ·  RACKS"], 92, "#ffd23a"), 3.8, 0.66, ox, gy1 + 0.95, wz - 0.4, 0, false, true, 1.15);
  mesh(c, new THREE.BoxGeometry(cols * cs, 0.04, 0.06), GL(0.6, 2.4, 2.8), ox, gy1 + 0.18, wz + 0.22, 0, 0, 0, true);
  // background chaos: crates labelled CHIPS, conveyor belt with glowing chips, shelving
  for (let i = 0; i < 10; i++) { const x = ox + (i < 5 ? -7.6 : 7.4) + (i % 5) * 0.0, z = 2 - (i % 5) * 2.4; bx(c, c.M.crate, x - 0.6, 0, z - 0.6, x + 0.6, 1.2, z + 0.6, 0.6); pl(c, sign("nbA_cc" + (i % 3), 320, 120, "#c28a55", "#3b2a1e", ["CHIPS"], 76, "#c28a55"), 0.9, 0.34, x + (i < 5 ? 0.62 : -0.62), 0.7, z, i < 5 ? Math.PI / 2 : -Math.PI / 2); if (i % 2) bx(c, c.M.crate, x - 0.5, 1.2, z - 0.5, x + 0.5, 2.1, z + 0.5, 0.5); }
  bx(c, T("#2a2f3f"), ox + 3.2, 0.62, -3.5, ox + 9.4, 0.72, -2.7); for (let i = 0; i < 7; i++) mesh(c, new THREE.BoxGeometry(0.4, 0.05, 0.4), GL(0.3, 1.6, 1.4), ox + 3.7 + i * 0.85, 0.77, -3.1, 0, 0, 0, true);
  plant(c, ox - 5.0, 7, 1.5);
  // block pool
  const mats = TCOL.map((col, i) => TX(rackTex(i, col)));
  const pool: THREE.Mesh[] = []; for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(cs * 0.95, cs * 0.95, cs * 0.8), mats[0]); m.visible = false; put(c, m, ox); pool.push(m); }
  const flash = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.4, 2.4) });
  const cx = (col: number) => gx0 + (col + 0.5) * cs, cy = (row: number) => 0.14 + (row + 0.5) * cs;
  // static cells: row0 cols 0-5 (gap at 6), row1 cols 0-2
  const stat: [number, number, number][] = [[0, 0, 0], [1, 0, 1], [2, 0, 2], [3, 0, 3], [4, 0, 4], [5, 0, 5], [0, 1, 6], [1, 1, 0], [2, 1, 1]];
  const ft = TETRIS.clearAt;
  const pieceA: Kf[] = [[26.1, -4.0, 0.55], [26.4, -4.0, 6.6], [26.62, cx(5), 6.6], [26.82, cx(5), cy(1)]];       // left forklift, lands (5,1)
  const pieceB: Kf[] = [[26.2, 4.6, 0.55], [26.55, 4.6, 6.9], [26.78, cx(4), 6.9], [27.0, cx(4), cy(1)]];           // right forklift, lands (4,1)
  const pieceC0: Kf[] = [[26.9, cx(6), 7.3], [27.24, cx(6), cy(0)]], pieceC1: Kf[] = [[26.9, cx(6), 7.3 + cs], [27.24, cx(6), cy(1)]];  // vertical 2-rack drop into the gap
  // forklifts with tall masts
  const fkl = (side: number) => { const g = new THREE.Group(); g.position.set(ox + side * 5.1, 0, -5.6); put(c, g, ox);
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); g.add(o); return o; };
    add(new THREE.BoxGeometry(1.3, 0.8, 1.9), T("#f2b02e"), 0, 0.7, 0.3); add(new THREE.BoxGeometry(1.1, 0.1, 1.0), T("#2a2f3f"), 0, 1.5, 0.6);
    for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.06, 1.2, 0.06), T("#2a2f3f"), s * 0.5, 2.1, 0.1); add(new THREE.BoxGeometry(0.12, 7.4, 0.14), T("#4a505c"), s * 0.4, 3.7, -0.75); }
    add(new THREE.BoxGeometry(1.1, 0.06, 0.06), T("#2a2f3f"), 0, 2.7, 0.1); add(new THREE.BoxGeometry(1.0, 0.12, 0.1), T("#4a505c"), 0, 7.4, -0.75);
    for (const [wx, wz2] of [[-0.62, 1.0], [0.62, 1.0], [-0.62, -0.05], [0.62, -0.05]]) { const w = add(cylG(0.3, 0.3, 0.22, 14), T("#2a2420"), wx, 0.3, wz2); w.rotation.z = Math.PI / 2; }
    add(new THREE.SphereGeometry(0.09, 8, 6), GL(3, 1.2, 0.2), 0, 2.8, 0.6).layers.set(NOINK);
    const fork = new THREE.Group(); fork.position.set(0, 0, -0.75); g.add(fork);
    for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 1.1), T("#c9d0d8")); o.position.set(s * 0.32, 0, -0.5); fork.add(o); }
    const carr = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), T("#4a505c")); fork.add(carr);
    return { g, fork }; };
  const fl = fkl(-1), fr = fkl(1);
  const bloop = pl(c, bloopTex(), 2.4, 1.2, ox, cy(1) + 0.5, wz + 0.4, 0, true, true); bloop.visible = false;
  const bub = pl(c, speechTex(), 2.0, 1.19, ox + 1.15, 2.5, 1.3, 0, true, true); bub.visible = false;
  c.lamp(ox, 3.4, wz + 1.0, 6.5, 0, [0.3, 0.8, 1.0]);
  c.onFrame((f, set) => {
    if (set !== SET.tetris) return; const t = f / FPS;
    // cell list at time t
    type Cell = { x: number; y: number; ci: number; row: number; white?: boolean };
    const cells: Cell[] = [];
    const clearU = sm(ft + 0.26, ft + 0.5, t), cleared = t >= ft + 0.26;
    const rowDrop = (row: number) => (row >= 1 && cleared ? clearU : 0);
    stat.forEach(([col, row, ci]) => { if (row === 0 && cleared) return; cells.push({ x: cx(col), y: cy(row) - rowDrop(row) * cs, ci, row, white: row === 0 && t > ft && t < ft + 0.26 && Math.floor((t - ft) * 24) % 2 === 0 }); });
    const place = (kf: Kf[], ci: number, landRow: number, landT: number) => { const [px, py] = lerpPath(kf, t); const landed = t >= landT; cells.push({ x: px, y: py - (landed ? rowDrop(landRow) * cs : 0), ci, row: landed ? landRow : 99, white: false }); };
    place(pieceA, 6, 1, 26.82); place(pieceB, 3, 1, 27.0);
    { const [px, py] = lerpPath(pieceC0, t), [qx, qy] = lerpPath(pieceC1, t), landed = t >= ft; if (!(landed && cleared)) cells.push({ x: px, y: py, ci: 0, row: 0, white: t > ft && t < ft + 0.26 && Math.floor((t - ft) * 24) % 2 === 0 }); cells.push({ x: qx, y: qy - (landed ? rowDrop(1) * cs : 0), ci: 5, row: 1 }); }
    pool.forEach((m, i) => { const cl = cells[i]; m.visible = !!cl; if (!cl) return; m.position.set(cl.x, cl.y, wz); m.material = cl.white ? flash : mats[cl.ci % mats.length]; });
    // forklift forks follow their carried racks until the drop point
    const fkPos = (kf: Kf[], fx: number, fk: { fork: THREE.Group; g: THREE.Group }) => { const [px, py] = lerpPath(kf, t); const hold = t < kf[2][0] + 0.02; fk.fork.position.y = hold ? Math.max(0.1, py - 0.3) : Math.max(0.1, lerpPath(kf, kf[2][0])[1] - 0.3 - 0 * fx); void px; };
    fkPos(pieceA, -1, fl); fkPos(pieceB, 1, fr);
    fl.g.position.x = ox - 5.1 + Math.sin(Math.min(t, 26.4) * 2) * 0.0; fr.g.position.x = ox + 5.1;
    bloop.visible = t > ft + 0.1 && t < ft + 0.9; bloop.scale.setScalar(Math.max(0.05, back((t - ft - 0.1) / 0.2)));
    bub.visible = t > BUBBLE.at; bub.scale.setScalar(Math.max(0.05, back((t - BUBBLE.at) / 0.25)));
  });
};

// ============================================================ assemble
export const buildA = (c: SetCtx) => {
  GEAR.globe = makeGear(c, N_GLOBE); GEAR.tree = makeGear(c, N_TREE); GEAR.stairs = makeGear(c, N_STAIRS);
  GEAR.bank1 = makeGear(c, N_BANK); GEAR.bank2 = makeGear(c, N_BANK + 3); GEAR.dish = makeGear(c, N_DISH); GEAR.carpet = makeGear(c, N_CARPET);
  buildGlobe(c); buildStage(c); buildTree(c); buildStairs(c); buildBank(c); buildArcade(c); buildVault(c); buildDish(c); buildCarpet(c); buildTetris(c);
  c.onFrame(() => { for (const g of GEARS) g.visible = false; });
};
