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
    const data = loadLocalRoom(roomId) ?? createEmptyRoom();
    if (!loadLocalRoom(roomId)) {
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
      handlers.onRoomData({
        nodes: (data.nodes as DiagramNode[]) || [],
        connections: (data.connections as Connection[]) || [],
        mode: (data.mode as Mode) || createEmptyRoom().mode,
      });
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
  if (!isRealtimeCollabEnabled || !db) {
    saveLocalRoom(roomId, data);
    return;
  }

  const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomId);
  await updateDoc(docRef, {
    ...data,
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
