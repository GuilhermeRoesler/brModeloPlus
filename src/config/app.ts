import type { AppUser } from '../types';

/** Usuário padrão da sessão (sem autenticação). */
export const APP_USER: AppUser = {
  uid: 'app-user',
  email: null,
  isAnonymous: true,
};
