/**
 * dlh-protein-dollar V1 — "Protein per Dollar"
 * 49 grocery foods ranked by grams of protein per dollar (USDA-verified study).
 * Pinto beans 98 g/$ vs bacon 9 g/$ — the 11x gap is the WTF moment.
 * Single 9:16 background image (bg-main.jpg) throughout, Ken Burns keeps it alive.
 * musicVolume 0.28 — lesson learned: 0.18 was inaudible under this speech mix.
 */
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-protein-dollar/transcript-v2_transcript.json';

const OUTRO_START = 31.1;
const OUTRO_FADE  = 0.5;

export const ProteinDollarV1: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = frame / fps;

  const outroOpacity = interpolate(
    t,
    [OUTRO_START, OUTRO_START + OUTRO_FADE],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill>
      <KineticShortComposition
        wordTimings={transcript.words}
        speechFile="dlh-protein-dollar/speech-v2.mp3"
        musicFile="dlh-protein-dollar/music-v1.mp3"
        musicVolume={0.28}
        imageCues={[
          { time: 0, src: 'dlh-protein-dollar/images/bg-main.jpg' },
        ]}
        overlayOpacity={0.30}
        colorSchemeStart={0}
      />

      {outroOpacity > 0 && (
        <AbsoluteFill style={{
          backgroundColor: `rgba(255,255,255,${outroOpacity})`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 48,
        }}>
          <Img src={staticFile('logo.png')} style={{ width: 520, opacity: outroOpacity }} />
          <div style={{
            fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
            fontSize: 72, fontWeight: 800, color: '#F29B30',
            textAlign: 'center', opacity: outroOpacity,
          }}>
            www.daily-life-hacks.com
          </div>
          <div style={{
            fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif",
            fontSize: 46, fontWeight: 500, color: '#444444',
            textAlign: 'center', opacity: outroOpacity,
          }}>
            Free recipes. Every week.
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
