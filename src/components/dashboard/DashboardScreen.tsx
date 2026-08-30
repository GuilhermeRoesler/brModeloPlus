import { useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';
import {
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  Trash2,
  Upload,
} from 'lucide-react';
import { readFileAsText } from '../../lib/fileTransfer';
import { parseProjectFileJson, ProjectFileError } from '../../lib/projectFile';
import { useProjects } from '../../hooks/useProjects';
import type { AppUser } from '../../types';

type DashboardScreenProps = {
  user: AppUser;
  onOpenProject: (roomId: string) => void;
};

export const DashboardScreen = ({ user, onOpenProject }: DashboardScreenProps) => {
  const { projects, loading, create, remove } = useProjects(user);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const roomId = await create(newProjectName.trim());
    if (roomId) onOpenProject(roomId);
  };

  const handleDelete = async (e: MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      await remove(projectId);
    }
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const text = await readFileAsText(file);
      const parsed = parseProjectFileJson(text);
      const fallbackName = file.name.replace(/\.brmodelo\.json$/i, '').replace(/\.json$/i, '');
      const name = parsed.name?.trim() || fallbackName || 'Projeto importado';
      const roomId = await create(name, parsed.room);
      if (roomId) onOpenProject(roomId);
    } catch (err) {
      const message =
        err instanceof ProjectFileError
          ? err.message
          : 'Não foi possível importar o arquivo.';
      window.alert(message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col overflow-hidden">
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt="BrModeloPlus"
            className="w-8 h-8 rounded-lg shadow-sm"
          />
          <h1 className="font-bold text-slate-800">Meus Projetos</h1>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded uppercase tracking-wide">
            Local
          </span>
        </div>
        <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">
          Modo local
        </span>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8 gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-slate-800">Projetos Recentes</h2>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json,.brmodelo.json"
                className="hidden"
                onChange={(e) => {
                  void handleImportFile(e);
                }}
              />
              <button
                type="button"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
              >
                <Upload size={18} />
                {importing ? 'Importando…' : 'Importar JSON'}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-all"
              >
                <FolderPlus size={18} /> Novo Projeto
              </button>
            </div>
          </div>

          {isCreating && (
            <div className="mb-8 p-6 bg-white rounded-2xl border border-indigo-100 shadow-lg">
              <form onSubmit={(e) => void handleCreate(e)} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Nome do Projeto
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ex: E-commerce Database"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-3 text-slate-500 font-medium hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700"
                >
                  Criar
                </button>
              </form>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <FolderOpen size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Nenhum projeto encontrado</h3>
              <p className="text-slate-500">
                Crie um diagrama ou importe um arquivo JSON.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
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
                      type="button"
                      onClick={(e) => void handleDelete(e, project.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{project.name}</h3>
                  <p className="text-xs text-slate-400">
                    Editado em{' '}
                    {(project.createdAt as { seconds?: number } | undefined)?.seconds
                      ? new Date(
                          ((project.createdAt as { seconds: number }).seconds) * 1000,
                        ).toLocaleDateString()
                      : 'Hoje'}
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
