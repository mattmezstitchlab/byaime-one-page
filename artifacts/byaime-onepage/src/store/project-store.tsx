import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';
import { WorldProject, TimelineEvent, Provider, Guest, Payment, Document, Task, Table, Communication } from '../lib/types';
import { parseIntention, createInitialProject } from '../lib/parser';
import { normalizeProject } from '../lib/project-migration';
import { trackEvent } from '@/lib/analytics';

type ProjectStore = {
  project: WorldProject | null;
  draft: Partial<WorldProject> | null;
  intentionText: string;
  hasProject: boolean;
  projects: { id: string; title: string; role: string }[];
  syncStatus: 'local' | 'loading' | 'saving' | 'saved' | 'error' | 'conflict';
  syncError?: string;
  currentRole: string;
  canEdit: boolean;
  
  setIntentionText: (text: string) => void;
  commitDraft: () => void;
  createWeddingDemo: () => void;
  clearProject: () => void;
  selectProject: (id: string) => Promise<void>;
  importBackup: (value: unknown) => void;
  
  updateProject: (updates: Partial<WorldProject>) => void;
  updateEntity: <K extends keyof WorldProject>(collection: K, id: string, updates: any) => void;
  addEntity: <K extends keyof WorldProject>(collection: K, item: any) => void;
  removeEntity: <K extends keyof WorldProject>(collection: K, id: string) => void;
};

const ProjectContext = createContext<ProjectStore | null>(null);

const normalizeStoredProject = normalizeProject;

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [project, setProject] = useState<WorldProject | null>(null);

  const [intentionText, setIntentionTextState] = useState('');
  const [draft, setDraft] = useState<Partial<WorldProject> | null>(null);
  const [projects, setProjects] = useState<{ id: string; title: string; role: string }[]>([]);
  const [syncStatus, setSyncStatus] = useState<ProjectStore['syncStatus']>('local');
  const [syncError, setSyncError] = useState<string>();
  const versionRef = useRef<string | undefined>(undefined);
  const hydratedRef = useRef(false);
  const previousUserRef = useRef<string | null | undefined>(undefined);
  const saveChainRef = useRef(Promise.resolve());
  const projectCreationSourceRef = useRef<'created' | 'imported'>('created');

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api${path}`, {
      ...init,
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
    const body = response.status === 204 ? undefined : await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body?.error || `Erreur ${response.status}`), { status: response.status, body });
    return body;
  }, []);

  const selectProject = useCallback(async (id: string) => {
    setSyncStatus('loading');
    try {
      const list = await request('/projects');
      const row = list.find((item: any) => item.id === id);
      if (!row) throw new Error('Projet introuvable');
      setProject(normalizeStoredProject({ ...(row.data as WorldProject), id: row.id, title: row.title }));
      versionRef.current = row.updatedAt;
      hydratedRef.current = true;
      localStorage.setItem(`aime-project:${userId}`, JSON.stringify(row.data));
      setSyncStatus('saved');
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Chargement impossible');
      setSyncStatus('error');
    }
  }, [request, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    if (previousUserRef.current !== undefined && previousUserRef.current !== (userId ?? null)) {
      if (previousUserRef.current) localStorage.removeItem(`aime-project:${previousUserRef.current}`);
      setProject(null);
      setProjects([]);
      versionRef.current = undefined;
      hydratedRef.current = false;
    }
    previousUserRef.current = userId ?? null;
    if (!isSignedIn || !userId) { setSyncStatus('local'); return; }
    let cancelled = false;
    setSyncStatus('loading');
    void request('/projects').then(async (rows: any[]) => {
      if (cancelled) return;
      let available = rows;
      const legacy = localStorage.getItem('aime-project');
       if (available.length === 0 && legacy) {
        const data = normalizeStoredProject(JSON.parse(legacy));
        const created = await request('/projects', { method: 'POST', body: JSON.stringify({ title: data.title, data }) });
        available = [created];
         trackEvent('project_imported');
        localStorage.removeItem('aime-project');
      }
      if (cancelled) return;
      setProjects(available.map(row => ({ id: row.id, title: row.title, role: row.role })));
      if (available[0]) {
        const row = available[0];
        setProject(normalizeStoredProject({ ...(row.data as WorldProject), id: row.id, title: row.title }));
        versionRef.current = row.updatedAt;
        localStorage.setItem(`aime-project:${userId}`, JSON.stringify(row.data));
      } else {
        const cached = localStorage.getItem(`aime-project:${userId}`);
        setProject(cached ? normalizeStoredProject(JSON.parse(cached)) : null);
      }
      hydratedRef.current = true;
      setSyncStatus('saved');
    }).catch((error) => {
      if (cancelled) return;
      const cached = localStorage.getItem(`aime-project:${userId}`);
      if (cached) setProject(normalizeStoredProject(JSON.parse(cached)));
      hydratedRef.current = true;
      setSyncError(error instanceof Error ? error.message : 'Mode hors connexion');
      setSyncStatus('error');
    });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, userId, request]);

  useEffect(() => {
    if (project) {
      localStorage.setItem(userId ? `aime-project:${userId}` : 'aime-project', JSON.stringify(project));
    } else {
      localStorage.removeItem('aime-project');
      if (userId) localStorage.removeItem(`aime-project:${userId}`);
    }
  }, [project, userId]);

  useEffect(() => {
    if (!project || !isSignedIn || !hydratedRef.current) return;
    const userAtSchedule = userId;
    const timer = window.setTimeout(() => {
      saveChainRef.current = saveChainRef.current.catch(() => undefined).then(async () => {
        if (userId !== userAtSchedule || !isSignedIn) return;
      setSyncStatus('saving');
      try {
        if (!versionRef.current || !projects.some(item => item.id === project.id)) {
          const created = await request('/projects', { method: 'POST', body: JSON.stringify({ title: project.title, data: project }) });
          versionRef.current = created.updatedAt;
          setProject(prev => prev ? { ...prev, id: created.id } : prev);
          setProjects(prev => [...prev, { id: created.id, title: created.title, role: 'owner' }]);
           trackEvent(projectCreationSourceRef.current === 'imported' ? 'project_imported' : 'project_created');
        } else {
          const updated = await request(`/projects/${project.id}`, {
            method: 'PUT',
            body: JSON.stringify({ title: project.title, data: project, updatedAt: versionRef.current }),
          });
          versionRef.current = updated.updatedAt;
        }
        setSyncError(undefined);
        setSyncStatus('saved');
      } catch (error: any) {
        if (error?.status === 409) setSyncStatus('conflict');
        else setSyncStatus('error');
        setSyncError(error instanceof Error ? error.message : 'Sauvegarde impossible');
      }
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [project, isSignedIn, projects, request, userId]);

  const setIntentionText = useCallback((text: string) => {
    setIntentionTextState(text);
    if (text.length > 5) {
      setDraft(parseIntention(text));
    } else {
      setDraft(null);
    }
  }, []);

  const commitDraft = useCallback(() => {
    if (draft && intentionText) {
      projectCreationSourceRef.current = 'created';
      const newProject = createInitialProject(draft, intentionText);
      setProject(newProject);
      setDraft(null);
      setIntentionTextState('');
    }
  }, [draft, intentionText]);

  const createWeddingDemo = useCallback(() => {
    projectCreationSourceRef.current = 'created';
    const example = "On se marie le 14 août 2027 près de Lille, 120 invités, ambiance champêtre avec un budget de 20 000€";
    const exampleDraft = parseIntention(example);
    setProject(createInitialProject(exampleDraft, example));
    setDraft(null);
    setIntentionTextState('');
  }, []);

  const clearProject = useCallback(() => {
    setProject(null);
    setDraft(null);
    setIntentionTextState('');
  }, []);

  const importBackup = useCallback((value: unknown) => {
    const candidate = (value as any)?.format === 'aime-backup' ? (value as any).project?.data : value;
    if (!candidate || typeof candidate !== 'object' || typeof (candidate as any).title !== 'string') {
      throw new Error('Sauvegarde AIME invalide');
    }
    versionRef.current = undefined;
    projectCreationSourceRef.current = 'imported';
    setProject(normalizeStoredProject(candidate as WorldProject));
  }, []);

  const updateProject = useCallback((updates: Partial<WorldProject>) => {
    setProject(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const updateEntity = useCallback(<K extends keyof WorldProject>(collection: K, id: string, updates: any) => {
    setProject(prev => {
      if (!prev) return null;
      const list = prev[collection] as any[];
      if (!Array.isArray(list)) return prev;
      return {
        ...prev,
        [collection]: list.map(item => item.id === id ? { ...item, ...updates } : item)
      };
    });
  }, []);

  const addEntity = useCallback(<K extends keyof WorldProject>(collection: K, item: any) => {
    setProject(prev => {
      if (!prev) return null;
      const list = prev[collection] as any[];
      if (!Array.isArray(list)) return prev;
      const newItem = { ...item, id: Math.random().toString(36).substring(2) };
      return {
        ...prev,
        [collection]: [...list, newItem]
      };
    });
  }, []);

  const removeEntity = useCallback(<K extends keyof WorldProject>(collection: K, id: string) => {
    setProject(prev => {
      if (!prev) return null;
      const list = prev[collection] as any[];
      if (!Array.isArray(list)) return prev;
      return {
        ...prev,
        [collection]: list.filter(item => item.id !== id)
      };
    });
  }, []);
  const currentRole = projects.find(item => item.id === project?.id)?.role || 'owner';
  const canEdit = currentRole !== 'viewer';

  return (
    <ProjectContext.Provider value={{
      project,
      draft,
      intentionText,
      hasProject: project !== null,
      projects,
      syncStatus,
      syncError,
      currentRole,
      canEdit,
      setIntentionText,
      commitDraft,
      createWeddingDemo,
      clearProject,
      selectProject,
      importBackup,
      updateProject,
      updateEntity,
      addEntity,
      removeEntity
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProject must be used within ProjectProvider");
  return context;
}
