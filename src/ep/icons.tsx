// Simple line icons drawn in the theme ink. All fit a 200x200 box centred on (0,0).
import React from 'react';

export const ICONS = ['globe', 'cable', 'ship', 'satellite', 'phone', 'money', 'coin', 'vault', 'chart', 'cloud', 'shark', 'clock', 'bulb', 'question', 'server', 'building', 'rocket', 'house', 'warning', 'fire', 'lock', 'brain', 'people', 'film', 'crown', 'bomb', 'moon', 'sun', 'heart', 'eye'] as const;
export type IconName = typeof ICONS[number];

export const Icon: React.FC<{name: string; color: string; accent: string; size?: number; t?: number}> = ({name, color, accent, size = 1, t = 0}) => {
  const s = {stroke: color, strokeWidth: 10, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  const a = {...s, stroke: accent};
  const wob = Math.sin(t / 8) * 4;
  const body = (() => {
    switch (name) {
      case 'globe': return <g><circle r={90} {...s} /><ellipse rx={40} ry={90} {...s} /><path d="M-90 0H90M-78 -45H78M-78 45H78" {...s} /></g>;
      case 'cable': return <g><path d={`M-100 ${20 + wob} C -40 ${-40 - wob}, 40 ${80 + wob}, 100 ${10 - wob}`} {...s} strokeWidth={18} /><circle cx={-100} cy={20 + wob} r={12} fill={accent} /><circle cx={100} cy={10 - wob} r={12} fill={accent} /></g>;
      case 'ship': return <g><path d="M-95 20 L95 20 L70 70 L-70 70 Z" {...s} /><path d="M-40 20 V-40 H40 V20 M0 -40 V-80" {...s} /><path d={`M-110 ${85 + wob / 2} q25 -12 50 0 t50 0 t50 0 t50 0`} {...a} /></g>;
      case 'satellite': return <g transform={`rotate(${wob * 2})`}><rect x={-25} y={-25} width={50} height={50} {...s} /><rect x={-100} y={-15} width={60} height={30} {...a} /><rect x={40} y={-15} width={60} height={30} {...a} /><path d="M0 25 V60 M-20 75 q20 -20 40 0" {...s} /></g>;
      case 'phone': return <g><rect x={-50} y={-90} width={100} height={180} rx={18} {...s} /><path d="M-15 70 H15" {...s} /><rect x={-34} y={-66} width={68} height={110} rx={6} fill={accent} opacity={0.25} /></g>;
      case 'money': return <g><rect x={-95} y={-50} width={190} height={100} rx={12} {...s} /><circle r={30} {...a} /><path d="M0 -18 V18" {...a} /></g>;
      case 'coin': return <g><ellipse rx={80} ry={80} {...s} /><ellipse rx={58} ry={58} {...a} /><path d="M-15 -25 h30 M-15 0 h30 M-15 25 h30" {...s} /></g>;
      case 'vault': return <g><rect x={-90} y={-90} width={180} height={180} rx={14} {...s} /><circle r={45} {...s} /><g transform={`rotate(${t * 2})`}><path d="M0 -45 V45 M-45 0 H45" {...a} /></g></g>;
      case 'chart': return <g><path d="M-90 80 V-90 M-90 80 H95" {...s} /><path d="M-70 40 L-25 0 L10 25 L70 -60" {...a} strokeWidth={14} /></g>;
      case 'cloud': return <g transform={`translate(0 ${wob})`}><path d="M-80 40 a40 40 0 0 1 10 -78 a55 55 0 0 1 105 -5 a40 40 0 0 1 45 83 Z" {...s} /></g>;
      case 'shark': return <g transform={`translate(${wob * 2} 0)`}><path d="M-100 20 Q-20 -40 80 0 L100 -25 L95 25 Q-10 60 -100 20 Z" {...s} /><path d="M-10 -15 L10 -70 L35 -10" {...s} /><circle cx={50} cy={0} r={6} fill={color} /></g>;
      case 'clock': return <g><circle r={85} {...s} /><g transform={`rotate(${t * 6})`}><path d="M0 0 V-60" {...a} /></g><path d="M0 0 H40" {...s} /></g>;
      case 'bulb': return <g><path d="M-50 10 a60 60 0 1 1 100 0 q-20 25 -20 45 h-60 q0 -20 -20 -45 Z" {...s} /><path d="M-25 75 H25 M-18 95 H18" {...s} /><path d="M0 -105 V-125 M-75 -75 l-14 -14 M75 -75 l14 -14" {...a} /></g>;
      case 'question': return <g><path d="M-45 -45 a45 45 0 1 1 60 42 q-15 8 -15 30 V40" {...s} strokeWidth={16} /><circle cy={80} r={11} fill={accent} /></g>;
      case 'server': return <g>{[-60, 0, 60].map((y) => <g key={y}><rect x={-90} y={y - 25} width={180} height={50} rx={8} {...s} /><circle cx={60} cy={y} r={7} fill={(Math.floor(t / 8) + y) % 3 === 0 ? accent : color} /></g>)}</g>;
      case 'building': return <g><rect x={-70} y={-90} width={140} height={180} {...s} />{[-55, -10, 35].map((y) => [-40, 0, 40].map((x) => <rect key={`${x}${y}`} x={x - 12} y={y} width={24} height={24} {...s} strokeWidth={6} />))}</g>;
      case 'rocket': return <g transform={`translate(0 ${-wob * 2})`}><path d="M0 -100 q45 50 35 130 h-70 q-10 -80 35 -130 Z" {...s} /><circle cy={-30} r={18} {...a} /><path d="M-35 30 l-30 40 h30 M35 30 l30 40 h-30" {...s} /><path d="M-15 75 q15 40 30 0" {...a} /></g>;
      case 'house': return <g><path d="M-90 -10 L0 -90 L90 -10 V85 H-90 Z" {...s} /><rect x={-22} y={25} width={44} height={60} {...a} /></g>;
      case 'warning': return <g><path d="M0 -90 L95 75 H-95 Z" {...s} /><path d="M0 -25 V25" {...a} strokeWidth={16} /><circle cy={50} r={9} fill={accent} /></g>;
      case 'fire': return <g transform={`scale(${1 + Math.sin(t / 4) * 0.04})`}><path d="M0 90 c-70 0 -80 -70 -40 -120 c0 40 30 40 30 10 c0 -40 30 -60 30 -80 c40 40 75 90 55 140 c-10 30 -40 50 -75 50 Z" {...s} /><path d="M0 85 c-25 0 -35 -25 -15 -50 c10 20 25 5 25 -10 c20 20 25 60 -10 60 Z" {...a} /></g>;
      case 'lock': return <g><rect x={-70} y={-10} width={140} height={100} rx={12} {...s} /><path d="M-45 -10 V-45 a45 45 0 0 1 90 0 V-10" {...s} /><circle cy={40} r={12} fill={accent} /></g>;
      case 'brain': return <g><path d="M0 -80 c-40 -10 -90 20 -80 60 c-25 30 0 80 40 75 c10 25 40 25 40 0 Z M0 -80 c40 -10 90 20 80 60 c25 30 0 80 -40 75 c-10 25 -40 25 -40 0" {...s} /><path d="M-40 -30 q20 10 0 30 M40 -30 q-20 10 0 30" {...a} /></g>;
      case 'people': return <g>{[-60, 0, 60].map((x, i) => <g key={x} transform={`translate(${x} ${i === 1 ? -10 : 10})`}><circle cy={-45} r={22} {...s} /><path d="M-35 60 q0 -60 35 -60 q35 0 35 60" {...s} /></g>)}</g>;
      case 'film': return <g><rect x={-95} y={-65} width={190} height={130} rx={10} {...s} /><path d="M-95 -30 H95 M-95 30 H95" {...s} strokeWidth={6} /><path d="M-15 -15 L20 0 L-15 15 Z" fill={accent} /></g>;
      case 'crown': return <g><path d="M-90 50 L-80 -50 L-40 0 L0 -70 L40 0 L80 -50 L90 50 Z" {...s} /><path d="M-90 75 H90" {...a} /></g>;
      case 'bomb': return <g><circle cy={15} r={70} {...s} /><path d="M40 -40 l25 -25 q20 -10 30 -30" {...s} /><circle cx={95} cy={-95} r={8 + Math.abs(Math.sin(t / 3)) * 8} fill={accent} /></g>;
      case 'moon': return <g><path d="M30 -85 a90 90 0 1 0 55 120 a70 70 0 1 1 -55 -120 Z" {...s} /></g>;
      case 'sun': return <g transform={`rotate(${t})`}><circle r={45} {...a} />{Array.from({length: 8}).map((_, i) => <path key={i} d="M0 -65 V-95" {...s} transform={`rotate(${i * 45})`} />)}</g>;
      case 'heart': return <g transform={`scale(${1 + Math.max(0, Math.sin(t / 5)) * 0.08})`}><path d="M0 80 L-75 0 a45 45 0 0 1 75 -60 a45 45 0 0 1 75 60 Z" {...s} /></g>;
      case 'eye': return <g><path d="M-100 0 Q0 -90 100 0 Q0 90 -100 0 Z" {...s} /><circle r={30} {...a} /><circle r={10} fill={color} /></g>;
      default: return <g><circle r={70} {...s} /><path d="M-30 0 H30" {...a} /></g>;
    }
  })();
  return <g transform={`scale(${size})`}>{body}</g>;
};
