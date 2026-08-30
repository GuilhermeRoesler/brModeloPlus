import type { ReactNode } from 'react';
import {
  Circle,
  Diamond,
  Minus,
  Plus,
  Square,
  Table as TableIcon,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { PropertyInput } from '../ui/PropertyInput';
import { generateId } from '../../lib/utils';
import {
  CARDINALITY_OPTIONS,
  cardinalityFieldForSide,
  entityParticipationSide,
} from '../../lib/cardinality';
import {
  NODE_TYPES,
  type ErEdge,
  type ErNode,
  type ErNodeData,
  type TableColumn,
} from '../../types';

type PropertiesPanelProps = {
  selectedIds: string[];
  nodes: ErNode[];
  edges: ErEdge[];
  updateNode: (id: string, changes: Partial<ErNodeData>) => void;
  updateEdge: (id: string, changes: Partial<NonNullable<ErEdge['data']>>) => void;
  deleteSelected: (idOverride?: string | null) => void;
  readOnly?: boolean;
};

export const PropertiesPanel = ({
  selectedIds,
  nodes,
  edges,
  updateNode,
  updateEdge,
  deleteSelected,
  readOnly = false,
}: PropertiesPanelProps) => {
  const isOpen = selectedIds.length > 0;
  const selectedId = selectedIds[0];
  const selectedNode = selectedId
    ? nodes.find((n) => n.id === selectedId)
    : undefined;
  const selectedEdge = selectedId
    ? edges.find((e) => e.id === selectedId)
    : undefined;

  const handleUpdate = (field: keyof ErNodeData, value: unknown) => {
    if (selectedNode && selectedId) updateNode(selectedId, { [field]: value });
  };

  const handleUpdateTableCol = (newCols: TableColumn[]) => {
    if (selectedNode && selectedId) updateNode(selectedId, { columns: newCols });
  };

  let body: ReactNode = null;

  if (selectedIds.length > 1) {
    body = (
      <div className="p-6 flex flex-col justify-center items-center text-center h-full">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
          <Users size={22} />
        </div>
        <h3 className="text-slate-800 font-bold mb-1">
          {selectedIds.length} itens selecionados
        </h3>
        <p className="text-slate-500 text-xs mb-6 leading-relaxed">
          Propriedades em massa indisponíveis.
        </p>
        {!readOnly && (
          <button
            type="button"
            onClick={() => deleteSelected()}
            className="btn-hover btn-hover--soft px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 inline-flex items-center gap-2"
          >
            <Trash2 size={16} /> Excluir todos
          </button>
        )}
      </div>
    );
  } else if (selectedIds.length === 1) {
    body = (
      <>
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.14em]">
              Propriedades
            </h2>
            <button
              type="button"
              onClick={() => deleteSelected(null)}
              className="btn-hover btn-hover--soft p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              title="Fechar seleção"
            >
              <X size={18} />
            </button>
          </div>

          {readOnly && (
            <p className="mb-4 text-[11px] leading-relaxed text-amber-800 bg-amber-50/90 border border-amber-100 rounded-xl px-3 py-2">
              Visão derivada do conceitual — edite no modo conceitual para atualizar.
            </p>
          )}

          {selectedNode && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                  {selectedNode.type === NODE_TYPES.ENTITY && <Square size={22} />}
                  {selectedNode.type === NODE_TYPES.RELATIONSHIP && <Diamond size={22} />}
                  {selectedNode.type === NODE_TYPES.ATTRIBUTE && <Circle size={22} />}
                  {selectedNode.type === NODE_TYPES.TABLE && <TableIcon size={22} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500 font-medium capitalize">
                    {selectedNode.type}
                  </p>
                  <p className="font-bold text-slate-800 text-base truncate">
                    {selectedNode.data.label}
                  </p>
                </div>
              </div>

              <PropertyInput
                label="Nome / Rótulo"
                value={selectedNode.data.label}
                disabled={readOnly}
                onChange={(val) => handleUpdate('label', val)}
              />

              {selectedNode.type === NODE_TYPES.ENTITY && (
                <div className="flex items-center justify-between p-3 bg-slate-50/90 rounded-xl border border-slate-100">
                  <span className="text-sm font-medium text-slate-700">Entidade fraca?</span>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={selectedNode.data.isWeak || false}
                    onChange={(e) => handleUpdate('isWeak', e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>
              )}

              {selectedNode.type === NODE_TYPES.ATTRIBUTE && (
                <PropertyInput
                  label="Tipo"
                  type="select"
                  disabled={readOnly}
                  value={selectedNode.data.attrType}
                  onChange={(val) => handleUpdate('attrType', val)}
                  options={[
                    { value: 'normal', label: 'Normal' },
                    { value: 'key', label: 'Chave Primária' },
                    { value: 'derived', label: 'Derivado' },
                    { value: 'multivalued', label: 'Multivalorado' },
                  ]}
                />
              )}

              {selectedNode.type === NODE_TYPES.TABLE && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Colunas
                    </label>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateTableCol([
                            ...(selectedNode.data.columns || []),
                            { id: generateId(), name: 'nova', type: 'INT', isPk: false },
                          ])
                        }
                        className="text-indigo-600 hover:bg-indigo-50 p-1 rounded-lg"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {selectedNode.data.columns?.map((col) => (
                      <div
                        key={col.id}
                        className="p-2 bg-slate-50/90 rounded-lg border border-slate-200/80 flex flex-col gap-2"
                      >
                        <div className="flex gap-2">
                          <input
                            value={col.name}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleUpdateTableCol(
                                (selectedNode.data.columns || []).map((c) =>
                                  c.id === col.id ? { ...c, name: e.target.value } : c,
                                ),
                              )
                            }
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs disabled:opacity-60"
                          />
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateTableCol(
                                  (selectedNode.data.columns || []).filter((c) => c.id !== col.id),
                                )
                              }
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          <input
                            value={col.type}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleUpdateTableCol(
                                (selectedNode.data.columns || []).map((c) =>
                                  c.id === col.id ? { ...c, type: e.target.value } : c,
                                ),
                              )
                            }
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-500 disabled:opacity-60"
                          />
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={Boolean(col.isPk)}
                              onChange={(e) =>
                                handleUpdateTableCol(
                                  (selectedNode.data.columns || []).map((c) =>
                                    c.id === col.id ? { ...c, isPk: e.target.checked } : c,
                                  ),
                                )
                              }
                            />
                            <span className="text-[10px] font-bold text-slate-500">PK</span>
                          </label>
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={Boolean(col.isFk)}
                              onChange={(e) =>
                                handleUpdateTableCol(
                                  (selectedNode.data.columns || []).map((c) =>
                                    c.id === col.id ? { ...c, isFk: e.target.checked } : c,
                                  ),
                                )
                              }
                            />
                            <span className="text-[10px] font-bold text-slate-500">FK</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedEdge && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                  <Minus size={22} className="rotate-45" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">Conexão</p>
                  <p className="font-bold text-slate-800 text-base">Ligação</p>
                </div>
              </div>
              {(() => {
                const participation = entityParticipationSide(selectedEdge, nodes);
                if (participation) {
                  const entityId =
                    participation === 'source'
                      ? selectedEdge.source
                      : selectedEdge.target;
                  const entity = nodes.find((n) => n.id === entityId);
                  const field = cardinalityFieldForSide(participation);
                  return (
                    <PropertyInput
                      label={`Cardinalidade (${entity?.data.label || 'entidade'})`}
                      type="select"
                      disabled={readOnly}
                      value={selectedEdge.data?.[field] ?? ''}
                      onChange={(val) =>
                        updateEdge(selectedId, { [field]: val })
                      }
                      options={CARDINALITY_OPTIONS}
                    />
                  );
                }

                const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
                const targetNode = nodes.find((n) => n.id === selectedEdge.target);
                return (
                  <>
                    <PropertyInput
                      label={`Cardinalidade (${sourceNode?.data.label || 'origem'})`}
                      type="select"
                      disabled={readOnly}
                      value={selectedEdge.data?.cardinalitySource ?? ''}
                      onChange={(val) =>
                        updateEdge(selectedId, { cardinalitySource: val })
                      }
                      options={CARDINALITY_OPTIONS}
                    />
                    <PropertyInput
                      label={`Cardinalidade (${targetNode?.data.label || 'destino'})`}
                      type="select"
                      disabled={readOnly}
                      value={selectedEdge.data?.cardinalityTarget ?? ''}
                      onChange={(val) =>
                        updateEdge(selectedId, { cardinalityTarget: val })
                      }
                      options={CARDINALITY_OPTIONS}
                    />
                  </>
                );
              })()}
              {!readOnly && (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Dica: no canvas, clique no chip da aresta para alternar 1, N, (0,1)…
                </p>
              )}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="p-5 border-t border-slate-100/90 bg-slate-50/50 shrink-0">
            <button
              type="button"
              onClick={() => deleteSelected()}
              className="btn-hover btn-hover--soft w-full py-2.5 flex items-center justify-center gap-2 text-red-600 bg-white border border-red-100 hover:bg-red-50 hover:border-red-200 rounded-xl font-medium text-sm"
            >
              <Trash2 size={16} /> Excluir selecionado
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <aside
      className={`editor-chrome editor-panel-shell z-20 flex flex-col h-full rounded-none border-y-0 border-r-0 border-l border-slate-200/80 ${
        isOpen ? 'editor-panel-shell--open' : ''
      }`}
      aria-hidden={!isOpen}
    >
      {isOpen && (
        <div
          key={selectedIds.join('-')}
          className="editor-panel-body w-80 min-w-[20rem] h-full flex flex-col overflow-hidden"
        >
          {body}
        </div>
      )}
    </aside>
  );
};
