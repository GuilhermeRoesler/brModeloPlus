import { useEffect, useState } from 'react';

const HOVER_SELECTOR =
  'a, button, [role="button"], [role="tab"], label, summary, .cursor-pointer';
const NATIVE_SELECTOR =
  '.react-flow, #diagram-canvas, [data-native-cursor], input, textarea, select';

/**
 * Cursor customizado indigo — desativado em touch, reduced-motion e no canvas do editor.
 */
export const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [nativeZone, setNativeZone] = useState(false);

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduceMotion) return;

    setEnabled(true);
    document.documentElement.classList.add('has-custom-cursor');

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      setVisible(true);
      const target = e.target;
      if (!(target instanceof Element)) {
        setHovering(false);
        setNativeZone(false);
        return;
      }
      setNativeZone(Boolean(target.closest(NATIVE_SELECTOR)));
      setHovering(Boolean(target.closest(HOVER_SELECTOR)));
    };

    const onLeave = () => setVisible(false);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  if (!enabled) return null;

  const show = visible && !nativeZone;

  return (
    <div
      className="custom-cursor"
      aria-hidden
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        opacity: show ? 1 : 0,
      }}
      data-hover={hovering ? 'true' : 'false'}
    >
      <span className="custom-cursor__ring" />
      <span className="custom-cursor__dot" />
    </div>
  );
};
