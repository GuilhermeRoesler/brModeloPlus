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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PropertyInput } from '../ui/PropertyInput';
import { cn } from '@/lib/utils';
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
  type NodeType,
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

const TYPE_LABELS: Record<NodeType, string> = {
  entity: 'Entidade',
  relationship: 'Relacionamento',
  attribute: 'Atributo',
  table: 'Tabela',
};

const countByType = (nodes: ErNode[], edges: ErEdge[], ids: string[]) => {
  const counts: Record<string, number> = {};
  for (const id of ids) {
    const n = nodes.find((x) => x.id === id);
    if (n?.type) {
      counts[n.type] = (counts[n.type] ?? 0) + 1;
      continue;
    }
    if (edges.some((e) => e.id === id)) {
      counts.edge = (counts.edge ?? 0) + 1;
    }
  }
  return counts;
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
    const counts = countByType(nodes, edges, selectedIds);
    const summary = [
      counts.entity ? `${counts.entity} entidade${counts.entity > 1 ? 's' : ''}` : null,
      counts.relationship
        ? `${counts.relationship} relacionamento${counts.relationship > 1 ? 's' : ''}`
        : null,
      counts.attribute
        ? `${counts.attribute} atributo${counts.attribute > 1 ? 's' : ''}`
        : null,
      counts.table ? `${counts.table} tabela${counts.table > 1 ? 's' : ''}` : null,
      counts.edge ? `${counts.edge} ${counts.edge > 1 ? 'ligações' : 'ligação'}` : null,
    ].filter(Boolean);

    body = (
      <div className="p-6 flex flex-col justify-center items-center text-center h-full">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
          <Users size={22} />
        </div>
        <h3 className="text-foreground font-bold mb-1">
          {selectedIds.length} itens selecionados
        </h3>
        <p className="text-muted-foreground text-xs mb-2 leading-relaxed">
          {summary.join(' · ') || 'Seleção mista'}
        </p>
        <p className="text-muted-foreground text-[11px] mb-6 leading-relaxed">
          Propriedades em massa indisponíveis.
        </p>
        {!readOnly && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => deleteSelected()}
            className="rounded-xl gap-2"
          >
            <Trash2 /> Excluir todos
          </Button>
        )}
      </div>
    );
  } else if (selectedIds.length === 1) {
    body = (
      <>
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">
              Propriedades
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => deleteSelected(null)}
              className="rounded-lg text-muted-foreground"
              title="Fechar seleção"
            >
              <X />
            </Button>
          </div>

          {readOnly && (
            <p className="mb-4 text-[11px] leading-relaxed text-amber-900 dark:text-amber-100 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-xl px-3 py-2">
              Visão derivada do conceitual — edite no modo conceitual para atualizar.
            </p>
          )}

          {selectedNode && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                  {selectedNode.type === NODE_TYPES.ENTITY && <Square size={22} />}
                  {selectedNode.type === NODE_TYPES.RELATIONSHIP && <Diamond size={22} />}
                  {selectedNode.type === NODE_TYPES.ATTRIBUTE && <Circle size={22} />}
                  {selectedNode.type === NODE_TYPES.TABLE && <TableIcon size={22} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-md text-[10px] font-semibold">
                      {TYPE_LABELS[selectedNode.type as NodeType] ?? selectedNode.type}
                    </Badge>
                  </div>
                  <p className="font-bold text-foreground text-base truncate mt-1">
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
                <div className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-xl border border-border/80">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">Entidade fraca</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Depende de outra entidade para existência
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(selectedNode.data.isWeak)}
                    disabled={readOnly}
                    onCheckedChange={(v) => handleUpdate('isWeak', v)}
                    aria-label="Entidade fraca"
                  />
                </div>
              )}

              {selectedNode.type === NODE_TYPES.ATTRIBUTE && (
                <PropertyInput
                  label="Tipo"
                  type="select"
                  disabled={readOnly}
                  value={selectedNode.data.attrType ?? 'normal'}
                  onChange={(val) => handleUpdate('attrType', val)}
                  options={[
                    { value: 'normal', label: 'Normal' },
                    { value: 'key', label: 'Chave Primária' },
                    { value: 'derived', label: 'Derivado' },
                    { value: 'multivalued', label: 'Multivalorado' },
                  ]}
                  placeholder="Tipo do atributo"
                />
              )}

              {selectedNode.type === NODE_TYPES.TABLE && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Colunas
                    </label>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          handleUpdateTableCol([
                            ...(selectedNode.data.columns || []),
                            { id: generateId(), name: 'nova', type: 'INT', isPk: false },
                          ])
                        }
                        className="text-primary rounded-lg"
                      >
                        <Plus />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {selectedNode.data.columns?.map((col) => (
                      <div
                        key={col.id}
                        className="p-2.5 bg-muted/40 rounded-xl border border-border/80 flex flex-col gap-2.5"
                      >
                        <div className="flex gap-2">
                          <Input
                            value={col.name}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleUpdateTableCol(
                                (selectedNode.data.columns || []).map((c) =>
                                  c.id === col.id ? { ...c, name: e.target.value } : c,
                                ),
                              )
                            }
                            className="h-8 flex-1 rounded-lg text-xs"
                          />
                          {!readOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                handleUpdateTableCol(
                                  (selectedNode.data.columns || []).filter(
                                    (c) => c.id !== col.id,
                                  ),
                                )
                              }
                              className="text-destructive rounded-lg"
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-3 items-center flex-wrap">
                          <Input
                            value={col.type}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleUpdateTableCol(
                                (selectedNode.data.columns || []).map((c) =>
                                  c.id === col.id ? { ...c, type: e.target.value } : c,
                                ),
                              )
                            }
                            className="h-8 flex-1 min-w-[5rem] rounded-lg text-xs text-muted-foreground"
                          />
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                            <Switch
                              checked={Boolean(col.isPk)}
                              disabled={readOnly}
                              onCheckedChange={(v) =>
                                handleUpdateTableCol(
                                  (selectedNode.data.columns || []).map((c) =>
                                    c.id === col.id ? { ...c, isPk: v } : c,
                                  ),
                                )
                              }
                              className="scale-90"
                              aria-label="Chave primária"
                            />
                            PK
                          </label>
                          <label className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                            <Switch
                              checked={Boolean(col.isFk)}
                              disabled={readOnly}
                              onCheckedChange={(v) =>
                                handleUpdateTableCol(
                                  (selectedNode.data.columns || []).map((c) =>
                                    c.id === col.id ? { ...c, isFk: v } : c,
                                  ),
                                )
                              }
                              className="scale-90"
                              aria-label="Chave estrangeira"
                            />
                            FK
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
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Minus size={22} className="rotate-45" />
                </div>
                <div>
                  <Badge variant="secondary" className="rounded-md text-[10px] font-semibold">
                    Ligação
                  </Badge>
                  <p className="font-bold text-foreground text-base mt-1">Conexão</p>
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
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Dica: no canvas, clique no chip da aresta para alternar 1, N, (0,1)…
                </p>
              )}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="p-5 border-t border-border/80 bg-muted/40 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => deleteSelected()}
              className="w-full rounded-xl gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 /> Excluir selecionado
            </Button>
          </div>
        )}
      </>
    );
  }

  return (
    <aside
      className={cn(
        'editor-chrome editor-panel-shell z-30 flex flex-col overflow-hidden',
        isOpen && 'editor-panel-shell--open',
      )}
      aria-hidden={!isOpen}
    >
      {isOpen && (
        <div
          key={selectedIds.join('-')}
          className="editor-panel-body w-full h-full flex flex-col overflow-hidden"
        >
          {body}
        </div>
      )}
    </aside>
  );
};
