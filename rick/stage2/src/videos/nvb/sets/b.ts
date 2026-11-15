// Video B, section B sets (script lines 9-18, 28.196 - 61.085 s). Only the section-B helper edits this file.
// Everything is code: Canvas2D ctex textures, box/quad meshes. No generated art.
// World slots (region = round(x/100), the camera x picks the visible region):
//   region 7: N_ROOM 700 (search-results room, the HUB), N_GYM 732 (JOIN US recruiting table)
//   region 8: N_COMIC 772 (soap-opera comic board + kiss cam), N_STREET 812 (bouncing car, crowd, pothole)
//   region 9: N_VANST 868 (night street, van), N_VAN 893 (van interior), N_INV 915 (invoice mountain), N_RACK 940 (FOR RENT rack hall)
// REUSE FOR LATER SECTIONS
//   buildResultsRoom(ctx, x, { set, flipAt?, dark?, rack?, hero? })  the hub. Room spans x-7.5..x+7.5, z 7..-10, 6.5 m tall. Back wall z = -9.8.
//     hero (default true): the Taipei-bar card on the back wall that flips open at flipAt (seconds) and pops two whiskey glasses.
//     dark: whole room dimmed to night blue (floating cards barely visible). rack: also builds buildRentRack at (x, z=ROOM_RACK_Z) under a
//     bright cone spotlight (hero is dropped). Use { set: <your SetName>, dark: true, rack: true, hero: false } for lines 24-28.
//     The set name string must be the ShotDef.set of your shots (it gates the per-frame animation). Camera x must stay inside x +- 7.4.
//     Section C: your shot's light should be "night". Returns { rackX, rackZ } (rack world position) when rack is true.
//   buildRentRack(ctx, x, { set, z?, dark?, dings? })  server rack with swinging "FOR RENT" sign and a service bell on a stool at (x+1.35, z+0.45).
//     dings: seconds at which the bell rings (DING! pop). Rack front at z+0.46, top y 2.2, sign hangs at y~1.7 on the rack's left.
//   buildCar(ctx, x)  the tiny cartoon sedan (faces +x, 3 m long). Returns { root, wheels }. Occupants are cast cards placed at y 0.3, scale 0.85.
//   cardTex(i)  floating search-result card textures (0..7).
import * as THREE from "three";
import type { SetCtx } from "../world";
import { boxGeo, quad, V } from "../../bridge/build";
import { ctex } from "../../bridge/paint";
import { twoTone } from "../../bridge/shade";
import { NOINK } from "../../bridge/ink";
import { penguinTex, makeGear, sign } from "./a";
import type { Gear } from "./a";

export const N_ROOM = 700, N_GYM = 732, N_COMIC = 772, N_STREET = 812, N_VANST = 868, N_VAN = 893, N_INV = 915, N_RACK = 940;
export const SB = { room: "nvb_b_room", gym: "nvb_b_gym", comic: "nvb_b_comic", street: "nvb_b_street", vanst: "nvb_b_vanst", van: "nvb_b_van", inv: "nvb_b_inv", rack: "nvb_b_rack" } as const;
export const ROOM_RACK_Z = -5.0;
export const GEARB: Record<string, Gear> = {};
const INKC = "#241726";
const D = THREE.DoubleSide;
const sm = (a: number, b: number, t: number) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
export const hash = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const back = (u: number) => { const c1 = 1.9, c3 = c1 + 1, x = Math.max(0, Math.min(1, u)); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const mc = new Map<string, THREE.MeshLambertMaterial>();
const T = (col: string) => { let m = mc.get(col); if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: col, side: D })); mc.set(col, m); } return m; };
const tc = new Map<string, THREE.MeshLambertMaterial>();
const TX = (tex: THREE.Texture, tint = "#ffffff") => { const k = tex.uuid + tint; let m = tc.get(k); if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ map: tex, color: tint, side: D })); tc.set(k, m); } return m; };
const GL = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: D });
const dkf = (dark?: boolean) => (c: string) => dark ? "#" + new THREE.Color(c).lerp(new THREE.Color("#0a1030"), 0.8).getHexString() : c;
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const M4 = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));
const regionOf = (x: number) => Math.round(x / 100);
const put = <O extends THREE.Object3D>(c: SetCtx, o: O, x = o.position.x): O => { c.R.add(o); o.userData.region = regionOf(x); return o; };
const mesh = (c: SetCtx, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, noInk = false) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); if (noInk) m.layers.set(NOINK); return put(c, m, x);
};
const pl = (c: SetCtx, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, trans = false, noInk = false, tint = 1) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: trans, alphaTest: trans ? 0.4 : 0, side: D, color: new THREE.Color(tint * 0.8, tint * 0.8, tint * 0.8) }));
  m.position.set(x, y, z); m.rotation.y = ry; if (noInk) m.layers.set(NOINK); return put(c, m, x);
};
const bx = (c: SetCtx, mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, tile = 0) =>
  c.b.add(boxGeo(V(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), V(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)), tile), mat);
const qd = (c: SetCtx, mat: THREE.Material, a: [number, number, number], b: [number, number, number], cc: [number, number, number], d: [number, number, number], u = 1, v = 1) =>
  c.b.add(quad(V(...a), V(...b), V(...cc), V(...d), u, v), mat);
const floor = (c: SetCtx, mat: THREE.Material, x0: number, x1: number, zNear: number, zFar: number, y = 0, u = 1, v = 1) => qd(c, mat, [x0, y, zNear], [x1, y, zNear], [x1, y, zFar], [x0, y, zFar], u, v);
const ceil = (c: SetCtx, mat: THREE.Material, x0: number, x1: number, zNear: number, zFar: number, y: number, u = 1, v = 1) => qd(c, mat, [x0, y, zFar], [x1, y, zFar], [x1, y, zNear], [x0, y, zNear], u, v);
const wallZ = (c: SetCtx, mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z: number, u = 1, v = 1) => qd(c, mat, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], u, v);
const wallX = (c: SetCtx, mat: THREE.Material, x: number, zNear: number, zFar: number, y0: number, y1: number, u = 1, v = 1) => qd(c, mat, [x, y0, zNear], [x, y0, zFar], [x, y1, zFar], [x, y1, zNear], u, v);
const cylG = (r0: number, r1: number, h: number, seg = 16) => new THREE.CylinderGeometry(r0, r1, h, seg);
const addCyl = (c: SetCtx, mat: THREE.Material, r0: number, r1: number, h: number, x: number, y: number, z: number, seg = 14, rx = 0, rz = 0) => c.b.add(cylG(r0, r1, h, seg), mat, M4(x, y, z, rx, 0, rz));
const addSph = (c: SetCtx, mat: THREE.Material, r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => c.b.add(new THREE.SphereGeometry(r, 12, 9), mat, M4(x, y, z, 0, 0, 0, sx, sy, sz));
const txt = (g: CanvasRenderingContext2D, s: string, x: number, y: number, px: number, fill: string, stroke?: string, align: CanvasTextAlign = "center") => {
  g.font = `bold ${px}px sans-serif`; g.textAlign = align; g.textBaseline = "middle";
  if (stroke) { g.lineWidth = px * 0.16; g.strokeStyle = stroke; g.lineJoin = "round"; g.strokeText(s, x, y); } g.fillStyle = fill; g.fillText(s, x, y);
};
const star = (g: CanvasRenderingContext2D, cx: number, cy: number, r0: number, r1: number, n: number, fill: string, line = INKC, lw = 8) => {
  g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r0 : r1; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = line; g.lineJoin = "round"; g.stroke();
};
const heartPath = (g: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
  g.beginPath(); g.moveTo(cx, cy + s * 0.9); g.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.9, cy - s * 1.2, cx, cy - s * 0.4); g.bezierCurveTo(cx + s * 0.9, cy - s * 1.2, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9); g.closePath();
};
const shell = (c: SetCtx, ox: number, w: number, zN: number, zF: number, h: number, wallCol: string, floorMat: THREE.Material, ceilCol: string) => {
  floor(c, floorMat, ox - w, ox + w, zN, zF, 0); ceil(c, T(ceilCol), ox - w, ox + w, zN, zF, h);
  wallZ(c, T(wallCol), ox - w, ox + w, 0, h, zF); wallX(c, T(wallCol), ox - w, zN, zF, 0, h); wallX(c, T(wallCol), ox + w, zN, zF, 0, h);
};
const bulb = (c: SetCtx, x: number, y: number, z: number, r = 0.08, col: [number, number, number] = [3.2, 2.6, 1.6]) => mesh(c, new THREE.SphereGeometry(r, 10, 8), GL(...col), x, y, z, 0, 0, 0, true);
const flat = (c: SetCtx, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, tint = 1.1, ry = 0) => pl(c, tex, w, h, x, y, z, ry, true, true, tint);

// ============================================================ search result cards
const CARDS: [string, string, string, string][] = [
  ["Who is Alice Huang?", "alicehuang.wiki", "No relation. Please stop asking.", "#e2463a"],
  ["Alice Huang: the full story", "newsdaily.com", "Everything we know so far...", "#3b82c4"],
  ["Huang family tree, explained", "familytree.lol", "Two Huangs. One red string.", "#e0b43a"],
  ["Megaspeed, explained", "chipwatch.net", "A quiet little company...", "#5ab07a"],
  ["Taipei bar, 2024 · photos", "images.search", "See photos from the night...", "#8a5ac9"],
  ["Why did he quit?", "askeverything.com", "12,000 theories and counting", "#e07a3a"],
  ["Alice Huang net worth", "moneytalk.biz", "You will not believe number 7", "#3dbfa0"],
  ["is it a pothole?", "roads.fyi", "Top answer: it was a pothole", "#d9473b"],
];
export const cardTex = (i: number) => ctex("nbB_card" + (i % 8), 512, 320, (g) => {
  const [t, u, d, col] = CARDS[i % 8];
  g.fillStyle = "#fbfcff"; g.fillRect(0, 0, 512, 320); g.lineWidth = 14; g.strokeStyle = INKC; g.strokeRect(7, 7, 498, 306);
  g.fillStyle = col; g.beginPath(); g.arc(52, 58, 26, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  txt(g, u, 92, 58, 30, "#1f8a4a", undefined, "left");
  const words = t.split(" "); let l1 = "", l2 = ""; words.forEach((w) => { if ((l1 + " " + w).length < 17 && !l2) l1 += (l1 ? " " : "") + w; else l2 += (l2 ? " " : "") + w; });
  txt(g, l1, 28, 130, 58, "#1a4fd0", undefined, "left"); if (l2) txt(g, l2, 28, 196, 58, "#1a4fd0", undefined, "left");
  g.fillStyle = "#a8b0c4"; txt(g, d, 28, 270, 30, "#6a7388", undefined, "left");
});
const heroFront = () => ctex("nbB_herof", 640, 420, (g) => {
  g.fillStyle = "#fbfcff"; g.fillRect(0, 0, 640, 420); g.lineWidth = 16; g.strokeStyle = INKC; g.strokeRect(8, 8, 624, 404);
  g.fillStyle = "#8a5ac9"; g.beginPath(); g.arc(64, 64, 32, 0, 7); g.fill(); g.lineWidth = 7; g.stroke();
  txt(g, "images.search", 116, 64, 36, "#1f8a4a", undefined, "left");
  txt(g, "Taipei bar, 2024", 34, 170, 76, "#1a4fd0", undefined, "left"); txt(g, "· photos ·", 34, 262, 76, "#1a4fd0", undefined, "left");
  txt(g, "click to open  ▸", 34, 360, 36, "#6a7388", undefined, "left");
});
const heroBack = () => ctex("nbB_herob", 640, 420, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 420); gr.addColorStop(0, "#2a1740"); gr.addColorStop(1, "#6b2a4a"); g.fillStyle = gr; g.fillRect(0, 0, 640, 420);
  for (let i = 0; i < 7; i++) { const x = 60 + i * 90; g.strokeStyle = "#f2c53a"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 40 + (i % 2) * 14); g.stroke(); g.fillStyle = i % 2 ? "#ff3d5a" : "#ffb02e"; g.beginPath(); g.ellipse(x, 66 + (i % 2) * 14, 24, 32, 0, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke(); }
  g.fillStyle = "#101a3a"; rr(g, 150, 118, 340, 70, 14); g.fill(); g.lineWidth = 8; g.strokeStyle = "#5fd0ff"; g.stroke(); txt(g, "TAIPEI BAR", 320, 154, 52, "#5fd0ff");
  for (let i = 0; i < 5; i++) { g.fillStyle = ["#3dbfa0", "#e0b43a", "#d9473b", "#8a5ac9", "#3b82c4"][i]; g.fillRect(40 + i * 118, 214, 54, 66 + (i % 2) * 18); g.lineWidth = 5; g.strokeStyle = INKC; g.strokeRect(40 + i * 118, 214, 54, 66 + (i % 2) * 18); }
  g.fillStyle = "#4a2a1e"; g.fillRect(0, 300, 640, 120); g.fillStyle = "#6a3e2a"; g.fillRect(0, 300, 640, 22); g.lineWidth = 8; g.strokeStyle = INKC; g.strokeRect(8, 8, 624, 404);
});
const searchBarTex = () => ctex("nbB_sbar", 1400, 190, (g) => {
  g.fillStyle = "rgba(12,30,80,0.92)"; rr(g, 8, 8, 1384, 174, 87); g.fill(); g.lineWidth = 12; g.strokeStyle = "#5fd0ff"; g.stroke();
  g.strokeStyle = "#5fd0ff"; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.arc(120, 90, 34, 0, 7); g.stroke(); g.beginPath(); g.moveTo(144, 114); g.lineTo(176, 148); g.stroke();
  txt(g, "who is alice huang", 250, 96, 96, "#ffffff", undefined, "left");
});
const glassGroup = (c: SetCtx, ox: number) => {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const k = new THREE.Group(); k.position.set(s * 0.5, 0, 0);
    const glass = new THREE.Mesh(cylG(0.28, 0.22, 0.5, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 1.2, 1.4), transparent: true, opacity: 0.42, side: D, depthWrite: false })); glass.position.y = 0.25; k.add(glass);
    const liq = new THREE.Mesh(cylG(0.26, 0.215, 0.3, 14), T("#d98a2a")); liq.position.y = 0.17; k.add(liq);
    for (let i = 0; i < 2; i++) { const ic = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.7, 1.9), transparent: true, opacity: 0.85 })); ic.position.set(-0.07 + i * 0.14, 0.3 + i * 0.02, 0.02); ic.rotation.set(0.4, i, 0.3); k.add(ic); }
    g.add(k);
  }
  g.position.set(ox, 0, 0); return g;
};

// ============================================================ the search-results room (hub)
export const buildResultsRoom = (c: SetCtx, ox: number, o: { set: string; flipAt?: number; dark?: boolean; rack?: boolean; hero?: boolean }) => {
  const dk = dkf(o.dark), tint = o.dark ? 0.22 : 1, hero = (o.hero ?? !o.rack);
  const W = 7.5, zN = 7, zF = -10, H = 6.5;
  const chk = ctex("nbB_rfloor", 256, 256, (g) => { g.fillStyle = dk("#26418c"); g.fillRect(0, 0, 256, 256); g.fillStyle = dk("#34559f"); g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128); g.strokeStyle = o.dark ? "#2a4a8a" : "#4fb0f0"; g.lineWidth = 3; g.strokeRect(1, 1, 254, 254); });
  shell(c, ox, W, zN, zF, H, dk("#101a40"), TX(chk), dk("#0c1330"));
  floor(c, TX(chk), ox - W, ox + W, zN, zF, 0, 5, 7);
  for (const s of [-1, 1]) { bx(c, T(dk("#2a8ad0")), ox + s * W - 0.05, 0.9, zF, ox + s * W + 0.05, 1.0, zN); bx(c, T(dk("#5fd0ff")), ox + s * W - 0.04, H - 0.5, zF, ox + s * W + 0.04, H - 0.4, zN); }
  bx(c, T(dk("#5fd0ff")), ox - W, H - 0.5, zF + 0.0, ox + W, H - 0.4, zF + 0.1);
  mesh(c, new THREE.PlaneGeometry(14, 1.0), GL(0.3, 0.8, 1.6), ox, 3.3, zF + 0.05, 0, 0, 0, true).visible = !o.dark;
  // floating result cards on three walls + a cloud drifting in the middle
  const cards: { m: THREE.Mesh; y0: number; ph: number }[] = [];
  const addCard = (i: number, x: number, y: number, z: number, ry: number, w = 1.6, rz = 0) => { const m = pl(c, cardTex(i), w, w * 0.625, x, y, z, ry, false, false, tint); m.rotation.z = rz; cards.push({ m, y0: y, ph: hash(i + x) * 6 }); return m; };
  let n = 0;
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) { addCard(n++, ox - 7.25, 1.3 + r * 1.2, 5.2 - k * 2.5, Math.PI / 2, 1.7, (hash(n) - 0.5) * 0.14); addCard(n++, ox + 7.25, 1.3 + r * 1.2, 5.2 - k * 2.5, -Math.PI / 2, 1.7, (hash(n) - 0.5) * 0.14); }
  for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) { if (hero && r === 1 && k >= 2 && k <= 4) continue; if (o.rack && r < 2 && k >= 2 && k <= 4) continue; addCard(n++, ox - 6 + k * 2.0, 1.2 + r * 1.35 + (k % 2) * 0.3, zF + 0.12, 0, 1.7, (hash(n) - 0.5) * 0.12); }
  const near: [number, number, number][] = [[-3.6, 2.0, 3.6], [3.4, 3.4, 2.4], [-2.4, 4.4, 0.2], [2.6, 1.0, -1.2], [-4.4, 3.2, -3.4], [4.6, 4.5, -2.8], [0.4, 5.2, -4]];
  near.forEach(([dx, y, z], i) => { const m = addCard(n++, ox + dx, y, z, (hash(i) - 0.5) * 0.9, 1.5, (hash(i + 3) - 0.5) * 0.3); m.rotation.y = (hash(i) - 0.5) * 0.9; });
  // lit pools, ceiling lamps
  for (let i = 0; i < 4; i++) { const zz = 3 - i * 4.4; for (const s of [-1, 1]) { bx(c, T(dk("#dfe9ff")), ox + s * 3 - 0.8, H - 0.1, zz - 0.15, ox + s * 3 + 0.8, H, zz + 0.15); c.lamp(ox + s * 3, H - 0.4, zz, 3.4, 0, o.dark ? [0.1, 0.16, 0.4] : [0.45, 0.65, 1.0]); } }
  const flipAt = o.flipAt ?? 1e9;
  let heroG: THREE.Group | null = null, gl: THREE.Group | null = null, hb: THREE.Mesh | null = null, ding: THREE.Mesh | null = null;
  if (hero) {
    heroG = new THREE.Group(); heroG.position.set(ox, 2.75, zF + 1.6); put(c, heroG, ox);
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.43), new THREE.MeshBasicMaterial({ map: heroFront(), side: THREE.FrontSide })); fr.position.z = 0.02; heroG.add(fr);
    const bk = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.43), new THREE.MeshBasicMaterial({ map: heroBack(), side: THREE.FrontSide, color: new THREE.Color(1.15, 1.15, 1.15) })); bk.rotation.y = Math.PI; bk.position.z = -0.02; heroG.add(bk);
    hb = new THREE.Mesh(new THREE.BoxGeometry(3.7, 2.43, 0.03), T("#241726")); heroG.add(hb);
    gl = glassGroup(c, ox); gl.position.set(ox, 1.05, zF + 3.0); gl.scale.setScalar(0.01); put(c, gl, ox);
    const clink = pl(c, ctex("nbB_clink", 256, 256, (g) => { star(g, 128, 128, 44, 118, 8, "#fff6b0", INKC, 8); txt(g, "CLINK", 128, 128, 56, INKC); }), 1.5, 1.5, ox, 2.0, zF + 3.3, 0, true, true, 1.3); clink.visible = false; ding = clink;
    c.lamp(ox, 3.0, zF + 3, 5.5, 0, [0.50, 0.28, 0.44]);
  }
  let rackInfo: { rackX: number; rackZ: number } | null = null;
  let cone: THREE.Mesh | null = null;
  if (o.rack) {
    buildRentRack(c, ox, { set: o.set, z: ROOM_RACK_Z, dings: [] });
    cone = mesh(c, new THREE.CylinderGeometry(0.4, 2.2, 6.4, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.95, 0.7), transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: D }), ox, 3.3, ROOM_RACK_Z + 0.2, 0, 0, 0, true); cone.renderOrder = 3;
    c.lamp(ox, 2.2, ROOM_RACK_Z + 1.2, 4.2, 0, [0.55, 0.50, 0.33]);
    rackInfo = { rackX: ox, rackZ: ROOM_RACK_Z };
  }
  c.onFrame((f, set) => {
    if (set !== o.set) return; const t = f / 30;
    cards.forEach((k, i) => { k.m.position.y = k.y0 + Math.sin(t * 0.9 + k.ph) * 0.07; if (i % 3 === 0) k.m.rotation.z += Math.sin(t * 0.7 + k.ph) * 0.0006; });
    if (heroG && gl && ding) {
      const u = (t - flipAt) / 0.55, fu = sm(0, 1, u);
      heroG.rotation.y = Math.PI * fu + Math.sin(Math.min(1, Math.max(0, u)) * Math.PI) * 0.0; heroG.position.z = zF + 1.6 + Math.sin(fu * Math.PI) * 0.8; heroG.position.y = 2.75 + Math.sin(fu * Math.PI) * 0.15;
      const gu = (t - flipAt - 0.4) / 0.3; gl.scale.setScalar(gu <= 0 ? 0.01 : Math.max(0.01, back(gu)) * 1.7); gl.position.y = 1.05 + Math.sin(t * 2) * 0.03;
      ding.visible = t > flipAt + 0.85 && t < flipAt + 1.5; ding.scale.setScalar(Math.max(0.05, back((t - flipAt - 0.85) / 0.2)));
    }
    if (cone) cone.material = cone.material;
  });
  void hb; void sign; void ding;
  return rackInfo ?? { rackX: ox, rackZ: 0 };
};

// ============================================================ FOR RENT rack
const rackFront = (key: string) => ctex(key, 256, 512, (g, r) => {
  g.fillStyle = "#222838"; g.fillRect(0, 0, 256, 512); g.lineWidth = 10; g.strokeStyle = INKC; g.strokeRect(5, 5, 246, 502);
  for (let i = 0; i < 9; i++) { const y = 22 + i * 54; g.fillStyle = "#394058"; rr(g, 18, y, 220, 44, 6); g.fill(); g.lineWidth = 4; g.strokeStyle = INKC; g.stroke();
    for (let k = 0; k < 8; k++) { g.fillStyle = r() < 0.5 ? "#3dff8a" : "#ffe46a"; g.fillRect(30 + k * 13, y + 10, 8, 8); } g.fillStyle = "#0e121e"; for (let k = 0; k < 7; k++) g.fillRect(138 + k * 12, y + 8, 6, 28); }
});
const rentSign = () => ctex("nbB_rent", 640, 320, (g) => {
  g.fillStyle = "#fff3d0"; g.fillRect(0, 0, 640, 320); g.lineWidth = 18; g.strokeStyle = INKC; g.strokeRect(9, 9, 622, 302);
  g.lineWidth = 8; g.strokeStyle = "#d9202e"; g.strokeRect(34, 34, 572, 252); txt(g, "FOR RENT", 320, 140, 150, "#d9202e", INKC); txt(g, "inquire within", 320, 255, 46, INKC);
});
export const buildRentRack = (c: SetCtx, x: number, o: { set: string; z?: number; dark?: boolean; dings?: number[] }) => {
  const z = o.z ?? 0, dings = o.dings ?? [59.22], dk = dkf(false);
  const body = T(dk("#2a2f3f"));
  bx(c, body, x - 0.62, 0, z - 0.5, x + 0.62, 2.3, z + 0.5); bx(c, T("#4a505c"), x - 0.68, 2.3, z - 0.55, x + 0.68, 2.38, z + 0.55); bx(c, T("#4a505c"), x - 0.68, 0, z - 0.55, x + 0.68, 0.08, z + 0.55);
  pl(c, rackFront("nbB_rackf"), 1.2, 2.2, x, 1.17, z + 0.51, 0, false, false, 1.1);
  mesh(c, new THREE.PlaneGeometry(1.1, 2.1), GL(0.15, 0.55, 1.1), x, 1.17, z + 0.504, 0, 0, 0, true).visible = false;
  for (let i = 0; i < 6; i++) bulb(c, x - 0.5 + i * 0.2, 2.45, z + 0.3, 0.05, [0.5, 2.8, 1.4]);
  // cables spilling out the side
  for (let i = 0; i < 5; i++) c.b.add(new THREE.TorusGeometry(0.25 + i * 0.05, 0.03, 6, 14, 3.6), T(["#e2463a", "#3b82c4", "#e0b43a", "#3dbfa0", "#8a5ac9"][i]), M4(x + 0.75 + i * 0.05, 0.5 + i * 0.05, z + 0.1 + i * 0.12, 0.4, 0.3, i));
  // hanging FOR RENT sign
  const sg = new THREE.Group(); sg.position.set(x - 0.4, 2.3, z + 0.62); put(c, sg, x);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshBasicMaterial({ map: rentSign(), side: D })); board.position.set(0, -1.05, 0); sg.add(board);
  for (const s of [-1, 1]) { const rope = new THREE.Mesh(cylG(0.012, 0.012, 0.72, 5), T("#c9b27a")); rope.position.set(s * 0.6, -0.35, 0); rope.rotation.z = s * -0.2; sg.add(rope); }
  // the little bell on a stool
  const bz = z + 0.55, bxx = x + 1.38;
  addCyl(c, T("#8a5a34"), 0.3, 0.3, 0.05, bxx, 0.8, bz, 14); for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) addCyl(c, T("#6a4020"), 0.025, 0.025, 0.8, bxx + dx, 0.4, bz + dz, 6);
  const bell = new THREE.Group(); bell.position.set(bxx, 0.83, bz); put(c, bell, x);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), T("#f2c53a")); bell.add(dome);
  const base = new THREE.Mesh(cylG(0.25, 0.25, 0.04, 16), T("#c9a02a")); base.position.y = 0.02; bell.add(base);
  const plunger = new THREE.Mesh(cylG(0.03, 0.03, 0.08, 8), T("#c9ced6")); plunger.position.y = 0.23; bell.add(plunger);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), T("#d9202e")); knob.position.y = 0.29; bell.add(knob);
  const dg = pl(c, ctex("nbB_ding", 320, 200, (g) => { star(g, 160, 100, 62, 118, 9, "#fff3a0", INKC, 8); txt(g, "DING!", 160, 100, 70, "#d9202e", INKC); }), 1.1, 0.7, bxx + 0.1, 1.4, bz + 0.2, 0, true, true, 1.3); dg.visible = false;
  c.lamp(x + 0.2, 1.6, z + 1.4, 3.4, 0, o.dark ? [1.0, 0.95, 0.7] : [0.4, 0.7, 1.0]);
  c.onFrame((f, set) => {
    if (set !== o.set) return; const t = f / 30;
    sg.rotation.z = Math.sin(t * 2.1) * 0.07 + Math.sin(t * 5.3) * 0.015;
    let k = 99; for (const d of dings) if (t >= d && t - d < k) k = t - d;
    dg.visible = k < 0.8 && k >= 0; dg.scale.setScalar(Math.max(0.05, back(k / 0.18)) * 1.0); dg.rotation.z = Math.sin(k * 40) * 0.12;
    knob.position.y = 0.29 - (k < 0.12 && k >= 0 ? 0.05 : 0); bell.rotation.z = k < 0.5 && k >= 0 ? Math.sin(k * 50) * 0.05 * (1 - k * 2) : 0;
  });
  return { sg, bell };
};

// ============================================================ the tiny cartoon sedan (faces +x)
export const buildCar = (c: SetCtx, x: number) => {
  const root = new THREE.Group(); root.position.set(x, 0, 0); put(c, root, x);
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); root.add(m); return m; };
  const blue = T("#58b6e8"), dark = T("#2a3a5c"), white = T("#f4f1ea"), red = T("#d9473b");
  add(new THREE.BoxGeometry(3.1, 0.5, 1.45), blue, 0, 0.5, 0);                         // body
  add(new THREE.BoxGeometry(1.0, 0.18, 1.35), blue, 1.0, 0.8, 0); add(new THREE.BoxGeometry(0.6, 0.22, 1.35), blue, -1.25, 0.78, 0);   // hood + trunk
  add(new THREE.BoxGeometry(3.14, 0.06, 1.48), white, 0, 0.74, 0);                       // stripe
  add(new THREE.BoxGeometry(0.1, 0.55, 1.55), red, 1.57, 0.5, 0); add(new THREE.BoxGeometry(0.1, 0.55, 1.55), red, -1.57, 0.5, 0);    // bumpers
  add(new THREE.BoxGeometry(1.8, 0.07, 1.4), blue, -0.1, 1.82, 0, 0, 0, 0);               // roof
  for (const sx of [-0.95, 0.75]) for (const sz of [-0.66, 0.66]) add(new THREE.BoxGeometry(0.07, 0.95, 0.07), dark, sx, 1.33, sz);
  add(new THREE.BoxGeometry(0.06, 0.55, 1.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.9, 1.1), transparent: true, opacity: 0.35, side: D, depthWrite: false }), 0.78, 1.33, 0, 0, 0, -0.35);
  add(new THREE.BoxGeometry(0.1, 0.6, 1.1), dark, -0.55, 1.1, 0);                          // seat backs
  add(new THREE.BoxGeometry(0.3, 0.14, 0.5), GL(3, 2.6, 1.4), 1.6, 0.58, 0.45).layers.set(NOINK); add(new THREE.BoxGeometry(0.3, 0.14, 0.5), GL(3, 2.6, 1.4), 1.6, 0.58, -0.45).layers.set(NOINK);
  add(new THREE.BoxGeometry(0.3, 0.12, 0.4), GL(2.4, 0.3, 0.3), -1.6, 0.6, 0.5).layers.set(NOINK); add(new THREE.BoxGeometry(0.3, 0.12, 0.4), GL(2.4, 0.3, 0.3), -1.6, 0.6, -0.5).layers.set(NOINK);
  const wheels: THREE.Group[] = [];
  for (const [wx, wz] of [[1.0, 0.76], [-1.0, 0.76], [1.0, -0.76], [-1.0, -0.76]]) {
    const w = new THREE.Group(); w.position.set(wx, 0.3, wz); root.add(w);
    const tire = new THREE.Mesh(cylG(0.3, 0.3, 0.22, 14), T("#2a2420")); tire.rotation.x = Math.PI / 2; w.add(tire);
    const hub = new THREE.Mesh(cylG(0.14, 0.14, 0.24, 10), T("#e8ecf4")); hub.rotation.x = Math.PI / 2; w.add(hub);
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.25), T("#8d949c")); w.add(sp); wheels.push(w);
  }
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.2), new THREE.MeshBasicMaterial({ map: sign("nbB_plate", 200, 80, "#ffffff", INKC, "NV-1", 46), side: D })); plate.position.set(-1.63, 0.45, 0); plate.rotation.y = -Math.PI / 2; root.add(plate);
  return { root, wheels };
};

// ============================================================ line 10: the JOIN US recruiting booth
const joinTex = () => ctex("nbB_join", 600, 420, (g) => {
  g.fillStyle = "#f2d23a"; g.fillRect(0, 0, 600, 420); g.lineWidth = 22; g.strokeStyle = INKC; g.strokeRect(11, 11, 578, 398);
  txt(g, "JOIN", 300, 130, 170, INKC); txt(g, "US!", 300, 290, 200, "#d9202e", INKC);
});
export const GYM = { signW: 0.95 };
export const joinSign = (c: SetCtx, x: number) => { const g = new THREE.Group(); put(c, g, x);
  const stick = new THREE.Mesh(cylG(0.028, 0.028, 1.5, 6), T("#e8cfa0")); stick.position.y = -0.55; g.add(stick);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(GYM.signW, GYM.signW * 0.7), new THREE.MeshBasicMaterial({ map: joinTex(), side: D })); board.position.y = 0.38; g.add(board);
  g.visible = false; return g; };
export const GYMSIGN: { g?: THREE.Group } = {};
const buildGym = (c: SetCtx) => {
  const ox = N_GYM, W = 6.5, H = 4.6, zN = 6, zF = -9;
  const wood = ctex("nbB_gwood", 256, 256, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#c9a06a" : "#bd9360"; g.fillRect(0, i * 32, 256, 32); g.fillStyle = "#8a6a40"; g.fillRect(0, i * 32, 256, 3); } g.fillStyle = "#d9202e"; g.fillRect(0, 118, 256, 8); });
  shell(c, ox, W, zN, zF, H, "#e9e3d6", TX(wood), "#2a2f3f"); floor(c, TX(wood), ox - W, ox + W, zN, zF, 0, 4, 6);
  // mirror wall (right) and brick-red band
  const mirror = ctex("nbB_mirror", 512, 256, (g) => { const gr = g.createLinearGradient(0, 0, 512, 256); gr.addColorStop(0, "#9fd0ea"); gr.addColorStop(0.5, "#d8eef8"); gr.addColorStop(1, "#8fc2e0"); g.fillStyle = gr; g.fillRect(0, 0, 512, 256); g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 16; g.beginPath(); g.moveTo(40, 256); g.lineTo(190, 0); g.moveTo(130, 256); g.lineTo(280, 0); g.stroke(); g.strokeStyle = INKC; g.lineWidth = 12; g.strokeRect(6, 6, 500, 244); });
  pl(c, mirror, 11, 2.6, ox + W - 0.05, 1.9, -1.5, -Math.PI / 2, false, true, 1.0); wallX(c, T("#c8352c"), ox - W + 0.02, zN, zF, 0, 1.0);
  bx(c, T("#c8352c"), ox - W, 0, zF, ox + W, 1.0, zF + 0.05);
  // banner JOIN US + slogans
  pl(c, ctex("nbB_joinb", 1500, 330, (g) => { g.fillStyle = "#d9202e"; g.fillRect(0, 0, 1500, 330); g.lineWidth = 24; g.strokeStyle = "#f2d23a"; g.strokeRect(12, 12, 1476, 306); txt(g, "JOIN US", 750, 150, 250, "#f2d23a", INKC); txt(g, "NO EXPERIENCE NEEDED", 750, 286, 56, "#ffffff"); }), 7.2, 1.58, ox, 3.4, zF + 0.12, 0, false, true, 1.1);
  pl(c, sign("nbB_nopain", 700, 280, "#2a2f3f", "#f2d23a", ["NO EXCUSES", "(ONLY FREE TRIALS)"], 70), 2.2, 0.88, ox - 4.3, 2.4, zF + 0.12);
  pl(c, ctex("nbB_flex", 300, 420, (g) => { g.fillStyle = "#3b82c4"; g.fillRect(0, 0, 300, 420); g.lineWidth = 14; g.strokeStyle = INKC; g.strokeRect(7, 7, 286, 406); g.fillStyle = "#ffe2c2"; g.beginPath(); g.arc(150, 130, 52, 0, 7); g.fill(); g.lineWidth = 8; g.stroke(); g.fillStyle = "#f2d23a"; g.fillRect(90, 190, 120, 130); g.strokeRect(90, 190, 120, 130); g.fillStyle = "#ffe2c2"; g.beginPath(); g.arc(70, 230, 30, 0, 7); g.arc(230, 230, 30, 0, 7); g.fill(); g.stroke(); txt(g, "BE A", 150, 350, 40, "#fff"); txt(g, "LEGEND", 150, 392, 40, "#fff"); }), 1.5, 2.1, ox + 4.4, 2.5, zF + 0.12);
  // the recruiting table with flyers, a bowl of free stickers, a banner on the front
  bx(c, T("#2a2f3f"), ox - 1.9, 0, -3.8, ox + 1.9, 0.9, -2.9); bx(c, T("#f4f1ea"), ox - 2.0, 0.9, -3.9, ox + 2.0, 0.96, -2.8);
  pl(c, ctex("nbB_tbl", 600, 200, (g) => { g.fillStyle = "#d9202e"; g.fillRect(0, 0, 600, 200); g.lineWidth = 14; g.strokeStyle = INKC; g.strokeRect(7, 7, 586, 186); txt(g, "FIRST MONTH FREE", 300, 100, 66, "#ffffff", INKC); }), 3.5, 0.78, ox, 0.46, -2.88, 0, false, true, 1.1);
  for (let i = 0; i < 6; i++) bx(c, T(["#ffffff", "#f2d23a", "#8fd0ff"][i % 3]), ox - 1.6 + i * 0.4, 0.96, -3.5 + (i % 2) * 0.2, ox - 1.25 + i * 0.4, 0.975, -3.15 + (i % 2) * 0.2);
  addCyl(c, T("#e8e4da"), 0.2, 0.17, 0.2, ox + 1.4, 1.06, -3.35, 14);
  // dumbbell rack, kettlebells, punching bag, treadmill, vending machine, plants
  bx(c, T("#2a2f3f"), ox - W + 0.2, 0, -8.4, ox - W + 1.2, 1.1, -5.2); bx(c, T("#2a2f3f"), ox - W + 0.2, 1.1, -8.4, ox - W + 1.2, 1.15, -5.2);
  for (let i = 0; i < 6; i++) for (const lv of [0, 1]) { const zz = -8.1 + i * 0.5, yy = 0.34 + lv * 0.5, r = 0.1 + i * 0.012; addCyl(c, T(lv ? "#d9202e" : "#3b82c4"), 0.04, 0.04, 0.4, ox - W + 0.7, yy, zz, 6, 0, Math.PI / 2); addCyl(c, T("#17141a"), r, r, 0.07, ox - W + 0.5, yy, zz, 10, 0, Math.PI / 2); addCyl(c, T("#17141a"), r, r, 0.07, ox - W + 0.9, yy, zz, 10, 0, Math.PI / 2); }
  for (let i = 0; i < 4; i++) { addSph(c, T(["#d9202e", "#f2d23a", "#3b82c4", "#17141a"][i]), 0.26, ox + 3.6 + i * 0.62, 0.26, -7.5); c.b.add(new THREE.TorusGeometry(0.15, 0.04, 6, 12, Math.PI), T("#17141a"), M4(ox + 3.6 + i * 0.62, 0.52, -7.5, 0, 0, 0)); }
  mesh(c, new THREE.CylinderGeometry(0.01, 0.01, 1.6, 4), T("#c9ced6"), ox + 4.6, 3.8, -6.0); mesh(c, cylG(0.36, 0.36, 1.4, 14), T("#d9202e"), ox + 4.6, 2.2, -6.0);
  bx(c, T("#2a2f3f"), ox - 5.5, 0.2, -2.0, ox - 3.6, 0.5, -0.6); bx(c, T("#17141a"), ox - 5.4, 0.5, -1.9, ox - 3.7, 0.55, -0.7); bx(c, T("#2a2f3f"), ox - 5.5, 0.5, -2.0, ox - 5.35, 1.7, -1.9);
  bx(c, T("#e8b93a"), ox + 4.8, 0, -3.9, ox + 6.2, 2.1, -3.1); pl(c, sign("nbB_vend", 200, 320, "#2a2f3f", "#f2d23a", ["PROTEIN", "$9"], 52), 0.9, 1.4, ox + 5.5, 1.2, -3.08);
  for (let i = 0; i < 5; i++) { bx(c, T("#d9202e"), ox + 5.0, 0.4 + i * 0.35, -3.07, ox + 6.0, 0.55 + i * 0.35, -3.0); }
  for (let i = 0; i < 6; i++) { const l = ox - 4 + i * 1.6; bx(c, T("#ffffff"), l - 0.7, H - 0.12, -1 - (i % 2) * 4, l + 0.7, H - 0.05, -1.3 - (i % 2) * 4); c.lamp(l, H - 0.5, -1.2 - (i % 2) * 4, 1.6, 0, [0.55, 0.50, 0.39]); }
  c.lamp(ox, 2.0, -2.0, 3.0, 0, [0.55, 0.41, 0.22]);
  GEARB.gym = makeGear(c, ox); GYMSIGN.g = joinSign(c, ox);
};

// ============================================================ lines 11: soap-opera comic board
export const COMIC = { px: [N_COMIC - 4.6, N_COMIC, N_COMIC + 4.6], pz: -5.9, kissAt: 35.3, scratchAt: 35.68, kissCamAt: 37.45, carX: N_COMIC + 4.6 };
const halftone = () => ctex("nbB_halft", 512, 512, (g) => { g.fillStyle = "#ff7ab0"; g.fillRect(0, 0, 512, 512); g.fillStyle = "#ff9ac8"; for (let y = 0; y < 512; y += 32) for (let x = 0; x < 512; x += 32) { g.beginPath(); g.arc(x + (y / 32 % 2) * 16, y, 9, 0, 7); g.fill(); } });
const panelTex = (k: number) => ctex("nbB_panel" + k, 640, 760, (g) => {
  if (k === 0) {
    g.fillStyle = "#7a2a3a"; g.fillRect(0, 0, 640, 760); g.fillStyle = "#4a1a2e"; g.fillRect(0, 440, 640, 320);
    for (let i = 0; i < 5; i++) { const x = 70 + i * 125; g.strokeStyle = "#f2c53a"; g.lineWidth = 5; g.beginPath(); g.moveTo(x, 130); g.lineTo(x, 190 + (i % 2) * 20); g.stroke(); g.fillStyle = i % 2 ? "#ff3d5a" : "#ffb02e"; g.beginPath(); g.ellipse(x, 225 + (i % 2) * 20, 34, 44, 0, 0, 7); g.fill(); g.lineWidth = 7; g.strokeStyle = INKC; g.stroke(); }
    g.fillStyle = "#101a3a"; rr(g, 150, 250, 340, 90, 18); g.fill(); g.lineWidth = 9; g.strokeStyle = "#ff7ab0"; g.stroke(); txt(g, "RESTAURANT", 320, 296, 58, "#ff7ab0");
    g.fillStyle = "#e8e4da"; g.fillRect(0, 560, 640, 200); g.fillStyle = "#c82a3a"; for (let i = 0; i < 9; i++) g.fillRect(i * 80, 560, 40, 200); g.fillStyle = "#fff6b0"; g.fillRect(300, 480, 40, 80); g.fillStyle = "#ffb02e"; g.beginPath(); g.ellipse(320, 468, 14, 26, 0, 0, 7); g.fill();
  } else if (k === 1) {
    g.fillStyle = "#ffe23a"; g.fillRect(0, 0, 640, 760); g.fillStyle = "#ff3d5a"; for (let i = 0; i < 24; i += 2) { const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2; g.beginPath(); g.moveTo(320, 420); g.lineTo(320 + Math.cos(a0) * 900, 420 + Math.sin(a0) * 900); g.lineTo(320 + Math.cos(a1) * 900, 420 + Math.sin(a1) * 900); g.fill(); }
    star(g, 320, 420, 190, 300, 16, "#ffffff", INKC, 12); txt(g, "SHOCKING!", 320, 420, 86, "#d9202e", INKC);
  } else {
    const gr = g.createLinearGradient(0, 0, 0, 760); gr.addColorStop(0, "#1a1f5a"); gr.addColorStop(1, "#6b3a7a"); g.fillStyle = gr; g.fillRect(0, 0, 640, 760);
    g.fillStyle = "#fff6b0"; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc((i * 211) % 640, (i * 97) % 380, 4, 0, 7); g.fill(); } star(g, 500, 130, 40, 70, 12, "#fff6b0", INKC, 6);
    g.fillStyle = "#17141a"; g.fillRect(0, 500, 640, 260); g.fillStyle = "#f2c53a"; for (let i = 0; i < 5; i++) g.fillRect(i * 140 + 20, 620, 80, 12);
    g.fillStyle = "#101a3a"; for (let i = 0; i < 6; i++) g.fillRect(i * 110, 300 + (i % 3) * 40, 90, 200); g.fillStyle = "#ffd36a"; for (let i = 0; i < 40; i++) g.fillRect((i * 53) % 640, 330 + ((i * 37) % 160), 10, 14);
  }
  g.lineWidth = 24; g.strokeStyle = INKC; g.strokeRect(12, 12, 616, 736);
});
const capTex = (k: number, s: string) => ctex("nbB_cap" + k, 640, 150, (g) => { g.fillStyle = "#fff3a0"; g.fillRect(0, 0, 640, 150); g.lineWidth = 12; g.strokeStyle = INKC; g.strokeRect(6, 6, 628, 138); txt(g, s, 320, 78, s.length > 18 ? 50 : 60, INKC); });
const heartTex = () => ctex("nbB_heart", 192, 192, (g) => { heartPath(g, 96, 90, 52); g.fillStyle = "#ff3d6a"; g.fill(); g.lineWidth = 10; g.strokeStyle = INKC; g.stroke(); g.fillStyle = "rgba(255,255,255,0.75)"; g.beginPath(); g.ellipse(58, 56, 14, 9, -0.6, 0, 7); g.fill(); });
const vinylTex = () => ctex("nbB_vinyl", 512, 400, (g) => { g.fillStyle = "#17141a"; g.beginPath(); g.arc(200, 200, 180, 0, 7); g.fill(); g.lineWidth = 10; g.strokeStyle = INKC; g.stroke(); g.strokeStyle = "#3a3f50"; g.lineWidth = 4; for (let r = 40; r < 170; r += 18) { g.beginPath(); g.arc(200, 200, r, 0, 7); g.stroke(); } g.fillStyle = "#d9202e"; g.beginPath(); g.arc(200, 200, 44, 0, 7); g.fill(); g.strokeStyle = "#f2d23a"; g.lineWidth = 10; g.beginPath(); g.moveTo(250, 80); g.lineTo(190, 190); g.lineTo(260, 250); g.lineTo(210, 340); g.stroke(); txt(g, "SCRRRT!", 330, 70, 70, "#ffffff", INKC); });
const kissTex = () => ctex("nbB_kisscam", 640, 520, (g) => { g.fillStyle = "#1a1040"; g.fillRect(0, 0, 640, 520); g.lineWidth = 26; g.strokeStyle = "#ff3d6a"; heartPath(g, 320, 270, 150); g.stroke(); g.fillStyle = "rgba(255,61,106,0.22)"; g.fill(); txt(g, "KISS CAM", 320, 70, 92, "#ffffff", "#d9202e"); for (let i = 0; i < 18; i++) { g.fillStyle = "#ffd36a"; g.beginPath(); g.arc(30 + i * 34, 495, 8, 0, 7); g.fill(); } g.lineWidth = 16; g.strokeStyle = "#f2c53a"; g.strokeRect(8, 8, 624, 504); });
const polaroid = (k: number) => ctex("nbB_pol" + k, 256, 300, (g) => { g.fillStyle = "#fbfcff"; g.fillRect(0, 0, 256, 300); g.lineWidth = 10; g.strokeStyle = INKC; g.strokeRect(5, 5, 246, 290); g.fillStyle = k % 2 ? "#6b3a7a" : "#2a1a40"; g.fillRect(24, 24, 208, 190); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(100, 110, 20, 0, 7); g.arc(160, 110, 20, 0, 7); g.fill(); g.fillStyle = "#e2463a"; g.fillRect(84, 130, 32, 60); g.fillStyle = "#3b3f52"; g.fillRect(144, 130, 32, 60); txt(g, "?!", 128, 258, 44, "#d9202e"); });
const buildComic = (c: SetCtx) => {
  const ox = N_COMIC, zb = -6.6;
  floor(c, T("#ffd23a"), ox - 12, ox + 12, 8, zb, 0); wallZ(c, TX(halftone()), ox - 12, ox + 12, 0, 12, zb, 4, 5);
  wallX(c, TX(halftone()), ox - 12, 8, zb, 0, 12, 3, 5); wallX(c, TX(halftone()), ox + 12, 8, zb, 0, 12, 3, 5); ceil(c, T("#ff7ab0"), ox - 12, ox + 12, 8, zb, 12);
  // soap title banner
  pl(c, ctex("nbB_soap", 1400, 260, (g) => { g.fillStyle = "#1a1040"; g.fillRect(0, 0, 1400, 260); g.lineWidth = 20; g.strokeStyle = "#f2c53a"; g.strokeRect(10, 10, 1380, 240); txt(g, "DAYS OF OUR SERVERS", 700, 110, 128, "#ffd23a", "#d9202e"); txt(g, "a very dramatic soap", 700, 214, 46, "#ffffff"); }), 9.4, 1.75, ox, 6.9, zb + 0.06, 0, false, true, 1.1);
  const caps = ["THE RESTAURANT...", "A SHOCKING TURN!", "THE GETAWAY CAR..."];
  COMIC.px.forEach((px, k) => { pl(c, panelTex(k), 4.2, 4.98, px, 3.0, COMIC.pz, 0, false, true, 1.05); pl(c, capTex(k, caps[k]), 3.6, 0.85, px - 0.2, 5.8, COMIC.pz + 0.05, 0, false, true, 1.1); c.lamp(px, 4.6, -3.8, 4.0, 0, [0.55, 0.39, 0.30]); });
  // photo-bush paparazzi cameras at the corners of panel 1
  for (const s of [-1, 1]) { addSph(c, T("#2d7a3c"), 0.55, COMIC.px[0] + s * 1.9, 0.7, -5.4, 1.3, 1, 1); addSph(c, T("#3d8a4b"), 0.42, COMIC.px[0] + s * 1.5, 0.95, -5.5, 1.2, 1, 1); bx(c, T("#17141a"), COMIC.px[0] + s * 1.9 - 0.22, 0.95, -5.2, COMIC.px[0] + s * 1.9 + 0.22, 1.25, -4.95); addCyl(c, T("#c9ced6"), 0.11, 0.11, 0.1, COMIC.px[0] + s * 1.9, 1.1, -4.9, 10, Math.PI / 2); }
  // corner gutters: pink balloons and "TO BE CONTINUED"
  pl(c, sign("nbB_tbc", 600, 150, "#ff3d6a", "#ffffff", ["TO BE CONTINUED..."], 56), 2.8, 0.7, ox + 8.2, 1.0, zb + 0.08);
  for (let i = 0; i < 6; i++) { const bxx = ox - 10 + i * 4 + hash(i) * 1.5; addSph(c, T(["#ff3d6a", "#3b82c4", "#f2d23a"][i % 3]), 0.5, bxx, 1.4 + hash(i, 4) * 0.5, -6.0, 1, 1.2, 1); }
  // photos, hearts, vinyl, kiss cam, spotlight
  const pols = [0, 1, 2].map((i) => pl(c, polaroid(i), 0.9, 1.05, ox - 4.6, 2.5, -4.2, 0, false, true, 1.1));
  const hearts = Array.from({ length: 7 }, (_, i) => pl(c, heartTex(), 0.7, 0.7, ox, 2.5, -4.4, 0, true, true, 1.2)); hearts.forEach((h) => (h.visible = false));
  const flashT = ctex("nbB_flashB", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 6; g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke(); });
  const flashes = Array.from({ length: 6 }, (_, i) => mesh(c, new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: flashT, color: new THREE.Color(2.2, 2.2, 2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: D }), COMIC.px[0] + (i % 2 ? 1.9 : -1.9), 1.1 + (i % 3) * 0.3, -4.7, 0, 0, 0, true));
  const vinyl = pl(c, vinylTex(), 3.4, 2.6, COMIC.px[0], 2.2, -4.6, 0, true, true, 1.1); vinyl.visible = false;
  const kc = pl(c, kissTex(), 3.2, 2.6, COMIC.px[2], 4.7, -5.2, 0, false, true, 1.15); kc.visible = false;
  const spot = mesh(c, new THREE.CylinderGeometry(0.4, 2.4, 7, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.95, 0.75), transparent: true, opacity: 0.26, depthWrite: false, blending: THREE.AdditiveBlending, side: D }), COMIC.carX, 3.6, -3.7, 0, 0, 0, true); spot.renderOrder = 3; spot.visible = false;
  const car = buildCar(c, COMIC.carX); car.root.position.z = -4.3; car.root.scale.setScalar(0.92);
  c.lamp(ox, 3.0, -2.4, 8, 0, [0.55, 0.33, 0.39]);
  GEARB.comic = makeGear(c, ox);
  c.onFrame((f, set) => {
    if (set !== SB.comic) return; const t = f / 30;
    // flashes + polaroids ("then the photos")
    flashes.forEach((m, i) => { const ph = (t * (2.2 + i * 0.3) + i * 0.37) % 1, on = t > 33.25 && t < 36.1 && ph < 0.12; m.visible = on; m.scale.setScalar(on ? 0.6 + (1 - ph / 0.12) * 1.2 : 0.1); });
    pols.forEach((p, i) => { const a = 33.35 + i * 0.28, u = sm(a, a + 0.32, t); p.visible = t >= a; p.position.set(ox - 6.1 + i * 0.5 + (1 - u) * 6, 3.9 - i * 0.55 + (1 - u) * -0.5, -5.8 + (1 - u) * 3.6); p.rotation.z = (1 - u) * 1.4 + (i - 1) * 0.18; p.scale.setScalar(0.55 + 0.45 * u); });
    hearts.forEach((h, i) => { const a = COMIC.kissAt + 0.14 + i * 0.06, k = t - a; h.visible = k > 0 && k < 1.3; const px = COMIC.px[0] + 0.0 + (i - 3) * 0.28; h.position.set(px, 2.6 + k * 1.2 + hash(i) * 0.3, -4.5); h.scale.setScalar(Math.max(0.05, back(k / 0.22)) * (0.55 + 0.4 * hash(i, 2))); h.rotation.z = (i - 3) * 0.15; });
    vinyl.visible = t >= COMIC.scratchAt && t < COMIC.scratchAt + 1.2; vinyl.scale.setScalar(Math.max(0.05, back((t - COMIC.scratchAt) / 0.18))); vinyl.rotation.z = Math.sin((t - COMIC.scratchAt) * 30) * 0.05;
    const kk = t >= COMIC.kissCamAt; kc.visible = kk; spot.visible = kk; if (kk) { const u = Math.max(0.05, back((t - COMIC.kissCamAt) / 0.3)); kc.scale.setScalar(u); spot.material.opacity = 0.2 + 0.08 * Math.sin(t * 9); }
    car.root.position.y = t > 36.9 && t < 37.9 ? Math.abs(Math.sin((t - 36.9) * 5)) * 0.06 : 0; car.wheels.forEach((w) => (w.rotation.z = 0));
  });
};

// ============================================================ lines 12-13: the street, the bouncing car, the crowd, the pothole
export const STREET = { x: N_STREET, hole: N_STREET - 0.3, carZ: 0.7, driveAt: 40.0, deflateAt: 41.3 };
/** car state at time t: x, y (hop), rz (pitch) */
export const streetCar = (t: number) => {
  const amp = sm(38.2, 38.9, t) * (1 - sm(39.5, 39.66, t)), ph = (t - 38.2) * 2.9 * Math.PI * 2, hop = Math.abs(Math.sin(ph)) * 0.3 * amp;
  const sunk = sm(39.6, 39.7, t) * (1 - sm(39.95, 40.1, t)), drive = sm(STREET.driveAt, STREET.driveAt + 0.9, t);
  return { x: STREET.hole + 5.5 * drive, y: hop - 0.2 * sunk * (1 - drive), rz: Math.sin(ph) * 0.05 * amp - 0.16 * sunk };
};
const headTex = (v: number, sad: boolean) => ctex(`nbB_head${v}${sad ? "s" : ""}`, 128, 220, (g) => {
  const skin = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067"][v % 4], hair = ["#2a2420", "#7a4a2a", "#17141a", "#b9b2a6", "#c9a24a"][v % 5], shirt = ["#d9473b", "#3b82c4", "#e0b43a", "#5ab07a", "#8a5ac9", "#e07a3a"][v % 6];
  g.fillStyle = shirt; g.beginPath(); g.ellipse(64, 212, 54, 34, 0, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = INKC; g.stroke();
  const hy = sad ? 142 : 136;
  g.fillStyle = skin; g.beginPath(); g.ellipse(64, hy, 40, 38, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = hair; g.beginPath(); g.ellipse(64, hy - 22, 40, 22, 0, Math.PI, 0); g.fill(); g.stroke();
  g.fillStyle = "#fff"; g.beginPath(); g.ellipse(48, hy, 11, 13, 0, 0, 7); g.ellipse(80, hy, 11, 13, 0, 0, 7); g.fill(); g.lineWidth = 4; g.stroke();
  g.fillStyle = INKC; g.beginPath(); g.arc(52, hy + (sad ? 6 : 2), 5, 0, 7); g.arc(84, hy + (sad ? 6 : 2), 5, 0, 7); g.fill();
  g.lineWidth = 5; g.strokeStyle = INKC; g.beginPath(); if (sad) { g.arc(64, hy + 34, 12, Math.PI * 1.15, Math.PI * 1.85); } else { g.moveTo(54, hy + 24); g.lineTo(74, hy + 24); } g.stroke();
  g.fillStyle = "#fff"; g.lineWidth = 6; g.strokeStyle = INKC; rr(g, sad ? 24 : 10, 6, sad ? 80 : 108, 58, 24); g.fill(); g.stroke(); g.beginPath(); g.moveTo(44, 62); g.lineTo(52, 90); g.lineTo(64, 62); g.fill(); g.stroke();
  txt(g, sad ? "oh." : "…?", 64, 36, sad ? 34 : 46, sad ? "#6a7388" : "#d9202e");
});
export const penguinCover = () => ctex("nbB_pengcover", 256, 384, (g) => {
  g.clearRect(0, 0, 256, 384);
  const src = penguinTex(0).image as HTMLCanvasElement; g.drawImage(src, 0, 0);
  g.lineJoin = "round"; g.lineWidth = 8; g.strokeStyle = INKC; g.fillStyle = "#1d2433";
  for (const s of [-1, 1]) { g.save(); g.translate(128 + s * 26, 118); g.rotate(s * -0.15); g.beginPath(); g.ellipse(0, 0, 22, 40, 0, 0, 7); g.fill(); g.stroke(); g.restore();
    g.beginPath(); g.moveTo(128 + s * 56, 238); g.quadraticCurveTo(128 + s * 66, 170, 128 + s * 34, 134); g.lineTo(128 + s * 18, 138); g.quadraticCurveTo(128 + s * 54, 190, 128 + s * 44, 244); g.closePath(); g.fill(); g.stroke(); }
});
const coneTex = () => ctex("nbB_conesign", 900, 300, (g) => { g.fillStyle = "#f2d23a"; g.fillRect(0, 0, 900, 300); g.lineWidth = 20; g.strokeStyle = INKC; g.strokeRect(10, 10, 880, 280); txt(g, "SINGAPORE", 450, 100, 110, INKC); txt(g, "PUBLIC WORKS", 450, 214, 96, "#d9202e"); });
export const buildCone = (c: SetCtx, x: number, z: number, s = 1) => {
  addCyl(c, T("#2a2f3f"), 0.34 * s, 0.34 * s, 0.05 * s, x, 0.03 * s, z, 4); addCyl(c, T("#ff6a1a"), 0.03 * s, 0.26 * s, 0.9 * s, x, 0.5 * s, z, 14);
  addCyl(c, T("#ffffff"), 0.15 * s, 0.185 * s, 0.14 * s, x, 0.5 * s, z, 14); addCyl(c, T("#ffffff"), 0.1 * s, 0.12 * s, 0.1 * s, x, 0.72 * s, z, 14);
};
const buildStreet = (c: SetCtx) => {
  const ox = N_STREET, W = 16, zN = 9, zF = -17;
  const asph = ctex("nbB_asph", 256, 256, (g, r) => { g.fillStyle = "#4a4f5c"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 140; i++) { g.fillStyle = r() < 0.5 ? "#434856" : "#555b69"; g.fillRect(r() * 256, r() * 256, 6 + r() * 14, 4 + r() * 8); } g.fillStyle = "#f2d23a"; g.fillRect(0, 100, 256, 7); g.fillRect(0, 150, 256, 7); });
  floor(c, TX(asph), ox - W, ox + W, zN, -3.2, 0, 6, 3);
  floor(c, T("#b8b2a4"), ox - W, ox + W, -3.2, -4.3, 0.14); bx(c, T("#d8d2c4"), ox - W, 0, -3.3, ox + W, 0.14, -3.2);
  // road dashes
  for (let i = 0; i < 14; i++) bx(c, T("#f4f1ea"), ox - 15 + i * 2.2, 0.005, 3.5, ox - 14 + i * 2.2, 0.012, 3.65);
  // stands
  const rows = 7, cols = 24, stp = 0.62;
  for (let r = 0; r < rows; r++) bx(c, T(r % 2 ? "#8a93a8" : "#98a1b6"), ox - W, 0, -4.3 - r * 0.9 - 0.45, ox + W, 0.14 + r * 0.5 + 0.35, -4.3 - r * 0.9 + 0.45);
  wallZ(c, T("#2a3560"), ox - W, ox + W, 0, 14, -4.3 - rows * 0.9 - 0.6); wallX(c, T("#2a3560"), ox - W, zN, -4.3 - rows * 0.9 - 0.6, 0, 14); wallX(c, T("#2a3560"), ox + W, zN, -4.3 - rows * 0.9 - 0.6, 0, 14);
  // skyline backdrop
  const sky = ctex("nbB_skyl", 1024, 256, (g, r) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#8fc8f0"); gr.addColorStop(1, "#fbe3b8"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 256); for (let i = 0; i < 22; i++) { const w = 40 + r() * 60, h = 60 + r() * 150, x = i * 48; g.fillStyle = ["#6f86b8", "#8a9cc8", "#5e74a8"][i % 3]; g.fillRect(x, 256 - h, w, h); g.fillStyle = "#e8f0ff"; for (let y = 256 - h + 10; y < 246; y += 18) for (let xx = x + 6; xx < x + w - 8; xx += 14) if (r() < 0.55) g.fillRect(xx, y, 7, 9); } });
  pl(c, sky, 32, 8, ox, 10, -4.3 - rows * 0.9 - 0.55, 0, false, true, 1.05);
  // crowd of tiny heads (every head a thought bubble)
  const heads: { m: THREE.Mesh; r: number; v: number; y0: number }[] = [];
  const mA = [0, 1, 2, 3, 4, 5].map((v) => new THREE.MeshBasicMaterial({ map: headTex(v, false), transparent: true, alphaTest: 0.4, side: D }));
  const mB = [0, 1, 2, 3, 4, 5].map((v) => new THREE.MeshBasicMaterial({ map: headTex(v, true), transparent: true, alphaTest: 0.4, side: D }));
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const v = Math.floor(hash(r * 31 + k) * 6), m = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.63), mA[v]); const y0 = 0.14 + r * 0.5 + 0.8;
    m.position.set(ox - 15 + k * 1.3 + (r % 2) * 0.65 + (hash(k, r) - 0.5) * 0.3, y0, -4.3 - r * 0.9); m.layers.set(NOINK); put(c, m, ox); heads.push({ m, r, v, y0 });
  }
  // lamp posts, trees, cones
  for (const s of [-1, 1]) { addCyl(c, T("#4a505c"), 0.07, 0.09, 4.6, ox + s * 8.5, 2.3, -3.6, 8); bx(c, T("#4a505c"), ox + s * 8.5 - 0.5, 4.5, -3.7, ox + s * 8.5 + 0.1, 4.58, -3.5); mesh(c, new THREE.SphereGeometry(0.18, 10, 8), GL(3, 2.6, 1.6), ox + s * 8.5 - 0.4, 4.4, -3.6, 0, 0, 0, true); }
  buildCone(c, STREET.hole - 3.7, 2.0, 1.2); buildCone(c, STREET.hole + 2.7, 1.3, 1.1); buildCone(c, STREET.hole - 1.8, -1.0, 0.9); buildCone(c, STREET.hole + 1.9, -1.3, 0.9);
  // the pothole (revealed when the car drives off)
  const holeT = ctex("nbB_hole", 512, 384, (g) => { g.clearRect(0, 0, 512, 384); const rim = g.createRadialGradient(256, 192, 120, 256, 192, 250); rim.addColorStop(0, "rgba(40,36,34,1)"); rim.addColorStop(0.7, "rgba(70,60,56,1)"); rim.addColorStop(1, "rgba(70,60,56,0)"); g.fillStyle = rim; g.beginPath(); g.ellipse(256, 192, 250, 186, 0, 0, 7); g.fill(); g.fillStyle = "#0c0a0e"; g.beginPath(); g.ellipse(256, 196, 190, 138, 0, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = INKC; g.stroke(); g.strokeStyle = "#2a2430"; g.lineWidth = 6; for (let i = 0; i < 9; i++) { const a = i * 0.7; g.beginPath(); g.moveTo(256 + Math.cos(a) * 200, 192 + Math.sin(a) * 150); g.lineTo(256 + Math.cos(a) * 248, 192 + Math.sin(a) * 186); g.stroke(); } g.fillStyle = "#3a8a4a"; g.beginPath(); g.ellipse(256, 280, 110, 22, 0, 0, 7); g.fill(); g.fillStyle = "#1d6a3a"; g.beginPath(); g.ellipse(256, 290, 70, 12, 0, 0, 7); g.fill(); });
  const hole = mesh(c, new THREE.PlaneGeometry(5.0, 3.6), new THREE.MeshBasicMaterial({ map: holeT, transparent: true, alphaTest: 0.3, side: D }), STREET.hole, 0.02, STREET.carZ, -Math.PI / 2, 0, 0); hole.layers.set(NOINK);
  const csign = pl(c, coneTex(), 2.7, 0.9, STREET.hole - 2.3, 0.9, 2.4, 0.0); mesh(c, cylG(0.03, 0.03, 0.9, 6), T("#8d949c"), STREET.hole - 3.5, 0.45, 2.4); mesh(c, cylG(0.03, 0.03, 0.9, 6), T("#8d949c"), STREET.hole - 1.1, 0.45, 2.4);
  csign.visible = true; void csign;
  const peng = pl(c, penguinCover(), 0.7, 1.05, ox - 2.6, 0.55, 2.2, 0, true, true, 1.0);
  // warning tape across the hole at the front
  c.lamp(ox, 3.5, 0, 9, 0, [0.55, 0.47, 0.33]); c.lamp(ox + 8, 4.4, -3, 4.5, 0, [0.55, 0.44, 0.28]); c.lamp(ox - 8, 4.4, -3, 4.5, 0, [0.55, 0.44, 0.28]);
  const car = buildCar(c, ox); car.root.position.set(STREET.hole, 0, STREET.carZ);
  c.onFrame((f, set) => {
    if (set !== SB.street) return; const t = f / 30, s = streetCar(t);
    car.root.position.set(s.x, s.y, STREET.carZ); car.root.rotation.z = s.rz; car.wheels.forEach((w) => (w.rotation.z = -(s.x - STREET.hole) / 0.3));
    const dflt = sm(STREET.deflateAt - 0.1, STREET.deflateAt + 0.6, t), sad = t > STREET.deflateAt;
    heads.forEach((h, i) => { const wob = Math.sin(t * 3 + i * 1.7) * 0.03; h.m.material = sad ? mB[h.v] : mA[h.v]; h.m.scale.set(1 - 0.12 * dflt, 1 - 0.18 * dflt, 1); h.m.position.y = h.y0 - dflt * 0.15 + wob * (1 - dflt); h.m.rotation.z = dflt * Math.sin(i) * 0.06; });
    peng.position.y = 0.99 + Math.abs(Math.sin(t * 2.5)) * 0.0;
  });
};

// ============================================================ lines 14-16: night street, surveillance van, van interior
export const VANST = { x: N_VANST, van: [N_VANST - 1.5, 0, -1.4] as [number, number, number] };
const buildVanSt = (c: SetCtx) => {
  const ox = N_VANST, W = 13, zN = 10, zF = -12;
  const road = ctex("nbB_nroad", 256, 256, (g, r) => { g.fillStyle = "#262b3c"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 100; i++) { g.fillStyle = r() < 0.5 ? "#2e3447" : "#20253a"; g.fillRect(r() * 256, r() * 256, 8 + r() * 14, 5 + r() * 8); } g.fillStyle = "#f2d23a"; g.fillRect(0, 124, 256, 8); });
  floor(c, TX(road), ox - W, ox + W, zN, -3.5, 0, 5, 3); floor(c, T("#4a5068"), ox - W, ox + W, -3.5, zF, 0.12);
  bx(c, T("#5a6078"), ox - W, 0, -3.6, ox + W, 0.12, -3.5);
  // MEGASPEED warehouse + dishes on the roof
  const wh = ctex("nbB_wh", 1024, 420, (g, r) => { g.fillStyle = "#3a4258"; g.fillRect(0, 0, 1024, 420); g.fillStyle = "#2a3248"; for (let i = 0; i < 8; i++) g.fillRect(i * 128, 0, 6, 420); g.fillStyle = "#20273c"; g.fillRect(0, 0, 1024, 70);
    for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) { g.fillStyle = r() < 0.7 ? "#ffd36a" : "#1b2038"; g.fillRect(40 + i * 96, 110 + j * 110, 56, 66); g.lineWidth = 5; g.strokeStyle = INKC; g.strokeRect(40 + i * 96, 110 + j * 110, 56, 66); }
    g.fillStyle = "#101a3a"; g.fillRect(300, 330, 420, 90); g.lineWidth = 8; g.strokeStyle = "#ff3d9a"; g.strokeRect(300, 330, 420, 90); txt(g, "MEGASPEED", 510, 376, 70, "#ff3d9a"); });
  pl(c, wh, 20, 8.2, ox, 4.1, zF + 0.1, 0, false, true, 1.0);
  for (let i = 0; i < 8; i++) { const dx = ox - 8.4 + i * 2.4; addCyl(c, T("#8d949c"), 0.04, 0.04, 0.6, dx, 8.5, zF + 0.5, 6); c.b.add(new THREE.SphereGeometry(0.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), T("#e8ecf4"), M4(dx, 8.9, zF + 0.6, -1.0, 0, 0.3 * (i % 2 ? -1 : 1))); }
  // chain link fence + streetlights
  for (let i = 0; i < 15; i++) { const fx = ox - 12 + i * 1.7; addCyl(c, T("#8d949c"), 0.04, 0.04, 2.0, fx, 1.0, -6.2, 6); }
  bx(c, T("#8d949c"), ox - 12, 1.95, -6.25, ox + 12, 2.0, -6.15); bx(c, T("#8d949c"), ox - 12, 0.2, -6.25, ox + 12, 0.24, -6.15);
  pl(c, ctex("nbB_fence", 256, 128, (g) => { g.strokeStyle = "rgba(200,206,220,0.8)"; g.lineWidth = 3; for (let i = -8; i < 20; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 128, 128); g.moveTo(i * 16 + 128, 0); g.lineTo(i * 16, 128); g.stroke(); } }), 24, 1.8, ox, 1.1, -6.2, 0, true, true, 1.0);
  for (const s of [-1, 1]) { const lx = ox + s * 6.5; addCyl(c, T("#4a505c"), 0.08, 0.1, 5.2, lx, 2.6, -3.0, 8); bx(c, T("#4a505c"), lx - 0.7 * s, 5.1, -3.1, lx, 5.2, -2.9); mesh(c, new THREE.SphereGeometry(0.22, 10, 8), GL(3.2, 2.6, 1.4), lx - 0.7 * s, 5.0, -3.0, 0, 0, 0, true); c.lamp(lx - 0.7 * s, 5.0, -3.0, 4.2, 0, [0.55, 0.44, 0.25]); }
  // the van: white box van, "AA PLUMBING & SONS" painted on the side, antenna farm on the roof
  const [vx, , vz] = VANST.van;
  bx(c, T("#e8e4da"), vx - 2.1, 0.5, vz - 0.95, vx + 1.4, 2.6, vz + 0.95); bx(c, T("#e8e4da"), vx + 1.4, 0.5, vz - 0.95, vx + 2.5, 1.5, vz + 0.95); bx(c, T("#2a3a5c"), vx + 1.52, 1.5, vz - 0.9, vx + 1.55, 2.2, vz + 0.9);
  bx(c, T("#c9ced6"), vx + 2.5, 0.55, vz - 1.0, vx + 2.62, 0.9, vz + 1.0); bx(c, T("#2a3a5c"), vx - 2.15, 0.45, vz - 1.0, vx + 2.55, 0.55, vz + 1.0);
  for (const [wx, wz2] of [[1.6, 0.95], [-1.4, 0.95], [1.6, -0.95], [-1.4, -0.95]]) { addCyl(c, T("#17141a"), 0.42, 0.42, 0.3, vx + wx, 0.42, vz + wz2, 14, Math.PI / 2); addCyl(c, T("#c9ced6"), 0.2, 0.2, 0.32, vx + wx, 0.42, vz + wz2, 10, Math.PI / 2); }
  pl(c, ctex("nbB_vansign", 700, 220, (g) => { g.fillStyle = "#e8e4da"; g.fillRect(0, 0, 700, 220); txt(g, "AA PLUMBING", 350, 80, 92, "#1a4fd0", INKC); txt(g, "& SONS", 350, 170, 76, "#d9202e"); }), 3.0, 0.95, vx - 0.3, 1.6, vz + 0.97, 0, false, true, 1.0);
  addCyl(c, T("#4a505c"), 0.02, 0.02, 1.1, vx - 1.2, 3.1, vz - 0.3, 6); addCyl(c, T("#4a505c"), 0.02, 0.02, 0.9, vx - 0.9, 3.0, vz + 0.3, 6); c.b.add(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), T("#c9ced6"), M4(vx + 0.2, 2.6, vz, 0.0, 0, 0));
  bulb(c, vx + 2.62, 0.75, vz + 0.65, 0.12, [3, 2.8, 1.8]); bulb(c, vx + 2.62, 0.75, vz - 0.65, 0.12, [3, 2.8, 1.8]);
  // mess: knocked-over bins, papers, a banana peel, a "WET FLOOR" sign
  for (let i = 0; i < 3; i++) { addCyl(c, T(["#3a8a4a", "#4a505c", "#3b82c4"][i]), 0.3, 0.26, 0.7, ox + 3.4 + i * 0.9, 0.3, 1.8 - i * 0.5, 12, 0, 1.5 + i * 0.3); }
  for (let i = 0; i < 18; i++) bx(c, T("#f4f1ea"), ox - 6 + hash(i) * 12, 0.01, 2.5 + hash(i, 2) * 4, ox - 5.65 + hash(i) * 12, 0.02, 2.9 + hash(i, 2) * 4);
  pl(c, sign("nbB_msg", 360, 220, "#f2d23a", INKC, ["CAUTION:", "MESSY"], 62), 0.9, 0.55, ox + 1.2, 0.5, 3.2);
  c.lamp(vx, 3.5, vz + 2.8, 6, 0, [0.28, 0.36, 0.55]); c.lamp(ox + 8, 3, -4, 5, 0, [0.55, 0.25, 0.44]);
  const stars = new THREE.BufferGeometry(); const sp: number[] = []; for (let i = 0; i < 90; i++) sp.push(ox + (hash(i, 1) - 0.5) * 28, 10 + hash(i, 2) * 8, zF + 0.3); stars.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const pts = new THREE.Points(stars, new THREE.PointsMaterial({ color: new THREE.Color(2, 2, 2.4), size: 0.1 })); pts.layers.set(NOINK); pts.frustumCulled = false; put(c, pts, ox);
};
export const VANIN = { x: N_VAN, agent: [N_VAN + 0.55, 0, 0.2] as [number, number, number], spitAt: 50.82 };
const monTex = (k: number) => ctex("nbB_mon" + k, 320, 220, (g, r) => {
  g.fillStyle = "#08121c"; g.fillRect(0, 0, 320, 220);
  if (k === 0) { g.fillStyle = "#1c3a5a"; g.fillRect(40, 70, 240, 110); g.fillStyle = "#ffd36a"; for (let i = 0; i < 18; i++) g.fillRect(52 + (i % 9) * 26, 82 + Math.floor(i / 9) * 40, 14, 18); txt(g, "MEGASPEED", 160, 40, 36, "#ff3d9a"); g.strokeStyle = "#3dff8a"; g.lineWidth = 4; g.strokeRect(30, 60, 260, 130); }
  else if (k === 1) { g.strokeStyle = "#3dff8a"; g.lineWidth = 5; g.beginPath(); for (let i = 0; i < 16; i++) { const y = 150 - i * 6 - r() * 40; if (!i) g.moveTo(14, y); else g.lineTo(14 + i * 19, y); } g.stroke(); txt(g, "SHIPMENTS", 160, 30, 34, "#3dff8a"); }
  else if (k === 2) { g.fillStyle = "#3dff8a"; for (let i = 0; i < 12; i++) g.fillRect(20, 24 + i * 16, 40 + r() * 220, 8); }
  else { g.fillStyle = "#10301c"; g.fillRect(0, 0, 320, 220); txt(g, "CONTACT FOUND", 160, 34, 38, "#ff4a5a"); g.fillStyle = "#3dff8a"; rr(g, 24, 74, 110, 60, 12); g.fill(); rr(g, 186, 74, 110, 60, 12); g.fill(); txt(g, "ALICE", 79, 104, 30, INKC); txt(g, "JENSEN", 241, 104, 30, INKC); g.strokeStyle = "#ff4a5a"; g.lineWidth = 8; g.setLineDash([14, 8]); g.beginPath(); g.moveTo(138, 104); g.lineTo(182, 104); g.stroke(); g.setLineDash([]); txt(g, "DIRECT", 160, 176, 40, "#ffe46a"); }
  g.lineWidth = 10; g.strokeStyle = INKC; g.strokeRect(5, 5, 310, 210);
});
export const VAN_MON: THREE.Mesh[] = [];
const buildVan = (c: SetCtx) => {
  const ox = N_VAN, W = 2.0, zN = 3.6, zF = -3.2, H = 2.4;
  const fl = ctex("nbB_vfl", 128, 128, (g) => { g.fillStyle = "#3a3f50"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#2f3444"; for (let i = 0; i < 8; i++) g.fillRect(0, i * 16, 128, 4); });
  shell(c, ox, W, zN, zF, H, "#2d3446", TX(fl), "#232838"); floor(c, TX(fl), ox - W, ox + W, zN, zF, 0, 3, 5);
  // back wall of monitors
  const screens: [number, number, number, number, number][] = [[-1.35, 1.65, 0, 0.9, 0.62], [-0.45, 1.65, 1, 0.9, 0.62], [0.45, 1.65, 2, 0.9, 0.62], [1.35, 1.65, 1, 0.9, 0.62], [-0.9, 0.95, 2, 0.9, 0.62], [0.0, 0.95, 0, 0.9, 0.62], [0.9, 0.95, 3, 0.9, 0.62]];
  bx(c, T("#1d2130"), ox - W, 0.45, zF, ox + W, 2.35, zF + 0.12);
  screens.forEach(([dx, y, k, w, h]) => { const m = pl(c, monTex(k), w, h, ox + dx, y + 0.1, zF + 0.16, 0, false, true, 1.25); if (dx === 0 && y < 1) VAN_MON.push(m); });
  // wall screen (updates in line 16): the hero "contact" monitor is a separate big plane
  const big = pl(c, monTex(3), 1.7, 1.17, ox - 0.5, 1.55, zF + 0.2, 0, false, true, 1.3); big.visible = false; VAN_MON.push(big);
  // desk, keyboard, headphones, donut box, coffee cup
  bx(c, T("#4a505c"), ox - W, 0, -2.6, ox + W, 0.62, -1.3); bx(c, T("#2a2f3f"), ox - W, 0.62, -2.7, ox + W, 0.68, -1.2);
  bx(c, T("#17141a"), ox - 0.5, 0.68, -2.1, ox + 0.5, 0.72, -1.7);
  bx(c, T("#ff7ab0"), ox + 1.2, 0.68, -2.3, ox + 1.8, 0.82, -1.8); pl(c, sign("nbB_dbox", 160, 80, "#ff7ab0", "#ffffff", ["DONUTS"], 40), 0.4, 0.2, ox + 1.5, 0.78, -1.79);
  for (let i = 0; i < 4; i++) { addCyl(c, T("#17141a"), 0.05, 0.05, 0.12, ox - 1.5 + i * 0.12, 0.74, -1.6, 8); }
  for (let i = 0; i < 7; i++) c.b.add(new THREE.TorusGeometry(0.1 + i * 0.01, 0.015, 6, 14), T(["#d9202e", "#3b82c4", "#f2d23a"][i % 3]), M4(ox - 1.9 + i * 0.05, 0.1 + i * 0.07, zF + 0.5 + i * 0.1, 1.2, 0.2, i));
  // roof lamp (red) + stripes + a map with pins
  bx(c, T("#ffffff"), ox - 0.4, H - 0.06, -1, ox + 0.4, H, -0.4); c.lamp(ox, H - 0.3, -0.6, 3.0, 0, [0.55, 0.14, 0.11]); c.lamp(ox, 1.5, -1.6, 3.6, 0, [0.17, 0.55, 0.33]);
  pl(c, ctex("nbB_map", 300, 220, (g) => { g.fillStyle = "#e8dcc0"; g.fillRect(0, 0, 300, 220); g.strokeStyle = "#8a7a56"; g.lineWidth = 4; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, i * 40); g.lineTo(300, i * 40 + 20); g.stroke(); } g.strokeStyle = "#d9202e"; g.lineWidth = 6; g.beginPath(); g.moveTo(40, 60); g.lineTo(130, 150); g.lineTo(240, 90); g.stroke(); for (const [x, y] of [[40, 60], [130, 150], [240, 90]]) { g.fillStyle = "#d9202e"; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); g.lineWidth = 5; g.strokeStyle = INKC; g.stroke(); } g.lineWidth = 12; g.strokeRect(0, 0, 300, 220); }), 0.8, 0.6, ox - W + 0.06, 1.5, -0.2, Math.PI / 2);
  pl(c, ctex("nbB_vwin", 300, 200, (g) => { g.fillStyle = "#101a3a"; g.fillRect(0, 0, 300, 200); g.fillStyle = "#ffd36a"; for (let i = 0; i < 20; i++) g.fillRect((i * 53) % 280 + 6, 100 + ((i * 29) % 80), 10, 14); g.lineWidth = 14; g.strokeStyle = INKC; g.strokeRect(0, 0, 300, 200); }), 1.2, 0.85, ox + W - 0.04, 1.6, 0.0, -Math.PI / 2, false, true, 1.0);
  // chair for the agent
  bx(c, T("#3a3f4c"), ox + 0.25, 0.38, 0.0, ox + 0.85, 0.48, 0.55); bx(c, T("#3a3f4c"), ox + 0.25, 0.48, -0.15, ox + 0.85, 1.2, -0.05);
  addCyl(c, T("#8d949c"), 0.04, 0.04, 0.4, ox + 0.55, 0.2, 0.25, 8);
};

// ============================================================ line 17: the invoice mountain + one tiny box
export const INV = { x: N_INV, box: [N_INV + 4.2, 0, 1.0] as [number, number, number], mt: [N_INV - 2.2, 0, -3.5] as [number, number, number] };
const stampTex = () => ctex("nbB_stamp", 420, 300, (g) => { g.fillStyle = "#fbfcff"; g.fillRect(0, 0, 420, 300); g.fillStyle = "#c9d0e0"; for (let i = 0; i < 6; i++) g.fillRect(24, 28 + i * 18, 200 - (i % 2) * 40, 8); g.fillStyle = "#1a4fd0"; g.fillRect(24, 150, 140, 14); g.save(); g.translate(210, 214); g.rotate(-0.16); g.lineWidth = 12; g.strokeStyle = "#d9202e"; g.strokeRect(-186, -50, 372, 100); txt(g, "SINGAPORE", 0, 4, 76, "#d9202e"); g.restore(); g.lineWidth = 8; g.strokeStyle = INKC; g.strokeRect(4, 4, 412, 292); });
const paperTex = () => ctex("nbB_paper", 128, 128, (g) => { g.fillStyle = "#f4f1e6"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#c9d0e0"; for (let i = 0; i < 7; i++) g.fillRect(10, 12 + i * 16, 80 + (i % 3) * 14, 5); g.strokeStyle = "#8a8f9c"; g.lineWidth = 3; g.strokeRect(1, 1, 126, 126); });
const buildInv = (c: SetCtx) => {
  const ox = N_INV, W = 8.5, zN = 8, zF = -10, H = 8;
  const fl = ctex("nbB_ifl", 256, 256, (g) => { g.fillStyle = "#c9c2b0"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#b8b09c"; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128); });
  shell(c, ox, W, zN, zF, H, "#e8e2d2", TX(fl), "#d8d2c2"); floor(c, TX(fl), ox - W, ox + W, zN, zF, 0, 5, 7);
  // mountain: stacked terraces of paper
  const pm = TX(paperTex()); pm.map!.repeat.set(2, 1);
  const [mx, , mz] = INV.mt;
  for (let l = 0; l < 14; l++) { const w = 7.2 - l * 0.46, d = 4.2 - l * 0.22, y0 = l * 0.45; bx(c, pm, mx - w / 2 + (hash(l) - 0.5) * 0.3, y0, mz - d / 2, mx + w / 2 + (hash(l, 2) - 0.5) * 0.3, y0 + 0.45, mz + d / 2); }
  for (let i = 0; i < 70; i++) { const l = Math.floor(hash(i) * 12), w = 7.2 - l * 0.46; bx(c, pm, mx - w / 2 + hash(i, 3) * w - 0.4, l * 0.45 + 0.45, mz + 1.9 - l * 0.11 - 0.2, mx - w / 2 + hash(i, 3) * w + 0.4, l * 0.45 + 0.52, mz + 1.9 - l * 0.11 + 0.3); }
  // stamped invoices pinned all over the slope, front-facing
  const st = stampTex();
  for (let i = 0; i < 18; i++) { const l = Math.floor(hash(i, 5) * 9), w = 7.2 - l * 0.46, xx = mx - w / 2 + 0.7 + hash(i, 6) * (w - 1.4); const m = pl(c, st, 1.3, 0.93, xx, l * 0.45 + 0.9, mz + 2.15 - l * 0.22 + 0.15, 0, false, true, 1.08); m.rotation.z = (hash(i, 7) - 0.5) * 0.5; m.rotation.x = -0.35; }
  pl(c, st, 2.4, 1.7, mx - 1.0, 2.3, mz + 2.55, 0, false, true, 1.1);
  pl(c, sign("nbB_onpaper", 900, 200, "#1a4fd0", "#ffffff", ["ON PAPER"], 120), 3.6, 0.8, mx, 7.1, mz + 2.2);
  // flying invoices
  for (let i = 0; i < 12; i++) mesh(c, new THREE.PlaneGeometry(0.5, 0.65), new THREE.MeshBasicMaterial({ map: paperTex(), side: D }), mx - 3.5 + hash(i) * 7, 4 + hash(i, 2) * 3.5, mz + 2.5 + hash(i, 3) * 3, hash(i, 4) * 1.4, hash(i, 5) * 3, hash(i, 6) * 2);
  // the one tiny box on a plinth, with a spotlight and a sad label
  const [bxp, , bzp] = INV.box;
  addCyl(c, T("#c9c2b0"), 0.85, 0.95, 0.5, bxp, 0.25, bzp, 20); addCyl(c, T("#8a6a4a"), 0.9, 0.95, 0.06, bxp, 0.53, bzp, 20);
  bx(c, T("#c28a55"), bxp - 0.16, 0.56, bzp - 0.16, bxp + 0.16, 0.88, bzp + 0.16); bx(c, T("#e8cfa0"), bxp - 0.03, 0.88, bzp - 0.16, bxp + 0.03, 0.89, bzp + 0.16);
  pl(c, sign("nbB_boxlbl", 160, 70, "#ffffff", INKC, ["CHIPS"], 34), 0.28, 0.12, bxp, 0.68, bzp + 0.17);
  pl(c, sign("nbB_inreal", 900, 200, "#d9202e", "#ffffff", ["IN REAL LIFE"], 100), 3.2, 0.72, bxp, 2.5, bzp - 1.2);
  const cone = mesh(c, new THREE.CylinderGeometry(0.2, 1.1, 4.2, 20, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.95, 0.75), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: D }), bxp, 2.9, bzp, 0, 0, 0, true); cone.renderOrder = 3;
  c.lamp(bxp, 3.0, bzp + 0.8, 3.6, 0, [0.55, 0.50, 0.33]);
  // office furniture, filing cabinets, a calculator wall, ceiling lights
  for (let i = 0; i < 5; i++) { bx(c, T("#8d949c"), ox + W - 1.4, 0, -8.6 + i * 1.3, ox + W - 0.2, 1.6, -7.5 + i * 1.3); bx(c, T("#6a727c"), ox + W - 1.38, 0.8, -8.6 + i * 1.3, ox + W - 0.22, 0.86, -7.5 + i * 1.3); }
  bx(c, T("#3b4a6a"), ox - W, 0, -9.6, ox + W, 3.0, zF + 0.05);
  pl(c, ctex("nbB_calcw", 900, 300, (g) => { g.fillStyle = "#0f1a2e"; g.fillRect(0, 0, 900, 300); g.fillStyle = "#3dff8a"; g.font = "bold 80px monospace"; g.textAlign = "left"; g.fillText("INVOICES  ......  ∞", 30, 100); g.fillText("DELIVERIES ..  ?", 30, 200); g.lineWidth = 12; g.strokeStyle = INKC; g.strokeRect(6, 6, 888, 288); }), 6.4, 2.1, ox - 1.5, 6.4, zF + 0.1, 0, false, true, 1.2);
  for (let i = 0; i < 6; i++) { const l = ox - 6 + i * 2.4; bx(c, T("#ffffff"), l - 0.8, H - 0.1, -1 - (i % 2) * 5, l + 0.8, H, -1.3 - (i % 2) * 5); c.lamp(l, H - 0.5, -1.2 - (i % 2) * 5, 3.4, 0, [0.55, 0.52, 0.47]); }
  c.lamp(mx, 4, mz + 4, 8, 0, [0.55, 0.44, 0.33]);
};

// ============================================================ line 18: the FOR RENT rack hall
const buildRackHall = (c: SetCtx) => {
  const ox = N_RACK, W = 8.5, zN = 8, zF = -9, H = 6;
  const fl = ctex("nbB_rfl", 256, 256, (g) => { g.fillStyle = "#8f969e"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#838a93"; g.fillRect(0, 0, 128, 128); g.fillRect(128, 128, 128, 128); g.fillStyle = "#f2c53a"; g.fillRect(0, 0, 256, 8); });
  shell(c, ox, W, zN, zF, H, "#5a6a88", TX(fl), "#2a3040"); floor(c, TX(fl), ox - W, ox + W, zN, zF, 0, 5, 6);
  buildRentRack(c, ox, { set: SB.rack, z: -3.4, dings: [59.24] });
  // dim neighbour racks behind, with hand-written sold-out signs
  for (let i = 0; i < 6; i++) { const rx = ox - 6.4 + i * 2.5; if (Math.abs(rx - ox) < 1.6) continue; bx(c, T("#2a2f3f"), rx - 0.6, 0, -8.2, rx + 0.6, 2.4, -7.4); pl(c, rackFront("nbB_rackf"), 1.1, 2.2, rx, 1.2, -7.38, 0, false, false, 0.85); }
  pl(c, sign("nbB_sold", 340, 150, "#ffffff", "#d9202e", ["SOLD OUT"], 56), 0.9, 0.4, ox - 3.8, 2.7, -7.3);
  // a border fence with a gate on the left and an arrow
  for (let i = 0; i < 9; i++) addCyl(c, T("#c9ced6"), 0.05, 0.05, 2.6, ox - 8.0, 1.3, 6 - i * 1.5, 6);
  bx(c, T("#c9ced6"), ox - 8.05, 2.5, -6, ox - 7.95, 2.6, 6.2);
  pl(c, ctex("nbB_bfence", 256, 128, (g) => { g.strokeStyle = "rgba(220,226,240,0.85)"; g.lineWidth = 3; for (let i = -8; i < 20; i++) { g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 128, 128); g.moveTo(i * 16 + 128, 0); g.lineTo(i * 16, 128); g.stroke(); } }), 12, 2.4, ox - 7.95, 1.3, 0.1, Math.PI / 2, true, true, 1.0);
  pl(c, sign("nbB_border", 700, 220, "#f2d23a", INKC, ["BORDER", "→ ONE STEP"], 78), 2.4, 0.76, ox - 7.9, 3.1, -2.6, Math.PI / 2);
  bx(c, T("#f2c53a"), ox - 4.2, 0.005, -9, ox - 4.1, 0.012, 8);
  for (let i = 0; i < 4; i++) bx(c, T(i % 2 ? "#17141a" : "#f2c53a"), ox - 4.2 - 0.06, 0.006, 6 - i * 0.7, ox - 4.1 + 0.06, 0.014, 6 - i * 0.7 - 0.35);
  for (let i = 0; i < 4; i++) { bx(c, T("#ffffff"), ox - 6 + i * 4 - 0.8, H - 0.1, -3 - (i % 2) * 3, ox - 6 + i * 4 + 0.8, H, -3.3 - (i % 2) * 3); c.lamp(ox - 6 + i * 4, H - 0.5, -3 - (i % 2) * 3, 3.2, 0, [0.28, 0.41, 0.55]); }
  c.lamp(ox, 3.0, -1.0, 6, 0, [0.50, 0.44, 0.33]);
};


// ============================================================ props that move: donut, coffee cup, spit, thought bubble
export const THOUGHT = { at: 60.0 };
const thoughtTex = () => ctex("nbB_thought", 640, 420, (g) => {
  g.fillStyle = "#ffffff"; g.strokeStyle = INKC; g.lineWidth = 12;
  for (const [x, y, r] of [[150, 130, 90], [260, 80, 100], [390, 90, 100], [490, 150, 90], [420, 220, 90], [250, 220, 90], [150, 210, 70]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); }
  g.fillStyle = "#ffffff"; for (const [x, y, r] of [[150, 130, 90], [260, 80, 100], [390, 90, 100], [490, 150, 90], [420, 220, 90], [250, 220, 90], [150, 210, 70]]) { g.beginPath(); g.arc(x, y, r - 5, 0, 7); g.fill(); }
  for (const [x, y, r] of [[230, 330, 30], [180, 380, 20], [140, 410, 12]]) { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.lineWidth = 8; g.stroke(); }
  txt(g, "…wait, that's", 320, 125, 74, INKC); txt(g, "allowed?", 320, 215, 86, "#d9202e");
});
const spitTex = () => ctex("nbB_spit", 640, 400, (g) => { g.fillStyle = "#7a4a2a"; g.strokeStyle = INKC; g.lineWidth = 12; g.beginPath(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 110 : 190; g.lineTo(320 + Math.cos(a) * r * 1.5, 200 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); txt(g, "PFFFT!", 320, 205, 120, "#fff3d0", INKC); });
const buildExtras = (c: SetCtx) => {
  // van: pink donut + coffee cup near the agent's hands, spit cloud toward the lens
  const [ax, , az] = VANIN.agent;
  const donut = new THREE.Group(); put(c, donut, N_VAN);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.075, 10, 18), T("#d9a45a")); donut.add(ring);
  const icing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.08, 10, 18, Math.PI * 2), T("#ff7ab0")); icing.scale.set(1, 1, 0.55); icing.position.z = 0.025; donut.add(icing);
  for (let i = 0; i < 9; i++) { const a = i * 0.7, sp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.012), T(["#ffffff", "#f2d23a", "#3b82c4"][i % 3])); sp.position.set(Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.095); sp.rotation.z = a * 2; donut.add(sp); }
  const bite = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12), T("#dfe9ff")); bite.position.set(0.17, 0.1, 0.0); bite.visible = false; donut.add(bite);
  const cup = new THREE.Group(); put(c, cup, N_VAN);
  const cb = new THREE.Mesh(cylG(0.12, 0.09, 0.26, 12), T("#f4f1ea")); cup.add(cb); const sl = new THREE.Mesh(cylG(0.125, 0.125, 0.07, 12), T("#d9202e")); sl.position.y = 0.0; cup.add(sl);
  const lid = new THREE.Mesh(cylG(0.13, 0.13, 0.03, 12), T("#2a2f3f")); lid.position.y = 0.145; cup.add(lid);
  const steam = pl(c, ctex("nbB_steam", 64, 128, (g) => { g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.moveTo(24, 120); g.bezierCurveTo(4, 90, 44, 60, 24, 20); g.moveTo(46, 120); g.bezierCurveTo(26, 90, 62, 66, 44, 30); g.stroke(); }), 0.2, 0.4, ax, 1.4, az, 0, true, true, 1.0);
  const spit = pl(c, spitTex(), 2.6, 1.6, ax, 1.3, az + 1.3, 0, true, true, 1.0); spit.visible = false;
  const drops = Array.from({ length: 16 }, () => mesh(c, new THREE.SphereGeometry(0.055, 8, 6), T("#7a4a2a"), ax, 1.2, az + 0.5, 0, 0, 0, false)); drops.forEach((d) => (d.visible = false));
  // rack hall: the thought bubble over the intern
  const tb = pl(c, thoughtTex(), 2.3, 1.5, N_RACK + 2.4, 2.75, -1.4, 0, true, true, 1.0); tb.visible = false;
  c.onFrame((f, set) => {
    const t = f / 30;
    if (set === SB.van) {
      const sip = t > 50.1 && t < 50.78, sp0 = VANIN.spitAt - 0.05;
      const hx = ax - 0.55, hy = t < 48.6 ? 1.02 + Math.sin(t * 2.4) * 0.03 : 1.02;
      donut.position.set(hx, t > 46.8 && t < 48.6 ? 1.08 + Math.sin((t - 46.8) * 5) * 0.06 : hy, az + 0.42); donut.rotation.set(-0.2, 0.15, 0); bite.visible = t > 46.4;
      cup.position.set(ax + 0.52, sip ? 1.22 : t >= sp0 ? 1.0 - (t - sp0) * 0.0 : 1.0, az + 0.4); cup.rotation.z = sip ? 0.4 : 0; cup.visible = true;
      steam.position.set(ax + 0.52, 1.35 + Math.sin(t * 3) * 0.03, az + 0.4); steam.visible = t < sp0;
      const k = t - sp0; spit.visible = k > 0; spit.position.set(ax + 0.05, 1.28, az + 1.15 + Math.min(1, k * 2) * 0.35); spit.scale.setScalar(Math.max(0.05, back(k / 0.14)) * (1 + k * 0.5));
      drops.forEach((d, i) => { d.visible = k > 0 && k < 1.2; const sp = Math.min(k, 1.2); d.position.set(ax + (hash(i) - 0.5) * 2.6 * sp, 1.25 + (hash(i, 2) - 0.3) * 1.4 * sp - sp * sp * 0.8, az + 0.4 + sp * (1.8 + hash(i, 3) * 1.2)); d.scale.setScalar(1 + hash(i, 4) * 1.5); });
    }
    if (set === SB.rack) { tb.visible = t > THOUGHT.at; tb.scale.setScalar(Math.max(0.05, back((t - THOUGHT.at) / 0.25))); }
  });
};

// ============================================================ assemble
export const buildB = (c: SetCtx) => {
  GEARB.room = makeGear(c, N_ROOM);
  buildResultsRoom(c, N_ROOM, { set: SB.room, flipAt: 29.45 });
  buildGym(c); buildComic(c); buildStreet(c); buildVanSt(c); buildVan(c); buildInv(c); buildRackHall(c); buildExtras(c);
  c.onFrame((f, set) => {
    const t = f / 30;
    if (set === SB.van) VAN_MON[VAN_MON.length - 1].visible = t > 48.6;
  });
};
