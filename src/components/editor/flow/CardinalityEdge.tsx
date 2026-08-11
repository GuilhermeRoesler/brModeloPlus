import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useStore,
  type EdgeProps,
} from '@xyflow/react';
import { NODE_TYPES } from '../../../types';

type CardinalityData = {
  cardinalitySource?: string;
  cardinalityTarget?: string;
};

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

export const CardinalityEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  selected,
  data,
  markerEnd,
}: EdgeProps & { data?: CardinalityData }) => {
  const heuserPath = useStore((s) => {
    const src = s.nodeLookup.get(source);
    const tgt = s.nodeLookup.get(target);
    if (!src || !tgt) return null;

    const srcAttr = src.type === NODE_TYPES.ATTRIBUTE;
    const tgtAttr = tgt.type === NODE_TYPES.ATTRIBUTE;
    if (srcAttr === tgtAttr) return null;

    const attr = srcAttr ? src : tgt;
    const owner = srcAttr ? tgt : src;
    if (
      owner.type !== NODE_TYPES.ENTITY &&
      owner.type !== NODE_TYPES.RELATIONSHIP
    ) {
      return null;
    }

    const ownerW = owner.measured?.width ?? owner.width ?? 120;
    const ownerH = owner.measured?.height ?? owner.height ?? 60;
    const attrW = attr.measured?.width ?? attr.width ?? 20;
    const attrH = attr.measured?.height ?? attr.height ?? 20;
    const o = owner.internals.positionAbsolute;
    const a = attr.internals.positionAbsolute;

    return heuserStemPath(
      o.x,
      o.y,
      ownerW,
      ownerH,
      a.x + attrW / 2,
      a.y + attrH / 2,
    );
  });

  const [straightPath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
  const edgePath = heuserPath ?? straightPath;
  const srcLabel = heuserPath ? undefined : data?.cardinalitySource;
  const tgtLabel = heuserPath ? undefined : data?.cardinalityTarget;

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
          stroke: selected ? '#6366f1' : (style?.stroke as string) || '#334155',
          strokeWidth: selected ? 2.5 : 1.5,
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
