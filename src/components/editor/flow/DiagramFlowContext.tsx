import { createContext, useContext } from 'react';
import type { CardinalitySide } from '../../../lib/cardinality';

export type DiagramFlowContextValue = {
  editingLabelId: string | null;
  onInlineLabelChange: (id: string, label: string) => void;
  onInlineLabelEnd: (id: string) => void;
  onInlineLabelSubmit: (id: string) => void;
  /** Tab na edição inline: cadeia entidade ↔ relacionamento. */
  onInlineLabelTab: (id: string) => void;
  /** Clique no rótulo da aresta: cicla cardinalidade. */
  onCycleEdgeCardinality: (edgeId: string, side: CardinalitySide) => void;
  connectable: boolean;
};

const DiagramFlowContext = createContext<DiagramFlowContextValue | null>(null);

export const DiagramFlowProvider = DiagramFlowContext.Provider;

export const useDiagramFlow = () => {
  const ctx = useContext(DiagramFlowContext);
  if (!ctx) {
    throw new Error('useDiagramFlow deve ser usado dentro de DiagramFlowProvider');
  }
  return ctx;
};
