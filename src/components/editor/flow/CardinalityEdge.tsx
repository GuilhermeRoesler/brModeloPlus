import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useStore,
  type EdgeProps,
} from '@xyflow/react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import {
  CARDINALITY_OFFSET_PX,
  cardinalityFieldForSide,
  cardinalityLabelPoint,
  type CardinalitySide,
} from '../../../lib/cardinality';
import { NODE_TYPES } from '../../../types';
import { useDiagramFlow } from './DiagramFlowContext';

type CardinalityData = {
  cardinalitySource?: string;
  cardinalityTarget?: string;
};

type NodeBox = { x: number; y: number; width: number; height: number };

/** Haste Heuser: da base do dono até o centro do atributo. */
const heuserStemPath = (
  ownerX: number,
  ownerY: number,
  ownerW: number,
  ownerH: number,
  attrCx: number,
  attrCy: number,
): string => {
  const attachX = Math.min(
    Math.max(attrCx, ownerX + 4),
    ownerX + ownerW - 4,
  );
  const attachY = ownerY + ownerH;
  return `M ${attachX},${attachY} L ${attrCx},${attrCy}`;
};

const nodeBox = (node: {
  width?: number | null;
  height?: number | null;
  measured?: { width?: number; height?: number };
  internals: { positionAbsolute: { x: number; y: number } };
}): NodeBox => {
  const width = node.measured?.width ?? node.width ?? 120;
  const height = node.measured?.height ?? node.height ?? 60;
  const { x, y } = node.internals.positionAbsolute;
  return { x, y, width, height };
};

const LabelChip = ({
  value,
  x,
  y,
  selected,
  onCycle,
}: {
  value: string;
  x: number;
  y: number;
  selected: boolean;
  onCycle: () => void;
}) => {
  const empty = !value.trim();
  const handleClick = (e: ReactMouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onCycle();
  };

  return (
    <div
      className="nodrag nopan"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transform: `translate(${x}px, ${y}px)`,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <button
        type="button"
        onClick={handleClick}
        onMouseDown={(e) => e.stopPropagation()}
        title="Clique para alternar a cardinalidade"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'all',
        }}
        className={`min-w-[1.75rem] px-1.5 py-0.5 rounded text-[10px] font-bold leading-none border whitespace-nowrap transition-colors ${
          empty
            ? selected
              ? 'border-indigo-300 bg-indigo-50 text-indigo-400 hover:bg-indigo-100'
              : 'border-slate-200 bg-white/90 text-slate-300 hover:border-slate-300 hover:text-slate-500'
            : selected
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
              : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-indigo-300'
        }`}
      >
        {empty ? '?' : value}
      </button>
    </div>
  );
};

export const CardinalityEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  selected = false,
  data,
  markerEnd,
}: EdgeProps & { data?: CardinalityData }) => {
  const { onCycleEdgeCardinality } = useDiagramFlow();

  const edgeMeta = useStore((s) => {
    const src = s.nodeLookup.get(source);
    const tgt = s.nodeLookup.get(target);
    if (!src || !tgt) {
      return {
        heuserPath: null as string | null,
        participation: null as CardinalitySide | null,
        sourceBox: null as NodeBox | null,
        targetBox: null as NodeBox | null,
      };
    }

    const srcBox = nodeBox(src);
    const tgtBox = nodeBox(tgt);

    const srcAttr = src.type === NODE_TYPES.ATTRIBUTE;
    const tgtAttr = tgt.type === NODE_TYPES.ATTRIBUTE;

    let heuserPath: string | null = null;
    if (srcAttr !== tgtAttr) {
      const attr = srcAttr ? src : tgt;
      const owner = srcAttr ? tgt : src;
      if (
        owner.type === NODE_TYPES.ENTITY ||
        owner.type === NODE_TYPES.RELATIONSHIP
      ) {
        const ownerB = nodeBox(owner);
        const attrB = nodeBox(attr);
        heuserPath = heuserStemPath(
          ownerB.x,
          ownerB.y,
          ownerB.width,
          ownerB.height,
          attrB.x + attrB.width / 2,
          attrB.y + attrB.height / 2,
        );
      }
    }

    let participation: CardinalitySide | null = null;
    if (!heuserPath) {
      const srcEnt = src.type === NODE_TYPES.ENTITY;
      const tgtEnt = tgt.type === NODE_TYPES.ENTITY;
      const srcRel = src.type === NODE_TYPES.RELATIONSHIP;
      const tgtRel = tgt.type === NODE_TYPES.RELATIONSHIP;
      if (srcEnt && tgtRel) participation = 'source';
      else if (srcRel && tgtEnt) participation = 'target';
    }

    return {
      heuserPath,
      participation,
      sourceBox: srcBox,
      targetBox: tgtBox,
    };
  });

  const [straightPath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
  const edgePath = edgeMeta.heuserPath ?? straightPath;

  const sourceHandle = { x: sourceX, y: sourceY };
  const targetHandle = { x: targetX, y: targetY };

  const sourceLabel = edgeMeta.sourceBox
    ? cardinalityLabelPoint(
        edgeMeta.sourceBox,
        sourceHandle,
        targetHandle,
        CARDINALITY_OFFSET_PX,
      )
    : sourceHandle;
  const targetLabel = edgeMeta.targetBox
    ? cardinalityLabelPoint(
        edgeMeta.targetBox,
        targetHandle,
        sourceHandle,
        CARDINALITY_OFFSET_PX,
      )
    : targetHandle;

  const showCardinality = !edgeMeta.heuserPath;
  const participation = edgeMeta.participation;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#6366f1' : (style?.stroke as string) || '#334155',
          strokeWidth: selected ? 2.5 : 1.5,
        }}
      />
      {showCardinality ? (
        <EdgeLabelRenderer>
          {participation ? (
            <LabelChip
              value={
                data?.[cardinalityFieldForSide(participation)] ?? ''
              }
              x={participation === 'source' ? sourceLabel.x : targetLabel.x}
              y={participation === 'source' ? sourceLabel.y : targetLabel.y}
              selected={selected}
              onCycle={() => onCycleEdgeCardinality(id, participation)}
            />
          ) : (
            <>
              <LabelChip
                value={data?.cardinalitySource ?? ''}
                x={sourceLabel.x}
                y={sourceLabel.y}
                selected={selected}
                onCycle={() => onCycleEdgeCardinality(id, 'source')}
              />
              <LabelChip
                value={data?.cardinalityTarget ?? ''}
                x={targetLabel.x}
                y={targetLabel.y}
                selected={selected}
                onCycle={() => onCycleEdgeCardinality(id, 'target')}
              />
            </>
          )}
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
};
