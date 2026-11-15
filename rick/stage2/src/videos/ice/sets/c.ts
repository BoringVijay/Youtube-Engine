// Section C sets. Only the section-C helper edits this file.
// 1000: 1966 surface (crane, reactor, hatch, convoy, snow, burial mound)   1100: abandoned tunnel (fuel, sewage, glowing water)
// 1200: lab (scientist, printout, chalkboard) + 1230: glacier cross-section diorama   1300: 2090 surface (slush, puddles, the spit-out)
import * as THREE from "three";
import type { SetCtx } from "../world";
import { lam, boxGeo, quad, V } from "../../bridge/build";
import { ctex, rep } from "../../bridge/paint";
import { NOINK } from "../../bridge/ink";

const FPS = 30, sec = (t: number) => Math.round(t * FPS);
const cl = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const u = cl(x); return u * u * (3 - 2 * u); };
/** shared with shots/c.ts: where things are */
export const C = {
  hatch: [1000, 0, -6] as const, reactor: [999.0, 0, -2.6] as const,
  tunnel: 1100, lab: 1200, xs: 1230, s2090: 1300,
};

const mat = (key: string, p: THREE.MeshLambertMaterialParameters) => { const m = lam("c_" + key, () => p); m.side = THREE.DoubleSide; return m; };
const glow = (r: number, g: number, b: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: true });
const cyl = (r: number, h: number, x: number, y: number, z: number, seg = 18) => new THREE.CylinderGeometry(r, r, h, seg, 1).translate(x, y + h / 2, z);

/** stencil label: transparent canvas, chunky letters (our own) */
const stencil = (key: string, text: string, fg = "#1d1a1a", w = 512, h = 160, px = 92) => ctex("cst_" + key, w, h, (g) => {
  g.clearRect(0, 0, w, h); g.fillStyle = fg; g.font = `900 ${px}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4);
});
const card = (R: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, lit = true) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit ? mat("card_" + tex.uuid, { map: tex, transparent: true, alphaTest: 0.3 }) : new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.position.set(x, y, z); m.rotation.y = ry; R.add(m); return m;
};

/** our penguin, full body, standing, looking lost (original design: round body, big eyes, one feather tuft, "?" above) */
export const lostPenguin = () => ctex("c_lostPenguin", 512, 768, (g) => {
  g.clearRect(0, 0, 512, 768);
  const ink = "#241726"; g.lineWidth = 14; g.strokeStyle = ink; g.lineJoin = "round";
  // feet
  g.fillStyle = "#f2a33a"; for (const x of [196, 316]) { g.beginPath(); g.ellipse(x, 712, 52, 22, 0, 0, 7); g.fill(); g.stroke(); }
  // body
  g.fillStyle = "#1d2433"; g.beginPath(); g.ellipse(256, 470, 170, 240, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#f6f1e6"; g.beginPath(); g.ellipse(256, 510, 112, 182, 0, 0, 7); g.fill();
  // flippers, one raised in a shrug
  g.fillStyle = "#1d2433";
  g.beginPath(); g.moveTo(96, 420); g.quadraticCurveTo(30, 520, 70, 600); g.quadraticCurveTo(110, 520, 118, 470); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(416, 400); g.quadraticCurveTo(500, 330, 490, 280); g.quadraticCurveTo(440, 330, 400, 360); g.closePath(); g.fill(); g.stroke();
  // eyes (looking up-left, lost), brows worried
  g.fillStyle = "#ffffff"; for (const x of [212, 300]) { g.beginPath(); g.arc(x, 340, 40, 0, 7); g.fill(); g.stroke(); }
  g.fillStyle = ink; for (const x of [200, 288]) { g.beginPath(); g.arc(x, 330, 15, 0, 7); g.fill(); }
  g.lineWidth = 10; g.beginPath(); g.moveTo(178, 282); g.lineTo(236, 296); g.moveTo(276, 296); g.lineTo(334, 282); g.stroke();
  // beak
  g.fillStyle = "#f2a33a"; g.lineWidth = 10; g.beginPath(); g.moveTo(228, 392); g.lineTo(284, 392); g.lineTo(256, 428); g.closePath(); g.fill(); g.stroke();
  // tuft
  g.beginPath(); g.moveTo(256, 236); g.quadraticCurveTo(240, 180, 270, 160); g.stroke();
  // "?"
  g.fillStyle = "#ffffff"; g.strokeStyle = ink; g.lineWidth = 12; g.font = "900 150px sans-serif"; g.textAlign = "center";
  g.strokeText("?", 400, 190); g.fillText("?", 400, 190);
});

/** wavy paper printout with rows of numbers */
const printoutTex = () => ctex("c_printout", 256, 2048, (g) => {
  g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, 256, 2048);
  g.fillStyle = "#d8e6d0"; for (let y = 0; y < 2048; y += 64) g.fillRect(0, y, 256, 32);
  g.fillStyle = "#3a3a4a"; g.font = "bold 22px monospace";
  let v = 41.2;
  for (let y = 22; y < 2048; y += 32) { v -= 0.37 + ((y * 7) % 5) * 0.03; g.fillText(`${1966 + Math.floor(y / 16)}   ${v.toFixed(1)} m`, 20, y); }
  g.fillStyle = "#c8443b"; g.font = "900 40px sans-serif"; g.fillText("2090 !!", 40, 2020);
});
/** chalkboard: ice thickness over the camp, falling off a cliff at 2090 */
const chalkTex = () => ctex("c_chalk", 1024, 640, (g) => {
  g.fillStyle = "#2f4a3c"; g.fillRect(0, 0, 1024, 640);
  g.strokeStyle = "#7a5a34"; g.lineWidth = 28; g.strokeRect(14, 14, 996, 612);
  g.strokeStyle = "#f1eee4"; g.lineWidth = 7; g.lineCap = "round";
  g.beginPath(); g.moveTo(110, 90); g.lineTo(110, 540); g.lineTo(940, 540); g.stroke();
  g.beginPath(); g.moveTo(130, 160); g.bezierCurveTo(420, 150, 640, 190, 740, 260); g.bezierCurveTo(800, 330, 830, 470, 850, 530); g.stroke();
  g.fillStyle = "#f1eee4"; g.font = "bold 40px sans-serif"; g.fillText("ICE ABOVE CAMP", 150, 80); g.fillText("1966", 110, 590); g.fillText("2090", 800, 590);
  g.strokeStyle = "#f2d23a"; g.lineWidth = 9; g.beginPath(); g.arc(850, 520, 46, 0, 7); g.stroke();
  g.fillStyle = "#f2d23a"; g.font = "900 64px sans-serif"; g.fillText("?!", 900, 440);
});
/** yearly layers for the cross-section face */
const strataTex = () => ctex("c_strata", 1024, 1024, (g) => {
  g.fillStyle = "#cfe3f2"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 18) { g.fillStyle = y % 72 === 0 ? "#a9c9e4" : "#bcd6ec"; g.fillRect(0, y, 1024, 6 + (y % 3)); }
  g.strokeStyle = "rgba(90,130,170,0.35)"; g.lineWidth = 3;
  for (let i = 0; i < 26; i++) { const x = (i * 397) % 1024, y = (i * 211) % 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 60, y + 30); g.lineTo(x + 90, y + 10); g.stroke(); }
});

export const buildC = (c: SetCtx) => {
  const { R, b, M, kit } = c;
  const yellow = mat("yellow", { color: "#e3a62c" }), dark = mat("dark", { color: "#1c1820" }), rust = mat("rust", { color: "#9a5a34" });
  const drumOl = mat("drumOl", { color: "#6b7046" }), drumY = mat("drumY", { color: "#d9b13a" }), drumR = mat("drumR", { color: "#b8403a" });
  const sewage = mat("sewage", { color: "#7a6a4a" }), slush = mat("slush", { map: rep(kit.tex.snow_floor, 6, 6), color: "#d6d0c4" });
  const snowBig = mat("snowBig", { map: rep(kit.tex.snow_floor, 10, 10), color: "#fbf6ee" });
  const puddle = mat("puddle", { color: "#5f8fbf" }), bed = mat("bed", { color: "#4a4046" }), stratM = mat("strata", { map: strataTex(), color: "#b9d2ea" });
  const frames: ((f: number, set: string) => void)[] = [];

  // ---------- helpers ----------
  const drum = (x: number, y: number, z: number, m: THREE.Material, label?: THREE.Texture, ry = 0) => {
    b.add(cyl(0.3, 0.88, x, y, z), m);
    b.add(cyl(0.31, 0.04, x, y + 0.28, z), M.iron); b.add(cyl(0.31, 0.04, x, y + 0.6, z), M.iron);
    if (label) card(R, label, 0.5, 0.16, x + Math.sin(ry) * 0.31, y + 0.45, z + Math.cos(ry) * 0.31, ry);
  };
  const tractor = (g: THREE.Group) => { // yellow tracked tug + flatbed sled; built in a group so it can drive
    const add = (geo: THREE.BufferGeometry, m: THREE.Material) => { const me = new THREE.Mesh(geo, m); me.castShadow = me.receiveShadow = true; g.add(me); return me; };
    add(boxGeo(V(-0.9, 0.35, -1.3), V(0.9, 1.2, 1.1)), yellow);
    add(boxGeo(V(-0.7, 1.2, -0.2), V(0.7, 2.1, 1.0)), yellow);
    add(boxGeo(V(-0.6, 1.4, 1.0), V(0.6, 1.95, 1.02)), mat("glass", { color: "#9fc4e6" }));
    for (const s of [-1, 1]) add(boxGeo(V(s * 0.95 - 0.25, 0, -1.4), V(s * 0.95 + 0.25, 0.6, 1.2)), dark);
    add(cyl(0.07, 0.8, -0.5, 1.2, -0.9, 8), M.iron);
    add(boxGeo(V(-0.05, 0.4, -2.6), V(0.05, 0.5, -1.3)), M.iron); // tow bar
    add(boxGeo(V(-1.2, 0.25, -6.6), V(1.2, 0.45, -2.6)), M.crate); // sled bed
    for (const s of [-1, 1]) add(boxGeo(V(s * 1.1 - 0.08, 0, -6.8), V(s * 1.1 + 0.08, 0.25, -2.4)), M.iron);
    return g;
  };
  const reactorVessel = (g: THREE.Group) => {
    const add = (geo: THREE.BufferGeometry, m: THREE.Material) => { const me = new THREE.Mesh(geo, m); me.castShadow = me.receiveShadow = true; g.add(me); return me; };
    add(new THREE.CylinderGeometry(0.75, 0.75, 2.0, 24).translate(0, 1.0, 0), M.steel);
    add(new THREE.SphereGeometry(0.75, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.0, 0), M.steel);
    add(new THREE.CylinderGeometry(0.77, 0.77, 0.28, 24).translate(0, 1.15, 0), yellow);
    add(boxGeo(V(-0.06, 2.7, -0.06), V(0.06, 2.95, 0.06)), M.iron);
    const tre = ctex("c_trefoil", 256, 256, (g2) => {
      g2.clearRect(0, 0, 256, 256); g2.fillStyle = "#f2d23a"; g2.beginPath(); g2.arc(128, 128, 120, 0, 7); g2.fill();
      g2.fillStyle = "#1d1a1a"; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 3); g2.beginPath(); g2.moveTo(128, 128); g2.arc(128, 128, 100, a - 0.5, a + 0.5); g2.closePath(); g2.fill(); }
      g2.fillStyle = "#f2d23a"; g2.beginPath(); g2.arc(128, 128, 26, 0, 7); g2.fill(); g2.fillStyle = "#1d1a1a"; g2.beginPath(); g2.arc(128, 128, 16, 0, 7); g2.fill();
    });
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), mat("tref", { map: tre, transparent: true, alphaTest: 0.3 })); t.position.set(0, 1.55, 0.77); g.add(t);
    return g;
  };
  const snowfall = (n: number, w: number, h: number) => {
    const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.sin(i * 12.9898) * 43758.5453 % 1) * w; pos[i * 3 + 1] = Math.abs(Math.sin(i * 78.233) * 9631.1 % 1) * h; pos[i * 3 + 2] = (Math.sin(i * 39.34) * 2741.7 % 1) * w; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const flake = ctex("c_flake", 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.09, map: flake, transparent: true, depthWrite: false, color: "#ffffff" }));
    p.layers.set(NOINK); p.frustumCulled = false; R.add(p); return p;
  };

  // ================= 1000: the 1966 surface =================
  {
    const ox = 1000;
    b.add(quad(V(ox - 40, 0, 40), V(ox + 40, 0, 40), V(ox + 40, 0, -40), V(ox - 40, 0, -40), 1, 1), snowBig);
    // drift ridges toward the horizon
    for (let i = 0; i < 9; i++) b.add(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(6 + i % 3 * 3, 0.5 + (i % 2) * 0.4, 2.5).translate(ox - 30 + i * 8, 0, -22 - (i % 4) * 4), M.snow);
    // hatch shed (the way down), trench walls, "CAMP CENTURY" board
    const [hx, , hz] = C.hatch;
    b.add(boxGeo(V(hx - 1.8, 0, hz - 1.6), V(hx + 1.8, 2.6, hz + 0.6)), M.wood);
    b.add(boxGeo(V(hx - 1.95, 2.6, hz - 1.75), V(hx + 1.95, 2.8, hz + 0.75)), M.cream);
    b.add(boxGeo(V(hx - 0.8, 0, hz + 0.6), V(hx + 0.8, 2.0, hz + 0.62)), dark);
    card(R, c.signTex("c_ccBoard", 768, 192, "#f6f1e6", "#241726", "CAMP CENTURY", "bold 92px sans-serif"), 2.2, 0.55, hx, 2.25, hz + 0.64);
    // reactor pit (dark square the vessel comes out of)
    const [rx, , rz] = C.reactor;
    b.add(quad(V(rx - 1.1, 0.02, rz + 1.1), V(rx + 1.1, 0.02, rz + 1.1), V(rx + 1.1, 0.02, rz - 1.1), V(rx - 1.1, 0.02, rz - 1.1)), dark);
    for (const z0 of [rz - 1.3, rz + 1.1]) b.add(boxGeo(V(rx - 1.3, 0, z0), V(rx + 1.3, 0.18, z0 + 0.2)), yellow);
    // crane: mast, boom, counterweight, cab
    const mx = rx + 3.4;
    b.add(boxGeo(V(mx - 0.22, 0, rz - 0.22), V(mx + 0.22, 7.2, rz + 0.22)), yellow);
    for (let y = 0.6; y < 7; y += 0.7) b.add(boxGeo(V(mx - 0.26, y, rz - 0.26), V(mx + 0.26, y + 0.08, rz + 0.26)), M.iron);
    b.add(boxGeo(V(rx - 0.3, 7.2, rz - 0.16), V(mx + 1.6, 7.5, rz + 0.16)), yellow);
    b.add(boxGeo(V(mx + 0.6, 6.6, rz - 0.4), V(mx + 1.6, 7.2, rz + 0.4)), M.iron);
    b.add(boxGeo(V(mx - 0.9, 0, rz - 1.2), V(mx + 0.9, 1.6, rz + 1.2)), yellow);
    b.add(boxGeo(V(mx - 1.0, 0, rz - 1.3), V(mx + 1.0, 0.45, rz + 1.3)), dark);
    // 1966 painted sign post (foreground left)
    b.add(boxGeo(V(ox - 3.6, 0, 3.0), V(ox - 3.5, 2.0, 3.1)), M.wood);
    card(R, c.signTex("c_1966", 512, 256, "#c8443b", "#f6f1e6", "1966", "900 150px sans-serif"), 1.1, 0.55, ox - 3.55, 1.9, 3.12, 0.25);
    // left-behind clutter: drums, crates, a flag on a pole
    const fuelL = stencil("fuel", "FUEL"), wasteL = stencil("waste", "WASTE");
    [[-3.4, -2.5], [-2.8, -2.2], [-3.1, -1.6], [-2.4, -1.4], [-3.6, -0.9]].forEach(([dx, dz], i) => drum(ox + dx, 0, dz, i % 2 ? drumOl : drumY, i % 2 ? wasteL : fuelL, 0.3));
    b.add(boxGeo(V(ox + 4.3, 0, -1.0), V(ox + 5.3, 0.8, 0.0)), M.crate); b.add(boxGeo(V(ox + 4.5, 0.8, -0.8), V(ox + 5.2, 1.4, -0.1)), M.crate);
    b.add(boxGeo(V(ox + 2.6, 0, -9), V(ox + 2.68, 4.5, -8.92)), M.iron);
    card(R, c.signTex("c_flag", 512, 320, "#f6f1e6", "#3b4a6a", "US ARMY", "900 90px sans-serif"), 1.2, 0.75, ox + 3.25, 4.0, -8.9);
    // the travelling reactor (shot 2 lifts it out of the pit; shot 3 tows a second copy away)
    const lift = reactorVessel(new THREE.Group()); lift.position.set(rx, 0, rz); R.add(lift);
    const cable = new THREE.Mesh(boxGeo(V(-0.025, 0, -0.025), V(0.025, 1, 0.025)), M.iron); cable.position.set(rx, 0, rz); R.add(cable);
    const hook = new THREE.Mesh(boxGeo(V(-0.18, -0.12, -0.18), V(0.18, 0.12, 0.18)), yellow); R.add(hook);
    const tug = tractor(new THREE.Group()); R.add(tug);
    const ride = reactorVessel(new THREE.Group()); ride.scale.setScalar(0.85); tug.add(ride); ride.position.set(0, 0.45, -4.6);
    // burial mound over the hatch (grows during "And it did.")
    const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.snow);
    mound.position.set(hx, 0, hz - 0.5); mound.castShadow = mound.receiveShadow = true; R.add(mound);
    const snow = snowfall(2600, 22, 9);
    frames.push((f, set) => {
      const t = f / FPS;
      // lift: 52.4 -> 53.3 vessel rises 0 -> 3.2 m, swinging slightly
      const k = ease((t - 52.45) / 0.9), y = 3.2 * k;
      lift.visible = set === "c_surface" && t < 53.45; lift.position.set(rx + 0.05 * Math.sin(t * 5) * k, y, rz); lift.rotation.z = 0.04 * Math.sin(t * 4) * k;
      const top = y + 2.95; cable.visible = hook.visible = lift.visible;
      cable.position.set(rx, top, rz); cable.scale.set(1, 7.2 - top, 1); hook.position.set(rx, top + 0.1, rz);
      // tow: the convoy creeps off toward the horizon 53.4 -> 54.8
      const d = ease((t - 53.4) / 1.6);
      tug.visible = t >= 53.3 && t < 57.3; tug.position.set(ox + 5.5, 0, -7 - 18 * d); tug.rotation.y = Math.PI;
      // mound covers the hatch 59.15 -> 60.05
      const m = ease((t - 59.15) / 0.9);
      mound.visible = t >= 59.1 && set === "c_surface"; mound.scale.set(0.01 + 2.6 * m, 0.01 + 3.3 * m, 0.01 + 1.9 * m);
      // snowfall from 57.3 (light) to 60.2 (heavy)
      snow.visible = t >= 57.3 && t < 60.25 && set === "c_surface";
      const fall = (t - 57.3) * (t > 59.1 ? 2.2 : 1.2);
      snow.position.set(ox - 11 + Math.sin(t) * 0.3, -((fall * 1.6) % 9) + 0, -11);
      (snow.material as THREE.PointsMaterial).size = t > 59.1 ? 0.12 : 0.08;
    });
  }

  // ================= 1100: the abandoned tunnel =================
  {
    const ox = C.tunnel, w = 3.2, hTop = 5.0, len = 40;
    b.add(quad(V(ox - w, 0, 8), V(ox + w, 0, 8), V(ox + w, 0, -len), V(ox - w, 0, -len), 3, 20), M.snow);
    for (const s of [-1, 1]) {
      const x = ox + s * w;
      b.add(s < 0 ? quad(V(x, 0, 8), V(x, 0, -len), V(x, hTop, -len), V(x, hTop, 8), 8, 1) : quad(V(x, 0, -len), V(x, 0, 8), V(x, hTop, 8), V(x, hTop, -len), 8, 1), M.ice);
    }
    const arcP = (k: number) => { const th = Math.PI * k; return [ox - Math.cos(th) * w, hTop - 0.3 + Math.sin(th) * 2.6] as [number, number]; };
    for (let i = 0; i < 18; i++) { const [x0, y0] = arcP(i / 18), [x1, y1] = arcP((i + 1) / 18); b.add(quad(V(x0, y0, 8), V(x1, y1, 8), V(x1, y1, -len), V(x0, y0, -len), 1, 16), M.steel); }
    // sagging ribs (the ice pushing in)
    for (let z = 6; z > -len; z -= 3) { const rib = new THREE.TorusGeometry(w - 0.06, 0.08, 6, 20, Math.PI); rib.scale(1, 2.6 / w, 1); rib.rotateZ((z % 2) * 0.03); rib.translate(ox, hTop - 0.3, z); b.add(rib, M.iron); }
    // A: fuel drums stacked three high, left wall, z 2..-4
    const fuel = stencil("fuel2", "JP-4 FUEL", "#1d1a1a");
    for (let i = 0; i < 6; i++) for (let j = 0; j < (i % 3 === 1 ? 3 : 2); j++) drum(ox - 2.4 + (j % 2) * 0.1, j * 0.9, 2 - i * 0.68, i % 2 ? drumY : drumOl, j === 0 ? fuel : undefined, Math.PI / 2);
    for (let i = 0; i < 4; i++) drum(ox + 2.2, 0, 1 - i * 0.7, drumOl, i % 2 ? fuel : undefined, -Math.PI / 2);
    // B: sewage tank on the right, z -9..-13, with a drip puddle
    b.add(new THREE.CylinderGeometry(1.3, 1.3, 4.2, 24).rotateX(Math.PI / 2).translate(ox + 1.5, 1.35, -11), sewage);
    for (const z of [-9.4, -12.6]) b.add(boxGeo(V(ox + 0.6, 0, z - 0.1), V(ox + 2.4, 0.4, z + 0.1)), M.iron);
    b.add(cyl(0.1, 2.2, ox + 1.5, 2.5, -10.0, 10), rust);
    card(R, stencil("sew", "SEWAGE", "#f1e6c8", 640, 160, 120), 2.6, 0.65, ox + 0.17, 1.45, -11, -Math.PI / 2, false);
    b.add(new THREE.CircleGeometry(1.1, 20).rotateX(-Math.PI / 2).scale(1, 1, 0.6).translate(ox + 0.6, 0.015, -11), mat("sludge", { color: "#5a4a32" }));
    card(R, c.signTex("c_noSmoke", 512, 200, "#f6f1e6", "#b8403a", "DO NOT SNIFF", "bold 64px sans-serif"), 0.9, 0.35, ox - w + 0.02, 2.0, -11.5, Math.PI / 2);
    // C: radioactive water barrels, glowing open tops, z -17..-21
    const hot = glow(1.2, 3.4, 0.7), rad = stencil("rad", "RADIOACTIVE", "#1d1a1a", 640, 160, 70);
    for (let i = 0; i < 7; i++) {
      const x = ox - 1.6 + (i % 4) * 0.75, z = -17.5 - Math.floor(i / 4) * 0.9 - (i % 2) * 0.2;
      drum(x, 0, z, drumY, i % 3 === 0 ? rad : undefined, 0);
      const top = new THREE.Mesh(new THREE.CircleGeometry(0.27, 18).rotateX(-Math.PI / 2), hot); top.position.set(x, 0.885, z); top.layers.set(NOINK); R.add(top);
    }
    c.lamp(ox - 0.6, 0.9, -18.0, 1.8, 0, [0.3, 0.9, 0.25]);
    c.wash(ox, 2.0, -21.8, 6, 4, 0, 0.15);
    // dead bulbs + one flickering one
    const flick = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), glow(3.0, 2.4, 1.4)); flick.position.set(ox, 4.4, 0.5); flick.layers.set(NOINK); R.add(flick);
    c.lamp(ox, 4.4, 0.5, 1.4, 0);
    c.lamp(ox + 0.5, 4.4, -9, 1.2, 0);
    for (let z = -4; z > -30; z -= 6) b.add(new THREE.SphereGeometry(0.08, 8, 6).translate(ox, 4.4, z), M.cream);
    b.add(boxGeo(V(ox - w + 0.02, 0, -26), V(ox + w - 0.02, 3.6, -25.8)), M.wood);
    card(R, c.signTex("c_closed", 640, 240, "#f2d23a", "#241726", "CLOSED 1966", "900 96px sans-serif"), 1.8, 0.68, ox, 2.2, -25.75);
    frames.push((f) => { flick.visible = (Math.floor(f / 3) * 7) % 11 > 2; });
  }

  // ================= 1200: lab =================
  {
    const ox = C.lab;
    b.add(quad(V(ox - 4, 0, 4), V(ox + 4, 0, 4), V(ox + 4, 0, -2.4), V(ox - 4, 0, -2.4), 4, 3), M.tiles);
    b.add(quad(V(ox - 4, 0, -2.4), V(ox + 4, 0, -2.4), V(ox + 4, 3.2, -2.4), V(ox - 4, 3.2, -2.4), 2, 1), mat("labWall", { map: rep(kit.tex.mess_wall, 2, 1), color: "#e8efe6" }));
    for (const s of [-1, 1]) b.add(quad(V(ox + s * 4, 0, s < 0 ? 4 : -2.4), V(ox + s * 4, 0, s < 0 ? -2.4 : 4), V(ox + s * 4, 3.2, s < 0 ? -2.4 : 4), V(ox + s * 4, 3.2, s < 0 ? 4 : -2.4), 2, 1), mat("labWall2", { color: "#dfe6dc" }));
    b.add(quad(V(ox - 4, 3.2, -2.4), V(ox + 4, 3.2, -2.4), V(ox + 4, 3.2, 4), V(ox - 4, 3.2, 4)), M.cream);
    c.placeProp(kit, "steel_desk", R, ox + 0.2, 0, -1.5, 0.8, 0);
    card(R, chalkTex(), 2.6, 1.62, ox - 1.2, 1.9, -2.38);
    // adding machine + printout ribbon spilling off the desk and snaking across the floor
    b.add(boxGeo(V(ox + 0.05, 0.8, -1.75), V(ox + 0.55, 0.98, -1.35)), mat("machine", { color: "#4f6a7a" }));
    for (let i = 0; i < 5; i++) b.add(boxGeo(V(ox + 0.1 + i * 0.08, 0.98, -1.5), V(ox + 0.15 + i * 0.08, 1.0, -1.42)), M.cream);
    const ribbon: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) { const u = i / 60; ribbon.push(i < 8 ? V(ox + 0.3, 0.98 - u * 0.1, -1.35 + u * 4) : i < 16 ? V(ox + 0.3, 0.8 - (i - 8) * 0.1, -0.95) : V(ox + 0.3 + Math.sin(u * 14) * 0.8, 0.012, -0.95 + (u - 0.27) * 3.6)); }
    const rp: number[] = [], ru: number[] = [];
    for (let i = 0; i < ribbon.length - 1; i++) { const a = ribbon[i], a2 = ribbon[i + 1]; const hw = 0.11, v0 = i / 60, v1 = (i + 1) / 60;
      for (const [p, u, v] of [[a, 0, v0], [a, 1, v0], [a2, 1, v1], [a, 0, v0], [a2, 1, v1], [a2, 0, v1]] as const) { rp.push(p.x + (u ? hw : -hw), p.y, p.z); ru.push(u, v); } }
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(ru, 2)); rg.computeVertexNormals();
    const rib = new THREE.Mesh(rg, mat("printout", { map: printoutTex() })); rib.receiveShadow = true; R.add(rib);
    // shelves of core samples (ice cylinders) + coffee mugs (gag: the mugs are labelled with dates)
    b.add(boxGeo(V(ox + 2.0, 1.4, -2.38), V(ox + 3.8, 1.46, -2.0)), M.wood); b.add(boxGeo(V(ox + 2.0, 2.1, -2.38), V(ox + 3.8, 2.16, -2.0)), M.wood);
    for (let i = 0; i < 6; i++) b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10).rotateZ(Math.PI / 2).translate(ox + 2.3 + (i % 3) * 0.55, 1.52 + Math.floor(i / 3) * 0.7, -2.2), mat("core", { color: "#cfe3f2" }));
    for (let i = 0; i < 4; i++) b.add(cyl(0.06, 0.12, ox - 0.3 - i * 0.18, 0.8, -1.3 - (i % 2) * 0.1, 10), M.cream);
    // fluorescent tubes
    for (const x of [ox - 1.5, ox + 1.5]) { const tube = new THREE.Mesh(boxGeo(V(-0.8, -0.04, -0.06), V(0.8, 0.04, 0.06)), glow(2.2, 2.4, 2.2)); tube.position.set(x, 3.12, 0.4); tube.layers.set(NOINK); R.add(tube); }
    c.lamp(ox, 3.0, 0.4, 2.2, 0, [0.8, 0.95, 0.85]);
    card(R, c.signTex("c_labSign", 640, 200, "#f6f1e6", "#3b4a6a", "CLIMATE LAB", "900 84px sans-serif"), 1.3, 0.4, ox + 2.9, 2.6, -2.37);
  }

  // ================= 1230: the glacier cross-section diorama =================
  {
    const ox = C.xs, W = 11, D = 3;
    b.add(boxGeo(V(ox - W, -16, -D), V(ox + W, -12, 0)), bed);
    // front face of the ice with yearly layers; side + back plain ice
    const body = new THREE.Mesh(boxGeo(V(-W, 0, -D), V(W, 1, 0)), stratM); body.position.set(ox, -12, 0); body.castShadow = body.receiveShadow = true; R.add(body);
    const cap = new THREE.Mesh(boxGeo(V(-W, 0, -D), V(W, 0.6, 0)), M.snow); cap.castShadow = true; R.add(cap);
    // the camp: tunnels + rooms at depth, warm windows, a reactor glow
    const cy = -7.6;
    b.add(boxGeo(V(ox - 8, cy - 0.7, -2.6), V(ox + 8, cy + 0.7, 0.03)), dark);
    for (let i = 0; i < 9; i++) {
      const x = ox - 7.3 + i * 1.8;
      b.add(boxGeo(V(x - 0.55, cy - 0.55, -2.5), V(x + 0.55, cy + 0.35, 0.04)), i === 4 ? M.steel : M.wood);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), glow(2.4, 1.6, 0.7)); win.position.set(x + 0.15, cy - 0.05, 0.06); win.layers.set(NOINK); R.add(win);
    }
    b.add(boxGeo(V(ox - 0.2, cy + 0.7, -1.4), V(ox + 0.2, 0, -1.0)), M.iron); // the old shaft to the surface
    card(R, c.signTex("c_ccLabel", 768, 180, "#f6f1e6", "#241726", "CAMP CENTURY", "900 88px sans-serif"), 3.0, 0.7, ox, cy - 1.4, 0.08);
    // 1966 surface line (dashed) for scale
    card(R, ctex("c_dash", 1024, 64, (g) => { g.clearRect(0, 0, 1024, 64); g.fillStyle = "#c8443b"; for (let x = 0; x < 1024; x += 64) g.fillRect(x, 26, 40, 12); g.font = "bold 34px sans-serif"; g.fillText("", 0, 0); }), 2 * W, 0.5, ox, -3.0, 0.07, 0, false);
    card(R, c.signTex("c_l1966", 384, 128, "#c8443b", "#ffffff", "1966 SURFACE", "bold 54px sans-serif"), 1.8, 0.6, ox - W + 1.2, -2.5, 0.08);
    const year = card(R, c.signTex("c_l2026", 384, 128, "#241726", "#ffffff", "TODAY", "bold 62px sans-serif"), 1.6, 0.53, ox + W - 1.3, 0, 0.09);
    // a tiny sun gag on a stick above the block for the melt
    const sun = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), glow(2.6, 1.8, 0.6)); sun.layers.set(NOINK); R.add(sun);
    card(R, c.signTex("c_dnt", 512, 160, "#f6f1e6", "#b8403a", "DO NOT THAW", "900 70px sans-serif"), 1.4, 0.44, ox + 5.5, 0, -1.5);
    const dnt = R.children[R.children.length - 1];
    frames.push((f, set) => {
      const t = f / FPS;
      // ice top height: 1966 -3 -> today 0 (66.7-70.5 "sixty years eating": snow stacks up) ; 62.2-66.7 the 2090 melt drops it to -4.4
      let top = 0;
      if (t >= 62.2 && t < 66.7) top = -4.4 * ease((t - 63.6) / 2.8);
      else if (t >= 66.7) top = -3.0 + 3.0 * ease((t - 66.9) / 3.2);
      body.scale.y = 12 + top; cap.position.set(ox, top, 0); year.position.y = top + 0.3; dnt.position.y = top + 0.8;
      sun.visible = set === "c_xs" && t < 66.7; sun.position.set(ox + 3.4, 4.6 - 1.2 * ease((t - 64.4) / 2.3), 1);
    });
  }

  // ================= 1300: 2090 surface =================
  {
    const ox = C.s2090;
    b.add(quad(V(ox - 40, 0, 40), V(ox + 40, 0, 40), V(ox + 40, 0, -40), V(ox - 40, 0, -40), 1, 1), slush);
    for (let i = 0; i < 9; i++) b.add(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2).scale(1.2 + (i % 3) * 0.9, 1, 0.6 + (i % 2) * 0.5).translate(ox - 6 + (i * 3.7) % 13, 0.012, 2 - i * 2.6), puddle);
    // melt hole where the camp comes up: a dark ring and a scoured bowl
    b.add(new THREE.RingGeometry(1.4, 2.0, 32).rotateX(-Math.PI / 2).translate(ox, 0.02, -2.0), mat("dirty", { color: "#8a7f72" }));
    b.add(new THREE.CircleGeometry(1.4, 32).rotateX(-Math.PI / 2).translate(ox, 0.016, -2.0), mat("hole", { color: "#2f3c4a" }));
    // 2090 marker post, a beach umbrella stuck in the slush (gag), drifting meltwater streams
    b.add(boxGeo(V(ox + 1.55, 0, 1.4), V(ox + 1.65, 1.7, 1.5)), M.wood);
    card(R, c.signTex("c_2090", 512, 256, "#f2d23a", "#241726", "2090", "900 150px sans-serif"), 1.0, 0.5, ox + 1.6, 1.6, 1.52, 0.35, false);
    b.add(boxGeo(V(ox - 1.9, 0, -7), V(ox - 1.84, 2.2, -6.94)), M.chrome);
    b.add(new THREE.ConeGeometry(1.1, 0.45, 12, 1, true).translate(ox - 1.87, 2.25, -6.97), drumR);
    b.add(boxGeo(V(ox - 2.6, 0, -6.6), V(ox - 1.2, 0.35, -6.2)), mat("towel", { color: "#e98aa0" })); // a beach towel on the slush
    // the rusty CAMP CENTURY board, half-melted out
    const board = card(R, c.signTex("c_ccRust", 768, 192, "#b98a62", "#3a2a22", "CAMP CENTURY", "bold 92px sans-serif"), 1.8, 0.45, ox + 1.9, 0.32, -2.6, -0.6, false); board.rotation.z = 0.3;
    // the spit-out: drums, a pipe, a bunk ladder, then the penguin on top
    const up = new THREE.Group(); up.position.set(ox, 0, -2.0); R.add(up);
    const addU = (geo: THREE.BufferGeometry, m: THREE.Material) => { const me = new THREE.Mesh(geo, m); me.castShadow = me.receiveShadow = true; up.add(me); };
    addU(cyl(0.3, 0.88, 0, 0, 0), drumY); addU(cyl(0.3, 0.88, -0.75, -0.3, 0.35), drumOl); addU(cyl(0.3, 0.88, 0.8, -0.45, 0.2), rust);
    addU(new THREE.CylinderGeometry(0.09, 0.09, 2.2, 10).rotateZ(0.6).translate(-0.4, 0.4, -0.7), rust);
    addU(boxGeo(V(0.5, -0.2, -0.9), V(0.62, 1.4, -0.8)), M.iron); addU(boxGeo(V(0.9, -0.2, -0.9), V(1.02, 1.2, -0.8)), M.iron);
    for (let y = 0; y < 1.2; y += 0.3) addU(boxGeo(V(0.5, y, -0.88), V(1.0, y + 0.05, -0.82)), M.iron);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), mat("rad2", { map: stencil("rad3", "☢", "#1d1a1a", 256, 256, 200), transparent: true, alphaTest: 0.3 }));
    pl.position.set(0, 0.45, 0.305); up.add(pl);
    const peng = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshBasicMaterial({ map: lostPenguin(), transparent: true, alphaTest: 0.4, color: new THREE.Color(1.05, 1.0, 0.95) })); // unlit: the payoff must pop
    peng.position.set(0, 0.88 + 0.45, 0.02); up.add(peng);
    frames.push((f) => {
      const t = f / FPS;
      // 70.5: the junk heaves up out of the melt hole in two shoves, penguin last (hop + settle)
      const k = 0.55 * ease((t - 70.6) / 0.4) + 0.45 * ease((t - 71.3) / 0.5);
      up.position.y = -1.8 + 1.8 * k;
      const hop = t > 71.85 ? Math.max(0, Math.sin((t - 71.85) * 9)) * 0.12 * Math.max(0, 1 - (t - 71.85) * 1.6) : 0;
      peng.position.y = 1.33 + hop; peng.visible = t >= 71.25;
      peng.rotation.z = t > 71.9 ? 0.06 * Math.sin((t - 71.9) * 3) : 0;
    });
  }

  c.onFrame((f, set) => { for (const fn of frames) fn(f, set); });
};
