/**
 * dlh-healthy-fats V4 - "The Fat Lie" — Acoustic Warm
 * Same Roger voice (speech-v3) + transcript, NEW acoustic/warm music (music-v4).
 * Tests acoustic guitar vs lo-fi for the David Miller dry-tone style.
 * Upgraded KineticShortComposition: spring overshoot, squash-stretch, semantic motion.
 */
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-healthy-fats/transcript-v3_transcript.json';

const OUTRO_START = 37.2;
const OUTRO_FADE_DUR = 0.5;

export const HealthyFatsV4: React.FC = () => {
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
        speechFile="dlh-healthy-fats/speech-v3.mp3"
        musicFile="dlh-healthy-fats/music-v4.mp3"
        musicVolume={0.13}
        imageCues={[
          { time: 0,    src: 'dlh-healthy-fats/images/img0.jpg' }, // "Fat was villain / low-fat era"
          { time: 13.7, src: 'dlh-healthy-fats/images/img1.jpg' }, // "Avocado"
          { time: 18.6, src: 'dlh-healthy-fats/images/img2.jpg' }, // "Olive oil"
          { time: 23.3, src: 'dlh-healthy-fats/images/img3.jpg' }, // "Walnuts"
          { time: 26.8, src: 'dlh-healthy-fats/images/img4.jpg' }, // "Salmon"
          { time: 31.1, src: 'dlh-healthy-fats/images/img1.jpg' }, // "Nothing complicated"
        ]}
        overlayOpacity={0.30}
        colorSchemeStart={0}
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
          <div style={{
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: 72,
            fontWeight: 800,
            color: '#F29B30',
            letterSpacing: '0.01em',
            textAlign: 'center',
            opacity: outroOpacity,
          }}>
            www.daily-life-hacks.com
          </div>
          <div style={{
            fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: 46,
            fontWeight: 500,
            color: '#444444',
            textAlign: 'center',
            opacity: outroOpacity,
          }}>
            Free recipes. Every week.
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
