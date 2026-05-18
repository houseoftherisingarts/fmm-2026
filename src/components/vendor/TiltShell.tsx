import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// Mouse-tracked 3D tilt + glare. Wraps a child card. Disables on touch
// and reduced-motion. Uses spring-damped motion values, never reflows.

const TiltShell: React.FC<{ children: React.ReactNode; max?: number; className?: string }> = ({
  children, max = 6, className = '',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 220, damping: 22, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 220, damping: 22, mass: 0.5 });

  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);
  const glareX  = useTransform(sx, [-0.5, 0.5], ['10%', '90%']);
  const glareY  = useTransform(sy, [-0.5, 0.5], ['10%', '90%']);

  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
  const enabled = !reduce && finePointer;

  const onMove = (e: React.MouseEvent) => {
    if (!enabled) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    mx.set(x); my.set(y);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={enabled ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined}
      className={`relative ${className}`}
    >
      {children}
      {enabled && (
        <motion.div
          aria-hidden
          style={{
            background: useTransform(
              [glareX, glareY] as any,
              ([x, y]: any) => `radial-gradient(ellipse 60% 50% at ${x} ${y}, rgba(255, 235, 180, 0.18) 0%, transparent 55%)`,
            ) as any,
          }}
          className="absolute inset-0 pointer-events-none rounded-[inherit] mix-blend-screen"
        />
      )}
    </motion.div>
  );
};

export default TiltShell;
