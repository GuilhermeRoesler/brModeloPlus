import { useEffect, useState } from 'react';
import { LOCAL_USER } from '../config/app';
import { getRoomIdFromUrl } from '../lib/utils';
import type { AppUser } from '../types';

/** Sessão local-only: sempre `LOCAL_USER` (sem login/nuvem). */
export const useAuth = () => {
  const [user] = useState<AppUser | null>({ ...LOCAL_USER });
  const [authLoading] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    const rid = getRoomIdFromUrl();
    if (rid) setRoomId(rid);
  }, []);

  return {
    user,
    authLoading,
    roomId,
    setRoomId,
  };
};
