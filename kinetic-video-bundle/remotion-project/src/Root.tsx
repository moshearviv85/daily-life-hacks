import React from 'react';
import { Composition } from 'remotion';
import { DlhShort01 } from './compositions/DlhShort01';
import { DlhShort02 } from './compositions/DlhShort02';
import { FiberJapanV1 } from './compositions/FiberJapanV1';
import { FiberJapanV2 } from './compositions/FiberJapanV2';
import { FiberJapanV3 } from './compositions/FiberJapanV3';
import { FiberJapanV4 } from './compositions/FiberJapanV4';
import { HealthyFatsV1 } from './compositions/HealthyFatsV1';
import { HealthyFatsV2 } from './compositions/HealthyFatsV2';
import { HealthyFatsV3 } from './compositions/HealthyFatsV3';
import { HealthyFatsV4 } from './compositions/HealthyFatsV4';
import { FiberGasV1 } from './compositions/FiberGasV1';
import { FiberGasV2 } from './compositions/FiberGasV2';
import { FiberGasV3 } from './compositions/FiberGasV3';
import { FiberGasV4 } from './compositions/FiberGasV4';
import { FiberGasV5 } from './compositions/FiberGasV5';
import { FiberGasV6 } from './compositions/FiberGasV6';
import { FiberGasV7 } from './compositions/FiberGasV7';
import { CabbageV1 } from './compositions/CabbageV1';
import { CabbageV2 } from './compositions/CabbageV2';
import { CabbageV3 } from './compositions/CabbageV3';
import { CabbageV4 } from './compositions/CabbageV4';
import { CabbageV5 } from './compositions/CabbageV5';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DlhShort01"
        component={DlhShort01}
        durationInFrames={1350}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="DlhShort02"
        component={DlhShort02}
        durationInFrames={1590}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* ── Fiber Japan Series ── */}
      <Composition
        id="FiberJapanV1"
        component={FiberJapanV1}
        durationInFrames={1650}   // ~55 sec @ 30fps
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FiberJapanV2"
        component={FiberJapanV2}
        durationInFrames={1350}   // ~45 sec @ 30fps
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FiberJapanV3"
        component={FiberJapanV3}
        durationInFrames={1650}   // ~55 sec @ 30fps
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FiberJapanV4"
        component={FiberJapanV4}
        durationInFrames={1170}   // ~39 sec @ 30fps
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="HealthyFatsV1"
        component={HealthyFatsV1}
        durationInFrames={1260}   // ~42 sec @ 30fps
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="HealthyFatsV2"
        component={HealthyFatsV2}
        durationInFrames={1260}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="HealthyFatsV3"
        component={HealthyFatsV3}
        durationInFrames={1500}   // ~50 sec @ 30fps
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="HealthyFatsV4"
        component={HealthyFatsV4}
        durationInFrames={1500}   // ~50 sec @ 30fps — same speech as V3
        fps={30}
        width={1080}
        height={1920}
      />

      {/* ── Fiber Gas Series ── */}
      <Composition
        id="FiberGasV1"
        component={FiberGasV1}
        durationInFrames={1440}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FiberGasV2"
        component={FiberGasV2}
        durationInFrames={1380}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FiberGasV3"
        component={FiberGasV3}
        durationInFrames={1170}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FiberGasV4"
        component={FiberGasV4}
        durationInFrames={1170}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FiberGasV5"
        component={FiberGasV5}
        durationInFrames={1170}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FiberGasV6"
        component={FiberGasV6}
        durationInFrames={1170}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="FiberGasV7"
        component={FiberGasV7}
        durationInFrames={1170}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* ── Cabbage Series ── */}
      <Composition
        id="CabbageV1"
        component={CabbageV1}
        durationInFrames={1728}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CabbageV2"
        component={CabbageV2}
        durationInFrames={1728}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CabbageV3"
        component={CabbageV3}
        durationInFrames={1728}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CabbageV4"
        component={CabbageV4}
        durationInFrames={1728}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="CabbageV5"
        component={CabbageV5}
        durationInFrames={1728}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
