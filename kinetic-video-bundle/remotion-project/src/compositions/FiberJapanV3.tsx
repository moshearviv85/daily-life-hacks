/**
 * dlh-fiber-japan V3 - "The Story"
 * George voice. Cinematic music. 52s.
 * Image cues synced to transcript:
 *   0s  - img4 (Japanese restaurant spread) - "at a Japanese restaurant"
 *  13s  - img4 stays                        - "The sashimi, protein, clean" @12.9s
 *  20s  - img1 (edamame)                    - "The edamame" @20.4s
 *  27s  - img2 (natto/miso feel)            - "The miso, probiotics" @26.8s
 *  32s  - img3 (burdock/historical)         - "Japan has eaten like this for centuries" @32s
 *  46s  - img4 (spread / CTA)              - "Find the recipes" @45.8s
 */
import React from 'react';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-fiber-japan/transcript-v3_transcript.json';

export const FiberJapanV3: React.FC = () => (
  <KineticShortComposition
    wordTimings={transcript.words}
    speechFile="dlh-fiber-japan/speech-v3.mp3"
    musicFile="dlh-fiber-japan/music-v3.mp3"
    musicVolume={0.15}
    imageCues={[
      { time: 0,  src: 'dlh-fiber-japan/images/img4.jpg' },
      { time: 20, src: 'dlh-fiber-japan/images/img1.jpg' },
      { time: 27, src: 'dlh-fiber-japan/images/img2.jpg' },
      { time: 32, src: 'dlh-fiber-japan/images/img3.jpg' },
      { time: 46, src: 'dlh-fiber-japan/images/img4.jpg' },
    ]}
    overlayOpacity={0.75}
    colorSchemeStart={1}
  />
);
