/**
 * dlh-fiber-gas V6 — "Dead Guts Don't Bloat"
 * Pin images (no text) instead of generic stock photos.
 * Broken up vegetable section: new image at 8.5s on "DEAD GUTS DON'T BLOAT".
 * Hero words minimum 0.4s display time.
 */
import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { KineticShortComposition } from './KineticShortComposition';
import transcript from '../../projects/dlh-fiber-gas/transcript-v3_transcript.json';

const OUTRO_START = 33.0;
const OUTRO_FADE  = 0.5;

export const FiberGasV6: React.FC = () => {
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
        speechFile="dlh-fiber-gas/speech-v3.mp3"
        musicFile="dlh-fiber-gas/music-v3.mp3"
        musicVolume={0.18}
        imageCues={[
          { time: 0,    src: 'dlh-fiber-gas/images/pin-breakfast.jpg' }, // high-fiber breakfast — "Bloated"
          { time: 2.4,  src: 'dlh-fiber-gas/images/pin-mealplan.jpg'  }, // meal plan — "You added fiber"
          { time: 8.5,  src: 'dlh-fiber-gas/images/pin-soup.jpg'      }, // fiber soup — "DEAD GUTS DON'T BLOAT"
          { time: 16.2, src: 'dlh-fiber-gas/images/pin-artichoke.jpg' }, // artichoke gut health — "bacteria"
          { time: 21.3, src: 'dlh-fiber-gas/images/pin-tacos.jpg'     }, // black bean tacos — "Don't blame the broccoli"
          { time: 23.6, src: 'dlh-fiber-gas/images/pin-chia.jpg'      }, // chia pudding — "That apple in your fridge"
          { time: 25.5, src: 'dlh-fiber-gas/images/pin-mealplan.jpg'  }, // meal plan — "Four weeks"
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
