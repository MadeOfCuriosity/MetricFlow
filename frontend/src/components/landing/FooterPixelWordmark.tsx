import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CursorState } from '../../types/landing';

gsap.registerPlugin(ScrollTrigger);

interface FooterPixelWordmarkProps {
  setCursorState?: (state: CursorState) => void;
  text?: string;
}

interface PixelParticle {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  energy: number;
  isTextEdge: boolean;
}

export const FooterPixelWordmark: React.FC<FooterPixelWordmarkProps> = ({
  setCursorState,
  text = 'VISUALIZE',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({
    x: -9999,
    y: -9999,
    targetX: -9999,
    targetY: -9999,
    radius: 90,
    force: 6,
    isHovering: false,
  });
  const particlesRef = useRef<PixelParticle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      // Compact, refined height that fits the width nicely
      const height = Math.min(Math.max(Math.floor(width * 0.13), 85), 145);
      setDimensions({ width, height });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Initialize and rasterize particles whenever dimensions or text changes
  useEffect(() => {
    const width = dimensions.width;
    const height = dimensions.height;
    if (width <= 0 || height <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // 1. Offscreen Canvas for Text Masking (Knockout / Empty text)
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return;

    offCtx.fillStyle = '#000000';
    offCtx.fillRect(0, 0, width, height);

    // Refined font sizing to stay compact and well-proportioned
    const targetFontSize = Math.min(Math.floor(width / (text.length * 0.70)), height * 0.72);
    offCtx.font = `800 ${targetFontSize}px "Brockmann", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    offCtx.fillStyle = '#ffffff';
    offCtx.fillText(text.toUpperCase(), width / 2, height / 2 + 1);

    const imgData = offCtx.getImageData(0, 0, width, height).data;

    // 2. Generate Square Pixel Grid
    // Fine, delicate step for dense but soft dither look
    const step = width < 600 ? 5 : 6;
    const pixelSize = width < 600 ? 1.8 : 2.0;
    const newParticles: PixelParticle[] = [];

    const isInsideText = (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= height) return false;
      const index = (Math.floor(y) * width + Math.floor(x)) * 4;
      return imgData[index] > 110;
    };

    // Edge detector for subtle edge dither accent
    const isEdge = (x: number, y: number): boolean => {
      const center = isInsideText(x, y);
      const left = isInsideText(x - step, y);
      const right = isInsideText(x + step, y);
      const up = isInsideText(x, y - step);
      const down = isInsideText(x, y + step);
      return !center && (left || right || up || down);
    };

    for (let y = step / 2; y < height; y += step) {
      for (let x = step / 2; x < width; x += step) {
        const inText = isInsideText(x, y);

        // "Opposite of dots" -> The text itself is empty/negative space
        // Background has the subtle soft-toned pixel grid
        if (!inText) {
          const edge = isEdge(x, y);
          // Pseudo-random Bayer-like dither base alpha
          const dither = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) * 0.5;
          // Soft, non-harsh muted alpha levels (no hard white)
          const baseAlpha = edge ? 0.22 + dither * 0.12 : 0.06 + dither * 0.08;

          newParticles.push({
            originX: x,
            originY: y,
            x: x + (Math.random() - 0.5) * 3,
            y: y + (Math.random() - 0.5) * 3,
            vx: 0,
            vy: 0,
            size: edge ? pixelSize * 1.1 : pixelSize,
            baseAlpha,
            energy: 0,
            isTextEdge: edge,
          });
        }
      }
    }

    particlesRef.current = newParticles;

    // Entrance animation with GSAP ScrollTrigger
    gsap.fromTo(
      particlesRef.current,
      {
        energy: 0.6,
        vx: () => (Math.random() - 0.5) * 8,
        vy: () => (Math.random() - 0.5) * 8,
      },
      {
        energy: 0,
        vx: 0,
        vy: 0,
        duration: 1.0,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 95%',
        },
      }
    );
  }, [dimensions, text]);

  // Main interactive physics render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.015;
      const width = dimensions.width;
      const height = dimensions.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      // Smooth mouse interpolation
      const mouse = mouseRef.current;
      mouse.x += (mouse.targetX - mouse.x) * 0.22;
      mouse.y += (mouse.targetY - mouse.y) * 0.22;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const mouseRadius = mouse.radius;
      const mouseRadiusSq = mouseRadius * mouseRadius;
      const isHover = mouse.isHovering;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Mouse Repulsion Force & Dispersion Physics
        if (isHover) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < mouseRadiusSq && distSq > 0) {
            const dist = Math.sqrt(distSq);
            const normDist = 1 - dist / mouseRadius;
            const force = normDist * normDist * mouse.force;
            const angle = Math.atan2(dy, dx);

            p.vx += Math.cos(angle) * force;
            p.vy += Math.sin(angle) * force;
            p.energy = Math.min(1, p.energy + normDist * 0.45);
          }
        }

        // 2. Subtle idle wave / dither shimmer (gentle, soft)
        const idleWave = Math.sin(p.originX * 0.04 + time) * Math.cos(p.originY * 0.04 + time) * 0.03;

        // 3. Hooke's Law Spring return to origin grid
        const homeDx = p.originX - p.x;
        const homeDy = p.originY - p.y;
        p.vx += homeDx * 0.1;
        p.vy += homeDy * 0.1;
        p.vx *= 0.8; // damping
        p.vy *= 0.8;

        p.x += p.vx;
        p.y += p.vy;

        // Energy dissipation
        p.energy *= 0.93;

        // 4. Soft Color & Alpha Rendering (No hard white)
        const currentAlpha = Math.min(0.55, p.baseAlpha + p.energy * 0.35 + idleWave);
        const currentSize = p.size * (1 + p.energy * 0.25);

        // Soft muted tones: subtle zinc/silver grey (no harsh 255 pure white)
        if (p.energy > 0.3) {
          ctx.fillStyle = `rgba(195, 195, 195, ${currentAlpha})`;
        } else if (p.isTextEdge) {
          ctx.fillStyle = `rgba(160, 160, 160, ${currentAlpha})`;
        } else {
          ctx.fillStyle = `rgba(130, 130, 130, ${currentAlpha})`;
        }

        // Draw crisp square block (snapped for razor-sharp pixel look)
        ctx.fillRect(
          Math.round(p.x - currentSize / 2),
          Math.round(p.y - currentSize / 2),
          Math.max(1, Math.round(currentSize)),
          Math.max(1, Math.round(currentSize))
        );
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [dimensions]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current.targetX = e.clientX - rect.left;
    mouseRef.current.targetY = e.clientY - rect.top;
    mouseRef.current.isHovering = true;
    if (setCursorState) setCursorState('hover');
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
    mouseRef.current.targetX = mouseRef.current.x;
    mouseRef.current.targetY = mouseRef.current.y;
    mouseRef.current.isHovering = true;
    if (setCursorState) setCursorState('hover');
  };

  const handleMouseLeave = () => {
    mouseRef.current.isHovering = false;
    mouseRef.current.targetX = -9999;
    mouseRef.current.targetY = -9999;
    if (setCursorState) setCursorState('default');
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        width: '100%',
        marginTop: 'clamp(20px, 2.5vw, 36px)',
        paddingTop: '12px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
        cursor: 'crosshair',
        userSelect: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          margin: '0 auto',
        }}
      />
    </div>
  );
};
