// node stills.mjs <outPrefix> <f,f,...> [scale]   renders stills with software GL (no GPU)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
const browserExecutable = process.env.CHROME || "/usr/bin/google-chrome";
const chromiumOptions = { gl: process.env.GL || "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.ENTRY || "src/index.tsx"), publicDir: path.resolve("public") });
const comp = process.env.COMP || "BridgeShort";
const inputProps = JSON.parse(process.env.PROPS || "{}");
const composition = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions, inputProps });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, inputProps, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000, onBrowserLog });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
