/**
 * Kinetic Short Composition — V1 original + 2 targeted changes only:
 *
 * Change 1: KEYWORDS expanded with cabbage, kombucha, fiber, caramelizes,
 *   vegetable, probiotic, gut, sauerkraut → these appear in big orange CAPS centered.
 *
 * Change 2: Long hero word overflow fix — two parts:
 *   a) minSize for hero words lowered to 80 (was 130) so long words can use smaller font
 *   b) If hero word's steady-state width > 78% of frame → skip squash-stretch,
 *      use uniform scale instead (word stays in frame at all times)
 *
 * Everything else is IDENTICAL to V1.
 */

import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  Img,
} from 'remotion';

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface ImageCue {
  time: number;
  src: string;
}

export interface KineticShortProps {
  wordTimings: WordTiming[];
  speechFile: string;
  musicFile?: string;
  musicVolume?: number;
  imageCues: ImageCue[];
  overlayOpacity?: number;
  colorSchemeStart?: number;
  fastMode?: boolean;
}

// ── Animation types ───────────────────────────────────────────────────────────
const ANIMATION_TYPES = [
  'scaleUp', 'slideUp', 'slideDown', 'rotateIn',
  'fadeBlur', 'bounceIn', 'slideLeft', 'slideRight',
  'flipStand', 'flipLay', 'zoomCrash', 'driftUp',
] as const;
type AnimationType = typeof ANIMATION_TYPES[number];

const ACCENT_COLORS = ['#F29B30', '#d4861a', '#F29B30', '#F29B30', '#d4861a'];

// ── Font measurement (unchanged from V1) ──────────────────────────────────────
const CHAR_WIDTHS: Record<string, number> = {
  'W': 1.3,  'M': 1.2,  'O': 1.0,  'Q': 1.0,  'D': 1.0,  'G': 1.0,  'H': 1.0,  'N': 1.0,  'U': 1.0,
  'A': 0.95, 'B': 0.9,  'C': 0.9,  'E': 0.85, 'F': 0.8,  'K': 0.9,  'P': 0.85, 'R': 0.9,  'S': 0.85,
  'T': 0.85, 'V': 0.9,  'X': 0.9,  'Y': 0.9,  'Z': 0.85,
  'w': 1.0,  'm': 1.0,  'o': 0.75, 'a': 0.7,  'b': 0.75, 'c': 0.7,  'd': 0.75, 'e': 0.7,
  'f': 0.4,  'g': 0.75, 'h': 0.7,  'i': 0.3,  'j': 0.3,  'k': 0.7,  'l': 0.3,  'n': 0.7,
  'p': 0.75, 'q': 0.75, 'r': 0.45, 's': 0.65, 't': 0.45, 'u': 0.7,  'v': 0.65, 'x': 0.65,
  'y': 0.65, 'z': 0.6,
  ' ': 0.3, '.': 0.3, ',': 0.3, '!': 0.35, '?': 0.7, ':': 0.3, ';': 0.3, '-': 0.4,
  "'": 0.25, '"': 0.5,
};

function measureWord(word: string, fontSize: number, fontWeight = 700) {
  let w = 0;
  for (const ch of word) w += CHAR_WIDTHS[ch] ?? 0.75;
  const wm = fontWeight >= 800 ? 1.12 : fontWeight >= 600 ? 1.06 : 1.0;
  const cm = word === word.toUpperCase() ? 1.18 : 1.0;
  return { width: w * fontSize * 0.62 * wm * cm, height: fontSize * 1.2 };
}

function getMaxSafeSize(displayWord: string, maxW: number, maxH: number, fw = 700, minSize = 38): number {
  const maxFont = 220;
  const m = measureWord(displayWord, maxFont, fw);
  const scaleX = (maxW * 0.78) / m.width;
  const scaleY = (maxH * 0.60) / m.height;
  return Math.max(minSize, maxFont * Math.min(1, scaleX, scaleY));
}

// ── Filler words ──────────────────────────────────────────────────────────────
const FILLER = new Set([
  'the', 'a', 'an', 'of', 'to', 'at', 'in', 'on', 'for',
  'and', 'but', 'or', 'is', 'are', 'was', 'it',
]);

// ── Semantic motion word sets ─────────────────────────────────────────────────
const NEGATION_WORDS = new Set([
  'wrong', 'no', 'stop', 'nope', 'never', 'not', 'bad', 'worse', 'fail', 'false',
  'nobody', 'nothing', 'zero', 'none',
]);
const DISCOVERY_WORDS = new Set([
  'turns', "here's", 'actually', 'truth', 'real', 'wait', 'plot', 'surprise',
  'instead', 'really', 'decades',
]);
const NUMBER_WORDS = new Set([
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'thirty', 'fifty', 'hundred', 'grams', 'percent', '%',
]);
const CTA_WORDS = new Set([
  'recipes', 'subscribe', 'free', 'weekly', 'daily', 'visit', 'link',
]);

// ── KEYWORDS — CHANGE 1: added cabbage, kombucha, fiber, caramelizes,
//    vegetable, probiotic, gut, sauerkraut → these become hero (orange, big, centered)
const KEYWORDS = [
  'wrong', 'stop', 'nope', 'real', 'nobody', 'worse', 'right', 'zero', 'none',
  'free', 'weekly', 'fiber', 'edamame', 'natto', 'burdock',
  'eight', 'five', 'six', 'grams', 'overachiever', 'done',
  'protein', 'probiotics', 'inflammation', 'centuries',
  // ↓ new additions only
  'cabbage', 'kombucha', 'caramelizes', 'vegetable',
  'probiotic', 'gut', 'sauerkraut',
];

function getImportance(word: string, idx: number, total: number, groupIdx: number): number {
  const clean = word.replace(/[.,!?;:'"]/g, '').toLowerCase();

  if (FILLER.has(clean)) return 15;

  let score = 38;
  if (/[!]$/.test(word))  score += 35;
  if (/[?]$/.test(word))  score += 28;
  if (KEYWORDS.includes(clean)) score += 48;
  if (total === 1)         score += 20;
  if (word === word.toUpperCase() && word.length > 1) score += 52;
  if (groupIdx < 3 && idx === 0) score += 12;
  return Math.min(100, score);
}

function getEmphasis(imp: number): 'hero' | 'strong' | 'normal' | 'subtle' {
  if (imp >= 85) return 'hero';
  if (imp >= 62) return 'strong';
  if (imp >= 35) return 'normal';
  return 'subtle';
}

function getEmphasisStyles(e: 'hero' | 'strong' | 'normal' | 'subtle', accent: string) {
  switch (e) {
    case 'hero':   return { fontWeight: 900, letterSpacing: '0.04em', textShadow: `0 0 70px ${accent}, 0 4px 0 rgba(0,0,0,0.5)`, color: accent };
    case 'strong': return { fontWeight: 800, letterSpacing: '0.02em', textShadow: `0 0 35px ${accent}80`, color: '#ffffff' };
    case 'normal': return { fontWeight: 600, color: '#e5e7eb' };
    case 'subtle': return { fontWeight: 400, opacity: 0.55, color: '#cbd5e1' };
  }
}

// ── Phrase-zone computation (unchanged from V1) ───────────────────────────────
const PHRASE_ZONES = [50, 27, 73, 40, 65, 50, 30, 70, 45, 60, 25, 75, 50];

function computePhraseYPositions(words: WordTiming[]): number[] {
  const result: number[] = new Array(words.length).fill(50);
  let phraseIdx = 0;

  for (let i = 0; i < words.length; i++) {
    result[i] = PHRASE_ZONES[phraseIdx % PHRASE_ZONES.length];
    const w = words[i];
    const next = words[i + 1];
    const gap = next ? next.start - w.end : 1.0;
    const endsSentence = /[.!?]$/.test(w.word.trim());
    if ((gap > 0.45 || endsSentence) && i < words.length - 1) phraseIdx++;
  }

  return result;
}

// ── Animation selection (unchanged from V1) ───────────────────────────────────
function getAnimType(
  emphasis: 'hero' | 'strong' | 'normal' | 'subtle',
  wordIdx: number,
  rawWord?: string,
): AnimationType {
  if (rawWord && (emphasis === 'hero' || emphasis === 'strong')) {
    const clean = rawWord.replace(/[.,!?;:'"]/g, '').toLowerCase();
    if (NEGATION_WORDS.has(clean)) return 'zoomCrash';
    if (DISCOVERY_WORDS.has(clean)) return 'slideLeft';
    if (NUMBER_WORDS.has(clean) || /^\d+$/.test(clean)) return 'scaleUp';
    if (CTA_WORDS.has(clean)) return 'driftUp';
  }

  const heroPool:   AnimationType[] = ['zoomCrash', 'bounceIn', 'scaleUp', 'flipStand'];
  const strongPool: AnimationType[] = ['rotateIn', 'slideLeft', 'slideRight', 'flipLay'];
  const normalPool: AnimationType[] = ['slideUp', 'slideLeft', 'slideRight', 'fadeBlur'];
  const subtlePool: AnimationType[] = ['fadeBlur'];

  const pool =
    emphasis === 'hero'   ? heroPool :
    emphasis === 'strong' ? strongPool :
    emphasis === 'normal' ? normalPool :
    subtlePool;
  return pool[wordIdx % pool.length];
}

// ── Animation transforms (unchanged from V1) ──────────────────────────────────
interface Transform { tx: number; ty: number; sc: number; rot: number; blur: number }

function getAnimTransform(type: AnimationType, progress: number): Transform {
  const p   = Math.min(1, Math.max(0, progress));
  const osc = progress - 1.0;
  const base: Transform = { tx: 0, ty: 0, sc: 1, rot: 0, blur: 0 };
  switch (type) {
    case 'scaleUp':    return { ...base, ty: osc * -12,  sc: 0.1 + p * 0.9 + osc * 0.1,   rot: osc * 1.5, blur: Math.max(0, (1-p) * 6) };
    case 'slideUp':    return { ...base, tx: osc * 4,    ty: 110 * (1-p) + osc * -15,      sc: 0.85 + p * 0.15, rot: osc * 1 };
    case 'slideDown':  return { ...base, tx: osc * -4,   ty: -110 * (1-p) + osc * 15,     sc: 0.85 + p * 0.15, rot: osc * -1 };
    case 'rotateIn':   return { ...base, tx: osc * 6,    ty: osc * -4,   sc: 0.5 + p * 0.5, rot: -28 * (1-p) + osc * 6 };
    case 'fadeBlur':   return { ...base, ty: osc * -6,   sc: 1.2 - p * 0.2, rot: osc * 0.5, blur: Math.max(0, 22 * (1-p)) };
    case 'bounceIn':   return { ...base, ty: osc * -22,  sc: p + osc * 0.2, rot: osc * 2.5 };
    case 'slideLeft':  return { ...base, tx: 150 * (1-p) + osc * -25, ty: osc * 4,  rot: osc * 1.5 };
    case 'slideRight': return { ...base, tx: -150 * (1-p) + osc * 25, ty: osc * -4, rot: osc * -1.5 };
    case 'flipStand':  return { ...base, sc: 0.7 + p * 0.3, rot: 90 * (1-p) + osc * 4, ty: osc * -8 };
    case 'flipLay':    return { ...base, sc: 0.7 + p * 0.3, rot: -90 * (1-p) + osc * -4, ty: osc * 8 };
    case 'zoomCrash':  return { ...base, sc: 3.2 * (1-p) + 1 * p + osc * 0.12, blur: Math.max(0, 8 * (1-p)), ty: osc * -4 };
    case 'driftUp':    return { ...base, ty: 60 * (1-p) + osc * -8, sc: 0.8 + p * 0.2, blur: Math.max(0, 10 * (1-p)) };
  }
}

// ── Ken Burns background (unchanged from V1) ──────────────────────────────────
interface BgProps { src: string; frameAge: number; zoomDir: 'in' | 'out'; opacity?: number; driftDir?: 1 | -1 }
const Background: React.FC<BgProps> = ({ src, frameAge, zoomDir, opacity = 1, driftDir = 1 }) => {
  const { durationInFrames } = useVideoConfig();
  const progress = Math.min(1, frameAge / durationInFrames);
  const scale = zoomDir === 'in'
    ? interpolate(progress, [0, 1], [1.08, 1.22])
    : interpolate(progress, [0, 1], [1.22, 1.08]);
  const drift = interpolate(progress, [0, 1], [0, driftDir * 2.5]);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', opacity }}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transform: `scale(${scale}) translateX(${drift}%)`,
          transformOrigin: 'center center',
        }}
      />
    </AbsoluteFill>
  );
};

// ── Word component ────────────────────────────────────────────────────────────
interface WordProps {
  wordTiming: WordTiming;
  wordIdx: number;
  total: number;
  globalFrame: number;
  fps: number;
  frameWidth: number;
  frameHeight: number;
  nextWordStart: number | null;
  accentColor: string;
  phraseY: number;
  fastMode?: boolean;
}

const Word: React.FC<WordProps> = ({
  wordTiming, wordIdx, total, globalFrame, fps,
  frameWidth, frameHeight, nextWordStart, accentColor, phraseY, fastMode,
}) => {
  const wordStartFrame = Math.round(wordTiming.start * fps);
  const wordEndFrame   = Math.round(wordTiming.end * fps);
  const animStart      = wordStartFrame - (fastMode ? 3 : 5);

  if (globalFrame < animStart) return null;

  const importance = getImportance(wordTiming.word, wordIdx, total, Math.floor(wordIdx / 3));
  const emphasis   = getEmphasis(importance);

  const nextFrame   = nextWordStart ? Math.round(nextWordStart * fps) : null;
  const naturalExit = wordEndFrame + (fastMode ? 2 : 4);
  const minHeroExit = emphasis === 'hero' ? wordStartFrame + Math.round(fps * 0.4) : 0;
  const exitStart   = nextFrame
    ? Math.max(minHeroExit, Math.min(nextFrame - 2, naturalExit))
    : Math.max(minHeroExit, naturalExit);
  const exitDur     = fastMode ? 5 : 10;

  if (globalFrame > exitStart + exitDur + 5) return null;

  const sinceStart = globalFrame - animStart;
  const animType   = getAnimType(emphasis, wordIdx, wordTiming.word);

  const displayWord = emphasis === 'hero'
    ? wordTiming.word.trim().toUpperCase()
    : wordTiming.word.trim();

  const yPos = emphasis === 'hero' ? 50 : phraseY;

  const springConfig = fastMode
    ? { damping: 16, stiffness: 650, mass: 0.25 }
    : { damping: 9,  stiffness: 120, mass: 0.45 };

  const fw = emphasis === 'hero' ? 900 : emphasis === 'strong' ? 800 : 600;

  // CHANGE 2a: hero minSize lowered to 80 (was 130) so long hero words get smaller font
  const minSize = emphasis === 'subtle' ? 70 : emphasis === 'hero' ? 80 : 130;
  const safeSize  = getMaxSafeSize(displayWord, frameWidth, frameHeight, fw, minSize);
  const baseSizes = { hero: 280, strong: 230, normal: 185, subtle: 85 };
  const fontSize  = Math.min(baseSizes[emphasis], safeSize);

  const enterP = emphasis === 'subtle'
    ? interpolate(sinceStart, [0, 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : spring({ frame: sinceStart, fps, config: springConfig });

  const exitP  = interpolate(globalFrame, [exitStart, exitStart + exitDur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(enterP, 1 - exitP * 0.95);

  if (opacity <= 0) return null;

  const enter = getAnimTransform(animType, enterP);

  const breath = sinceStart * 0.07;
  const bScale = 1 + Math.sin(breath) * 0.01;
  const bY     = Math.sin(breath * 0.7) * 1.5;
  const bRot   = Math.sin(breath * 0.5) * 0.3;

  let exitX = 0, exitY = 0, exitSc = 1, exitRot = 0, exitBlur = 0;
  const ee = exitP * exitP;
  switch (animType) {
    case 'scaleUp':    exitSc   = interpolate(ee,[0,1],[1,1.08]); exitBlur = interpolate(ee,[0,1],[0,7]);  break;
    case 'slideUp':    exitY    = interpolate(ee,[0,1],[0,-55]);  break;
    case 'slideDown':  exitY    = interpolate(ee,[0,1],[0,55]);   break;
    case 'rotateIn':   exitRot  = interpolate(ee,[0,1],[0,9]);    exitSc   = interpolate(ee,[0,1],[1,0.88]); break;
    case 'fadeBlur':   exitBlur = interpolate(ee,[0,1],[0,16]);   exitSc   = interpolate(ee,[0,1],[1,1.04]); break;
    case 'bounceIn':   exitSc   = interpolate(ee,[0,1],[1,0.82]); exitY    = interpolate(ee,[0,1],[0,-22]); break;
    case 'slideLeft':  exitX    = interpolate(ee,[0,1],[0,-65]);  break;
    case 'slideRight': exitX    = interpolate(ee,[0,1],[0,65]);   break;
    case 'flipStand':  exitRot  = interpolate(ee,[0,1],[0,-90]);  exitSc   = interpolate(ee,[0,1],[1,0.7]); break;
    case 'flipLay':    exitRot  = interpolate(ee,[0,1],[0,90]);   exitSc   = interpolate(ee,[0,1],[1,0.7]); break;
    case 'zoomCrash':  exitSc   = interpolate(ee,[0,1],[1,0.05]); exitBlur = interpolate(ee,[0,1],[0,18]);  break;
    case 'driftUp':    exitY    = interpolate(ee,[0,1],[0,-40]);  exitBlur = interpolate(ee,[0,1],[0,10]);  break;
  }

  const emphasisStyles = getEmphasisStyles(emphasis, accentColor);

  const fx  = enter.tx + exitX;
  const fy  = enter.ty + bY + exitY;
  const fr  = enter.rot + bRot + exitRot;
  const fbl = enter.blur + exitBlur;

  let transformStr: string;
  if (emphasis === 'hero') {
    const xSpring = spring({ frame: Math.max(0, sinceStart - 4), fps, config: springConfig });

    // CHANGE 2b: cap heroScaleX start so long words never overflow.
    // Steady-state width × startScale must stay within 90% of frame.
    const heroSteadyWidth = measureWord(displayWord, fontSize, 900).width;
    const maxSafeStartX   = (frameWidth * 0.90) / heroSteadyWidth;
    const heroStartScaleX = Math.min(1.6, maxSafeStartX);

    const heroScaleY = interpolate(enterP, [0, 1], [0.15, 1], { extrapolateRight: 'extend' }) * bScale * exitSc;
    const heroScaleX = interpolate(xSpring, [0, 1], [heroStartScaleX, 1], { extrapolateRight: 'extend' }) * bScale * exitSc;
    transformStr = `translate(-50%, -50%) translateX(${fx}px) translateY(${fy}px) scaleX(${heroScaleX}) scaleY(${heroScaleY}) rotate(${fr}deg)`;
  } else {
    const fs = enter.sc * bScale * exitSc;
    transformStr = `translate(-50%, -50%) translateX(${fx}px) translateY(${fy}px) scale(${fs}) rotate(${fr}deg)`;
  }

  const highlightOpacity = 0.18 * Math.min(enterP, 1) * (1 - exitP);

  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      top: `${yPos}%`,
      transform: transformStr,
      opacity: Math.max(0, opacity),
      filter: `blur(${fbl}px)`,
    }}>
      <div style={{
        maxWidth: `${frameWidth * 0.86}px`,
        fontSize,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        whiteSpace: 'nowrap',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        ...emphasisStyles,
      }}>
        {displayWord}
      </div>
    </div>
  );
};

// ── Main composition (unchanged from V1) ──────────────────────────────────────
export const KineticShortComposition: React.FC<KineticShortProps> = ({
  wordTimings,
  speechFile,
  musicFile,
  musicVolume = 0.18,
  imageCues,
  overlayOpacity = 0.72,
  colorSchemeStart = 0,
  fastMode = false,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  const words = useMemo(
    () => wordTimings.filter(w => w.word.trim().length > 0),
    [wordTimings]
  );
  const phraseYPositions = useMemo(() => computePhraseYPositions(words), [words]);

  const sortedCues = useMemo(
    () => [...imageCues].sort((a, b) => a.time - b.time),
    [imageCues]
  );

  let activeCueIdx = 0;
  for (let i = 0; i < sortedCues.length; i++) {
    if (sortedCues[i].time <= currentTime) activeCueIdx = i;
    else break;
  }
  const activeCue = sortedCues[activeCueIdx] ?? null;
  const prevCue   = activeCueIdx > 0 ? sortedCues[activeCueIdx - 1] : null;

  const cueStartTime     = activeCue?.time ?? 0;
  const timeSinceCue     = currentTime - cueStartTime;
  const FADE_DUR         = 0.5;
  const fadeP            = Math.min(1, timeSinceCue / FADE_DUR);
  const frameAge         = timeSinceCue * fps;
  const accentColor      = ACCENT_COLORS[(colorSchemeStart + activeCueIdx) % ACCENT_COLORS.length];

  const prevCueStartTime = prevCue?.time ?? 0;
  const prevFrameAge     = (cueStartTime - prevCueStartTime) * fps;

  const anticipationTime = 5 / fps;
  let currentWordIndex = -1;
  for (let i = 0; i < words.length; i++) {
    const w  = words[i];
    const nw = words[i + 1];
    const displayStart  = w.start - anticipationTime;
    const gap           = nw ? nw.start - w.end : Infinity;
    const nextDispStart = nw ? nw.start - anticipationTime : Infinity;
    const displayEnd    = gap > 0.35 ? w.end + 0.12 : Math.min(nextDispStart, w.end + 0.12);
    if (currentTime >= displayStart && currentTime < displayEnd) {
      currentWordIndex = i;
      break;
    }
  }

  const currentWord   = currentWordIndex >= 0 ? words[currentWordIndex] : null;
  const nextWordStart = currentWordIndex >= 0 && currentWordIndex < words.length - 1
    ? words[currentWordIndex + 1].start : null;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
      {prevCue && fadeP < 1 && (
        <Background
          src={prevCue.src}
          frameAge={prevFrameAge}
          zoomDir={(activeCueIdx - 1) % 2 === 0 ? 'in' : 'out'}
          opacity={1 - fadeP}
          driftDir={(activeCueIdx - 1) % 2 === 0 ? 1 : -1}
        />
      )}
      {activeCue && (
        <Background
          src={activeCue.src}
          frameAge={frameAge}
          zoomDir={activeCueIdx % 2 === 0 ? 'in' : 'out'}
          opacity={activeCueIdx === 0 ? 1 : fadeP}
          driftDir={activeCueIdx % 2 === 0 ? 1 : -1}
        />
      )}

      <AbsoluteFill style={{ backgroundColor: `rgba(15, 23, 42, ${overlayOpacity})` }} />

      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse at bottom, rgba(242,155,48,0.06) 0%, transparent 65%)',
      }} />

      {currentWord && (
        <AbsoluteFill>
          <Word
            wordTiming={currentWord}
            wordIdx={currentWordIndex}
            total={words.length}
            globalFrame={frame}
            fps={fps}
            frameWidth={width}
            frameHeight={height}
            nextWordStart={nextWordStart}
            accentColor={accentColor}
            phraseY={phraseYPositions[currentWordIndex]}
            fastMode={fastMode}
          />
        </AbsoluteFill>
      )}

      <Audio src={staticFile(speechFile)} volume={1} />
      {musicFile && <Audio src={staticFile(musicFile)} volume={musicVolume} loop />}
    </AbsoluteFill>
  );
};

export default KineticShortComposition;
