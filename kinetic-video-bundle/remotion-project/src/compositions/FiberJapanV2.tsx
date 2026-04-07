/**
 * dlh-fiber-japan V2 - "Facts Drop"
 * Charlie voice. Driving beat. 39s.
 * Image cues synced to transcript:
 *   0s  - img4 (spread)        - "Three Japanese foods"
 *   4s  - img1 (edamame)       - "Edamame" @4.4s
 *  10s  - img2 (natto)         - "Natto" @10.4s
 *  20s  - img3 (burdock root)  - "Burdock root" @19.9s
 *  25s  - img4 (spread)        - "Meanwhile you're eating sashimi" @25.5s
 *  33s  - img1 (edamame)       - "these three" @33.5s - callback
 */
import React from 'react';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-fiber-japan/transcript-v2_transcript.json';

export const FiberJapanV2: React.FC = () => (
  <KineticShortComposition
    wordTimings={transcript.words}
    speechFile="dlh-fiber-japan/speech-v2.mp3"
    musicFile="dlh-fiber-japan/music-v2.mp3"
    musicVolume={0.20}
    imageCues={[
      { time: 0,  src: 'dlh-fiber-japan/images/img4.jpg' },
      { time: 4,  src: 'dlh-fiber-japan/images/img1.jpg' },
      { time: 10, src: 'dlh-fiber-japan/images/img2.jpg' },
      { time: 20, src: 'dlh-fiber-japan/images/img3.jpg' },
      { time: 25, src: 'dlh-fiber-japan/images/img4.jpg' },
      { time: 33, src: 'dlh-fiber-japan/images/img1.jpg' },
    ]}
    overlayOpacity={0.65}
    colorSchemeStart={2}
  />
);
