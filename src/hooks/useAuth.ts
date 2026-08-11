import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, isFirebaseConfigured, LOCAL_USER } from '../config/firebase';
import { getRoomIdFromUrl } from '../lib/utils';
import type { AppUser } from '../types';

const toAppUser = (user: {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
}): AppUser => ({
  uid: user.uid,
  email: user.email,
  isAnonymous: user.isAnonymous,
});

export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(
    isFirebaseConfigured ? null : { ...LOCAL_USER },
  );
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    const rid = getRoomIdFromUrl();
    if (rid) setRoomId(rid);

    if (!isFirebaseConfigured || !auth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u ? toAppUser(u) : null);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginGuest = async () => {
    if (!isFirebaseConfigured) {
      setUser({ ...LOCAL_USER });
      return;
    }

    if (!auth) return;
    setAuthLoading(true);
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
      await signInWithCustomToken(auth, __initial_auth_token);
    } else {
      await signInAnonymously(auth);
    }
  };

  const loginGoogle = async () => {
    if (!isFirebaseConfigured || !auth) return;
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      setAuthLoading(false);
      alert(
        'Erro ao entrar com Google. Verifique se o popup não foi bloqueado ou se o domínio está autorizado no Firebase.',
      );
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth && !user?.isLocal) {
      await signOut(auth);
    }
    setUser(null);
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
