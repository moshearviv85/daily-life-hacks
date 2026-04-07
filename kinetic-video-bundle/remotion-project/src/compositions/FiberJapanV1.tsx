/**
 * dlh-fiber-japan V1 - "The Skeptic"
 * Roger voice. Lo-fi chill. 54s.
 *
 * imageCues based on exact word timestamps from transcript:
 *  0.10s  "Japanese food is healthy" → img4 (spread, general Japanese)
 *  5.74s  "Sashimi has zero fiber"   → img4 (still general, sashimi context)
 * 11.42s  "edamame,"                 → img1 FLASH (edamame appears)
 * 12.50s  "natto,"                   → img2 FLASH (natto appears)
 * 13.52s  "burdock root"             → img3 FLASH (burdock appears)
 * 15.00s  back to intro list context → img4 briefly
 * 18.48s  "Edamame alone, 8 grams"   → img1 (settle on edamame details)
 * 25.72s  "Natto is weirder"         → img2 (settle on natto)
 * 36.22s  "Burdock root, 6 grams"    → img3 (settle on burdock)
 * 42.18s  "The Japanese gut secret"  → img4 (wrap-up, spread)
 */
import React from 'react';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-fiber-japan/transcript-v1_transcript.json';

export const FiberJapanV1: React.FC = () => (
  <KineticShortComposition
    wordTimings={transcript.words}
    speechFile="dlh-fiber-japan/speech-v1.mp3"
    musicFile="dlh-fiber-japan/music-v1.mp3"
    musicVolume={0.16}
    imageCues={[
      { time: 0,     src: 'dlh-fiber-japan/images/img4.jpg' },
      { time: 5.74,  src: 'dlh-fiber-japan/images/img4.jpg' },
      { time: 11.42, src: 'dlh-fiber-japan/images/img1.jpg' }, // "edamame" flash
      { time: 12.50, src: 'dlh-fiber-japan/images/img2.jpg' }, // "natto" flash
      { time: 13.52, src: 'dlh-fiber-japan/images/img3.jpg' }, // "burdock" flash
      { time: 15.00, src: 'dlh-fiber-japan/images/img4.jpg' }, // "things that are..."
      { time: 18.48, src: 'dlh-fiber-japan/images/img1.jpg' }, // "Edamame alone, 8g"
      { time: 25.72, src: 'dlh-fiber-japan/images/img2.jpg' }, // "Natto is weirder"
      { time: 36.22, src: 'dlh-fiber-japan/images/img3.jpg' }, // "Burdock root"
      { time: 42.18, src: 'dlh-fiber-japan/images/img4.jpg' }, // CTA / gut secret
    ]}
    overlayOpacity={0.68}
    colorSchemeStart={0}
  />
);
