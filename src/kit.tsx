// Reusable design kit: palette, fonts, stickman, captions.
import React from 'react';
import {interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';

export const C = {
  paper: '#F3EFE6',
  ink: '#141414',
  night: '#0E1016',
  accent: '#FF5A1F',
  soft: '#8C8678',
  sea: '#2F6BFF',
};

export const Fonts: React.FC = () => (
  <style>{`
    @font-face{font-family:Inter;font-weight:500;src:url(${staticFile('inter-latin-500-normal.woff2')}) format('woff2');}
    @font-face{font-family:Inter;font-weight:800;src:url(${staticFile('inter-latin-800-normal.woff2')}) format('woff2');}
    @font-face{font-family:Inter;font-weight:900;src:url(${staticFile('inter-latin-900-normal.woff2')}) format('woff2');}
  `}</style>
);

export const ease = Easing.bezier(0.22, 1, 0.36, 1);

export const useIn = (delay = 0, dur = 18) => {
  const f = useCurrentFrame();
  return interpolate(f - delay, [0, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
};

// Word-by-word pop caption. Words wrapped in *stars* get the accent colour.
export const Caption: React.FC<{text: string; delay?: number; size?: number; color?: string; y?: number}> = ({
  text, delay = 0, size = 92, color = C.ink, y = 260,
}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  return (
    <div style={{position: 'absolute', top: y, left: 80, right: 80, textAlign: 'center', fontFamily: 'Inter', fontWeight: 900,
      fontSize: size, lineHeight: 1.05, letterSpacing: -2, color}}>
      {words.map((w, i) => {
        const s = spring({frame: f - delay - i * 4, fps, config: {damping: 14, stiffness: 180}});
        const hot = w.startsWith('*');
        const clean = w.replace(/\*/g, '');
        return (
          <span key={i} style={{display: 'inline-block', marginRight: '0.24em', opacity: s,
            transform: `translateY(${(1 - s) * 40}px) scale(${0.85 + 0.15 * s})`, color: hot ? C.accent : color}}>
            {clean}
          </span>
        );
      })}
    </div>
  );
};

export type Pose = {la: number; ra: number; ll: number; rl: number; head?: number; lean?: number};
export const POSES: Record<string, Pose> = {
  stand: {la: 200, ra: 160, ll: 190, rl: 170},
  lookUp: {la: 210, ra: 150, ll: 190, rl: 170, head: -18, lean: -4},
  shock: {la: 320, ra: 40, ll: 195, rl: 165, head: 0},
  shrug: {la: 250, ra: 110, ll: 190, rl: 170, head: 8},
  point: {la: 200, ra: 75, ll: 190, rl: 170, head: -6},
};

const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  la: a.la + (b.la - a.la) * t, ra: a.ra + (b.ra - a.ra) * t,
  ll: a.ll + (b.ll - a.ll) * t, rl: a.rl + (b.rl - a.rl) * t,
  head: (a.head ?? 0) + ((b.head ?? 0) - (a.head ?? 0)) * t,
  lean: (a.lean ?? 0) + ((b.lean ?? 0) - (a.lean ?? 0)) * t,
});

const limb = (x: number, y: number, deg: number, len: number) => {
  const r = ((deg - 90) * Math.PI) / 180; // 0deg = straight up, 180 = straight down
  return {x: x + Math.cos(r) * len, y: y + Math.sin(r) * len};
};

// Stickman with eased pose changes and a gentle idle breath.
export const Stick: React.FC<{x: number; y: number; scale?: number; from: Pose; to?: Pose; at?: number; dur?: number; color?: string}> = ({
  x, y, scale = 1, from, to, at = 0, dur = 10, color = C.ink,
}) => {
  const f = useCurrentFrame();
  const t = to ? interpolate(f - at, [0, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease}) : 0;
  const p = to ? lerpPose(from, to, t) : from;
  const breath = Math.sin(f / 9) * 3;
  const hip = {x: 0, y: 0};
  const neck = {x: Math.sin(((p.lean ?? 0) * Math.PI) / 180) * 150, y: -150 + breath};
  const la = limb(neck.x, neck.y + 20, p.la, 120);
  const ra = limb(neck.x, neck.y + 20, p.ra, 120);
  const ll = limb(hip.x, hip.y, p.ll, 150);
  const rl = limb(hip.x, hip.y, p.rl, 150);
  const sw = {stroke: color, strokeWidth: 14, strokeLinecap: 'round' as const, fill: 'none'};
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <line x1={hip.x} y1={hip.y} x2={neck.x} y2={neck.y} {...sw} />
      <line x1={neck.x} y1={neck.y + 20} x2={la.x} y2={la.y} {...sw} />
      <line x1={neck.x} y1={neck.y + 20} x2={ra.x} y2={ra.y} {...sw} />
      <line x1={hip.x} y1={hip.y} x2={ll.x} y2={ll.y} {...sw} />
      <line x1={hip.x} y1={hip.y} x2={rl.x} y2={rl.y} {...sw} />
      <g transform={`rotate(${p.head ?? 0} ${neck.x} ${neck.y})`}>
        <circle cx={neck.x} cy={neck.y - 52} r={50} {...sw} fill={color === C.ink ? C.paper : C.night} />
        <circle cx={neck.x - 16} cy={neck.y - 58} r={5} fill={color} />
        <circle cx={neck.x + 16} cy={neck.y - 58} r={5} fill={color} />
      </g>
    </g>
  );
};
