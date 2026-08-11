import {
  createEmptyRoom,
  deleteLocalRoom,
  loadLocalProjects,
  saveLocalProjects,
  saveLocalRoom,
} from '../lib/localStorage';
import { generateId } from '../lib/utils';
import type { AppUser, Project } from '../types';

export const listProjects = async (_user: AppUser): Promise<Project[]> => {
  return loadLocalProjects();
};

export const createProject = async (
  user: AppUser,
  name: string,
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
  saveLocalRoom(roomId, createEmptyRoom());
  return roomId;
};

export const deleteProject = async (_user: AppUser, projectId: string) => {
  const next = loadLocalProjects().filter((p) => p.id !== projectId);
  saveLocalProjects(next);
  deleteLocalRoom(projectId);
};
