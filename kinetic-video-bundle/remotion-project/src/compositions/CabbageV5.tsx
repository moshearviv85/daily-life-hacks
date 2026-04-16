/**
 * dlh-cabbage V5 — Kling live video background test
 * Identical to V4 except background is bg-kling-full.mp4 (4 Kling clips stitched)
 * instead of bg-v1.jpg static image.
 *
 * Purpose: A/B test — does live video background improve engagement vs static image?
 */

import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-cabbage/transcript-v1_transcript.json';

const OUTRO_START = 50.26;
const OUTRO_FADE  = 0.5;

export const CabbageV5: React.FC = () => {
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
        speechFile="dlh-cabbage/speech-v1.mp3"
        musicFile="dlh-cabbage/music-v1.mp3"
        musicVolume={0.18}
        imageCues={[{ time: 0, src: 'dlh-cabbage/images/bg-kling-full.mp4' }]}
        overlayOpacity={0.45}
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
