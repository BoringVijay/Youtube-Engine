// Shot timeline: merged from shots/a.ts, b.ts, c.ts (one file per section helper), sorted by start frame, ids are 1-based positions.
import { VO_END, ShotDef } from "./timeline";
import { SHOTS_A } from "./shots/a";
import { SHOTS_B } from "./shots/b";
import { SHOTS_C } from "./shots/c";
export * from "./timeline";

export const SHOTS: ShotDef[] = [...SHOTS_A, ...SHOTS_B, ...SHOTS_C].sort((x, y) => x.a - y.a).map((s, i) => ({ ...s, id: i + 1 }));
export const TOTAL = VO_END;
/** start frames of shots entered through a portal fly-through (ShotDef.portal) instead of a hard cut */
export const PORTALS = new Set(SHOTS.filter((s) => s.portal).map((s) => s.a));
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
