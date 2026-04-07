/**
 * dlh-fiber-japan V4 - "The Rhythm Drop"
 * Charlie voice, speed 1.1. Trap/rhythmic beat. 37s.
 * Image cues synced to transcript.
 * Outro at 31.0s: white bg + logo + URL.
 */
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-fiber-japan/transcript-v4_transcript.json';

const OUTRO_START = 31.0;
const OUTRO_FADE_DUR = 0.5;

export const FiberJapanV4: React.FC = () => {
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
      {/* Main kinetic video — speech + music still play underneath */}
      <KineticShortComposition
        wordTimings={transcript.words}
        speechFile="dlh-fiber-japan/speech-v4.mp3"
        musicFile="dlh-fiber-japan/music-v4.mp3"
        musicVolume={0.18}
        imageCues={[
          { time: 0,    src: 'dlh-fiber-japan/images/img4.jpg' },
          { time: 8.6,  src: 'dlh-fiber-japan/images/img1.jpg' },
          { time: 12.5, src: 'dlh-fiber-japan/images/img2.jpg' },
          { time: 16.5, src: 'dlh-fiber-japan/images/img3.jpg' },
          { time: 20.1, src: 'dlh-fiber-japan/images/img4.jpg' },
          { time: 31.3, src: 'dlh-fiber-japan/images/img1.jpg' },
        ]}
        overlayOpacity={0.30}
        colorSchemeStart={3}
      />

      {/* Outro: white card with logo + URL */}
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
            style={{
              width: 520,
              opacity: outroOpacity,
            }}
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
