import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';

const { fontFamily: montserrat } = loadMontserrat('normal', {
  weights: ['700', '800', '900'],
  subsets: ['latin'],
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface ImageSlide {
  src: string;
  durationInFrames: number;
  zoomDirection: 'in' | 'out';
  panDirection: 'left' | 'right' | 'none';
}

export interface FoodShortProps {
  wordTimings: WordTiming[];
  audioFile: string;
  slides: ImageSlide[];
  totalDurationInFrames: number;
}

// ── Keywords that get brand-orange treatment ──────────────────────────────────

const FOOD_KEYWORDS = [
  'fiber', 'beans', 'black', 'chia', 'seeds', 'lentils', 'popcorn',
  'digestion', 'energy', 'hunger', 'water', 'wrong', 'nope', 'free',
  'weekly', 'breakfast', 'recipe', 'recipes',
];

// ── Image slide with Ken Burns ────────────────────────────────────────────────

const ImageSlideComponent: React.FC<{ slide: ImageSlide }> = ({ slide }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;

  const scale = slide.zoomDirection === 'in'
    ? interpolate(progress, [0, 1], [1.0, 1.10])
    : interpolate(progress, [0, 1], [1.10, 1.0]);

  const translateX = slide.panDirection === 'right'
    ? interpolate(progress, [0, 1], [-20, 0])
    : slide.panDirection === 'left'
    ? interpolate(progress, [0, 1], [0, -20])
    : 0;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#111' }}>
      <Img
        src={staticFile(slide.src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateX(${translateX}px)`,
          filter: 'sepia(0.1) saturate(1.25) brightness(0.9)',
        }}
      />
      {/* Gradient: dark top + dark bottom for text */}
      <AbsoluteFill style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.65) 100%)',
      }} />
    </AbsoluteFill>
  );
};

// ── CTA Outro ────────────────────────────────────────────────────────────────

const CtaOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 20, stiffness: 200 } });

  return (
    <AbsoluteFill style={{
      backgroundColor: '#F29B30',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 40,
    }}>
      <div style={{
        fontFamily: montserrat,
        fontWeight: 900,
        fontSize: 52,
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        opacity: appear,
        transform: `scale(${0.7 + appear * 0.3})`,
        textAlign: 'center',
        padding: '0 60px',
      }}>
        Get Free Weekly Recipes
      </div>
      <div style={{
        fontFamily: montserrat,
        fontWeight: 800,
        fontSize: 72,
        color: '#1a1a1a',
        opacity: appear,
        transform: `translateY(${(1 - appear) * 40}px)`,
        textAlign: 'center',
        letterSpacing: '-0.01em',
      }}>
        daily-life-hacks.com
      </div>
      <div style={{
        fontFamily: montserrat,
        fontWeight: 600,
        fontSize: 36,
        color: 'rgba(255,255,255,0.85)',
        opacity: appear,
        textAlign: 'center',
      }}>
        Straight to your inbox. Every week.
      </div>
    </AbsoluteFill>
  );
};

// ── Word component ────────────────────────────────────────────────────────────

const ANIM_TYPES = ['scaleUp', 'slideUp', 'bounceIn', 'fadeBlur', 'slideLeft', 'slideRight', 'rotateIn', 'slideDown'] as const;
type AnimType = typeof ANIM_TYPES[number];

function getTransform(type: AnimType, enter: number): { x: number; y: number; scale: number; rotate: number; blur: number } {
  const osc = enter - 1.0;
  switch (type) {
    case 'scaleUp':   return { x: 0,           y: osc * -12,   scale: 0.2 + enter * 0.8, rotate: osc * 2,   blur: Math.max(0, (1 - enter) * 8) };
    case 'slideUp':   return { x: osc * 4,      y: 100 * (1 - enter) + osc * -18, scale: 0.85 + enter * 0.15, rotate: osc * 1.5, blur: 0 };
    case 'slideDown': return { x: osc * -4,     y: -100 * (1 - enter) + osc * 18, scale: 0.85 + enter * 0.15, rotate: osc * -1.5, blur: 0 };
    case 'rotateIn':  return { x: osc * 6,      y: osc * -4,   scale: 0.5 + enter * 0.5, rotate: -20 * (1 - enter) + osc * 6, blur: 0 };
    case 'fadeBlur':  return { x: 0,            y: osc * -8,   scale: 1.15 - enter * 0.15, rotate: osc * 1, blur: Math.max(0, 20 * (1 - enter)) };
    case 'bounceIn':  return { x: 0,            y: osc * -20,  scale: enter + osc * 0.15, rotate: osc * 3,  blur: 0 };
    case 'slideLeft': return { x: 130 * (1 - enter) + osc * -25, y: osc * 4, scale: 1, rotate: osc * 2, blur: 0 };
    case 'slideRight':return { x: -130 * (1 - enter) + osc * 25, y: osc * -4, scale: 1, rotate: osc * -2, blur: 0 };
  }
}

const FloatingWord: React.FC<{
  wt: WordTiming;
  index: number;
  total: number;
  globalFrame: number;
  fps: number;
  width: number;
  height: number;
  nextStart: number | null;
}> = ({ wt, index, globalFrame, fps, width, height, nextStart }) => {
  const startFrame = Math.round(wt.start * fps) - 5;
  const endFrame = Math.round(wt.end * fps);
  const exitStart = nextStart ? Math.min(Math.round(nextStart * fps) - 2, endFrame + 4) : endFrame + 4;
  const exitDur = 8;

  if (globalFrame < startFrame || globalFrame > exitStart + exitDur + 4) return null;

  const sinceStart = globalFrame - startFrame;
  const animType = ANIM_TYPES[index % ANIM_TYPES.length];
  const enter = spring({ frame: sinceStart, fps, config: { damping: 22, stiffness: 420, mass: 0.5 } });
  const exitP = interpolate(globalFrame, [exitStart, exitStart + exitDur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(enter, 1 - exitP * 0.95);
  if (opacity <= 0) return null;

  const t = getTransform(animType, enter);
  const breath = sinceStart * 0.07;
  const breathY = Math.sin(breath * 0.7) * 2.5;
  const breathS = 1 + Math.sin(breath) * 0.012;
  const exitEase = exitP * exitP;
  let ex = 0, ey = 0, es = 1, eBlur = 0;
  if (animType === 'scaleUp') { es = interpolate(exitEase, [0,1],[1,1.06]); eBlur = interpolate(exitEase,[0,1],[0,5]); }
  else if (animType === 'slideUp')   ey = interpolate(exitEase,[0,1],[0,-45]);
  else if (animType === 'slideDown') ey = interpolate(exitEase,[0,1],[0,45]);
  else if (animType === 'bounceIn')  { es = interpolate(exitEase,[0,1],[1,0.85]); ey = interpolate(exitEase,[0,1],[0,-18]); }
  else if (animType === 'slideLeft') ex = interpolate(exitEase,[0,1],[0,-55]);
  else if (animType === 'slideRight')ex = interpolate(exitEase,[0,1],[0,55]);
  else if (animType === 'fadeBlur')  { eBlur = interpolate(exitEase,[0,1],[0,12]); es = interpolate(exitEase,[0,1],[1,1.04]); }

  // Word importance
  const clean = wt.word.replace(/[.,!?;:'"]/g,'').toLowerCase();
  const isFood = FOOD_KEYWORDS.includes(clean);
  const isHero = isFood || /!$/.test(wt.word) || /\?$/.test(wt.word);
  const isShort = wt.word.length <= 4;

  const baseFontSize = isHero ? 190 : isShort ? 160 : 130;
  // Cap for long words
  const charCount = wt.word.trim().length;
  const safeMax = Math.min(baseFontSize, Math.floor((width * (charCount > 10 ? 0.65 : 0.82)) / (charCount * 0.55)));
  const fontSize = Math.max(40, Math.min(baseFontSize, safeMax));

  const color = isFood ? '#F29B30' : '#ffffff';
  const outline = '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 0 #000, 0 -3px 0 #000, 3px 0 0 #000, -3px 0 0 #000';

  const finalX = t.x + ex;
  const finalY = t.y + breathY + ey;
  const finalS = t.scale * breathS * es;
  const finalR = t.rotate;
  const finalBlur = t.blur + eBlur;

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '45%',
        transform: `translate(-50%, -50%) translateX(${finalX}px) translateY(${finalY}px) scale(${finalS}) rotate(${finalR}deg)`,
        fontSize,
        fontFamily: montserrat,
        fontWeight: isHero ? 900 : 800,
        color,
        opacity: Math.max(0, opacity),
        filter: `blur(${finalBlur}px)`,
        whiteSpace: 'nowrap',
        textAlign: 'center',
        letterSpacing: isHero ? '0.06em' : '0.02em',
        textTransform: 'uppercase',
        textShadow: outline,
      }}>
        {wt.word.trim()}
      </div>
    </AbsoluteFill>
  );
};

// ── Main Composition ──────────────────────────────────────────────────────────

export const FoodShortComposition: React.FC<FoodShortProps> = ({
  wordTimings,
  audioFile,
  slides,
  totalDurationInFrames,
}) => {
  const { fps, width, height } = useVideoConfig();
  const globalFrame = useCurrentFrame();
  const currentTime = globalFrame / fps;

  // Find current word
  const anticipation = 5 / fps;
  let currentIdx = -1;
  for (let i = 0; i < wordTimings.length; i++) {
    const w = wordTimings[i];
    const next = wordTimings[i + 1];
    const displayStart = w.start - anticipation;
    const gapToNext = next ? next.start - w.end : Infinity;
    const nextDisplayStart = next ? next.start - anticipation : Infinity;
    const displayEnd = gapToNext > 0.4
      ? w.end + 0.12
      : Math.min(nextDisplayStart, w.end + 0.12);
    if (currentTime >= displayStart && currentTime < displayEnd) { currentIdx = i; break; }
  }

  const currentWord = currentIdx >= 0 ? wordTimings[currentIdx] : null;
  const nextStart = currentIdx >= 0 && currentIdx < wordTimings.length - 1
    ? wordTimings[currentIdx + 1].start : null;

  // CTA starts at last word + 1s
  const lastWord = wordTimings[wordTimings.length - 1];
  const ctaStartFrame = lastWord ? Math.round((lastWord.end + 1) * fps) : totalDurationInFrames - 150;
  const ctaDuration = totalDurationInFrames - ctaStartFrame;

  return (
    <AbsoluteFill style={{ backgroundColor: '#111' }}>
      {/* Image layer */}
      <TransitionSeries>
        {slides.map((slide, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={slide.durationInFrames}>
              <ImageSlideComponent slide={slide} />
            </TransitionSeries.Sequence>
            {i < slides.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={springTiming({ config: { damping: 200 }, durationInFrames: 18 })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>

      {/* CTA outro on top */}
      {globalFrame >= ctaStartFrame && (
        <Sequence from={ctaStartFrame} durationInFrames={ctaDuration}>
          <CtaOutro />
        </Sequence>
      )}

      {/* Word layer */}
      {currentWord && globalFrame < ctaStartFrame && (
        <FloatingWord
          wt={currentWord}
          index={currentIdx}
          total={wordTimings.length}
          globalFrame={globalFrame}
          fps={fps}
          width={width}
          height={height}
          nextStart={nextStart}
        />
      )}

      <Audio src={staticFile(audioFile)} />
    </AbsoluteFill>
  );
};

export default FoodShortComposition;
