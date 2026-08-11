import { MousePointer2 } from 'lucide-react';
import { useReactFlow, useStore } from '@xyflow/react';
import type { RemoteCursor } from '../../../types';

type RemoteCursorsProps = {
  cursors: RemoteCursor[];
  currentUserId?: string;
};

/** Cursores remotos em coordenadas de tela (flow → screen). */
export const RemoteCursors = ({ cursors, currentUserId }: RemoteCursorsProps) => {
  const { flowToScreenPosition } = useReactFlow();
  // Re-render quando o viewport muda
  useStore((s) => s.transform);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {cursors.map((cursor) => {
        if (cursor.userId === currentUserId) return null;
        const p = flowToScreenPosition({ x: cursor.x, y: cursor.y });
        return (
          <div
            key={cursor.userId}
            className="absolute"
            style={{ left: p.x, top: p.y }}
          >
            <MousePointer2 className="w-4 h-4" fill={cursor.color} color="white" />
            <span
              className="absolute left-3 top-2 text-[10px] font-bold text-white px-1 rounded-sm"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.userId.substring(0, 4)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
