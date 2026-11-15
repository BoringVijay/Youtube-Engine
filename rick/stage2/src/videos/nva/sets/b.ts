// Video A ("The Denny's Booth"), section B sets (lines 8-15, 26.811-63.397 s). Only the section-B helper edits this file.
// Everything is code: Canvas2D painted textures, boxGeo/quad meshes, animated by SetCtx.onFrame (stateless, a pure function of the frame).
//
// WORLD SLOTS (set name -> x). Rooms are enclosed; open sets keep to their own 30 m cell.
//   x=700 B_OFFICE "b_office"  office after the layoffs: the "30" wall calendar RIPS OFF at 27.6 s, confetti burst, "1,000,000 SOLD" poster behind it
//   x=730 B_CONF   "b_conf"    boardroom: whiteboard where "GPU" gets written (29.7-30.95 s), table of blank faces, bet-everything chip stack
//   x=770 B_STAGE  "b_stage"   keynote hall: big screen (ANYONE. ANYTHING. tiles, then gamepad crossed out), podium
//   x=800 B_WALL   "b_wall"    Wall Street board: stock line falls off the chart, down the wall, shatters the floor hatch and drops into the pit
//   x=830 B_DORM   "b_dorm"    2012 dorm: open PC with two glowing GTX 580 cards, cat photo "CAT ✓", leaderboard whiteboard
//   x=860 B_SKY    "b_sky"     golden hilltop with a GAMING CO. billboard: the leather jacket drops from the sky (the ONE jacket moment)
//   x=890 B_LAB    "b_lab"     staircase up to the tiny OPENAI lab; the box with a bow; the ChatGPT banner and the queue on the stairs
//   x=925 B_SCALE  "b_scale"   celebration stage ($5T) and the brass scale: tiny Japan vs one chip
//   (800, 0, z=700) B_PLANET "b_planet"  planet of queues: pole patch with one box, the camera pulls out along PLANET.dir
//
// EXPORTS FOR LATER SECTIONS:
//   jacketTex()                          the black leather jacket sprite (1x1 m plane texture, transparent), for the stadium "jackets as lighters" shot
//   confetti(ctx, ox, opts)              animated InstancedMesh confetti / rain, registered on onFrame for opts.set
//   buildCardBox(ctx, x, y, z, opts)     the giant AI supercomputer box with a bow: returns a THREE.Group (move it per frame)
import * as THREE from "three";
import type { SetCtx } from "../world";
import { lam, boxGeo, quad, V } from "../../bridge/build";
import { ctex } from "../../bridge/paint";
import { twoTone } from "../../bridge/shade";
import { NOINK } from "../../bridge/ink";
import { FPS } from "../timeline";

export const B_OFFICE = 700, B_CONF = 730, B_STAGE = 770, B_WALL = 800, B_DORM = 830, B_SKY = 860, B_LAB = 890, B_SCALE = 925;
export const PLANET = { cx: 800, R: 60, z: 700, dir: [0, 0.55, 0.835] as const, patch: 0.45 };
const INKC = "#241726";

// ---------------------------------------------------------------- helpers
type G2 = CanvasRenderingContext2D;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ss = (a: number, b: number, t: number) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
/** damped spring 0 -> 1 with overshoot, from t0 */
export const spring = (t: number, t0: number, k = 11, d = 4.2) => { if (t < t0) return 0; const u = t - t0; return 1 - Math.exp(-d * u) * Math.cos(k * u); };
const rr = (g: G2, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const txt = (g: G2, s: string, x: number, y: number, font: string, col: string, align: CanvasTextAlign = "center", stroke?: string, sw = 0) => {
  g.font = font; g.textAlign = align; g.textBaseline = "middle";
  if (stroke) { g.lineWidth = sw; g.strokeStyle = stroke; g.lineJoin = "round"; g.strokeText(s, x, y); }
  g.fillStyle = col; g.fillText(s, x, y);
};
const rndOf = (seed: number) => { let s = seed * 2654435761 % 2147483647 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

const mats = new Map<string, THREE.MeshLambertMaterial>();
const Lm = (key: string, color: string, map?: () => THREE.Texture) => {
  let m = mats.get(key);
  if (!m) { m = lam("nvb_" + key, () => ({ color, ...(map ? { map: map() } : {}) })); m.side = THREE.DoubleSide; mats.set(key, m); }
  return m;
};
const toonCache = new Map<string, THREE.MeshLambertMaterial>();
const toon = (col: string) => { let m = toonCache.get(col); if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide })); toonCache.set(col, m); } return m; };
const basic = (map: THREE.Texture | null, o: { tr?: boolean; hdr?: number; color?: string; add?: boolean; op?: number } = {}) => {
  const m = new THREE.MeshBasicMaterial({ map: map ?? undefined, transparent: !!(o.tr || o.add || o.op !== undefined), side: THREE.DoubleSide, depthWrite: !(o.tr || o.add), alphaTest: o.tr && !o.add ? 0.02 : 0,
    ...(o.add ? { blending: THREE.AdditiveBlending, fog: false } : {}), ...(o.op !== undefined ? { opacity: o.op } : {}) });
  if (o.color) m.color.set(o.color);
  if (o.hdr) m.color.multiplyScalar(o.hdr);
  return m;
};
type PlOpts = { ry?: number; rx?: number; rz?: number; tr?: boolean; noink?: boolean; hdr?: number; parent?: THREE.Object3D; color?: string; order?: number; add?: boolean; op?: number };
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
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(tex, { tr: o.tr, hdr: o.hdr, color: o.color, add: o.add, op: o.op }));
    const par = o.parent ?? R;
    m.position.set(par === R ? ox + x : x, y, z); m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    if (o.noink || o.add) m.layers.set(NOINK);
    if (o.order !== undefined) m.renderOrder = o.order;
    par.add(m); return m;
  };
  const group = (x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(ox + x, y, z); R.add(g); return g; };
  return { bx, cy, sp, qd, pl, group };
};
type Kit = ReturnType<typeof kit>;

/** a canvas that is redrawn as a pure function of time (stamp gates the redraw) */
const dyn = (w: number, h: number) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { g: cv.getContext("2d")!, tex, last: NaN, w, h };
};
type Dyn = ReturnType<typeof dyn>;
const redraw = (d: Dyn, stamp: number, fn: (g: G2) => void) => { if (d.last === stamp) return; d.last = stamp; d.g.clearRect(0, 0, d.w, d.h); fn(d.g); d.tex.needsUpdate = true; };

/** glow sprite (additive, always in the NOINK layer so it blooms a little but never gets an outline) */
const glow = (c: SetCtx, col: [number, number, number], w: number, h: number, x: number, y: number, z: number, op = 1) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: c.glowTex(), color: new THREE.Color(...col), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: op, fog: false, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.layers.set(NOINK); m.renderOrder = 6; c.R.add(m); return m;
};

// ---------------------------------------------------------------- confetti (instanced, a pure function of the frame)
export type ConfOpts = {
  set: string; n: number; origin: [number, number, number]; spread?: [number, number, number]; vel?: [number, number, number]; velR?: [number, number, number];
  t0: number; floorY?: number; size?: number; fall?: number; rain?: number; colors?: string[]; seed?: number; stay?: boolean;
};
const CONF_COLS = ["#ff4d6d", "#ffd23f", "#3ddc97", "#4cc9f0", "#b388ff", "#ff9f1c", "#ffffff"];
export const confetti = (c: SetCtx, ox: number, o: ConfOpts) => {
  const cols = o.colors ?? CONF_COLS, rnd = rndOf(o.seed ?? 5);
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), o.n);
  const P = Array.from({ length: o.n }, () => ({ d: [(rnd() - 0.5) * (o.spread?.[0] ?? 0.2), (rnd() - 0.5) * (o.spread?.[1] ?? 0.2), (rnd() - 0.5) * (o.spread?.[2] ?? 0.2)],
    v: [(o.vel?.[0] ?? 0) + (rnd() - 0.5) * 2 * (o.velR?.[0] ?? 2), (o.vel?.[1] ?? 0) + (rnd() - 0.5) * 2 * (o.velR?.[1] ?? 2), (o.vel?.[2] ?? 0) + (rnd() - 0.5) * 2 * (o.velR?.[2] ?? 2)],
    delay: rnd() * 0.15, ph: rnd() * 6.28, spin: 3 + rnd() * 9, fw: 4 + rnd() * 4, s: 0.7 + rnd() * 0.6, col: Math.floor(rnd() * cols.length) }));
  P.forEach((p, i) => mesh.setColorAt(i, new THREE.Color(cols[p.col])));
  mesh.frustumCulled = false; mesh.layers.set(NOINK); mesh.renderOrder = 7; mesh.position.set(ox, 0, 0); c.R.add(mesh);
  const dm = new THREE.Object3D(), size = o.size ?? 0.07, fall = o.fall ?? 0.9, fl = o.floorY ?? 0;
  c.onFrame((f, set) => {
    if (set !== o.set) return;
    const t = f / FPS;
    P.forEach((p, i) => {
      let u = t - o.t0 - p.delay;
      if (o.rain) u = ((u + p.ph * 3) % o.rain + o.rain) % o.rain; // endless rain: loops every o.rain seconds
      if (u < 0) { dm.scale.set(0, 0, 0); dm.updateMatrix(); mesh.setMatrixAt(i, dm.matrix); return; }
      const dmp = (1 - Math.exp(-3 * u)) / 3, fl2 = Math.sin(u * p.fw + p.ph) * 0.14 * (1 - Math.exp(-u * 2));
      let y = o.origin[1] + p.d[1] + p.v[1] * dmp - fall * (u - dmp);
      const landed = y <= fl + 0.01; y = Math.max(fl + 0.01, y);
      dm.position.set(o.origin[0] + p.d[0] + p.v[0] * dmp + fl2, y, o.origin[2] + p.d[2] + p.v[2] * dmp);
      const a = landed ? 0 : u * p.spin; dm.rotation.set(landed ? -Math.PI / 2 : a, 0, landed ? p.ph : a * 0.7);
      const gone = o.stay === false && landed && u > 2.2; const sc = gone ? 0 : size * p.s; dm.scale.set(sc, sc * 0.55, 1); dm.updateMatrix(); mesh.setMatrixAt(i, dm.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return mesh;
};

// ---------------------------------------------------------------- shared painted textures
const wallT = (key: string, paper: string, stripe: string, wain: string, wain2: string) => ctex(key, 512, 870, (g, r) => {
  g.fillStyle = paper; g.fillRect(0, 0, 512, 870); g.fillStyle = stripe; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 24, 870);
  g.fillStyle = wain; g.fillRect(0, 560, 512, 310);
  for (let y = 560; y < 870; y += 62) for (let x = 0; x < 512; x += 128) { g.fillStyle = ((x / 128 + (y - 560) / 62) % 2) ? wain : wain2; g.fillRect(x + 2, y + 2, 124, 58); }
  g.fillStyle = "#ece4d2"; g.fillRect(0, 548, 512, 14); g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, 562, 512, 6);
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(60,40,20,${0.04 + r() * 0.05})`; g.beginPath(); g.ellipse(r() * 512, 60 + r() * 480, 8 + r() * 30, 4 + r() * 12, 0, 0, 7); g.fill(); }
});
const carpetT = (key: string, a: string, b2: string) => ctex(key, 128, 128, (g, r) => {
  g.fillStyle = a; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? b2 : a; g.fillRect(r() * 128, r() * 128, 3, 3); }
  g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
});
const ceilT = () => ctex("nvb_ceil", 128, 128, (g) => { g.fillStyle = "#a9a596"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#8d897a"; g.lineWidth = 3; g.strokeRect(0, 0, 128, 128); g.fillStyle = "#b9b5a6"; for (let i = 0; i < 18; i++) g.fillRect((i * 37) % 128, (i * 59) % 128, 2, 2); });
const cityT = (key: string, warm = true) => ctex(key, 512, 384, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, warm ? "#8fb2e0" : "#22305a"); gr.addColorStop(1, warm ? "#f3d6a8" : "#5a4a7a"); g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
  g.fillStyle = warm ? "#5d6f94" : "#141b36"; for (let i = 0; i < 9; i++) { const h = 90 + r() * 210; g.fillRect(i * 58, 384 - h, 52, h);
    g.fillStyle = warm ? "rgba(255,246,200,0.7)" : "rgba(255,220,120,0.9)"; for (let y = 384 - h + 12; y < 380; y += 24) for (let x = i * 58 + 8; x < i * 58 + 46; x += 14) if (r() < 0.55) g.fillRect(x, y, 7, 9); g.fillStyle = warm ? "#5d6f94" : "#141b36"; }
  g.strokeStyle = "#e9e2d0"; g.lineWidth = 16; g.strokeRect(8, 8, 496, 368); g.beginPath(); g.moveTo(256, 8); g.lineTo(256, 376); g.stroke();
});
const crtT = () => ctex("nvb_crt", 128, 128, (g) => { g.fillStyle = "#0e2a1a"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#4fe38a"; for (let i = 0; i < 8; i++) g.fillRect(10, 14 + i * 13, 30 + ((i * 37) % 70), 5); });
const bubbleT = (key: string, s: string, col = "#241726", w = 768, h = 320, size = 96) => ctex(key, w, h, (g) => {
  g.clearRect(0, 0, w, h); g.fillStyle = "#fffdf2"; g.strokeStyle = INKC; g.lineWidth = 10;
  g.beginPath(); g.ellipse(w / 2, h * 0.42, w / 2 - 12, h * 0.38, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(w * 0.36, h * 0.74); g.lineTo(w * 0.3, h - 8); g.lineTo(w * 0.5, h * 0.78); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(w * 0.37, h * 0.73); g.lineTo(w * 0.49, h * 0.77); g.fillStyle = "#fffdf2"; g.lineWidth = 12; g.strokeStyle = "#fffdf2"; g.stroke();
  const lines = s.split("|"); lines.forEach((ln, i) => txt(g, ln, w / 2, h * 0.42 + (i - (lines.length - 1) / 2) * size * 1.0, `bold ${size}px sans-serif`, col));
});
const thoughtT = (key: string, s: string) => ctex(key, 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.fillStyle = "#fffdf2"; g.strokeStyle = INKC; g.lineWidth = 8;
  g.beginPath(); g.ellipse(128, 100, 112, 80, 0, 0, 7); g.fill(); g.stroke();
  for (const [x, y, r2] of [[78, 196, 16], [56, 232, 9]]) { g.beginPath(); g.arc(x, y, r2, 0, 7); g.fill(); g.stroke(); }
  txt(g, s, 128, 104, "bold 100px sans-serif", INKC);
});
const stickerT = (key: string, s: string, bg: string, fg: string, w = 512, h = 512, size = 110) => ctex(key, w, h, (g) => {
  g.clearRect(0, 0, w, h); g.fillStyle = bg; g.strokeStyle = INKC; g.lineWidth = 12; g.beginPath();
  const cx = w / 2, cyy = h / 2;
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rd = i % 2 ? w * 0.38 : w * 0.49; g.lineTo(cx + Math.cos(a) * rd, cyy + Math.sin(a) * rd * (h / w)); }
  g.closePath(); g.fill(); g.stroke();
  const lines = s.split("|"); lines.forEach((ln, i) => txt(g, ln, cx, cyy + (i - (lines.length - 1) / 2) * size * 1.0, `bold ${size}px sans-serif`, fg, "center", INKC, 12));
});

// ---------------------------------------------------------------- 1. the office after the layoffs: the "30" calendar rips off
export const RIP = 27.58;
/** the four desks that survived the layoffs: [x, z] local; card sits at (x, 0.35, z - 0.62) */
export const DESKS_B: [number, number][] = [[1.15, -3.2], [-1.15, -1.2], [-1.15, 0.8], [1.15, 2.8]];
const GONE_B: [number, number][] = [[-1.15, -3.2], [1.15, -1.2], [1.15, 0.8], [-1.15, 2.8]];
const cal30 = () => ctex("nvb_cal30", 512, 640, (g) => {
  g.fillStyle = "#fffdf6"; g.fillRect(0, 0, 512, 640); g.fillStyle = "#c33a2e"; g.fillRect(0, 0, 512, 150);
  txt(g, "DAYS LEFT", 256, 82, "bold 92px sans-serif", "#ffffff");
  txt(g, "30", 256, 366, "bold 470px sans-serif", "#1f2230", "center", "#fffdf6", 6);
  g.fillStyle = "#c9c2ad"; g.fillRect(0, 150, 512, 8); g.strokeStyle = INKC; g.lineWidth = 14; g.strokeRect(7, 7, 498, 626);
  g.strokeStyle = "#e0262a"; g.lineWidth = 18; g.lineCap = "round"; g.beginPath(); g.ellipse(256, 372, 232, 214, -0.06, 0.3, 0.3 + Math.PI * 2 + 0.5); g.stroke();
});
const soldPoster = () => ctex("nvb_sold", 760, 560, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 560); gr.addColorStop(0, "#1f9d63"); gr.addColorStop(1, "#117a49"); g.fillStyle = gr; g.fillRect(0, 0, 760, 560);
  g.strokeStyle = "#ffd23f"; g.lineWidth = 16; g.strokeRect(14, 14, 732, 532);
  g.fillStyle = "rgba(255,255,255,0.12)"; for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(380, 280); g.arc(380, 280, 700, i * 0.39, i * 0.39 + 0.19); g.fill(); }
  txt(g, "1,000,000", 380, 170, "bold 168px sans-serif", "#ffd23f", "center", INKC, 16);
  txt(g, "SOLD", 380, 330, "bold 190px sans-serif", "#ffffff", "center", INKC, 16);
  txt(g, "IN FOUR MONTHS", 380, 474, "bold 74px sans-serif", "#fff6c8", "center", INKC, 10);
});
const salesChartT = () => ctex("nvb_chart", 512, 384, (g) => {
  g.fillStyle = "#f6f6f0"; g.fillRect(0, 0, 512, 384); g.strokeStyle = "#8a8a90"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 374); txt(g, "SALES", 256, 50, "bold 64px sans-serif", "#2b3a8a");
  g.strokeStyle = "#1f9d63"; g.lineWidth = 14; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(40, 330); g.lineTo(140, 300); g.lineTo(220, 250); g.lineTo(300, 190); g.lineTo(400, 130); g.lineTo(470, 90); g.stroke();
  g.fillStyle = "#1f9d63"; g.beginPath(); g.moveTo(490, 76); g.lineTo(446, 80); g.lineTo(480, 118); g.closePath(); g.fill();
});
export const OFFICE_B = { cal: null as THREE.Group | null };
const buildOffice = (c: SetCtx) => {
  const ox = B_OFFICE, k = kit(c, ox), { bx, cy, qd, pl, sp, group } = k, { R } = c;
  const H = 3.3, XL = -3.8, XR = 3.8, ZB = -4.5, ZF = 9;
  const wall = Lm("owall", "#ffffff", () => wallT("nvb_ow", "#d2b87e", "#c7ac70", "#3f7a80", "#37727a")), carpet = Lm("ocarp", "#ffffff", () => carpetT("nvb_ocarp", "#3a4f6a", "#46607e")), ceil = Lm("oceil", "#ffffff", ceilT);
  qd(carpet, [XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], 7.6 / 0.6, 13.5 / 0.6);
  qd(wall, [XL, 0, ZB], [XR, 0, ZB], [XR, H, ZB], [XL, H, ZB], 3.8, H / 3.4); qd(wall, [XL, 0, ZF], [XL, 0, ZB], [XL, H, ZB], [XL, H, ZF], 6.75, H / 3.4); qd(wall, [XR, 0, ZB], [XR, 0, ZF], [XR, H, ZF], [XR, H, ZB], 6.75, H / 3.4);
  qd(wall, [XR, 0, ZF], [XL, 0, ZF], [XL, H, ZF], [XR, H, ZF], 3.8, H / 3.4);
  qd(ceil, [XL, H, ZB], [XR, H, ZB], [XR, H, ZF], [XL, H, ZF], 7.6 / 0.6, 13.5 / 0.6);
  const frm = Lm("ofrm", "#7a6f58");
  for (const z of [-1.0, 2.8]) { pl(cityT("nvb_ocity"), 3.2, 1.8, XL + 0.05, 1.9, z, { ry: Math.PI / 2 }); bx(frm, XL, 0.95, z - 1.65, XL + 0.08, 2.9, z - 1.55); bx(frm, XL, 0.95, z + 1.55, XL + 0.08, 2.9, z + 1.65); }
  pl(c.signTex("nvb_pizza", 640, 400, "#fff1c6", "#b3262b", "PIZZA FRIDAY", "bold 80px sans-serif"), 1.2, 0.75, XR - 0.05, 1.9, -0.2, { ry: -Math.PI / 2 });
  pl(c.signTex("nvb_pizzax", 640, 120, "#e23a2e", "#fff6d8", "CANCELLED", "bold 70px sans-serif"), 1.0, 0.19, XR - 0.06, 1.9, -0.2, { ry: -Math.PI / 2, rz: 0.12 });
  pl(c.signTex("nvb_eng", 768, 200, "#2b2f45", "#f6f1e6", "ENGINEERING", "bold 100px sans-serif"), 1.5, 0.39, -2.5, 2.95, ZB + 0.03);
  pl(salesChartT(), 1.3, 0.98, -2.5, 1.85, ZB + 0.03);
  pl(c.signTex("nvb_team", 384, 512, "#2b3a6b", "#f6f1e6", "TEAMWORK", "bold 64px sans-serif"), 0.5, 0.66, 2.3, 1.7, ZB + 0.03);
  pl(ctex("nvb_clock", 256, 256, (g) => { g.fillStyle = "#f6f1e6"; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill(); g.lineWidth = 14; g.strokeStyle = "#b8302c"; g.stroke(); g.strokeStyle = INKC; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 56); g.moveTo(128, 128); g.lineTo(174, 148); g.stroke(); }), 0.42, 0.42, 1.95, 2.7, ZB + 0.03);
  cy(toon("#8fb8d8"), -3.3, -3.9, 0, 0.9, 0.2, 0.2, 14); cy(toon("#cfe9f6"), -3.3, -3.9, 0.9, 1.25, 0.18, 0.18, 14);
  bx(Lm("ocab", "#8d96a2"), 2.9, 0, ZB, 3.5, 1.35, ZB + 0.55); bx(Lm("ocab2", "#6e7886"), 2.9, 0.42, ZB + 0.55, 3.5, 0.45, ZB + 0.56); bx(Lm("ocab2", "#6e7886"), 2.9, 0.9, ZB + 0.55, 3.5, 0.93, ZB + 0.56);
  cy(toon("#c0643a"), 3.2, ZB + 0.28, 1.35, 1.6, 0.12, 0.15, 12); for (let i = 0; i < 5; i++) sp(toon(i % 2 ? "#5f9a4a" : "#4f8a3f"), 3.2 + Math.cos(i * 1.3) * 0.12, 1.85 + i * 0.07, ZB + 0.28 + Math.sin(i * 1.3) * 0.08, 0.16, 1, 1.6, 0.6);
  // desks that survived + the boxes where the others sat
  const deskM = toon("#8f6a3c"), deskD = toon("#6a4a28"), chairM = toon("#2c4a7a"), beige = toon("#bfb48c"), dark = toon("#2b2b30");
  DESKS_B.forEach(([x, z], i) => {
    bx(deskM, x - 0.75, 0.7, z - 0.4, x + 0.75, 0.77, z + 0.4); bx(deskD, x - 0.74, 0, z - 0.37, x - 0.67, 0.7, z + 0.37); bx(deskD, x + 0.67, 0, z - 0.37, x + 0.74, 0.7, z + 0.37); bx(deskD, x - 0.7, 0.3, z - 0.37, x + 0.7, 0.7, z - 0.31);
    bx(beige, x + 0.2, 0.77, z - 0.32, x + 0.7, 1.19, z + 0.12); pl(crtT(), 0.4, 0.3, x + 0.46, 1.0, z + 0.13);
    bx(beige, x - 0.23, 0.77, z + 0.14, x + 0.23, 0.81, z + 0.3); cy(toon(["#e8453c", "#5ab07a", "#3b82c4", "#f2d23a"][i]), x - 0.5, z + 0.2, 0.77, 0.87, 0.05);
    bx(chairM, x - 0.25, 0.4, z - 0.87, x + 0.25, 0.46, z - 0.37); bx(chairM, x - 0.25, 0.46, z - 0.9, x + 0.25, 1.0, z - 0.85); cy(dark, x, z - 0.62, 0, 0.4, 0.04, 0.04, 8);
  });
  GONE_B.forEach(([x, z]) => {
    bx(toon("#c9a46a"), x - 0.27, 0, z - 0.21, x + 0.27, 0.34, z + 0.21); bx(toon("#b8905a"), x - 0.25, 0.34, z - 0.2, x - 0.05, 0.37, z + 0.2);
    cy(toon("#c0643a"), x + 0.12, z, 0.34, 0.44, 0.07, 0.06, 10); for (let i = 0; i < 4; i++) sp(toon(i % 2 ? "#5f9a4a" : "#4f8a3f"), x + 0.12 + (i - 1.5) * 0.04, 0.58 + (i % 2) * 0.05, z, 0.09, 1, 1.5, 0.6);
  });
  // the calendar (rips off) + the poster hiding behind it
  pl(soldPoster(), 1.9, 1.4, 0, 1.85, ZB + 0.02);
  const cal = group(0, 1.9, ZB + 0.04); OFFICE_B.cal = cal;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9), basic(cal30(), { color: "#ffffff" })); cal.add(sheet);
  const nailM = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), toon("#c9d1da")); nailM.position.set(0, 0.98, 0.03); R.add(nailM); nailM.position.set(ox, 2.88, ZB + 0.07);
  // balloons tied to a chair: appear after the rip
  const bal = group(2.3, 0, -3.3); bal.visible = false;
  ["#ff4d6d", "#ffd23f", "#3ddc97", "#4cc9f0", "#b388ff", "#ff9f1c"].forEach((col, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), toon(col)); m.scale.set(1, 1.2, 1); const a = i * 1.05; m.position.set(Math.cos(a) * 0.32, 2.3 + (i % 3) * 0.22, Math.sin(a) * 0.2); bal.add(m);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.5 + (i % 3) * 0.2, 0.012), toon("#e8e0d0")); s.position.set(m.position.x * 0.5, 1.45, m.position.z * 0.5); bal.add(s);
  });
  const troffers: THREE.Mesh[] = [];
  for (const tz of [-3.0, -0.8, 1.4, 3.6, 5.8]) { const tr = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.65, 1.5) })); tr.rotation.x = Math.PI / 2; tr.position.set(ox, H - 0.02, tz); tr.layers.set(NOINK); R.add(tr); troffers.push(tr); c.lamp(ox, H - 0.1, tz, 2.4, 0, [0.6, 0.72, 0.62]); }
  confetti(c, ox, { set: "b_office", n: 190, origin: [ox, 2.0, -4.1], spread: [1.3, 0.9, 0.2], vel: [0, 3.0, 3.6], velR: [3.4, 1.8, 2.6], t0: RIP + 0.02, size: 0.085, fall: 0.8, seed: 3 });
  confetti(c, ox, { set: "b_office", n: 110, origin: [ox, 3.2, 0.5], spread: [6, 0.1, 9], t0: RIP + 0.45, rain: 4.2, fall: 0.85, size: 0.07, seed: 9 });
  confetti(c, ox, { set: "b_office", n: 22, origin: [ox, 2.85, -4.3], spread: [0.8, 0.2, 0.1], vel: [0, 0.6, 1.6], velR: [1.6, 0.8, 1.0], t0: RIP, colors: ["#ffffff", "#f1ecdc"], size: 0.12, fall: 1.2, seed: 21 });
  c.onFrame((f, set) => {
    if (set !== "b_office") return;
    const t = f / FPS, u = t - RIP;
    // rip: grabbed (tilts on the nail), torn free, flies at the lens and falls
    if (u < 0) { cal.visible = true; cal.position.set(ox, 1.9, ZB + 0.04); cal.rotation.set(0, 0, 0.012 * Math.sin(t * 5)); }
    else if (u < 0.2) { const k2 = ss(0, 0.2, u); cal.position.set(ox, 1.9 - 0.08 * k2, ZB + 0.04 + 0.08 * k2); cal.rotation.set(0, 0, -0.32 * k2); }
    else if (u < 1.5) { const v = u - 0.2; cal.position.set(ox - 0.9 * v - 0.08, 1.82 + 1.5 * v - 3.6 * v * v, ZB + 0.12 + 2.6 * v); cal.rotation.set(0.5 * v, 1.8 * v, -0.32 - 4.2 * v); cal.visible = cal.position.y > 0.05; }
    else cal.visible = false;
    nailM.visible = u < 0.2;
    bal.visible = u > 0.3; bal.position.y = 0.9 * ss(0.3, 1.3, u);
    troffers.forEach((tr, i) => { const fl = i === 2 ? (Math.sin(t * 31) > 0.3 ? 1 : 0.5) : 1; (tr.material as THREE.MeshBasicMaterial).color.setRGB(1.6 * fl, 1.65 * fl, 1.5 * fl); });
  });
};

// ---------------------------------------------------------------- 2. the boardroom: GPU on the whiteboard, blank faces, the bet
export const GPU_T0 = 29.8, GPU_T1 = 30.95;
export const CONF_SEATS: [number, number, number][] = [[-1.35, 0.35, 1.2], [1.35, 0.35, 1.2], [-1.35, 0.35, 2.9], [1.35, 0.35, 2.9], [-1.35, 0.35, 4.6], [1.35, 0.35, 4.6], [-1.35, 0.35, 6.3], [1.35, 0.35, 6.3]];
export const BOARD_W = 3.2, BOARD_H = 1.7, BOARD_Y = 1.75;
/** where the red marker tip is on the board at time t, in metres from the board centre (x right, y up) and canvas coords */
const arcPts = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 26): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * (i / n); return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as [number, number]; });
const GPU_STROKES: [number, number][][] = [
  [...arcPts(440, 405, 105, 150, -0.6, -5.75, 30), [545, 440], [545, 400], [450, 405]],
  [[620, 258], [620, 560]], [[620, 262], ...arcPts(625, 352, 108, 90, -1.5708, 1.5708, 18), [620, 442]],
  [[850, 258], [850, 440], ...arcPts(925, 450, 75, 115, Math.PI, 0, 18), [1000, 258]],
];
const strokeLens = GPU_STROKES.map((s) => s.reduce((a, p, i) => a + (i ? Math.hypot(p[0] - s[i - 1][0], p[1] - s[i - 1][1]) : 0), 0));
const gpuTotal = strokeLens.reduce((a, b) => a + b, 0);
const gpuPartial = (p: number): { paths: [number, number][][]; tip: [number, number] } => {
  let left = p * gpuTotal, tip: [number, number] = GPU_STROKES[0][0]; const paths: [number, number][][] = [];
  for (let i = 0; i < GPU_STROKES.length && left > 0; i++) {
    const s = GPU_STROKES[i], out: [number, number][] = [s[0]]; tip = s[0];
    for (let j = 1; j < s.length && left > 0; j++) {
      const d = Math.hypot(s[j][0] - s[j - 1][0], s[j][1] - s[j - 1][1]);
      if (d <= left) { out.push(s[j]); left -= d; tip = s[j]; } else { const q = left / d; tip = [s[j - 1][0] + (s[j][0] - s[j - 1][0]) * q, s[j - 1][1] + (s[j][1] - s[j - 1][1]) * q]; out.push(tip); left = 0; }
    }
    paths.push(out);
  }
  return { paths, tip };
};
export const gpuProgress = (t: number) => clamp01((t - GPU_T0) / (GPU_T1 - GPU_T0));
export const gpuTip = (t: number) => { const tp = gpuPartial(Math.max(0.01, gpuProgress(t))).tip; return { x: (tp[0] - 640) / 400, y: (340 - tp[1]) / 400 }; };
export const CONF = { chips: null as THREE.Group | null, markerSprite: null as THREE.Mesh | null };
const drawBoard = (g: G2, p: number) => {
  g.fillStyle = "#f7f7f2"; g.fillRect(0, 0, 1280, 680);
  g.fillStyle = "rgba(0,0,0,0.05)"; for (let i = 0; i < 12; i++) g.fillRect(0, 40 + i * 52, 1280, 2);
  txt(g, "NEW CHIP NAME:", 480, 92, "bold 92px sans-serif", "#1f46b8");
  g.strokeStyle = "#1f46b8"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.moveTo(130, 138); g.quadraticCurveTo(480, 156, 830, 134); g.stroke();
  const bad = ["GRAPHICS BOX", "THE FAST ONE", "CHIP-O-MATIC"];
  bad.forEach((s, i) => { const y = 250 + i * 110; txt(g, s, 40, y, "bold 50px sans-serif", "#3a4a78", "left"); g.strokeStyle = "#d12b2b"; g.lineWidth = 9; g.beginPath(); g.moveTo(30, y + 2); g.lineTo(330 + (i % 2) * 20, y - 6); g.stroke(); });
  g.strokeStyle = "#1f46b8"; g.lineWidth = 8; g.beginPath(); g.moveTo(1130, 120); g.lineTo(1180, 160); g.lineTo(1250, 70); g.stroke();
  const { paths } = gpuPartial(p);
  g.lineCap = "round"; g.lineJoin = "round";
  for (const [w, col] of [[40, "#9d1d1d"], [30, "#d12b2b"], [9, "#ff8d86"]] as [number, string][]) { g.lineWidth = w; g.strokeStyle = col; for (const s of paths) { g.beginPath(); s.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); } }
  if (p >= 1) { txt(g, "(THE WORLD'S FIRST)", 690, 630, "bold 56px sans-serif", "#1f46b8"); g.strokeStyle = "#d12b2b"; g.lineWidth = 12; g.beginPath(); g.moveTo(320, 596); g.quadraticCurveTo(660, 610, 1020, 590); g.stroke(); }
};
const confBoardTex = () => { const d = dyn(1280, 680); drawBoard(d.g, 0); d.tex.needsUpdate = true; return d; };
const chipT = () => ctex("nvb_chipbox", 256, 256, (g) => {
  g.fillStyle = "#1c2330"; rr(g, 14, 14, 228, 228, 20); g.fill(); g.strokeStyle = "#0b0f18"; g.lineWidth = 8; g.stroke();
  g.fillStyle = "#2c3a52"; rr(g, 58, 58, 140, 140, 10); g.fill(); g.fillStyle = "#76b900"; g.fillRect(78, 78, 100, 100); g.fillStyle = "#1c2330"; g.fillRect(98, 98, 60, 60);
  g.fillStyle = "#d9c06a"; for (let i = 0; i < 8; i++) { g.fillRect(34, 36 + i * 24, 18, 10); g.fillRect(204, 36 + i * 24, 18, 10); g.fillRect(36 + i * 24, 20, 10, 18); g.fillRect(36 + i * 24, 218, 10, 18); }
});
const buildConf = (c: SetCtx) => {
  const ox = B_CONF, k = kit(c, ox), { bx, cy, qd, pl, sp, group } = k, { R } = c;
  const H = 3.2, XL = -3.5, XR = 3.5, ZB = -4.2, ZF = 9.2;
  const wall = Lm("cwall", "#ffffff", () => wallT("nvb_cw", "#d9ccb0", "#cfc2a4", "#5a4a6e", "#524266")), carpet = Lm("ccarp", "#ffffff", () => carpetT("nvb_ccarp", "#5a3f6c", "#6a4c7e")), ceil = Lm("cceil", "#ffffff", ceilT);
  qd(carpet, [XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], 7 / 0.6, 13.4 / 0.6);
  qd(wall, [XL, 0, ZB], [XR, 0, ZB], [XR, H, ZB], [XL, H, ZB], 3.5, H / 3.4); qd(wall, [XL, 0, ZF], [XL, 0, ZB], [XL, H, ZB], [XL, H, ZF], 6.7, H / 3.4); qd(wall, [XR, 0, ZB], [XR, 0, ZF], [XR, H, ZF], [XR, H, ZB], 6.7, H / 3.4);
  qd(wall, [XR, 0, ZF], [XL, 0, ZF], [XL, H, ZF], [XR, H, ZF], 3.5, H / 3.4);
  qd(ceil, [XL, H, ZB], [XR, H, ZB], [XR, H, ZF], [XL, H, ZF], 7 / 0.6, 13.4 / 0.6);
  // whiteboard (dynamic) + frame + tray
  const bd = confBoardTex();
  bx(Lm("cframe", "#9aa3ad"), -BOARD_W / 2 - 0.07, BOARD_Y - BOARD_H / 2 - 0.07, ZB, BOARD_W / 2 + 0.07, BOARD_Y + BOARD_H / 2 + 0.07, ZB + 0.04);
  const bm = pl(bd.tex, BOARD_W, BOARD_H, 0, BOARD_Y, ZB + 0.05, { order: 1 });
  bx(Lm("cframe", "#9aa3ad"), -1.0, BOARD_Y - BOARD_H / 2 - 0.1, ZB, 1.0, BOARD_Y - BOARD_H / 2 - 0.06, ZB + 0.14);
  for (const [dx, col] of [[-0.5, "#d12b2b"], [-0.35, "#1f46b8"], [-0.2, "#1f9d63"]] as [number, string][]) bx(toon(col), dx, BOARD_Y - BOARD_H / 2 - 0.06, ZB + 0.06, dx + 0.1, BOARD_Y - BOARD_H / 2 - 0.03, ZB + 0.1);
  // the marker the guy "writes" with: a big red marker at the tip of the stroke
  const marker = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), basic(ctex("nvb_marker", 256, 256, (g) => {
    g.clearRect(0, 0, 256, 256); g.save(); g.translate(60, 196); g.rotate(-0.78); g.fillStyle = "#d12b2b"; g.strokeStyle = INKC; g.lineWidth = 9; rr(g, 0, -22, 150, 44, 10); g.fill(); g.stroke();
    g.fillStyle = "#fffdf2"; g.fillRect(40, -22, 50, 44); g.strokeRect(40, -22, 50, 44); g.fillStyle = INKC; g.beginPath(); g.moveTo(0, -12); g.lineTo(-30, 0); g.lineTo(0, 12); g.closePath(); g.fill(); g.restore(); }), { tr: true }));
  marker.position.set(ox, BOARD_Y, ZB + 0.1); marker.renderOrder = 3; R.add(marker); CONF.markerSprite = marker;
  pl(c.signTex("nvb_syn", 512, 384, "#2b3a6b", "#ffd23f", "SYNERGY", "bold 88px sans-serif"), 0.8, 0.6, -2.45, 2.2, ZB + 0.03);
  pl(c.signTex("nvb_goal", 512, 384, "#1f7a5a", "#f6f1e6", "THINK BIG", "bold 82px sans-serif"), 0.8, 0.6, 2.45, 2.2, ZB + 0.03);
  pl(ctex("nvb_clock2", 256, 256, (g) => { g.fillStyle = "#f6f1e6"; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill(); g.lineWidth = 14; g.strokeStyle = "#2b3a6b"; g.stroke(); g.strokeStyle = INKC; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.moveTo(128, 128); g.lineTo(100, 70); g.moveTo(128, 128); g.lineTo(190, 128); g.stroke(); }), 0.4, 0.4, 0, 2.95, ZB + 0.03);
  // windows with blinds on both side walls
  for (const z of [1.0, 4.4]) for (const s of [-1, 1]) { pl(cityT("nvb_ccity" + (z > 2 ? "b" : "a")), 2.2, 1.4, s * (XR - 0.05), 1.8, z, { ry: -s * Math.PI / 2 }); bx(Lm("ofrm", "#7a6f58"), s < 0 ? XL : XR - 0.08, 1.05, z - 1.15, s < 0 ? XL + 0.08 : XR, 2.55, z - 1.1); bx(Lm("ofrm", "#7a6f58"), s < 0 ? XL : XR - 0.08, 1.05, z + 1.1, s < 0 ? XL + 0.08 : XR, 2.55, z + 1.15); }
  // table, chairs, clutter
  const tableT = toon("#7a4a2c"), tableTop = toon("#8d5a36"), chairM = toon("#3a3a46"), white = toon("#fffdf6");
  bx(tableTop, -0.95, 0.72, 0.3, 0.95, 0.79, 7.0); bx(tableT, -0.9, 0, 0.5, -0.8, 0.72, 0.6); bx(tableT, 0.8, 0, 0.5, 0.9, 0.72, 0.6); bx(tableT, -0.9, 0, 6.7, -0.8, 0.72, 6.8); bx(tableT, 0.8, 0, 6.7, 0.9, 0.72, 6.8);
  for (const [sx, , z] of CONF_SEATS) { const s = Math.sign(sx); bx(chairM, sx - 0.26, 0.4, z - 0.26, sx + 0.26, 0.46, z + 0.26); bx(chairM, s > 0 ? sx + 0.22 : sx - 0.26, 0.46, z - 0.24, s > 0 ? sx + 0.26 : sx - 0.22, 1.05, z + 0.24); cy(chairM, sx, z, 0, 0.4, 0.04, 0.04, 8); }
  bx(chairM, -0.26, 0.4, 7.45, 0.26, 0.46, 7.95); bx(chairM, -0.24, 0.46, 7.92, 0.24, 1.05, 7.97); cy(chairM, 0, 7.7, 0, 0.4, 0.04, 0.04, 8);
  for (let i = 0; i < 8; i++) { const [sx, , z] = CONF_SEATS[i], s = Math.sign(sx); bx(white, s * 0.45 - 0.2, 0.79, z - 0.14, s * 0.45 + 0.2, 0.8, z + 0.14); if (i % 2 === 0) { bx(toon("#4a4f5c"), s * 0.62 - 0.17, 0.79, z - 0.1, s * 0.62 + 0.17, 0.81, z + 0.12); bx(toon("#4a4f5c"), s * 0.62 - 0.17, 0.81, z + 0.1, s * 0.62 + 0.17, 1.0, z + 0.12); } cy(toon(["#e8453c", "#fff", "#3b82c4", "#f2d23a"][i % 4]), s * 0.3, z + 0.2, 0.79, 0.87, 0.05); }
  bx(toon("#e8b9d0"), -0.2, 0.79, 3.4, 0.2, 0.84, 3.8); for (let i = 0; i < 4; i++) cy(toon(i % 2 ? "#d99a5a" : "#f0c9a0"), -0.12 + i * 0.08, 3.6, 0.84, 0.87, 0.04, 0.04, 10); // donut box
  cy(toon("#c9d1da"), 0, 5.2, 0.79, 0.96, 0.07, 0.05, 10); cy(toon("#2b2b30"), 0, 5.2, 0.96, 1.0, 0.04, 0.04, 8); // coffee flask
  // ceiling projector + screen pull-down on the front wall
  bx(toon("#2b2f45"), -0.3, H - 0.3, 3.0, 0.3, H - 0.12, 3.5); bx(toon("#7a7f88"), -0.02, H - 0.12, 3.2, 0.02, H, 3.25); pl(c.signTex("nvb_q", 768, 384, "#eef1f6", "#2b2f45", "Q3 PLAN", "bold 110px sans-serif"), 2.4, 1.2, 0, 2.0, ZF - 0.04, { ry: Math.PI });
  cy(toon("#c0643a"), XL + 0.5, ZB + 0.5, 0, 0.5, 0.2, 0.25, 12); for (let i = 0; i < 6; i++) sp(toon(i % 2 ? "#5f9a4a" : "#4f8a3f"), XL + 0.5 + Math.cos(i * 1.1) * 0.18, 0.9 + i * 0.1, ZB + 0.5 + Math.sin(i * 1.1) * 0.12, 0.2, 1, 1.5, 0.6);
  for (const tz of [-1.5, 1.8, 5.0]) { const tr = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.55, 1.45) })); tr.rotation.x = Math.PI / 2; tr.position.set(ox, H - 0.02, tz); tr.layers.set(NOINK); R.add(tr); c.lamp(ox, H - 0.1, tz, 2.4, 0, [0.7, 0.62, 0.8]); }
  // blank-face thought bubbles (appear one by one at the audience, drawn facing -z) + the unicorn line
  const th = ["...", "?", "...", "?", "..."].map((s, i) => { const m = pl(thoughtT("nvb_th" + i, s), 0.55, 0.55, [-1.35, 1.35, 1.35, -1.35, 1.35][i], 2.2, [4.6, 2.9, 5.5, 1.3, 6.4][i] - 0.1, { tr: true, order: 6, ry: Math.PI }); m.visible = false; return m; });
  const uni = pl(bubbleT("nvb_uni", "gas... powered...|unicorn?", "#241726", 768, 380, 98), 1.7, 0.84, -1.35, 2.35, 2.7, { tr: true, order: 7, ry: Math.PI }); uni.visible = false;
  // the bet: a stack of chip boxes that slides down the table + ALL IN sticker
  const chips = group(0, 0, 0.6); CONF.chips = chips;
  for (let lv = 0; lv < 4; lv++) for (let i = 0; i < 4 - lv; i++) for (let j = 0; j < 2; j++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.26), [toon("#1c2330"), toon("#1c2330"), basic(chipT()), toon("#1c2330"), toon("#1c2330"), toon("#1c2330")]); m.position.set((i - (3 - lv) / 2) * 0.28, 0.83 + lv * 0.055, (j - 0.5) * 0.3); chips.add(m); }
  const allin = pl(stickerT("nvb_allin", "ALL IN", "#ffd23f", "#d12b2b", 640, 400, 150), 0.8, 0.5, 0, 1.2, 3.0, { tr: true, order: 8 }); allin.visible = false;
  c.onFrame((f, set) => {
    if (set !== "b_conf") return;
    const t = f / FPS, p = gpuProgress(t);
    redraw(bd, Math.round(p * 300) + (p >= 1 ? 1000 : 0), (g) => drawBoard(g, p));
    const tip = gpuTip(t); marker.visible = p > 0 && p < 1; marker.position.set(ox + tip.x + 0.26, BOARD_Y + tip.y + 0.26, ZB + 0.12);
    th.forEach((m, i) => { const t0 = 31.7 + i * 0.22; m.visible = t > t0; m.position.y = 2.2 + 0.05 * Math.sin(t * 3 + i); m.scale.setScalar(0.6 + 0.4 * spring(t, t0, 12, 5)); });
    uni.visible = t > 32.15 && t < 33.7; uni.scale.setScalar(0.5 + 0.5 * spring(t, 32.15, 12, 5));
    // chips: slide toward the camera between 33.8 and 34.5, little bounce on arrival
    const sl = ss(33.75, 34.45, t); chips.position.z = 0.6 + 2.6 * sl; chips.position.y = 0.04 * Math.sin(sl * Math.PI);
    chips.visible = t > 33.5 && t < 35.2;
    allin.visible = t > 34.1 && t < 35.2; allin.scale.setScalar(0.4 + 0.6 * spring(t, 34.1, 12, 4.5)); allin.rotation.z = -0.1 + 0.03 * Math.sin(t * 9);
  });
  confetti(c, ox, { set: "b_conf", n: 30, origin: [ox, 1.0, 3.0], spread: [0.6, 0.1, 0.5], vel: [0, 2.2, 2.2], velR: [2.2, 1.4, 1.4], t0: 34.45, colors: ["#d9c06a", "#76b900", "#ffd23f"], size: 0.06, fall: 1.1, seed: 4 });
  void bm;
};

// ---------------------------------------------------------------- 3. the keynote stage: ANYONE. ANYTHING. then "not just games"
export const TILE_T0 = 35.3, TILE_DT = 0.27;
export const STAGE_FOLK: { x: number; z: number; v: number; ph: number }[] = [{ x: -1.6, z: -3.0, v: 1, ph: 0.0 }, { x: -0.55, z: -3.1, v: 4, ph: 0.3 }, { x: 0.5, z: -3.1, v: 2, ph: 0.6 }, { x: 1.5, z: -3.0, v: 5, ph: 0.9 }];
const TILES: { w: string; col: string; icon: (g: G2, x: number, y: number) => void }[] = [
  { w: "SCIENCE", col: "#2fbf71", icon: (g, x, y) => { g.fillStyle = "#e8f6ff"; g.strokeStyle = INKC; g.lineWidth = 9; g.beginPath(); g.moveTo(x - 18, y - 70); g.lineTo(x + 18, y - 70); g.lineTo(x + 18, y - 20); g.lineTo(x + 62, y + 50); g.quadraticCurveTo(x + 66, y + 66, x + 48, y + 66); g.lineTo(x - 48, y + 66); g.quadraticCurveTo(x - 66, y + 66, x - 62, y + 50); g.lineTo(x - 18, y - 20); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#ff4d6d"; g.beginPath(); g.moveTo(x - 40, y + 20); g.lineTo(x + 40, y + 20); g.lineTo(x + 62, y + 52); g.lineTo(x - 62, y + 52); g.closePath(); g.fill(); } },
  { w: "WEATHER", col: "#3b9ae8", icon: (g, x, y) => { g.fillStyle = "#ffffff"; g.strokeStyle = INKC; g.lineWidth = 9; g.beginPath(); for (const [cx, cy, r] of [[x - 34, y + 14, 36], [x + 6, y - 10, 46], [x + 44, y + 16, 32]]) g.arc(cx, cy, r, 0, 7); g.fill(); g.beginPath(); g.arc(x + 6, y - 10, 46, 3.4, 6.1); g.arc(x + 44, y + 16, 32, 4.2, 1.5); g.stroke(); g.fillStyle = "#ffd23f"; g.beginPath(); g.moveTo(x + 8, y + 22); g.lineTo(x - 14, y + 66); g.lineTo(x + 6, y + 60); g.lineTo(x - 4, y + 96); g.lineTo(x + 34, y + 46); g.lineTo(x + 14, y + 50); g.closePath(); g.fill(); g.stroke(); } },
  { w: "CARS", col: "#ff8a3d", icon: (g, x, y) => { g.fillStyle = "#ffffff"; g.strokeStyle = INKC; g.lineWidth = 9; rr(g, x - 76, y - 4, 152, 52, 16); g.fill(); g.stroke(); rr(g, x - 44, y - 44, 88, 46, 16); g.fill(); g.stroke(); g.fillStyle = INKC; for (const dx of [-42, 42]) { g.beginPath(); g.arc(x + dx, y + 52, 21, 0, 7); g.fill(); } } },
  { w: "MEDICINE", col: "#e8466a", icon: (g, x, y) => { g.fillStyle = "#ffffff"; g.strokeStyle = INKC; g.lineWidth = 9; g.beginPath(); g.arc(x, y + 10, 70, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#e8466a"; g.fillRect(x - 14, y - 34, 28, 88); g.fillRect(x - 44, y - 4, 88, 28); } },
  { w: "MOVIES", col: "#8a5ae8", icon: (g, x, y) => { g.fillStyle = "#2b2f45"; g.strokeStyle = INKC; g.lineWidth = 9; rr(g, x - 72, y - 18, 144, 90, 10); g.fill(); g.stroke(); g.fillStyle = "#ffffff"; for (let i = 0; i < 4; i++) { g.save(); g.translate(x - 66 + i * 36, y - 54); g.rotate(-0.18); g.fillRect(0, 0, 22, 34); g.restore(); } g.strokeRect(x - 72, y - 52, 144, 34); } },
  { w: "MONEY", col: "#e8b923", icon: (g, x, y) => { g.fillStyle = "#ffd23f"; g.strokeStyle = INKC; g.lineWidth = 9; g.beginPath(); g.arc(x, y + 8, 68, 0, 7); g.fill(); g.stroke(); txt(g, "$", x, y + 12, "bold 110px sans-serif", "#8a5a00"); } },
];
const drawPad = (g: G2, x: number, y: number, s: number) => {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = "#2b2f45"; g.strokeStyle = "#0e1020"; g.lineWidth = 10;
  g.beginPath(); g.moveTo(-170, -50); g.bezierCurveTo(-140, -90, 140, -90, 170, -50); g.bezierCurveTo(215, 30, 240, 140, 190, 150); g.bezierCurveTo(160, 156, 130, 90, 100, 66); g.lineTo(-100, 66); g.bezierCurveTo(-130, 90, -160, 156, -190, 150); g.bezierCurveTo(-240, 140, -215, 30, -170, -50); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#e6e8f0"; g.fillRect(-138, -34, 22, 70); g.fillRect(-162, -10, 70, 22);
  for (const [bx2, by2, col] of [[132, -28, "#e8466a"], [166, 0, "#ffd23f"], [98, 0, "#3b9ae8"], [132, 28, "#2fbf71"]] as [number, number, string][]) { g.fillStyle = col; g.beginPath(); g.arc(bx2, by2, 17, 0, 7); g.fill(); g.stroke(); }
  for (const sx of [-56, 56]) { g.fillStyle = "#4a5070"; g.beginPath(); g.arc(sx, 40, 22, 0, 7); g.fill(); g.stroke(); }
  g.restore();
};
const drawScreen = (g: G2, t: number) => {
  const W = 900, Hh = 1100;
  if (t < 37.2) {
    const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, "#1b2250"); gr.addColorStop(1, "#0c0f26"); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
    txt(g, "ANYONE.", W / 2, 96, "bold 128px sans-serif", "#ffd23f", "center", INKC, 16); txt(g, "ANYTHING.", W / 2, 226, "bold 128px sans-serif", "#ffffff", "center", INKC, 16);
    TILES.forEach((tl, i) => {
      const cx = 230 + (i % 2) * 440, cyy = 470 + Math.floor(i / 2) * 250, tt = TILE_T0 + i * TILE_DT, on = clamp01((t - tt) / 0.12), pop = 1 + 0.12 * Math.sin(clamp01((t - tt) / 0.35) * Math.PI);
      g.save(); g.translate(cx, cyy); g.scale(pop, pop);
      g.fillStyle = on > 0.5 ? tl.col : "#2a3058"; g.strokeStyle = on > 0.5 ? "#ffffff" : "#3a4278"; g.lineWidth = 10; rr(g, -200, -112, 400, 224, 26); g.fill(); g.stroke();
      g.globalAlpha = on > 0.5 ? 1 : 0.35; tl.icon(g, 0, -22); g.globalAlpha = 1;
      txt(g, tl.w, 0, 84, "bold 56px sans-serif", on > 0.5 ? "#ffffff" : "#6670a8", "center", on > 0.5 ? INKC : undefined, 9);
      g.restore();
    });
  } else {
    g.fillStyle = "#2a1244"; g.fillRect(0, 0, W, Hh);
    g.fillStyle = "rgba(255,255,255,0.06)"; for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(450, 560); g.arc(450, 560, 900, i * 0.45, i * 0.45 + 0.22); g.fill(); }
    txt(g, "GAMES", W / 2, 160, "bold 190px sans-serif", "#ffffff", "center", INKC, 18);
    drawPad(g, 450, 580, 1.6);
    const k2 = spring(t, 37.5, 12, 5);
    if (k2 > 0) { g.save(); g.translate(450, 580); g.scale(k2, k2); g.lineCap = "round"; for (const [w2, col] of [[96, INKC], [70, "#e8203a"]] as [number, string][]) { g.lineWidth = w2; g.strokeStyle = col; g.beginPath(); g.moveTo(-340, -300); g.lineTo(340, 300); g.moveTo(340, -300); g.lineTo(-340, 300); g.stroke(); } g.restore(); }
    if (t > 37.62) txt(g, "NOT JUST", W / 2, 990, "bold 130px sans-serif", "#ffd23f", "center", INKC, 16);
  }
};
const buildStage = (c: SetCtx) => {
  const ox = B_STAGE, k = kit(c, ox), { bx, qd, pl, group } = k, { R } = c;
  const H = 6.6, XL = -5.2, XR = 5.2, ZB = -4.6, ZF = 7;
  const floorM = Lm("sfloor", "#ffffff", () => ctex("nvb_sfloor", 128, 128, (g, r) => { g.fillStyle = "#2a2f47"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#3a4468"; g.lineWidth = 3; g.strokeRect(0, 0, 128, 128); for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(r() * 128, r() * 128, 6, 2); } }));
  const wallM = Lm("swall", "#ffffff", () => ctex("nvb_swall", 256, 512, (g, r) => { g.fillStyle = "#181c3a"; g.fillRect(0, 0, 256, 512); for (let x = 0; x < 256; x += 64) { g.fillStyle = "#222850"; g.fillRect(x + 4, 0, 56, 512); g.fillStyle = "#2f3a7a"; g.fillRect(x + 30, 0, 4, 512); }
    for (let i = 0; i < 40; i++) { g.fillStyle = ["#5a6aff", "#ff5a9a", "#ffd23f"][i % 3]; g.globalAlpha = 0.5; g.beginPath(); g.arc(r() * 256, r() * 512, 3 + r() * 4, 0, 7); g.fill(); } g.globalAlpha = 1; }));
  qd(floorM, [XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], 10.4 / 0.6, 11.6 / 0.6);
  qd(wallM, [XL, 0, ZB], [XR, 0, ZB], [XR, H, ZB], [XL, H, ZB], 10.4 / 2, H / 4); qd(wallM, [XL, 0, ZF], [XL, 0, ZB], [XL, H, ZB], [XL, H, ZF], 11.6 / 2, H / 4); qd(wallM, [XR, 0, ZB], [XR, 0, ZF], [XR, H, ZF], [XR, H, ZB], 11.6 / 2, H / 4);
  qd(Lm("sceil", "#0b0e22"), [XL, H, ZB], [XR, H, ZB], [XR, H, ZF], [XL, H, ZF]);
  const scr = dyn(900, 1100); drawScreen(scr.g, 0); scr.tex.needsUpdate = true;
  bx(toon("#0b0e22"), -1.95, 1.25, ZB, 1.95, 5.75, ZB + 0.1); pl(scr.tex, 3.6, 4.4, 0, 3.5, ZB + 0.12, { noink: true, hdr: 0.95 });
  const led = basic(null, { color: "#4de1ff", hdr: 1.6 }); const strip = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), led); m.position.set(ox + (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.layers.set(NOINK); R.add(m); };
  strip(-2.0, 1.2, ZB + 0.08, 2.0, 1.26, ZB + 0.14); strip(-2.0, 5.74, ZB + 0.08, 2.0, 5.8, ZB + 0.14); strip(-2.0, 1.2, ZB + 0.08, -1.94, 5.8, ZB + 0.14); strip(1.94, 1.2, ZB + 0.08, 2.0, 5.8, ZB + 0.14);
  strip(-5.2, 0.05, 1.8, 5.2, 0.09, 1.86); // stage lip
  bx(toon("#3a3f5c"), -5.2, 0, 1.8, 5.2, 0.05, 7); // stage edge riser
  // curtains
  const cur = Lm("scur", "#ffffff", () => ctex("nvb_cur", 128, 256, (g) => { for (let x = 0; x < 128; x += 16) { g.fillStyle = (x / 16) % 2 ? "#a3182b" : "#c41e36"; g.fillRect(x, 0, 16, 256); } }));
  for (const s of [-1, 1]) qd(cur, [s * 4.0, 0, ZB + 0.5], [s * 5.2, 0, ZB + 0.5], [s * 5.2, H, ZB + 0.5], [s * 4.0, H, ZB + 0.5], 3, 1);
  // truss with lamps + beams
  bx(toon("#8f96a8"), -5, 6.0, -3.2, 5, 6.1, -3.1); bx(toon("#8f96a8"), -5, 6.0, -0.4, 5, 6.1, -0.3);
  const cone = ctex("nvb_cone", 128, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,0.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(54, 0); g.lineTo(74, 0); g.lineTo(128, 256); g.lineTo(0, 256); g.closePath(); g.fill(); });
  [[-3.4, [1, 0.4, 0.7]], [-1.2, [0.4, 0.7, 1]], [1.2, [1, 0.85, 0.4]], [3.4, [0.5, 1, 0.7]]].forEach(([x, col], i) => {
    const cc = col as number[]; const cn = pl(cone, 1.8, 6.0, x as number, 3.0, -0.2, { add: true, hdr: 0.5, color: "#ffffff" }); (cn.material as THREE.MeshBasicMaterial).color.setRGB(cc[0] * 0.16, cc[1] * 0.16, cc[2] * 0.16); cn.rotation.z = (i % 2 ? -1 : 1) * 0.12;
    bx(toon("#222"), (x as number) - 0.12, 5.85, -0.45, (x as number) + 0.12, 6.05, -0.2); c.lamp(ox + (x as number), 5.9, -0.3, 1.0, 0, cc as [number, number, number]);
  });
  c.lamp(ox - 2.6, 3.0, -1.0, 1.0, 0, [1.0, 0.8, 0.5]);
  // podium (left) with keynote sign, and a water bottle
  bx(toon("#6a4a2c"), -3.1, 0, -1.9, -2.2, 1.1, -1.3); bx(toon("#8d5a36"), -3.2, 1.1, -2.0, -2.1, 1.16, -1.2); pl(c.signTex("nvb_keynote", 512, 256, "#1c2330", "#76b900", "KEYNOTE", "bold 96px sans-serif"), 0.7, 0.35, -2.65, 0.62, -1.28);
  // audience silhouettes along the front (heads + raised phones)
  const rnd = rndOf(11); const sil = toon("#0b0d1c");
  for (let i = 0; i < 26; i++) { const x = -4.8 + i * 0.38 + (rnd() - 0.5) * 0.15, z = 3.6 + (i % 2) * 0.7; const g = new THREE.SphereGeometry(0.16, 10, 8); g.translate(ox + x, 0.65 + rnd() * 0.1, z); c.b.add(g, sil); bx(sil, x - 0.22, 0, z - 0.1, x + 0.22, 0.5, z + 0.1); if (i % 5 === 2) bx(toon("#4de1ff"), x + 0.2, 1.0, z - 0.02, x + 0.3, 1.18, z + 0.02); }
  // what each guest holds up (sprites near their raised hand)
  const propT = [
    ctex("nvb_pr0", 128, 128, (g) => { TILES[0].icon(g, 64, 56); }), ctex("nvb_pr1", 160, 160, (g) => { TILES[1].icon(g, 80, 70); }),
    ctex("nvb_pr2", 192, 160, (g) => { TILES[2].icon(g, 96, 56); }), ctex("nvb_pr3", 160, 160, (g) => { TILES[4].icon(g, 80, 70); })];
  STAGE_FOLK.forEach((p, i) => pl(propT[i], 0.55, 0.55, p.x + 0.42, 1.78, p.z + 0.05, { tr: true, order: 5 }));
  c.onFrame((f, set) => { if (set !== "b_stage") return; const t = f / FPS; redraw(scr, Math.round(t * 30), (g) => drawScreen(g, t)); });
  confetti(c, ox, { set: "b_stage", n: 50, origin: [ox, 6.0, -1.5], spread: [8, 0.1, 3], t0: 35.0, rain: 3.5, fall: 0.8, size: 0.06, seed: 13, colors: ["#ffd23f", "#4de1ff", "#ff5a9a"] });
  void group;
};

// ---------------------------------------------------------------- 4. Wall Street: the stock line falls off the chart, through the floor
export const WALL_T0 = 38.92, WALL_EXIT = 39.42, WALL_FLOOR = 39.74;
export const WALL_CH = { cx: 0, cy: 2.15, w: 4.4, h: 2.5, ex: 1.1, z: -3.76 };
const stockPath: [number, number][] = [[0.04, 0.82], [0.14, 0.7], [0.22, 0.74], [0.32, 0.56], [0.42, 0.5], [0.52, 0.4], [0.6, 0.3]];
const dropPath: [number, number][] = [[0.6, 0.3], [0.66, 0.46], [0.7, 0.7], [0.74, 1.0], [0.75, 1.12]];
const drawStock = (g: G2, h: number, t: number) => {
  const W = 1408, Hh = 800; g.fillStyle = "#0e1624"; g.fillRect(0, 0, W, Hh);
  g.strokeStyle = "rgba(120,160,220,0.22)"; g.lineWidth = 3; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, (i * Hh) / 8); g.lineTo(W, (i * Hh) / 8); g.stroke(); } for (let i = 1; i < 12; i++) { g.beginPath(); g.moveTo((i * W) / 12, 0); g.lineTo((i * W) / 12, Hh); g.stroke(); }
  g.fillStyle = "#1b2840"; g.fillRect(0, 0, W, 96); txt(g, "STOCK", 40, 50, "bold 74px sans-serif", "#ffffff", "left"); txt(g, t < WALL_T0 + 0.1 ? "WALL STREET" : "WALL STREET SAYS NO", W - 40, 50, "bold 58px sans-serif", t < WALL_T0 + 0.1 ? "#9fb4d6" : "#ff6a6a", "right");
  const pts: [number, number][] = [...stockPath]; const hd = clamp01(h) * (dropPath.length - 1);
  for (let i = 1; i < dropPath.length; i++) { const q = clamp01(hd - (i - 1)); if (q > 0) pts.push([dropPath[i - 1][0] + (dropPath[i][0] - dropPath[i - 1][0]) * q, dropPath[i - 1][1] + (dropPath[i][1] - dropPath[i - 1][1]) * q]); }
  const X = (p: number) => p * W, Y = (p: number) => 96 + p * (Hh - 96);
  g.beginPath(); g.moveTo(X(pts[0][0]), Hh); pts.forEach(([x, y]) => g.lineTo(X(x), Y(y))); g.lineTo(X(pts[pts.length - 1][0]), Hh); g.closePath();
  const fg = g.createLinearGradient(0, 96, 0, Hh); fg.addColorStop(0, h > 0.02 ? "rgba(232,58,58,0.45)" : "rgba(47,191,113,0.45)"); fg.addColorStop(1, "rgba(14,22,36,0)"); g.fillStyle = fg; g.fill();
  g.lineCap = "round"; g.lineJoin = "round"; for (const [w, col] of [[30, "#0b0f18"], [20, h > 0.02 ? "#ff3b3b" : "#2fe38a"]] as [number, string][]) { g.lineWidth = w; g.strokeStyle = col; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); }
  const [hx, hy] = pts[pts.length - 1]; g.fillStyle = h > 0.02 ? "#ff3b3b" : "#2fe38a"; g.beginPath(); g.arc(X(hx), Y(hy), 24, 0, 7); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 6; g.stroke();
};
const puffT = () => ctex("nvb_puff", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.fillStyle = "#d9d2c4"; g.strokeStyle = INKC; g.lineWidth = 8;
  const cs: [number, number, number][] = [[128, 150, 62], [78, 138, 44], [180, 138, 46], [100, 100, 44], [156, 98, 46], [128, 80, 40]];
  for (const [x, y, rad] of cs) { g.beginPath(); g.arc(x, y, rad, 0, 7); g.stroke(); } for (const [x, y, rad] of cs) { g.beginPath(); g.arc(x, y, rad - 2, 0, 7); g.fill(); }
});
const buildWall = (c: SetCtx) => {
  const ox = B_WALL, k = kit(c, ox), { bx, qd, pl, group } = k, { R } = c;
  const H = 3.4, XL = -3.5, XR = 3.5, ZB = -3.8, ZF = 6.2, HX0 = 0.5, HX1 = 1.7, HZ1 = -2.0;
  const wall = Lm("wwall", "#ffffff", () => wallT("nvb_ww", "#3a4a58", "#34424f", "#1f2c38", "#1b2732")), floor = Lm("wfloor", "#ffffff", () => carpetT("nvb_wfloor", "#3b4a44", "#46574f")), ceil = Lm("wceil", "#ffffff", ceilT);
  const fq = (x0: number, x1: number, z0: number, z1: number) => qd(floor, [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], (x1 - x0) / 0.6, (z1 - z0) / 0.6);
  fq(XL, HX0, ZB, ZF); fq(HX1, XR, ZB, ZF); fq(HX0, HX1, HZ1, ZF);
  qd(wall, [XL, 0, ZB], [XR, 0, ZB], [XR, H, ZB], [XL, H, ZB], 3.5, H / 3.4); qd(wall, [XL, 0, ZF], [XL, 0, ZB], [XL, H, ZB], [XL, H, ZF], 5, H / 3.4); qd(wall, [XR, 0, ZB], [XR, 0, ZF], [XR, H, ZF], [XR, H, ZB], 5, H / 3.4); qd(wall, [XR, 0, ZF], [XL, 0, ZF], [XL, H, ZF], [XR, H, ZF], 3.5, H / 3.4);
  qd(ceil, [XL, H, ZB], [XR, H, ZB], [XR, H, ZF], [XL, H, ZF], 12, 17);
  // the pit under the hatch
  const pit = Lm("wpit", "#1d1522"); const PD = -4.2;
  qd(pit, [HX0, 0, HZ1], [HX1, 0, HZ1], [HX1, PD, HZ1], [HX0, PD, HZ1]); qd(pit, [HX0, 0, ZB], [HX0, 0, HZ1], [HX0, PD, HZ1], [HX0, PD, ZB]); qd(pit, [HX1, 0, HZ1], [HX1, 0, ZB], [HX1, PD, ZB], [HX1, PD, HZ1]); qd(pit, [HX0, PD, HZ1], [HX1, PD, HZ1], [HX1, PD, ZB], [HX0, PD, ZB]);
  
  // chart board
  const chart = dyn(1408, 800); drawStock(chart.g, 0, 0); chart.tex.needsUpdate = true;
  bx(toon("#10151f"), -2.3, 0.82, ZB, 2.3, 3.5, ZB + 0.08); pl(chart.tex, WALL_CH.w, WALL_CH.h, 0, WALL_CH.cy + 0.05, ZB + 0.1, { noink: true, hdr: 0.95 });
  // ticker band across the top of the wall
  const tk = ctex("nvb_tick", 1024, 96, (g) => { g.fillStyle = "#0b0f18"; g.fillRect(0, 0, 1024, 96); for (let i = 0; i < 4; i++) { txt(g, "SELL SELL SELL", 130 + i * 256, 50, "bold 46px sans-serif", "#ff4a4a", "center"); } for (let i = 0; i < 8; i++) txt(g, "▼", 10 + i * 128, 50, "bold 56px sans-serif", "#ff4a4a", "center"); });
  const tkm = pl(tk, 7, 0.34, 0, 3.22, ZB + 0.05, { noink: true, hdr: 1.0 });
  // side monitors with red arrows, WALL STREET sign, desks with phones, a bull
  pl(c.signTex("nvb_wsign", 1024, 256, "#1f3d2e", "#e6d28a", "WALL STREET", "bold 120px sans-serif"), 2.6, 0.65, XR - 0.05, 2.7, 0.8, { ry: -Math.PI / 2 });
  for (const [z, s] of [[-1.5, 1], [0.6, 2], [2.6, 3]] as [number, number][]) pl(ctex("nvb_mon" + s, 256, 192, (g, r) => { g.fillStyle = "#0e1624"; g.fillRect(0, 0, 256, 192); g.strokeStyle = "#ff4a4a"; g.lineWidth = 10; g.lineJoin = "round"; g.beginPath(); g.moveTo(14, 30); for (let i = 1; i < 8; i++) g.lineTo(14 + i * 32, 30 + i * 18 + r() * 24); g.stroke(); txt(g, "▼ " + (s * 3 + 4) + "%", 150, 160, "bold 40px sans-serif", "#ff4a4a"); }), 1.1, 0.82, XL + 0.05, 1.8, z, { ry: Math.PI / 2, noink: true, hdr: 1.0 });
  for (const [dx, dz] of [[-2.2, -1.6], [2.4, -1.4]] as [number, number][]) { bx(toon("#6a4a28"), dx - 0.55, 0.7, dz - 0.35, dx + 0.55, 0.76, dz + 0.35); bx(toon("#4a3a22"), dx - 0.5, 0, dz - 0.3, dx - 0.44, 0.7, dz + 0.3); bx(toon("#4a3a22"), dx + 0.44, 0, dz - 0.3, dx + 0.5, 0.7, dz + 0.3); bx(toon("#bfb48c"), dx - 0.2, 0.76, dz - 0.2, dx + 0.2, 1.1, dz + 0.1); bx(toon("#e8453c"), dx + 0.25, 0.76, dz + 0.0, dx + 0.45, 0.82, dz + 0.2); }
  // ground paper trash and a few fallen chairs
  const rnd = rndOf(8); for (let i = 0; i < 18; i++) { const px = XL + 0.4 + rnd() * 6.2, pz = ZB + 1.6 + rnd() * 7; if (px > HX0 - 0.4 && px < HX1 + 0.4 && pz < HZ1 + 0.6) continue; bx(toon("#f6f1e6"), px - 0.12, 0.002, pz - 0.09, px + 0.12, 0.012, pz + 0.09); }
  for (const tx of [-2.4, 0, 2.4]) { const tr = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.35), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.55, 1.5) })); tr.rotation.x = Math.PI / 2; tr.position.set(ox + tx, H - 0.02, 0.5); tr.layers.set(NOINK); R.add(tr); c.lamp(ox + tx, H - 0.1, 0.5, 2.2, 0, [0.7, 0.8, 0.75]); }
  // the hatch that breaks, shards, dust, the red 3D line
  const sc = (geo: THREE.PlaneGeometry, w: number, d: number) => { const uv = geo.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 0.6, uv.getY(i) * d / 0.6); return geo; };
  const hatch = new THREE.Mesh(sc(new THREE.PlaneGeometry(HX1 - HX0, HZ1 - ZB), HX1 - HX0, HZ1 - ZB), floor); hatch.rotation.x = -Math.PI / 2; hatch.position.set(ox + (HX0 + HX1) / 2, 0.004, (HZ1 + ZB) / 2); R.add(hatch);
  const shards = Array.from({ length: 9 }, (_, i) => { const m = new THREE.Mesh(sc(new THREE.PlaneGeometry(0.34, 0.3), 0.34, 0.3), floor); m.visible = false; R.add(m); return { m, vx: (rnd() - 0.5) * 2.6, vy: 3 + rnd() * 3.2, vz: 1 + rnd() * 2.2, sp: 3 + rnd() * 8, i }; });
  const dust = Array.from({ length: 4 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic(puffT(), { tr: true })); m.visible = false; m.renderOrder = 7; R.add(m); return m; });
  const lineM = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 1), basic(null, { color: "#ff3b3b" })); lineM.renderOrder = 4; R.add(lineM);
  const lineO = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 1), basic(null, { color: "#0b0f18" })); lineO.renderOrder = 3; R.add(lineO);
  const tip = new THREE.Mesh(new THREE.CircleGeometry(0.19, 18), basic(null, { color: "#ff3b3b" })); tip.renderOrder = 5; R.add(tip);
  const tipO = new THREE.Mesh(new THREE.CircleGeometry(0.25, 18), basic(null, { color: "#0b0f18" })); tipO.renderOrder = 4; R.add(tipO);
  const lx = ox + WALL_CH.ex, lz = ZB + 0.22, topY = WALL_CH.cy - WALL_CH.h / 2 + 0.05 - 0.02;
  c.onFrame((f, set) => {
    if (set !== "b_wall") return;
    const t = f / FPS, h = clamp01((t - WALL_T0) / (WALL_EXIT - WALL_T0));
    redraw(chart, Math.round(h * 60) * 2 + (t < WALL_T0 + 0.1 ? 0 : 1), (g) => drawStock(g, h, t));
    tk.offset.x = (t * 0.25) % 1;
    const ld = ss(WALL_EXIT - 0.04, WALL_FLOOR + 0.35, t), bot = topY + (PD + 0.4 - topY) * ld; // tip descends into the pit
    const on = t > WALL_EXIT - 0.04; [lineM, lineO, tip, tipO].forEach((m) => (m.visible = on));
    lineM.scale.y = Math.max(0.01, topY - bot); lineM.position.set(lx, (topY + bot) / 2, lz); lineO.scale.y = lineM.scale.y + 0.06; lineO.position.copy(lineM.position); lineO.position.z -= 0.01;
    tip.position.set(lx, bot, lz + 0.01); tipO.position.set(lx, bot, lz);
    hatch.visible = t < WALL_FLOOR;
    shards.forEach((s) => { const u = t - WALL_FLOOR; s.m.visible = u >= 0 && u < 1.1; if (!s.m.visible) return; s.m.position.set(ox + (HX0 + HX1) / 2 + s.vx * u * 0.55, 0.05 + s.vy * u - 4.9 * u * u + 0.02, -2.9 + s.vz * u * 0.4); s.m.rotation.set(u * s.sp, u * s.sp * 0.6, u * s.sp * 0.3); });
    dust.forEach((m, i) => { const u = t - WALL_FLOOR - i * 0.05; m.visible = u >= 0 && u < 1.1; if (!m.visible) return; m.position.set(ox + (HX0 + HX1) / 2 + (i - 1.5) * 0.35, 0.3 + 0.8 * u, -2.8 + 0.2 * i); m.scale.setScalar(0.5 + 2.0 * ss(0, 0.6, u)); (m.material as THREE.MeshBasicMaterial).opacity = 1 - ss(0.5, 1.1, u); m.quaternion.identity(); });
  });
  confetti(c, ox, { set: "b_wall", n: 70, origin: [ox, 1.4, -1.0], spread: [3.5, 0.5, 1.5], vel: [0, 3.2, 0.4], velR: [2.4, 1.6, 1.0], t0: WALL_T0, colors: ["#f6f1e6", "#fffbe0", "#e8e2cf"], size: 0.13, fall: 1.0, seed: 17 });
  void group;
};

// ---------------------------------------------------------------- 5. the 2012 dorm: two glowing cards, CAT ✓, the leaderboard
export const DORM_FOLK = { a: [-0.35, 0.35, -2.05] as const, b: [1.85, 0, -2.2] as const, c: [-1.05, 0, -2.3] as const };
export const BOARD2_T = 44.3;
const catT = () => ctex("nvb_cat", 640, 400, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 400); gr.addColorStop(0, "#cfe7c8"); gr.addColorStop(1, "#8fc08a"); g.fillStyle = gr; g.fillRect(0, 0, 640, 400);
  g.fillStyle = "#e8d6a8"; g.fillRect(0, 300, 640, 100); g.fillStyle = "#c4a46a"; for (let x = 0; x < 640; x += 80) g.fillRect(x, 300, 6, 100);
  g.fillStyle = "#f08a2c"; g.strokeStyle = INKC; g.lineWidth = 9;
  g.beginPath(); g.moveTo(200, 120); g.lineTo(224, 36); g.lineTo(290, 96); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(440, 120); g.lineTo(416, 36); g.lineTo(350, 96); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(320, 190, 150, 118, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(320, 330, 110, 70, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#c8620f"; for (const x of [286, 320, 354]) { g.beginPath(); g.moveTo(x - 8, 80); g.lineTo(x + 8, 80); g.lineTo(x, 118); g.closePath(); g.fill(); }
  g.fillStyle = "#e7ff9a"; g.strokeStyle = INKC; g.lineWidth = 7; for (const x of [266, 374]) { g.beginPath(); g.ellipse(x, 176, 28, 24, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = INKC; g.beginPath(); g.ellipse(x, 176, 8, 20, 0, 0, 7); g.fill(); g.fillStyle = "#e7ff9a"; }
  g.fillStyle = "#ff8fa8"; g.beginPath(); g.moveTo(308, 214); g.lineTo(332, 214); g.lineTo(320, 230); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = INKC; g.lineWidth = 6; g.beginPath(); g.moveTo(320, 230); g.lineTo(320, 244); g.moveTo(300, 252); g.quadraticCurveTo(320, 262, 320, 244); g.quadraticCurveTo(320, 262, 340, 252); g.stroke();
  g.strokeStyle = "#fff"; g.lineWidth = 4; for (const s of [-1, 1]) for (const dy of [0, 12]) { g.beginPath(); g.moveTo(320 + s * 60, 232 + dy); g.lineTo(320 + s * 140, 226 + dy * 1.6); g.stroke(); }
  g.strokeStyle = "#2fe38a"; g.lineWidth = 10; g.setLineDash([36, 18]); rr(g, 150, 30, 340, 270, 14); g.stroke(); g.setLineDash([]);
  g.fillStyle = "#1ea85a"; rr(g, 150, 306, 340, 70, 14); g.fill(); g.strokeStyle = INKC; g.lineWidth = 7; g.stroke();
  txt(g, "CAT", 290, 342, "bold 64px sans-serif", "#ffffff"); g.strokeStyle = "#ffffff"; g.lineWidth = 16; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(386, 342); g.lineTo(412, 366); g.lineTo(452, 312); g.stroke();
  g.strokeStyle = INKC; g.lineWidth = 12; g.strokeRect(6, 6, 628, 388);
});
const gpuCardT = () => ctex("nvb_gpucard", 256, 640, (g) => {
  g.fillStyle = "#12151c"; rr(g, 8, 8, 240, 624, 22); g.fill(); g.strokeStyle = "#05070b"; g.lineWidth = 8; g.stroke();
  g.fillStyle = "#2b303d"; rr(g, 20, 20, 216, 600, 16); g.fill();
  for (const cy2 of [170, 400]) {
    g.fillStyle = "#0b0d12"; g.beginPath(); g.arc(128, cy2, 92, 0, 7); g.fill(); g.strokeStyle = "#76b900"; g.lineWidth = 8; g.stroke();
    g.fillStyle = "#3a4152"; for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28; g.beginPath(); g.moveTo(128, cy2); g.arc(128, cy2, 80, a, a + 0.5); g.closePath(); g.fill(); }
    g.fillStyle = "#0b0d12"; g.beginPath(); g.arc(128, cy2, 22, 0, 7); g.fill();
  }
  g.fillStyle = "#76b900"; g.fillRect(20, 20, 216, 14); g.fillRect(20, 606, 216, 14); g.fillRect(20, 20, 10, 600); g.fillRect(226, 20, 10, 600);
  txt(g, "GTX 580", 128, 546, "bold 58px sans-serif", "#ffffff", "center", "#0b0d12", 8);
});
const drawBoard2 = (g: G2, t: number) => {
  const W = 1024, Hh = 640; g.fillStyle = "#f7f7f2"; g.fillRect(0, 0, W, Hh); g.fillStyle = "rgba(0,0,0,0.05)"; for (let i = 0; i < 10; i++) g.fillRect(0, 40 + i * 62, W, 2);
  txt(g, "WHO SEES BEST?", 512, 56, "bold 80px sans-serif", "#1f46b8");
  g.strokeStyle = "#3a3a44"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.moveTo(40, 566); g.lineTo(984, 566); g.stroke();
  const them = [0.27, 0.34, 0.3, 0.24, 0.31], hMax = 430;
  them.forEach((v, i) => { const x = 70 + i * 110; g.fillStyle = "#9aa3b2"; g.strokeStyle = INKC; g.lineWidth = 7; g.fillRect(x, 566 - v * hMax, 86, v * hMax); g.strokeRect(x, 566 - v * hMax, 86, v * hMax); });
  txt(g, "EVERYONE ELSE", 300, 606, "bold 40px sans-serif", "#4a4f5c");
  const us = (0.3 + 0.95 * spring(t, BOARD2_T, 8, 3.4)) * hMax; g.fillStyle = "#2fbf71"; g.strokeStyle = INKC; g.lineWidth = 8; g.fillRect(760, 566 - us, 170, us); g.strokeRect(760, 566 - us, 170, us);
  txt(g, "US", 845, 606, "bold 52px sans-serif", "#1a8a50");
  if (t > BOARD2_T + 0.45) { const k2 = spring(t, BOARD2_T + 0.45, 12, 5); g.save(); g.translate(520, 330); g.rotate(-0.2); g.scale(k2, k2); g.strokeStyle = "#e8203a"; g.lineWidth = 12; g.fillStyle = "rgba(255,255,255,0.88)"; rr(g, -250, -62, 500, 124, 14); g.fill(); g.stroke(); txt(g, "CRUSHED", 0, 4, "bold 104px sans-serif", "#e8203a"); g.restore(); }
};
export const DORM = { glowA: null as THREE.Mesh | null };
const buildDorm = (c: SetCtx) => {
  const ox = B_DORM, k = kit(c, ox), { bx, cy, qd, pl, sp, group } = k, { R } = c;
  const H = 2.7, XL = -2.4, XR = 2.4, ZB = -3.4, ZF = 4.2;
  const wall = Lm("dwall", "#ffffff", () => ctex("nvb_dw", 256, 435, (g, r) => { g.fillStyle = "#c9b7a0"; g.fillRect(0, 0, 256, 435); g.fillStyle = "#bfab92"; for (let y = 0; y < 435; y += 87) g.fillRect(0, y, 256, 3); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(80,60,40,${0.05 + r() * 0.06})`; g.beginPath(); g.ellipse(r() * 256, r() * 435, 6 + r() * 24, 3 + r() * 10, 0, 0, 7); g.fill(); } g.fillStyle = "#6e5d4a"; g.fillRect(0, 395, 256, 40); }));
  const floor = Lm("dfloor", "#ffffff", () => ctex("nvb_df", 128, 128, (g, r) => { g.fillStyle = "#6a5240"; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 128; y += 32) { g.fillStyle = y % 64 ? "#735a46" : "#654d3b"; g.fillRect(0, y, 128, 30); } g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 2; for (let y = 0; y <= 128; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); } for (let i = 0; i < 30; i++) { g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(r() * 128, r() * 128, 14, 2); } }));
  qd(floor, [XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], 4.8 / 0.7, 7.6 / 0.7);
  qd(wall, [XL, 0, ZB], [XR, 0, ZB], [XR, H, ZB], [XL, H, ZB], 4.8 / 1.2, H / 2.04); qd(wall, [XL, 0, ZF], [XL, 0, ZB], [XL, H, ZB], [XL, H, ZF], 7.6 / 1.2, H / 2.04); qd(wall, [XR, 0, ZB], [XR, 0, ZF], [XR, H, ZF], [XR, H, ZB], 7.6 / 1.2, H / 2.04); qd(wall, [XR, 0, ZF], [XL, 0, ZF], [XL, H, ZF], [XR, H, ZF], 4, 1);
  qd(Lm("dceil", "#8d897a"), [XL, H, ZB], [XR, H, ZB], [XR, H, ZF], [XL, H, ZF]);
  // bunk bed (left), desk + monitor + open tower (back), window + whiteboard (right wall), posters, string lights
  const wood = toon("#8a6238"), blanket = toon("#5c6a8a"), blanket2 = toon("#b8403a");
  for (const [x, z] of [[-2.35, -3.35], [-1.45, -3.35], [-2.35, -1.2], [-1.45, -1.2]]) bx(wood, x - 0.04, 0, z - 0.04, x + 0.04, 1.95, z + 0.04);
  bx(wood, -2.4, 0.4, -3.4, -1.4, 0.5, -1.15); bx(blanket, -2.38, 0.5, -3.38, -1.42, 0.62, -1.17); bx(wood, -2.4, 1.5, -3.4, -1.4, 1.6, -1.15); bx(blanket2, -2.38, 1.6, -3.38, -1.42, 1.72, -1.17); bx(toon("#f4efe6"), -2.3, 0.62, -3.3, -1.7, 0.7, -2.9); bx(wood, -2.4, 1.6, -1.2, -1.4, 1.95, -1.17);
  bx(wood, -0.7, 0.72, -3.4, 1.55, 0.78, -2.55); bx(wood, -0.66, 0, -3.36, -0.58, 0.72, -2.6); bx(wood, 1.47, 0, -3.36, 1.55, 0.72, -2.6); bx(wood, -0.66, 0.3, -3.4, 1.55, 0.72, -3.34);
  bx(toon("#2b2f45"), -0.5, 0.78, -3.25, 0.2, 0.82, -2.8); bx(toon("#2b2f45"), -0.28, 0.82, -3.1, -0.22, 1.0, -3.05);
  const screen = pl(catT(), 0.95, 0.6, -0.15, 1.34, -3.0, { noink: true, hdr: 1.0 }); bx(toon("#1c2030"), -0.66, 1.0, -3.06, 0.36, 1.7, -3.02);
  bx(toon("#bfb48c"), -0.2, 0.78, -2.85, 0.25, 0.8, -2.72);
  // tower (open side faces the camera): back panel + frame + two vertical cards + glow
  const TX = 1.05; bx(toon("#15171e"), TX - 0.34, 0.78, -3.3, TX + 0.34, 1.7, -3.26); bx(toon("#1c2030"), TX - 0.34, 0.78, -3.3, TX - 0.3, 1.7, -2.86); bx(toon("#1c2030"), TX + 0.3, 0.78, -3.3, TX + 0.34, 1.7, -2.86); bx(toon("#1c2030"), TX - 0.34, 1.66, -3.3, TX + 0.34, 1.7, -2.86); bx(toon("#1c2030"), TX - 0.34, 0.78, -3.3, TX + 0.34, 0.82, -2.86);
  const cardT = gpuCardT();
  const cA = pl(cardT, 0.27, 0.68, TX - 0.15, 1.24, -3.13, { hdr: 1.0 }), cB = pl(cardT, 0.27, 0.68, TX + 0.17, 1.24, -3.13, { hdr: 1.0 }); void cA; void cB;
  bx(toon("#222"), TX - 0.3, 0.82, -3.2, TX + 0.3, 0.9, -3.0);
  DORM.glowA = glow(c, [0.25, 1.0, 0.4], 1.5, 1.6, ox + TX, 1.25, -3.0, 0.16);
  c.lamp(ox + TX, 1.2, -2.7, 0.9, 0, [0.25, 0.9, 0.4]);
  
  // clutter: pizza boxes, cans, mugs, books on the desk, laundry, mini fridge
  const pz = [-1.5, -1.0]; for (let i = 0; i < 4; i++) bx(toon(i % 2 ? "#d9b27a" : "#c9a266"), -0.95, 0.02 + i * 0.07, pz[0] - 0.25, -0.35, 0.09 + i * 0.07, pz[0] + 0.25);
  void pz;
  for (let i = 0; i < 5; i++) cy(toon(["#e8453c", "#3ddc97", "#ffd23f", "#4cc9f0", "#e8453c"][i]), -0.4 + i * 0.13, -2.7, 0.78, 0.9, 0.035, 0.035, 10);
  bx(toon("#d9d9de"), XR - 0.6, 0, -3.0, XR, 0.85, -2.4); bx(toon("#b8bcc6"), XR - 0.6, 0.55, -2.4, XR, 0.58, -2.38);
  bx(toon("#4a5070"), XL + 0.4, 0, -0.5, XL + 1.0, 0.45, 0.1); sp(toon("#c9503a"), XL + 0.7, 0.55, -0.2, 0.22, 1.2, 0.7, 1);
  pl(cityT("nvb_dcity", false), 1.3, 1.0, XR - 0.05, 1.75, -1.9, { ry: -Math.PI / 2 }); bx(Lm("ofrm", "#7a6f58"), XR - 0.08, 1.2, -2.58, XR, 2.3, -2.52);
  const b2 = dyn(1024, 640); drawBoard2(b2.g, 0); b2.tex.needsUpdate = true;
  bx(toon("#9aa3ad"), XR - 0.07, 0.88, -0.5, XR, 2.18, 1.7); pl(b2.tex, 2.1, 1.28, XR - 0.09, 1.53, 0.6, { ry: -Math.PI / 2, order: 1 });
  pl(ctex("nvb_cal12", 384, 512, (g) => { g.fillStyle = "#fbf6e8"; g.fillRect(0, 0, 384, 512); g.fillStyle = "#3a6ec4"; g.fillRect(0, 0, 384, 150); txt(g, "2012", 192, 82, "bold 112px sans-serif", "#fff"); g.fillStyle = "#37323a"; g.font = "bold 28px sans-serif"; g.textAlign = "center"; for (let d = 0; d < 35; d++) g.fillText(String(d < 30 ? d + 1 : d - 29), 36 + (d % 7) * 52, 200 + Math.floor(d / 7) * 52); g.strokeStyle = INKC; g.lineWidth = 10; g.strokeRect(5, 5, 374, 502); }), 0.66, 0.88, XL + 0.05, 1.65, 0.8, { ry: Math.PI / 2 });
  pl(c.signTex("nvb_dpost", 384, 512, "#2b2f45", "#76b900", "DEEP LEARNING", "bold 52px sans-serif"), 0.6, 0.8, XL + 0.05, 1.5, 2.2, { ry: Math.PI / 2 });
  pl(c.signTex("nvb_dpost2", 512, 384, "#f4d86a", "#2b2f45", "SLEEP < SCIENCE", "bold 60px sans-serif"), 0.9, 0.67, 0.9, 2.2, ZB + 0.03);
  for (let i = 0; i < 9; i++) { const x = -2.1 + i * 0.5, y = 2.35 - 0.1 * Math.sin((i / 8) * Math.PI); const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.2) })); m.position.set(ox + x, y, ZB + 0.08); m.layers.set(NOINK); R.add(m); glow(c, [1, 0.7, 0.3], 0.35, 0.35, ox + x, y, ZB + 0.1, 0.8); }
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.5, 1.6) })); bulb.position.set(ox, H - 0.12, 0.5); bulb.layers.set(NOINK); R.add(bulb); c.lamp(ox, H - 0.2, 0.5, 1.2, 0, [1.0, 0.7, 0.4]);
  c.onFrame((f, set) => { if (set !== "b_dorm") return; const t = f / FPS; redraw(b2, Math.round(t * 30), (g) => drawBoard2(g, t)); if (DORM.glowA) (DORM.glowA.material as THREE.MeshBasicMaterial).opacity = 0.14 + 0.05 * Math.sin(t * 5); screen.visible = true; });
  confetti(c, ox, { set: "b_dorm", n: 70, origin: [ox + 0.4, 2.3, -0.6], spread: [3, 0.2, 2.5], t0: BOARD2_T + 0.5, vel: [0, 1.2, 0.5], velR: [1.5, 0.8, 0.8], size: 0.06, fall: 0.8, seed: 31 });
  void group;
};

// ---------------------------------------------------------------- 6. the hilltop: the leather jacket drops from the sky
export const JT0 = 47.02, JL = 47.68;
export const jacketTex = () => ctex("nvb_jacket", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512); g.lineJoin = "round"; g.lineCap = "round";
  const body = () => { g.beginPath(); g.moveTo(190, 70); g.lineTo(150, 84); g.lineTo(40, 250); g.lineTo(86, 292); g.lineTo(150, 212); g.lineTo(156, 436); g.lineTo(356, 436); g.lineTo(362, 212); g.lineTo(426, 292); g.lineTo(472, 250); g.lineTo(362, 84); g.lineTo(322, 70); g.quadraticCurveTo(256, 110, 190, 70); g.closePath(); };
  body(); g.fillStyle = "#1d1d24"; g.fill(); g.lineWidth = 14; g.strokeStyle = INKC; g.stroke();
  g.fillStyle = "#3a3a46"; g.beginPath(); g.moveTo(190, 70); g.lineTo(256, 300); g.lineTo(150, 100); g.closePath(); g.fill(); g.beginPath(); g.moveTo(322, 70); g.lineTo(256, 300); g.lineTo(362, 100); g.closePath(); g.fill();
  g.strokeStyle = INKC; g.lineWidth = 8; g.beginPath(); g.moveTo(190, 70); g.lineTo(256, 300); g.lineTo(322, 70); g.stroke();
  g.strokeStyle = "#c9ccd6"; g.lineWidth = 7; g.beginPath(); g.moveTo(256, 124); g.lineTo(256, 436); g.stroke(); g.fillStyle = "#c9ccd6"; for (let y = 160; y < 430; y += 28) { g.beginPath(); g.arc(256, y, 5, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(255,255,255,0.28)"; g.lineWidth = 12; g.beginPath(); g.moveTo(182, 160); g.lineTo(176, 360); g.moveTo(88, 258); g.lineTo(60, 250); g.stroke();
  g.strokeStyle = "#8a8a96"; g.lineWidth = 7; g.beginPath(); g.moveTo(170, 300); g.lineTo(240, 300); g.moveTo(272, 300); g.lineTo(342, 300); g.stroke();
});
const rayT = () => ctex("nvb_rays", 512, 512, (g) => { g.clearRect(0, 0, 512, 512); for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; const gr = g.createRadialGradient(256, 256, 10, 256, 256, 256); gr.addColorStop(0, "rgba(255,240,170,0.9)"); gr.addColorStop(1, "rgba(255,240,170,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(256, 256); g.arc(256, 256, 256, a, a + 0.12); g.closePath(); g.fill(); } });
const ringT = () => ctex("nvb_ring", 256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.strokeStyle = "rgba(255,250,210,1)"; g.lineWidth = 16; g.beginPath(); g.arc(128, 128, 112, 0, 7); g.stroke(); g.strokeStyle = "rgba(255,210,90,0.9)"; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.stroke(); });
const boltT = () => ctex("nvb_bolt", 128, 256, (g) => { g.clearRect(0, 0, 128, 256); g.fillStyle = "#fff7a8"; g.strokeStyle = INKC; g.lineWidth = 8; g.beginPath(); g.moveTo(84, 6); g.lineTo(28, 130); g.lineTo(66, 130); g.lineTo(40, 250); g.lineTo(104, 108); g.lineTo(66, 108); g.lineTo(100, 6); g.closePath(); g.fill(); g.stroke(); });
const shadowT = () => ctex("nvb_shadow", 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(20,10,30,0.75)"); gr.addColorStop(1, "rgba(20,10,30,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const gameBoard = () => ctex("nvb_gaming", 1024, 560, (g, r) => {
  g.fillStyle = "#1a1040"; g.fillRect(0, 0, 1024, 560); g.strokeStyle = "#ff3bd0"; g.lineWidth = 6; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 330 + i * i * 4); g.lineTo(1024, 330 + i * i * 4); g.stroke(); } for (let i = -8; i < 9; i++) { g.beginPath(); g.moveTo(512 + i * 30, 330); g.lineTo(512 + i * 120, 560); g.stroke(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = "#fff"; g.globalAlpha = 0.3 + r() * 0.6; g.fillRect(r() * 1024, r() * 300, 3, 3); } g.globalAlpha = 1;
  const inv = (x: number, y: number, col: string) => { g.fillStyle = col; const rows = ["0110110", "1111111", "1101011", "1111111", "0101010", "1000001"]; rows.forEach((row, j) => [...row].forEach((c2, i2) => { if (c2 === "1") g.fillRect(x + i2 * 10, y + j * 10, 10, 10); })); };
  for (let i = 0; i < 6; i++) { inv(70 + i * 160, 60 + (i % 2) * 18, ["#5afc7a", "#ff5a9a", "#4de1ff"][i % 3]); }
  g.fillStyle = "#ffd23f"; g.beginPath(); g.arc(160, 440, 56, 0.5, 6.0); g.lineTo(160, 440); g.closePath(); g.fill();
  txt(g, "GAMING CO.", 540, 230, "bold 150px sans-serif", "#ffd23f", "center", "#d1209a", 22); txt(g, "INSERT COIN", 540, 330, "bold 56px sans-serif", "#4de1ff");
  g.strokeStyle = "#4de1ff"; g.lineWidth = 12; g.strokeRect(10, 10, 1004, 540);
});
const grassT = () => ctex("nvb_grass", 256, 256, (g, r) => { g.fillStyle = "#6fa94a"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 90; i++) { g.fillStyle = ["#5f9a3e", "#7fb858", "#68a244"][i % 3]; g.beginPath(); g.ellipse(r() * 256, r() * 256, 10 + r() * 28, 4 + r() * 9, r() * 3, 0, 7); g.fill(); } for (let i = 0; i < 26; i++) { g.fillStyle = ["#ffe27a", "#ffffff", "#ff9ec4"][i % 3]; g.beginPath(); g.arc(r() * 256, r() * 256, 3, 0, 7); g.fill(); } });
const skyLayer = (key: string, base: string, rim: string, seed: number) => ctex(key, 1024, 256, (g, r) => { void seed; g.clearRect(0, 0, 1024, 256); g.fillStyle = base; g.beginPath(); g.moveTo(0, 256); let y = 150; for (let x = 0; x <= 1024; x += 32) { y += (r() - 0.5) * 70; y = Math.max(40, Math.min(210, y)); g.lineTo(x, y); } g.lineTo(1024, 256); g.closePath(); g.fill(); g.strokeStyle = rim; g.lineWidth = 6; g.stroke(); });
const cloudT = () => ctex("nvb_cloud", 512, 256, (g) => { g.clearRect(0, 0, 512, 256); g.fillStyle = "rgba(255,246,232,0.95)"; for (const [x, y, rad] of [[130, 160, 70], [220, 120, 90], [320, 150, 80], [410, 170, 60], [260, 180, 70]] as number[][]) { g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); } g.fillStyle = "rgba(255,200,160,0.5)"; g.fillRect(0, 205, 512, 50); });
export const SKY_B = { jacket: null as THREE.Mesh | null };
const buildSky = (c: SetCtx) => {
  const ox = B_SKY, k = kit(c, ox), { bx, cy, qd, pl, sp, group } = k, { R } = c;
  const grass = Lm("sgrass", "#ffffff", grassT);
  qd(grass, [-16, 0, 10], [16, 0, 10], [16, 0, -26], [-16, 0, -26], 9, 15);
  bx(toon("#d9c08a"), -0.9, 0.003, -1.2, 0.9, 0.012, 9); // dirt path
  // mountains + clouds + sun
  pl(skyLayer("nvb_mt3", "#c47a8e", "#ffb39a", 1), 60, 15, 0, 6.5, -24); pl(skyLayer("nvb_mt2", "#9a6a8e", "#e49a98", 2), 48, 12, -6, 4.6, -18); pl(skyLayer("nvb_mt1", "#6a5a82", "#b87c92", 3), 36, 9, 5, 3.0, -13);
  for (const [x, y, w] of [[-9, 9.5, 8], [8, 11, 10], [0, 12.5, 7], [-14, 7.5, 6], [15, 8.2, 7]] as number[][]) pl(cloudT(), w, w / 2, x, y, -23.5, { tr: true });
  glow(c, [1.0, 0.8, 0.45], 8, 8, ox + 4, 6.5, -22, 0.5);
  // the billboard: GAMING CO.
  pl(gameBoard(), 5.6, 3.06, 0, 3.0, -5.0, { noink: true, hdr: 1.0 }); bx(toon("#0b0b1a"), -2.95, 1.42, -5.06, 2.95, 4.62, -5.0); for (const x of [-2.3, 2.3]) bx(toon("#4a4f5c"), x - 0.09, 0, -5.06, x + 0.09, 1.45, -4.9);
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.2, 2.4) })); m.position.set(ox - 2.7 + i * 0.9, 4.68, -4.94); m.layers.set(NOINK); R.add(m); }
  // arcade cabinets, game crates, joystick, trees, bushes for depth
  for (const [x, z, col] of [[-3.9, -3.2, "#d1209a"], [-4.9, -2.8, "#2b5fd9"], [3.9, -3.2, "#ff8a1a"], [4.9, -2.7, "#1fb36a"]] as [number, number, string][]) {
    bx(toon(col), x - 0.4, 0, z - 0.4, x + 0.4, 1.7, z + 0.4); bx(toon("#0e1020"), x - 0.32, 1.0, z + 0.4, x + 0.32, 1.55, z + 0.42); pl(ctex("nvb_arc" + col, 128, 96, (g, r) => { g.fillStyle = "#0e1a2a"; g.fillRect(0, 0, 128, 96); for (let i = 0; i < 12; i++) { g.fillStyle = ["#5afc7a", "#ff5a9a", "#4de1ff", "#ffd23f"][i % 4]; g.fillRect(r() * 118, r() * 86, 10, 10); } }), 0.58, 0.46, x, 1.28, z + 0.43, { noink: true, hdr: 1.1 });
    bx(toon("#22222e"), x - 0.3, 0.82, z + 0.4, x + 0.3, 0.9, z + 0.6); cy(toon("#e8203a"), x - 0.1, z + 0.5, 0.9, 1.0, 0.05, 0.05, 8);
  }
  for (const [x, z] of [[-2.8, -2.0], [2.9, -2.1], [-3.4, 1.4], [3.6, 0.8]] as number[][]) { bx(toon("#c9965a"), x - 0.35, 0, z - 0.3, x + 0.35, 0.55, z + 0.3); bx(toon("#a87a42"), x - 0.37, 0.55, z - 0.32, x + 0.37, 0.6, z + 0.32); pl(c.signTex("nvb_gbox", 256, 128, "#ff3b3b", "#fff", "GAMES", "bold 56px sans-serif"), 0.5, 0.25, x, 0.3, z + 0.31); }
  for (const [x, z, s] of [[-8, -10, 1.4], [8.5, -9, 1.6], [-6, -16, 2], [11, -16, 2.2], [-12, -6, 1.2], [-5, 5, 1]] as number[][]) { cy(toon("#7a4f33"), x, z, 0, 2.2 * s, 0.2 * s, 0.28 * s, 8); sp(toon("#4f8a3f"), x, 3.2 * s, z, 1.3 * s, 1, 1.2, 1); sp(toon("#62ae4c"), x + 0.5 * s, 2.7 * s, z + 0.3, 0.9 * s, 1, 1.1, 1); }
  for (let i = 0; i < 34; i++) { const x = -9 + i * 0.55 + Math.sin(i * 7.1) * 0.3, z = 2.5 + Math.abs(Math.sin(i * 3.3)) * 3; sp(toon(i % 3 ? "#5f9a3e" : "#7fb858"), x, 0.25, z, 0.35 + (i % 4) * 0.08, 1, 0.8, 1); if (i % 3 === 0) sp(toon(["#ff9ec4", "#ffe27a", "#ffffff"][i % 9 / 3 | 0]), x, 0.55, z + 0.1, 0.09); }
  
  // dynamic: the shadow, the jacket, rays, rings, flash, bolts, sticker
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic(shadowT(), { tr: true })); sh.rotation.x = -Math.PI / 2; sh.position.set(ox, 0.02, -2.2); sh.renderOrder = 3; R.add(sh);
  const jk = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.35), basic(jacketTex(), { tr: true })); jk.renderOrder = 8; R.add(jk); SKY_B.jacket = jk;
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rayT(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })); rays.layers.set(NOINK); rays.renderOrder = 2; R.add(rays);
  const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringT(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })); m.layers.set(NOINK); m.renderOrder = 7; R.add(m); return m; });
  const flash = glow(c, [1.0, 0.95, 0.75], 1, 1, ox, 1.3, -2.8, 1);
  const bolts = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.0), basic(boltT(), { tr: true })); m.renderOrder = 8; m.visible = false; R.add(m); return m; });
  const fw = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.3), basic(stickerT("nvb_fwoom", "POWER UP!", "#ffd23f", "#e8203a", 640, 400, 104), { tr: true })); fw.renderOrder = 9; fw.visible = false; R.add(fw);
  c.onFrame((f, set) => {
    if (set !== "b_sky") return; const t = f / FPS, u = t - JL;
    sh.visible = t > 46.2 && t < JL + 0.05; const sk = ss(46.2, JL, t); sh.scale.set(0.8 + 1.2 * sk, 0.55 + 0.9 * sk, 1); (sh.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.6 * sk;
    jk.visible = t > JT0 - 0.4 && t < JL; if (jk.visible) { const q = clamp01((t - JT0) / (JL - JT0)), q2 = Math.max(0, q); jk.position.set(ox + 0.05 * Math.sin(q * 6), 1.55 + 5.5 * (1 - q2 * q2), -2.0); jk.rotation.z = 0.5 * Math.sin(q * 9) * (1 - q * 0.8); const s2 = 0.75 + 0.5 * q2; jk.scale.set(s2, s2, 1); }
    rays.visible = u > 0 && u < 1.1; rays.position.set(ox, 1.3, -2.9); rays.rotation.z = u * 0.9; rays.scale.setScalar(5 + 8 * ss(0, 0.9, u)); (rays.material as THREE.MeshBasicMaterial).color.setScalar(0.85 * (1 - ss(0.25, 1.1, u)));
    rings.forEach((m, i) => { const w = u - i * 0.1; m.visible = w > 0 && w < 0.75; if (!m.visible) return; m.position.set(ox, 1.25, -2.6); m.scale.setScalar(0.8 + 7 * ss(0, 0.7, w)); (m.material as THREE.MeshBasicMaterial).color.setScalar(0.95 * (1 - ss(0.2, 0.75, w))); });
    flash.visible = u > -0.02 && u < 0.5; flash.scale.setScalar(2.5 + 9 * ss(0, 0.4, u)); (flash.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - ss(0.0, 0.45, u));
    bolts.forEach((m, i) => { const on = u > 0.04 && u < 0.5 && ((Math.floor(f / 2) + i) % 3 !== 0); m.visible = on; if (!on) return; const a = i * 1.6 + 0.4; m.position.set(ox + Math.cos(a) * 1.5, 1.4 + Math.sin(a) * 1.3, -2.5); m.rotation.z = a - 1.57; m.scale.setScalar(1.0 + 0.4 * ((f + i) % 2)); });
    fw.visible = u > 0.12 && u < 1.2; fw.scale.setScalar(0.3 + 0.7 * spring(t, JL + 0.12, 13, 5)); fw.position.set(ox + 1.0, 2.9, -2.2); fw.rotation.z = -0.12;
  });
  confetti(c, ox, { set: "b_sky", n: 90, origin: [ox, 1.0, -2.2], spread: [0.5, 0.5, 0.4], vel: [0, 3.4, 0.6], velR: [2.8, 1.6, 1.6], t0: JL, colors: ["#fff7a8", "#ffd23f", "#ffffff", "#ffb347"], size: 0.07, fall: 0.45, seed: 41 });
  void group; void cy;
};

// ---------------------------------------------------------------- 7. the box with a bow (exported) + the staircase to the tiny lab
export const buildCardBox = (c: SetCtx, x: number, y: number, z: number, o: { s?: number } = {}) => {
  const W = 1.25, Hh = 1.0, D = 0.9, g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(o.s ?? 1); c.R.add(g);
  const card = twoTone(new THREE.MeshLambertMaterial({ color: "#c9965a", side: THREE.DoubleSide })), dark = twoTone(new THREE.MeshLambertMaterial({ color: "#b0804a", side: THREE.DoubleSide }));
  const front = twoTone(new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, map: ctex("nvb_boxfront", 512, 416, (gg) => {
    gg.fillStyle = "#c9965a"; gg.fillRect(0, 0, 512, 416); gg.fillStyle = "rgba(90,50,20,0.15)"; for (let i = 0; i < 9; i++) gg.fillRect(0, 30 + i * 46, 512, 3);
    gg.fillStyle = "#fff8e8"; gg.strokeStyle = INKC; gg.lineWidth = 8; rr(gg, 70, 120, 372, 170, 12); gg.fill(); gg.stroke();
    txt(gg, "AI", 256, 176, "bold 76px sans-serif", "#76b900"); txt(gg, "SUPERCOMPUTER", 256, 246, "bold 52px sans-serif", INKC);
    gg.save(); gg.translate(110, 350); gg.rotate(-0.08); gg.strokeStyle = "#e8203a"; gg.lineWidth = 7; rr(gg, 0, -26, 190, 52, 6); gg.stroke(); txt(gg, "FRAGILE", 95, 2, "bold 38px sans-serif", "#e8203a"); gg.restore();
    gg.strokeStyle = INKC; gg.lineWidth = 8; gg.beginPath(); gg.moveTo(380, 372); gg.lineTo(380, 316); gg.moveTo(356, 338); gg.lineTo(380, 312); gg.lineTo(404, 338); gg.stroke(); }) }));
  const box = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D), [dark, dark, card, card, front, card]); box.position.y = Hh / 2; g.add(box);
  const red = toon("#e8203a"), red2 = toon("#c0162e");
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number, rz = 0, ry = 0) => { const mm = new THREE.Mesh(geo, m); mm.position.set(px, py, pz); mm.rotation.set(0, ry, rz); g.add(mm); return mm; };
  add(new THREE.BoxGeometry(0.16, 0.014, D + 0.03), red, 0, Hh + 0.007, 0); add(new THREE.BoxGeometry(W + 0.03, 0.014, 0.16), red, 0, Hh + 0.012, 0);
  add(new THREE.BoxGeometry(0.16, Hh + 0.03, 0.014), red, 0, Hh / 2, D / 2 + 0.007); add(new THREE.BoxGeometry(0.014, Hh + 0.03, 0.16), red, W / 2 + 0.007, Hh / 2, 0); add(new THREE.BoxGeometry(0.014, Hh + 0.03, 0.16), red, -W / 2 - 0.007, Hh / 2, 0);
  for (const s of [-1, 1]) { const lp = add(new THREE.SphereGeometry(0.2, 14, 10), red, s * 0.2, Hh + 0.16, 0, s * 0.5); lp.scale.set(1.3, 0.8, 0.7); add(new THREE.BoxGeometry(0.1, 0.34, 0.03), red2, s * 0.13, Hh + 0.0, 0.1, s * 0.4); }
  add(new THREE.SphereGeometry(0.1, 12, 8), red2, 0, Hh + 0.12, 0.02);
  return g;
};
export const LABBOX = { g: null as THREE.Group | null };
export const LAB = { x0: -5.0, run: 0.56, rise: 0.19, n: 12, landX: 1.72, landY: 2.28, doorX: 4.2, z: -0.7 };
/** height of the tread under x (smooth step-ups): the walking path for cards */
export const stairY = (x: number) => { const i = (x - LAB.x0) / LAB.run; if (i <= 0) return 0; if (i >= LAB.n) return LAB.n * LAB.rise; const fl = Math.floor(i), fr = i - fl; return (fl + ss(0, 0.3, fr)) * LAB.rise; };
export const LAB_FOLK = [{ x: 3.15, z: -1.1, v: 3 }, { x: 5.05, z: -1.1, v: 0 }, { x: 5.3, z: -0.5, v: 5 }];
export const BANNER_T = 53.4;
const skylineT = (key: string, base: string, win: string) => ctex(key, 1024, 512, (g, r) => {
  g.clearRect(0, 0, 1024, 512); let x = 0; while (x < 1024) { const w = 70 + r() * 90, h = 160 + r() * 330; g.fillStyle = base; g.fillRect(x, 512 - h, w, h); g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x, 512 - h, 10, h);
    g.fillStyle = win; for (let y = 512 - h + 14; y < 500; y += 26) for (let xx = x + 10; xx < x + w - 12; xx += 20) if (r() < 0.6) g.fillRect(xx, y, 11, 14); x += w + 4; } });
const buildLab = (c: SetCtx) => {
  const ox = B_LAB, k = kit(c, ox), { bx, cy, qd, pl, sp, group } = k, { R } = c;
  const pave = Lm("lpave", "#ffffff", () => ctex("nvb_pave", 128, 128, (g, r) => { g.fillStyle = "#b8b2a6"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#9a9488"; g.lineWidth = 3; g.strokeRect(0, 0, 64, 64); g.strokeRect(64, 64, 64, 64); for (let i = 0; i < 30; i++) { g.fillStyle = "rgba(0,0,0,0.05)"; g.fillRect(r() * 128, r() * 128, 8, 3); } }));
  qd(pave, [-14, 0, 10], [14, 0, 10], [14, 0, -10], [-14, 0, -10], 28 / 1.2, 20 / 1.2);
  pl(skylineT("nvb_sky1", "#7a8cb0", "#fff3c4"), 46, 23, 0, 11.5, -16, { tr: true }); pl(skylineT("nvb_sky2", "#5a6a96", "#ffe9a8"), 34, 17, -5, 8.5, -11.5, { tr: true });
  pl(ctex("nvb_dayback", 16, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#5a9ae4"); gr.addColorStop(1, "#cfe6f8"); g.fillStyle = gr; g.fillRect(0, 0, 16, 256); }), 60, 30, 0, 14, -17, {});
  const tread = [toon("#cfc8b8"), toon("#c2bba9")];
  for (let i = 0; i < LAB.n; i++) { const xa = LAB.x0 + i * LAB.run; bx(tread[i % 2], xa, 0, -2.4, xa + LAB.run, (i + 1) * LAB.rise, 0.3); }
  bx(toon("#cfc8b8"), LAB.landX, 0, -4.4, 6.6, LAB.landY, 0.3); bx(toon("#8a8474"), LAB.landX, LAB.landY - 0.05, 0.3, 6.6, LAB.landY, 0.36);
  // handrail along the stairs and landing
  for (let i = 0; i <= LAB.n; i += 2) { const xx = LAB.x0 + i * LAB.run; bx(toon("#4a505c"), xx - 0.025, i * LAB.rise, 0.22, xx + 0.025, i * LAB.rise + 0.95, 0.27); }
  { const len = Math.hypot(LAB.n * LAB.run, LAB.n * LAB.rise), rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.05), toon("#4a505c")); rail.position.set(ox + LAB.x0 + (LAB.n * LAB.run) / 2, (LAB.n * LAB.rise) / 2 + 0.95, 0.25); rail.rotation.z = Math.atan2(LAB.n * LAB.rise, LAB.n * LAB.run); R.add(rail); }
  bx(toon("#4a505c"), LAB.landX, LAB.landY + 0.93, 0.22, 6.6, LAB.landY + 0.98, 0.27); for (const xx of [3.0, 4.6, 6.4]) bx(toon("#4a505c"), xx - 0.025, LAB.landY, 0.22, xx + 0.025, LAB.landY + 0.95, 0.27);
  // the tiny lab: a squat building with a tiny door
  const bw = Lm("lbld", "#ffffff", () => ctex("nvb_lbld", 256, 256, (g, r) => { g.fillStyle = "#e6dcc6"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#cfc3a8"; g.lineWidth = 3; for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); } for (let i = 0; i < 18; i++) { g.fillStyle = "rgba(90,70,40,0.07)"; g.beginPath(); g.ellipse(r() * 256, r() * 256, 14, 6, 0, 0, 7); g.fill(); } }));
  const LY = LAB.landY, BX0 = 2.5, BX1 = 5.9, BZ0 = -4.2, BZ1 = -1.6, BH = 2.1;
  bx(bw, BX0, LY, BZ0, BX1, LY + BH, BZ1, 1.2);
  qd(Lm("lroof", "#7a4f45"), [BX0 - 0.2, LY + BH, BZ1 + 0.2], [BX1 + 0.2, LY + BH, BZ1 + 0.2], [BX1 + 0.2, LY + BH + 0.8, (BZ0 + BZ1) / 2], [BX0 - 0.2, LY + BH + 0.8, (BZ0 + BZ1) / 2]);
  qd(Lm("lroof", "#7a4f45"), [BX0 - 0.2, LY + BH + 0.8, (BZ0 + BZ1) / 2], [BX1 + 0.2, LY + BH + 0.8, (BZ0 + BZ1) / 2], [BX1 + 0.2, LY + BH, BZ0 - 0.2], [BX0 - 0.2, LY + BH, BZ0 - 0.2]);
  const doorZ = BZ1 + 0.012; bx(toon("#8a5a2c"), 3.67, LY, BZ1 - 0.02, 4.73, LY + 1.62, BZ1 + 0.03);
  const door = pl(ctex("nvb_ldoor", 128, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#fff0b8"); gr.addColorStop(1, "#ffcf6a"); g.fillStyle = gr; g.fillRect(0, 0, 128, 256); g.fillStyle = "rgba(60,40,20,0.35)"; g.fillRect(0, 200, 128, 56); }), 0.92, 1.56, 4.2, LY + 0.78, doorZ + 0.02, { noink: true, hdr: 1.1 }); void door;
  pl(c.signTex("nvb_openai", 768, 192, "#f4f1ea", "#1c1c24", "OpenAI", "bold 118px sans-serif"), 1.7, 0.44, 4.2, LY + 1.95, BZ1 + 0.04);
  pl(c.signTex("nvb_tiny", 512, 96, "#ffd23f", "#241726", "TINY LAB", "bold 56px sans-serif"), 0.9, 0.17, 4.2, LY + 1.68, BZ1 + 0.045);
  pl(cityT("nvb_lwin"), 0.9, 0.62, 3.0, LY + 1.25, BZ1 + 0.02, {}); pl(cityT("nvb_lwin2"), 0.9, 0.62, 5.5, LY + 1.25, BZ1 + 0.02, {});
  glow(c, [1.0, 0.8, 0.45], 2.2, 2.4, ox + 4.2, LY + 0.9, BZ1 + 0.3, 0.5); c.lamp(ox + 4.2, LY + 1.0, BZ1 + 0.5, 2.4, LY, [1.0, 0.8, 0.45]);
  // plants + lamp posts + a bench for density
  for (const [x, z] of [[2.1, -0.3], [6.2, -0.2], [-5.6, -0.4], [-6.4, 1.2]] as number[][]) { const yy = x > 2 ? LY : 0; cy(toon("#c0643a"), x, z, yy, yy + 0.4, 0.2, 0.25, 12); for (let i = 0; i < 5; i++) sp(toon(i % 2 ? "#5f9a4a" : "#4f8a3f"), x + Math.cos(i * 1.3) * 0.15, yy + 0.7 + i * 0.07, z + Math.sin(i * 1.3) * 0.1, 0.2, 1, 1.6, 0.6); }
  for (const x of [-7.5, 8.2]) { const yy = x > 2 ? LY : 0; cy(toon("#3a3f4c"), x, -1.2, yy, yy + 3.2, 0.06, 0.08, 8); bx(toon("#3a3f4c"), x - 0.35, yy + 3.2, -1.25, x + 0.05, yy + 3.26, -1.15); glow(c, [1, 0.85, 0.5], 0.9, 0.9, ox + x - 0.2, yy + 3.15, -1.2, 0.9); }
  bx(toon("#8a6238"), -7.0, 0.38, 0.8, -5.6, 0.45, 1.3); bx(toon("#8a6238"), -7.0, 0.45, 0.78, -5.6, 0.95, 0.84); bx(toon("#4a505c"), -6.9, 0, 0.85, -6.8, 0.38, 1.25); bx(toon("#4a505c"), -5.8, 0, 0.85, -5.7, 0.38, 1.25);
  // ChatGPT banner (unrolls) hung from two poles
  for (const x of [2.7, 5.7]) bx(toon("#4a505c"), x - 0.04, LY + BH + 0.4, BZ1 - 0.1, x + 0.04, LY + BH + 2.4, BZ1 - 0.02);
  const ban = pl(c.signTex("nvb_chatgpt", 1024, 256, "#10a37f", "#ffffff", "ChatGPT", "bold 150px sans-serif"), 3.0, 0.75, 4.2, 6.5, BZ1 - 0.05, { order: 4 }); ban.visible = false;
  c.onFrame((f, set) => { if (set !== "b_lab") return; const t = f / FPS, q = spring(t, BANNER_T, 9, 3.6); ban.visible = t > BANNER_T; ban.scale.set(1, Math.max(0.02, q), 1); ban.position.y = LY + BH + 2.3 - 0.375 * Math.max(0.02, q); });
  LABBOX.g = buildCardBox(c, ox + LAB.x0, 0, LAB.z, { s: 0.9 });
  void group;
};

// ---------------------------------------------------------------- 8. celebration stage ($5T) + the brass scale
export const SCALE = { x: 0, z: -2.0, pivotY: 2.2, L: 1.7, chain: 1.4, hit: 61.5, amp: 0.36 };
export const FIVE_T = 59.0;
export const scaleTheta = (t: number) => (t < SCALE.hit ? 0.018 * Math.sin(t * 6) : SCALE.amp * spring(t, SCALE.hit, 8, 3.6));
const coneT = () => ctex("nvb_cone", 128, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,255,255,0.7)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(54, 0); g.lineTo(74, 0); g.lineTo(128, 256); g.lineTo(0, 256); g.closePath(); g.fill(); });
const japanT = () => ctex("nvb_japan", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); g.fillStyle = "#4fb06a"; g.strokeStyle = INKC; g.lineWidth = 8; g.lineJoin = "round";
  const isl: number[][][] = [[[150, 30], [186, 52], [176, 96], [150, 130], [124, 170], [96, 196], [70, 190], [92, 150], [118, 120], [124, 84], [128, 50]], [[60, 196], [86, 202], [80, 226], [48, 230]], [[196, 40], [220, 20], [226, 52], [206, 62]]];
  for (const p of isl) { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.stroke(); }
  g.fillStyle = "#e8203a"; g.beginPath(); g.arc(150, 102, 18, 0, 7); g.fill(); g.stroke();
});
const buildScale = (c: SetCtx) => {
  const ox = B_SCALE, k = kit(c, ox), { bx, qd, pl, group } = k, { R } = c;
  const H = 7, XL = -8, XR = 8, ZB = -5, ZF = 7;
  qd(Lm("xfloor", "#ffffff", () => ctex("nvb_xfloor", 128, 128, (g) => { g.fillStyle = "#2b3a6b"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#3f5296"; g.lineWidth = 4; g.strokeRect(0, 0, 128, 128); g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(8, 8, 50, 6); })), [XL, 0, ZF], [XR, 0, ZF], [XR, 0, ZB], [XL, 0, ZB], 16 / 0.8, 12 / 0.8);
  qd(Lm("xwall", "#ffffff", () => ctex("nvb_xwall", 512, 512, (g) => { g.fillStyle = "#16204a"; g.fillRect(0, 0, 512, 512); g.fillStyle = "rgba(255,210,63,0.16)"; for (let i = 0; i < 22; i++) { g.beginPath(); g.moveTo(256, 400); g.arc(256, 400, 800, i * 0.286, i * 0.286 + 0.143); g.closePath(); g.fill(); } g.fillStyle = "rgba(255,255,255,0.5)"; for (let i = 0; i < 60; i++) g.fillRect(((i * 97) % 512), ((i * 53) % 330), 3, 3); })), [XL, 0, ZB], [XR, 0, ZB], [XR, H, ZB], [XL, H, ZB], 2.2, 1);
  qd(Lm("xside", "#101838"), [XL, 0, ZF], [XL, 0, ZB], [XL, H, ZB], [XL, H, ZF]); qd(Lm("xside", "#101838"), [XR, 0, ZB], [XR, 0, ZF], [XR, H, ZF], [XR, H, ZB]);
  for (const s of [-1, 1]) qd(Lm("xcur", "#ffffff", () => ctex("nvb_xcur", 128, 256, (g) => { for (let x = 0; x < 128; x += 16) { g.fillStyle = (x / 16) % 2 ? "#a3182b" : "#c41e36"; g.fillRect(x, 0, 16, 256); } })), [s * 6.4, 0, ZB + 0.4], [s * 8, 0, ZB + 0.4], [s * 8, H, ZB + 0.4], [s * 6.4, H, ZB + 0.4], 3, 1);
  // spots
  [[-4.5, [1, 0.5, 0.8]], [-1.5, [0.5, 0.8, 1]], [1.5, [1, 0.9, 0.5]], [4.5, [0.6, 1, 0.7]]].forEach(([x, col], i) => { const cc = col as number[]; const cn = pl(coneT(), 2.2, 6, x as number, 3.6, -0.5, { add: true, color: "#ffffff" }); (cn.material as THREE.MeshBasicMaterial).color.setRGB(cc[0] * 0.15, cc[1] * 0.15, cc[2] * 0.15); cn.rotation.z = (i % 2 ? -1 : 1) * 0.1; c.lamp(ox + (x as number), 6.2, -0.8, 1.0, 0, cc as [number, number, number]); });
  c.lamp(ox, 3.5, 1.0, 1.5, 0, [1.0, 0.85, 0.55]);
  // the $5T board
  const cnt = dyn(768, 384); const drawCnt = (g: G2, t: number) => {
    g.fillStyle = "#0b1230"; rr(g, 6, 6, 756, 372, 28); g.fill(); g.strokeStyle = "#ffd23f"; g.lineWidth = 12; g.stroke();
    const n = Math.max(1, Math.min(5, 1 + Math.floor((t - (FIVE_T - 1.0)) / 0.25))), hit = t >= FIVE_T ? spring(t, FIVE_T, 12, 4.5) : 1, wob = t >= FIVE_T ? 0 : 1;
    g.save(); g.translate(384, 200); g.scale(hit * (1 + (t >= FIVE_T ? 0 : 0)), hit); g.fillStyle = t >= FIVE_T ? "#ffd23f" : "#ffffff"; g.font = "bold 230px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 16; g.strokeStyle = INKC; g.strokeText(`$${n}T`, 0, 0); g.fillText(`$${n}T`, 0, 0); g.restore(); void wob;
    txt(g, "FIRST COMPANY EVER", 384, 340, "bold 46px sans-serif", "#fff6c8");
  };
  drawCnt(cnt.g, 0); cnt.tex.needsUpdate = true;
  const cb = pl(cnt.tex, 4.4, 2.2, 0, 4.7, ZB + 0.06, { noink: true, hdr: 1.1 });
  // podium (dynamic meshes: hidden for the scale shot)
  const pod = group(0, 0, -2.0), stepM = [toon("#e8c24a"), toon("#c9cbd6"), toon("#c98a52")];
  [[0, 1.0, 1.15, 0], [-1.35, 0.7, 1.15, 1], [1.35, 0.5, 1.15, 2]].forEach(([x, h, w, i]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.9), stepM[i]); m.position.set(x, h / 2, 0); pod.add(m); const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), basic(stickerT("nvb_pod" + i, String(i === 0 ? 1 : i === 1 ? 2 : 3), "#ffffff", "#241726", 256, 256, 150), { tr: true })); lb.position.set(x, h * 0.55, 0.46); pod.add(lb); });
  // the scale (dynamic)
  const sg = group(SCALE.x, 0, SCALE.z), brass = toon("#c9a24a"), brassD = toon("#9a7a2e");
  const mk = (geo: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D = sg) => { const o = new THREE.Mesh(geo, m); p.add(o); return o; };
  mk(new THREE.BoxGeometry(1.8, 0.14, 0.9), brassD).position.set(0, 0.07, 0); mk(new THREE.BoxGeometry(0.22, SCALE.pivotY, 0.22), brass).position.set(0, SCALE.pivotY / 2, 0); mk(new THREE.SphereGeometry(0.2, 14, 10), brass).position.set(0, SCALE.pivotY, 0.02);
  const beam = mk(new THREE.BoxGeometry(SCALE.L * 2 + 0.2, 0.14, 0.14), brass); const rodL = mk(new THREE.BoxGeometry(0.05, SCALE.chain, 0.05), brassD), rodR = mk(new THREE.BoxGeometry(0.05, SCALE.chain, 0.05), brassD);
  const panL = new THREE.Group(), panR = new THREE.Group(); sg.add(panL, panR);
  for (const p of [panL, panR]) { mk(new THREE.CylinderGeometry(0.75, 0.62, 0.09, 24), brass, p).position.y = 0.0; const rim = mk(new THREE.TorusGeometry(0.75, 0.035, 6, 24), brassD, p); rim.rotation.x = Math.PI / 2; rim.position.y = 0.045; }
  const jp = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), basic(japanT(), { tr: true })); jp.position.set(0, 0.38, 0.1); panL.add(jp);
  const chip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.09), [toon("#1c2330"), toon("#1c2330"), toon("#1c2330"), toon("#1c2330"), basic(chipT()), toon("#1c2330")]); chip.position.set(0, 0.36, 0); panR.add(chip);
  const nmL = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.24), basic(c.signTex("nvb_jp", 512, 128, "#ffffff", "#e8203a", "JAPAN", "bold 80px sans-serif"))); nmL.position.set(0, -0.02, 0.72); panL.add(nmL);
  const nmR = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.24), basic(c.signTex("nvb_nv", 512, 128, "#76b900", "#ffffff", "NVIDIA", "bold 80px sans-serif"))); nmR.position.set(0, -0.02, 0.72); panR.add(nmR);
  const thud = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.05), basic(stickerT("nvb_thud", "THUD", "#ffd23f", "#e8203a", 640, 400, 150), { tr: true })); thud.renderOrder = 9; thud.visible = false; sg.add(thud);
  const dust2 = Array.from({ length: 3 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic(puffT(), { tr: true })); m.renderOrder = 8; m.visible = false; sg.add(m); return m; });
  c.onFrame((f, set) => {
    if (set !== "b_scale") return; const t = f / FPS;
    redraw(cnt, Math.round(t * 20), (g) => drawCnt(g, t)); cb.visible = true;
    pod.visible = t < 60.78; sg.visible = t >= 60.6;
    const th = scaleTheta(t), s = Math.sin(th), co = Math.cos(th), L = SCALE.L, py = SCALE.pivotY;
    beam.rotation.z = -th; beam.position.set(0, py, 0);
    const rx = L * co, ry = py - L * s, lx = -L * co, ly = py + L * s; // th > 0: the chip (right) side goes down
    rodR.position.set(rx, ry - SCALE.chain / 2, 0); rodL.position.set(lx, ly - SCALE.chain / 2, 0);
    panR.position.set(rx, Math.max(0.1, ry - SCALE.chain), 0); panL.position.set(lx, ly - SCALE.chain, 0);
    const down = t >= SCALE.hit + 0.35 && t < SCALE.hit + 0.35 + 1.3, u = t - (SCALE.hit + 0.35);
    thud.visible = down && u > 0.0; thud.position.set(1.9, 0.9, 0.4); thud.scale.setScalar(0.3 + 0.7 * spring(t, SCALE.hit + 0.38, 13, 5)); thud.rotation.z = 0.12;
    dust2.forEach((m, i) => { const w = u - i * 0.06; m.visible = w > 0 && w < 0.9; if (!m.visible) return; m.position.set(rx + (i - 1) * 0.55, 0.25 + 0.4 * w, 0.5); m.scale.setScalar(0.4 + 1.4 * ss(0, 0.6, w)); (m.material as THREE.MeshBasicMaterial).opacity = 1 - ss(0.4, 0.9, w); });
  });
  confetti(c, ox, { set: "b_scale", n: 160, origin: [ox, 6.2, 0], spread: [12, 0.2, 7], t0: 57.4, rain: 4.0, fall: 0.9, size: 0.09, seed: 51 });
  confetti(c, ox, { set: "b_scale", n: 70, origin: [ox, 1.8, -2.0], spread: [0.6, 0.3, 0.4], vel: [0, 4.2, 1.5], velR: [3.4, 1.4, 1.4], t0: FIVE_T, size: 0.09, fall: 0.8, seed: 53, colors: ["#ffd23f", "#ffffff", "#ff9f1c", "#4de1ff"] });
};

// ---------------------------------------------------------------- 9. the planet of queues (scale leap)
const planetT = () => ctex("nvb_planet", 2048, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#d9c79a"); gr.addColorStop(0.5, "#b9a878"); gr.addColorStop(1, "#6a7a9a"); g.fillStyle = gr; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${90 + r() * 60},${100 + r() * 60},${120 + r() * 60},0.16)`; g.beginPath(); g.ellipse(r() * 2048, 120 + r() * 700, 20 + r() * 90, 8 + r() * 30, 0, 0, 7); g.fill(); }
  const cols = ["#e8453c", "#3b82c4", "#ffd23f", "#5ab07a", "#8a5ac9", "#ff8a3d", "#ffffff", "#222a3a"];
  for (let m = 0; m < 160; m++) { const x = (m + 0.5) * (2048 / 160); g.strokeStyle = "rgba(40,30,30,0.35)"; g.lineWidth = 5; g.beginPath(); g.moveTo(x, 40); g.lineTo(x + Math.sin(m) * 10, 800); g.stroke();
    for (let y = 60; y < 800; y += 14) { const hx = x + Math.sin(y * 0.03 + m) * 6; g.fillStyle = cols[(m * 7 + (y / 14 | 0)) % cols.length]; g.beginPath(); g.arc(hx, y, 5.5, 0, 7); g.fill(); g.strokeStyle = INKC; g.lineWidth = 1.5; g.stroke(); } }
  for (let m = 0; m < 56; m++) { const x = r() * 2048, y = 700 + r() * 200; g.fillStyle = cols[m % cols.length]; g.fillRect(x, y, 44, 30); g.strokeStyle = INKC; g.lineWidth = 4; g.strokeRect(x, y, 44, 30); }
});
const patchT = () => ctex("nvb_patch", 2048, 2048, (g, r) => {
  g.fillStyle = "#cdbb8c"; g.fillRect(0, 0, 2048, 2048);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${120 + r() * 60},${100 + r() * 50},${70 + r() * 40},0.14)`; g.beginPath(); g.ellipse(r() * 2048, r() * 2048, 10 + r() * 60, 6 + r() * 26, r() * 3, 0, 7); g.fill(); }
  const Rc = PLANET.R * Math.sin(PLANET.patch), px = (m: number) => (m / (2 * Rc) + 0.5) * 2048, cols = ["#e8453c", "#3b82c4", "#ffd23f", "#5ab07a", "#8a5ac9", "#ff8a3d", "#ffffff", "#222a3a"];
  // the box sits at the centre; queues arrive along curling lanes from every direction (people seen from above-front: head + shoulders)
  for (let l = 0; l < 44; l++) {
    const a0 = (l / 44) * Math.PI * 2; g.strokeStyle = "rgba(50,36,30,0.3)"; g.lineWidth = 7; g.beginPath(); const pts: number[][] = [];
    for (let d = 1.4; d < Rc - 0.4; d += 0.25) { const a = a0 + 0.55 * Math.sin(d * 0.28 + l) * (d / Rc); pts.push([px(d * Math.cos(a)), px(d * Math.sin(a))]); }
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    for (let d = 2.2 + (l % 3) * 0.2; d < Rc - 0.6; d += 0.62) { const a = a0 + 0.55 * Math.sin(d * 0.28 + l) * (d / Rc), x = px(d * Math.cos(a)), y = px(d * Math.sin(a)), sz = 13;
      g.fillStyle = cols[(l * 5 + (d * 3 | 0)) % cols.length]; g.beginPath(); g.ellipse(x, y + 9, sz, 12, 0, 0, 7); g.fill(); g.strokeStyle = INKC; g.lineWidth = 3; g.stroke(); g.fillStyle = "#f2c9a0"; g.beginPath(); g.arc(x, y - 4, sz * 0.62, 0, 7); g.fill(); g.stroke(); }
  }
});
export const POLE: [number, number, number] = [PLANET.cx, 0, PLANET.z];
/** card height on the curved patch at horizontal distance d from the pole */
export const patchY = (dx: number, dz: number) => -((dx * dx + dz * dz) / (2 * PLANET.R)) - 0.01;
const buildPlanet = (c: SetCtx) => {
  const { R } = c, cx = PLANET.cx, cz = PLANET.z, Rp = PLANET.R;
  const pm = Lm("planet", "#ffffff", planetT); const sph = new THREE.Mesh(new THREE.SphereGeometry(Rp, 96, 48), pm); sph.position.set(cx, -Rp, cz); R.add(sph);
  const capG = new THREE.SphereGeometry(Rp + 0.05, 64, 24, 0, Math.PI * 2, 0, PLANET.patch); const pos = capG.attributes.position as THREE.BufferAttribute, uv = capG.attributes.uv as THREE.BufferAttribute, Rc = Rp * Math.sin(PLANET.patch);
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * Rc) + 0.5, 1 - (pos.getZ(i) / (2 * Rc) + 0.5));
  const cap = new THREE.Mesh(capG, Lm("patch", "#ffffff", patchT)); cap.position.set(cx, -Rp, cz); R.add(cap);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(Rp * 1.07, 48, 24), new THREE.ShaderMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.FrontSide,
    vertexShader: "varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }",
    fragmentShader: "varying vec3 vN; varying vec3 vP; void main(){ float d = abs(dot(vN, normalize(-vP))); float i = pow(1.0 - d, 3.2); gl_FragColor = vec4(vec3(0.95, 0.72, 0.4) * i * 1.1, i * 0.8); }" }));
  atm.position.set(cx, -Rp, cz); atm.layers.set(NOINK); atm.renderOrder = 3; R.add(atm);
  // stars
  const rnd = rndOf(77), sp2 = new Float32Array(900); for (let i = 0; i < 300; i++) { const a = rnd() * 6.283, e = (rnd() - 0.15) * 1.3, rr2 = 500; sp2[i * 3] = cx + Math.cos(a) * Math.cos(e) * rr2; sp2[i * 3 + 1] = Math.sin(e) * rr2 + 100; sp2[i * 3 + 2] = cz + Math.sin(a) * Math.cos(e) * rr2; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp2, 3)); const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: "#fff6d8", size: 3, sizeAttenuation: false, fog: false })); stars.layers.set(NOINK); stars.frustumCulled = false; R.add(stars);
  // the one box at the pole (warm glow so it pops) + a few queue props
  buildCardBox(c, cx, 0, cz); c.lamp(cx, 1.0, cz + 0.6, 2.6, 0, [1.0, 0.8, 0.45]); c.lamp(cx, 1.4, cz - 2.2, 3.2, 0, [1.0, 0.7, 0.4]);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), basic(c.signTex("nvb_next", 512, 320, "#ffd23f", "#241726", "NEXT!", "bold 130px sans-serif"))); sign.position.set(cx - 1.5, 1.7, cz + 0.2); R.add(sign);
  bx0(c, cx - 1.5, cz + 0.2);
};
const bx0 = (c: SetCtx, x: number, z: number) => { c.b.add(boxGeo(V(x - 0.03, 0, z - 0.03), V(x + 0.03, 1.45, z + 0.03)), toon("#6a5a3a")); };

// ---------------------------------------------------------------- entry
export const buildB = (c: SetCtx) => {
  buildOffice(c);
  buildConf(c);
  buildStage(c);
  buildWall(c);
  buildDorm(c);
  buildSky(c);
  buildLab(c);
  buildScale(c);
  buildPlanet(c);
};
