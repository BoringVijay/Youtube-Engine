// Section A sets. Only the section-A helper edits this file.
// x=400 the ice sheet surface (cover story: "they study snow"), x=500 the secret war room (Project Iceworm diorama),
// x=600 the Danish office (cosy, oblivious). Everything painted in Canvas2D, toon-shaded through the shared kit.
import * as THREE from "three";
import type { SetCtx } from "../world";
import { lam, boxGeo, quad, V } from "../../bridge/build";
import { ctex, rep } from "../../bridge/paint";
import { twoTone } from "../../bridge/shade";
import { NOINK } from "../../bridge/ink";
import { FPS } from "../timeline";

export const A_SURF = 400, A_WAR = 500, A_DK = 600;
const INKC = "#241726";

// ---------- painted textures ----------
const rulerTex = () => ctex("a_ruler", 128, 1024, (g) => {
  g.fillStyle = "#f2d23a"; g.fillRect(0, 0, 128, 1024);
  g.fillStyle = INKC; g.font = "bold 40px sans-serif"; g.textAlign = "left";
  for (let i = 0; i <= 40; i++) {
    const y = 1024 - i * 25; const w = i % 10 === 0 ? 70 : i % 5 === 0 ? 48 : 28;
    g.fillRect(0, y - 3, w, 6);
    if (i % 10 === 0 && i) g.fillText(String(i / 10), 78, y + 14);
  }
  g.strokeStyle = INKC; g.lineWidth = 10; g.strokeRect(5, 5, 118, 1014);
});
const blueprintTex = () => ctex("a_blueprint", 1536, 1024, (g, r) => {
  g.fillStyle = "#24508f"; g.fillRect(0, 0, 1536, 1024);
  g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2;
  for (let x = 0; x < 1536; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  for (let y = 0; y < 1024; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(1536, y); g.stroke(); }
  // tunnel grid: long trunk lines + ladder of launch bays
  g.strokeStyle = "#e9f1ff"; g.lineWidth = 14; g.lineCap = "round";
  for (let k = 0; k < 4; k++) {
    const y = 250 + k * 170; g.beginPath(); g.moveTo(140, y); g.lineTo(1200, y + (r() - 0.5) * 30); g.stroke();
    for (let x = 220; x < 1180; x += 110) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40, y + 70); g.stroke(); }
  }
  g.lineWidth = 8; g.beginPath(); g.moveTo(140, 250); g.lineTo(140, 760); g.stroke();
  g.fillStyle = "#e9f1ff"; g.font = "bold 74px sans-serif"; g.fillText("PROJECT ICEWORM", 140, 130);
  g.font = "bold 34px sans-serif"; g.fillText("SHEET 1 OF 600  ·  4,000 KM OF TUNNEL", 140, 185);
  // red chalk "600" circled + TOP SECRET stamp
  g.strokeStyle = "#ff5a4a"; g.lineWidth = 12; g.beginPath(); g.ellipse(1340, 470, 150, 105, -0.1, 0, Math.PI * 2); g.stroke();
  g.fillStyle = "#ff5a4a"; g.font = "bold 150px sans-serif"; g.textAlign = "center"; g.fillText("600", 1340, 520);
  g.save(); g.translate(1250, 860); g.rotate(-0.18); g.strokeStyle = "#e23a2e"; g.lineWidth = 10; g.strokeRect(-230, -62, 460, 124);
  g.fillStyle = "#e23a2e"; g.font = "bold 78px sans-serif"; g.fillText("TOP SECRET", 0, 28); g.restore();
  g.strokeStyle = INKC; g.lineWidth = 16; g.strokeRect(8, 8, 1520, 1008);
});
const dioramaTex = () => ctex("a_diorama", 1024, 1024, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(150,180,215,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 20 + r() * 60, 8 + r() * 20, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "#27446e"; g.lineWidth = 64; g.lineCap = "round";
  for (let k = 0; k < 3; k++) { const y = 230 + k * 280; g.beginPath(); g.moveTo(60, y); g.lineTo(964, y); g.stroke(); }
  g.lineWidth = 44; g.beginPath(); g.moveTo(130, 230); g.lineTo(130, 790); g.stroke();
  g.strokeStyle = "#2a2e38"; g.lineWidth = 6; // rails
  for (let k = 0; k < 3; k++) { const y = 230 + k * 280; for (const d of [-7, 7]) { g.beginPath(); g.moveTo(60, y + d); g.lineTo(964, y + d); g.stroke(); } }
});
const flagDK = () => ctex("a_flagdk", 370, 280, (g) => {
  g.fillStyle = "#c8102e"; g.fillRect(0, 0, 370, 280); g.fillStyle = "#ffffff"; g.fillRect(120, 0, 40, 280); g.fillRect(0, 120, 370, 40);
});
const wallpaper = () => ctex("a_wallpaper", 512, 512, (g) => {
  g.fillStyle = "#e8c9a0"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#d9b282"; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 22, 512);
  g.fillStyle = "#c89a6a"; for (let x = 32; x < 512; x += 64) for (let y = 20; y < 512; y += 64) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
});
const greenlandMap = () => ctex("a_glmap", 768, 1024, (g) => {
  g.fillStyle = "#f3ead6"; g.fillRect(0, 0, 768, 1024);
  g.fillStyle = "#cfe0ee"; g.fillRect(30, 30, 708, 964);
  g.fillStyle = "#ffffff"; g.strokeStyle = INKC; g.lineWidth = 8;
  g.beginPath(); g.moveTo(380, 110); g.bezierCurveTo(600, 120, 690, 300, 600, 520); g.bezierCurveTo(560, 720, 470, 880, 400, 940);
  g.bezierCurveTo(330, 860, 250, 700, 210, 520); g.bezierCurveTo(150, 330, 230, 140, 380, 110); g.fill(); g.stroke();
  g.fillStyle = INKC; g.font = "bold 64px sans-serif"; g.textAlign = "center"; g.fillText("GRØNLAND", 400, 560);
  g.font = "bold 40px sans-serif"; g.fillText("(OURS)", 400, 615);
  g.fillStyle = "#c8102e"; g.beginPath(); g.arc(300, 300, 16, 0, 7); g.fill(); // a little red pin, nowhere near anything
  g.strokeStyle = INKC; g.lineWidth = 14; g.strokeRect(7, 7, 754, 1010);
});
const newspaper = () => ctex("a_paper", 768, 560, (g) => {
  g.fillStyle = "#efe8d8"; g.fillRect(0, 0, 768, 560);
  g.fillStyle = INKC; g.font = "bold 46px serif"; g.textAlign = "center"; g.fillText("KØBENHAVNS AVIS", 384, 66);
  g.fillRect(30, 84, 708, 6);
  g.font = "bold 58px sans-serif"; g.fillText("ALL QUIET", 384, 170); g.fillText("IN GREENLAND", 384, 236);
  g.fillStyle = "#8a8478"; for (let y = 280; y < 530; y += 26) { g.fillRect(40, y, 330, 12); g.fillRect(400, y, 330, 12); }
  g.strokeStyle = INKC; g.lineWidth = 8; g.strokeRect(4, 4, 760, 552);
});
const clockTex = () => ctex("a_clock", 256, 256, (g) => {
  g.fillStyle = "#f6f1e6"; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = INKC; g.stroke();
  g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 52); g.moveTo(128, 128); g.lineTo(178, 150); g.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 95, 128 + Math.sin(a) * 95); g.lineTo(128 + Math.cos(a) * 106, 128 + Math.sin(a) * 106); g.stroke(); }
});
const plaque = (key: string, text: string, bg = "#f6f1e6", fg = INKC, w = 768, h = 192, font = "bold 70px sans-serif") => ctex(key, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = INKC; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4);
});

const plane = (R: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, ink = true, transparent = false) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.rotation.y = ry; if (!ink) m.layers.set(NOINK); R.add(m); return m;
};
const toon = (col: string) => twoTone(new THREE.MeshLambertMaterial({ color: col }));
const cyl = (r0: number, r1: number, h: number, seg = 16) => new THREE.CylinderGeometry(r0, r1, h, seg);

export const buildA = (c: SetCtx) => {
  const { R, b, M, kit } = c;

  // ================= x=400: the ice sheet surface =================
  {
    const ox = A_SURF;
    const snowBig = lam("a_snowBig", () => ({ map: rep(kit.tex.snow_floor, 14, 14), color: "#e4eeff" }));
    b.add(quad(V(ox - 40, 0, 40), V(ox + 40, 0, 40), V(ox + 40, 0, -40), V(ox - 40, 0, -40), 1, 1), snowBig);
    // soft drifts: flattened lumps (the one he measures is in front of him)
    const drift = lam("a_drift", () => ({ map: rep(kit.tex.snow_floor, 2, 2), color: "#e8f0ff" }));
    const lump = (x: number, z: number, sx: number, sy: number, sz: number) => {
      const g = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(sx, sy, sz); g.translate(x, 0, z); b.add(g, drift);
    };
    lump(ox + 0.85, -0.35, 0.45, 0.3, 0.35); lump(ox - 3.5, -6, 3.2, 0.8, 1.6); lump(ox + 6, -12, 5, 1.1, 2.2); lump(ox - 10, -20, 7, 1.4, 3);
    lump(ox + 14, -30, 9, 1.8, 3.5); lump(ox - 2, 4, 2.2, 0.35, 1.2);
    // the yellow ruler standing in the drift + a survey flag
    plane(R, rulerTex(), 0.07, 0.6, ox + 0.78, 0.3, -0.2, 0.15);
    const flagPole = new THREE.Mesh(cyl(0.015, 0.015, 1.4), toon("#3b3540")); flagPole.position.set(ox + 1.25, 0.7, -0.6); R.add(flagPole);
    plane(R, plaque("a_survey", "SNOW", "#e2463a", "#ffffff", 384, 220, "bold 90px sans-serif"), 0.36, 0.2, ox + 1.43, 1.25, -0.6, 0.3);
    // cover-story weather station: hut + mast + anemometer
    b.add(boxGeo(V(ox - 5.2, 0, -9.5), V(ox - 3.0, 2.0, -7.6)), M.wood);
    b.add(boxGeo(V(ox - 5.35, 2.0, -9.65), V(ox - 2.85, 2.18, -7.45)), M.red);
    plane(R, plaque("a_wx", "WEATHER STATION (REAL)"), 1.8, 0.45, ox - 4.1, 1.45, -7.58);
    const mast = new THREE.Mesh(cyl(0.05, 0.05, 6), toon("#4a505c")); mast.position.set(ox - 2.3, 3, -9); R.add(mast);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const cup = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toon("#e2463a")); cup.position.set(ox - 2.3 + Math.cos(a) * 0.4, 6.05, -9 + Math.sin(a) * 0.4); R.add(cup); }
    // the giveaway: a steaming vent pipe and a periscope poking out of the "empty" snow
    const VX = ox + 1.9, VZ = -3.6;
    const vent = new THREE.Mesh(cyl(0.22, 0.22, 1.5), toon("#5d636e")); vent.position.set(VX, 0.75, VZ); R.add(vent);
    const cap = new THREE.Mesh(cyl(0.38, 0.26, 0.22), toon("#4a505c")); cap.position.set(VX, 1.6, VZ); R.add(cap);
    const peri = new THREE.Mesh(cyl(0.06, 0.06, 1.1), toon("#6f7448")); peri.position.set(ox - 1.6, 0.55, -2.4); R.add(peri);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.26), toon("#6f7448")); head.position.set(ox - 1.6, 1.12, -2.32); R.add(head);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 0.9) })); lens.position.set(ox - 1.6, 1.12, -2.18); lens.layers.set(NOINK); R.add(lens);
    // steam puffs (animated)
    const puffs: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: c.glowTex(), color: new THREE.Color(0.9, 0.92, 0.95), transparent: true, depthWrite: false, opacity: 0.8 }));
      p.layers.set(NOINK); R.add(p); puffs.push(p);
    }
    // distant snow fence line for scale
    for (let i = 0; i < 22; i++) b.add(boxGeo(V(ox - 30 + i * 2.6, 0, -26), V(ox - 29.9 + i * 2.6, 1.1, -25.9)), M.wood);
    b.add(boxGeo(V(ox - 30, 0.8, -26), V(ox + 27, 0.9, -25.95)), M.wood);
    c.onFrame((f, set) => {
      if (set !== "a_surface") return;
      const t = f / FPS;
      puffs.forEach((p, i) => {
        const k = ((t * 0.45 + i / puffs.length) % 1);
        p.position.set(VX + k * 0.9, 1.75 + k * 2.4, VZ - k * 0.3); p.scale.setScalar(0.5 + k * 1.6);
        (p.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - k);
        p.lookAt(p.position.x, p.position.y, p.position.z + 10);
      });
    });
  }

  // ================= x=500: the war room (Project Iceworm) =================
  {
    const ox = A_WAR;
    b.add(quad(V(ox - 4, 0, 4), V(ox + 4, 0, 4), V(ox + 4, 0, -3), V(ox - 4, 0, -3), 3, 2.6), M.planks);
    b.add(quad(V(ox - 4, 0, -3), V(ox + 4, 0, -3), V(ox + 4, 3.4, -3), V(ox - 4, 3.4, -3), 2.6, 1.2), M.wallP);
    b.add(quad(V(ox - 4, 0, 4), V(ox - 4, 0, -3), V(ox - 4, 3.4, -3), V(ox - 4, 3.4, 4), 2.2, 1.2), M.ice);
    b.add(quad(V(ox + 4, 0, -3), V(ox + 4, 0, 4), V(ox + 4, 3.4, 4), V(ox + 4, 3.4, -3), 2.2, 1.2), M.ice);
    b.add(quad(V(ox - 4, 3.4, -3), V(ox + 4, 3.4, -3), V(ox + 4, 3.4, 4), V(ox - 4, 3.4, 4), 2, 2), M.steel);
    // the big blueprint on the back wall
    plane(R, blueprintTex(), 3.6, 2.4, ox - 0.6, 1.85, -2.96);
    b.add(boxGeo(V(ox - 2.5, 0.6, -2.98), V(ox + 1.3, 0.66, -2.82)), M.wood); // chalk ledge
    plane(R, plaque("a_door", "AUTHORIZED PERSONNEL ONLY", "#f2d23a"), 1.4, 0.35, ox + 2.6, 2.6, -2.95);
    b.add(boxGeo(V(ox + 2.1, 0, -2.99), V(ox + 3.1, 2.1, -2.9)), M.olive); // door
    // the diorama table: snow slab carved with tunnels, toy trains with red missiles running the trunks
    b.add(boxGeo(V(ox - 1.6, 0, 0.0), V(ox + 1.6, 0.78, 1.6)), M.wood);
    const dio = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 1.4), [toon("#e4ebf2"), toon("#e4ebf2"), twoTone(new THREE.MeshLambertMaterial({ map: dioramaTex() })), toon("#e4ebf2"), toon("#e4ebf2"), toon("#e4ebf2")]);
    dio.position.set(ox, 0.82, 0.8); R.add(dio);
    const dtop = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.4), new THREE.MeshBasicMaterial({ map: dioramaTex(), color: new THREE.Color(0.92, 0.95, 1.0) }));
    dtop.rotation.x = -Math.PI / 2; dtop.position.set(ox, 0.862, 0.8); R.add(dtop); // painted top, unlit so the tunnel grid reads
    const trains: THREE.Group[] = [];
    for (let k = 0; k < 3; k++) {
      const tr = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const car = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.06), toon(j === 0 ? "#3b4a3a" : "#6f7448")); car.position.x = -j * 0.18; tr.add(car);
        if (j) { const ms = new THREE.Mesh(cyl(0.017, 0.017, 0.14, 10), toon("#e2463a")); ms.rotation.z = Math.PI / 2; ms.position.set(-j * 0.18, 0.045, 0); tr.add(ms);
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.04, 10), toon("#f6f1e6")); tip.rotation.z = -Math.PI / 2; tip.position.set(-j * 0.18 + 0.09, 0.045, 0); tr.add(tip); }
      }
      tr.position.set(ox, 0.885, 0.8 - 0.7 + (230 + k * 280) / 1024 * 1.4); R.add(tr); trains.push(tr);
    }
    // little flags + coffee cup + ash tray on the table edge
    for (const [x, z, col] of [[-1.1, 0.4, "#e2463a"], [0.3, 0.75, "#e2463a"], [1.05, 1.2, "#f2d23a"]] as [number, number, string][]) {
      const pin = new THREE.Mesh(cyl(0.006, 0.006, 0.14, 6), toon("#2a2420")); pin.position.set(ox + x, 0.93, z); R.add(pin);
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.05), toon(col)); fl.position.set(ox + x + 0.035, 0.98, z); R.add(fl);
    }
    const mug = new THREE.Mesh(cyl(0.05, 0.045, 0.1), toon("#f6f1e6")); mug.position.set(ox + 1.42, 0.84, 0.15); R.add(mug);
    // green-shaded hanging lamp over the table
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 20, 1, true), toon("#3f6a4a")); shade.position.set(ox, 2.55, 0.8); R.add(shade);
    const cord = new THREE.Mesh(cyl(0.01, 0.01, 0.85, 6), toon("#2a2420")); cord.position.set(ox, 2.97, 0.8); R.add(cord);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.8, 2.0) })); bulb.position.set(ox, 2.4, 0.8); bulb.layers.set(NOINK); R.add(bulb);
    c.lamp(ox, 2.38, 0.8, 1.6, 0.86, [0.9, 0.95, 0.75]);
    c.wash(ox - 0.6, 1.85, -2.93, 5.2, 3.2, 0, 0.35);
    // filing cabinets + a slightly too-proud "MISSILES: 0 (FOR NOW)" chalk tally
    b.add(boxGeo(V(ox - 3.9, 0, -2.6), V(ox - 3.3, 1.4, -1.9)), M.steel); b.add(boxGeo(V(ox - 3.9, 0, -1.8), V(ox - 3.3, 1.4, -1.1)), M.steel);
    plane(R, plaque("a_tally", "MISSILES: 0 (FOR NOW)", "#2f3a33", "#f6f1e6"), 1.3, 0.32, ox + 2.0, 1.55, -2.95);
    c.onFrame((f, set) => {
      if (set !== "a_war") return;
      const t = f / FPS;
      trains.forEach((tr, k) => { const u = ((t * (0.16 + k * 0.03) + k * 0.37) % 1); tr.position.x = ox - 1.35 + u * 2.7; });
    });
  }

  // ================= x=600: the Danish office (cosy, oblivious) =================
  {
    const ox = A_DK;
    const wp = lam("a_wp", () => ({ map: rep(wallpaper(), 3, 1.5) }));
    b.add(quad(V(ox - 3, 0, 3), V(ox + 3, 0, 3), V(ox + 3, 0, -2), V(ox - 3, 0, -2), 2.4, 2), M.planks);
    b.add(quad(V(ox - 3, 0, -2), V(ox + 3, 0, -2), V(ox + 3, 3, -2), V(ox - 3, 3, -2), 1, 1), wp);
    b.add(quad(V(ox - 3, 0, 3), V(ox - 3, 0, -2), V(ox - 3, 3, -2), V(ox - 3, 3, 3), 1, 1), wp);
    b.add(quad(V(ox + 3, 0, -2), V(ox + 3, 0, 3), V(ox + 3, 3, 3), V(ox + 3, 3, -2), 1, 1), wp);
    b.add(boxGeo(V(ox - 3, 0, -1.99), V(ox + 3, 0.9, -1.95)), M.wood); // wainscot
    // window with a snowy Copenhagen-blue evening
    const win = ctex("a_window", 512, 512, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#26406e"); gr.addColorStop(1, "#7d97c4"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      g.fillStyle = "#ffffff"; for (let i = 0; i < 70; i++) { g.beginPath(); g.arc((i * 97) % 512, (i * 53) % 512, 4, 0, 7); g.fill(); }
      g.fillStyle = "#1c2a48"; g.fillRect(0, 380, 512, 132); g.fillStyle = "#f2c66a"; for (let x = 30; x < 512; x += 80) g.fillRect(x, 410, 22, 26);
      g.strokeStyle = "#f6f1e6"; g.lineWidth = 26; g.strokeRect(0, 0, 512, 512); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.moveTo(0, 256); g.lineTo(512, 256); g.stroke();
    });
    plane(R, win, 1.3, 1.3, ox + 1.7, 1.85, -1.97);
    plane(R, greenlandMap(), 0.9, 1.2, ox - 1.2, 1.9, -1.97);
    plane(R, clockTex(), 0.4, 0.4, ox + 0.15, 2.55, -1.97);
    // the egg: a penguin postcard pinned up — "wrong pole", he never noticed either
    plane(R, c.penguinSticker(), 0.34, 0.34, ox - 0.45, 1.55, -1.965, 0.08);
    // desk, chair back, flag, coffee, plant, in-tray
    b.add(boxGeo(V(ox - 0.95, 0.72, -0.15), V(ox + 0.95, 0.8, 0.55)), M.wood);
    b.add(boxGeo(V(ox - 0.9, 0, -0.1), V(ox - 0.75, 0.72, 0.5)), M.wood); b.add(boxGeo(V(ox + 0.75, 0, -0.1), V(ox + 0.9, 0.72, 0.5)), M.wood);
    b.add(boxGeo(V(ox - 0.9, 0.2, 0.48), V(ox + 0.9, 0.72, 0.52)), M.wood); // modesty panel (hides his legs)
    const fpole = new THREE.Mesh(cyl(0.008, 0.008, 0.36, 6), toon("#c9b46a")); fpole.position.set(ox - 0.72, 0.98, 0.35); R.add(fpole);
    plane(R, flagDK(), 0.2, 0.15, ox - 0.62, 1.08, 0.35);
    const cup = new THREE.Mesh(cyl(0.055, 0.05, 0.11), toon("#f6f1e6")); cup.position.set(ox + 0.55, 0.86, 0.38); R.add(cup);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.048, 16), toon("#5a3a22")); coffee.rotation.x = -Math.PI / 2; coffee.position.set(ox + 0.55, 0.912, 0.38); R.add(coffee);
    const pot = new THREE.Mesh(cyl(0.12, 0.09, 0.2), toon("#c0643a")); pot.position.set(ox + 2.3, 0.1, -1.4); R.add(pot);
    for (let i = 0; i < 5; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon(i % 2 ? "#5f9a4a" : "#4f8a3f")); lf.scale.set(1, 1.6, 0.6); lf.position.set(ox + 2.3 + Math.cos(i * 1.3) * 0.12, 0.38 + i * 0.07, -1.4 + Math.sin(i * 1.3) * 0.08); R.add(lf); }
    b.add(boxGeo(V(ox - 0.5, 0.8, 0.1), V(ox - 0.2, 0.86, 0.32)), M.cream); // in-tray, empty
    plane(R, plaque("a_nameplate", "MINISTRY OF GREENLAND", "#3b2a1e", "#f2d23a", 768, 160, "bold 56px sans-serif"), 0.5, 0.1, ox + 0.05, 0.85, 0.551);
    // warm lamp + wash
    const lshade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.16, 16, 1, true), toon("#2f6a4a")); lshade.position.set(ox + 0.8, 1.15, 0.05); R.add(lshade);
    const lstem = new THREE.Mesh(cyl(0.01, 0.01, 0.36, 6), toon("#c9b46a")); lstem.position.set(ox + 0.8, 0.98, 0.05); R.add(lstem);
    c.lamp(ox + 0.8, 1.08, 0.05, 1.2, 0.8);
    c.wash(ox, 1.7, -1.95, 5.6, 3.0, 0, 0.55);
    // his newspaper: a card in front of his face that drops at "who owns it" (20.96 s)
    const paper = plane(R, newspaper(), 0.62, 0.45, ox, 1.22, 0.42, 0);
    c.onFrame((f, set) => {
      if (set !== "a_dk") return;
      const k = Math.max(0, Math.min(1, (f / FPS - 20.85) / 0.25)), e = k * k * (3 - 2 * k);
      paper.position.y = 1.22 - 0.4 * e; paper.position.z = 0.42 - 0.12 * e; paper.rotation.x = -1.45 * e;
    });
    b.add(boxGeo(V(ox + 1.9, 0, -1.95), V(ox + 2.9, 2.0, -1.5)), M.wood); // bookshelf
    for (let i = 0; i < 12; i++) b.add(boxGeo(V(ox + 1.95 + (i % 6) * 0.15, 0.95 + Math.floor(i / 6) * 0.5, -1.55), V(ox + 2.05 + (i % 6) * 0.15, 1.3 + Math.floor(i / 6) * 0.5, -1.5)), [M.red, M.cream, M.olive, M.leather][i % 4]);
  }
};

