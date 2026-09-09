import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';
import { parseIntention, createInitialProject } from '../lib/parser';
import { normalizeProject } from '../lib/project-migration';
import { trackEvent } from '@/lib/analytics';
import { isCurrentRevision } from '@/lib/project-sync';
import { projectCatalogFromRows, roleForActiveProject, shouldCreateProject, } from '@/lib/project-catalog';
const ProjectContext = createContext(null);
const normalizeStoredProject = normalizeProject;
export function ProjectProvider({ children }) {
    const { isLoaded, isSignedIn, userId } = useAuth();
    const [project, setProject] = useState(null);
    const [participantLinkState, setParticipantLinkState] = useState({ contextKey: "", links: {} });
    const [intentionText, setIntentionTextState] = useState('');
    const [draft, setDraft] = useState(null);
    const [projects, setProjects] = useState([]);
    const [pendingOwnedProjectId, setPendingOwnedProjectId] = useState();
    const [isHydrated, setIsHydrated] = useState(false);
    const [syncStatus, setSyncStatus] = useState('local');
    const [syncError, setSyncError] = useState();
    const versionRef = useRef(undefined);
    const hydratedRef = useRef(false);
    const previousUserRef = useRef(undefined);
    const saveChainRef = useRef(Promise.resolve());
    const localRevisionRef = useRef(0);
    const participantRequestGenerationRef = useRef(0);
    const serverSyncedProjectRef = useRef(null);
    const projectCreationSourceRef = useRef('created');
    const participantContextKey = `${userId ?? "signed-out"}:${project?.id ?? "no-project"}`;
    const participantContextRef = useRef(participantContextKey);
    if (participantContextRef.current !== participantContextKey) {
        participantContextRef.current = participantContextKey;
        participantRequestGenerationRef.current += 1;
    }
    const participantLinks = participantLinkState.contextKey === participantContextKey
        ? participantLinkState.links
        : {};
    const request = useCallback(async (path, init) => {
        const response = await fetch(`/api${path}`, {
            ...init,
            headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
        });
        const body = response.status === 204 ? undefined : await response.json().catch(() => ({}));
        if (!response.ok)
            throw Object.assign(new Error(body?.error || `Erreur ${response.status}`), { status: response.status, body });
        return body;
    }, []);
    const refreshParticipantLinks = useCallback(async () => {
        if (!project?.id) {
            setParticipantLinkState({ contextKey: participantContextKey, links: {} });
            return {};
        }
        const requestContext = participantContextKey;
        const requestGeneration = ++participantRequestGenerationRef.current;
        const items = await request(`/projects/${project.id}/rsvp-links`);
        if (participantContextRef.current !== requestContext
            || participantRequestGenerationRef.current !== requestGeneration) {
            return {};
        }
        const scopedLinks = Object.fromEntries(items.map(item => [
            item.guestId,
            item.revoked ? { ...item, token: "" } : item,
        ]));
        setParticipantLinkState({ contextKey: requestContext, links: scopedLinks });
        return scopedLinks;
    }, [participantContextKey, project?.id, request]);
    useEffect(() => {
        setParticipantLinkState({ contextKey: participantContextKey, links: {} });
    }, [participantContextKey]);
    const selectProject = useCallback(async (id) => {
        setSyncStatus('loading');
        try {
            const list = await request('/projects');
            const row = list.find((item) => item.id === id);
            if (!row)
                throw new Error('Projet introuvable');
            const selectedProject = normalizeStoredProject({ ...row.data, id: row.id, title: row.title });
            setProjects(projectCatalogFromRows(list));
            setPendingOwnedProjectId(undefined);
            serverSyncedProjectRef.current = selectedProject;
            setProject(selectedProject);
            versionRef.current = row.updatedAt;
            hydratedRef.current = true;
            localStorage.setItem(`aime-project:${userId}`, JSON.stringify(row.data));
            if (userId)
                localStorage.setItem(`aime-active-project:${userId}`, row.id);
            setSyncStatus('saved');
            return true;
        }
        catch (error) {
            setSyncError(error instanceof Error ? error.message : 'Chargement impossible');
            setSyncStatus('error');
            return false;
        }
    }, [request, userId]);
    useEffect(() => {
        if (!isLoaded)
            return;
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
        void request('/projects').then(async (rows) => {
            if (cancelled)
                return;
            let available = rows;
            const legacy = localStorage.getItem('aime-project');
            if (available.length === 0 && legacy) {
                const data = normalizeStoredProject(JSON.parse(legacy));
                const created = await request('/projects', { method: 'POST', body: JSON.stringify({ title: data.title, data }) });
                available = [created];
                trackEvent('project_imported');
                localStorage.removeItem('aime-project');
            }
            if (cancelled)
                return;
            setProjects(projectCatalogFromRows(available));
            setPendingOwnedProjectId(undefined);
            if (available[0]) {
                const activeProjectId = localStorage.getItem(`aime-active-project:${userId}`);
                const row = available.find(item => item.id === activeProjectId) ?? available[0];
                const hydratedProject = normalizeStoredProject({ ...row.data, id: row.id, title: row.title });
                serverSyncedProjectRef.current = hydratedProject;
                setProject(hydratedProject);
                versionRef.current = row.updatedAt;
                localStorage.setItem(`aime-project:${userId}`, JSON.stringify(row.data));
                localStorage.setItem(`aime-active-project:${userId}`, row.id);
            }
            else {
                const cached = localStorage.getItem(`aime-project:${userId}`);
                serverSyncedProjectRef.current = null;
                setProject(cached ? normalizeStoredProject(JSON.parse(cached)) : null);
            }
            hydratedRef.current = true;
            setIsHydrated(true);
            setSyncStatus('saved');
        }).catch((error) => {
            if (cancelled)
                return;
            const cached = localStorage.getItem(`aime-project:${userId}`);
            if (cached)
                setProject(normalizeStoredProject(JSON.parse(cached)));
            hydratedRef.current = true;
            setIsHydrated(true);
            setSyncError(error instanceof Error ? error.message : 'Mode hors connexion');
            setSyncStatus('error');
        });
        return () => { cancelled = true; };
    }, [isLoaded, isSignedIn, userId, request]);
    useEffect(() => {
        if (project) {
            localStorage.setItem(userId ? `aime-project:${userId}` : 'aime-project', JSON.stringify(project));
        }
        else {
            localStorage.removeItem('aime-project');
            if (userId)
                localStorage.removeItem(`aime-project:${userId}`);
        }
    }, [project, userId]);
    useEffect(() => {
        if (!project || !isSignedIn || !hydratedRef.current)
            return;
        if (project === serverSyncedProjectRef.current)
            return;
        const userAtSchedule = userId;
        const revisionAtSchedule = ++localRevisionRef.current;
        setSyncStatus('saving');
        const timer = window.setTimeout(() => {
            saveChainRef.current = saveChainRef.current.catch(() => undefined).then(async () => {
                if (userId !== userAtSchedule || !isSignedIn)
                    return;
                setSyncStatus('saving');
                try {
                    if (shouldCreateProject(project.id, projects, versionRef.current)) {
                        const created = await request('/projects', { method: 'POST', body: JSON.stringify({ title: project.title, data: project }) });
                        versionRef.current = created.updatedAt;
                        setProject(prev => {
                            if (!prev)
                                return prev;
                            const withServerId = { ...prev, id: created.id };
                            if (prev === project)
                                serverSyncedProjectRef.current = withServerId;
                            return withServerId;
                        });
                        setProjects(prev => [...prev, { id: created.id, title: created.title, role: 'owner' }]);
                        setPendingOwnedProjectId(undefined);
                        if (userId)
                            localStorage.setItem(`aime-active-project:${userId}`, created.id);
                        trackEvent(projectCreationSourceRef.current === 'imported' ? 'project_imported' : 'project_created');
                    }
                    else {
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
                }
                catch (error) {
                    if (isCurrentRevision(localRevisionRef.current, revisionAtSchedule)) {
                        if (error?.status === 409)
                            setSyncStatus('conflict');
                        else
                            setSyncStatus('error');
                        setSyncError(error instanceof Error ? error.message : 'Sauvegarde impossible');
                    }
                }
            });
        }, 900);
        return () => window.clearTimeout(timer);
    }, [project, isSignedIn, projects, request, userId]);
    const setIntentionText = useCallback((text) => {
        setIntentionTextState(text);
        if (text.length > 5) {
            setDraft(parseIntention(text));
        }
        else {
            setDraft(null);
        }
    }, []);
    const commitDraft = useCallback(() => {
        if (draft && intentionText) {
            projectCreationSourceRef.current = 'created';
            const newProject = createInitialProject(draft, intentionText);
            setPendingOwnedProjectId(newProject.id);
            setProject(newProject);
            setDraft(null);
            setIntentionTextState('');
        }
    }, [draft, intentionText]);
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
    const importBackup = useCallback((value) => {
        const candidate = value?.format === 'aime-backup' ? value.project?.data : value;
        if (!candidate || typeof candidate !== 'object' || typeof candidate.title !== 'string') {
            throw new Error('Sauvegarde AIME invalide');
        }
        versionRef.current = undefined;
        projectCreationSourceRef.current = 'imported';
        const importedProject = normalizeStoredProject(candidate);
        setPendingOwnedProjectId(importedProject.id);
        setProject(importedProject);
    }, []);
    const updateProject = useCallback((updates) => {
        setProject(prev => prev ? { ...prev, ...updates } : null);
    }, []);
    const updateEntity = useCallback((collection, id, updates) => {
        setProject(prev => {
            if (!prev)
                return null;
            const list = prev[collection];
            if (!Array.isArray(list))
                return prev;
            return {
                ...prev,
                [collection]: list.map(item => item.id === id ? { ...item, ...updates } : item)
            };
        });
    }, []);
    const addEntity = useCallback((collection, item) => {
        setProject(prev => {
            if (!prev)
                return null;
            const list = prev[collection];
            if (!Array.isArray(list))
                return prev;
            const newItem = { ...item, id: Math.random().toString(36).substring(2) };
            return {
                ...prev,
                [collection]: [...list, newItem]
            };
        });
    }, []);
    const removeEntity = useCallback((collection, id) => {
        setProject(prev => {
            if (!prev)
                return null;
            const list = prev[collection];
            if (!Array.isArray(list))
                return prev;
            return {
                ...prev,
                [collection]: list.filter(item => item.id !== id)
            };
        });
    }, []);
    const currentRole = roleForActiveProject(project?.id, projects, pendingOwnedProjectId);
    const canEdit = currentRole !== 'viewer';
    return (<ProjectContext.Provider value={{
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
    </ProjectContext.Provider>);
}
export function useProject() {
    const context = useContext(ProjectContext);
    if (!context)
        throw new Error("useProject must be used within ProjectProvider");
    return context;
}
//# sourceMappingURL=project-store.jsx.map