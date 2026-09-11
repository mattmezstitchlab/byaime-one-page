import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';
import { WorldProject, TimelineEvent, Provider, Guest, Payment, Document, Task, Table, Communication, type ParticipantLink } from '../lib/types';
import { parseIntention, createInitialProject } from '../lib/parser';
import { INTENTION_DRAFT_KEY, MIN_INTENTION_LENGTH } from '@/lib/intention-draft';
import { normalizeProject } from '../lib/project-migration';
import { trackEvent } from '@/lib/analytics';
import { isCurrentRevision } from '@/lib/project-sync';
import {
  projectCatalogFromRows,
  roleForActiveProject,
  shouldCreateProject,
  type ProjectCatalogItem,
} from '@/lib/project-catalog';

type ProjectStore = {
  project: WorldProject | null;
  draft: Partial<WorldProject> | null;
  intentionText: string;
  hasProject: boolean;
  projects: ProjectCatalogItem[];
  isHydrated: boolean;
  syncStatus: 'local' | 'loading' | 'saving' | 'saved' | 'error' | 'conflict';
  syncError?: string;
  currentRole: string;
  canEdit: boolean;
  participantLinks: Record<string, ParticipantLink>;
  
  setIntentionText: (text: string) => void;
  commitDraft: () => void;
  createProjectFromIntention: (text: string) => boolean;
  createWeddingDemo: () => void;
  clearProject: () => void;
  selectProject: (id: string) => Promise<boolean>;
  refreshParticipantLinks: () => Promise<Record<string, ParticipantLink>>;
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
  const [participantLinkState, setParticipantLinkState] = useState<{
    contextKey: string;
    links: Record<string, ParticipantLink>;
  }>({ contextKey: "", links: {} });

  const [intentionText, setIntentionTextState] = useState('');
  const [draft, setDraft] = useState<Partial<WorldProject> | null>(null);
  const [projects, setProjects] = useState<ProjectCatalogItem[]>([]);
  const [pendingOwnedProjectId, setPendingOwnedProjectId] = useState<string>();
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<ProjectStore['syncStatus']>('local');
  const [syncError, setSyncError] = useState<string>();
  const versionRef = useRef<string | undefined>(undefined);
  const hydratedRef = useRef(false);
  const previousUserRef = useRef<string | null | undefined>(undefined);
  const saveChainRef = useRef(Promise.resolve());
  const localRevisionRef = useRef(0);
  const participantRequestGenerationRef = useRef(0);
  const serverSyncedProjectRef = useRef<WorldProject | null>(null);
  const projectCreationSourceRef = useRef<'created' | 'imported'>('created');
  const participantContextKey = `${userId ?? "signed-out"}:${project?.id ?? "no-project"}`;
  const participantContextRef = useRef(participantContextKey);
  if (participantContextRef.current !== participantContextKey) {
    participantContextRef.current = participantContextKey;
    participantRequestGenerationRef.current += 1;
  }
  const participantLinks = participantLinkState.contextKey === participantContextKey
    ? participantLinkState.links
    : {};

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(`/api${path}`, {
      ...init,
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
    const body = response.status === 204 ? undefined : await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body?.error || `Erreur ${response.status}`), { status: response.status, body });
    return body;
  }, []);

  const refreshParticipantLinks = useCallback(async () => {
    if (!project?.id) {
      setParticipantLinkState({ contextKey: participantContextKey, links: {} });
      return {};
    }
    const requestContext = participantContextKey;
    const requestGeneration = ++participantRequestGenerationRef.current;
    const items = await request(`/projects/${project.id}/rsvp-links`) as ParticipantLink[];
    if (
      participantContextRef.current !== requestContext
      || participantRequestGenerationRef.current !== requestGeneration
    ) {
      return {};
    }
    const scopedLinks = Object.fromEntries(
      items.map(item => [
        item.guestId,
        item.revoked ? { ...item, token: "" } : item,
      ]),
    );
    setParticipantLinkState({ contextKey: requestContext, links: scopedLinks });
    return scopedLinks;
  }, [participantContextKey, project?.id, request]);

  useEffect(() => {
    setParticipantLinkState({ contextKey: participantContextKey, links: {} });
  }, [participantContextKey]);

  const selectProject = useCallback(async (id: string) => {
    setSyncStatus('loading');
    try {
      const list = await request('/projects');
      const row = list.find((item: any) => item.id === id);
      if (!row) throw new Error('Projet introuvable');
      const selectedProject = normalizeStoredProject({ ...(row.data as WorldProject), id: row.id, title: row.title });
      setProjects(projectCatalogFromRows(list));
      setPendingOwnedProjectId(undefined);
      serverSyncedProjectRef.current = selectedProject;
      setProject(selectedProject);
      versionRef.current = row.updatedAt;
      hydratedRef.current = true;
      localStorage.setItem(`aime-project:${userId}`, JSON.stringify(row.data));
      if (userId) localStorage.setItem(`aime-active-project:${userId}`, row.id);
      setSyncStatus('saved');
      return true;
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Chargement impossible');
      setSyncStatus('error');
      return false;
    }
  }, [request, userId]);

  useEffect(() => {
    if (!isLoaded) return;
    if (previousUserRef.current !== undefined && previousUserRef.current !== (userId ?? null)) {
      if (previousUserRef.current) {
        localStorage.removeItem(`aime-project:${previousUserRef.current}`);
        localStorage.removeItem(`aime-active-project:${previousUserRef.current}`);
      }
      setProject(null);
      setProjects([]);
      setPendingOwnedProjectId(undefined);
      setIsHydrated(false);
      versionRef.current = undefined;
      hydratedRef.current = false;
      serverSyncedProjectRef.current = null;
    }
    previousUserRef.current = userId ?? null;
    if (!isSignedIn || !userId) {
      setSyncStatus('local');
      setIsHydrated(true);
      return;
    }
    let cancelled = false;
    setIsHydrated(false);
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
      setProjects(projectCatalogFromRows(available));
      setPendingOwnedProjectId(undefined);
      if (available[0]) {
        const activeProjectId = localStorage.getItem(`aime-active-project:${userId}`);
        const row = available.find(item => item.id === activeProjectId) ?? available[0];
        const hydratedProject = normalizeStoredProject({ ...(row.data as WorldProject), id: row.id, title: row.title });
        serverSyncedProjectRef.current = hydratedProject;
        setProject(hydratedProject);
        versionRef.current = row.updatedAt;
        localStorage.setItem(`aime-project:${userId}`, JSON.stringify(row.data));
        localStorage.setItem(`aime-active-project:${userId}`, row.id);
      } else {
        const cached = localStorage.getItem(`aime-project:${userId}`);
        if (!cached) {
          /* L'intention posée sur l'accueil crée directement le Monde après la
             création du compte : pas de second champ « Racontez-nous tout » sur
             la page suivante. La phrase n'est jamais redemandée. */
          const pending = localStorage.getItem(INTENTION_DRAFT_KEY);
          if (pending && pending.trim().length >= MIN_INTENTION_LENGTH) {
            localStorage.removeItem(INTENTION_DRAFT_KEY);
            const draftedProject = createInitialProject(parseIntention(pending), pending);
            setPendingOwnedProjectId(draftedProject.id);
            setProject(draftedProject);
            serverSyncedProjectRef.current = null;
            trackEvent('project_created');
            hydratedRef.current = true;
            setIsHydrated(true);
            setSyncStatus('saved');
            return;
          }
        }
        serverSyncedProjectRef.current = null;
        setProject(cached ? normalizeStoredProject(JSON.parse(cached)) : null);
      }
      hydratedRef.current = true;
      setIsHydrated(true);
      setSyncStatus('saved');
    }).catch((error) => {
      if (cancelled) return;
      const cached = localStorage.getItem(`aime-project:${userId}`);
      if (cached) setProject(normalizeStoredProject(JSON.parse(cached)));
      hydratedRef.current = true;
      setIsHydrated(true);
      setSyncError(error instanceof Error ? error.message : 'Mode hors connexion');
      setSyncStatus('error');
    });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, userId, request]);

  useEffect(() => {
    try {
      if (project) {
        localStorage.setItem(userId ? `aime-project:${userId}` : 'aime-project', JSON.stringify(project));
      } else {
        localStorage.removeItem('aime-project');
        if (userId) localStorage.removeItem(`aime-project:${userId}`);
      }
    } catch {
      /* Quota dépassé (visuel importé en donnée, par ex.) : la sauvegarde
         serveur reste la source de vérité ; le cache local peut échouer. */
    }
  }, [project, userId]);

  useEffect(() => {
    if (!project || !isSignedIn || !hydratedRef.current) return;
    if (project === serverSyncedProjectRef.current) return;
    const userAtSchedule = userId;
    const revisionAtSchedule = ++localRevisionRef.current;
    setSyncStatus('saving');
    const timer = window.setTimeout(() => {
      saveChainRef.current = saveChainRef.current.catch(() => undefined).then(async () => {
        if (userId !== userAtSchedule || !isSignedIn) return;
      setSyncStatus('saving');
      try {
        if (shouldCreateProject(project.id, projects, versionRef.current)) {
          const created = await request('/projects', { method: 'POST', body: JSON.stringify({ title: project.title, data: project }) });
          versionRef.current = created.updatedAt;
          setProject(prev => {
            if (!prev) return prev;
            const withServerId = { ...prev, id: created.id };
            if (prev === project) serverSyncedProjectRef.current = withServerId;
            return withServerId;
          });
          setProjects(prev => [...prev, { id: created.id, title: created.title, role: 'owner' }]);
          setPendingOwnedProjectId(undefined);
          if (userId) localStorage.setItem(`aime-active-project:${userId}`, created.id);
           trackEvent(projectCreationSourceRef.current === 'imported' ? 'project_imported' : 'project_created');
        } else {
          const updated = await request(`/projects/${project.id}`, {
            method: 'PUT',
            body: JSON.stringify({ title: project.title, data: project, updatedAt: versionRef.current }),
          });
          versionRef.current = updated.updatedAt;
          serverSyncedProjectRef.current = project;
        }
        if (isCurrentRevision(localRevisionRef.current, revisionAtSchedule)) {
          setSyncError(undefined);
          setSyncStatus('saved');
        }
      } catch (error: any) {
        if (isCurrentRevision(localRevisionRef.current, revisionAtSchedule)) {
          if (error?.status === 409) setSyncStatus('conflict');
          else setSyncStatus('error');
          setSyncError(error instanceof Error ? error.message : 'Sauvegarde impossible');
        }
      }
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [project, isSignedIn, projects, request, userId]);

  const setIntentionText = useCallback((text: string) => {
    setIntentionTextState(text);
    setDraft(text.trim().length >= MIN_INTENTION_LENGTH ? parseIntention(text) : null);
  }, []);

  /* Une phrase, un seuil, une création : l'accueil et le compositeur du Monde
     passent par la même porte pour éviter deux règles de validation. */
  const createProjectFromIntention = useCallback((text: string) => {
    const intention = text.trim();
    if (intention.length < MIN_INTENTION_LENGTH) return false;
    projectCreationSourceRef.current = 'created';
    const newProject = createInitialProject(parseIntention(intention), intention);
    setPendingOwnedProjectId(newProject.id);
    setProject(newProject);
    setDraft(null);
    setIntentionTextState('');
    if (userId) window.localStorage.removeItem(INTENTION_DRAFT_KEY);
    return true;
  }, [userId]);

  const commitDraft = useCallback(() => {
    if (draft && intentionText) createProjectFromIntention(intentionText);
  }, [createProjectFromIntention, draft, intentionText]);

  const createWeddingDemo = useCallback(() => {
    projectCreationSourceRef.current = 'created';
    const example = "On se marie le 14 août 2027 près de Lille, 120 invités, ambiance champêtre avec un budget de 20 000€";
    const exampleDraft = parseIntention(example);
    const newProject = createInitialProject(exampleDraft, example);
    setPendingOwnedProjectId(newProject.id);
    setProject(newProject);
    setDraft(null);
    setIntentionTextState('');
  }, []);

  const clearProject = useCallback(() => {
    setProject(null);
    setPendingOwnedProjectId(undefined);
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
    const importedProject = normalizeStoredProject(candidate as WorldProject);
    setPendingOwnedProjectId(importedProject.id);
    setProject(importedProject);
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
  const currentRole = roleForActiveProject(project?.id, projects, pendingOwnedProjectId);
  const canEdit = currentRole !== 'viewer';

  return (
    <ProjectContext.Provider value={{
      project,
      draft,
      intentionText,
      hasProject: project !== null,
      projects,
      isHydrated,
      syncStatus,
      syncError,
      currentRole,
      canEdit,
      participantLinks,
      setIntentionText,
      commitDraft,
      createProjectFromIntention,
      createWeddingDemo,
      clearProject,
      selectProject,
      refreshParticipantLinks,
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
