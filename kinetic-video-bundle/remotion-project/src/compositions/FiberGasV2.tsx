/**
 * dlh-fiber-gas V2 — "Dead Guts Don't Bloat"
 * Roger voice v2 (URL fixed: dailylifehacks.com spoken, www.daily-life-hacks.com displayed).
 * Acoustic warm music. ~43s.
 * img0=nuclear explosion (0s), img1=vegetables (2.2s), img5=petri dish (18s),
 * img2=broccoli (24s), img3=apple (26.4s), img4=oatmeal (28.4s)
 * Outro at 37.5s: white bg + logo + www.daily-life-hacks.com
 */
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-fiber-gas/transcript-v2_transcript.json';

const OUTRO_START = 37.5;
const OUTRO_FADE  = 0.5;

export const FiberGasV2: React.FC = () => {
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
        speechFile="dlh-fiber-gas/speech-v2.mp3"
        musicFile="dlh-fiber-gas/music-v1.mp3"
        musicVolume={0.13}
        imageCues={[
          { time: 0,    src: 'dlh-fiber-gas/images/img0.jpg' }, // nuclear explosion — "Bloated"
          { time: 2.2,  src: 'dlh-fiber-gas/images/img1.jpg' }, // colorful veg — "eat healthy"
          { time: 18.0, src: 'dlh-fiber-gas/images/img5.jpg' }, // petri dish — "bacteria"
          { time: 24.0, src: 'dlh-fiber-gas/images/img2.jpg' }, // dark broccoli — "broccoli"
          { time: 26.4, src: 'dlh-fiber-gas/images/img3.jpg' }, // apple — "That apple"
          { time: 28.4, src: 'dlh-fiber-gas/images/img4.jpg' }, // oatmeal — "That bowl"
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
