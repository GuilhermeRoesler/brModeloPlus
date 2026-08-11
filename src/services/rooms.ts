import {
  createEmptyRoom,
  loadLocalRoom,
  saveLocalRoom,
} from '../lib/localStorage';
import type { RoomData } from '../types';

export type RoomSyncHandlers = {
  onRoomData: (data: RoomData) => void;
};

/** Carrega a sala do localStorage. */
export const subscribeToRoom = (
  roomId: string,
  handlers: RoomSyncHandlers,
): (() => void) | undefined => {
  const raw = loadLocalRoom(roomId);
  const data =
    raw && typeof raw === 'object'
      ? (raw as RoomData)
      : createEmptyRoom();
  handlers.onRoomData({
    nodes: data.nodes ?? [],
    edges: data.edges ?? [],
    mode: data.mode ?? createEmptyRoom().mode,
    version: data.version ?? createEmptyRoom().version,
  });
  return undefined;
};

export const saveRoom = async (roomId: string, data: RoomData) => {
  saveLocalRoom(roomId, data);
};
