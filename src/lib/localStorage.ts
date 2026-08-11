import {
  MODES,
  ROOM_VERSION,
  type ErEdge,
  type ErNode,
  type Mode,
  type ModeDiagram,
  type Project,
  type RoomData,
} from '../types';

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

export const createEmptyDiagram = (): ModeDiagram => ({
  nodes: [],
  edges: [],
});

export const createEmptyDiagrams = (): Record<Mode, ModeDiagram> => ({
  [MODES.CONCEPTUAL]: createEmptyDiagram(),
  [MODES.LOGICAL]: createEmptyDiagram(),
  [MODES.PHYSICAL]: createEmptyDiagram(),
});

export const createEmptyRoom = (): RoomData => ({
  diagrams: createEmptyDiagrams(),
  mode: MODES.CONCEPTUAL,
  version: ROOM_VERSION,
});

const isMode = (value: unknown): value is Mode =>
  value === MODES.CONCEPTUAL ||
  value === MODES.LOGICAL ||
  value === MODES.PHYSICAL;

const asDiagram = (value: unknown): ModeDiagram => {
  if (!value || typeof value !== 'object') return createEmptyDiagram();
  const d = value as Partial<ModeDiagram>;
  return {
    nodes: Array.isArray(d.nodes) ? (d.nodes as ErNode[]) : [],
    edges: Array.isArray(d.edges) ? (d.edges as ErEdge[]) : [],
  };
};

/** Normaliza JSON antigo (v2: nodes/edges únicos) ou v3 para `RoomData` atual. */
export const normalizeRoomData = (raw: unknown): RoomData => {
  const empty = createEmptyRoom();
  if (!raw || typeof raw !== 'object') return empty;

  const data = raw as Record<string, unknown>;
  const mode = isMode(data.mode) ? data.mode : empty.mode;

  if (data.diagrams && typeof data.diagrams === 'object') {
    const diagramsRaw = data.diagrams as Partial<Record<Mode, unknown>>;
    return {
      diagrams: {
        [MODES.CONCEPTUAL]: asDiagram(diagramsRaw[MODES.CONCEPTUAL]),
        [MODES.LOGICAL]: asDiagram(diagramsRaw[MODES.LOGICAL]),
        [MODES.PHYSICAL]: asDiagram(diagramsRaw[MODES.PHYSICAL]),
      },
      mode,
      version: ROOM_VERSION,
    };
  }

  // Legacy v2: um único nodes/edges — migra para o modo salvo na época.
  const diagrams = createEmptyDiagrams();
  diagrams[mode] = {
    nodes: Array.isArray(data.nodes) ? (data.nodes as ErNode[]) : [],
    edges: Array.isArray(data.edges) ? (data.edges as ErEdge[]) : [],
  };

  return {
    diagrams,
    mode,
    version: ROOM_VERSION,
  };
};
