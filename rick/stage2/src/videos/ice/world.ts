// The City the Ice Ate: one three.js world with every set at its own place (sets 100 m apart), posed per frame.
// Look kit is the bridge engine's (two-tone shading, painted Canvas2D textures with dark seams, ink pass, lens blur,
// grade, lit character cards with contact blobs); only the sets, light presets and cast are new.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getInputProps, staticFile } from "remotion";
/** fast preview render (inputProps {preview:true}): half-size character cards, smaller shadow map */
export const PREVIEW = !!(getInputProps() as { preview?: boolean }).preview;
import { lam, Batch, boxGeo, quad, V } from "../bridge/build";
import { ctex, rep, planksHD, beamHD } from "../bridge/paint";
import { TONE, CHAR, twoTone, untone } from "../bridge/shade";
import { LIGHTS, LightPreset } from "../bridge/lights";
import { NOINK } from "../bridge/ink";
import { Pool, Actor, Fx } from "../bridge/cast";
import { Pen, bodyFront, fxContact, FrontOpts } from "../bridge/toon";
import { SHOTS, FPS, camAt, ShotDef, Light, Spot } from "./story";
import { buildA } from "./sets/a";
import { buildB } from "./sets/b";
import { buildC } from "./sets/c";

// ---------------- light presets: day/golden from the bridge, plus warm-bulb interiors and night-blue ----------------
const L: Record<Light, LightPreset> = {
  day: LIGHTS.day,
  golden: LIGHTS.golden,
  inside: { ...LIGHTS.day, az: 35, el: 50, lit: [1.85, 1.38, 0.88], shade: [0.46, 0.33, 0.36], lift: [0.07, 0.045, 0.04],
    charTint: [1.05, 0.93, 0.8], blob: [0.55, 0.5, 0.5], fog: "#3a2a2e", fogNear: 10, fogFar: 75 },
  night: { ...LIGHTS.day, az: 30, el: 35, lit: [0.75, 0.85, 1.25], shade: [0.12, 0.14, 0.3], lift: [0.03, 0.04, 0.12],
    charTint: [0.7, 0.78, 1.0], fog: "#1c2a4a", fogNear: 20, fogFar: 160 },
  // open ice sheet under a high pale sun: bright snow, blue shadows, long fog to a white horizon
  arctic: { ...LIGHTS.day, az: 140, el: 22, lit: [1.75, 1.68, 1.55], shade: [0.42, 0.55, 0.85], lift: [0.05, 0.07, 0.12],
    charTint: [1.0, 1.0, 1.02], fog: "#dfe9f3", fogNear: 40, fogFar: 260 },
  // cool lab / office fluorescent: neutral-green lit, grey-violet shade
  lab: { ...LIGHTS.day, az: 20, el: 60, lit: [1.6, 1.68, 1.55], shade: [0.36, 0.38, 0.46], lift: [0.05, 0.05, 0.06],
    charTint: [1.0, 1.02, 0.98], fog: "#2c3238", fogNear: 10, fogFar: 70 },
};
const SKY: Record<Light, string[]> = {
  day: ["#cfe2f4", "#a9cbee", "#79abe3", "#5592da", "#3a77cc"], golden: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"],
  inside: ["#3a2a2e", "#3a2a2e", "#3a2a2e", "#3a2a2e", "#3a2a2e"], night: ["#2a3d66", "#22355c", "#1b2b4f", "#152242", "#0f1a36"],
  arctic: ["#f2f5f8", "#e3ecf4", "#c9dcee", "#a9c7e6", "#86b0dc"], lab: ["#2c3238", "#2c3238", "#2c3238", "#2c3238", "#2c3238"],
};

// ---------------- painted textures (dark seams, a few flat colour fields, no photo noise) ----------------
const iceHD = () => ctex("iceHD", 1024, 1024, (g, r) => {
  const bands = ["#e8f1f8", "#dcebf5", "#d2e4f2", "#e2eef7", "#cbe0ef"];
  let y = 0;
  while (y < 1024) { const h = 90 + r() * 220; g.fillStyle = bands[Math.floor(r() * bands.length)];
    g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + y) * 10); g.lineTo(1024, y + h + 12); g.lineTo(0, y + h + 12); g.fill(); y += h; }
  g.globalAlpha = 0.35; g.fillStyle = "#ffffff";
  for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 6 + r() * 40, 3 + r() * 10, 0, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1; g.strokeStyle = "#7e9fc6"; g.lineWidth = 3; g.lineCap = "round";
  for (let i = 0; i < 9; i++) { let x = r() * 1024, yy = r() * 1024; g.beginPath(); g.moveTo(x, yy);
    for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 120; yy += 20 + r() * 70; g.lineTo(x, yy); } g.stroke(); }
});
const snowHD = () => ctex("snowHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#e9eff6"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? "#dfe8f2" : "#f4f7fb"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 30 + r() * 90, 12 + r() * 30, r() * 3, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = "#c9d6e6"; g.lineWidth = 3;
  for (let i = 0; i < 14; i++) { const x = r() * 1024, y = r() * 1024; g.beginPath(); g.ellipse(x, y, 9, 15, 0.3, 0, Math.PI * 2); g.stroke(); }
});
const steelHD = () => ctex("steelHD", 512, 512, (g) => {
  for (let x = 0; x < 512; x += 32) { g.fillStyle = "#9aa3ad"; g.fillRect(x, 0, 16, 512); g.fillStyle = "#838c97"; g.fillRect(x + 16, 0, 16, 512); }
  g.fillStyle = "#4b525c"; for (let x = 0; x < 512; x += 32) g.fillRect(x + 15, 0, 2, 512);
  g.fillRect(0, 0, 512, 3);
});
export const signTex = (key: string, w: number, h: number, bg: string, fg: string, text: string, font = "bold 72px sans-serif") =>
  ctex(key, w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = "#241726"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4);
  });
/** premium penguin sticker for the reactor door (our egg: "WRONG POLE"), drawn with eyes */
export const penguinSticker = () => ctex("penguinSticker", 512, 512, (g) => {
  g.fillStyle = "#f6f1e6"; g.beginPath(); g.arc(256, 256, 240, 0, Math.PI * 2); g.fill();
  g.lineWidth = 14; g.strokeStyle = "#241726"; g.stroke();
  g.fillStyle = "#1d2433"; g.beginPath(); g.ellipse(256, 270, 110, 150, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(256, 300, 72, 110, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(226, 200, 22, 0, 7); g.arc(286, 200, 22, 0, 7); g.fill();
  g.fillStyle = "#241726"; g.beginPath(); g.arc(230, 204, 10, 0, 7); g.arc(282, 204, 10, 0, 7); g.fill();
  g.fillStyle = "#f2a33a"; g.beginPath(); g.moveTo(240, 228); g.lineTo(272, 228); g.lineTo(256, 252); g.closePath(); g.fill();
  g.fillStyle = "#241726"; g.font = "bold 54px sans-serif"; g.textAlign = "center"; g.fillText("WRONG POLE", 256, 470);
});

export const glowTex = () => ctex("glowT", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
export type Mats = Record<string, THREE.Material>;
/** what a section's set builder gets (sets/a.ts, b.ts, c.ts). Each section owns its x-range of the world (see SECTION_X). */
export type SetCtx = {
  R: THREE.Group; b: Batch; M: Mats; kit: IceKit;
  lamp: (x: number, y: number, z: number, r?: number, floorY?: number, col?: [number, number, number]) => void;
  wash: (x: number, y: number, z: number, w: number, h: number, ry?: number, k?: number) => void;
  signTex: typeof signTex; placeProp: typeof placeProp; glowTex: typeof glowTex; penguinSticker: typeof penguinSticker;
  /** register a per-frame updater for an animated set piece; it is called every frame with (global frame, current shot set name) */
  onFrame: (fn: (f: number, set: string) => void) => void;
};
/** world x origins: core 0-300; section A 400-600; B 700-900; C 1000-1300 */
export const SECTION_X = { A: [400, 500, 600], B: [700, 800, 900], C: [1000, 1100, 1200, 1300] } as const;

// ---------------- generated assets (rick/stage2/public/ice): painted textures + hero props ----------------
const TEX = ["wall_planks", "floor_boards", "ice_wall", "snow_floor", "barber_tiles", "mess_wall", "crate_wood", "ice_sheet_day", "ice_sheet_golden"] as const;
const PROPS = ["barber_chair_tex", "bunk_bed_tex", "reactor_console_tex", "mess_table", "steel_desk", "snow_miller"] as const;
export type IceKit = { tex: Record<string, THREE.Texture>; props: Record<string, THREE.Object3D> };
let kitP: Promise<IceKit> | null = null;
export const loadIceKit = () => {
  if (!kitP) {
    const tl = new THREE.TextureLoader(), gl = new GLTFLoader();
    kitP = Promise.all([
      Promise.all(TEX.map((n) => tl.loadAsync(staticFile(`ice/tex/${n}.png`)).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return [n, t] as const; }))),
      Promise.all(PROPS.map((n) => gl.loadAsync(staticFile(`ice/lod/${n}.glb`)).then((g) => [n, g.scene] as const))),
    ]).then(([t, p]) => ({ tex: Object.fromEntries(t), props: Object.fromEntries(p) }));
  }
  return kitP;
};
/** a hero prop: toon-shaded (two-tone Lambert), feet on the floor, scaled to a real height in metres, yaw in radians */
const SOLID: Record<string, string> = { mess_table: "#b07a45", steel_desk: "#8d949c", snow_miller: "#e8b43a" };
export const placeProp = (kit: IceKit, name: string, parent: THREE.Object3D, x: number, y: number, z: number, height: number, yaw = 0) => {
  const src = kit.props[name]; if (!src) return;
  const c = src.clone(true);
  c.traverse((o) => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    const sm = m.material as THREE.MeshStandardMaterial;
    m.material = twoTone(new THREE.MeshLambertMaterial({ map: sm.map ?? null, color: sm.map ? "#ffffff" : SOLID[name] ?? "#cccccc" }));
    m.castShadow = true; m.receiveShadow = true;
  });
  const box = new THREE.Box3().setFromObject(c), s = height / (box.max.y - box.min.y);
  const g = new THREE.Group(); c.scale.setScalar(s); c.position.set(-(box.min.x + box.max.x) / 2 * s, -box.min.y * s, -(box.min.z + box.max.z) / 2 * s);
  g.add(c); g.position.set(x, y, z); g.rotation.y = yaw; parent.add(g); return g;
};
const SETS = { room: [0, 0, 0], main: [100, 0, 0], barber: [200, 0, 0], surface: [300, 0, 0] } as const;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private sun = new THREE.DirectionalLight("#fff0d6", 2.6);
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#9fb4cc", 30, 140);
  private ceiling: THREE.Mesh; // barber ceiling (moves down)
  private bulbs: THREE.Mesh[] = [];
  private marks: THREE.Mesh[] = [];
  private frameFns: ((f: number, set: string) => void)[] = []; // Hank's nightly pencil marks on the ice wall (each one lower)
  private halos: THREE.Mesh[] = [];
  /** warm lamp: additive halo that faces the lens + a pool of light on the floor (and optionally on a wall) */
  private lamp(x: number, y: number, z: number, r = 1.6, floorY = 0, col: [number, number, number] = [1.0, 0.62, 0.28]) {
    const mk = (k: number) => new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(col[0] * k, col[1] * k, col[2] * k), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(r, r), mk(1.1)); halo.position.set(x, y, z); halo.layers.set(NOINK); halo.renderOrder = 5;
    this.root.add(halo); this.halos.push(halo);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(r * 3.2, r * 3.2), mk(0.75)); pool.rotation.x = -Math.PI / 2; pool.position.set(x, floorY + 0.015, z);
    pool.layers.set(NOINK); pool.renderOrder = 4; this.root.add(pool);
  }
  private wash(x: number, y: number, z: number, w: number, h: number, ry = 0, k = 0.5) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(1.0 * k, 0.6 * k, 0.26 * k),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.set(x, y, z); m.rotation.y = ry; m.layers.set(NOINK); m.renderOrder = 4; this.root.add(m);
  }

  constructor(kit: IceKit) {
    const R = this.root, M: Mats = {};
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, 0.05, el)); c = mix(c, c2, smoothstep(0.05, 0.14, el));
          c = mix(c, c3, smoothstep(0.14, 0.28, el)); c = mix(c, c4, smoothstep(0.28, 0.7, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(PREVIEW ? 1536 : 4096, PREVIEW ? 1536 : 4096);
    R.add(this.sun, this.sun.target, new THREE.HemisphereLight("#dcecff", "#8a7a9a", 0.55));

    M.ice = lam("iceP", () => ({ map: rep(kit.tex.ice_wall, 1, 1) }));
    M.snow = lam("snowP", () => ({ map: rep(kit.tex.snow_floor, 1, 1), color: "#fbf3ea" }));
    M.steel = lam("steelHD", () => ({ map: rep(steelHD(), 1, 1) }));
    M.planks = lam("floorP", () => ({ map: rep(kit.tex.floor_boards, 1, 1) }));
    M.wallP = lam("wallP", () => ({ map: rep(kit.tex.wall_planks, 1, 1) }));
    M.tiles = lam("tilesP", () => ({ map: rep(kit.tex.barber_tiles, 1, 1) }));
    M.crate = lam("crateP", () => ({ map: rep(kit.tex.crate_wood, 1, 1) }));
    M.wood = lam("wallP2", () => ({ map: rep(kit.tex.wall_planks, 1, 1) }));
    M.cream = lam("cream", () => ({ color: "#efe3c8" }));
    M.olive = lam("olive", () => ({ color: "#6f7448" }));
    M.blanket = lam("blanket", () => ({ color: "#5c6a8a" }));
    M.iron = twoTone(new THREE.MeshPhongMaterial({ color: "#4a505c", specular: "#8a8a8a", shininess: 50 }), 0.15);
    M.red = lam("redPaint", () => ({ color: "#b8403a" }));
    M.leather = lam("leather", () => ({ color: "#7a3b2c" }));
    M.chrome = twoTone(new THREE.MeshPhongMaterial({ color: "#b9c0c8", specular: "#ffffff", shininess: 90 }), 0.15);
    const b = new Batch();

    // ===== ROOM (origin): Hank's bunk room built against the trench's ice wall =====
    {
      const [ox, , oz] = SETS.room;
      b.add(quad(V(ox - 2.2, 0, oz - 1.8), V(ox + 2.2, 0, oz - 1.8), V(ox + 2.2, 3.2, oz - 1.8), V(ox - 2.2, 3.2, oz - 1.8), 1.4, 1), M.ice); // ice wall (the one he shaves)
      b.add(quad(V(ox - 2.2, 0, oz + 3), V(ox + 2.2, 0, oz + 3), V(ox + 2.2, 0, oz - 1.8), V(ox - 2.2, 0, oz - 1.8), 2, 2.2), M.planks); // floor
      b.add(quad(V(ox - 2.2, 0, oz + 3), V(ox - 2.2, 0, oz - 1.8), V(ox - 2.2, 3.2, oz - 1.8), V(ox - 2.2, 3.2, oz + 3), 2.2, 1.4), M.wallP); // left wall
      b.add(quad(V(ox + 2.2, 0, oz - 1.8), V(ox + 2.2, 0, oz + 3), V(ox + 2.2, 3.2, oz + 3), V(ox + 2.2, 3.2, oz - 1.8), 2.2, 1.4), M.wallP); // right wall
      b.add(quad(V(ox - 2.2, 2.55, oz - 1.8), V(ox + 2.2, 2.55, oz - 1.8), V(ox + 2.2, 2.55, oz + 3), V(ox - 2.2, 2.55, oz + 3), 1.2, 1.2), M.ice); // ceiling (low: the ice is winning)
      placeProp(kit, "bunk_bed_tex", R, ox + 1.45, 0, oz - 0.55, 2.2, 0); // top bunk almost touching the ice ceiling
      b.add(boxGeo(V(ox - 2.0, 0, oz - 1.0), V(ox - 1.3, 0.75, oz - 0.3)), M.crate); // footlocker
      b.add(boxGeo(V(ox - 1.55, 1.3, oz - 1.78), V(ox - 1.05, 1.75, oz - 1.74)), M.chrome); // shaving mirror screwed to the ice
      const bulbR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.6) }));
      bulbR.position.set(ox + 0.3, 2.3, oz - 0.6); bulbR.layers.set(NOINK); R.add(bulbR);
      this.lamp(ox + 0.3, 2.3, oz - 0.6, 1.5); this.wash(ox + 0.2, 1.6, oz - 1.77, 4.2, 3.4, 0, 0.6);
      // lived-in clutter: boots, mug, pin-up calendar, pipe, towel on a nail
      b.add(boxGeo(V(ox - 1.2, 0, oz - 1.6), V(ox - 1.0, 0.28, oz - 1.3)), M.leather); b.add(boxGeo(V(ox - 0.95, 0, oz - 1.6), V(ox - 0.75, 0.28, oz - 1.3)), M.leather);
      b.add(boxGeo(V(ox - 1.75, 0.75, oz - 0.8), V(ox - 1.62, 0.9, oz - 0.67)), M.cream);
      b.add(boxGeo(V(ox + 0.55, 1.2, oz - 1.78), V(ox + 0.85, 1.75, oz - 1.76)), M.red);
      b.add(boxGeo(V(ox - 2.18, 0.2, oz - 1.2), V(ox - 2.1, 2.4, oz - 1.05)), M.iron);
      const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshBasicMaterial({ map: signTex("cal60", 384, 512, "#f6f1e6", "#b8403a", "1960", "bold 120px sans-serif") }));
      cal.position.set(ox - 1.3, 2.0, oz - 1.77); R.add(cal);
      // pencil height marks + day labels, revealed one per night by the shot (ShotDef.marks)
      const days = ["MON", "TUE", "WED", "THU", "FRI"];
      days.forEach((d, i) => {
        const y = 1.86 - i * 0.075;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.11), new THREE.MeshBasicMaterial({ map: ctex("mk" + d, 384, 124, (g) => {
          g.clearRect(0, 0, 384, 124); g.strokeStyle = "#2b2b3c"; g.lineWidth = 9; g.lineCap = "round";
          g.beginPath(); g.moveTo(14, 64 + i * 2); g.lineTo(170, 60 - i); g.stroke();
          g.fillStyle = "#2b2b3c"; g.font = "bold 66px sans-serif"; g.textBaseline = "middle"; g.fillText(d, 190, 64); }), transparent: true }));
        m.position.set(ox - 0.62, y, oz - 1.775); m.layers.set(NOINK); m.visible = false; R.add(m); this.marks.push(m);
      });
    }

    // ===== MAIN STREET (x=100): trench 8 m wide, steel arches, ice walls, wooden fronts =====
    {
      const [ox] = SETS.main, len = 70, w = 4.2, hTop = 7.5;
      b.add(quad(V(ox - w, 0, 12), V(ox + w, 0, 12), V(ox + w, 0, -len), V(ox - w, 0, -len), 3, 30), M.snow);
      for (const s of [-1, 1]) {
        const x = ox + s * w;
        b.add(s < 0 ? quad(V(x, 0, 12), V(x, 0, -len), V(x, hTop, -len), V(x, hTop, 12), 9, 1) : quad(V(x, 0, -len), V(x, 0, 12), V(x, hTop, 12), V(x, hTop, -len), 9, 1), M.ice);
      }
      // corrugated steel arch (half ellipse w x 3.6 m) springing from the top of the ice walls, faces inward
      const arcP = (k: number) => { const th = Math.PI * k; return [ox - Math.cos(th) * w, hTop - 0.4 + Math.sin(th) * 3.6] as [number, number]; };
      for (let i = 0; i < 24; i++) {
        const [x0, y0] = arcP(i / 24), [x1, y1] = arcP((i + 1) / 24);
        b.add(quad(V(x0, y0, 12), V(x1, y1, 12), V(x1, y1, -len - 2), V(x0, y0, -len - 2), 1, 26), M.steel);
      }
      for (let z = 10; z > -len; z -= 3) {
        const rib = new THREE.TorusGeometry(w - 0.06, 0.09, 6, 24, Math.PI); rib.scale(1, 3.6 / w, 1); rib.translate(ox, hTop - 0.4, z);
        b.add(rib, M.iron);
      }
      // building fronts: [side, z0, z1, height, kind]
      const fronts: [number, number, number, number, string][] = [[-1, 2, -8, 4.2, "theater"], [1, 0, -6, 3.6, "barber"], [-1, -12, -20, 4.8, "chapel"], [1, -10, -22, 3.8, "mess"], [-1, -25, -34, 4.0, "reactor"], [1, -26, -36, 3.6, "lab"]];
      for (const [s, z0, z1, h, kind] of fronts) {
        const xf = ox + s * (w - 1.0), xb = ox + s * (w - 0.35); // leave a gap to the ice (reference: keep walls off the ice)
        b.add(boxGeo(V(Math.min(xf, xb), 0, z1), V(Math.max(xf, xb), h, z0), 2), M.wood);
        b.add(boxGeo(V(Math.min(xf, xb) - 0.05, h, z1 - 0.1), V(Math.max(xf, xb) + 0.05, h + 0.18, z0 + 0.1)), M.cream);
        const door = (col: THREE.Material, zc: number, dw = 1.0, dh = 2.1) => b.add(boxGeo(V(xf - s * 0.04 - 0.02, 0, zc - dw / 2), V(xf - s * 0.04 + 0.02, dh, zc + dw / 2)), col);
        door(M.red, (z0 + z1) / 2);
        const sign = (key: string, text: string, bg: string, fg: string, wm: number) => {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(wm, 0.9), new THREE.MeshBasicMaterial({ map: signTex(key, 1024, 256, bg, fg, text) }));
          m.position.set(xf - s * 0.08, h - 0.7, (z0 + z1) / 2); m.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; R.add(m);
        };
        if (kind === "theater") sign("mTheater", "THE THING  TONIGHT", "#f6e7b0", "#b8403a", 5.2);
        if (kind === "barber") {
          sign("mBarber", "BARBER", "#f4f1ea", "#1f3d7a", 3.2);
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.1, 16), new THREE.MeshBasicMaterial({ map: ctex("pole", 128, 256, (g) => {
            g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 256);
            for (let i = -2; i < 8; i++) { g.fillStyle = i % 2 ? "#c23b44" : "#2a52a0"; g.beginPath(); g.moveTo(0, i * 48); g.lineTo(128, i * 48 + 60); g.lineTo(128, i * 48 + 84); g.lineTo(0, i * 48 + 24); g.fill(); }
          }) }));
          pole.position.set(xf - s * 0.25, 2.2, z0 - 0.4); R.add(pole);
        }
        if (kind === "chapel") sign("mChapel", "CHAPEL", "#efe3c8", "#3b2a1e", 2.8);
        if (kind === "mess") sign("mMess", "MESS HALL", "#efe3c8", "#3b4a2a", 4.2);
        if (kind === "lab") sign("mLab", "SNOW SCIENCE", "#e9eef4", "#1f3d7a", 4.0);
        if (kind === "reactor") {
          sign("mReactor", "PM-2A  REACTOR", "#f2d23a", "#241726", 4.0);
          const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 0.7) }));
          glow.position.set(xf - s * 0.07, 1.05, (z0 + z1) / 2 + 1.6); glow.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; glow.layers.set(NOINK); R.add(glow);
          const st = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({ map: penguinSticker(), transparent: true }));
          st.position.set(xf - s * 0.09, 1.5, (z0 + z1) / 2 - 0.2); st.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; R.add(st);
        }
      }
      const rr = (k: number) => { const v = Math.sin(k * 91.7) * 43758.5; return v - Math.floor(v); };
      for (let i = 0; i < 14; i++) {
        const s2 = i % 2 ? 1 : -1, z = 4 - i * 4.6 - rr(i) * 2, x = ox + s2 * (w - 1.6 - rr(i + 9) * 0.5);
        if (rr(i + 3) < 0.5) b.add(boxGeo(V(x - 0.4, 0, z - 0.4), V(x + 0.4, 0.75, z + 0.4), 1), M.crate);
        else { const bar = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16); bar.translate(x, 0.45, z); b.add(bar, rr(i + 5) < 0.5 ? M.red : M.olive); }
      }
      // hanging bulbs down the street (emissive: the only things that bloom)
      for (let z = 6; z > -len; z -= 6) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.6) }));
        bulb.position.set(ox, hTop - 2.0, z); bulb.layers.set(NOINK); R.add(bulb); this.bulbs.push(bulb); this.lamp(ox, hTop - 2.0, z, 2.6);
        b.add(boxGeo(V(ox - 0.01, hTop - 1.95, z - 0.01), V(ox + 0.01, hTop - 0.6, z + 0.01)), M.iron);
      }
    }

    // ===== BARBER SHOP (x=200): the ceiling has come down to 1.55 m =====
    {
      const [ox] = SETS.barber;
      b.add(quad(V(ox - 2.5, 0, 3), V(ox + 2.5, 0, 3), V(ox + 2.5, 0, -1.6), V(ox - 2.5, 0, -1.6), 3, 3), M.tiles);
      b.add(quad(V(ox - 2.5, 0, -1.6), V(ox + 2.5, 0, -1.6), V(ox + 2.5, 3, -1.6), V(ox - 2.5, 3, -1.6), 2, 1.2), M.wallP);
      b.add(quad(V(ox - 2.5, 0, 3), V(ox - 2.5, 0, -1.6), V(ox - 2.5, 3, -1.6), V(ox - 2.5, 3, 3), 2, 1.2), M.ice);
      b.add(quad(V(ox + 2.5, 0, -1.6), V(ox + 2.5, 0, 3), V(ox + 2.5, 3, 3), V(ox + 2.5, 3, -1.6), 2, 1.2), M.ice);
      b.add(boxGeo(V(ox - 0.9, 0.95, -1.58), V(ox + 0.9, 1.5, -1.52)), M.chrome); // mirror
      b.add(boxGeo(V(ox - 1.0, 0.75, -1.58), V(ox + 1.0, 0.82, -1.25)), M.wood); // counter
      placeProp(kit, "barber_chair_tex", R, ox - 0.3, 0, -0.75, 1.15, 0);
      b.add(boxGeo(V(ox + 0.3, 0, -0.5), V(ox + 0.6, 0.12, -0.2)), M.wood); // barber's low stool
    }
    this.ceiling = new THREE.Mesh(new THREE.PlaneGeometry(5, 4.6), M.ice);
    this.ceiling.rotation.x = Math.PI / 2; this.ceiling.position.set(200, 1.55, 0.7); R.add(this.ceiling);
    const signLow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.32), new THREE.MeshBasicMaterial({ map: signTex("mindHead", 768, 224, "#f2d23a", "#241726", "MIND YOUR HEAD", "bold 80px sans-serif") }));
    this.lamp(200.1, 1.42, -0.2, 1.3); this.wash(200, 0.9, -1.57, 4.6, 2.6, 0, 0.6);
    const bulbB = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.6) }));
    bulbB.position.set(200.1, 1.42, -0.2); bulbB.layers.set(NOINK); R.add(bulbB);
    signLow.position.set(201.4, 1.25, -1.55); signLow.rotation.z = Math.PI; R.add(signLow); // hung upside down (the gag)

    const ctx: SetCtx = { R, b, M, kit, lamp: (x, y, z, r, fy, col) => this.lamp(x, y, z, r, fy, col), wash: (x, y, z, ww, h, ry, k) => this.wash(x, y, z, ww, h, ry, k), signTex, placeProp, glowTex, penguinSticker,
      onFrame: (fn) => this.frameFns.push(fn) };
    buildA(ctx); buildB(ctx); buildC(ctx);
    for (const m of Object.values(M)) m.side = THREE.DoubleSide; // hand-wound quads: draw both faces
    b.build(R, true, 100);
    // tag every other set object with its 100 m region so update() can hide the sets the camera isn't in
    const bb = new THREE.Box3();
    for (const o of R.children) {
      if (o === this.sky || o.userData.region !== undefined || (o as THREE.Light).isLight) continue;
      bb.setFromObject(o); if (bb.isEmpty()) continue;
      o.userData.region = Math.round((bb.min.x + bb.max.x) / 2 / 100);
    }
    R.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.layers.mask !== (1 << NOINK)) { o.castShadow = true; o.receiveShadow = true; } });
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const s: ShotDef = SHOTS[id - 1], P = L[s.light];
    const c = camAt(s, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    // camera-relative key light, frozen per shot (lighting.md 9.4)
    const fwd = V(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize();
    const az = THREE.MathUtils.degToRad(P.az), el = THREE.MathUtils.degToRad(P.el);
    const right = V(-fwd.z, 0, fwd.x);
    const sunDir = fwd.clone().multiplyScalar(Math.cos(az)).addScaledVector(right, Math.sin(az)).multiplyScalar(Math.cos(el)).add(V(0, Math.sin(el), 0)).normalize();
    // the key light sits behind the camera side for interiors (bulbs over the lens), so faces stay lit
    if (s.light === "inside" || s.light === "night") sunDir.addScaledVector(fwd, -0.9).normalize();
    this.sun.color.set(P.sunCol); this.sun.intensity = P.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.2 + 6, 8, 80);
    this.sun.position.copy(focus).addScaledVector(sunDir, 120); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera; sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 10; sc.far = 260; sc.updateProjectionMatrix();
    this.sun.shadow.bias = P.bias; this.sun.shadow.normalBias = P.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...P.lit); TONE.uShadeCol.value.set(...P.shade); TONE.uShadeLift.value.set(...P.lift);
    TONE.uLambert.value = P.lambert; TONE.uSideK.value = P.sideK; TONE.uTerm.value = P.term; TONE.uBounce.value.set(0, 0, 0); TONE.uSat.value = 1.08;
    CHAR.uCharTint.value.set(...P.charTint); CHAR.uCharShade.value = P.charShade; CHAR.uGrad.value = P.charGrad;
    CHAR.uBodyGrad.value = P.bodyGrad; CHAR.uSideTint.value.set(...P.sideTint);
    SKY[s.light].forEach((h, i) => untone(h, this.skyMat.uniforms["c" + i].value));
    this.sky.position.copy(cam.position);
    for (const h of this.halos) h.quaternion.copy(cam.quaternion);
    untone(P.fog, this.fog.color); this.fog.near = P.fogNear; this.fog.far = P.fogFar; scene.fog = this.fog; scene.background = null;
    if (s.ceil) this.ceiling.position.y = s.ceil(f / FPS);
    const reg = Math.round(c.pos[0] / 100);
    for (const o of this.root.children) if (o.userData.region !== undefined) o.visible = o.userData.region === reg;
    for (const fn of this.frameFns) fn(f, s.set);
    if (s.anim) s.anim(f);
    const nm = s.marks ? s.marks(f) : 0; this.marks.forEach((m, i) => (m.visible = i < nm));

    // ---- cast: lit cards sized by distance + contact blobs ----
    const spots: Spot[] = s.cast ? s.cast(f) : [];
    const camRight = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const sx = sunDir.dot(camRight), sy = -sunDir.y, light = Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
    let ai = 0, fi = 0;
    const blink = (seed: number) => { const per = 1.4 + (seed % 5) * 0.2, ph = ((f / FPS + seed * 0.37) % per) / per; return ph < 0.045 ? (ph < 0.0225 ? 1 : 0.5) : false; };
    for (const p of spots) {
      const d = cam.position.distanceTo(V(p.x, p.y + 1.2, p.z)) / (p.scale ?? 1);
      const [w0, h0, k0]: [number, number, number] = d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
      const q = PREVIEW ? 0.5 : 1, w = Math.round(w0 * q), h = Math.round(h0 * q), k = k0 * q;
      const fo: FrontOpts = { mode: p.mode ?? "stand", expr: p.expr ?? "neutral", phase: p.phase ?? 0, facing: p.facing ?? 0, look: p.look ?? 0,
        light, seed: p.seed ?? 1, blink: blink(p.seed ?? 1), headTilt: p.headTilt ?? 0, tilt: p.tilt ?? 0, prop: p.prop ?? null, talk: p.talk ?? 0, ...(p.wave !== undefined ? { wave: p.wave } : {}) };
      const key = `F|${p.key}|${JSON.stringify(fo)}`;
      const a = this.actor(ai++);
      a.r = this.pool.req(key, w, h, k, (pen: Pen) => bodyFront(pen, p.who, fo));
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      const sc2 = p.scale ?? 1; a.mesh.scale.set(sc2, sc2, sc2); a.mesh.castShadow = false;
      const e = this.fx(fi++); e.r = this.pool.req("blob|contact|#3a3f5a", 128, 128, 1, (pen) => fxContact(pen, "#3a3f5a"));
      e.use(false); e.mesh.visible = true; e.mesh.position.set(p.x, p.y + 0.02, p.z); e.mesh.rotation.set(-Math.PI / 2, 0, 0); e.mesh.scale.set(0.55 * sc2, 0.42 * sc2, 1);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of this.actors) if (a.mesh.visible) a.bind();
    for (const e of this.fxs) if (e.mesh.visible) e.bind();
    return focus;
  }
}
