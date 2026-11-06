import React from 'react';
import {AbsoluteFill, Sequence, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, Caption, Fonts, POSES, Stick, ease, useIn} from './kit';

// Scene boundaries (frames @30fps)
const S = {hook: 0, dark: 120, tides: 230, coral: 400, tilt: 520, end: 700};
export const MOON_FRAMES = 800;

const W = 1080, H = 1920;

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const gone = spring({frame: f - 70, fps, config: {damping: 12}});
  const moonScale = 1 - gone;
  return (
    <AbsoluteFill>
      <Caption text="What if the *Moon* vanished tonight?" />
      <svg width={W} height={H}>
        <g transform={`translate(760 760) scale(${moonScale})`}>
          <circle r={130} fill={C.paper} stroke={C.ink} strokeWidth={14} />
          <circle cx={-40} cy={-30} r={22} fill="none" stroke={C.ink} strokeWidth={8} />
          <circle cx={45} cy={30} r={14} fill="none" stroke={C.ink} strokeWidth={8} />
        </g>
        {/* poof lines */}
        {[0, 60, 120, 180, 240, 300].map((a) => {
          const t = interpolate(f, [72, 92], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
          const r = (a * Math.PI) / 180;
          return (
            <line key={a} x1={760 + Math.cos(r) * (60 + 120 * t)} y1={760 + Math.sin(r) * (60 + 120 * t)}
              x2={760 + Math.cos(r) * (90 + 150 * t)} y2={760 + Math.sin(r) * (90 + 150 * t)}
              stroke={C.accent} strokeWidth={12} strokeLinecap="round" opacity={t > 0 && t < 1 ? 1 : 0} />
          );
        })}
        <Stick x={380} y={1450} from={POSES.lookUp} to={POSES.shock} at={78} dur={8} />
        <line x1={120} x2={960} y1={1605} y2={1605} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
      </svg>
    </AbsoluteFill>
  );
};

const Dark: React.FC = () => {
  const f = useCurrentFrame();
  const t = useIn(0, 20);
  return (
    <AbsoluteFill style={{background: interpolateColors(t, [0, 1], [C.paper, C.night])}}>
      <svg width={W} height={H}>
        {Array.from({length: 46}).map((_, i) => {
          const x = (i * 197) % W, y = 120 + ((i * 331) % 1100);
          const tw = 0.4 + 0.6 * Math.abs(Math.sin(f / 12 + i));
          return <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 5 : 3} fill="#fff" opacity={t * tw} />;
        })}
        <Stick x={540} y={1450} from={POSES.shrug} color="#F3EFE6" />
      </svg>
      <Caption text="The night goes dark. *Really* dark." color="#F3EFE6" delay={8} />
      <div style={{position: 'absolute', bottom: 210, width: '100%', textAlign: 'center', fontFamily: 'Inter', fontWeight: 500,
        fontSize: 40, color: '#9A9AA6', opacity: useIn(30)}}>No full moon. Ever.</div>
    </AbsoluteFill>
  );
};

const Tides: React.FC = () => {
  const f = useCurrentFrame();
  const shrink = interpolate(f, [55, 95], [1, 0.31], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const wave = (amp: number, phase: number) => {
    let d = `M 120 0`;
    for (let x = 120; x <= 960; x += 20) d += ` L ${x} ${Math.sin(x / 70 + phase) * amp}`;
    return d + ` L 960 900 L 120 900 Z`;
  };
  const pct = Math.round(shrink * 100);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Caption text="Tides shrink to about *a *third.*" />
      <svg width={W} height={H}>
        {/* tide gauge */}
        <rect x={120} y={700} width={840} height={620} rx={36} fill="none" stroke={C.ink} strokeWidth={10} />
        <defs><clipPath id="gauge"><rect x={125} y={705} width={830} height={610} rx={32} /></clipPath></defs>
        <g clipPath="url(#gauge)"><g transform={`translate(0 ${1320 - 560 * shrink})`}>
          <path d={wave(18, f / 8)} fill={C.sea} opacity={0.9} />
        </g></g>
        <line x1={120} x2={960} y1={760} y2={760} stroke={C.ink} strokeWidth={4} strokeDasharray="14 14" opacity={0.5} />
        <text x={140} y={745} fontFamily="Inter" fontWeight={800} fontSize={34} fill={C.soft}>TODAY</text>
        <text x={540} y={640} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={150} fill={C.ink}>{pct}%</text>
        {/* sun */}
        <g transform="translate(860 600)" opacity={useIn(100)}>
          <circle r={56} fill={C.accent} />
          {Array.from({length: 8}).map((_, i) => {
            const r = (i * 45 * Math.PI) / 180;
            return <line key={i} x1={Math.cos(r) * 78} y1={Math.sin(r) * 78} x2={Math.cos(r) * 100} y2={Math.sin(r) * 100}
              stroke={C.accent} strokeWidth={10} strokeLinecap="round" />;
          })}
        </g>
      </svg>
      <div style={{position: 'absolute', bottom: 260, width: '100%', textAlign: 'center', fontFamily: 'Inter', fontWeight: 500,
        fontSize: 42, color: C.ink, opacity: useIn(105)}}>Only the Sun is pulling now.</div>
    </AbsoluteFill>
  );
};

const Coral: React.FC = () => {
  const f = useCurrentFrame();
  const cross = interpolate(f, [55, 75], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const phases = [0, 0.25, 0.5, 0.75, 1];
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Caption text="Corals that spawn by *moonlight* lose their calendar." size={84} />
      <svg width={W} height={H}>
        {phases.map((p, i) => {
          const x = 180 + i * 180, y = 820;
          const s = useIn(10 + i * 5);
          return (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              <defs><clipPath id={`ph${i}`}><rect x={-62} y={-62} width={124 * p} height={124} /></clipPath></defs>
              <circle r={62} fill={C.paper} />
              <circle r={62} fill={C.ink} clipPath={`url(#ph${i})`} />
              <circle r={62} fill="none" stroke={C.ink} strokeWidth={8} />
            </g>
          );
        })}
        <line x1={110} y1={820} x2={110 + 860 * cross} y2={820} stroke={C.accent} strokeWidth={18} strokeLinecap="round" />
        {/* coral */}
        {[300, 540, 780].map((x, i) => (
          <g key={x} transform={`translate(${x} 1460) rotate(${Math.sin(f / 15 + i) * 4})`} fill="none" stroke={C.accent} strokeWidth={16} strokeLinecap="round">
            <path d="M0 0 V-220 M0 -120 L-70 -200 M0 -160 L60 -250 M-70 -200 L-90 -260 M60 -250 L90 -300" />
          </g>
        ))}
        <line x1={120} x2={960} y1={1465} y2={1465} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
      </svg>
    </AbsoluteFill>
  );
};

const Tilt: React.FC = () => {
  const f = useCurrentFrame();
  const grow = interpolate(f, [70, 170], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const angle = 23.4 + Math.sin(f / 7) * 40 * grow;
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Caption text="The Moon keeps Earth's tilt *steady.*" />
      <svg width={W} height={H}>
        <g transform={`translate(540 1000) rotate(${angle})`}>
          <line x1={0} y1={-420} x2={0} y2={420} stroke={C.ink} strokeWidth={8} strokeDasharray="20 16" />
          <circle r={300} fill={C.sea} stroke={C.ink} strokeWidth={12} />
          <path d="M-180 -120 q60 -60 140 -20 q40 60 -30 90 q-80 20 -110 -70z M60 40 q80 -30 140 40 q-20 90 -110 80 q-60 -40 -30 -120z"
            fill="#7BC67E" stroke={C.ink} strokeWidth={8} />
        </g>
        <text x={540} y={1500} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={110} fill={grow > 0.05 ? C.accent : C.ink}>
          {angle.toFixed(1)}°
        </text>
      </svg>
      <div style={{position: 'absolute', bottom: 230, left: 90, right: 90, textAlign: 'center', fontFamily: 'Inter', fontWeight: 500,
        fontSize: 42, color: C.ink, opacity: useIn(70)}}>Without it, over millions of years, the tilt could swing wildly.</div>
    </AbsoluteFill>
  );
};

const End: React.FC = () => {
  const icons = ['☀', '❄', '☂', '🍂'];
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Caption text="Seasons? *Scrambled.*" size={120} y={360} />
      <svg width={W} height={H}>
        <Stick x={540} y={1400} from={POSES.stand} to={POSES.shrug} at={10} dur={10} />
      </svg>
      <div style={{position: 'absolute', top: 680, width: '100%', textAlign: 'center', fontSize: 110}}>
        {icons.map((ic, i) => {
          const order = (i + Math.floor(f / 8)) % 4;
          return <span key={i} style={{display: 'inline-block', margin: '0 18px', transform: `translateY(${Math.sin(f / 5 + order) * 18}px)`}}>{icons[order]}</span>;
        })}
      </div>
      <div style={{position: 'absolute', bottom: 180, width: '100%', textAlign: 'center', fontFamily: 'Inter', fontWeight: 800,
        fontSize: 46, color: C.ink, opacity: useIn(40)}}>Follow for more <span style={{color: C.accent}}>what ifs</span></div>
    </AbsoluteFill>
  );
};

export const MoonShort: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <Fonts />
      <Sequence from={S.hook} durationInFrames={S.dark - S.hook}><Hook /></Sequence>
      <Sequence from={S.dark} durationInFrames={S.tides - S.dark}><Dark /></Sequence>
      <Sequence from={S.tides} durationInFrames={S.coral - S.tides}><Tides /></Sequence>
      <Sequence from={S.coral} durationInFrames={S.tilt - S.coral}><Coral /></Sequence>
      <Sequence from={S.tilt} durationInFrames={S.end - S.tilt}><Tilt /></Sequence>
      <Sequence from={S.end}><End /></Sequence>
      {/* progress bar + brand */}
      <div style={{position: 'absolute', top: 0, left: 0, height: 12, width: `${(f / MOON_FRAMES) * 100}%`, background: C.accent}} />
      <div style={{position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontFamily: 'Inter', fontWeight: 900,
        fontSize: 34, letterSpacing: 6, color: f >= S.dark && f < S.tides ? '#5A5A66' : C.soft}}>WHAT IF?</div>
    </AbsoluteFill>
  );
};
