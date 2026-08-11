import { MODES, ROOM_VERSION, type Project, type RoomData } from '../types';

const LOCAL_PROJECTS_KEY = 'brmodelo-local-projects';

export const localRoomKey = (roomId: string) => `brmodelo-local-room-${roomId}`;

export const loadLocalProjects = (): Project[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PROJECTS_KEY) || '[]') as Project[];
  } catch {
    return [];
  }
};

export const saveLocalProjects = (projects: Project[]) => {
  localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
};

export const loadLocalRoom = (roomId: string): unknown | null => {
  try {
    return JSON.parse(localStorage.getItem(localRoomKey(roomId)) || 'null');
  } catch {
    return null;
  }
};

export const saveLocalRoom = (roomId: string, data: RoomData) => {
  localStorage.setItem(localRoomKey(roomId), JSON.stringify(data));
};

export const deleteLocalRoom = (roomId: string) => {
  localStorage.removeItem(localRoomKey(roomId));
};

export const createEmptyRoom = (): RoomData => ({
  nodes: [],
  edges: [],
  mode: MODES.CONCEPTUAL,
  version: ROOM_VERSION,
});
