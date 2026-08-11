import { useCallback, useEffect, useState } from 'react';
import { createProject, deleteProject, listProjects } from '../services/projects';
import type { AppUser, Project } from '../types';

export const useProjects = (user: AppUser | null) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const list = await listProjects(user);
    setProjects(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async (name: string) => {
    if (!user) return null;
    const roomId = await createProject(user, name);
    await refresh();
    return roomId;
  };

  const remove = async (projectId: string) => {
    if (!user) return;
    await deleteProject(user, projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  return { projects, loading, create, remove, refresh };
};
