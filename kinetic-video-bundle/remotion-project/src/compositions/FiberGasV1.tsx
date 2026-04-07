/**
 * dlh-fiber-gas V1 — "Dead Guts Don't Bloat"
 * Roger voice, speed 0.95. Acoustic warm music. 45s.
 * img0=nuclear explosion (hook), img1=vegetables, img2=broccoli, img3=apple, img4=oatmeal
 * Outro at 37.0s: white bg + logo + URL
 */
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-fiber-gas/transcript-v1_transcript.json';

const OUTRO_START = 37.0;
const OUTRO_FADE  = 0.5;

export const FiberGasV1: React.FC = () => {
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
        speechFile="dlh-fiber-gas/speech-v1.mp3"
        musicFile="dlh-fiber-gas/music-v1.mp3"
        musicVolume={0.13}
        imageCues={[
          { time: 0,    src: 'dlh-fiber-gas/images/img0.jpg' }, // nuclear explosion — "Bloated"
          { time: 8.6,  src: 'dlh-fiber-gas/images/img1.jpg' }, // colorful veg — "Most people think..."
          { time: 17.5, src: 'dlh-fiber-gas/images/img2.jpg' }, // dark broccoli — "Your bacteria..."
          { time: 25.6, src: 'dlh-fiber-gas/images/img3.jpg' }, // apple on counter
          { time: 28.1, src: 'dlh-fiber-gas/images/img4.jpg' }, // oatmeal bowl
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
