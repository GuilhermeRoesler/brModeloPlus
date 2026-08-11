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
};

const CARDINALITY_OPTIONS = [
  { value: '', label: 'Nenhuma' },
  { value: '1', label: '1' },
  { value: 'n', label: 'N' },
  { value: '(0,1)', label: '(0,1)' },
  { value: '(1,1)', label: '(1,1)' },
  { value: '(0,n)', label: '(0,n)' },
  { value: '(1,n)', label: '(1,n)' },
];

export const PropertiesPanel = ({
  selectedIds,
  nodes,
  edges,
  updateNode,
  updateEdge,
  deleteSelected,
}: PropertiesPanelProps) => {
  if (selectedIds.length !== 1) {
    if (selectedIds.length > 1) {
      return (
        <div className="w-80 bg-white border-l border-slate-200 shadow-xl z-20 p-6 flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4">
            <Users size={24} />
          </div>
          <h3 className="text-slate-800 font-bold mb-1">{selectedIds.length} Itens Selecionados</h3>
          <p className="text-slate-500 text-xs mb-6">Propriedades em massa indisponíveis.</p>
          <button
            type="button"
            onClick={() => deleteSelected()}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} /> Excluir Todos
          </button>
        </div>
      );
    }
    return <div className="w-0 transition-all duration-300" />;
  }

  const selectedId = selectedIds[0];
  const selectedNode = nodes.find((n) => n.id === selectedId);
  const selectedEdge = edges.find((e) => e.id === selectedId);

  const handleUpdate = (field: keyof ErNodeData, value: unknown) => {
    if (selectedNode) updateNode(selectedId, { [field]: value });
  };

  const handleUpdateTableCol = (newCols: TableColumn[]) => {
    if (selectedNode) updateNode(selectedId, { columns: newCols });
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 shadow-xl transition-all duration-300 z-20 overflow-y-auto flex flex-col h-full">
      <div className="p-6 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Propriedades</h2>
          <button
            type="button"
            onClick={() => deleteSelected(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {selectedNode && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                {selectedNode.type === NODE_TYPES.ENTITY && <Square size={24} />}
                {selectedNode.type === NODE_TYPES.RELATIONSHIP && <Diamond size={24} />}
                {selectedNode.type === NODE_TYPES.ATTRIBUTE && <Circle size={24} />}
                {selectedNode.type === NODE_TYPES.TABLE && <TableIcon size={24} />}
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium capitalize">{selectedNode.type}</p>
                <p className="font-bold text-slate-800 text-lg truncate max-w-[150px]">
                  {selectedNode.data.label}
                </p>
              </div>
            </div>

            <PropertyInput
              label="Nome / Rótulo"
              value={selectedNode.data.label}
              onChange={(val) => handleUpdate('label', val)}
            />

            {selectedNode.type === NODE_TYPES.ENTITY && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-medium text-slate-700">Entidade Fraca?</span>
                <input
                  type="checkbox"
                  checked={selectedNode.data.isWeak || false}
                  onChange={(e) => handleUpdate('isWeak', e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            )}

            {selectedNode.type === NODE_TYPES.ATTRIBUTE && (
              <PropertyInput
                label="Tipo"
                type="select"
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
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Colunas
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateTableCol([
                        ...(selectedNode.data.columns || []),
                        { id: generateId(), name: 'nova', type: 'INT', isPk: false },
                      ])
                    }
                    className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedNode.data.columns?.map((col) => (
                    <div
                      key={col.id}
                      className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-2"
                    >
                      <div className="flex gap-2">
                        <input
                          value={col.name}
                          onChange={(e) =>
                            handleUpdateTableCol(
                              (selectedNode.data.columns || []).map((c) =>
                                c.id === col.id ? { ...c, name: e.target.value } : c,
                              ),
                            )
                          }
                          className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                        />
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
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          value={col.type}
                          onChange={(e) =>
                            handleUpdateTableCol(
                              (selectedNode.data.columns || []).map((c) =>
                                c.id === col.id ? { ...c, type: e.target.value } : c,
                              ),
                            )
                          }
                          className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-500"
                        />
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
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
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                <Minus size={24} className="rotate-45" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Conexão</p>
                <p className="font-bold text-slate-800 text-lg">Ligação</p>
              </div>
            </div>
            <PropertyInput
              label="Cardinalidade Origem"
              type="select"
              value={selectedEdge.data?.cardinalitySource ?? ''}
              onChange={(val) => updateEdge(selectedId, { cardinalitySource: val })}
              options={CARDINALITY_OPTIONS}
            />
            <PropertyInput
              label="Cardinalidade Destino"
              type="select"
              value={selectedEdge.data?.cardinalityTarget ?? ''}
              onChange={(val) => updateEdge(selectedId, { cardinalityTarget: val })}
              options={CARDINALITY_OPTIONS}
            />
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50">
        <button
          type="button"
          onClick={() => deleteSelected()}
          className="w-full py-3 flex items-center justify-center gap-2 text-red-600 bg-white border border-red-100 hover:bg-red-50 rounded-xl transition-colors font-medium text-sm shadow-sm"
        >
          <Trash2 size={18} /> Excluir Selecionado
        </button>
      </div>
    </div>
  );
};
