import { useAuth } from './hooks/useAuth';
import { setRoomInUrl } from './lib/utils';
import { CustomCursor } from './components/effects/CustomCursor';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { EditorScreen } from './components/editor/EditorScreen';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function App() {
  const { user, roomId, setRoomId } = useAuth();

  const handleOpenProject = (id: string) => {
    setRoomId(id);
    setRoomInUrl(id);
  };

  const handleBackToDashboard = () => {
    setRoomId(null);
    setRoomInUrl(null);
  };

  if (!user) return null;

  return (
    <TooltipProvider delayDuration={280}>
      <CustomCursor />
      {roomId ? (
        <EditorScreen user={user} roomId={roomId} onBack={handleBackToDashboard} />
      ) : (
        <DashboardScreen user={user} onOpenProject={handleOpenProject} />
      )}
    </TooltipProvider>
  );
}
