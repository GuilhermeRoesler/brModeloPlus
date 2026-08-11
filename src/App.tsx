import { useAuth } from './hooks/useAuth';
import { setRoomInUrl } from './lib/utils';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { EditorScreen } from './components/editor/EditorScreen';

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

  if (roomId) {
    return (
      <EditorScreen user={user} roomId={roomId} onBack={handleBackToDashboard} />
    );
  }

  return <DashboardScreen user={user} onOpenProject={handleOpenProject} />;
}
