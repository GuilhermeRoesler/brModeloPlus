import { useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';
import { FolderPlus, Trash2, Upload } from 'lucide-react';
import { SmoothScroll } from '@/components/effects/SmoothScroll';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { readFileAsText } from '@/lib/fileTransfer';
import { parseProjectFileJson, ProjectFileError } from '@/lib/projectFile';
import { useProjects } from '@/hooks/useProjects';
import type { AppUser, Project } from '@/types';

type DashboardScreenProps = {
  user: AppUser;
  onOpenProject: (roomId: string) => void;
};

const formatProjectDate = (createdAt: Project['createdAt']): string => {
  if (
    createdAt &&
    typeof createdAt === 'object' &&
    'seconds' in createdAt &&
    typeof (createdAt as { seconds: unknown }).seconds === 'number'
  ) {
    return new Date((createdAt as { seconds: number }).seconds * 1000).toLocaleDateString(
      'pt-BR',
      { day: 'numeric', month: 'short', year: 'numeric' },
    );
  }
  return 'Hoje';
};

/** Miniatura decorativa de diagrama ER — só visual, sem dados reais. */
const ProjectThumb = ({ variant }: { variant: number }) => {
  const shift = (variant % 3) * 6;
  return (
    <svg viewBox="0 0 200 112" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id={`thumb-bg-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eef2ff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>
      <rect width="200" height="112" fill={`url(#thumb-bg-${variant})`} />
      <g
        fill="none"
        stroke="#4f46e5"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
        transform={`translate(${shift}, 0)`}
      >
        <rect x="28" y="34" width="48" height="28" rx="4" fill="#fff" fillOpacity="0.7" />
        <path d="M108 28 L132 48 L108 68 L84 48 Z" fill="#fff" fillOpacity="0.55" />
        <line x1="76" y1="48" x2="84" y2="48" />
        <line x1="52" y1="62" x2="52" y2="78" />
        <circle cx="52" cy="86" r="7" fill="#4f46e5" stroke="none" />
        <rect x="148" y="40" width="36" height="22" rx="3" fill="#fff" fillOpacity="0.45" />
        <line x1="132" y1="48" x2="148" y2="50" />
      </g>
    </svg>
  );
};

const HeroDiagram = () => (
  <svg
    viewBox="0 0 280 200"
    className="dash-hero-mark w-full h-full drop-shadow-sm"
    aria-hidden
  >
    <rect
      x="24"
      y="48"
      width="72"
      height="44"
      rx="8"
      fill="white"
      fillOpacity="0.92"
      stroke="#4f46e5"
      strokeWidth="3"
    />
    <path
      d="M148 40 L188 72 L148 104 L108 72 Z"
      fill="white"
      fillOpacity="0.88"
      stroke="#4f46e5"
      strokeWidth="3"
    />
    <line x1="96" y1="70" x2="108" y2="72" stroke="#4f46e5" strokeWidth="3" />
    <line x1="60" y1="92" x2="60" y2="128" stroke="#4f46e5" strokeWidth="3" />
    <circle cx="60" cy="144" r="12" fill="#4f46e5" className="dash-key" />
    <rect
      x="198"
      y="56"
      width="58"
      height="36"
      rx="6"
      fill="white"
      fillOpacity="0.75"
      stroke="#6366f1"
      strokeWidth="2.5"
    />
    <line x1="188" y1="72" x2="198" y2="72" stroke="#6366f1" strokeWidth="2.5" />
    <text
      x="60"
      y="76"
      textAnchor="middle"
      fill="#312e81"
      fontSize="11"
      fontFamily="Sora, sans-serif"
      fontWeight="600"
    >
      Entidade
    </text>
  </svg>
);

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

  const openCreate = () => {
    setIsCreating(true);
    setNewProjectName('');
  };

  return (
    <div className="dashboard-shell w-full h-screen flex flex-col overflow-hidden">
      <header className="shrink-0 px-5 sm:px-8 pt-5 pb-2 flex items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={`${import.meta.env.BASE_URL}logo.svg`}
            alt=""
            className="w-9 h-9 rounded-[10px] shrink-0"
          />
          <span className="text-sm font-semibold tracking-tight text-slate-800 truncate">
            BrModelo<span className="text-indigo-600">Plus</span>
          </span>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">
        <SmoothScroll className="h-full px-5 sm:px-8 pb-10">
          <div className="max-w-5xl mx-auto">
            <section className="relative grid lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-12 items-center py-6 sm:py-10">
              <div>
                <p className="dash-hero-step dash-hero-step--brand text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 mb-3">
                  Modelagem de dados
                </p>
                <h1 className="dash-hero-step dash-hero-step--title text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.05] mb-4">
                  BrModelo
                  <span className="text-indigo-600">Plus</span>
                </h1>
                <p className="dash-hero-step dash-hero-step--lead text-base sm:text-lg text-slate-600 max-w-md leading-relaxed mb-8">
                  Diagramas ER conceitual, lógico e físico — direto no navegador.
                </p>

                <div className="dash-hero-step dash-hero-step--cta flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json,.brmodelo.json"
                    className="hidden"
                    onChange={(e) => {
                      void handleImportFile(e);
                    }}
                  />
                  <Button
                    type="button"
                    size="lg"
                    onClick={openCreate}
                    className="rounded-xl gap-2"
                  >
                    <FolderPlus size={18} strokeWidth={2.25} />
                    Novo projeto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={importing}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl gap-2 bg-white/80 backdrop-blur-sm"
                  >
                    <Upload size={18} strokeWidth={2.25} />
                    {importing ? 'Importando…' : 'Importar JSON'}
                  </Button>
                </div>
              </div>

              <div className="dash-hero-step dash-hero-step--visual hidden sm:block relative h-44 lg:h-56">
                <div className="absolute inset-0 rounded-3xl bg-white/50 border border-white/80 backdrop-blur-[2px]" />
                <div className="relative h-full p-4 lg:p-6">
                  <HeroDiagram />
                </div>
              </div>
            </section>

            <Dialog
              open={isCreating}
              onOpenChange={(open) => {
                setIsCreating(open);
                if (!open) setNewProjectName('');
              }}
            >
              <DialogContent className="sm:max-w-md rounded-2xl">
                <form onSubmit={(e) => void handleCreate(e)}>
                  <DialogHeader>
                    <DialogTitle>Novo projeto</DialogTitle>
                    <DialogDescription>
                      Defina um nome para o diagrama. Você pode alterar depois no editor.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <label
                      htmlFor="project-name"
                      className="block text-xs font-semibold text-muted-foreground tracking-wide mb-2"
                    >
                      Nome do projeto
                    </label>
                    <Input
                      id="project-name"
                      autoFocus
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Ex.: Biblioteca universitária"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <DialogFooter className="gap-2 sm:gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsCreating(false)}
                      className="rounded-xl"
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" className="rounded-xl px-6">
                      Criar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <section className="dash-animate-in" style={{ animationDelay: '0.12s' }}>
              <div className="flex items-baseline justify-between gap-3 mb-5">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Seus projetos
                </h2>
                {!loading && projects.length > 0 && (
                  <Badge variant="secondary" className="rounded-md text-xs font-medium tabular-nums">
                    {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'}
                  </Badge>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-24">
                  <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : projects.length === 0 ? (
                <Card className="relative overflow-hidden rounded-3xl border-dashed border-primary/25 bg-card/70 py-0 shadow-none">
                  <CardContent className="relative px-6 py-16 text-center">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-40"
                      aria-hidden
                    >
                      <div className="absolute left-1/2 top-6 -translate-x-1/2 w-64 h-36">
                        <HeroDiagram />
                      </div>
                    </div>
                    <div className="relative">
                      <CardTitle className="text-lg font-bold mb-2">
                        Comece pelo primeiro diagrama
                      </CardTitle>
                      <CardDescription className="text-sm max-w-sm mx-auto mb-6 leading-relaxed">
                        Crie um projeto em branco ou importe um JSON exportado do BrModeloPlus.
                      </CardDescription>
                      <Button
                        type="button"
                        onClick={openCreate}
                        className="rounded-xl gap-2"
                      >
                        <FolderPlus size={16} />
                        Criar projeto
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ul className="dash-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 list-none p-0 m-0">
                  {projects.map((project, index) => (
                    <li key={project.id}>
                      <Card
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenProject(project.roomId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onOpenProject(project.roomId);
                          }
                        }}
                        className="dash-project-card group w-full gap-0 py-0 overflow-hidden rounded-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <div className="h-28 border-b border-border overflow-hidden pointer-events-none">
                          <div className="dash-project-thumb h-full origin-center">
                            <ProjectThumb variant={index} />
                          </div>
                        </div>
                        <CardHeader className="p-4 flex flex-row items-start justify-between gap-2 space-y-0">
                          <div className="min-w-0">
                            <CardTitle className="font-semibold text-[15px] truncate group-hover:text-primary transition-colors">
                              {project.name}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {formatProjectDate(project.createdAt)}
                            </CardDescription>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Excluir projeto"
                            aria-label={`Excluir ${project.name}`}
                            onClick={(e) => void handleDelete(e, project.id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 rounded-lg shrink-0"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </CardHeader>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </SmoothScroll>
      </main>
    </div>
  );
};
