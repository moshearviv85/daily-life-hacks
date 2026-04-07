import React from 'react';
import { FoodShortComposition } from './FoodShortComposition';
import transcriptData from '../../projects/dlh-short-01/transcript_transcript.json';

const WORD_TIMINGS = (transcriptData.words as { word: string; start: number; end: number }[])
  .filter(w => w.word.trim() !== '')
  .map(w => ({ word: w.word.trim(), start: w.start, end: w.end }));

// 45s speech + 8s CTA = 53s = 1590 frames
const TOTAL_FRAMES = 1590;

// 5 image slides covering ~45 seconds of speech (~9s each = 270 frames)
// Last slide stretches to cover CTA area too (TransitionSeries fills the rest)
const SLIDES = [
  { src: 'images/img1.jpg', durationInFrames: 280, zoomDirection: 'in'  as const, panDirection: 'right' as const },
  { src: 'images/img2.jpg', durationInFrames: 270, zoomDirection: 'out' as const, panDirection: 'left'  as const },
  { src: 'images/img3.jpg', durationInFrames: 270, zoomDirection: 'in'  as const, panDirection: 'none'  as const },
  { src: 'images/img4.jpg', durationInFrames: 270, zoomDirection: 'out' as const, panDirection: 'right' as const },
  { src: 'images/img5.jpg', durationInFrames: 500, zoomDirection: 'in'  as const, panDirection: 'left'  as const },
];

export const DlhShort02: React.FC = () => (
  <FoodShortComposition
    wordTimings={WORD_TIMINGS}
    audioFile="dlh-short-01/speech.mp3"
    slides={SLIDES}
    totalDurationInFrames={TOTAL_FRAMES}
  />
);
