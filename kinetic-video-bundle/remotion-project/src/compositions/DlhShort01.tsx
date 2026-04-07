import React from 'react';
import { SequenceComposition } from './SequenceComposition';
import transcriptData from '../../projects/dlh-short-01/transcript_transcript.json';

const WORD_TIMINGS = transcriptData.words
  .filter((w: { word: string }) => w.word.trim() !== '')
  .map((w: { word: string; start: number; end: number }) => ({
    word: w.word.trim(),
    start: w.start,
    end: w.end,
  }));

export const DlhShort01: React.FC = () => {
  return (
    <SequenceComposition
      wordTimings={WORD_TIMINGS}
      audioFile="dlh-short-01/speech.mp3"
      colorSchemeStart={0}
    />
  );
};
