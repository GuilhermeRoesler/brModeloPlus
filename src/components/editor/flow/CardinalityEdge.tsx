import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';

type CardinalityData = {
  cardinalitySource?: string;
  cardinalityTarget?: string;
};

export const CardinalityEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  selected,
  data,
  markerEnd,
}: EdgeProps & { data?: CardinalityData }) => {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const srcLabel = data?.cardinalitySource;
  const tgtLabel = data?.cardinalityTarget;

  const sx = sourceX + (targetX - sourceX) * 0.25;
  const sy = sourceY + (targetY - sourceY) * 0.25;
  const tx = sourceX + (targetX - sourceX) * 0.75;
  const ty = sourceY + (targetY - sourceY) * 0.75;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? '#6366f1' : (style?.stroke as string) || '#cbd5e1',
          strokeWidth: selected ? 2.5 : 2,
        }}
      />
      <EdgeLabelRenderer>
        {srcLabel ? (
          <div
            className="nodrag nopan pointer-events-none absolute text-[10px] font-bold text-slate-500"
            style={{
              transform: `translate(-50%, -100%) translate(${sx}px, ${sy - 4}px)`,
            }}
          >
            {srcLabel}
          </div>
        ) : null}
        {tgtLabel ? (
          <div
            className="nodrag nopan pointer-events-none absolute text-[10px] font-bold text-slate-500"
            style={{
              transform: `translate(-50%, -100%) translate(${tx}px, ${ty - 4}px)`,
            }}
          >
            {tgtLabel}
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
};
