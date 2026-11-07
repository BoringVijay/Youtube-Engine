// Curious Penguin film renderer. Shots are AI frames (with a camera move) or AI motion clips.
// Look, captions and number overlays are styled per video universe. Works for 16:9 and 9:16.
import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';

export type Look = {
  paper: string; ink: string; accent: string; accent2?: string;
  font: 'inter' | 'anton' | 'serif' | 'typewriter' | 'marker' | 'mono' | 'archivo';
  film: 'clean' | '16mm' | 'vhs' | 'print' | 'noir';
  grain: number; vignette: number; letterbox: boolean;
  captionBg: string; captionInk: string; captionCase?: 'upper' | 'normal';
};
export type Overlay = {
  type: 'counter' | 'label' | 'quote' | 'chapter' | 'bars';
  value?: number; prefix?: string; suffix?: string; decimals?: number; text?: string; sub?: string;
  bars?: {label: string; value: number}[]; at?: number; pos?: 'center' | 'top' | 'left' | 'right' | 'bottom';
};
export type Shot = {
  id: string; start: number; dur: number; src: string; kind: 'image' | 'video';
  camera?: string; focus?: [number, number]; overlay?: Overlay | null; transition?: 'cut' | 'dip' | 'whip' | 'flash' | 'fade';
  rate?: number; clipStart?: number; volume?: number;
};
export type Word = {w: string; t0: number; t1: number};
export type FilmProps = {
  w?: number; h?: number; look: Look; shots: Shot[]; words: Word[];
  audio: {src: string; start: number; volume?: number; trim?: number}[]; music?: {src: string; volume?: number} | null; captions?: boolean;
};

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const ease = Easing.bezier(0.33, 0, 0.2, 1);
const FONT: Record<Look['font'], {family: string; weight: number; tracking: number}> = {
  inter: {family: 'Inter', weight: 900, tracking: -0.03}, anton: {family: 'Anton', weight: 400, tracking: 0.01},
  serif: {family: 'DM Serif Display', weight: 400, tracking: -0.01}, typewriter: {family: 'Special Elite', weight: 400, tracking: 0},
  marker: {family: 'Permanent Marker', weight: 400, tracking: 0}, mono: {family: 'IBM Plex Mono', weight: 700, tracking: -0.02},
  archivo: {family: 'Archivo Black', weight: 400, tracking: -0.02},
};

const Fonts: React.FC = () => (
  <style>{`
    @font-face{font-family:Inter;font-weight:900;src:url(${staticFile('inter-latin-900-normal.woff2')}) format('woff2');}
    @font-face{font-family:Inter;font-weight:800;src:url(${staticFile('inter-latin-800-normal.woff2')}) format('woff2');}
    @font-face{font-family:Anton;src:url(${staticFile('fonts/anton-latin-400-normal.woff2')}) format('woff2');}
    @font-face{font-family:'DM Serif Display';src:url(${staticFile('fonts/dm-serif-display-latin-400-normal.woff2')}) format('woff2');}
    @font-face{font-family:'Special Elite';src:url(${staticFile('fonts/special-elite-latin-400-normal.woff2')}) format('woff2');}
    @font-face{font-family:'Permanent Marker';src:url(${staticFile('fonts/permanent-marker-latin-400-normal.woff2')}) format('woff2');}
    @font-face{font-family:'IBM Plex Mono';font-weight:700;src:url(${staticFile('fonts/ibm-plex-mono-latin-700-normal.woff2')}) format('woff2');}
    @font-face{font-family:'Archivo Black';src:url(${staticFile('fonts/archivo-black-latin-400-normal.woff2')}) format('woff2');}
  `}</style>
);

const useU = () => {const {width, height} = useVideoConfig(); return {w: width, h: height, u: Math.min(width, height) / 1080, tall: height > width};};

// ---------- camera ----------
function cameraTransform(move: string, p: number, f: number, focus: [number, number] = [0.5, 0.5]) {
  const e = ease(p);
  const fx = (0.5 - focus[0]) * 100, fy = (0.5 - focus[1]) * 100; // percent shift toward focus
  switch (move) {
    case 'push_in': {const s = 1.04 + 0.12 * e; return `scale(${s}) translate(${fx * 0.12 * e}%, ${fy * 0.12 * e}%)`;}
    case 'pull_out': {const s = 1.18 - 0.13 * e; return `scale(${s}) translate(${fx * 0.12 * (1 - e)}%, ${fy * 0.12 * (1 - e)}%)`;}
    case 'pan_left': return `scale(1.14) translate(${4.5 - 9 * e}%, 0)`;
    case 'pan_right': return `scale(1.14) translate(${-4.5 + 9 * e}%, 0)`;
    case 'tilt_down': return `scale(1.16) translate(0, ${5.5 - 11 * e}%)`;
    case 'tilt_up': return `scale(1.16) translate(0, ${-5.5 + 11 * e}%)`;
    case 'crane_down': {const s = 1.25 - 0.1 * e; return `scale(${s}) translate(0, ${8 - 16 * e}%)`;}
    case 'snap_zoom': {const z = interpolate(p, [0.35, 0.42], [0, 1], clamp); const s = 1.03 + 0.32 * z; return `scale(${s}) translate(${fx * 0.25 * z}%, ${fy * 0.25 * z}%)`;}
    case 'handheld': {const jx = Math.sin(f / 11) * 0.5 + Math.sin(f / 5.3) * 0.25; const jy = Math.cos(f / 13) * 0.45 + Math.sin(f / 4.1) * 0.2; return `scale(1.08) translate(${jx}%, ${jy}%) rotate(${Math.sin(f / 17) * 0.35}deg)`;}
    case 'static': return `scale(${1.02 + 0.01 * e})`;
    default: {const s = 1.05 + 0.06 * e; return `scale(${s}) translate(${-1.5 + 3 * e}%, ${1 - 2 * e}%) rotate(${-0.3 + 0.6 * e}deg)`;} // drift
  }
}

// ---------- overlays (numbers and words drawn in the universe's style) ----------
const fmtNum = (n: number, d = 0) => (Math.abs(n) >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n.toLocaleString('en-US', {maximumFractionDigits: d, minimumFractionDigits: d}));

const Card: React.FC<{look: Look; children: React.ReactNode; tilt?: number; pos?: Overlay['pos']; o: number; s: number}> = ({look, children, tilt = 0, pos = 'center', o, s}) => {
  const {u, tall} = useU();
  const paperish = look.film === 'print' || look.film === 'clean';
  const place: React.CSSProperties = pos === 'top' ? {top: (tall ? 220 : 70) * u, left: 0, right: 0, justifyContent: 'center'}
    : pos === 'left' ? {top: 0, bottom: 0, left: 80 * u, alignItems: 'center'} : pos === 'right' ? {top: 0, bottom: 0, right: 80 * u, alignItems: 'center', justifyContent: 'flex-end'}
    : pos === 'bottom' ? {bottom: (tall ? 520 : 200) * u, left: 0, right: 0, justifyContent: 'center'} : {top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center'};
  return <div style={{position: 'absolute', display: 'flex', ...place}}>
    <div style={{background: look.paper, color: look.ink, padding: `${26 * u}px ${40 * u}px`, borderRadius: paperish ? 6 * u : 18 * u, opacity: o,
      transform: `scale(${0.9 + 0.1 * s}) rotate(${tilt}deg)`, boxShadow: `0 ${18 * u}px ${50 * u}px rgba(0,0,0,.35)`, maxWidth: (tall ? 900 : 1300) * u, textAlign: 'center'}}>{children}</div>
  </div>;
};

const OverlayView: React.FC<{ov: Overlay; look: Look; dur: number}> = ({ov, look, dur}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const {u, tall} = useU();
  const at = Math.round((ov.at ?? 0.3) * fps);
  const o = interpolate(f, [at, at + 8, dur - 8, dur], [0, 1, 1, 0], clamp);
  const s = interpolate(f, [at, at + 10], [0, 1], {...clamp, easing: Easing.out(Easing.back(2))});
  const F = FONT[look.font]; const tilt = look.film === 'print' || look.font === 'marker' ? -2 : 0;
  const tx: React.CSSProperties = {fontFamily: F.family, fontWeight: F.weight, letterSpacing: `${F.tracking}em`, lineHeight: 1};
  if (ov.type === 'counter') {
    const p = interpolate(f, [at, at + 36], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    return <Card look={look} tilt={tilt} pos={ov.pos} o={o} s={s}>
      <div style={{...tx, fontSize: (tall ? 150 : 170) * u, color: look.accent}}>{ov.prefix}{fmtNum((ov.value || 0) * p, ov.decimals || 0)}{ov.suffix}</div>
      {ov.text && <div style={{...tx, fontSize: 46 * u, marginTop: 14 * u, lineHeight: 1.1}}>{ov.text}</div>}
      {ov.sub && <div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 28 * u, marginTop: 12 * u, opacity: 0.6}}>{ov.sub}</div>}
    </Card>;
  }
  if (ov.type === 'bars') {
    const bars = (ov.bars || []).slice(0, 5); const mx = Math.max(1, ...bars.map((b) => b.value));
    return <Card look={look} tilt={tilt} pos={ov.pos} o={o} s={s}>
      {ov.text && <div style={{...tx, fontSize: 52 * u, marginBottom: 22 * u}}>{ov.text}</div>}
      <div style={{display: 'grid', gap: 14 * u, width: (tall ? 760 : 900) * u}}>
        {bars.map((b, i) => {const p = interpolate(f, [at + 6 + i * 5, at + 30 + i * 5], [0, 1], {...clamp, easing: ease}); return (
          <div key={i} style={{display: 'grid', gridTemplateColumns: `${220 * u}px 1fr ${150 * u}px`, alignItems: 'center', gap: 16 * u}}>
            <div style={{...tx, fontSize: 32 * u, textAlign: 'right', lineHeight: 1.1}}>{b.label}</div>
            <div style={{height: 46 * u, background: `${look.ink}22`, borderRadius: 6 * u}}><div style={{height: '100%', width: `${(b.value / mx) * 100 * p}%`, background: b.value === mx ? look.accent : look.ink, borderRadius: 6 * u}} /></div>
            <div style={{...tx, fontSize: 36 * u, textAlign: 'left'}}>{fmtNum(b.value * p, Number.isInteger(b.value) ? 0 : 1)}{ov.suffix}</div>
          </div>);})}
      </div>
    </Card>;
  }
  if (ov.type === 'label') {
    return <Card look={look} tilt={tilt} pos={ov.pos || 'top'} o={o} s={s}><div style={{...tx, fontSize: (tall ? 64 : 58) * u, lineHeight: 1.08}}>{ov.text}</div>{ov.sub && <div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 28 * u, marginTop: 10 * u, opacity: 0.65}}>{ov.sub}</div>}</Card>;
  }
  // quote / chapter: big words straight on the picture
  return <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: `${(tall ? 260 : 120) * u}px ${100 * u}px ${(tall ? 700 : 300) * u}px`, opacity: o}}>
    <div style={{...tx, fontSize: (ov.type === 'chapter' ? 120 : 96) * u, color: look.paper, textAlign: 'center', lineHeight: 1.02, textShadow: `0 ${6 * u}px ${30 * u}px rgba(0,0,0,.6)`, transform: `translateY(${(1 - s) * 30}px)`}}>{ov.text}</div>
    {ov.sub && <div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 34 * u, color: look.paper, marginTop: 18 * u, opacity: 0.85, textShadow: '0 2px 12px rgba(0,0,0,.6)'}}>{ov.sub}</div>}
  </AbsoluteFill>;
};

// ---------- shots ----------
const ShotView: React.FC<{shot: Shot; look: Look}> = ({shot, look}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const p = Math.min(1, f / Math.max(1, shot.dur));
  const tin = shot.transition || 'cut';
  const fadeIn = tin === 'fade' ? interpolate(f, [0, 12], [0, 1], clamp) : tin === 'dip' ? interpolate(f, [0, 10], [0, 1], clamp) : 1;
  const whip = tin === 'whip' ? interpolate(f, [0, 7], [1, 0], {...clamp, easing: Easing.out(Easing.cubic)}) : 0;
  const media = shot.kind === 'video'
    ? <OffthreadVideo src={staticFile(shot.src)} muted={!shot.volume} volume={shot.volume || 0} playbackRate={shot.rate || 1} startFrom={Math.round((shot.clipStart || 0) * fps)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    : <Img src={staticFile(shot.src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />;
  return <AbsoluteFill style={{opacity: fadeIn, background: '#000'}}>
    <AbsoluteFill style={{transform: `${shot.kind === 'video' ? 'scale(1)' : cameraTransform(shot.camera || 'drift', p, f, shot.focus)} translateX(${whip * 30}%)`, filter: whip > 0.05 ? `blur(${whip * 24}px)` : undefined}}>
      {media}
    </AbsoluteFill>
    {tin === 'flash' && <AbsoluteFill style={{background: '#fff', opacity: interpolate(f, [0, 5], [0.9, 0], clamp)}} />}
    {shot.overlay && <OverlayView ov={shot.overlay} look={look} dur={shot.dur} />}
  </AbsoluteFill>;
};

// ---------- film texture ----------
const Texture: React.FC<{look: Look}> = ({look}) => {
  const f = useCurrentFrame(); const {w, h, u} = useU();
  const seed = Math.floor(f / 2);
  const flicker = look.film === '16mm' || look.film === 'noir' ? 1 + (random(`fl${seed}`) - 0.5) * 0.06 : 1;
  const weaveX = look.film === '16mm' ? (random(`wx${seed}`) - 0.5) * 2 * u : 0;
  return <>
    {look.film === '16mm' && <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(255,170,90,.10), rgba(255,120,60,.06))', mixBlendMode: 'soft-light', transform: `translateX(${weaveX}px)`}} />}
    {look.film === 'noir' && <AbsoluteFill style={{backdropFilter: 'grayscale(1) contrast(1.25)', WebkitBackdropFilter: 'grayscale(1) contrast(1.25)'}} />}
    {look.film === 'vhs' && <AbsoluteFill style={{background: `repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 ${2 * u}px, transparent ${2 * u}px ${4 * u}px)`, mixBlendMode: 'multiply'}} />}
    {look.film === 'print' && <svg width={w} height={h} style={{position: 'absolute', opacity: 0.08, mixBlendMode: 'multiply'}}><defs><pattern id="ht" width={8 * u} height={8 * u} patternUnits="userSpaceOnUse"><circle cx={4 * u} cy={4 * u} r={1.6 * u} fill="#000" /></pattern></defs><rect width={w} height={h} fill="url(#ht)" /></svg>}
    {look.grain > 0 && <svg width={w} height={h} style={{position: 'absolute', opacity: look.grain * 0.5 * flicker, mixBlendMode: 'overlay'}}>
      <filter id={`g${seed}`}><feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={seed} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width={w} height={h} filter={`url(#g${seed})`} /></svg>}
    {look.vignette > 0 && <AbsoluteFill style={{background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${0.55 * look.vignette}) 100%)`}} />}
    {look.letterbox && <><div style={{position: 'absolute', top: 0, left: 0, right: 0, height: h * 0.07, background: '#000'}} /><div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: h * 0.07, background: '#000'}} /></>}
  </>;
};

// ---------- captions: phrase groups, current word lit ----------
const Captions: React.FC<{words: Word[]; look: Look}> = ({words, look}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig(); const {u, tall} = useU();
  const t = f / fps;
  const groups = React.useMemo(() => {
    const out: Word[][] = []; let cur: Word[] = [];
    const max = tall ? 3 : 6;
    words.forEach((wd, i) => {
      cur.push(wd);
      const gap = i + 1 < words.length ? words[i + 1].t0 - wd.t1 : 1;
      if (cur.length >= max || gap > 0.35 || /[.?!,:;]$/.test(wd.w)) {out.push(cur); cur = [];}
    });
    if (cur.length) out.push(cur);
    return out;
  }, [words, tall]);
  const g = groups.find((gr) => t >= gr[0].t0 - 0.05 && t <= gr[gr.length - 1].t1 + 0.25);
  if (!g) return null;
  const F = FONT[look.font];
  const pop = interpolate(t - g[0].t0, [0, 0.12], [0.92, 1], clamp);
  return <div style={{position: 'absolute', left: 0, right: 0, bottom: (tall ? 360 : look.letterbox ? 105 : 80) * u, display: 'flex', justifyContent: 'center'}}>
    <div style={{background: look.captionBg, color: look.captionInk, fontFamily: F.family, fontWeight: F.weight, letterSpacing: `${F.tracking}em`,
      fontSize: (tall ? 66 : 54) * u, lineHeight: 1.15, padding: `${10 * u}px ${24 * u}px`, borderRadius: 14 * u, transform: `scale(${pop})`,
      maxWidth: '86%', textAlign: 'center', textTransform: look.captionCase === 'upper' ? 'uppercase' : 'none'}}>
      {g.map((wd, i) => <span key={i} style={{color: t >= wd.t0 && t <= wd.t1 + 0.05 ? look.accent : undefined, marginRight: '0.28em'}}>{wd.w.replace(/[,;:]$/, '')}</span>)}
    </div>
  </div>;
};

export const Film: React.FC<FilmProps> = ({look, shots, words, audio, music, captions = true}) => {
  const {fps} = useVideoConfig();
  return <AbsoluteFill style={{background: '#000'}}>
    <Fonts />
    {shots.map((s) => {
      const lead = s.transition === 'fade' ? 12 : 0;
      return <Sequence key={s.id} from={Math.max(0, s.start - lead)} durationInFrames={Math.max(1, s.dur + lead)}><ShotView shot={{...s, dur: s.dur + lead}} look={look} /></Sequence>;
    })}
    <Texture look={look} />
    {captions && <Captions words={words} look={look} />}
    {audio.map((a, i) => <Sequence key={'a' + i} from={a.start}><Audio src={staticFile(a.src)} volume={a.volume ?? 1} startFrom={Math.round((a.trim || 0) * fps)} /></Sequence>)}
    {music && <Audio src={staticFile(music.src)} volume={(f) => (music.volume ?? 0.12) * interpolate(f, [0, fps * 2], [0, 1], clamp)} loop />}
  </AbsoluteFill>;
};

export const filmLength = (p: FilmProps) => Math.max(30, ...p.shots.map((s) => s.start + s.dur));
