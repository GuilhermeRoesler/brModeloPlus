import { useEffect, useState } from 'react';
import { LOCAL_USER } from '../config/app';
import { getRoomIdFromUrl } from '../lib/utils';
import type { AppUser } from '../types';

/** Auth local-only: sempre inicia com LOCAL_USER. */
export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>({ ...LOCAL_USER });
  const [authLoading] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    const rid = getRoomIdFromUrl();
    if (rid) setRoomId(rid);
  }, []);

  const loginGuest = async () => {
    setUser({ ...LOCAL_USER });
  };

  const loginGoogle = async () => {
    setUser({ ...LOCAL_USER });
  };

  const logout = async () => {
    setUser({ ...LOCAL_USER });
    setRoomId(null);
  };

  return {
    user,
    authLoading,
    roomId,
    setRoomId,
    loginGuest,
    loginGoogle,
    logout,
  };
};
