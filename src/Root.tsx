import React from 'react';
import {Composition} from 'remotion';
import {MoonShort, MOON_FRAMES} from './MoonShort';
import {Episode, EpisodeProps, episodeLength} from './ep/Episode';
import {Film, FilmProps, filmLength} from './film/Film';

const demo: EpisodeProps = {
  theme: 'whatif', audio: [], captions: true,
  scenes: [
    {start: 0, dur: 90, template: 'title', title: 'What if every *undersea cable* got cut?', sub: '99% of the internet lives on the ocean floor', vo: 'Ninety nine percent of the internet runs through cables on the ocean floor.'},
    {start: 90, dur: 90, template: 'stat', value: 1400000, suffix: ' km', label: 'of cable on the seabed', icon: 'cable', vo: 'There is about one point four million kilometres of it.'},
    {start: 180, dur: 100, template: 'stick', pose: 'stand', pose2: 'shock', icon: 'shark', say: 'Wait, sharks bite these?', doubt: 'Rarely. Ship anchors do.', vo: 'And yes, sharks have bitten them. Anchors are worse.'},
    {start: 280, dur: 100, template: 'bars', title: 'What actually breaks them', bars: [{label: 'Anchors', value: 70}, {label: 'Quakes', value: 12}, {label: 'Sharks', value: 1}], suffix: '%', vo: 'Most breaks are fishing and anchors.'},
    {start: 380, dur: 90, template: 'versus', left: {title: 'Satellites', value: '~1%', icon: 'satellite'}, right: {title: 'Cables', value: '~99%', icon: 'cable'}, vo: 'Satellites carry about one percent.'},
    {start: 470, dur: 80, template: 'end', title: 'So... *what if?*', vo: 'Follow for the next one.'},
  ],
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="MoonShort" component={MoonShort} durationInFrames={MOON_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Episode" component={Episode as unknown as React.FC<Record<string, unknown>>} defaultProps={demo as unknown as Record<string, unknown>}
      durationInFrames={episodeLength(demo)} fps={30} width={1920} height={1080}
      calculateMetadata={({props}) => {
        const p = props as unknown as EpisodeProps & {w?: number; h?: number};
        return {durationInFrames: episodeLength(p), width: p.w || 1920, height: p.h || 1080};
      }} />
    <Composition id="Film" component={Film as unknown as React.FC<Record<string, unknown>>}
      defaultProps={{look: {paper: '#F3EBDD', ink: '#151515', accent: '#FF5A1F', font: 'inter', film: 'clean', grain: 0.3, vignette: 0.5, letterbox: false, captionBg: '#151515', captionInk: '#fff'}, shots: [], words: [], audio: []} as unknown as Record<string, unknown>}
      durationInFrames={300} fps={30} width={1920} height={1080}
      calculateMetadata={({props}) => {
        const p = props as unknown as FilmProps & {w?: number; h?: number};
        return {durationInFrames: filmLength(p), width: p.w || 1920, height: p.h || 1080};
      }} />
  </>
);
