import { isRealtimeCollabEnabled } from './config/firebase';
import { useAuth } from './hooks/useAuth';
import { setRoomInUrl } from './lib/utils';
import { LoginScreen } from './components/auth/LoginScreen';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { EditorScreen } from './components/editor/EditorScreen';

export default function App() {
  const {
    user,
    authLoading,
    roomId,
    setRoomId,
    loginGuest,
    loginGoogle,
    logout,
  } = useAuth();

  const handleOpenProject = (id: string) => {
    setRoomId(id);
    setRoomInUrl(id);
  };

  const handleBackToDashboard = () => {
    setRoomId(null);
    setRoomInUrl(null);
  };

  const handleLogout = async () => {
    await logout();
    setRoomInUrl(null);
  };

  if (!user) {
    return (
      <LoginScreen
        onLoginGoogle={() => void loginGoogle()}
        onLoginGuest={() => void loginGuest()}
        loading={authLoading}
        collabEnabled={isRealtimeCollabEnabled}
      />
    );
  }

  if (roomId) {
    return <EditorScreen user={user} roomId={roomId} onBack={handleBackToDashboard} />;
  }

  return (
    <DashboardScreen
      user={user}
      onOpenProject={handleOpenProject}
      onLogout={() => void handleLogout()}
    />
  );
}
