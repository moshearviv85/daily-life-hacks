/**
 * dlh-healthy-fats V1 - "The Fat Lie"
 * Charlie voice, speed 1.1. Trap beat. ~40s.
 * Outro at 31.6s: white bg + logo + URL.
 */
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-healthy-fats/transcript-v1_transcript.json';

const OUTRO_START = 31.6;
const OUTRO_FADE_DUR = 0.5;

export const HealthyFatsV1: React.FC = () => {
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
        speechFile="dlh-healthy-fats/speech-v1.mp3"
        musicFile="dlh-healthy-fats/music-v1.mp3"
        musicVolume={0.18}
        imageCues={[
          { time: 0,    src: 'dlh-healthy-fats/images/img1.jpg' },
          { time: 6.4,  src: 'dlh-healthy-fats/images/img1.jpg' },
          { time: 11.2, src: 'dlh-healthy-fats/images/img2.jpg' },
          { time: 15.9, src: 'dlh-healthy-fats/images/img3.jpg' },
          { time: 20.4, src: 'dlh-healthy-fats/images/img4.jpg' },
          { time: 25.2, src: 'dlh-healthy-fats/images/img1.jpg' },
        ]}
        overlayOpacity={0.30}
        colorSchemeStart={1}
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
