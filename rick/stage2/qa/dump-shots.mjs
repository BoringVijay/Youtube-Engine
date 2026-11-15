// node qa/dump-shots.mjs <story.ts> <out.json>: shot frame ranges for short_qa.py (portal starts and flashes count as planned cuts)
import { build } from "esbuild";
const [entry, out, fl] = process.argv.slice(2);
const flash = fl ? fl.split(",").map(Number) : null; // optional planned white flash "a,b"
await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outfile: "/tmp/_story.mjs", loader: { ".json": "json" }, logLevel: "error" });
const m = await import("/tmp/_story.mjs?" + Date.now());
const fs = await import("node:fs"); fs.writeFileSync(out, JSON.stringify({ shots: m.SHOTS.map((s) => ({ id: s.id, a: s.a, b: s.b })), planned: [...(m.PORTALS ?? [])].map((a) => [a - 11, a + 11]), ...(flash ? { flash } : {}) }));
