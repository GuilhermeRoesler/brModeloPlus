import {
  createEmptyRoom,
  loadLocalRoom,
  normalizeRoomData,
  saveLocalRoom,
} from '../lib/localStorage';
import type { RoomData } from '../types';

export type RoomSyncHandlers = {
  onRoomData: (data: RoomData) => void;
};

/** Carrega a sala do localStorage (normaliza v2 → v3 se precisar). */
export const subscribeToRoom = (
  roomId: string,
  handlers: RoomSyncHandlers,
): (() => void) | undefined => {
  const raw = loadLocalRoom(roomId);
  const data = raw ? normalizeRoomData(raw) : createEmptyRoom();
  handlers.onRoomData(data);
  return undefined;
};

export const saveRoom = async (roomId: string, data: RoomData) => {
  saveLocalRoom(roomId, data);
};
