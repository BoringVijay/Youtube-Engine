import React from "react";
import { Composition, registerRoot } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { CastSheet } from "./videos/ice/CastSheet";
import { IceShort, ICE_FRAMES } from "./videos/ice/Ice";
const Root: React.FC = () => <>
  <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="IceShort" component={IceShort} durationInFrames={ICE_FRAMES} fps={30} width={1080} height={1920} />
  <Composition id="CastSheet" component={CastSheet} durationInFrames={1} fps={30} width={1080} height={1920} />
</>;
registerRoot(Root);
