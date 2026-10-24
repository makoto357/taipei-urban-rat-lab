import React from "react";
import {Composition} from "remotion";
import {Main, MainNoBgm} from "./Main";
import {FPS, TOTAL_FRAMES} from "./timing";

export const Root: React.FC = () => (
  <>
    <Composition
      id="TaipeiRatLabPromo"
      component={Main}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
    <Composition
      id="TaipeiRatLabPromoNoBgm"
      component={MainNoBgm}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  </>
);
