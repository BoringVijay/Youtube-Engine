// Section B sets. Only the section-B helper edits this file.
// x=700 "dig": the ice tunnel. Digging crew at z 6..-16 (chalk counter, ice chunks, flying chips),
//               missile rail spur at z -26..-64 (rails + sleepers rebuilt every frame so they bend like spaghetti).
// x=800 "mess": the mess-hall kitchen. Plate of honey on the mess table (puddle rebuilt every frame), toy soldier
//               pushed off the plate, snail doodle, outward arrows, penguin sticker on the icebox (our egg).
// x=900 "glacier": cross-section cutaway of the ice sheet; the dome sags and spreads, the camp tunnels squash.
import * as THREE from "three";
import type { SetCtx } from "../world";
import { lam, boxGeo, quad, V, Strand } from "../../bridge/build";
import { ctex, rep } from "../../bridge/paint";
import { twoTone } from "../../bridge/shade";
import { NOINK } from "../../bridge/ink";

const FPS = 30;
const cl = (x: number) => Math.max(0, Math.min(1, x));
const ss = (a: number, b: number, t: number) => { const x = cl((t - a) / (b - a)); return x * x * (3 - 2 * x); };
/** damped spring 0 -> 1 with overshoot, starting at t0 */
const spring = (t: number, t0: number, k = 9, d = 3.2) => { if (t < t0) return 0; const u = t - t0; return 1 - Math.exp(-d * u) * Math.cos(k * u); };

export const DIG = 700, MESS = 800, GLAC = 900;
/** section-B animation clock, read by shots/b.ts for card positions that must match the animated set pieces */
export const honeyFront = (t: number) => (t < 42.85 ? 0 : t < 44.5 ? 0.062 * ss(42.85, 44.5, t) : 0.062 + 0.07 * cl((t - 44.5) / 3.5));
export const toyX = (t: number) => Math.max(0.098, honeyFront(t) * 1.12 + 0.012); // pushed outward by the honey lobe
export const TOY_FALL = 48.0;

// ---------- painted textures ----------
const chalk = (key: string, n: number) => ctex("chalk" + key, 512, 384, (g, r) => {
  g.fillStyle = "#2f3a34"; g.fillRect(0, 0, 512, 384);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.04})`; g.beginPath(); g.ellipse(r() * 512, r() * 384, 40 + r() * 80, 8 + r() * 20, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "#6b4a2b"; g.lineWidth = 22; g.strokeRect(11, 11, 490, 362);
  g.fillStyle = "#f3efe2"; g.textAlign = "center"; g.font = "bold 44px sans-serif"; g.fillText("TONS OF WALL", 256, 78); g.fillText("THIS MONTH", 256, 124);
  g.font = "bold 150px sans-serif"; g.fillText(String(n), 256, 300);
  g.strokeStyle = "#f3efe2"; g.lineWidth = 6; g.beginPath(); g.moveTo(130, 318); g.lineTo(390, 312); g.stroke();
});
const tally = () => ctex("tallyB", 512, 256, (g, r) => {
  g.clearRect(0, 0, 512, 256); g.strokeStyle = "rgba(40,44,70,0.85)"; g.lineWidth = 7; g.lineCap = "round";
  for (let k = 0; k < 6; k++) {
    const x0 = 20 + k * 82, y0 = 40 + (k % 2) * 90;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x0 + i * 14 + r() * 3, y0); g.lineTo(x0 + i * 14 + r() * 3, y0 + 70); g.stroke(); }
    g.beginPath(); g.moveTo(x0 - 6, y0 + 60); g.lineTo(x0 + 54, y0 + 10); g.stroke();
  }
});
const arrowTex = (key: string, col: string) => ctex("arrowB" + key, 256, 128, (g) => {
  g.clearRect(0, 0, 256, 128); g.lineJoin = "round";
  const path = () => { g.beginPath(); g.moveTo(16, 48); g.lineTo(160, 48); g.lineTo(160, 18); g.lineTo(240, 64); g.lineTo(160, 110); g.lineTo(160, 80); g.lineTo(16, 80); g.closePath(); };
  path(); g.fillStyle = col; g.fill(); g.lineWidth = 10; g.strokeStyle = "#241726"; g.stroke();
});
const snailTex = () => ctex("snailB", 256, 192, (g) => {
  g.clearRect(0, 0, 256, 192); g.lineWidth = 7; g.strokeStyle = "#241726"; g.lineCap = "round";
  g.fillStyle = "#e8d6a8"; g.beginPath(); g.moveTo(20, 160); g.quadraticCurveTo(120, 150, 230, 160); g.lineTo(230, 170); g.lineTo(20, 170); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(200, 160); g.quadraticCurveTo(215, 120, 205, 90); g.stroke(); g.beginPath(); g.moveTo(215, 160); g.quadraticCurveTo(232, 125, 236, 98); g.stroke();
  g.fillStyle = "#241726"; g.beginPath(); g.arc(205, 88, 7, 0, 7); g.arc(237, 95, 7, 0, 7); g.fill();
  g.fillStyle = "#c9824a"; g.beginPath(); g.arc(110, 110, 58, 0, 7); g.fill(); g.stroke();
  g.beginPath(); for (let a = 0; a < 14; a += 0.2) { const rr = 52 - a * 3.6; g.lineTo(110 + Math.cos(a) * rr, 110 + Math.sin(a) * rr); } g.stroke();
});
const strata = () => ctex("strataB", 1024, 512, (g, r) => {
  const bands = ["#f4f8fc", "#e3eef8", "#d2e3f3", "#c2d8ee", "#b0cbe7", "#9ebfe1", "#8cb2da"];
  const hb = 512 / bands.length;
  bands.forEach((c, i) => {
    g.fillStyle = c; g.beginPath(); g.moveTo(0, i * hb);
    for (let x = 0; x <= 1024; x += 32) g.lineTo(x, i * hb + Math.sin(x * 0.012 + i) * 6 + r() * 3);
    g.lineTo(1024, 512); g.lineTo(0, 512); g.closePath(); g.fill();
    g.strokeStyle = "rgba(60,90,140,0.25)"; g.lineWidth = 3; g.stroke();
  });
  for (let i = 0; i < 70; i++) { g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.arc(r() * 1024, r() * 512, 1.5 + r() * 3, 0, 7); g.fill(); }
});
const fakeWindow = () => ctex("floridaB", 384, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#5fb0e8"); gr.addColorStop(0.6, "#bfe4f5"); gr.addColorStop(0.62, "#f2d79a"); gr.addColorStop(1, "#e8c27a");
  g.fillStyle = gr; g.fillRect(0, 0, 384, 512);
  g.fillStyle = "#ffd84a"; g.beginPath(); g.arc(290, 110, 48, 0, 7); g.fill();
  g.strokeStyle = "#6b4a2b"; g.lineWidth = 14; g.beginPath(); g.moveTo(90, 470); g.quadraticCurveTo(110, 360, 80, 250); g.stroke();
  g.fillStyle = "#3f8a4a"; for (let a = 0; a < 6; a++) { g.beginPath(); g.ellipse(80 + Math.cos(a) * 46, 250 + Math.sin(a) * 18, 52, 14, a, 0, 7); g.fill(); }
  g.fillStyle = "#241726"; g.font = "bold 46px sans-serif"; g.textAlign = "center"; g.fillText("SUNNY", 192, 330); g.fillText("FLORIDA", 192, 380);
  g.strokeStyle = "#f6f1e6"; g.lineWidth = 24; g.strokeRect(12, 12, 360, 488); g.beginPath(); g.moveTo(192, 12); g.lineTo(192, 500); g.moveTo(12, 256); g.lineTo(372, 256); g.stroke();
});
const tunnelTex = () => ctex("tunnelsB", 512, 256, (g) => {
  g.clearRect(0, 0, 512, 256);
  const rooms: [number, number, number, number][] = [[40, 90, 130, 46], [190, 80, 150, 56], [370, 96, 110, 40], [100, 160, 300, 36]];
  for (const [x, y, w, h] of rooms) {
    g.fillStyle = "#2b2533"; g.fillRect(x, y, w, h); g.strokeStyle = "#241726"; g.lineWidth = 6; g.strokeRect(x, y, w, h);
    g.fillStyle = "#ffcf7a"; for (let i = 0; i < w / 26; i++) { g.beginPath(); g.arc(x + 14 + i * 26, y + h * 0.4, 4, 0, 7); g.fill(); }
  }
});
const qmark = () => ctex("qmarkB", 256, 320, (g) => {
  g.clearRect(0, 0, 256, 320); g.font = "bold 260px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 16; g.strokeStyle = "#241726"; g.strokeText("?", 128, 168); g.fillStyle = "#ffd23f"; g.fillText("?", 128, 168);
});

const card = (R: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.position.set(x, y, z); m.rotation.y = ry; m.layers.set(NOINK); m.renderOrder = 6; R.add(m); return m;
};

export const buildB = (c: SetCtx) => {
  const { R, b, M, kit } = c;
  const honeyMat = twoTone(new THREE.MeshPhongMaterial({ color: "#f0a018", specular: "#fff2c8", shininess: 90, emissive: "#5a2a00", side: THREE.DoubleSide }), 0.2);
  const glass = twoTone(new THREE.MeshPhongMaterial({ color: "#e9b04a", specular: "#ffffff", shininess: 100, transparent: true, opacity: 0.9 }), 0.2);
  const plateM = twoTone(new THREE.MeshPhongMaterial({ color: "#f6f2ea", specular: "#ffffff", shininess: 70 }), 0.2);
  const railM = twoTone(new THREE.MeshPhongMaterial({ color: "#9aa2ae", specular: "#ffffff", shininess: 80 }), 0.3);
  const sleeperM = M.crate;
  const chunkM = lam("BchunkIce", () => ({ color: "#d8ecfa" }));
  const iceB = lam("BiceWall", () => ({ map: rep(kit.tex.ice_wall, 1, 1) }));

  // ===================== DIG TUNNEL (x=700) =====================
  {
    const ox = DIG, w = 2.6, hw = 3.4, z0 = 10, z1 = -70;
    b.add(quad(V(ox - w, 0, z0), V(ox + w, 0, z0), V(ox + w, 0, z1), V(ox - w, 0, z1), 3, 30), M.snow);
    b.add(quad(V(ox - w, 0, z0), V(ox - w, 0, z1), V(ox - w, hw, z1), V(ox - w, hw, z0), 26, 1.3), iceB);
    b.add(quad(V(ox + w, 0, z1), V(ox + w, 0, z0), V(ox + w, hw, z0), V(ox + w, hw, z1), 26, 1.3), iceB);
    const arcP = (k: number) => { const th = Math.PI * k; return [ox - Math.cos(th) * w, hw - 0.2 + Math.sin(th) * 1.7] as [number, number]; };
    for (let i = 0; i < 16; i++) {
      const [x0, y0] = arcP(i / 16), [x1, y1] = arcP((i + 1) / 16);
      b.add(quad(V(x0, y0, z0), V(x1, y1, z0), V(x1, y1, z1), V(x0, y0, z1), 1, 26), M.steel);
    }
    for (let z = 8; z > z1; z -= 3) { const rib = new THREE.TorusGeometry(w - 0.05, 0.07, 6, 20, Math.PI); rib.scale(1, 1.7 / w, 1); rib.translate(ox, hw - 0.2, z); b.add(rib, M.iron); }
    // string of bulbs down the middle, warm pools
    for (let z = 6; z > z1; z -= 6) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 1.5) }));
      bulb.position.set(ox, hw + 0.9, z); bulb.layers.set(NOINK); R.add(bulb);
      c.lamp(ox, hw + 0.9, z, 1.4, 0);
    }
    b.add(boxGeo(V(ox - 0.01, hw + 0.98, z1), V(ox + 0.01, hw + 1.0, z0)), M.iron); // the wire
    c.wash(ox - w + 0.02, 1.6, -6, 10, 3, Math.PI / 2, 0.35); c.wash(ox + w - 0.02, 1.6, -6, 10, 3, -Math.PI / 2, 0.35);
    // duckboard walkway down the middle of the dig (stops where the rail spur starts)
    for (let z = 9.5; z > -21; z -= 0.42) b.add(boxGeo(V(ox - 0.75, 0, z - 0.3), V(ox + 0.75, 0.06, z)), M.planks);
    for (const dx of [-0.6, 0.6]) b.add(boxGeo(V(ox + dx - 0.05, 0, -21), V(ox + dx + 0.05, 0.04, 9.6)), M.wood);
    // chopped ice: chunk piles along both walls and a loaded sled
    let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 46; i++) {
      const side = i % 2 ? 1 : -1, z = 6 - rnd() * 24, r = 0.12 + rnd() * 0.22;
      const g = new THREE.IcosahedronGeometry(r, 0); g.scale(1, 0.75, 1);
      g.translate(ox + side * (w - 0.35 - rnd() * 0.5), r * 0.6, z); b.add(g, chunkM);
    }
    b.add(boxGeo(V(ox - 0.55, 0.08, -9.2), V(ox + 0.55, 0.32, -7.4)), M.crate); // sled bed
    b.add(boxGeo(V(ox - 0.6, 0, -9.3), V(ox - 0.5, 0.08, -7.2)), M.iron); b.add(boxGeo(V(ox + 0.5, 0, -9.3), V(ox + 0.6, 0.08, -7.2)), M.iron);
    for (let i = 0; i < 9; i++) { const g = new THREE.IcosahedronGeometry(0.2 + rnd() * 0.12, 0); g.translate(ox - 0.35 + (i % 3) * 0.35, 0.45 + Math.floor(i / 3) * 0.12, -8.9 + rnd() * 1.3); b.add(g, chunkM); }
    // chalk counter on an easel by the left wall + tally marks scratched into the ice
    b.add(boxGeo(V(ox - 1.95, 0, -2.35), V(ox - 1.9, 1.35, -2.3)), M.wood); b.add(boxGeo(V(ox - 1.15, 0, -2.35), V(ox - 1.1, 1.35, -2.3)), M.wood);
    const nums = [0, 10, 20, 40, 60, 80, 100, 110, 120].map((n) => chalk(String(n), n));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.71), new THREE.MeshBasicMaterial({ map: nums[0] }));
    board.position.set(ox - 1.52, 1.25, -2.28); board.rotation.y = 0.5; R.add(board);
    card(R, tally(), 1.4, 0.7, ox + w - 0.02, 1.9, -4.5, -Math.PI / 2);
    // shovels and picks leaning on the wall, a coffee can
    for (let i = 0; i < 4; i++) { const g = new THREE.BoxGeometry(0.04, 1.3, 0.04); g.rotateZ(0.25); g.translate(ox + w - 0.25, 0.62, 2 - i * 0.18); b.add(g, M.wood); }
    b.add(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12).translate(ox - 1.3, 0.08, -1.6), M.red);
    // flying ice chips near the diggers: small chunks on looping arcs
    const chips: { m: THREE.Mesh; x: number; z: number; dir: number; ph: number }[] = [];
    const chipG = new THREE.IcosahedronGeometry(0.05, 0);
    const diggers: [number, number, number][] = [[-1, 3.0, 0.0], [1, 1.2, 0.35], [-1, -0.8, 0.7], [1, -3.2, 0.15], [-1, -5.8, 0.5], [1, -8.6, 0.85], [-1, -11.5, 0.3], [1, -14.2, 0.6]];
    for (const [side, z, ph] of diggers) for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(chipG, chunkM); R.add(m); chips.push({ m, x: ox + side * (w - 0.2), z: z + (k - 1) * 0.15, dir: -side, ph: ph + k * 0.33 });
    }
    c.onFrame((f, set) => {
      const t = f / FPS;
      // counter rolls up on "a hundred and twenty tons"
      const k = cl((t - 35.45) / 0.75), idx = Math.min(nums.length - 1, Math.floor(k * (nums.length - 1) + 0.0001));
      (board.material as THREE.MeshBasicMaterial).map = t < 35.45 ? nums[2] : nums[idx];
      if (set !== "dig") return;
      for (const ch of chips) {
        const u = ((t * 1.6 + ch.ph) % 1);
        ch.m.position.set(ch.x + ch.dir * u * 0.8, 1.2 + u * 1.2 - u * u * 2.2, ch.z + Math.sin(ch.ph * 9) * 0.2 * u);
        ch.m.visible = u > 0.05 && u < 0.85; ch.m.rotation.set(u * 9, u * 7, 0);
      }
    });
    // ---- rail spur: two rails + sleepers that bend like spaghetti from "bend" (38.34 s) ----
    const N = 64, ra = -24, rb = -66, gauge = 1.44;
    const rails = [new Strand(N, 0.07, 0.12, railM), new Strand(N, 0.07, 0.12, railM)];
    rails.forEach((r) => R.add(r.mesh));
    const sleepers: THREE.Mesh[] = [];
    for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.22), sleeperM); m.castShadow = true; m.receiveShadow = true; R.add(m); sleepers.push(m); }
    // a covered flatcar at the end of the spur (the secret cargo under a tarp), stuck where the track buckles
    b.add(boxGeo(V(ox - 0.9, 0.3, -60), V(ox + 0.9, 0.5, -53)), M.iron);
    const tarp = new THREE.CylinderGeometry(0.42, 0.42, 6.2, 14, 1, false, 0, Math.PI); tarp.rotateX(Math.PI / 2); tarp.rotateZ(Math.PI / 2 * 0); tarp.translate(ox, 0.5, -56.5);
    b.add(tarp, M.olive);
    for (const zz of [-54, -59]) for (const s2 of [-1, 1]) b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12).rotateZ(Math.PI / 2).translate(ox + s2 * 0.72, 0.24, zz), M.iron);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.4), new THREE.MeshBasicMaterial({ map: c.signTex("speedB", 768, 236, "#f6f1e6", "#b8403a", "SPEED LIMIT 5", "bold 84px sans-serif") }));
    sign.position.set(ox - w + 0.03, 2.1, -31); sign.rotation.y = Math.PI / 2; sign.rotation.z = 0.12; R.add(sign);
    const bendAt = (z: number, t: number) => {
      const A = 0.55 * spring(t, 38.3, 10, 2.6), u = cl((ra - z) / (ra - rb));
      const env = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 1.2;
      return { dx: A * env * Math.sin(u * 13.0 + 0.6), dy: A * 0.35 * env * Math.max(0, Math.sin(u * 9.0 + 1.3)) };
    };
    const pts = [Array.from({ length: N }, () => new THREE.Vector3()), Array.from({ length: N }, () => new THREE.Vector3())];
    const pose = (t: number) => {
      for (let i = 0; i < N; i++) {
        const z = ra + (rb - ra) * (i / (N - 1)), { dx, dy } = bendAt(z, t);
        pts[0][i].set(ox - gauge / 2 + dx, 0.16 + dy, z); pts[1][i].set(ox + gauge / 2 + dx * 1.15, 0.16 + dy * 0.8, z);
      }
      rails[0].set(pts[0]); rails[1].set(pts[1]);
      sleepers.forEach((m, i) => {
        const z = ra - 0.6 - i * 1.4, a = bendAt(z, t), a2 = bendAt(z - 0.3, t);
        m.position.set(ox + a.dx, 0.05 + a.dy * 0.6, z); m.rotation.set(0, Math.atan2(a2.dx - a.dx, 0.3) * 0.6, a.dy * 0.3);
      });
    };
    pose(0);
    // the "?" that pops over Hank on "How does solid ice move?"
    const q = card(R, qmark(), 0.3, 0.375, ox + 0.62, 1.95, -26.9);
    c.onFrame((f, set) => {
      const t = f / FPS; if (set !== "dig") return; pose(t);
      const v = spring(t, 40.6, 14, 6) * (1 - ss(42.3, 42.45, t));
      q.visible = v > 0.01; q.scale.setScalar(Math.max(0.01, v)); q.rotation.z = 0.15 * Math.sin(t * 5);
    });
  }

  // ===================== MESS KITCHEN (x=800) =====================
  {
    const ox = MESS, W = 3.2, D0 = 3.5, D1 = -2.2, H = 2.9;
    const messW = lam("BmessWall", () => ({ map: rep(kit.tex.mess_wall, 1, 1) }));
    b.add(quad(V(ox - W, 0, D0), V(ox + W, 0, D0), V(ox + W, 0, D1), V(ox - W, 0, D1), 3, 3), M.planks);
    b.add(quad(V(ox - W, 0, D1), V(ox + W, 0, D1), V(ox + W, H, D1), V(ox - W, H, D1), 2.2, 1), messW);
    b.add(quad(V(ox - W, 0, D0), V(ox - W, 0, D1), V(ox - W, H, D1), V(ox - W, H, D0), 2, 1), messW);
    b.add(quad(V(ox + W, 0, D1), V(ox + W, 0, D0), V(ox + W, H, D0), V(ox + W, H, D1), 2, 1), messW);
    b.add(quad(V(ox - W, H, D1), V(ox + W, H, D1), V(ox + W, H, D0), V(ox - W, H, D0), 1, 4), M.steel);
    placeTable(c, ox, -0.2);
    // the plate (rim + well), honey jar, toy soldier, salt shaker, spoon, bread
    const TY = TABLE_TOP, px = ox, pz = -0.15;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.11, 0.018, 40), plateM); plate.position.set(px, TY + 0.009, pz); plate.castShadow = true; plate.receiveShadow = true; R.add(plate);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.007, 6, 40), plateM); rim.rotation.x = Math.PI / 2; rim.position.set(px, TY + 0.02, pz); R.add(rim);
    b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.09, 12).translate(px - 0.32, TY + 0.045, pz + 0.12), M.cream); // salt
    b.add(new THREE.CylinderGeometry(0.026, 0.026, 0.08, 12).translate(px - 0.27, TY + 0.04, pz + 0.2), M.iron); // pepper
    b.add(boxGeo(V(px + 0.26, TY, pz - 0.05), V(px + 0.5, TY + 0.07, pz + 0.12)), lam("Bbread", () => ({ color: "#d9a35a" })));
    b.add(boxGeo(V(px - 0.5, TY, pz - 0.1), V(px - 0.4, TY + 0.11, pz)), M.red); // ketchup-ish can
    // honey puddle: a slightly domed disc with a wobbly creeping edge, rebuilt each frame
    const SEG = 56, puddle = new THREE.BufferGeometry(), pos = new Float32Array((SEG + 1) * 2 * 3 + 3);
    const idx: number[] = [];
    for (let i = 0; i < SEG; i++) { const a = 1 + i * 2, bb = 1 + ((i + 1) % SEG) * 2; idx.push(0, a, bb, a, a + 1, bb + 1, a, bb + 1, bb); }
    puddle.setAttribute("position", new THREE.BufferAttribute(pos, 3)); puddle.setIndex(idx);
    const honey = new THREE.Mesh(puddle, honeyMat); honey.position.set(px, TY + 0.02, pz); honey.frustumCulled = false; honey.castShadow = false; honey.receiveShadow = true; R.add(honey);
    // jar + falling stream
    const jar = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.16, 20), glass); jar.add(body);
    const lidless = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.008, 6, 20), M.cream); lidless.rotation.x = Math.PI / 2; lidless.position.y = 0.082; jar.add(lidless);
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.0655, 0.0655, 0.07, 20, 1, true), new THREE.MeshBasicMaterial({ map: c.signTex("honeyLab", 512, 128, "#f6e7b8", "#6b3a12", "HONEY", "bold 80px sans-serif") }));
    jar.add(lab); R.add(jar);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 1, 8), honeyMat); R.add(stream);
    // toy soldier on the rim: little painted tin figure (body, head, helmet, base)
    const toy = new THREE.Group();
    const tin = lam("BtinOlive", () => ({ color: "#5f6a3a" })), tinSkin = lam("BtinSkin", () => ({ color: "#f0c9a0" }));
    toy.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.004, 12), tin));
    const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.035, 10), tin); tb.position.y = 0.02; toy.add(tb);
    const th = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), tinSkin); th.position.y = 0.044; toy.add(th);
    const tht = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), tin); tht.position.y = 0.047; toy.add(tht);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.035, 0.003), M.iron); gun.position.set(0.01, 0.03, 0); gun.rotation.z = 0.3; toy.add(gun);
    toy.traverse((o) => { o.castShadow = true; }); R.add(toy);
    // explainer overlays: outward arrows around the puddle, a snail doodle racing it on the table
    const arrowT = arrowTex("honey", "#ffd23f");
    const arrows = [0, 1, 2, 3, 4, 5].map((i) => { const m = card(R, arrowT, 0.07, 0.035, 0, 0, 0); m.rotation.x = -Math.PI / 2; m.userData.a = (i / 6) * Math.PI * 2 + 0.3; return m; });
    const pushArrow = card(R, arrowTex("push", "#ff6a3d"), 0.1, 0.05, 0, 0, 0); pushArrow.rotation.x = -Math.PI / 2;
    const snail = card(R, snailTex(), 0.09, 0.0675, 0, 0, 0);
    const front = (a: number, t: number) => {
      const base = honeyFront(t), lobe = Math.max(0, Math.cos(a)) ** 3 * 0.03 * cl((t - 44.5) / 3.5);
      return base > 0 ? base * (1 + 0.07 * Math.sin(a * 5 + 1.3) + 0.05 * Math.sin(a * 3 - t * 0.6)) + lobe : 0;
    };
    const poseHoney = (t: number) => {
      pos[0] = 0; pos[1] = front(0, t) > 0 ? 0.012 : 0; pos[2] = 0;
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * Math.PI * 2, r = Math.min(0.128, front(a, t)), ca = Math.cos(a), sa = Math.sin(a), j = 1 + i * 2;
        pos[j * 3] = ca * r * 0.82; pos[j * 3 + 1] = r > 0 ? 0.009 : 0; pos[j * 3 + 2] = sa * r * 0.82;
        pos[(j + 1) * 3] = ca * r; pos[(j + 1) * 3 + 1] = 0.001; pos[(j + 1) * 3 + 2] = sa * r;
      }
      puddle.attributes.position.needsUpdate = true; puddle.computeVertexNormals(); honey.visible = honeyFront(t) > 0.002;
      // jar: tilts in 42.5-42.85, pours until 44.4, then lifts away
      const tilt = ss(42.45, 42.85, t) * (1 - ss(44.3, 44.7, t)), lift = ss(44.4, 45.0, t);
      jar.position.set(px - 0.06 + tilt * 0.02, TY + 0.36 + lift * 0.5, pz - 0.02); jar.rotation.set(0, 0, -tilt * 1.9);
      jar.visible = t < 45.2;
      const pouring = t > 42.75 && t < 44.4;
      stream.visible = pouring;
      if (pouring) { const top = TY + 0.33, bot = TY + 0.025; stream.scale.set(1, top - bot, 1); stream.position.set(px - 0.0, (top + bot) / 2, pz); stream.rotation.set(0, 0, 0); }
      // toy: walked outward by the lobe, tips over the rim at TOY_FALL and drops to the table
      const tx = toyX(t);
      const fall = cl((t - TOY_FALL) / 0.35), land = fall >= 1;
      toy.position.set(px + Math.min(tx, 0.13) + fall * 0.05, TY + 0.02 - fall * fall * 0.02 + (land ? 0 : 0), pz);
      toy.rotation.set(0, 0, -fall * Math.PI / 2 * 0.98);
      // arrows pulse outward with the front while it creeps
      const show = ss(44.6, 44.9, t) * (1 - ss(48.3, 48.7, t));
      arrows.forEach((m) => { const a = m.userData.a as number, r = front(a, t) + 0.025 + 0.012 * ((t * 1.2) % 1);
        m.position.set(px + Math.cos(a) * r, TY + 0.03, pz + Math.sin(a) * r); m.rotation.set(-Math.PI / 2, 0, -a); m.visible = show > 0.01; m.scale.setScalar(Math.max(0.01, show)); });
      const pv = ss(47.0, 47.25, t) * (1 - ss(48.1, 48.4, t));
      pushArrow.visible = pv > 0.01; pushArrow.scale.setScalar(Math.max(0.01, pv)); pushArrow.position.set(px + front(0, t) - 0.03, TY + 0.035, pz); pushArrow.rotation.set(-Math.PI / 2, 0, 0);
      // snail: overtakes the honey on "too slow to see"
      const sv = ss(45.9, 46.1, t) * (1 - ss(47.0, 47.2, t));
      snail.visible = sv > 0.01; snail.position.set(px - 0.17 + (t - 45.9) * 0.05, TY + 0.034, pz + 0.07); snail.scale.setScalar(Math.max(0.01, sv));
    };
    poseHoney(0);
    c.onFrame((f, set) => { if (set === "mess") poseHoney(f / FPS); });
    // kitchen: stove with glowing burners, pots, shelves of cans, icebox with our penguin sticker, the "window"
    b.add(boxGeo(V(ox + 1.6, 0, D1 + 0.02), V(ox + 2.9, 0.9, D1 + 0.75)), M.iron);
    for (const dx of [1.9, 2.55]) { const bu = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.9, 0.3) })); bu.rotation.x = -Math.PI / 2; bu.position.set(ox + dx, 0.905, D1 + 0.4); bu.layers.set(NOINK); R.add(bu); }
    b.add(new THREE.CylinderGeometry(0.2, 0.18, 0.3, 18).translate(ox + 1.9, 1.05, D1 + 0.4), M.chrome);
    c.lamp(ox + 2.2, 1.0, D1 + 0.5, 0.9, 0.9, [1.0, 0.45, 0.18]);
    for (let s2 = 0; s2 < 2; s2++) {
      const y = 1.45 + s2 * 0.45;
      b.add(boxGeo(V(ox - 2.9, y, D1 + 0.02), V(ox - 0.9, y + 0.04, D1 + 0.32)), M.wood);
      for (let i = 0; i < 9; i++) b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10).translate(ox - 2.75 + i * 0.22, y + 0.12, D1 + 0.17), [M.red, M.cream, M.olive][(i + s2) % 3]);
    }
    for (let i = 0; i < 5; i++) b.add(new THREE.CylinderGeometry(0.05, 0.055, 0.13, 14).translate(ox - 2.7 + i * 0.16, 1.03 + 0.065 + 0.42, D1 + 0.22), glass); // honey jar row (on shelf 1)
    b.add(boxGeo(V(ox - 3.15, 0, D1 + 0.9), V(ox - 2.35, 1.8, D1 + 1.6)), M.cream); // icebox
    b.add(boxGeo(V(ox - 2.37, 0.9, D1 + 1.1), V(ox - 2.33, 1.4, D1 + 1.15)), M.chrome);
    const peng = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), new THREE.MeshBasicMaterial({ map: c.penguinSticker(), transparent: true }));
    peng.position.set(ox - 2.34, 1.35, D1 + 1.35); peng.rotation.y = Math.PI / 2; R.add(peng);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.0), new THREE.MeshBasicMaterial({ map: fakeWindow() }));
    win.position.set(ox + 0.4, 1.75, D1 + 0.02); R.add(win);
    for (let i = 0; i < 3; i++) { const pan = new THREE.CylinderGeometry(0.14 - i * 0.02, 0.14 - i * 0.02, 0.05, 16); pan.rotateX(Math.PI / 2); pan.translate(ox + 1.7 + i * 0.4, 2.15, D1 + 0.05); b.add(pan, M.chrome); }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 1.5) }));
    bulb.position.set(ox, 2.5, 0); bulb.layers.set(NOINK); R.add(bulb); c.lamp(ox, 2.5, 0, 1.5, 0); c.wash(ox, 1.4, D1 + 0.03, 6, 3, 0, 0.5);
  }

  // ===================== GLACIER CROSS-SECTION (x=900) =====================
  {
    const ox = GLAC, D = 5, z0 = 0;
    // snowfield + rock bed under the cut
    const snowA = lam("BsnowArctic", () => ({ color: "#eef4fa" }));
    // the cut: ice sheet surface behind z0, the cut face drops through rock to a lower snowfield in front (a diorama slab)
    b.add(quad(V(ox - 60, 0, z0), V(ox + 60, 0, z0), V(ox + 60, 0, -80), V(ox - 60, 0, -80), 20, 20), snowA);
    b.add(quad(V(ox - 60, -2.2, 40), V(ox + 60, -2.2, 40), V(ox + 60, -2.2, z0), V(ox - 60, -2.2, z0), 20, 6), snowA);
    const rock = lam("Brock", () => ({ color: "#6e5a52" }));
    const rockFace = lam("BrockFace", () => ({ color: "#7d665a" }));
    b.add(quad(V(ox - 60, -2.2, z0), V(ox + 60, -2.2, z0), V(ox + 60, 0, z0), V(ox - 60, 0, z0), 30, 1), rockFace);
    const sheetM = new THREE.MeshLambertMaterial({ map: strata() }); twoTone(sheetM, 0.6);
    for (const s2 of [-1, 1]) b.add(quad(V(ox + s2 * 14, 0, z0), V(ox + s2 * 60, 0, z0), V(ox + s2 * 60, 0.6, z0), V(ox + s2 * 14, 0.6, z0), 4, 0.1), sheetM); // thin ice beyond the dome
    const strataM = new THREE.MeshLambertMaterial({ map: strata() }); twoTone(strataM, 0.6);
    const topM = lam("BglacTop", () => ({ map: rep(kit.tex.snow_floor, 1, 1), color: "#f7fbff" }));
    // dome profile: height h(x) = Hc * (1 - (x/Wd)^2)^0.6, area held ~constant while it sags and spreads
    const NS = 48;
    const front = new THREE.BufferGeometry(), top = new THREE.BufferGeometry();
    const fp = new Float32Array(NS * 6 * 3), fuv = new Float32Array(NS * 6 * 2), tp = new Float32Array(NS * 6 * 3), tuv = new Float32Array(NS * 6 * 2);
    front.setAttribute("position", new THREE.BufferAttribute(fp, 3)); front.setAttribute("uv", new THREE.BufferAttribute(fuv, 2));
    top.setAttribute("position", new THREE.BufferAttribute(tp, 3)); top.setAttribute("uv", new THREE.BufferAttribute(tuv, 2));
    const fm = new THREE.Mesh(front, strataM), tm = new THREE.Mesh(top, topM);
    for (const m of [fm, tm]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; R.add(m); }
    strataM.side = THREE.DoubleSide; (topM as THREE.Material).side = THREE.DoubleSide;
    const tunnels = card(R, tunnelTex(), 6, 3, ox, 1.3, z0 + 0.03);
    tunnels.renderOrder = 7;
    const arrowT = arrowTex("glac", "#ffd23f");
    const aDown = card(R, arrowT, 2.4, 1.2, ox, 6, z0 + 0.06); aDown.rotation.z = -Math.PI / 2;
    const aL = card(R, arrowT, 2.2, 1.1, ox - 6, 1.2, z0 + 0.06); aL.rotation.z = Math.PI;
    const aR = card(R, arrowT, 2.2, 1.1, ox + 6, 1.2, z0 + 0.06);
    // a tiny survey flag on the summit rides the surface down as the dome sags
    const flag = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), M.iron); pole.position.y = 0.7; flag.add(pole);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42), new THREE.MeshBasicMaterial({ map: c.signTex("flagB", 256, 160, "#d8443a", "#f6f1e6", "", "bold 10px sans-serif"), side: THREE.DoubleSide }));
    cloth.position.set(0.37, 1.18, 0); flag.add(cloth); R.add(flag);
    const shape = (t: number) => {
      const k = ss(48.9, 51.0, t), Hc = 6.4 - 1.9 * k, Wd = 7.5 + 3.6 * k;
      return { k, Hc, Wd, h: (x: number) => Math.max(0, Hc * Math.pow(Math.max(0, 1 - (x / Wd) ** 2), 0.6)) };
    };
    const poseGlacier = (t: number) => {
      const { k, Wd, Hc, h } = shape(t);
      let o = 0, u = 0;
      for (let i = 0; i < NS; i++) {
        const xa = -Wd + (2 * Wd * i) / NS, xb = -Wd + (2 * Wd * (i + 1)) / NS, ha = h(xa), hb = h(xb);
        const quadF = [[xa, 0], [xb, 0], [xb, hb], [xa, 0], [xb, hb], [xa, ha]];
        for (const [x, y] of quadF) { fp[o] = ox + x; fp[o + 1] = y; fp[o + 2] = z0; fuv[u] = (x + 14) / 28; fuv[u + 1] = y / 7; o += 3; u += 2; }
      }
      o = 0; u = 0;
      for (let i = 0; i < NS; i++) {
        const xa = -Wd + (2 * Wd * i) / NS, xb = -Wd + (2 * Wd * (i + 1)) / NS, ha = h(xa), hb = h(xb);
        const q = [[xa, ha, z0], [xb, hb, z0], [xb, hb, z0 - D], [xa, ha, z0], [xb, hb, z0 - D], [xa, ha, z0 - D]];
        for (const [x, y, z] of q) { tp[o] = ox + x; tp[o + 1] = y; tp[o + 2] = z; tuv[u] = x / 3; tuv[u + 1] = z / 3; o += 3; u += 2; }
      }
      front.attributes.position.needsUpdate = true; front.attributes.uv.needsUpdate = true; front.computeVertexNormals();
      top.attributes.position.needsUpdate = true; top.attributes.uv.needsUpdate = true; top.computeVertexNormals();
      tunnels.scale.set(1 + 0.25 * k, 1 - 0.45 * k, 1); tunnels.position.y = 1.3 - 0.35 * k;
      flag.position.set(ox, Hc - 0.05, z0 - 2.5);
      const ap = (t * 1.4) % 1, av = ss(48.85, 49.1, t);
      aDown.position.set(ox, Hc + 1.4 - ap * 0.6, z0 + 0.06); aDown.scale.setScalar(Math.max(0.01, av));
      aL.position.set(ox - Wd * 0.62 - ap * 0.7, 1.0, z0 + 0.06); aR.position.set(ox + Wd * 0.62 + ap * 0.7, 1.0, z0 + 0.06);
      const sv = ss(49.8, 50.05, t); aL.scale.setScalar(Math.max(0.01, sv)); aR.scale.setScalar(Math.max(0.01, sv));
    };
    poseGlacier(0);
    c.onFrame((f, set) => { if (set === "glacier") poseGlacier(f / FPS); });
    // far ice sheet + nunataks for depth
    for (const [dx, dz, s2] of [[-30, -45, 9], [26, -60, 12], [-8, -75, 7]] as [number, number, number][]) {
      const g = new THREE.ConeGeometry(s2, s2 * 0.9, 5); g.translate(ox + dx, s2 * 0.45 - 0.5, dz); b.add(g, rock);
    }
  }
};

// mess table prop (generated hero mesh): 0.78 m tall; its top is where the plate sits
export const TABLE_TOP = 0.78;
const placeTable = (c: SetCtx, x: number, z: number) => c.placeProp(c.kit, "mess_table", c.R, x, 0, z, TABLE_TOP, 0);
