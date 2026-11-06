// Data-driven episode. The planner turns a script into scenes; each scene picks a template.
// Works in 16:9 (long) and 9:16 (Shorts): everything is laid out in units of `u` = shorter side / 1080.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {THEMES, Theme} from './theme';
import {Icon} from './icons';
import {POSES, Pose} from '../kit';

export type Scene = {
  start: number; dur: number; template: string; vo?: string;
  title?: string; sub?: string; value?: number; prefix?: string; suffix?: string; label?: string;
  icon?: string; icons?: {icon: string; label: string}[]; items?: string[];
  bars?: {label: string; value: number}[]; points?: number[];
  left?: {title: string; value?: string; icon?: string}; right?: {title: string; value?: string; icon?: string};
  pose?: string; pose2?: string; say?: string; doubt?: string; from?: string; to?: string;
};
export type EpisodeProps = {
  theme: string; scenes: Scene[]; audio: {src: string; start: number; volume?: number}[];
  bed?: string; watermark?: string; captions?: boolean;
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const ThemeCtx = React.createContext<Theme>(THEMES.whatif);
const useT = () => React.useContext(ThemeCtx);
const useU = () => {const {width, height} = useVideoConfig(); return {u: Math.min(width, height) / 1080, w: width, h: height, tall: height > width};};
const useIn = (d = 0, dur = 16) => {const f = useCurrentFrame(); return interpolate(f - d, [0, dur], [0, 1], {...clamp, easing: ease});};
const useSpring = (d = 0) => {const f = useCurrentFrame(); const {fps} = useVideoConfig(); return spring({frame: f - d, fps, config: {damping: 14, stiffness: 160}});};

const Fonts: React.FC = () => (
  <style>{`
    @font-face{font-family:Inter;font-weight:500;src:url(${staticFile('inter-latin-500-normal.woff2')}) format('woff2');}
    @font-face{font-family:Inter;font-weight:800;src:url(${staticFile('inter-latin-800-normal.woff2')}) format('woff2');}
    @font-face{font-family:Inter;font-weight:900;src:url(${staticFile('inter-latin-900-normal.woff2')}) format('woff2');}
  `}</style>
);

// Accent words: *word* in titles.
const Rich: React.FC<{text: string; stagger?: number; delay?: number}> = ({text, stagger = 3, delay = 0}) => {
  const T = useT(); const f = useCurrentFrame(); const {fps} = useVideoConfig();
  return <>{(text || '').split(' ').map((w, i) => {
    const s = spring({frame: f - delay - i * stagger, fps, config: {damping: 15, stiffness: 190}});
    const hot = w.includes('*');
    return <span key={i} style={{display: 'inline-block', marginRight: '0.24em', opacity: s, color: hot ? T.accent : undefined,
      transform: `translateY(${(1 - s) * 0.4}em)`}}>{w.replace(/\*/g, '')}</span>;
  })}</>;
};

const Backdrop: React.FC = () => {
  const T = useT(); const f = useCurrentFrame(); const {w, h, u} = useU();
  const drift = (f / 3) % (60 * u);
  return (
    <AbsoluteFill style={{background: `radial-gradient(120% 90% at 50% 40%, ${T.bg} 0%, ${T.bg2} 100%)`}}>
      {T.pattern === 'grid' && <svg width={w} height={h} style={{position: 'absolute', opacity: 0.12}}>
        <defs><pattern id="g" width={60 * u} height={60 * u} patternUnits="userSpaceOnUse" patternTransform={`translate(${drift} ${drift})`}>
          <path d={`M ${60 * u} 0 L 0 0 0 ${60 * u}`} fill="none" stroke={T.ink} strokeWidth={1.5} /></pattern></defs>
        <rect width={w} height={h} fill="url(#g)" /></svg>}
      {T.pattern === 'halftone' && <svg width={w} height={h} style={{position: 'absolute', opacity: 0.14}}>
        <defs><pattern id="d" width={26 * u} height={26 * u} patternUnits="userSpaceOnUse"><circle cx={13 * u} cy={13 * u} r={4 * u} fill={T.ink} /></pattern></defs>
        <rect width={w} height={h} fill="url(#d)" /></svg>}
      {T.pattern === 'grain' && <AbsoluteFill style={{opacity: 0.08, background: `repeating-linear-gradient(0deg, ${T.ink} 0 1px, transparent 1px 3px)`}} />}
      {T.pattern === 'split' && <AbsoluteFill style={{background: `linear-gradient(100deg, ${T.accent}22 0 49.8%, ${T.accent2}22 50.2% 100%)`}} />}
      <AbsoluteFill style={{boxShadow: `inset 0 0 ${220 * u}px ${T.bg2}`}} />
    </AbsoluteFill>
  );
};

const Center: React.FC<{children: React.ReactNode; top?: number}> = ({children, top}) => {
  const {u} = useU();
  return <AbsoluteFill style={{alignItems: 'center', justifyContent: top === undefined ? 'center' : 'flex-start', paddingTop: top, padding: `0 ${90 * u}px`, textAlign: 'center'}}>{children}</AbsoluteFill>;
};

const Headline: React.FC<{text?: string; size?: number; delay?: number}> = ({text, size = 110, delay = 0}) => {
  const T = useT(); const {u} = useU();
  if (!text) return null;
  return <div style={{fontFamily: 'Inter', fontWeight: 900, fontSize: size * u, lineHeight: 1.02, letterSpacing: -0.03 * size * u, color: T.ink}}><Rich text={text} delay={delay} /></div>;
};
const Sub: React.FC<{text?: string; delay?: number}> = ({text, delay = 10}) => {
  const T = useT(); const {u} = useU(); const o = useIn(delay);
  if (!text) return null;
  return <div style={{fontFamily: 'Inter', fontWeight: 500, fontSize: 44 * u, color: T.soft, marginTop: 28 * u, opacity: o, transform: `translateY(${(1 - o) * 20}px)`}}>{text}</div>;
};

// ---------- templates ----------
const Title: React.FC<{s: Scene}> = ({s}) => <Center><Headline text={s.title} size={130} /><Sub text={s.sub} /></Center>;

const Stat: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u, tall} = useU(); const f = useCurrentFrame();
  const p = interpolate(f, [4, 40], [0, 1], {...clamp, easing: ease});
  const v = (s.value ?? 0) * p;
  const big = Math.abs(s.value ?? 0);
  const shown = big >= 1e5 ? fmt(v) : big >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed((s.value ?? 0) % 1 ? 1 : 0);
  const chars = `${s.prefix || ''}${big >= 1e5 ? fmt(big) : Math.round(big).toLocaleString('en-US')}${s.suffix || ''}`.length;
  const fs = Math.min(230, (tall ? 1500 : 2400) / Math.max(1, chars) * 1.15);
  return <Center>
    {s.icon && <svg width={220 * u} height={220 * u} viewBox="-110 -110 220 220" style={{marginBottom: 20 * u, opacity: useIn(0)}}><Icon name={s.icon} color={T.ink} accent={T.accent} t={f} /></svg>}
    <div style={{fontFamily: 'Inter', fontWeight: 900, fontSize: fs * u, letterSpacing: -0.04 * fs * u, color: T.accent, lineHeight: 1, whiteSpace: 'nowrap'}}>{s.prefix}{shown}{s.suffix}</div>
    <div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 56 * u, color: T.ink, marginTop: 20 * u, opacity: useIn(18)}}>{s.label}</div>
    <Sub text={s.sub} delay={26} />
  </Center>;
};

const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({la: a.la + (b.la - a.la) * t, ra: a.ra + (b.ra - a.ra) * t, ll: a.ll + (b.ll - a.ll) * t, rl: a.rl + (b.rl - a.rl) * t,
  head: (a.head ?? 0) + ((b.head ?? 0) - (a.head ?? 0)) * t, lean: (a.lean ?? 0) + ((b.lean ?? 0) - (a.lean ?? 0)) * t});
const limb = (x: number, y: number, deg: number, len: number) => {const r = ((deg - 90) * Math.PI) / 180; return {x: x + Math.cos(r) * len, y: y + Math.sin(r) * len};};
const Figure: React.FC<{x: number; y: number; scale: number; pose?: string; pose2?: string; color: string; fill: string; at?: number; flip?: boolean}> = ({x, y, scale, pose = 'stand', pose2, color, fill, at = 20, flip}) => {
  const f = useCurrentFrame();
  const a = POSES[pose] || POSES.stand; const b = pose2 ? POSES[pose2] || a : a;
  const p = lerpPose(a, b, interpolate(f - at, [0, 10], [0, 1], {...clamp, easing: ease}));
  const br = Math.sin(f / 9) * 3; const neck = {x: Math.sin(((p.lean ?? 0) * Math.PI) / 180) * 150, y: -150 + br};
  const sw = {stroke: color, strokeWidth: 14, strokeLinecap: 'round' as const, fill: 'none'};
  const L = (deg: number, fromNeck: boolean, len: number) => {const o = fromNeck ? {x: neck.x, y: neck.y + 20} : {x: 0, y: 0}; const e = limb(o.x, o.y, deg, len); return <line x1={o.x} y1={o.y} x2={e.x} y2={e.y} {...sw} />;};
  const blink = f % 90 > 86;
  return <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
    <line x1={0} y1={0} x2={neck.x} y2={neck.y} {...sw} />{L(p.la, true, 120)}{L(p.ra, true, 120)}{L(p.ll, false, 150)}{L(p.rl, false, 150)}
    <g transform={`rotate(${p.head ?? 0} ${neck.x} ${neck.y})`}>
      <circle cx={neck.x} cy={neck.y - 52} r={50} {...sw} fill={fill} />
      {blink ? <path d={`M${neck.x - 22} ${neck.y - 58}h12M${neck.x + 10} ${neck.y - 58}h12`} {...sw} strokeWidth={5} /> :
        <><circle cx={neck.x - 16} cy={neck.y - 58} r={5} fill={color} /><circle cx={neck.x + 16} cy={neck.y - 58} r={5} fill={color} /></>}
    </g>
  </g>;
};

const Bubble: React.FC<{text: string; x: number; y: number; delay: number; color: string; ink: string; maxW: number; side?: 'l' | 'r'}> = ({text, x, y, delay, color, ink, maxW, side = 'l'}) => {
  const {u} = useU(); const s = useSpring(delay);
  return <div style={{position: 'absolute', left: side === 'l' ? x - maxW : x, top: y, width: maxW, display: 'flex', justifyContent: side === 'l' ? 'flex-end' : 'flex-start', transform: `translateY(-100%) scale(${s})`, transformOrigin: side === 'l' ? '100% 100%' : '0% 100%'}}><div style={{
    background: color, color: ink, fontFamily: 'Inter', fontWeight: 800, fontSize: 46 * u, lineHeight: 1.1, padding: `${22 * u}px ${30 * u}px`, borderRadius: 30 * u, textAlign: 'center'}}>{text}</div></div>;
};

const Stick: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u, w, h, tall} = useU(); const f = useCurrentFrame();
  const gx = tall ? w * 0.5 : w * 0.34; const gy = tall ? h * 0.66 : h * 0.7; const sc = 1.25 * u;
  const ix = tall ? w * 0.5 : w * 0.7; const iy = tall ? h * 0.3 : h * 0.42;
  const pop = useSpring(6);
  return <AbsoluteFill>
    {s.title && <div style={{position: 'absolute', top: (tall ? 140 : 70) * u, left: 0, right: 0, textAlign: 'center', padding: `0 ${80 * u}px`}}><Headline text={s.title} size={tall ? 92 : 80} /></div>}
    <svg width={w} height={h} style={{position: 'absolute'}}>
      <line x1={0} y1={gy + 150 * sc} x2={w} y2={gy + 150 * sc} stroke={T.ink} strokeWidth={6} opacity={0.25} />
      <Figure x={gx} y={gy} scale={sc} pose={s.pose} pose2={s.pose2} color={T.ink} fill={T.headFill} />
      {s.doubt && <Figure x={gx + 300 * u} y={gy + 30 * u} scale={sc * 0.85} pose="shrug" color={T.accent2} fill={T.headFill} flip />}
      {s.icon && <g transform={`translate(${ix} ${iy}) scale(${pop * (tall ? 1.5 : 1.3) * u})`}><Icon name={s.icon} color={T.ink} accent={T.accent} t={f} /></g>}
    </svg>
    {s.say && <Bubble text={s.say} x={gx + (s.doubt ? 60 : 200) * u} y={gy - 330 * u} delay={14} color={T.ink} ink={T.bg} maxW={(s.doubt ? (tall ? 470 : 560) : (tall ? 700 : 640)) * u} />}
    {s.doubt && <Bubble text={s.doubt} x={gx + 150 * u} y={gy - 250 * u} delay={40} color={T.accent2} ink="#fff" maxW={(tall ? 380 : 480) * u} side="r" />}
  </AbsoluteFill>;
};

const Icons: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u, tall} = useU(); const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const list = (s.icons || []).slice(0, tall ? 4 : 5);
  return <Center>
    <Headline text={s.title} size={tall ? 96 : 86} />
    <div style={{display: 'flex', flexDirection: tall && list.length > 3 ? 'column' : 'row', gap: 50 * u, marginTop: 60 * u, flexWrap: 'wrap', justifyContent: 'center'}}>
      {list.map((it, i) => {const sp = spring({frame: f - 8 - i * 7, fps, config: {damping: 13}}); return (
        <div key={i} style={{display: 'flex', flexDirection: tall && list.length > 3 ? 'row' : 'column', alignItems: 'center', gap: 22 * u, transform: `scale(${sp})`}}>
          <svg width={200 * u} height={200 * u} viewBox="-110 -110 220 220"><Icon name={it.icon} color={T.ink} accent={T.accent} t={f + i * 10} /></svg>
          <div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 42 * u, color: T.ink, maxWidth: 320 * u}}>{it.label}</div>
        </div>);})}
    </div>
  </Center>;
};

const Bars: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u, w, tall} = useU(); const f = useCurrentFrame();
  const bars = (s.bars || []).slice(0, 6); const max = Math.max(1, ...bars.map((b) => b.value));
  const W = (tall ? 860 : 1300) * u;
  return <Center>
    <Headline text={s.title} size={tall ? 90 : 80} />
    <div style={{width: W, marginTop: 50 * u, display: 'flex', flexDirection: 'column', gap: 26 * u}}>
      {bars.map((b, i) => {const p = interpolate(f - 10 - i * 6, [0, 26], [0, 1], {...clamp, easing: ease}); const hot = b.value === max; return (
        <div key={i} style={{display: 'flex', alignItems: 'center', gap: 24 * u}}>
          <div style={{width: 260 * u, textAlign: 'right', fontFamily: 'Inter', fontWeight: 800, fontSize: 36 * u, color: T.ink}}>{b.label}</div>
          <div style={{flex: 1, height: 70 * u, background: `${T.ink}14`, borderRadius: 14 * u, overflow: 'hidden'}}>
            <div style={{height: '100%', width: `${(b.value / max) * 100 * p}%`, background: hot ? T.accent : T.ink, borderRadius: 14 * u}} />
          </div>
          <div style={{width: 200 * u, fontFamily: 'Inter', fontWeight: 900, fontSize: 40 * u, color: hot ? T.accent : T.ink, opacity: p}}>{fmt(Number.isInteger(b.value) ? Math.round(b.value * p) : b.value * p)}{s.suffix}</div>
        </div>);})}
    </div>
    <Sub text={s.sub} delay={40} />
  </Center>;
  void w;
};
const fmt = (n: number) => (Math.abs(n) >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : Math.abs(n) >= 1e4 ? Math.round(n / 1e3) + 'K' : Math.abs(n) >= 100 ? Math.round(n).toString() : n.toFixed(n % 1 ? 1 : 0));

const Line: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u, tall} = useU(); const f = useCurrentFrame();
  const pts = (s.points && s.points.length > 1 ? s.points : [1, 2, 3, 5, 8]).slice(0, 40);
  const W = (tall ? 900 : 1400) * u; const H = (tall ? 700 : 520) * u;
  const mn = Math.min(...pts), mx = Math.max(...pts); const sy = (v: number) => H - ((v - mn) / (mx - mn || 1)) * H * 0.9 - H * 0.05;
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${(i / (pts.length - 1)) * W} ${sy(v)}`).join(' ');
  const p = interpolate(f, [6, 50], [0, 1], {...clamp, easing: ease}); const len = W * 2.2;
  const last = pts.length - 1;
  return <Center>
    <Headline text={s.title} size={tall ? 90 : 80} />
    <svg width={W + 40 * u} height={H + 40 * u} style={{marginTop: 40 * u, overflow: 'visible'}}>
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} stroke={T.ink} opacity={0.12} strokeWidth={2} />)}
      <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={T.accent} opacity={0.12 * p} />
      <path d={d} fill="none" stroke={T.accent} strokeWidth={10 * u} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
      <circle cx={W} cy={sy(pts[last])} r={16 * u * p} fill={T.accent} />
    </svg>
    {s.label && <div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 44 * u, color: T.ink, opacity: useIn(40), marginTop: 20 * u}}>{s.label}</div>}
  </Center>;
};

const Versus: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u, tall} = useU(); const f = useCurrentFrame();
  const L = useSpring(4); const R = useSpring(12); const vs = useSpring(20);
  const side = (x: Scene['left'], c: string, sp: number, dir: number) => x && (
    <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 * u, transform: `translate${tall ? 'Y' : 'X'}(${(1 - sp) * dir * 300 * u}px)`, opacity: sp}}>
      {x.icon && <svg width={(tall ? 160 : 220) * u} height={(tall ? 160 : 220) * u} viewBox="-110 -110 220 220"><Icon name={x.icon} color={T.ink} accent={c} t={f} /></svg>}
      <div style={{fontFamily: 'Inter', fontWeight: 900, fontSize: (tall ? 56 : 64) * u, color: T.ink, textAlign: 'center'}}>{x.title}</div>
      {x.value && <div style={{fontFamily: 'Inter', fontWeight: 900, fontSize: (tall ? 80 : 90) * u, color: c}}>{x.value}</div>}
    </div>);
  return <AbsoluteFill style={{flexDirection: tall ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', padding: tall ? `${200 * u}px ${80 * u}px ${420 * u}px` : 80 * u, gap: (tall ? 20 : 40) * u}}>
    {s.title && <div style={{position: 'absolute', top: 70 * u, left: 0, right: 0, textAlign: 'center'}}><Headline text={s.title} size={70} /></div>}
    {side(s.left, T.accent, L, -1)}
    <div style={{fontFamily: 'Inter', fontWeight: 900, fontSize: 90 * u, color: T.bg, background: T.ink, borderRadius: 999, width: 170 * u, height: 170 * u, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${vs}) rotate(${(1 - vs) * -90}deg)`, flexShrink: 0}}>VS</div>
    {side(s.right, T.accent2, R, 1)}
  </AbsoluteFill>;
};

const List: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u, tall} = useU(); const f = useCurrentFrame(); const {fps} = useVideoConfig();
  return <Center>
    <Headline text={s.title} size={tall ? 92 : 82} />
    <div style={{marginTop: 50 * u, display: 'flex', flexDirection: 'column', gap: 26 * u, alignItems: 'flex-start', textAlign: 'left'}}>
      {(s.items || []).slice(0, 5).map((it, i) => {const sp = spring({frame: f - 12 - i * 10, fps, config: {damping: 15}}); return (
        <div key={i} style={{display: 'flex', alignItems: 'center', gap: 26 * u, opacity: sp, transform: `translateX(${(1 - sp) * -60 * u}px)`}}>
          <div style={{width: 64 * u, height: 64 * u, borderRadius: 18 * u, background: T.accent, color: T.bg, fontFamily: 'Inter', fontWeight: 900, fontSize: 38 * u, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>{i + 1}</div>
          <div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 50 * u, color: T.ink, maxWidth: (tall ? 760 : 1200) * u}}>{it}</div>
        </div>);})}
    </div>
  </Center>;
};

const Flow: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u, w, h, tall} = useU(); const f = useCurrentFrame();
  const a = tall ? {x: w / 2, y: h * 0.32} : {x: w * 0.24, y: h * 0.55}; const b = tall ? {x: w / 2, y: h * 0.72} : {x: w * 0.76, y: h * 0.55};
  const p = interpolate(f, [8, 34], [0, 1], {...clamp, easing: ease});
  const dot = (f % 30) / 30;
  const mid = {x: a.x + (b.x - a.x) * dot, y: a.y + (b.y - a.y) * dot};
  return <AbsoluteFill>
    {s.title && <div style={{position: 'absolute', top: (tall ? 120 : 70) * u, left: 0, right: 0, textAlign: 'center', padding: `0 ${80 * u}px`}}><Headline text={s.title} size={tall ? 88 : 76} /></div>}
    <svg width={w} height={h} style={{position: 'absolute'}}>
      <line x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * p} y2={a.y + (b.y - a.y) * p} stroke={T.ink} strokeWidth={10 * u} strokeDasharray={`${24 * u} ${18 * u}`} strokeLinecap="round" />
      {p >= 1 && <circle cx={mid.x} cy={mid.y} r={16 * u} fill={T.accent} />}
      <g transform={`translate(${a.x} ${a.y}) scale(${1.2 * u})`}><Icon name={s.icon || 'question'} color={T.ink} accent={T.accent} t={f} /></g>
      <g transform={`translate(${b.x} ${b.y}) scale(${1.2 * u * p})`}><Icon name={s.items?.[0] || 'bulb'} color={T.ink} accent={T.accent2} t={f} /></g>
    </svg>
    {[{pt: a, t: s.from}, {pt: b, t: s.to}].map((o, i) => o.t && <div key={i} style={{position: 'absolute', left: o.pt.x, top: o.pt.y + 150 * u, transform: 'translateX(-50%)', fontFamily: 'Inter', fontWeight: 800, fontSize: 44 * u, color: T.ink, whiteSpace: 'nowrap', opacity: i ? p : 1}}>{o.t}</div>)}
  </AbsoluteFill>;
};

const Quote: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u} = useU(); const o = useIn(0);
  return <Center>
    <div style={{fontFamily: 'Inter', fontWeight: 900, fontSize: 240 * u, color: T.accent, lineHeight: 0.6, opacity: o}}>“</div>
    <Headline text={s.title} size={84} delay={4} />
    <Sub text={s.sub} delay={24} />
  </Center>;
};

const Timeline: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u, tall} = useU(); const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const items = (s.items || []).slice(0, 5);
  return <Center>
    <Headline text={s.title} size={tall ? 88 : 78} />
    <div style={{display: 'flex', flexDirection: tall ? 'column' : 'row', gap: 30 * u, marginTop: 60 * u, position: 'relative'}}>
      {items.map((it, i) => {const sp = spring({frame: f - 10 - i * 9, fps, config: {damping: 15}}); const [when, ...rest] = it.split('|'); return (
        <div key={i} style={{opacity: sp, transform: `translateY(${(1 - sp) * 40 * u}px)`, width: tall ? 820 * u : 300 * u, textAlign: tall ? 'left' : 'center', borderTop: tall ? 'none' : `8px solid ${i === items.length - 1 ? T.accent : T.ink}`, borderLeft: tall ? `8px solid ${i === items.length - 1 ? T.accent : T.ink}` : 'none', padding: `${20 * u}px`}}>
          <div style={{fontFamily: 'Inter', fontWeight: 900, fontSize: 54 * u, color: T.accent}}>{rest.length ? when : ''}</div>
          <div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 38 * u, color: T.ink}}>{rest.length ? rest.join('|') : when}</div>
        </div>);})}
    </div>
  </Center>;
};

const End: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u} = useU(); const sp = useSpring(14);
  return <Center>
    <Headline text={s.title || 'So... *what if?*'} size={120} />
    <div style={{marginTop: 50 * u, transform: `scale(${sp})`, background: T.accent, color: T.bg, fontFamily: 'Inter', fontWeight: 900, fontSize: 52 * u, padding: `${24 * u}px ${48 * u}px`, borderRadius: 999}}>{s.sub || 'Follow for the next one'}</div>
  </Center>;
};

// Thumbnail: 2-5 huge words, one icon, a shocked stickman. Rendered as a still.
const Thumb: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u, w, h, tall} = useU();
  return <AbsoluteFill>
    <div style={{position: 'absolute', left: 70 * u, top: tall ? 160 * u : 60 * u, width: tall ? w - 140 * u : w * 0.62, fontFamily: 'Inter', fontWeight: 900, fontSize: (tall ? 150 : 150) * u, lineHeight: 0.95, letterSpacing: -6 * u, color: T.ink, textTransform: 'uppercase'}}>
      {(s.title || '').split(' ').map((wd, i) => <span key={i} style={{color: wd.includes('*') ? T.accent : T.ink, marginRight: '0.2em', display: 'inline-block', textShadow: `0 ${6 * u}px 0 ${T.bg2}`}}>{wd.replace(/\*/g, '')}</span>)}
    </div>
    <svg width={w} height={h} style={{position: 'absolute'}}>
      <circle cx={tall ? w * 0.68 : w * 0.78} cy={tall ? h * 0.62 : h * 0.36} r={230 * u} fill={T.accent} opacity={0.18} />
      <g transform={`translate(${tall ? w * 0.68 : w * 0.78} ${tall ? h * 0.62 : h * 0.36}) scale(${1.8 * u}) rotate(-8)`}><Icon name={s.icon || 'question'} color={T.ink} accent={T.accent} t={0} /></g>
      <Figure x={tall ? w * 0.32 : w * 0.26} y={tall ? h * 0.8 : h * 0.66} scale={1.2 * u} pose="shock" color={T.ink} fill={T.headFill} at={-99} />
    </svg>
    <AbsoluteFill style={{border: `${14 * u}px solid ${T.accent}`}} />
  </AbsoluteFill>;
};

const TEMPLATES: Record<string, React.FC<{s: Scene}>> = {title: Title, stat: Stat, stick: Stick, icons: Icons, bars: Bars, line: Line, versus: Versus, list: List, flow: Flow, quote: Quote, timeline: Timeline, end: End, thumb: Thumb};

// Subtitles: each beat's VO is split into 2-5 word chunks spread across the beat.
const Captions: React.FC<{s: Scene}> = ({s}) => {
  const T = useT(); const {u, tall} = useU(); const f = useCurrentFrame();
  const words = (s.vo || '').replace(/\[[^\]]+\]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return null;
  const per = tall ? 3 : 5; const chunks: string[] = [];
  for (let i = 0; i < words.length; i += per) chunks.push(words.slice(i, i + per).join(' '));
  const idx = Math.min(chunks.length - 1, Math.floor((f / Math.max(1, s.dur)) * chunks.length));
  const local = f - (idx * s.dur) / chunks.length; const pop = interpolate(local, [0, 5], [0.9, 1], clamp);
  return <div style={{position: 'absolute', left: 0, right: 0, bottom: (tall ? 330 : 70) * u, display: 'flex', justifyContent: 'center'}}>
    <div style={{background: T.captionBg, color: T.captionInk, fontFamily: 'Inter', fontWeight: 800, fontSize: (tall ? 58 : 44) * u, padding: `${12 * u}px ${26 * u}px`, borderRadius: 16 * u, transform: `scale(${pop})`, maxWidth: '84%', textAlign: 'center'}}>{chunks[idx]}</div>
  </div>;
};

const SceneWrap: React.FC<{s: Scene; captions: boolean}> = ({s, captions}) => {
  const f = useCurrentFrame();
  const Tpl = TEMPLATES[s.template] || Title;
  const fadeIn = interpolate(f, [0, 8], [0, 1], clamp); const out = interpolate(f, [s.dur - 6, s.dur], [1, 0], clamp);
  const push = interpolate(f, [0, s.dur], [1, 1.04]);
  return <AbsoluteFill style={{opacity: Math.min(fadeIn, out)}}>
    <AbsoluteFill style={{transform: `scale(${push})`}}><Tpl s={s} /></AbsoluteFill>
    {captions && <Captions s={s} />}
  </AbsoluteFill>;
};

export const Episode: React.FC<EpisodeProps> = ({theme, scenes, audio, bed, watermark, captions = true}) => {
  const T = THEMES[theme] || THEMES.whatif; const {u} = useU();
  return <ThemeCtx.Provider value={T}>
    <AbsoluteFill><Fonts /><Backdrop />
      {scenes.map((s, i) => <Sequence key={i} from={s.start} durationInFrames={Math.max(1, s.dur)}><SceneWrap s={s} captions={captions} /></Sequence>)}
      {audio.map((a, i) => <Sequence key={'a' + i} from={a.start}><Audio src={staticFile(a.src)} volume={a.volume ?? 1} /></Sequence>)}
      {bed && <Audio src={staticFile(bed)} volume={0.09} loop />}
      {watermark && <div style={{position: 'absolute', top: 40 * u, right: 50 * u, fontFamily: 'Inter', fontWeight: 900, fontSize: 30 * u, color: T.ink, opacity: 0.35}}>{watermark}</div>}
    </AbsoluteFill>
  </ThemeCtx.Provider>;
};

export const episodeLength = (p: EpisodeProps) => Math.max(30, ...p.scenes.map((s) => s.start + s.dur));
