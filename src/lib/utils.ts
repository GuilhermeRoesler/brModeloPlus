import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge de classes Tailwind (shadcn / UI). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ID curto para nós/salas (não é segredo de segurança). */
export const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).substring(2, 11);
};

export const getRoomIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
};

export const setRoomInUrl = (roomId: string | null) => {
  const newUrl = roomId
    ? `${window.location.pathname}?room=${encodeURIComponent(roomId)}`
    : window.location.pathname;
  window.history.pushState({ path: newUrl }, '', newUrl);
};
