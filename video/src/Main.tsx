import React from "react";
import {AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig} from "remotion";
import {
  Brand,
  Boundaries,
  ConnectivityGraph,
  DataTabs,
  FieldRecords,
  Knowledge,
  MovementLayers,
  MovementStudy,
  Outro,
  PriorityIndex,
  Problem,
  Question,
} from "./Scenes";
import {BGM_TRIM_FRAMES, SHOTS} from "./timing";

const Picture: React.FC = () => {
  const scene = (key: keyof typeof SHOTS, node: React.ReactNode) => (
    <Sequence from={SHOTS[key].from} durationInFrames={SHOTS[key].duration}>
      {node}
    </Sequence>
  );

  return (
    <AbsoluteFill>
      {scene("question", <Question />)}
      {scene("problem", <Problem />)}
      {scene("brand", <Brand />)}
      {scene("fieldRecords", <FieldRecords />)}
      {scene("movementStudy", <MovementStudy />)}
      {scene("connectivityGraph", <ConnectivityGraph />)}
      {scene("knowledge", <Knowledge />)}
      {scene("movementLayers", <MovementLayers />)}
      {scene("dataTabs", <DataTabs />)}
      {scene("priorityIndex", <PriorityIndex />)}
      {scene("boundaries", <Boundaries />)}
      {scene("outro", <Outro />)}
    </AbsoluteFill>
  );
};

export const Main: React.FC = () => {
  const {durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill>
      <Picture />
      <Audio
        src={staticFile("audio/bgm.mp3")}
        trimBefore={BGM_TRIM_FRAMES}
        volume={(frame) => Math.min(0.38, frame / 90 * 0.38, (durationInFrames - frame) / 40 * 0.38)}
      />
    </AbsoluteFill>
  );
};

export const MainNoBgm: React.FC = () => <Picture />;
