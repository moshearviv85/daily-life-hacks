/**
 * dlh-healthy-fats V2 - "The Fat Lie" FAST
 * Charlie voice, speed 1.3. Phonk beat. 41s.
 * fastMode=true: stiffness 650, mass 0.25 — snap animations.
 * Outro at 32.3s: white bg + logo + URL.
 */
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-healthy-fats/transcript-v2_transcript.json';

const OUTRO_START = 32.3;
const OUTRO_FADE_DUR = 0.4;

export const HealthyFatsV2: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  const outroOpacity = interpolate(
    currentTime,
    [OUTRO_START, OUTRO_START + OUTRO_FADE_DUR],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill>
      <KineticShortComposition
        wordTimings={transcript.words}
        speechFile="dlh-healthy-fats/speech-v2.mp3"
        musicFile="dlh-healthy-fats/music-v2.mp3"
        musicVolume={0.20}
        imageCues={[
          { time: 0,    src: 'dlh-healthy-fats/images/img1.jpg' },
          { time: 7.6,  src: 'dlh-healthy-fats/images/img1.jpg' },
          { time: 11.6, src: 'dlh-healthy-fats/images/img2.jpg' },
          { time: 15.9, src: 'dlh-healthy-fats/images/img3.jpg' },
          { time: 19.6, src: 'dlh-healthy-fats/images/img4.jpg' },
          { time: 25.9, src: 'dlh-healthy-fats/images/img1.jpg' },
        ]}
        overlayOpacity={0.28}
        colorSchemeStart={2}
        fastMode={true}
      />

      {outroOpacity > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: `rgba(255, 255, 255, ${outroOpacity})`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 48,
          }}
        >
          <Img
            src={staticFile('logo.png')}
            style={{ width: 520, opacity: outroOpacity }}
          />
          <div
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: 72,
              fontWeight: 800,
              color: '#F29B30',
              letterSpacing: '0.01em',
              textAlign: 'center',
              opacity: outroOpacity,
            }}
          >
            www.daily-life-hacks.com
          </div>
          <div
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
              fontSize: 46,
              fontWeight: 500,
              color: '#444444',
              textAlign: 'center',
              opacity: outroOpacity,
            }}
          >
            Free recipes. Every week.
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
