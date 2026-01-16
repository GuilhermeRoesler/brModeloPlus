import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MousePointer2,
  Square,
  Diamond,
  Circle,
  Minus,
  Trash2,
  Download,
  Upload,
  Grid,
  MoreVertical,
  X,
  Plus,
  Table as TableIcon,
  Database,
  Layout,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

// ==========================================
// CONFIGURAÇÕES E CONSTANTES GLOBAIS
// ==========================================

const MODES = {
  CONCEPTUAL: 'conceitual',
  LOGICAL: 'logico',
  PHYSICAL: 'fisico'
};

const NODE_TYPES = {
  ENTITY: 'entity',
  RELATIONSHIP: 'relationship',
  ATTRIBUTE: 'attribute',
  TABLE: 'table' // Novo tipo para Lógico/Físico
};

const THEME = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  secondary: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
  accent: 'text-indigo-600',
  selection: 'stroke-indigo-500 stroke-2',
  selectionFill: 'fill-indigo-50',
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// ==========================================
// COMPONENTES DE UI GENÉRICOS
// ==========================================

const PropertyInput = ({ label, value, onChange, type = "text", options = [], placeholder = "" }) => (
  <div className="mb-4">
    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 ml-1">
      {label}
    </label>
    {type === 'select' ? (
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none text-sm font-medium text-slate-700"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
          <MoreVertical size={16} />
        </div>
      </div>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 placeholder-slate-400"
      />
    )}
  </div>
);

// ==========================================
// COMPONENTE: HEADER
// ==========================================

const Header = ({ currentMode, setMode, onClear, onExport, onImport }) => (
  <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Grid className="text-white" size={18} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800 leading-none">
            BrModelo<span className="text-indigo-600">Plus</span>
          </h1>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
            {currentMode}
          </span>
        </div>
      </div>

      <div className="h-8 w-px bg-slate-200 mx-2"></div>

      {/* Seletor de Modo */}
      <div className="flex bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => setMode(MODES.CONCEPTUAL)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${currentMode === MODES.CONCEPTUAL ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Conceitual
        </button>
        <button
          onClick={() => setMode(MODES.LOGICAL)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${currentMode === MODES.LOGICAL ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Lógico
        </button>
        <button
          onClick={() => setMode(MODES.PHYSICAL)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${currentMode === MODES.PHYSICAL ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Físico
        </button>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <button
        onClick={onClear}
        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
        title="Limpar Tudo"
      >
        <Trash2 size={20} />
      </button>
      <div className="h-6 w-px bg-slate-200 mx-1"></div>
      <button onClick={onImport} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">
        <Upload size={16} /> Importar
      </button>
      <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-200 transition-all active:scale-95">
        <Download size={16} /> Exportar JSON
      </button>
    </div>
  </header>
);

// ==========================================
// COMPONENTE: TOOLBAR
// ==========================================

const ToolbarButton = ({ icon: Icon, label, active, onClick, color }) => (
  <button
    onClick={onClick}
    className={`group relative flex items-center justify-center p-3 rounded-2xl transition-all duration-200 ${active
        ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-200'
        : 'hover:bg-slate-100 text-slate-600'
      }`}
  >
    <Icon size={22} className={color} />
    <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
      {label}
    </span>
  </button>
);

const Toolbar = ({ tool, setTool, currentMode }) => {
  return (
    <aside className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-10">
      <ToolbarButton
        icon={MousePointer2}
        label="Selecionar"
        active={tool === 'select'}
        onClick={() => setTool('select')}
      />
      <div className="w-8 h-px bg-slate-100 mx-auto my-1"></div>

      {/* Ferramentas do Modelo Conceitual */}
      {currentMode === MODES.CONCEPTUAL && (
        <>
          <ToolbarButton
            icon={Square}
            label="Entidade"
            active={tool === 'entity'}
            onClick={() => setTool('entity')}
            color="text-emerald-600"
          />
          <ToolbarButton
            icon={Diamond}
            label="Relacionamento"
            active={tool === 'relationship'}
            onClick={() => setTool('relationship')}
            color="text-rose-500"
          />
          <ToolbarButton
            icon={Circle}
            label="Atributo"
            active={tool === 'attribute'}
            onClick={() => setTool('attribute')}
            color="text-amber-500"
          />
        </>
      )}

      {/* Ferramentas do Modelo Lógico/Físico */}
      {(currentMode === MODES.LOGICAL || currentMode === MODES.PHYSICAL) && (
        <>
          <ToolbarButton
            icon={TableIcon}
            label="Tabela"
            active={tool === 'table'}
            onClick={() => setTool('table')}
            color="text-blue-600"
          />
        </>
      )}

      <div className="w-8 h-px bg-slate-100 mx-auto my-1"></div>
      <ToolbarButton
        icon={Minus}
        label="Conectar"
        active={tool === 'connection'}
        onClick={() => setTool('connection')}
      />
    </aside>
  );
};

// ==========================================
// COMPONENTE: PROPERTIES PANEL
// ==========================================

const PropertiesPanel = ({ selectedId, nodes, connections, setNodes, setConnections, deleteSelected, currentMode }) => {
  const selectedNode = nodes.find(n => n.id === selectedId);
  const selectedConnection = connections.find(c => c.id === selectedId);

  // Manipulação de Colunas para Tabelas (Lógico/Físico)
  const addColumn = () => {
    if (!selectedNode) return;
    const newCol = { id: generateId(), name: 'nova_coluna', type: 'VARCHAR', isPk: false, isFk: false };
    const updatedNode = { ...selectedNode, columns: [...(selectedNode.columns || []), newCol] };
    setNodes(nodes.map(n => n.id === selectedId ? updatedNode : n));
  };

  const updateColumn = (colId, field, value) => {
    const updatedCols = selectedNode.columns.map(col =>
      col.id === colId ? { ...col, [field]: value } : col
    );
    setNodes(nodes.map(n => n.id === selectedId ? { ...selectedNode, columns: updatedCols } : n));
  };

  const removeColumn = (colId) => {
    const updatedCols = selectedNode.columns.filter(col => col.id !== colId);
    setNodes(nodes.map(n => n.id === selectedId ? { ...selectedNode, columns: updatedCols } : n));
  };

  if (!selectedId) return <div className="w-0 transition-all duration-300" />;

  return (
    <div className="w-80 bg-white border-l border-slate-200 shadow-xl transition-all duration-300 z-20 overflow-y-auto flex flex-col h-full">
      <div className="p-6 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Propriedades</h2>
          <button onClick={() => deleteSelected(null)} className="text-slate-400 hover:text-slate-600">
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
                <p className="text-xs text-slate-500 font-medium capitalize">
                  {selectedNode.type === NODE_TYPES.TABLE ? 'Tabela' : selectedNode.type}
                </p>
                <p className="font-bold text-slate-800 text-lg truncate max-w-[150px]">{selectedNode.label}</p>
              </div>
            </div>

            <PropertyInput
              label="Nome / Rótulo"
              value={selectedNode.label}
              onChange={(val) => setNodes(nodes.map(n => n.id === selectedId ? { ...n, label: val } : n))}
            />

            {/* --- PROPRIEDADES ESPECÍFICAS DE CADA TIPO --- */}

            {selectedNode.type === NODE_TYPES.ENTITY && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-medium text-slate-700">Entidade Fraca?</span>
                <input
                  type="checkbox"
                  checked={selectedNode.isWeak || false}
                  onChange={(e) => setNodes(nodes.map(n => n.id === selectedId ? { ...n, isWeak: e.target.checked } : n))}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            )}

            {selectedNode.type === NODE_TYPES.ATTRIBUTE && (
              <PropertyInput
                label="Tipo do Atributo"
                type="select"
                value={selectedNode.attrType}
                onChange={(val) => setNodes(nodes.map(n => n.id === selectedId ? { ...n, attrType: val } : n))}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'key', label: 'Chave Primária' },
                  { value: 'derived', label: 'Derivado (Pontilhado)' },
                  { value: 'multivalued', label: 'Multivalorado (Linha Dupla)' },
                ]}
              />
            )}

            {/* --- EDITOR DE COLUNAS PARA TABELAS (LÓGICO/FÍSICO) --- */}
            {selectedNode.type === NODE_TYPES.TABLE && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Colunas</label>
                  <button onClick={addColumn} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedNode.columns?.map(col => (
                    <div key={col.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input
                          value={col.name}
                          onChange={(e) => updateColumn(col.id, 'name', e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                          placeholder="Nome Coluna"
                        />
                        <button onClick={() => removeColumn(col.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          value={col.type}
                          onChange={(e) => updateColumn(col.id, 'type', e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-500"
                          placeholder="Tipo (INT, VARCHAR)"
                        />
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.isPk}
                            onChange={(e) => updateColumn(col.id, 'isPk', e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 w-3 h-3"
                          />
                          <span className="text-[10px] font-bold text-slate-500">PK</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.isFk}
                            onChange={(e) => updateColumn(col.id, 'isFk', e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 w-3 h-3"
                          />
                          <span className="text-[10px] font-bold text-slate-500">FK</span>
                        </label>
                      </div>
                    </div>
                  ))}
                  {(!selectedNode.columns || selectedNode.columns.length === 0) && (
                    <p className="text-xs text-slate-400 italic text-center py-2">Nenhuma coluna adicionada</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedConnection && (
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
              value={selectedConnection.cardinalitySource}
              onChange={(val) => setConnections(connections.map(c => c.id === selectedId ? { ...c, cardinalitySource: val } : c))}
              options={[
                { value: '', label: 'Nenhuma' },
                { value: '1', label: '1' },
                { value: 'n', label: 'N' },
                { value: '(0,1)', label: '(0,1)' },
                { value: '(1,1)', label: '(1,1)' },
                { value: '(0,n)', label: '(0,n)' },
                { value: '(1,n)', label: '(1,n)' },
              ]}
            />

            <PropertyInput
              label="Cardinalidade Destino"
              type="select"
              value={selectedConnection.cardinalityTarget}
              onChange={(val) => setConnections(connections.map(c => c.id === selectedId ? { ...c, cardinalityTarget: val } : c))}
              options={[
                { value: '', label: 'Nenhuma' },
                { value: '1', label: '1' },
                { value: 'n', label: 'N' },
                { value: '(0,1)', label: '(0,1)' },
                { value: '(1,1)', label: '(1,1)' },
                { value: '(0,n)', label: '(0,n)' },
                { value: '(1,n)', label: '(1,n)' },
              ]}
            />
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50">
        <button
          onClick={() => deleteSelected(selectedId)}
          className="w-full py-3 flex items-center justify-center gap-2 text-red-600 bg-white border border-red-100 hover:bg-red-50 rounded-xl transition-colors font-medium text-sm shadow-sm"
        >
          <Trash2 size={18} /> Excluir Selecionado
        </button>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE: CANVAS BOARD (Visualização)
// ==========================================

const CanvasBoard = ({
  nodes, connections, tool, selectedId, pan, zoom,
  handleCanvasMouseDown, handleMouseMove, handleMouseUp, handleNodeMouseDown,
  tempConnectionStart, dragStart
}) => {

  // Renderizadores de Formas SVG
  const renderNode = (node) => {
    const isSelected = selectedId === node.id;
    const strokeClass = isSelected ? THEME.selection : "stroke-slate-800 stroke-2";
    const fillClass = isSelected ? THEME.selectionFill : "fill-white";
    const filter = isSelected ? "url(#glow)" : "drop-shadow(0px 2px 3px rgba(0,0,0,0.1))";

    switch (node.type) {
      case NODE_TYPES.ENTITY:
        return (
          <g transform={`translate(${node.x - 60}, ${node.y - 30})`}>
            {node.isWeak && (
              <rect x="-4" y="-4" width="128" height="68" rx="6" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-800" />
            )}
            <rect width="120" height="60" rx="4" className={`${fillClass} ${strokeClass} transition-colors`} style={{ filter }} />
            <foreignObject x="0" y="0" width="120" height="60">
              <div className="w-full h-full flex items-center justify-center text-center p-1">
                <span className="text-sm font-semibold text-slate-800 leading-tight select-none">{node.label}</span>
              </div>
            </foreignObject>
          </g>
        );

      case NODE_TYPES.RELATIONSHIP:
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <path d="M 0 -40 L 50 0 L 0 40 L -50 0 Z" className={`${fillClass} ${strokeClass} transition-colors`} style={{ filter }} />
            {node.isWeak && (
              <path d="M 0 -34 L 42 0 L 0 34 L -42 0 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-800" />
            )}
            <foreignObject x="-40" y="-20" width="80" height="40">
              <div className="w-full h-full flex items-center justify-center text-center">
                <span className="text-xs font-bold text-slate-800 select-none">{node.label}</span>
              </div>
            </foreignObject>
          </g>
        );

      case NODE_TYPES.ATTRIBUTE:
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <ellipse
              cx="0" cy="0" rx="50" ry="25"
              className={`${fillClass} ${strokeClass}`}
              style={{ filter }}
              strokeDasharray={node.attrType === 'derived' ? "4" : "0"}
            />
            {node.attrType === 'multivalued' && (
              <ellipse cx="0" cy="0" rx="45" ry="20" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-800" />
            )}
            <foreignObject x="-45" y="-20" width="90" height="40">
              <div className="w-full h-full flex items-center justify-center text-center p-1">
                <span className={`text-xs text-slate-800 select-none ${node.attrType === 'key' ? 'underline font-bold' : ''}`}>
                  {node.attrType === 'key' && <span className="w-2 h-2 bg-black rounded-full inline-block mr-1"></span>}
                  {node.label}
                </span>
              </div>
            </foreignObject>
          </g>
        );

      case NODE_TYPES.TABLE:
        const rowHeight = 24;
        const headerHeight = 32;
        const tableHeight = headerHeight + (node.columns?.length || 0) * rowHeight + 10;
        const tableWidth = 160;

        return (
          <g transform={`translate(${node.x - tableWidth / 2}, ${node.y - headerHeight / 2})`}>
            {/* Container Tabela */}
            <rect
              width={tableWidth}
              height={tableHeight}
              rx="4"
              className={`${fillClass} ${strokeClass}`}
              style={{ filter }}
            />
            {/* Header Tabela */}
            <rect width={tableWidth} height={headerHeight} rx="4" className="fill-slate-100 stroke-none" />
            <line x1="0" y1={headerHeight} x2={tableWidth} y2={headerHeight} stroke="currentColor" className="text-slate-300" />

            {/* Título Tabela */}
            <foreignObject x="0" y="0" width={tableWidth} height={headerHeight}>
              <div className="w-full h-full flex items-center justify-center px-2">
                <span className="font-bold text-sm text-slate-800 truncate">{node.label}</span>
              </div>
            </foreignObject>

            {/* Colunas */}
            <foreignObject x="0" y={headerHeight} width={tableWidth} height={tableHeight - headerHeight}>
              <div className="flex flex-col pt-1 px-2">
                {node.columns?.map(col => (
                  <div key={col.id} className="flex items-center justify-between h-[24px] text-[10px] text-slate-700 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-1 overflow-hidden">
                      {col.isPk && <span className="text-[9px] font-bold text-amber-600">PK</span>}
                      {col.isFk && <span className="text-[9px] font-bold text-blue-600">FK</span>}
                      <span className={`truncate ${col.isPk ? 'font-bold' : ''}`}>{col.name}</span>
                    </div>
                    <span className="text-slate-400 text-[9px] ml-1 shrink-0">{col.type}</span>
                  </div>
                ))}
              </div>
            </foreignObject>
          </g>
        );

      default: return null;
    }
  };

  return (
    <div
      className="flex-1 bg-slate-50 relative cursor-grab active:cursor-grabbing overflow-hidden h-full w-full"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
    >
      {/* Grid Infinito */}
      <div
        id="grid-bg"
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
      />

      <svg className="w-full h-full pointer-events-none">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

          {/* Conexões */}
          {connections.map(conn => {
            const source = nodes.find(n => n.id === conn.source);
            const target = nodes.find(n => n.id === conn.target);
            if (!source || !target) return null;

            const getCenter = (n) => {
              // Ajuste fino para o tipo Table que desenhamos a partir do centro x-width/2
              // A lógica do renderNode já centraliza visualmente, então x,y no estado é o centro
              return { x: n.x, y: n.y };
            }

            const sC = getCenter(source);
            const tC = getCenter(target);

            return (
              <g key={conn.id} className="pointer-events-auto cursor-pointer group">
                <line
                  x1={sC.x} y1={sC.y}
                  x2={tC.x} y2={tC.y}
                  stroke={selectedId === conn.id ? "#6366f1" : "#cbd5e1"}
                  strokeWidth="2"
                  className="transition-colors"
                />
                {/* Hitbox invisível */}
                <line
                  x1={sC.x} y1={sC.y}
                  x2={tC.x} y2={tC.y}
                  stroke="transparent"
                  strokeWidth="15"
                  onClick={(e) => { e.stopPropagation(); handleNodeMouseDown(e, conn.id, true); }}
                />

                {/* Labels de Cardinalidade */}
                {(conn.cardinalitySource || conn.cardinalityTarget) && (
                  <>
                    <text x={sC.x + (tC.x - sC.x) * 0.25} y={sC.y + (tC.y - sC.y) * 0.25} className="text-[10px] fill-slate-500 font-bold" textAnchor="middle" dy="-5" stroke="white" strokeWidth="3" paintOrder="stroke">
                      {conn.cardinalitySource}
                    </text>
                    <text x={sC.x + (tC.x - sC.x) * 0.25} y={sC.y + (tC.y - sC.y) * 0.25} className="text-[10px] fill-slate-500 font-bold" textAnchor="middle" dy="-5">
                      {conn.cardinalitySource}
                    </text>

                    <text x={sC.x + (tC.x - sC.x) * 0.75} y={sC.y + (tC.y - sC.y) * 0.75} className="text-[10px] fill-slate-500 font-bold" textAnchor="middle" dy="-5" stroke="white" strokeWidth="3" paintOrder="stroke">
                      {conn.cardinalityTarget}
                    </text>
                    <text x={sC.x + (tC.x - sC.x) * 0.75} y={sC.y + (tC.y - sC.y) * 0.75} className="text-[10px] fill-slate-500 font-bold" textAnchor="middle" dy="-5">
                      {conn.cardinalityTarget}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Linha Temporária */}
          {tool === 'connection' && tempConnectionStart && dragStart && (() => {
            const source = nodes.find(n => n.id === tempConnectionStart);
            if (!source) return null;
            return (
              <line
                x1={source.x} y1={source.y}
                x2={dragStart.x}
                y2={dragStart.y}
                stroke="#cbd5e1"
                strokeDasharray="5,5"
                strokeWidth="2"
              />
            )
          })()}

          {/* Renderização de Nós */}
          {nodes.map(node => (
            <g
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              className="pointer-events-auto cursor-move"
            >
              {renderNode(node)}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL (CONTAINER)
// ==========================================

export default function App() {
  // --- Estados do Modelo ---
  const [mode, setMode] = useState(MODES.CONCEPTUAL);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);

  // --- Estados de Interface ---
  const [selectedId, setSelectedId] = useState(null);
  const [tool, setTool] = useState('select');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // --- Estados Temporários / Interação ---
  const [tempConnectionStart, setTempConnectionStart] = useState(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // Mouse position raw
  const [canvasDragStart, setCanvasDragStart] = useState({ x: 0, y: 0 }); // Pan position at start

  const canvasRef = useRef(null);

  // --- Persistência ---
  useEffect(() => {
    const saved = localStorage.getItem('brmodelo-ultra-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setNodes(data.nodes || []);
        setConnections(data.connections || []);
        if (data.mode) setMode(data.mode);
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('brmodelo-ultra-data', JSON.stringify({ nodes, connections, mode }));
  }, [nodes, connections, mode]);

  // --- Helpers de Coordenadas ---
  const getMousePos = (e) => {
    // Retorna coordenadas relativas ao zoom e pan para lógica do canvas
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom
    };
  };

  const getRawMousePos = (e) => {
    // Retorna coordenadas para calcular linhas temporárias visualmente corretas dentro do SVG transformado
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom
    };
  }

  // --- Handlers de Interação ---

  const handleCanvasMouseDown = (e) => {
    // Clique no fundo
    if (e.target.id === 'grid-bg' || e.target.tagName === 'svg' || e.target.tagName === 'DIV') {
      if (tool === 'select') {
        setIsDraggingCanvas(true);
        setCanvasDragStart({ x: e.clientX, y: e.clientY });
        setDragStart(pan); // Salva o pan atual
        setSelectedId(null);
      } else {
        const pos = getMousePos(e);
        addNode(pos);
      }
    }
  };

  const addNode = (pos) => {
    let newNode = { x: pos.x, y: pos.y, id: generateId(), label: 'Novo Item' };

    if (tool === 'entity') {
      newNode = { ...newNode, type: NODE_TYPES.ENTITY, label: 'Entidade', isWeak: false };
    } else if (tool === 'relationship') {
      newNode = { ...newNode, type: NODE_TYPES.RELATIONSHIP, label: 'Rel', width: 80, height: 80 };
    } else if (tool === 'attribute') {
      newNode = { ...newNode, type: NODE_TYPES.ATTRIBUTE, label: 'Atributo', attrType: 'normal' };
    } else if (tool === 'table') {
      newNode = { ...newNode, type: NODE_TYPES.TABLE, label: 'Tabela', columns: [{ id: generateId(), name: 'id', type: 'INT', isPk: true }] };
    } else {
      return;
    }

    setNodes([...nodes, newNode]);
    setTool('select');
    setSelectedId(newNode.id);
  };

  const handleNodeMouseDown = (e, id, isConnection = false) => {
    e.stopPropagation();

    if (tool === 'connection') {
      if (!tempConnectionStart) {
        setTempConnectionStart(id);
      } else {
        if (tempConnectionStart !== id) {
          const newConn = {
            id: generateId(),
            source: tempConnectionStart,
            target: id,
            cardinalitySource: '',
            cardinalityTarget: '',
          };
          setConnections([...connections, newConn]);
        }
        setTempConnectionStart(null);
        setTool('select');
      }
    } else {
      setSelectedId(id);
      if (!isConnection) {
        setIsDraggingNode(true);
      }
    }
  };

  const handleMouseMove = (e) => {
    // Atualiza posição do mouse para linha temporária
    if (tool === 'connection' && tempConnectionStart) {
      const raw = getRawMousePos(e);
      setDragStart(raw); // Usando dragStart para guardar a pos atual do mouse para a linha
    }

    if (isDraggingCanvas) {
      const dx = e.clientX - canvasDragStart.x;
      const dy = e.clientY - canvasDragStart.y;
      setPan({ x: dragStart.x + dx, y: dragStart.y + dy });
      return;
    }

    if (isDraggingNode && selectedId) {
      const pos = getMousePos(e);
      // Simples snap to grid opcional? Por enquanto livre.
      setNodes(nodes.map(n => n.id === selectedId ? { ...n, x: pos.x, y: pos.y } : n));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setIsDraggingNode(false);
  };

  const deleteSelected = (idOverride) => {
    const idToDelete = idOverride || selectedId;
    if (!idToDelete) return;

    setNodes(nodes.filter(n => n.id !== idToDelete));
    setConnections(connections.filter(c => c.source !== idToDelete && c.target !== idToDelete && c.id !== idToDelete));
    if (selectedId === idToDelete) setSelectedId(null);
  };

  const clearCanvas = () => {
    if (confirm('Deseja limpar todo o modelo?')) {
      setNodes([]);
      setConnections([]);
      setSelectedId(null);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100 overflow-hidden font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">

      <Header
        currentMode={mode}
        setMode={setMode}
        onClear={clearCanvas}
        onExport={() => {
          const data = JSON.stringify({ nodes, connections, mode }, null, 2);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `modelo_${mode}_${new Date().getTime()}.json`;
          a.click();
        }}
        onImport={() => alert('Funcionalidade de importação simulada. (Arraste um arquivo JSON aqui no futuro)')}
      />

      <div className="flex-1 flex relative overflow-hidden">

        <Toolbar tool={tool} setTool={setTool} currentMode={mode} />

        <CanvasBoard
          nodes={nodes}
          connections={connections}
          tool={tool}
          selectedId={selectedId}
          pan={pan}
          zoom={zoom}
          handleCanvasMouseDown={handleCanvasMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
          handleNodeMouseDown={handleNodeMouseDown}
          tempConnectionStart={tempConnectionStart}
          dragStart={dragStart}
        />

        {/* Zoom Controls Overlay */}
        <div className="absolute bottom-6 left-6 flex gap-2 z-10">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-1 flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title="Zoom Out">
              <ZoomOut size={18} />
            </button>
            <span className="text-xs font-bold w-12 text-center text-slate-600 tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title="Zoom In">
              <ZoomIn size={18} />
            </button>
          </div>
          <button
            onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}
            className="bg-white rounded-xl shadow-lg border border-slate-100 p-2 hover:bg-slate-50 text-slate-600 transition-colors text-xs font-medium"
          >
            Resetar
          </button>
        </div>

        <PropertiesPanel
          selectedId={selectedId}
          nodes={nodes}
          connections={connections}
          setNodes={setNodes}
          setConnections={setConnections}
          deleteSelected={deleteSelected}
          currentMode={mode}
        />

      </div>
    </div>
  );
}