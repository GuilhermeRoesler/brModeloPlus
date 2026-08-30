import { Handle, Position } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { useDiagramFlow } from './DiagramFlowContext';

/**
 * Handle central. Em ConnectionMode.Loose um único handle basta
 * para arrastar conexões entre quaisquer nós.
 */
export const NodeHandles = () => {
  const { connectable } = useDiagramFlow();

  const style: CSSProperties = {
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: connectable ? 16 : 12,
    height: connectable ? 16 : 12,
    border: '2.5px solid var(--background)',
    background: 'var(--primary)',
    opacity: connectable ? 1 : 0,
    pointerEvents: connectable ? 'auto' : 'none',
    zIndex: 10,
    boxShadow: connectable
      ? '0 0 0 4px color-mix(in oklab, var(--primary) 28%, transparent)'
      : undefined,
    transition: 'width 0.15s ease, height 0.15s ease, box-shadow 0.15s ease',
  };

  return (
    <Handle
      id="c-source"
      type="source"
      position={Position.Top}
      isConnectable={connectable}
      className={connectable ? 'editor-connect-handle' : undefined}
      style={style}
    />
  );
};
