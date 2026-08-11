import { normalizeRoomData } from './localStorage';
import { ROOM_VERSION, type RoomData } from '../types';

export const PROJECT_FILE_FORMAT = 'brmodelo-plus' as const;
export const PROJECT_FILE_FORMAT_VERSION = 1 as const;

/** Pacote JSON portátil de um projeto BrModeloPlus. */
export type ProjectFile = {
  format: typeof PROJECT_FILE_FORMAT;
  formatVersion: typeof PROJECT_FILE_FORMAT_VERSION;
  name?: string;
  exportedAt: string;
  room: RoomData;
};

export type ParsedProjectFile = {
  name?: string;
  room: RoomData;
};

export class ProjectFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectFileError';
  }
}

export const buildProjectFile = (
  room: RoomData,
  name?: string,
): ProjectFile => ({
  format: PROJECT_FILE_FORMAT,
  formatVersion: PROJECT_FILE_FORMAT_VERSION,
  ...(name?.trim() ? { name: name.trim() } : {}),
  exportedAt: new Date().toISOString(),
  room: {
    diagrams: room.diagrams,
    mode: room.mode,
    version: ROOM_VERSION,
  },
});

export const serializeProjectFile = (
  room: RoomData,
  name?: string,
): string => JSON.stringify(buildProjectFile(room, name), null, 2);

const looksLikeRoomPayload = (data: Record<string, unknown>) =>
  Boolean(data.diagrams) ||
  Array.isArray(data.nodes) ||
  Array.isArray(data.edges);

/** Aceita pacote `brmodelo-plus` ou RoomData cru (v2/v3). */
export const parseProjectFile = (raw: unknown): ParsedProjectFile => {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ProjectFileError(
      'Arquivo inválido: esperado um objeto JSON de projeto.',
    );
  }

  const data = raw as Record<string, unknown>;

  if (data.format === PROJECT_FILE_FORMAT) {
    if (!data.room || typeof data.room !== 'object' || Array.isArray(data.room)) {
      throw new ProjectFileError(
        'Arquivo inválido: campo "room" ausente ou malformado.',
      );
    }
    return {
      name: typeof data.name === 'string' ? data.name : undefined,
      room: normalizeRoomData(data.room),
    };
  }

  if (looksLikeRoomPayload(data)) {
    return {
      name: typeof data.name === 'string' ? data.name : undefined,
      room: normalizeRoomData(data),
    };
  }

  throw new ProjectFileError(
    'Arquivo inválido: não reconheço o formato BrModeloPlus.',
  );
};

export const parseProjectFileJson = (text: string): ParsedProjectFile => {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new ProjectFileError('Arquivo inválido: JSON malformado.');
  }
  return parseProjectFile(raw);
};

export const suggestExportFilename = (name?: string, roomId?: string) => {
  const base =
    name
      ?.trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    (roomId ? `sala-${roomId}` : 'projeto');
  return `${base || 'projeto'}.brmodelo.json`;
};
