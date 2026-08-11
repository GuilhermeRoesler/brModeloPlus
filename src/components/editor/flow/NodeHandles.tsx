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
    width: 12,
    height: 12,
    border: '2px solid white',
    background: '#6366f1',
    opacity: connectable ? 1 : 0,
    pointerEvents: connectable ? 'auto' : 'none',
    zIndex: 10,
  };

  return (
    <Handle
      id="c-source"
      type="source"
      position={Position.Top}
      isConnectable={connectable}
      style={style}
    />
  );
};
