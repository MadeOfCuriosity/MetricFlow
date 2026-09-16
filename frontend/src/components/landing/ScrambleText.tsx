import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ScrambleTextProps {
  text: string;
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
  triggerOnScroll?: boolean;
  triggerOnHover?: boolean;
  duration?: number;
  delay?: number;
  chars?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

const DEFAULT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#%&*+=-_~<>';

export const ScrambleText: React.FC<ScrambleTextProps> = ({
  text,
  as: Component = 'span',
  className = '',
  style = {},
  triggerOnScroll = true,
  triggerOnHover = true,
  duration = 850,
  delay = 0,
  chars = DEFAULT_CHARS,
  ...restProps
}) => {
  const [displayText, setDisplayText] = useState<string>(text);
  const isScramblingRef = useRef(false);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const hasTriggeredOnScrollRef = useRef(false);

  const startScramble = useCallback(() => {
    if (isScramblingRef.current) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayText(text);
      return;
    }

    isScramblingRef.current = true;
    const startTime = performance.now();
    let lastGlyphUpdate = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const resolvedCount = Math.floor(progress * text.length);

      const shouldShuffle = now - lastGlyphUpdate > 32;
      if (shouldShuffle) {
        lastGlyphUpdate = now;
      }

      if (shouldShuffle || progress >= 1) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
          const originalChar = text[i];
          if (originalChar === ' ' || originalChar === '\n') {
            result += originalChar;
          } else if (i < resolvedCount) {
            result += originalChar;
          } else {
            result += chars[Math.floor(Math.random() * chars.length)];
          }
        }
        setDisplayText(result);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayText(text);
        isScramblingRef.current = false;
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [text, duration, chars]);

  useEffect(() => {
    if (!triggerOnScroll || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && !hasTriggeredOnScrollRef.current) {
          hasTriggeredOnScrollRef.current = true;
          if (delay > 0) {
            timerRef.current = setTimeout(() => startScramble(), delay);
          } else {
            startScramble();
          }
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [triggerOnScroll, delay, startScramble]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (triggerOnHover) {
      startScramble();
    }
    if (restProps.onMouseEnter) {
      restProps.onMouseEnter(e);
    }
  };

  return (
    <Component
      ref={containerRef}
      className={`scramble-text ${className}`.trim()}
      style={{
        fontFeatureSettings: '"tnum" on, "lnum" on',
        ...style,
      }}
      onMouseEnter={handleMouseEnter}
      {...restProps}
    >
      {displayText}
    </Component>
  );
};
