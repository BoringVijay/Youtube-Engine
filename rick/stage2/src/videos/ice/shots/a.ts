// Section A shots (12.4-22.2 s). Only the section-A helper edits this file.
// "Officially, they study snow." / "Unofficially, the army wants six hundred nuclear missiles on trains under this ice," /
// "and nobody told Denmark, who owns it."
import { ShotPart, sec, S } from "../timeline";
import { Outfit } from "../../bridge/toon";
import { CAST, soldierIce } from "../cast";
import { A_SURF as X1, A_WAR as X2, A_DK as X3 } from "../sets/a";

/** the cover-story scientist in an orange survey parka: reads against the white sheet */
const SCI_PARKA: Outfit = { ...CAST.SCIENTIST, jacket: "#e8742e", pants: "#3b4a6a", boots: "#3a2e26", hat: "hood", hood: "#e8742e", fur: "#efe6d2" };

export const SHOTS_A: ShotPart[] = [
  // A1 (12.4-14.3): the cover story. A tiny scientist kneels on the endless sheet, measuring one snowdrift with a ruler.
  //   Behind him, the giveaways: a steaming vent pipe and a periscope in the "empty" snow.
  { a: sec(12.4), b: sec(14.3), light: "arctic", set: "a_surface", cInf: 9,
    cams: [{ f: sec(12.4), pos: [X1 - 0.8, 3.4, 7.5], look: [X1 + 0.6, 0.4, -2.5], fov: 50 },
           { f: sec(13.4), dur: sec(1.0), pos: [X1 + 0.1, 0.95, 2.4], look: [X1 + 0.55, 0.55, -0.4], fov: 46 }],
    cast: (f) => [
      { who: SCI_PARKA, key: "sci", x: X1 + 0.3, y: 0, z: -0.3, mode: "sit", facing: 1, seed: 11, expr: "neutral", look: 0.6,
        prop: ["pencil", S(f) * 0.7] },
    ] },
  // A2 (14.3-16.45): the war room. The general chalks a big red 600 on the Project Iceworm blueprint, grinning.
  { a: sec(14.3), b: sec(16.45), light: "lab", set: "a_war", cInf: 10,
    cams: [{ f: sec(14.3), pos: [X2 + 0.2, 1.75, 3.8], look: [X2 - 0.2, 1.75, -2.9], fov: 54 },
           { f: sec(16.45), dur: sec(2.15), pos: [X2 + 0.45, 1.75, 1.7], look: [X2 + 0.1, 1.8, -2.9], fov: 46 }],
    cast: (f) => {
      const t = S(f);
      return [
        { who: CAST.GENERAL, key: "gen", x: X2 + 0.75, y: 0, z: -2.45, mode: "stand", facing: -1, seed: 13,
          expr: t < 15.4 ? "smile" : "grin", look: -0.5, prop: ["pencil", t * 1.2] },
        { who: soldierIce(1), key: "aide", x: X2 - 2.4, y: 0, z: -1.6, mode: "stand", facing: 1, seed: 14, expr: t < 15.9 ? "neutral" : "shock", look: 0.8 },
      ];
    } },
  // A3 (16.45-19.6): down at table height, a toy train of red missiles runs the carved tunnel grid... then at "under this
  //   ice" the camera rises to the general leaning in behind the diorama, delighted.
  { a: sec(16.45), b: sec(19.6), light: "lab", set: "a_war", cInf: 14,
    cams: [{ f: sec(16.45), pos: [X2 - 1.2, 1.45, 1.95], look: [X2 - 0.3, 0.86, 0.7], fov: 42 },
           { f: sec(18.1), dur: sec(1.6), pos: [X2 - 0.2, 1.45, 2.0], look: [X2 + 0.55, 0.86, 0.7], fov: 42 },
           { f: sec(18.9), dur: 22, pos: [X2 + 0.1, 1.5, 2.9], look: [X2 + 0.1, 1.3, -0.6], fov: 46 }],
    cast: (f) => {
      const t = S(f);
      return [
        { who: CAST.GENERAL, key: "gen", x: X2 + 0.15, y: 0, z: -0.55, mode: "stand", facing: 0, seed: 13, expr: t < 18.2 ? "smile" : "grin", look: 0 },
      ];
    } },
  // A4 (19.6-22.2): Copenhagen. The man in charge of Greenland reads "ALL QUIET IN GREENLAND" with his coffee.
  //   At "who owns it" the paper drops and he looks straight into the lens, pleased.
  { a: sec(19.6), b: sec(22.2), light: "inside", set: "a_dk", cInf: 11,
    cams: [{ f: sec(19.6), pos: [X3 + 0.55, 1.45, 3.1], look: [X3 + 0.1, 1.2, -0.6], fov: 48 },
           { f: sec(20.9), dur: sec(1.3), pos: [X3 + 0.45, 1.4, 2.6], look: [X3 + 0.1, 1.2, -0.6], fov: 48 },
           { f: sec(21.25), dur: 10, pos: [X3 + 0.12, 1.32, 1.45], look: [X3, 1.25, -0.3], fov: 40 }],
    cast: (f) => {
      const t = S(f);
      return [
        { who: CAST.DANE, key: "dane", x: X3, y: 0.3, z: -0.3, mode: "sit", facing: 0, seed: 15,
          expr: t < 20.96 ? "smile_closed" : "smile", look: 0 },
      ];
    } },
];
