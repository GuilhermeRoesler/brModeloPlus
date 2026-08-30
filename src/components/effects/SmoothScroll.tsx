import { useMemo, type ReactNode } from 'react';
import { ReactLenis } from 'lenis/react';
import type { LenisOptions } from 'lenis';
import 'lenis/dist/lenis.css';

type SmoothScrollProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Scroll suave estilo Lenis em um container (ex.: main do dashboard).
 * Respeita prefers-reduced-motion.
 */
export const SmoothScroll = ({ children, className }: SmoothScrollProps) => {
  const reduceMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const options: LenisOptions = {
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
    autoRaf: true,
  };

  return (
    <ReactLenis
      className={className}
      options={options}
      style={{ height: '100%', overflow: 'auto' }}
    >
      {children}
    </ReactLenis>
  );
};
