// Nvidia two-parter: ONE cast, shared by video A (Jensen's rise) and video B (Alice's side). Drawn in code with the bridge toon kit.
// Rule: a character never changes design between the videos, only the era props (Jensen's hair colour is the clock).
import { Outfit, INK, SKINS } from "../bridge/toon";

const LEATHER = "#1d1d24", JEANS = "#2f3a52";
/** Jensen by era: hair is the clock (black 1993, salt and pepper 2012, silver 2016+). The leather jacket arrives in 2016. */
export const JENSEN_1993: Outfit = { jacket: "#c9d3e0", pants: "#4a4f5c", boots: "#2a2420", hat: "hair", hair: "#17141a", skin: SKINS[2], buttons: "#c9d3e0" }; // young: plain shirt
export const JENSEN_TEEN: Outfit = { jacket: "#d9473b", pants: "#3b3f52", boots: "#2a2420", hat: "cap", cap: "#d9473b", skin: SKINS[2] };    // Denny's dishwasher
export const JENSEN_2012: Outfit = { jacket: "#34495e", pants: "#2f3a52", boots: "#2a2420", hat: "hair", hair: "#6b6872", skin: SKINS[2], buttons: "#34495e" };
export const JENSEN: Outfit = { jacket: LEATHER, pants: "#26262c", boots: "#17141a", hat: "hair", hair: "#cfd0d6", skin: SKINS[2], buttons: "#8a8a96", build: "adult" }; // THE look
/** Alice (invented cartoon design, not a likeness): cream blazer, long black hair, signature red handbag + sunglasses pushed up */
export const ALICE: Outfit = { jacket: "#efe4cf", pants: "#efe4cf", boots: "#7a2231", hat: "hair", hair: "#16121a", skin: SKINS[1], buttons: "#b8923a", dress: "#efe4cf" };
// supporting cast: designed once, reused in both videos
export const SUIT: Outfit = { jacket: "#3a4258", pants: "#2c3144", boots: INK, hat: "hair", hair: "#2a2420", skin: SKINS[0], buttons: "#c9b46a" };
export const AGENT: Outfit = { jacket: "#2d3a4f", pants: "#2d3a4f", boots: INK, hat: "cap", cap: "#222a3a", skin: SKINS[3], buttons: "#c9b46a", build: "stout" };
export const INTERN: Outfit = { jacket: "#5ab0a0", pants: "#4a4f5c", boots: "#f4f1ea", hat: "hair", hair: "#e3c98a", skin: SKINS[0], build: "kid" };
export const GEEK: Outfit = { jacket: "#8a5ac9", pants: "#3b3f52", boots: "#2a2420", hat: "hair", hair: "#5a3b2a", skin: SKINS[1] };
export const CAST = { JENSEN, JENSEN_1993, JENSEN_TEEN, JENSEN_2012, ALICE, SUIT, AGENT, INTERN, GEEK };
export const crowd = (v = 0): Outfit => ({ jacket: ["#d9473b", "#3b82c4", "#e0b43a", "#5ab07a", "#8a5ac9", "#e07a3a"][v % 6], pants: "#3b3f52", boots: "#2a2420", hat: v % 3 === 0 ? "cap" : "hair",
  cap: ["#d9473b", "#3b82c4", "#222a3a"][v % 3], hair: ["#2a2420", "#7a4a2a", "#17141a", "#b9b2a6"][v % 4], skin: SKINS[v % 4] });
