import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { CURSOR_THROTTLE_MS } from '../config/constants';
import { appId, db, isRealtimeCollabEnabled } from '../config/firebase';
import {
  createEmptyRoom,
  loadLocalRoom,
  saveLocalRoom,
} from '../lib/localStorage';
import { normalizeRoomData } from '../lib/roomNormalize';
import { getRandomColor } from '../lib/utils';
import type { Connection, DiagramNode, Mode, RemoteCursor, RoomData } from '../types';

export type RoomSyncHandlers = {
  onRoomData: (data: RoomData) => void;
  onCursors?: (cursors: RemoteCursor[]) => void;
  shouldIgnoreRemote?: () => boolean;
};

export const subscribeToRoom = (
  roomId: string,
  handlers: RoomSyncHandlers,
): Unsubscribe | undefined => {
  if (!isRealtimeCollabEnabled || !db) {
    const raw = loadLocalRoom(roomId) ?? createEmptyRoom();
    const data = normalizeRoomData(raw);
    if (!loadLocalRoom(roomId) || raw.coordSpace !== 'topLeft') {
      saveLocalRoom(roomId, data);
    }
    handlers.onRoomData(data);
    return undefined;
  }

  const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
  const unsubDoc = onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      if (handlers.shouldIgnoreRemote?.()) return;
      const data = snap.data();
      const normalized = normalizeRoomData({
        nodes: (data.nodes as DiagramNode[]) || [],
        connections: (data.connections as Connection[]) || [],
        mode: (data.mode as Mode) || createEmptyRoom().mode,
        coordSpace: data.coordSpace as RoomData['coordSpace'],
      });
      handlers.onRoomData(normalized);
      // Persiste migração center→topLeft uma vez
      if (data.coordSpace !== 'topLeft') {
        void updateDoc(docRef, {
          ...normalized,
          lastUpdated: serverTimestamp(),
        });
      }
    } else {
      void setDoc(docRef, {
        ...createEmptyRoom(),
        createdAt: serverTimestamp(),
      });
    }
  });

  const cursorQuery = query(
    collection(db, 'artifacts', appId, 'public', 'data', 'cursors'),
    where('roomId', '==', roomId),
  );
  const unsubCursors = onSnapshot(cursorQuery, (snapshot) => {
    const activeCursors: RemoteCursor[] = [];
    snapshot.forEach((cursorDoc) => {
      activeCursors.push(cursorDoc.data() as RemoteCursor);
    });
    handlers.onCursors?.(activeCursors);
  });

  return () => {
    unsubDoc();
    unsubCursors();
  };
};

export const saveRoom = async (
  roomId: string,
  data: RoomData,
) => {
  const payload: RoomData = {
    ...data,
    coordSpace: 'topLeft',
  };

  if (!isRealtimeCollabEnabled || !db) {
    saveLocalRoom(roomId, payload);
    return;
  }

  const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
  await updateDoc(docRef, {
    ...payload,
    lastUpdated: serverTimestamp(),
  });
};

let lastCursorUpdate = 0;

export const updateRemoteCursor = (
  roomId: string,
  userId: string,
  x: number,
  y: number,
) => {
  if (!isRealtimeCollabEnabled || !db) return;

  const now = Date.now();
  if (now - lastCursorUpdate <= CURSOR_THROTTLE_MS) return;
  lastCursorUpdate = now;

  const cursorRef = doc(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    'cursors',
    `${roomId}_${userId}`,
  );
  void setDoc(cursorRef, {
    userId,
    roomId,
    x,
    y,
    color: getRandomColor(),
    updatedAt: serverTimestamp(),
  });
};
