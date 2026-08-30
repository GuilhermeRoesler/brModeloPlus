import {
  createEmptyRoom,
  deleteLocalRoom,
  loadLocalProjects,
  saveLocalProjects,
  saveLocalRoom,
} from '../lib/localStorage';
import { generateId } from '../lib/utils';
import type { AppUser, Project, RoomData } from '../types';

export const listProjects = async (_user: AppUser): Promise<Project[]> => {
  return loadLocalProjects();
};

export const findProjectByRoomId = (roomId: string): Project | undefined =>
  loadLocalProjects().find((p) => p.roomId === roomId || p.id === roomId);

export const createProject = async (
  user: AppUser,
  name: string,
  room: RoomData = createEmptyRoom(),
): Promise<string> => {
  const roomId = generateId();
  const projectData: Project = {
    id: roomId,
    name,
    roomId,
    ownerId: user.uid,
    createdAt: { seconds: Math.floor(Date.now() / 1000) },
  };

  const next = [projectData, ...loadLocalProjects()];
  saveLocalProjects(next);
  saveLocalRoom(roomId, room);
  return roomId;
};

export const deleteProject = async (_user: AppUser, projectId: string) => {
  const next = loadLocalProjects().filter((p) => p.id !== projectId);
  saveLocalProjects(next);
  deleteLocalRoom(projectId);
};

export const renameProject = (roomId: string, name: string): string => {
  const trimmed = name.trim() || 'Projeto';
  const projects = loadLocalProjects();
  const next = projects.map((p) =>
    p.roomId === roomId || p.id === roomId ? { ...p, name: trimmed } : p,
  );
  saveLocalProjects(next);
  return trimmed;
};
