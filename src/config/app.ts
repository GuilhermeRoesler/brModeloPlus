import type { AppUser } from '../types';

/** Usuário único do modo local (sem auth/nuvem). */
export const LOCAL_USER: AppUser = {
  uid: 'local-user',
  email: null,
  isAnonymous: true,
  isLocal: true,
};
