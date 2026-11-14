// The City the Ice Ate: our own cast (1960 US Army under the Greenland ice). Drawn in code with the bridge toon kit.
import { Outfit, INK, SKINS } from "../bridge/toon";

const OLIVE = "#6b7046", OLIVE_D = "#4f5434", PARKA = "#7a7b4c";
export const HANK: Outfit = { jacket: "#c8443b", pants: "#c8443b", boots: "#e9e2d0", hat: "hair", hair: "#7a4a2a", skin: SKINS[0] }; // red long johns, wool socks
export const HANK_PARKA: Outfit = { jacket: PARKA, pants: OLIVE_D, boots: "#3a2e26", hat: "hood", hood: PARKA, fur: "#efe6d2", skin: SKINS[0] };
export const SERGEANT: Outfit = { jacket: OLIVE, pants: OLIVE_D, boots: INK, hat: "cap", cap: OLIVE_D, moustache: "#3b2a1e", build: "stout", skin: SKINS[1], buttons: "#c9b46a" };
export const soldierIce = (v = 0): Outfit => ({ jacket: v % 2 ? OLIVE : PARKA, pants: OLIVE_D, boots: "#3a2e26", hat: v % 3 === 0 ? "hood" : "cap", hood: PARKA,
  cap: OLIVE_D, fur: "#efe6d2", skin: SKINS[v % 4], moustache: v % 4 === 1 ? "#4a3426" : undefined });
export const BARBER: Outfit = { jacket: "#f4f1ea", pants: "#3b3f52", boots: "#2a2420", hat: "hair", hair: "#2a2420", moustache: "#2a2420", skin: SKINS[3] };
export const SCIENTIST: Outfit = { jacket: "#e9e6dc", pants: "#4a4f5c", boots: "#2a2420", hat: "hair", hair: "#b9b2a6", skin: SKINS[2] };
export const GENERAL: Outfit = { jacket: OLIVE, pants: OLIVE_D, boots: INK, hat: "cap", cap: OLIVE_D, buttons: "#e8c45a", build: "stout", skin: SKINS[0] };
export const DANE: Outfit = { jacket: "#c23b44", pants: "#3b4a6a", boots: "#4a3426", hat: "hair", hair: "#e3c98a", skin: SKINS[0] }; // red knit sweater
export const COOK: Outfit = { jacket: "#f4f1ea", pants: OLIVE_D, boots: "#2a2420", hat: "cap", cap: "#f4f1ea", skin: SKINS[1] };
export const CAST = { HANK, HANK_PARKA, SERGEANT, BARBER, SCIENTIST, GENERAL, DANE, COOK };
