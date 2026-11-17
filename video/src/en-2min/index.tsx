import React from "react";
import { Composition, registerRoot } from "remotion";
import { EnglishVideo } from "./Main";
import { FPS, TOTAL_FRAMES } from "./timing";

export const EnglishRoot: React.FC = () => (
  <>
    <Composition
      id="TaipeiRatLabEnglish2Min"
      component={EnglishVideo}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={TOTAL_FRAMES}
      defaultProps={{ music: true }}
    />
    <Composition
      id="TaipeiRatLabEnglish2MinNoBgm"
      component={EnglishVideo}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={TOTAL_FRAMES}
      defaultProps={{ music: false }}
    />
    <Composition
      id="TaipeiRatLabEnglish2MinMusicOnly"
      component={EnglishVideo}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={TOTAL_FRAMES}
      defaultProps={{ music: true }}
    />
  </>
);

registerRoot(EnglishRoot);
