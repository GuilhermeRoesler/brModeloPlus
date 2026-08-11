import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { appId, db, isRealtimeCollabEnabled } from '../config/firebase';
import {
  createEmptyRoom,
  deleteLocalRoom,
  loadLocalProjects,
  saveLocalProjects,
  saveLocalRoom,
} from '../lib/localStorage';
import { generateId } from '../lib/utils';
import type { AppUser, Project } from '../types';

const shouldUseLocal = (user: AppUser) => !isRealtimeCollabEnabled || Boolean(user.isLocal);

export const listProjects = async (user: AppUser): Promise<Project[]> => {
  if (shouldUseLocal(user)) {
    return loadLocalProjects();
  }

  if (!db) return [];

  const snap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'projects'));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
  list.sort((a, b) => {
    const aSec = (a.createdAt as { seconds?: number } | undefined)?.seconds || 0;
    const bSec = (b.createdAt as { seconds?: number } | undefined)?.seconds || 0;
    return bSec - aSec;
  });
  return list;
};

export const createProject = async (user: AppUser, name: string): Promise<string> => {
  const roomId = generateId();
  const projectData: Project = {
    id: roomId,
    name,
    roomId,
    ownerId: user.uid,
    createdAt: shouldUseLocal(user)
      ? { seconds: Math.floor(Date.now() / 1000) }
      : serverTimestamp(),
  };

  if (shouldUseLocal(user)) {
    const next = [projectData, ...loadLocalProjects()];
    saveLocalProjects(next);
    saveLocalRoom(roomId, createEmptyRoom());
    return roomId;
  }

  if (!db) throw new Error('Firestore não disponível');

  await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'projects', roomId), projectData);
  return roomId;
};

export const deleteProject = async (user: AppUser, projectId: string) => {
  if (shouldUseLocal(user)) {
    const next = loadLocalProjects().filter((p) => p.id !== projectId);
    saveLocalProjects(next);
    deleteLocalRoom(projectId);
    return;
  }

  if (!db) return;
  await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'projects', projectId));
};
