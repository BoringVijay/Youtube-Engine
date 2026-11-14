import React, { useEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { Pen, bodyFront, Expr, Outfit } from "../bridge/toon";
import { CAST, soldierIce } from "./cast";

const ROWS: [string, Outfit, Expr][] = [
  ["Hank", CAST.HANK, "neutral"], ["Hank (parka)", CAST.HANK_PARKA, "nervous"], ["Sergeant", CAST.SERGEANT, "laugh"],
  ["Barber", CAST.BARBER, "stern"], ["Scientist", CAST.SCIENTIST, "grin"], ["General", CAST.GENERAL, "stern"],
  ["Dane", CAST.DANE, "smile"], ["Cook", CAST.COOK, "whistle"], ["Soldier 0", soldierIce(0), "shock"], ["Soldier 1", soldierIce(1), "dazed"],
  ["Soldier 2", soldierIce(2), "pained"], ["Soldier 3", soldierIce(3), "relief"],
];
export const CastSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, g = c.getContext("2d")!;
    g.fillStyle = "#cfe0ee"; g.fillRect(0, 0, c.width, c.height);
    ROWS.forEach(([name, o, expr], i) => {
      const col = i % 4, row = Math.floor(i / 4), s = 0.42;
      g.setTransform(s, 0, 0, s, col * 270 + 10, row * 600 + 40);
      bodyFront(new Pen(g), o, { mode: "stand", expr, seed: i + 2 });
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = "#241726"; g.font = "bold 26px sans-serif"; g.fillText(name, col * 270 + 20, row * 600 + 470);
    });
  }, []);
  return <AbsoluteFill><canvas ref={ref} width={1080} height={1920} /></AbsoluteFill>;
};
