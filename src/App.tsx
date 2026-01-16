import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MousePointer2,
  Square,
  Diamond,
  Circle,
  Minus,
  Trash2,
  Download,
  Upload,
  Settings,
  Grid,
  Type,
  Maximize,
  MoreVertical,
  X,
  Plus
} from 'lucide-react';

// --- Utilitários ---
const generateId = () => Math.random().toString(36).substr(2, 9);

// Cores e Estilos Material 3
const THEME = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  surface: 'bg-white',
  surfaceContainer: 'bg-slate-50',
  surfaceVariant: 'bg-slate-100',
  outline: 'border-slate-300',
  text: 'text-slate-800',
  textSecondary: 'text-slate-500',
};

// Tipos de Nós
const NODE_TYPES = {
  ENTITY: 'entity',
  RELATIONSHIP: 'relationship',
  ATTRIBUTE: 'attribute'
};

// --- Componentes ---

const ToolbarButton = ({ icon: Icon, label, active, onClick, color }) => (
  <button
    onClick={onClick}
    className={`group relative flex items-center justify-center p-3 rounded-2xl transition-all duration-200 ${active
      ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-200'
      : 'hover:bg-slate-100 text-slate-600'
      }`}
    title={label}
  >
    <Icon size={22} className={color} />
    <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
      {label}
    </span>
  </button>
);

const PropertyInput = ({ label, value, onChange, type = "text", options = [] }) => (
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
        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 placeholder-slate-400"
      />
    )}
  </div>
);

export default function App() {
  // --- Estados ---
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tool, setTool] = useState('select'); // select, entity, relationship, attribute, connection
  const [tempConnectionStart, setTempConnectionStart] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  const canvasRef = useRef(null);

  // --- Efeitos ---

  // Carregar do LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('brmodelo-plus-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setNodes(data.nodes || []);
        setConnections(data.connections || []);
      } catch (e) {
        console.error("Erro ao carregar dados", e);
      }
    }
  }, []);

  // Salvar no LocalStorage
  useEffect(() => {
    const data = JSON.stringify({ nodes, connections });
    localStorage.setItem('brmodelo-plus-data', data);
  }, [nodes, connections]);

  // --- Lógica do Canvas ---

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom
    };
  };

  const handleCanvasMouseDown = (e) => {
    // Se clicar no fundo e estiver no modo select, inicia o Pan
    if (e.target === canvasRef.current || e.target.id === 'grid-bg') {
      if (tool === 'select') {
        setIsDraggingCanvas(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        setSelectedId(null);
      } else {
        // Adicionar nós baseados na ferramenta
        const pos = getMousePos(e);
        addNode(pos);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    if (isDraggingNode && selectedId) {
      const pos = getMousePos(e);
      setNodes(nodes.map(n =>
        n.id === selectedId
          ? { ...n, x: pos.x, y: pos.y }
          : n
      ));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    setIsDraggingNode(false);
  };

  // --- Lógica de Nós e Conexões ---

  const addNode = (pos) => {
    let newNode = null;
    const baseStyle = { x: pos.x, y: pos.y, width: 100, height: 60 };

    if (tool === 'entity') {
      newNode = { ...baseStyle, id: generateId(), type: NODE_TYPES.ENTITY, label: 'Entidade', isWeak: false };
    } else if (tool === 'relationship') {
      newNode = { ...baseStyle, id: generateId(), type: NODE_TYPES.RELATIONSHIP, label: 'Rel', width: 80, height: 80 };
    } else if (tool === 'attribute') {
      newNode = { ...baseStyle, id: generateId(), type: NODE_TYPES.ATTRIBUTE, label: 'Atributo', width: 80, height: 50, attrType: 'normal' }; // normal, key, composite, multivalued
    }

    if (newNode) {
      setNodes([...nodes, newNode]);
      setTool('select');
      setSelectedId(newNode.id);
    }
  };

  const handleNodeMouseDown = (e, id) => {
    e.stopPropagation();

    if (tool === 'connection') {
      if (!tempConnectionStart) {
        setTempConnectionStart(id);
      } else {
        // Criar conexão
        if (tempConnectionStart !== id) {
          const newConn = {
            id: generateId(),
            source: tempConnectionStart,
            target: id,
            cardinalitySource: '', // (0,n) etc
            cardinalityTarget: '',
            label: ''
          };
          setConnections([...connections, newConn]);
        }
        setTempConnectionStart(null);
        setTool('select');
      }
    } else {
      setSelectedId(id);
      setIsDraggingNode(true);
    }
  };

  const deleteSelected = () => {
    if (!selectedId) return;

    // Se for nó
    const isNode = nodes.find(n => n.id === selectedId);
    if (isNode) {
      setNodes(nodes.filter(n => n.id !== selectedId));
      setConnections(connections.filter(c => c.source !== selectedId && c.target !== selectedId));
    } else {
      // Se for conexão (implementação futura de seleção de linha)
      setConnections(connections.filter(c => c.id !== selectedId));
    }
    setSelectedId(null);
  };

  const clearCanvas = () => {
    if (confirm('Tem certeza que deseja apagar tudo?')) {
      setNodes([]);
      setConnections([]);
      setSelectedId(null);
    }
  };

  // --- Renderização Visual ---

  // Função auxiliar para renderizar formas SVG
  const renderNodeShape = (node) => {
    const isSelected = selectedId === node.id;
    const strokeClass = isSelected ? "stroke-indigo-500 stroke-2" : "stroke-slate-800 stroke-2";
    const fillClass = isSelected ? "fill-indigo-50" : "fill-white";
    const filter = isSelected ? "url(#glow)" : "drop-shadow(0px 2px 3px rgba(0,0,0,0.1))";

    switch (node.type) {
      case NODE_TYPES.ENTITY:
        return (
          <g transform={`translate(${node.x - 60}, ${node.y - 30})`}>
            {/* Sombra/Borda extra para entidade fraca */}
            {node.isWeak && (
              <rect x="-4" y="-4" width="128" height="68" rx="6" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-800" />
            )}
            <rect
              width="120"
              height="60"
              rx="4"
              className={`${fillClass} ${strokeClass} transition-colors duration-200`}
              style={{ filter }}
            />
            <foreignObject x="0" y="0" width="120" height="60">
              <div className="w-full h-full flex items-center justify-center text-center p-1">
                <span className="text-sm font-semibold text-slate-800 break-words leading-tight select-none">{node.label}</span>
              </div>
            </foreignObject>
          </g>
        );
      case NODE_TYPES.RELATIONSHIP:
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            {/* Losango */}
            <path
              d="M 0 -40 L 50 0 L 0 40 L -50 0 Z"
              className={`${fillClass} ${strokeClass} transition-colors duration-200`}
              style={{ filter }}
            />
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
      default: return null;
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedId);
  // Encontra conexão se selecionada (lógica simplificada: clique na label da conexão para editar)
  const selectedConnection = connections.find(c => c.id === selectedId);

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100 overflow-hidden font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">

      {/* --- HEADER --- */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
            <Grid className="text-white" size={18} />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">
            BrModelo<span className="text-indigo-600">Plus</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearCanvas}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            title="Limpar Tudo"
          >
            <Trash2 size={20} />
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">
            <Upload size={16} /> Importar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-md shadow-indigo-200 transition-all active:scale-95">
            <Download size={16} /> Exportar JSON
          </button>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden">

        {/* --- SIDEBAR TOOLBAR --- */}
        <aside className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-10">
          <ToolbarButton
            icon={MousePointer2}
            label="Selecionar / Mover"
            active={tool === 'select'}
            onClick={() => setTool('select')}
          />
          <div className="w-8 h-px bg-slate-100 mx-auto my-1"></div>
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
          <div className="w-8 h-px bg-slate-100 mx-auto my-1"></div>
          <ToolbarButton
            icon={Minus}
            label="Conectar"
            active={tool === 'connection'}
            onClick={() => setTool('connection')}
          />
        </aside>

        {/* --- CANVAS --- */}
        <div
          className="flex-1 bg-slate-50 relative cursor-grab active:cursor-grabbing overflow-hidden"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          ref={canvasRef}
          style={{ cursor: tool === 'select' ? (isDraggingCanvas ? 'grabbing' : 'default') : 'crosshair' }}
        >
          {/* Grid Pattern CSS */}
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
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
              </marker>
            </defs>
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>

              {/* Conexões */}
              {connections.map(conn => {
                const source = nodes.find(n => n.id === conn.source);
                const target = nodes.find(n => n.id === conn.target);
                if (!source || !target) return null;

                // Cálculo simples do centro (poderia ser melhorado para bordas)
                // Entidades tem offset diferente porque o SVG delas começa no canto, mas os outros estão centralizados na lógica de renderNodeShape
                const getCenter = (n) => {
                  if (n.type === NODE_TYPES.ENTITY) return { x: n.x, y: n.y };
                  return { x: n.x, y: n.y };
                }

                const sC = getCenter(source);
                const tC = getCenter(target);
                const midX = (sC.x + tC.x) / 2;
                const midY = (sC.y + tC.y) / 2;

                return (
                  <g key={conn.id} onClick={(e) => { e.stopPropagation(); setSelectedId(conn.id); }} className="pointer-events-auto cursor-pointer group">
                    <line
                      x1={sC.x} y1={sC.y}
                      x2={tC.x} y2={tC.y}
                      stroke={selectedId === conn.id ? "#6366f1" : "#cbd5e1"}
                      strokeWidth="2"
                      className="transition-colors"
                    />
                    {/* Linha transparente grossa para facilitar o clique */}
                    <line
                      x1={sC.x} y1={sC.y}
                      x2={tC.x} y2={tC.y}
                      stroke="transparent"
                      strokeWidth="15"
                    />

                    {/* Cardinalidades */}
                    {(conn.cardinalitySource || conn.cardinalityTarget) && (
                      <>
                        {/* Posição aproximada 20% do source e 80% */}
                        <text x={sC.x + (tC.x - sC.x) * 0.25} y={sC.y + (tC.y - sC.y) * 0.25} className="text-[10px] fill-slate-500 font-bold bg-white" textAnchor="middle" dy="-5">
                          {conn.cardinalitySource}
                        </text>
                        <text x={sC.x + (tC.x - sC.x) * 0.75} y={sC.y + (tC.y - sC.y) * 0.75} className="text-[10px] fill-slate-500 font-bold" textAnchor="middle" dy="-5">
                          {conn.cardinalityTarget}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

              {/* Linha temporária ao criar conexão */}
              {tool === 'connection' && tempConnectionStart && (() => {
                const source = nodes.find(n => n.id === tempConnectionStart);
                if (!source) return null;
                return (
                  <line
                    x1={source.x} y1={source.y}
                    x2={dragStart.x || source.x} // Isso precisaria de um mouse tracking separado para ser fluido, simplificando aqui
                    y2={dragStart.y || source.y}
                    stroke="#cbd5e1"
                    strokeDasharray="5,5"
                  />
                )
              })()}

              {/* Nós */}
              {nodes.map(node => (
                <g
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  className="pointer-events-auto cursor-move"
                >
                  {renderNodeShape(node)}
                </g>
              ))}
            </g>
          </svg>

          {/* Zoom controls floating */}
          <div className="absolute bottom-6 left-6 bg-white rounded-xl shadow-lg border border-slate-100 p-1 flex items-center gap-1 z-10">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><Minus size={16} /></button>
            <span className="text-xs font-medium w-12 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><Plus size={16} /></button>
          </div>

        </div>

        {/* --- PROPERTIES PANEL --- */}
        <div className={`w-80 bg-white border-l border-slate-200 shadow-xl transition-all duration-300 transform z-20 overflow-y-auto ${selectedId ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'}`}>
          {selectedId && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Propriedades</h2>
                <button onClick={() => setSelectedId(null)} className="text-slate-400 hover:text-slate-600">
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
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium capitalize">{selectedNode.type === NODE_TYPES.ENTITY ? 'Entidade' : selectedNode.type === NODE_TYPES.RELATIONSHIP ? 'Relacionamento' : 'Atributo'}</p>
                      <p className="font-bold text-slate-800 text-lg truncate max-w-[150px]">{selectedNode.label}</p>
                    </div>
                  </div>

                  <PropertyInput
                    label="Nome"
                    value={selectedNode.label}
                    onChange={(val) => setNodes(nodes.map(n => n.id === selectedId ? { ...n, label: val } : n))}
                  />

                  {/* Propriedades Específicas de Entidade */}
                  {selectedNode.type === NODE_TYPES.ENTITY && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-sm font-medium text-slate-700">Entidade Fraca?</span>
                      <input
                        type="checkbox"
                        checked={selectedNode.isWeak || false}
                        onChange={(e) => setNodes(nodes.map(n => n.id === selectedId ? { ...n, isWeak: e.target.checked } : n))}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Propriedades Específicas de Relacionamento */}
                  {selectedNode.type === NODE_TYPES.RELATIONSHIP && (
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-sm font-medium text-slate-700">Identificador?</span>
                      <input
                        type="checkbox"
                        checked={selectedNode.isWeak || false}
                        onChange={(e) => setNodes(nodes.map(n => n.id === selectedId ? { ...n, isWeak: e.target.checked } : n))}
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Propriedades Específicas de Atributo */}
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
                      ]}
                    />
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

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={deleteSelected}
                  className="w-full py-3 flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors font-medium text-sm"
                >
                  <Trash2 size={18} /> Excluir Selecionado
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}