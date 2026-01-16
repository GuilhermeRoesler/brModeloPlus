import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MousePointer2, Square, Diamond, Circle, Minus, Trash2,
  Download, Upload, Grid, MoreVertical, X, Plus,
  Table as TableIcon, ZoomIn, ZoomOut, Share2, Users,
  Code, Copy, Check, LogOut, FolderPlus, FolderOpen, ArrowLeft, LayoutGrid
} from 'lucide-react';

// Importações do Firebase
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  query,
  where,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';

// ==========================================
// CONFIGURAÇÃO DO FIREBASE
// ==========================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app';

let auth, db;
if (firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// ==========================================
// CONSTANTES E UTILITÁRIOS
// ==========================================

const MODES = { CONCEPTUAL: 'conceitual', LOGICAL: 'logico', PHYSICAL: 'fisico' };
const NODE_TYPES = { ENTITY: 'entity', RELATIONSHIP: 'relationship', ATTRIBUTE: 'attribute', TABLE: 'table' };

const THEME = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  selection: 'stroke-indigo-500 stroke-2',
  selectionFill: 'fill-indigo-50',
};

const generateId = () => Math.random().toString(36).substr(2, 9);
const getRandomColor = () => {
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// ==========================================
// COMPONENTES DE UI BÁSICOS
// ==========================================

const PropertyInput = ({ label, value, onChange, type = "text", options = [], placeholder = "" }) => (
  <div className="mb-4">
    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
    {type === 'select' ? (
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700">
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
    ) : (
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700 placeholder-slate-400" />
    )}
  </div>
);

// ==========================================
// SQL GENERATOR
// ==========================================

const generateSQL = (nodes) => {
  const tables = nodes.filter(n => n.type === NODE_TYPES.TABLE);
  if (tables.length === 0) return "-- Nenhuma tabela encontrada para gerar SQL.";

  return tables.map(table => {
    let sql = `CREATE TABLE ${table.label.replace(/\s+/g, '_').toLowerCase()} (\n`;
    const pks = [];
    const colDefs = (table.columns || []).map(col => {
      if (col.isPk) pks.push(col.name);
      return `  ${col.name} ${col.type}${col.isFk ? ' -- FK' : ''}`;
    });

    if (pks.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pks.join(', ')})`);
    }

    sql += colDefs.join(',\n');
    sql += `\n);`;
    return sql;
  }).join('\n\n');
};

const SQLPanel = ({ nodes, onClose }) => {
  const [copied, setCopied] = useState(false);
  const sqlCode = useMemo(() => generateSQL(nodes), [nodes]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-700 shadow-2xl transition-all duration-300 z-30 flex flex-col h-full absolute right-0 top-0 text-slate-300">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-2">
          <Code size={18} className="text-indigo-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">SQL Gerado</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
        <pre>{sqlCode}</pre>
      </div>
      <div className="p-4 border-t border-slate-700 bg-slate-950">
        <button
          onClick={handleCopy}
          className={`w-full py-3 flex items-center justify-center gap-2 rounded-xl transition-all font-bold text-sm ${copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
        >
          {copied ? <><Check size={18} /> Copiado!</> : <><Copy size={18} /> Copiar SQL</>}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE: TOOLBAR (RESTAURADO)
// ==========================================

const Toolbar = ({ tool, setTool, currentMode }) => {
  const ToolbarButton = ({ icon: Icon, label, active, onClick, color }) => (
    <button onClick={onClick} className={`group relative flex items-center justify-center p-3 rounded-2xl transition-all duration-200 ${active ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-200' : 'hover:bg-slate-100 text-slate-600'}`}>
      <Icon size={22} className={color} />
      <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">{label}</span>
    </button>
  );

  return (
    <aside className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-10 select-none">
      <ToolbarButton icon={MousePointer2} label="Selecionar" active={tool === 'select'} onClick={() => setTool('select')} />
      <div className="w-8 h-px bg-slate-100 mx-auto my-1"></div>

      {currentMode === MODES.CONCEPTUAL && (
        <>
          <ToolbarButton icon={Square} label="Entidade" active={tool === 'entity'} onClick={() => setTool('entity')} color="text-emerald-600" />
          <ToolbarButton icon={Diamond} label="Relacionamento" active={tool === 'relationship'} onClick={() => setTool('relationship')} color="text-rose-500" />
          <ToolbarButton icon={Circle} label="Atributo" active={tool === 'attribute'} onClick={() => setTool('attribute')} color="text-amber-500" />
        </>
      )}

      {(currentMode === MODES.LOGICAL || currentMode === MODES.PHYSICAL) && (
        <ToolbarButton icon={TableIcon} label="Tabela" active={tool === 'table'} onClick={() => setTool('table')} color="text-blue-600" />
      )}

      <div className="w-8 h-px bg-slate-100 mx-auto my-1"></div>
      <ToolbarButton icon={Minus} label="Conectar" active={tool === 'connection'} onClick={() => setTool('connection')} />
    </aside>
  );
};

// ==========================================
// COMPONENTE: PROPERTIES PANEL (RESTAURADO)
// ==========================================

const PropertiesPanel = ({ selectedIds, nodes, connections, updateNode, updateConnection, deleteSelected }) => {
  if (selectedIds.length !== 1) {
    if (selectedIds.length > 1) {
      return (
        <div className="w-80 bg-white border-l border-slate-200 shadow-xl z-20 p-6 flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-4">
            <Users size={24} />
          </div>
          <h3 className="text-slate-800 font-bold mb-1">{selectedIds.length} Itens Selecionados</h3>
          <p className="text-slate-500 text-xs mb-6">Propriedades em massa indisponíveis.</p>
          <button onClick={() => deleteSelected()} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors flex items-center gap-2">
            <Trash2 size={16} /> Excluir Todos
          </button>
        </div>
      );
    }
    return <div className="w-0 transition-all duration-300" />;
  }

  const selectedId = selectedIds[0];
  const selectedNode = nodes.find(n => n.id === selectedId);
  const selectedConnection = connections.find(c => c.id === selectedId);

  const handleUpdate = (field, value) => {
    if (selectedNode) updateNode(selectedId, { [field]: value });
  };

  const handleUpdateTableCol = (newCols) => {
    if (selectedNode) updateNode(selectedId, { columns: newCols });
  };

  return (
    <div className="w-80 bg-white border-l border-slate-200 shadow-xl transition-all duration-300 z-20 overflow-y-auto flex flex-col h-full">
      <div className="p-6 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Propriedades</h2>
          <button onClick={() => deleteSelected(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
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
                <p className="font-bold text-slate-800 text-lg truncate max-w-[150px]">{selectedNode.label}</p>
              </div>
            </div>

            <PropertyInput label="Nome / Rótulo" value={selectedNode.label} onChange={(val) => handleUpdate('label', val)} />

            {selectedNode.type === NODE_TYPES.ENTITY && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-medium text-slate-700">Entidade Fraca?</span>
                <input type="checkbox" checked={selectedNode.isWeak || false} onChange={(e) => handleUpdate('isWeak', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
              </div>
            )}

            {selectedNode.type === NODE_TYPES.ATTRIBUTE && (
              <PropertyInput label="Tipo" type="select" value={selectedNode.attrType} onChange={(val) => handleUpdate('attrType', val)}
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
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Colunas</label>
                  <button onClick={() => handleUpdateTableCol([...(selectedNode.columns || []), { id: generateId(), name: 'nova', type: 'INT', isPk: false }])} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"><Plus size={16} /></button>
                </div>
                <div className="space-y-2">
                  {selectedNode.columns?.map(col => (
                    <div key={col.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input value={col.name} onChange={(e) => handleUpdateTableCol(selectedNode.columns.map(c => c.id === col.id ? { ...c, name: e.target.value } : c))} className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs" />
                        <button onClick={() => handleUpdateTableCol(selectedNode.columns.filter(c => c.id !== col.id))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input value={col.type} onChange={(e) => handleUpdateTableCol(selectedNode.columns.map(c => c.id === col.id ? { ...c, type: e.target.value } : c))} className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-500" />
                        <label className="flex items-center gap-1"><input type="checkbox" checked={col.isPk} onChange={(e) => handleUpdateTableCol(selectedNode.columns.map(c => c.id === col.id ? { ...c, isPk: e.target.checked } : c))} /><span className="text-[10px] font-bold text-slate-500">PK</span></label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={col.isFk} onChange={(e) => handleUpdateTableCol(selectedNode.columns.map(c => c.id === col.id ? { ...c, isFk: e.target.checked } : c))} /><span className="text-[10px] font-bold text-slate-500">FK</span></label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedConnection && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Minus size={24} className="rotate-45" /></div>
              <div><p className="text-xs text-slate-500 font-medium">Conexão</p><p className="font-bold text-slate-800 text-lg">Ligação</p></div>
            </div>
            <PropertyInput label="Cardinalidade Origem" type="select" value={selectedConnection.cardinalitySource} onChange={(val) => updateConnection(selectedId, { cardinalitySource: val })} options={[{ value: '', label: 'Nenhuma' }, { value: '1', label: '1' }, { value: 'n', label: 'N' }, { value: '(0,1)', label: '(0,1)' }, { value: '(1,1)', label: '(1,1)' }, { value: '(0,n)', label: '(0,n)' }, { value: '(1,n)', label: '(1,n)' }]} />
            <PropertyInput label="Cardinalidade Destino" type="select" value={selectedConnection.cardinalityTarget} onChange={(val) => updateConnection(selectedId, { cardinalityTarget: val })} options={[{ value: '', label: 'Nenhuma' }, { value: '1', label: '1' }, { value: 'n', label: 'N' }, { value: '(0,1)', label: '(0,1)' }, { value: '(1,1)', label: '(1,1)' }, { value: '(0,n)', label: '(0,n)' }, { value: '(1,n)', label: '(1,n)' }]} />
          </div>
        )}
      </div>

      <div className="p-6 border-t border-slate-100 bg-slate-50">
        <button onClick={() => deleteSelected()} className="w-full py-3 flex items-center justify-center gap-2 text-red-600 bg-white border border-red-100 hover:bg-red-50 rounded-xl transition-colors font-medium text-sm shadow-sm">
          <Trash2 size={18} /> Excluir Selecionado
        </button>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE: CANVAS (RESTAURADO)
// ==========================================

const CanvasBoard = ({
  nodes, connections, tool, selectedIds, pan, zoom,
  handleCanvasMouseDown, handleMouseMove, handleMouseUp, handleNodeMouseDown,
  tempConnectionStart, dragStart, cursors, currentUserId, selectionBox
}) => {

  const renderNode = (node) => {
    const isSelected = selectedIds.includes(node.id);
    const strokeClass = isSelected ? THEME.selection : "stroke-slate-800 stroke-2";
    const fillClass = isSelected ? THEME.selectionFill : "fill-white";
    const filter = isSelected ? "url(#glow)" : "drop-shadow(0px 2px 3px rgba(0,0,0,0.1))";

    switch (node.type) {
      case NODE_TYPES.ENTITY:
        return (
          <g transform={`translate(${node.x - 60}, ${node.y - 30})`}>
            {node.isWeak && <rect x="-4" y="-4" width="128" height="68" rx="6" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-800" />}
            <rect width="120" height="60" rx="4" className={`${fillClass} ${strokeClass} transition-colors`} style={{ filter }} />
            <foreignObject x="0" y="0" width="120" height="60"><div className="w-full h-full flex items-center justify-center text-center p-1"><span className="text-sm font-semibold text-slate-800 leading-tight select-none">{node.label}</span></div></foreignObject>
          </g>
        );
      case NODE_TYPES.RELATIONSHIP:
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <path d="M 0 -40 L 50 0 L 0 40 L -50 0 Z" className={`${fillClass} ${strokeClass} transition-colors`} style={{ filter }} />
            {node.isWeak && <path d="M 0 -34 L 42 0 L 0 34 L -42 0 Z" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-800" />}
            <foreignObject x="-40" y="-20" width="80" height="40"><div className="w-full h-full flex items-center justify-center text-center"><span className="text-xs font-bold text-slate-800 select-none">{node.label}</span></div></foreignObject>
          </g>
        );
      case NODE_TYPES.ATTRIBUTE:
        return (
          <g transform={`translate(${node.x}, ${node.y})`}>
            <ellipse cx="0" cy="0" rx="50" ry="25" className={`${fillClass} ${strokeClass}`} style={{ filter }} strokeDasharray={node.attrType === 'derived' ? "4" : "0"} />
            {node.attrType === 'multivalued' && <ellipse cx="0" cy="0" rx="45" ry="20" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-800" />}
            <foreignObject x="-45" y="-20" width="90" height="40"><div className="w-full h-full flex items-center justify-center text-center p-1"><span className={`text-xs text-slate-800 select-none ${node.attrType === 'key' ? 'underline font-bold' : ''}`}>{node.attrType === 'key' && <span className="w-2 h-2 bg-black rounded-full inline-block mr-1"></span>}{node.label}</span></div></foreignObject>
          </g>
        );
      case NODE_TYPES.TABLE:
        const rowH = 24, headH = 32, w = 160, h = headH + (node.columns?.length || 0) * rowH + 10;
        return (
          <g transform={`translate(${node.x - w / 2}, ${node.y - headH / 2})`}>
            <rect width={w} height={h} rx="4" className={`${fillClass} ${strokeClass}`} style={{ filter }} />
            <rect width={w} height={headH} rx="4" className="fill-slate-100 stroke-none" />
            <line x1="0" y1={headH} x2={w} y2={headH} stroke="currentColor" className="text-slate-300" />
            <foreignObject x="0" y="0" width={w} height={headH}><div className="w-full h-full flex items-center justify-center px-2"><span className="font-bold text-sm text-slate-800 truncate">{node.label}</span></div></foreignObject>
            <foreignObject x="0" y={headH} width={w} height={h - headH}>
              <div className="flex flex-col pt-1 px-2">
                {node.columns?.map(col => (
                  <div key={col.id} className="flex items-center justify-between h-[24px] text-[10px] text-slate-700 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-1 overflow-hidden">{col.isPk && <span className="text-[9px] font-bold text-amber-600">PK</span>}{col.isFk && <span className="text-[9px] font-bold text-blue-600">FK</span>}<span className={`truncate ${col.isPk ? 'font-bold' : ''}`}>{col.name}</span></div>
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
      className="flex-1 bg-slate-50 relative cursor-default overflow-hidden h-full w-full"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
      style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
    >
      <div id="grid-bg" className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }} />

      <svg className="w-full h-full pointer-events-none">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {connections.map(conn => {
            const s = nodes.find(n => n.id === conn.source);
            const t = nodes.find(n => n.id === conn.target);
            if (!s || !t) return null;
            const isSelected = selectedIds.includes(conn.id);
            return (
              <g key={conn.id} className="pointer-events-auto cursor-pointer group">
                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={isSelected ? "#6366f1" : "#cbd5e1"} strokeWidth="2" className="transition-colors" />
                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="transparent" strokeWidth="15" onClick={(e) => { e.stopPropagation(); handleNodeMouseDown(e, conn.id, true); }} />
                {(conn.cardinalitySource || conn.cardinalityTarget) && (
                  <>
                    <text x={s.x + (t.x - s.x) * 0.25} y={s.y + (t.y - s.y) * 0.25} className="text-[10px] fill-slate-500 font-bold" textAnchor="middle" dy="-5" stroke="white" strokeWidth="3" paintOrder="stroke">{conn.cardinalitySource}</text>
                    <text x={s.x + (t.x - s.x) * 0.25} y={s.y + (t.y - s.y) * 0.25} className="text-[10px] fill-slate-500 font-bold" textAnchor="middle" dy="-5">{conn.cardinalitySource}</text>
                    <text x={s.x + (t.x - s.x) * 0.75} y={s.y + (t.y - s.y) * 0.75} className="text-[10px] fill-slate-500 font-bold" textAnchor="middle" dy="-5" stroke="white" strokeWidth="3" paintOrder="stroke">{conn.cardinalityTarget}</text>
                    <text x={s.x + (t.x - s.x) * 0.75} y={s.y + (t.y - s.y) * 0.75} className="text-[10px] fill-slate-500 font-bold" textAnchor="middle" dy="-5">{conn.cardinalityTarget}</text>
                  </>
                )}
              </g>
            );
          })}

          {tool === 'connection' && tempConnectionStart && dragStart && (() => {
            const s = nodes.find(n => n.id === tempConnectionStart);
            if (!s) return null;
            return <line x1={s.x} y1={s.y} x2={dragStart.x} y2={dragStart.y} stroke="#cbd5e1" strokeDasharray="5,5" strokeWidth="2" />
          })()}

          {nodes.map(node => (
            <g key={node.id} onMouseDown={(e) => handleNodeMouseDown(e, node.id)} className="pointer-events-auto cursor-move">
              {renderNode(node)}
            </g>
          ))}

          {/* CURSORES DE OUTROS USUÁRIOS */}
          {cursors.map(cursor => (
            cursor.userId !== currentUserId && (
              <g key={cursor.userId} transform={`translate(${cursor.x}, ${cursor.y})`}>
                <MousePointer2 className="w-4 h-4" fill={cursor.color} color="white" />
                <text x="12" y="10" className="text-[10px] font-bold fill-white px-1" stroke={cursor.color} strokeWidth="2" paintOrder="stroke">{cursor.userId.substr(0, 4)}</text>
              </g>
            )
          ))}
        </g>

        {/* CAIXA DE SELEÇÃO */}
        {selectionBox && (
          <rect
            x={(selectionBox.startX - pan.x) / zoom}
            y={(selectionBox.startY - pan.y) / zoom}
            width={(selectionBox.currentX - selectionBox.startX) / zoom}
            height={(selectionBox.currentY - selectionBox.startY) / zoom}
            fill="rgba(99, 102, 241, 0.1)"
            stroke="#6366f1"
            strokeDasharray="4"
            className="pointer-events-none"
          />
        )}
      </svg>
    </div>
  );
};

// ==========================================
// TELA: LOGIN
// ==========================================

const LoginScreen = ({ onLogin, loading }) => (
  <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 text-center">
      <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto mb-6">
        <Grid className="text-white" size={32} />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">BrModelo<span className="text-indigo-600">Plus</span></h1>
      <p className="text-slate-500 mb-8">Modelagem de dados moderna e colaborativa.</p>

      <button
        onClick={onLogin}
        disabled={loading}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        ) : (
          <>Entrar como Convidado <ArrowLeft className="rotate-180" size={16} /></>
        )}
      </button>
      <p className="text-xs text-slate-400 mt-6">Seus projetos serão salvos localmente neste navegador.</p>
    </div>
  </div>
);

// ==========================================
// TELA: DASHBOARD
// ==========================================

const DashboardScreen = ({ user, onOpenProject, onLogout }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Fetch Projects
  useEffect(() => {
    if (!user || !db) return;
    const fetchProjects = async () => {
      const q = collection(db, 'artifacts', appId, 'users', user.uid, 'projects');
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenação em memória (Firebase requires index for orderBy sometimes)
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setProjects(list);
      setLoading(false);
    };
    fetchProjects();
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const roomId = generateId();
    const projectData = {
      name: newProjectName,
      roomId: roomId,
      createdAt: serverTimestamp(),
      ownerId: user.uid
    };

    // Salva metadados do projeto na lista do usuário
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'projects', roomId), projectData);

    // Abre o projeto
    onOpenProject(roomId);
  };

  const handleDelete = async (e, projectId) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'projects', projectId));
      setProjects(projects.filter(p => p.id !== projectId));
    }
  }

  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col overflow-hidden">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Grid className="text-white" size={18} />
          </div>
          <h1 className="font-bold text-slate-800">Meus Projetos</h1>
        </div>
        <button onClick={onLogout} className="text-slate-500 hover:text-red-600 flex items-center gap-2 text-sm font-medium">
          <LogOut size={16} /> Sair
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Projetos Recentes</h2>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-all"
            >
              <FolderPlus size={18} /> Novo Projeto
            </button>
          </div>

          {isCreating && (
            <div className="mb-8 p-6 bg-white rounded-2xl border border-indigo-100 shadow-lg animate-in fade-in slide-in-from-top-4">
              <form onSubmit={handleCreate} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome do Projeto</label>
                  <input
                    autoFocus
                    type="text"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="Ex: E-commerce Database"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-3 text-slate-500 font-medium hover:bg-slate-100 rounded-xl">Cancelar</button>
                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Criar</button>
              </form>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20"><span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></span></div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <FolderOpen size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Nenhum projeto encontrado</h3>
              <p className="text-slate-500">Crie seu primeiro diagrama para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => onOpenProject(project.roomId)}
                  className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-50 transition-all cursor-pointer relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LayoutGrid size={20} />
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, project.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{project.name}</h3>
                  <p className="text-xs text-slate-400">
                    Editado em {project.createdAt?.seconds ? new Date(project.createdAt.seconds * 1000).toLocaleDateString() : 'Hoje'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// ==========================================
// TELA: EDITOR (Refatorado)
// ==========================================

const EditorScreen = ({ user, roomId, onBack }) => {
  // --- Estados do Modelo ---
  const [mode, setMode] = useState(MODES.CONCEPTUAL);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);

  // --- Estados de Interface ---
  const [selectedIds, setSelectedIds] = useState([]);
  const [tool, setTool] = useState('select');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [showSql, setShowSql] = useState(false);

  const [cursors, setCursors] = useState([]);

  // --- Refs & Temporários ---
  const tempConnectionStart = useRef(null);
  const isDraggingCanvas = useRef(false);
  const isDraggingNode = useRef(false);
  const isSelecting = useRef(false);
  const selectionBoxStart = useRef(null);
  const [selectionBox, setSelectionBox] = useState(null);

  const dragStart = useRef({ x: 0, y: 0 });
  const canvasDragStart = useRef({ x: 0, y: 0 });
  const initialNodePositions = useRef({});
  const lastCursorUpdate = useRef(0);

  // --- Header com Botão Voltar ---
  const EditorHeader = (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20 shadow-sm shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 mr-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors" title="Voltar ao Dashboard">
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
            <Grid className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800 leading-none">
              BrModelo<span className="text-indigo-600">Plus</span>
            </h1>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Editor</span>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2"></div>

        <div className="flex bg-slate-100 p-1 rounded-lg">
          {Object.values(MODES).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); saveToFirebase(undefined, undefined, m); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${mode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mode === MODES.PHYSICAL && (
          <button
            onClick={() => setShowSql(!showSql)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all mr-2 ${showSql ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <Code size={14} /> SQL
          </button>
        )}

        <div className="flex items-center gap-2 mr-4 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100" title="Usuários nesta sala">
          <Users size={14} />
          <span>{onlineUsers}</span>
        </div>

        <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copiado!'); }} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-slate-200">
          <Share2 size={16} /> Compartilhar
        </button>
      </div>
    </header>
  );

  // 3. SINCRONIZAÇÃO
  useEffect(() => {
    if (!user || !db || !roomId) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    const unsubDoc = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (!isDraggingNode.current) {
          if (JSON.stringify(data.nodes) !== JSON.stringify(nodes)) setNodes(data.nodes || []);
          if (JSON.stringify(data.connections) !== JSON.stringify(connections)) setConnections(data.connections || []);
          if (data.mode && data.mode !== mode) setMode(data.mode);
        }
      } else {
        setDoc(docRef, { nodes: [], connections: [], mode: MODES.CONCEPTUAL, createdAt: serverTimestamp() });
      }
    });

    const cursorQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'cursors'), where('roomId', '==', roomId));
    const unsubCursors = onSnapshot(cursorQuery, (snapshot) => {
      const activeCursors = [];
      snapshot.forEach(doc => activeCursors.push(doc.data()));
      setCursors(activeCursors);
      setOnlineUsers(activeCursors.length);
    });

    return () => { unsubDoc(); unsubCursors(); };
  }, [user, roomId]);

  // --- Handlers de Zoom e Wheel ---
  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) return; // Deixa o browser dar zoom se quiser
      const delta = -e.deltaY * 0.001;
      setZoom(z => Math.min(3, Math.max(0.1, z + delta)));
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  const saveToFirebase = async (newNodes, newConns, newMode) => {
    if (!db || !roomId) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
    await updateDoc(docRef, {
      nodes: newNodes !== undefined ? newNodes : nodes,
      connections: newConns !== undefined ? newConns : connections,
      mode: newMode !== undefined ? newMode : mode,
      lastUpdated: serverTimestamp()
    });
  };

  const updateCursor = (x, y) => {
    if (!user || !db || !roomId) return;
    const now = Date.now();
    if (now - lastCursorUpdate.current > 100) {
      const cursorRef = doc(db, 'artifacts', appId, 'public', 'data', 'cursors', `${roomId}_${user.uid}`);
      setDoc(cursorRef, { userId: user.uid, roomId, x, y, color: getRandomColor(), updatedAt: serverTimestamp() });
      lastCursorUpdate.current = now;
    }
  };

  // --- Helpers ---
  const getMousePos = (e) => {
    const headerHeight = 64;
    const x = (e.clientX - pan.x) / zoom;
    const y = (e.clientY - headerHeight - pan.y) / zoom;
    return { x, y, rawX: e.clientX, rawY: e.clientY - headerHeight };
  };

  const handleCanvasMouseDown = (e) => {
    const pos = getMousePos(e);

    // Botão Direito (2) -> Pan
    if (e.button === 2) {
      isDraggingCanvas.current = true;
      canvasDragStart.current = { x: e.clientX, y: e.clientY };
      dragStart.current = { ...pan };
      return;
    }

    // Botão Esquerdo (0)
    if (e.button === 0) {
      // Clique no fundo (grid ou svg)
      if (e.target.id === 'grid-bg' || e.target.tagName === 'svg' || e.target.tagName === 'DIV') {
        if (tool === 'select') {
          // Iniciar Seleção em Caixa
          isSelecting.current = true;
          selectionBoxStart.current = { x: e.clientX, y: e.clientY };
          setSelectionBox({ startX: pos.rawX, startY: pos.rawY, currentX: pos.rawX, currentY: pos.rawY }); // Usar raw para desenhar ret

          if (!e.shiftKey) setSelectedIds([]); // Limpa se não segurar shift
        } else {
          addNode(pos);
        }
      }
    }
  };

  const addNode = (pos) => {
    let newNode = { x: pos.x, y: pos.y, id: generateId(), label: 'Novo Item' };
    if (tool === 'entity') newNode = { ...newNode, type: NODE_TYPES.ENTITY, label: 'Entidade', isWeak: false };
    else if (tool === 'relationship') newNode = { ...newNode, type: NODE_TYPES.RELATIONSHIP, label: 'Rel', width: 80, height: 80 };
    else if (tool === 'attribute') newNode = { ...newNode, type: NODE_TYPES.ATTRIBUTE, label: 'Atributo', attrType: 'normal' };
    else if (tool === 'table') newNode = { ...newNode, type: NODE_TYPES.TABLE, label: 'Tabela', columns: [{ id: generateId(), name: 'id', type: 'INT', isPk: true }] };
    else return;

    const updatedNodes = [...nodes, newNode];
    setNodes(updatedNodes);
    setTool('select');
    setSelectedIds([newNode.id]);
    saveToFirebase(updatedNodes, undefined, undefined);
  };

  const handleNodeMouseDown = (e, id, isConnection = false) => {
    e.stopPropagation(); // Impede evento do canvas

    if (tool === 'connection') {
      if (!tempConnectionStart.current) {
        tempConnectionStart.current = id;
      } else {
        if (tempConnectionStart.current !== id) {
          const newConn = { id: generateId(), source: tempConnectionStart.current, target: id, cardinalitySource: '', cardinalityTarget: '' };
          const updatedConns = [...connections, newConn];
          setConnections(updatedConns);
          saveToFirebase(undefined, updatedConns, undefined);
        }
        tempConnectionStart.current = null;
        setTool('select');
      }
    } else {
      // Lógica de Seleção Múltipla
      let newSelection = [...selectedIds];
      if (e.shiftKey) {
        if (newSelection.includes(id)) newSelection = newSelection.filter(item => item !== id);
        else newSelection.push(id);
      } else {
        if (!newSelection.includes(id)) newSelection = [id];
      }
      setSelectedIds(newSelection);

      if (!isConnection) {
        isDraggingNode.current = true;
        const positions = {};
        nodes.forEach(n => { if (newSelection.includes(n.id)) positions[n.id] = { x: n.x, y: n.y }; });
        initialNodePositions.current = positions;
        dragStart.current = getMousePos(e);
      }
    }
  };

  const handleMouseMove = (e) => {
    const pos = getMousePos(e);
    updateCursor(pos.x, pos.y);

    if (isDraggingCanvas.current) {
      const dx = e.clientX - canvasDragStart.current.x;
      const dy = e.clientY - canvasDragStart.current.y;
      setPan({ x: dragStart.current.x + dx, y: dragStart.current.y + dy });
      return;
    }

    if (isSelecting.current) {
      const startRawX = selectionBoxStart.current.x;
      const startRawY = selectionBoxStart.current.y;
      const headerH = 64;
      setSelectionBox({
        startX: Math.min(startRawX, e.clientX),
        startY: Math.min(startRawY, e.clientY) - headerH,
        currentX: Math.max(startRawX, e.clientX),
        currentY: Math.max(startRawY, e.clientY) - headerH
      });
      return;
    }

    if (isDraggingNode.current && selectedIds.length > 0) {
      const dx = pos.x - dragStart.current.x;
      const dy = pos.y - dragStart.current.y;

      const updatedNodes = nodes.map(n => {
        if (selectedIds.includes(n.id) && initialNodePositions.current[n.id]) {
          return {
            ...n,
            x: initialNodePositions.current[n.id].x + dx,
            y: initialNodePositions.current[n.id].y + dy
          };
        }
        return n;
      });
      setNodes(updatedNodes);
    }
  };

  const handleMouseUp = (e) => {
    if (isDraggingNode.current) {
      saveToFirebase(nodes, undefined, undefined);
    }

    isDraggingCanvas.current = false;
    isDraggingNode.current = false;

    if (isSelecting.current) {
      isSelecting.current = false;
      const box = selectionBox;
      if (box) {
        const worldX1 = (box.startX - pan.x) / zoom;
        const worldY1 = (box.startY - pan.y) / zoom;
        const worldX2 = (box.currentX - pan.x) / zoom;
        const worldY2 = (box.currentY - pan.y) / zoom;

        const inside = nodes.filter(n => {
          return n.x >= worldX1 && n.x <= worldX2 && n.y >= worldY1 && n.y <= worldY2;
        }).map(n => n.id);

        setSelectedIds(prev => e.shiftKey ? [...new Set([...prev, ...inside])] : inside);
      }
      setSelectionBox(null);
    }
  };

  const updateNode = (id, changes) => {
    const updated = nodes.map(n => n.id === id ? { ...n, ...changes } : n);
    setNodes(updated);
    saveToFirebase(updated, undefined, undefined);
  };

  const updateConnection = (id, changes) => {
    const updated = connections.map(c => c.id === id ? { ...c, ...changes } : c);
    setConnections(updated);
    saveToFirebase(undefined, updated, undefined);
  };

  const deleteSelected = (idOverride) => {
    const idsToDelete = idOverride ? [idOverride] : selectedIds;
    if (idsToDelete.length === 0) return;

    const newNodes = nodes.filter(n => !idsToDelete.includes(n.id));
    const newConns = connections.filter(c => !idsToDelete.includes(c.id) && !idsToDelete.includes(c.source) && !idsToDelete.includes(c.target));

    setNodes(newNodes);
    setConnections(newConns);
    setSelectedIds([]);
    saveToFirebase(newNodes, newConns, undefined);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-100 overflow-hidden font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {EditorHeader}

      <div className="flex-1 flex relative overflow-hidden">
        <Toolbar tool={tool} setTool={setTool} currentMode={mode} />

        <CanvasBoard
          nodes={nodes}
          connections={connections}
          tool={tool}
          selectedIds={selectedIds}
          pan={pan}
          zoom={zoom}
          handleCanvasMouseDown={handleCanvasMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
          handleNodeMouseDown={handleNodeMouseDown}
          tempConnectionStart={tempConnectionStart.current}
          dragStart={dragStart.current}
          cursors={cursors}
          currentUserId={user?.uid}
          selectionBox={selectionBox}
        />

        {showSql && mode === MODES.PHYSICAL && <SQLPanel nodes={nodes} onClose={() => setShowSql(false)} />}

        <div className="absolute bottom-6 left-6 flex gap-2 z-10">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-1 flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"><ZoomOut size={18} /></button>
            <span className="text-xs font-bold w-12 text-center text-slate-600 tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"><ZoomIn size={18} /></button>
          </div>
          <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className="bg-white rounded-xl shadow-lg border border-slate-100 p-2 hover:bg-slate-50 text-slate-600 transition-colors text-xs font-medium">Resetar</button>
        </div>

        <PropertiesPanel
          selectedIds={selectedIds}
          nodes={nodes}
          connections={connections}
          updateNode={updateNode}
          updateConnection={updateConnection}
          deleteSelected={deleteSelected}
        />
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL (ROTEADOR)
// ==========================================

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);

      // Checa se há uma sala na URL
      const params = new URLSearchParams(window.location.search);
      const rid = params.get('room');
      if (rid) setRoomId(rid);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setAuthLoading(true);
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
      await signInWithCustomToken(auth, __initial_auth_token);
    } else {
      await signInAnonymously(auth);
    }
  };

  const handleOpenProject = (id) => {
    setRoomId(id);
    const newUrl = `${window.location.pathname}?room=${id}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleBackToDashboard = () => {
    setRoomId(null);
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setRoomId(null);
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} loading={authLoading} />;
  }

  if (roomId) {
    return <EditorScreen user={user} roomId={roomId} onBack={handleBackToDashboard} />;
  }

  return <DashboardScreen user={user} onOpenProject={handleOpenProject} onLogout={handleLogout} />;
}