import React from 'react';
import {Composition} from 'remotion';
import {MoonShort, MOON_FRAMES} from './MoonShort';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="MoonShort"
      component={MoonShort}
      durationInFrames={MOON_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
