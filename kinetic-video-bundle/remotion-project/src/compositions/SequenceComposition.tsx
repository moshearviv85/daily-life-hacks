/**
 * Single Word Kinetic Typography Template
 * Ported from kinetic-video-bundle template
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
} from 'remotion';

interface WordTiming {
  word: string;
  start: number;
  end: number;
}

interface SequenceCompositionProps {
  wordTimings: WordTiming[];
  audioFile: string;
  baseFontSize?: number;
  dustEnabled?: boolean;
  lightBeamsEnabled?: boolean;
  centerGlowEnabled?: boolean;
  glowIntensity?: number;
  anticipationFrames?: number;
  colorSchemeStart?: number;
}

const ANIMATION_TYPES = [
  'scaleUp', 'slideUp', 'slideDown', 'rotateIn',
  'fadeBlur', 'bounceIn', 'slideLeft', 'slideRight',
] as const;

type AnimationType = typeof ANIMATION_TYPES[number];

// Brand palette: black/dark-navy + DLH orange only
const COLORS = [
  { bg: '#0a0a0a', text: '#ffffff', accent: '#F29B30' },   // pure black
  { bg: '#0f172a', text: '#ffffff', accent: '#F29B30' },   // brand dark navy
  { bg: '#111827', text: '#ffffff', accent: '#d4861a' },   // dark gray, deeper orange
  { bg: '#0a0a0a', text: '#ffffff', accent: '#d4861a' },   // pure black, deeper orange
  { bg: '#0f172a', text: '#ffffff', accent: '#F29B30' },   // brand dark navy repeat
];

const CHAR_WIDTHS: Record<string, number> = {
  'W': 1.3, 'M': 1.2, 'O': 1.0, 'Q': 1.0, 'D': 1.0, 'G': 1.0, 'H': 1.0, 'N': 1.0, 'U': 1.0,
  'A': 0.95, 'B': 0.9, 'C': 0.9, 'E': 0.85, 'F': 0.8, 'K': 0.9, 'P': 0.85, 'R': 0.9, 'S': 0.85,
  'T': 0.85, 'V': 0.9, 'X': 0.9, 'Y': 0.9, 'Z': 0.85,
  'w': 1.0, 'm': 1.0, 'o': 0.75, 'a': 0.7, 'b': 0.75, 'c': 0.7, 'd': 0.75, 'e': 0.7,
  'f': 0.4, 'g': 0.75, 'h': 0.7, 'i': 0.3, 'j': 0.3, 'k': 0.7, 'l': 0.3, 'n': 0.7,
  'p': 0.75, 'q': 0.75, 'r': 0.45, 's': 0.65, 't': 0.45, 'u': 0.7, 'v': 0.65, 'x': 0.65,
  'y': 0.65, 'z': 0.6,
  ' ': 0.3, '.': 0.3, ',': 0.3, '!': 0.35, '?': 0.7, ':': 0.3, ';': 0.3, '-': 0.4,
  "'": 0.25, '"': 0.5,
};

function measureWord(word: string, fontSize: number, fontWeight: number = 700) {
  let totalWidth = 0;
  for (const char of word) {
    totalWidth += CHAR_WIDTHS[char] || 0.7;
  }
  const weightMultiplier = fontWeight >= 800 ? 1.1 : fontWeight >= 600 ? 1.05 : 1.0;
  const caseMultiplier = word === word.toUpperCase() ? 1.15 : 1.0;
  return { width: totalWidth * fontSize * 0.6 * weightMultiplier * caseMultiplier, height: fontSize * 1.2 };
}

function getMaxSafeSize(word: string, maxWidth: number, maxHeight: number, fontWeight: number = 700): number {
  const maxFontSize = 220;
  const metrics = measureWord(word, maxFontSize, fontWeight);
  // Tighter margin for long words (URLs, compound words) to compensate for font estimation inaccuracy
  const widthMargin = word.length > 10 ? 0.68 : 0.82;
  const scaleX = (maxWidth * widthMargin) / metrics.width;
  const scaleY = (maxHeight * 0.7) / metrics.height;
  return Math.max(40, maxFontSize * Math.min(1, scaleX, scaleY));
}

const KEYWORDS = [
  'wrong', 'stop', 'nope', 'real', 'nobody', 'worse', 'right',
  'free', 'weekly', 'fiber', 'energy', 'digestion', 'hunger',
];

function getWordImportance(word: string, indexInGroup: number, totalInGroup: number, groupIndex: number): number {
  let score = 40;
  const cleanWord = word.replace(/[.,!?;:'"]/g, '').toLowerCase();
  if (/!$/.test(word)) score += 35;
  if (/\?$/.test(word)) score += 30;
  if (KEYWORDS.includes(cleanWord)) score += 40;
  if (totalInGroup === 1) score += 20;
  if (word === word.toUpperCase() && word.length > 1) score += 15;
  if (groupIndex < 3 && indexInGroup === 0) score += 15;
  return Math.min(100, score);
}

function getEmphasisLevel(importance: number): 'hero' | 'strong' | 'normal' | 'subtle' {
  if (importance >= 85) return 'hero';
  if (importance >= 65) return 'strong';
  if (importance >= 40) return 'normal';
  return 'subtle';
}

function getEmphasisStyles(emphasis: 'hero' | 'strong' | 'normal' | 'subtle', accentColor: string) {
  switch (emphasis) {
    case 'hero':
      return { fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' as const, textShadow: `0 0 80px ${accentColor}, 0 4px 0 rgba(0,0,0,0.4)`, color: accentColor };
    case 'strong':
      return { fontWeight: 800, letterSpacing: '0.03em', textShadow: `0 0 50px ${accentColor}80`, color: '#ffffff' };
    case 'normal':
      return { fontWeight: 600, color: '#ffffff' };
    case 'subtle':
      return { fontWeight: 500, opacity: 0.85, color: '#cccccc' };
  }
}

function getAnimationTransform(animType: AnimationType, progress: number) {
  const baseProgress = Math.min(1, Math.max(0, progress));
  const oscillation = progress - 1.0;
  switch (animType) {
    case 'scaleUp': return { translateX: 0, translateY: oscillation * -15, scale: 0.15 + baseProgress * 0.85 + oscillation * 0.15, rotate: oscillation * 2, blur: Math.max(0, (1 - baseProgress) * 8) };
    case 'slideUp': return { translateX: oscillation * 5, translateY: 120 * (1 - baseProgress) + oscillation * -20, scale: 0.8 + baseProgress * 0.2, rotate: oscillation * 1.5, blur: 0 };
    case 'slideDown': return { translateX: oscillation * -5, translateY: -120 * (1 - baseProgress) + oscillation * 20, scale: 0.8 + baseProgress * 0.2, rotate: oscillation * -1.5, blur: 0 };
    case 'rotateIn': return { translateX: oscillation * 8, translateY: oscillation * -5, scale: 0.5 + baseProgress * 0.5, rotate: -25 * (1 - baseProgress) + oscillation * 8, blur: 0 };
    case 'fadeBlur': return { translateX: 0, translateY: oscillation * -10, scale: 1.2 - baseProgress * 0.2, rotate: oscillation * 1, blur: Math.max(0, 25 * (1 - baseProgress)) };
    case 'bounceIn': return { translateX: 0, translateY: oscillation * -25, scale: baseProgress + oscillation * 0.2, rotate: oscillation * 3, blur: 0 };
    case 'slideLeft': return { translateX: 150 * (1 - baseProgress) + oscillation * -30, translateY: oscillation * 5, scale: 1, rotate: oscillation * 2, blur: 0 };
    case 'slideRight': return { translateX: -150 * (1 - baseProgress) + oscillation * 30, translateY: oscillation * -5, scale: 1, rotate: oscillation * -2, blur: 0 };
  }
}

interface WordProps {
  wordTiming: WordTiming;
  index: number;
  total: number;
  globalFrame: number;
  fps: number;
  frameWidth: number;
  frameHeight: number;
  nextWordStart: number | null;
  colorSchemeStart: number;
}

const Word: React.FC<WordProps> = ({ wordTiming, index, total, globalFrame, fps, frameWidth, frameHeight, nextWordStart, colorSchemeStart }) => {
  const wordStartFrame = Math.round(wordTiming.start * fps);
  const wordEndFrame = Math.round(wordTiming.end * fps);
  const anticipationFrames = 5;
  const animationStartFrame = wordStartFrame - anticipationFrames;

  if (globalFrame < animationStartFrame) return null;

  const nextWordFrame = nextWordStart ? Math.round(nextWordStart * fps) : null;
  const naturalExitStart = wordEndFrame + 4;
  const exitStartFrame = nextWordFrame ? Math.min(nextWordFrame - 2, naturalExitStart) : naturalExitStart;
  const exitDuration = 10;

  if (globalFrame > exitStartFrame + exitDuration + 5) return null;

  const framesSinceStart = globalFrame - animationStartFrame;

  // Importance-aware animation: hero words get big dramatic entrances,
  // subtle words get quiet fades. Variety within each tier.
  const importance = getWordImportance(wordTiming.word, index, total, Math.floor(index / 3));
  const emphasisForAnim = getEmphasisLevel(importance);
  const heroAnims: AnimationType[]   = ['bounceIn', 'scaleUp'];
  const strongAnims: AnimationType[] = ['rotateIn', 'slideUp', 'slideDown'];
  const normalAnims: AnimationType[] = ['slideLeft', 'slideRight', 'fadeBlur'];
  const animPool =
    emphasisForAnim === 'hero'   ? heroAnims :
    emphasisForAnim === 'strong' ? strongAnims :
    emphasisForAnim === 'normal' ? normalAnims :
    ['fadeBlur'] as AnimationType[];
  const animType = animPool[index % animPool.length];

  const enterProgress = spring({ frame: framesSinceStart, fps, config: { damping: 20, stiffness: 380, mass: 0.6 } });
  const exitProgress = interpolate(globalFrame, [exitStartFrame, exitStartFrame + exitDuration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(enterProgress, 1 - exitProgress * 0.95);

  if (opacity <= 0) return null;

  const enter = getAnimationTransform(animType, enterProgress);

  const breathCycle = framesSinceStart * 0.08;
  const breathScale = 1 + Math.sin(breathCycle) * 0.015;
  const breathY = Math.sin(breathCycle * 0.7) * 3;
  const breathRotate = Math.sin(breathCycle * 0.5) * 0.5;

  let exitX = 0, exitY = 0, exitScale = 1, exitRotate = 0, exitBlur = 0;
  const exitEase = exitProgress * exitProgress;
  switch (animType) {
    case 'scaleUp': exitScale = interpolate(exitEase, [0, 1], [1, 1.08]); exitBlur = interpolate(exitEase, [0, 1], [0, 6]); break;
    case 'slideUp': exitY = interpolate(exitEase, [0, 1], [0, -50]); break;
    case 'slideDown': exitY = interpolate(exitEase, [0, 1], [0, 50]); break;
    case 'rotateIn': exitRotate = interpolate(exitEase, [0, 1], [0, 8]); exitScale = interpolate(exitEase, [0, 1], [1, 0.92]); break;
    case 'fadeBlur': exitBlur = interpolate(exitEase, [0, 1], [0, 15]); exitScale = interpolate(exitEase, [0, 1], [1, 1.05]); break;
    case 'bounceIn': exitScale = interpolate(exitEase, [0, 1], [1, 0.85]); exitY = interpolate(exitEase, [0, 1], [0, -20]); break;
    case 'slideLeft': exitX = interpolate(exitEase, [0, 1], [0, -60]); break;
    case 'slideRight': exitX = interpolate(exitEase, [0, 1], [0, 60]); break;
  }

  // importance / emphasisForAnim already computed above for animation selection
  const emphasis = emphasisForAnim;
  const baseSizes = { hero: 200, strong: 160, normal: 130, subtle: 100 };
  const safeSize = getMaxSafeSize(wordTiming.word, frameWidth, frameHeight);
  const fontSize = Math.min(baseSizes[emphasis], safeSize);

  const colorIndex = (colorSchemeStart + Math.floor(index / 8)) % COLORS.length;
  const colors = COLORS[colorIndex];
  const emphasisStyles = getEmphasisStyles(emphasis, colors.accent);

  const finalX = enter.translateX + exitX;
  const finalY = enter.translateY + breathY + exitY;
  const finalScale = enter.scale * breathScale * exitScale;
  const finalRotate = enter.rotate + breathRotate + exitRotate;
  const finalBlur = enter.blur + exitBlur;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(-50%, -50%) translateX(${finalX}px) translateY(${finalY}px) scale(${finalScale}) rotate(${finalRotate}deg)`,
        fontSize, fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        opacity: Math.max(0, opacity),
        filter: `blur(${finalBlur}px)`,
        whiteSpace: 'nowrap', textAlign: 'center',
        ...emphasisStyles,
      }}>
        {wordTiming.word.trim()}
      </div>
    </AbsoluteFill>
  );
};

export const SequenceComposition: React.FC<SequenceCompositionProps> = ({
  wordTimings,
  audioFile,
  colorSchemeStart = 0,
}) => {
  const { fps, width, height } = useVideoConfig();
  const globalFrame = useCurrentFrame();
  const currentTime = globalFrame / fps;

  const anticipationTime = 5 / fps;
  let currentWordIndex = -1;

  for (let i = 0; i < wordTimings.length; i++) {
    const word = wordTimings[i];
    const nextWord = wordTimings[i + 1];
    const displayStart = word.start - anticipationTime;
    const gapToNext = nextWord ? nextWord.start - word.end : Infinity;
    const fadeBuffer = 0.15;
    const nextDisplayStart = nextWord ? nextWord.start - anticipationTime : Infinity;
    const displayEnd = gapToNext > 0.4
      ? word.end + fadeBuffer
      : Math.min(nextDisplayStart, word.end + fadeBuffer);

    if (currentTime >= displayStart && currentTime < displayEnd) {
      currentWordIndex = i;
      break;
    }
  }

  const currentWord = currentWordIndex >= 0 ? wordTimings[currentWordIndex] : null;
  const nextWordStart = currentWordIndex >= 0 && currentWordIndex < wordTimings.length - 1
    ? wordTimings[currentWordIndex + 1].start
    : null;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {currentWord && (
        <Word
          wordTiming={currentWord}
          index={currentWordIndex}
          total={wordTimings.length}
          globalFrame={globalFrame}
          fps={fps}
          frameWidth={width}
          frameHeight={height}
          nextWordStart={nextWordStart}
          colorSchemeStart={colorSchemeStart}
        />
      )}
      <Audio src={staticFile(audioFile)} />
    </AbsoluteFill>
  );
};

export default SequenceComposition;
