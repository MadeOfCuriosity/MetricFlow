import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CursorState } from '../../types/landing';

gsap.registerPlugin(useGSAP);

interface CustomCursorProps {
  cursorState: CursorState;
}

export const CustomCursor: React.FC<CustomCursorProps> = ({ cursorState }) => {
  const [isFinePointer, setIsFinePointer] = React.useState(() => {
    return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  });

  React.useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const handler = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const bigBallRef = useRef<HTMLDivElement | null>(null);
  const smallBallRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const hasMoved = useRef(false);

  const xToBig = useRef<((value: number) => void) | null>(null);
  const yToBig = useRef<((value: number) => void) | null>(null);
  const xToSmall = useRef<((value: number) => void) | null>(null);
  const yToSmall = useRef<((value: number) => void) | null>(null);
  const xToLabel = useRef<((value: number) => void) | null>(null);
  const yToLabel = useRef<((value: number) => void) | null>(null);

  useGSAP(
    () => {
      if (!isFinePointer) return;

      document.body.classList.add('has-custom-cursor');

      xToBig.current = gsap.quickTo(bigBallRef.current, 'x', { duration: 0.3, ease: 'power3.out' });
      yToBig.current = gsap.quickTo(bigBallRef.current, 'y', { duration: 0.3, ease: 'power3.out' });

      xToSmall.current = gsap.quickTo(smallBallRef.current, 'x', { duration: 0.08, ease: 'power2.out' });
      yToSmall.current = gsap.quickTo(smallBallRef.current, 'y', { duration: 0.08, ease: 'power2.out' });

      xToLabel.current = gsap.quickTo(labelRef.current, 'x', { duration: 0.3, ease: 'power3.out' });
      yToLabel.current = gsap.quickTo(labelRef.current, 'y', { duration: 0.3, ease: 'power3.out' });

      gsap.set(labelRef.current, { xPercent: -50, yPercent: -50 });

      const handleMouseMove = (e: MouseEvent) => {
        if (!hasMoved.current) {
          hasMoved.current = true;
          gsap.set([bigBallRef.current, smallBallRef.current, labelRef.current], {
            x: e.clientX,
            y: e.clientY,
          });
        }

        xToBig.current?.(e.clientX);
        yToBig.current?.(e.clientY);
        xToSmall.current?.(e.clientX);
        yToSmall.current?.(e.clientY);
        xToLabel.current?.(e.clientX);
        yToLabel.current?.(e.clientY);

        gsap.to([bigBallRef.current, smallBallRef.current], { opacity: 1, duration: 0.15 });
      };

      const handleMouseLeave = () => {
        hasMoved.current = false;
        gsap.to([bigBallRef.current, smallBallRef.current, labelRef.current], { opacity: 0, duration: 0.2 });
      };

      window.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseleave', handleMouseLeave);
      window.addEventListener('blur', handleMouseLeave);

      return () => {
        document.body.classList.remove('has-custom-cursor');
        window.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseleave', handleMouseLeave);
        window.removeEventListener('blur', handleMouseLeave);
      };
    },
    { dependencies: [isFinePointer] }
  );

  // GSAP state morphing: idle -> hover -> active neon orange label badge
  useGSAP(
    () => {
      if (!isFinePointer) return;
      const isDrag = cursorState === 'drag';
      const isView = cursorState === 'view';
      const isRead = cursorState === 'read';
      const isHover = cursorState === 'hover';
      const hasLabel = isDrag || isView || isRead;

      const targetOpacity = hasMoved.current ? 0.92 : 0;
      const labelOpacity = hasMoved.current ? 1 : 0;

      if (hasLabel) {
        gsap.to(bigBallRef.current, {
          width: 80,
          height: 80,
          marginLeft: -40,
          marginTop: -40,
          backgroundColor: '#F76914',
          borderColor: 'transparent',
          mixBlendMode: 'normal',
          opacity: targetOpacity,
          duration: 0.25,
          ease: 'power2.out',
        });
        gsap.to(smallBallRef.current, { scale: 0, opacity: 0, duration: 0.12 });
        gsap.to(labelRef.current, {
          scale: hasMoved.current ? 1 : 0,
          opacity: labelOpacity,
          duration: 0.22,
          ease: 'back.out(1.5)',
        });
      } else if (isHover) {
        gsap.to(bigBallRef.current, {
          width: 48,
          height: 48,
          marginLeft: -24,
          marginTop: -24,
          backgroundColor: 'transparent',
          borderColor: '#ffffff',
          mixBlendMode: 'difference',
          opacity: hasMoved.current ? 1 : 0,
          duration: 0.2,
          ease: 'power2.out',
        });
        gsap.to(smallBallRef.current, { scale: 0, opacity: 0, duration: 0.12 });
        gsap.to(labelRef.current, { scale: 0, opacity: 0, duration: 0.12 });
      } else {
        gsap.to(bigBallRef.current, {
          width: 32,
          height: 32,
          marginLeft: -16,
          marginTop: -16,
          backgroundColor: 'transparent',
          borderColor: '#ffffff',
          mixBlendMode: 'difference',
          opacity: hasMoved.current ? 1 : 0,
          duration: 0.2,
          ease: 'power2.out',
        });
        gsap.to(smallBallRef.current, { scale: 1, opacity: hasMoved.current ? 1 : 0, duration: 0.15 });
        gsap.to(labelRef.current, { scale: 0, opacity: 0, duration: 0.12 });
      }
    },
    { dependencies: [cursorState, isFinePointer] }
  );

  const isDrag = cursorState === 'drag';
  const isView = cursorState === 'view';
  const isRead = cursorState === 'read';

  if (!isFinePointer) return null;

  return (
    <>
      {/* Outer Ball / Neon Orange Square */}
      <div
        ref={bigBallRef}
        className="cursor__ball cursor__ball--big"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          transform: 'translate(-500px, -500px)',
          zIndex: 9999997,
          pointerEvents: 'none',
          mixBlendMode: 'difference',
          width: '32px',
          height: '32px',
          marginLeft: '-16px',
          marginTop: '-16px',
          opacity: 0,
          border: '1.5px solid #ffffff',
        }}
        aria-hidden="true"
      />

      {/* Inner Small Dot */}
      <div
        ref={smallBallRef}
        className="cursor__ball cursor__ball--small"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          transform: 'translate(-500px, -500px)',
          zIndex: 9999998,
          pointerEvents: 'none',
          mixBlendMode: 'difference',
          width: '8px',
          height: '8px',
          marginLeft: '-4px',
          marginTop: '-4px',
          backgroundColor: '#ffffff',
          opacity: 0,
        }}
        aria-hidden="true"
      />

      {/* Label inside Neon Orange Square */}
      <div
        ref={labelRef}
        className="cursor__label-wrap"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          transform: 'translate(-500px, -500px) scale(0)',
          zIndex: 9999999,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          color: '#000000',
          fontSize: '12px',
          fontFamily: 'var(--font-primary)',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          userSelect: 'none',
          opacity: 0,
        }}
        aria-hidden="true"
      >
        {isDrag && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px' }}>‹</span>
            <span>DRAG</span>
            <span style={{ fontSize: '11px' }}>›</span>
          </span>
        )}
        {isView && <span>VIEW</span>}
        {isRead && <span>READ</span>}
      </div>
    </>
  );
};
