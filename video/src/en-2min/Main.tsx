import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { C, ramp } from "../theme";
import { ScenePicture } from "./Scenes";
import {
  BGM_END_FRAME,
  BGM_FADE_OUT_FRAMES,
  BGM_OFFSET_FRAMES,
  SCENES,
  TOTAL_FRAMES,
} from "./timing";

export type EnglishVideoProps = {
  music: boolean;
};

const Progress: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 7,
        background: "#D7D4CC",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${(f / (TOTAL_FRAMES - 1)) * 100}%`,
          background: C.accentDark,
        }}
      />
    </div>
  );
};

export const EnglishVideo: React.FC<EnglishVideoProps> = ({ music }) => (
  <AbsoluteFill>
    {SCENES.map((scene, index) => (
      <Sequence
        key={scene.id}
        from={scene.from}
        durationInFrames={scene.duration}
        name={scene.chapter}
      >
        <ScenePicture scene={scene} index={index} />
      </Sequence>
    ))}
    <Progress />
    {music && (
      <Sequence durationInFrames={BGM_END_FRAME} layout="none" name="Music">
        <Audio
          src={staticFile("audio/bgm.mp3")}
          trimBefore={BGM_OFFSET_FRAMES}
          volume={(frame) => {
            const envelope = Math.min(
              ramp(frame, 0, 35),
              1 -
                ramp(frame, BGM_END_FRAME - BGM_FADE_OUT_FRAMES, BGM_END_FRAME),
            );
            return envelope * 0.34;
          }}
        />
      </Sequence>
    )}
  </AbsoluteFill>
);
