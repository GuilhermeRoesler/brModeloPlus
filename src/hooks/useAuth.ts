import { useEffect, useState } from 'react';
import { APP_USER } from '../config/app';
import { getRoomIdFromUrl } from '../lib/utils';
import type { AppUser } from '../types';

/** Sessão automática: sempre `APP_USER` (sem autenticação). */
export const useAuth = () => {
  const [user] = useState<AppUser | null>({ ...APP_USER });
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
