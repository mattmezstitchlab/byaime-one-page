import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { WorldProject, TimelineEvent, Provider, Guest, Payment, Document, Task, Table, Communication } from '../lib/types';
import { parseIntention, createInitialProject } from '../lib/parser';

type ProjectStore = {
  project: WorldProject | null;
  draft: Partial<WorldProject> | null;
  intentionText: string;
  hasProject: boolean;
  
  setIntentionText: (text: string) => void;
  commitDraft: () => void;
  createWeddingDemo: () => void;
  clearProject: () => void;
  
  updateProject: (updates: Partial<WorldProject>) => void;
  updateEntity: <K extends keyof WorldProject>(collection: K, id: string, updates: any) => void;
  addEntity: <K extends keyof WorldProject>(collection: K, item: any) => void;
  removeEntity: <K extends keyof WorldProject>(collection: K, id: string) => void;
};

const ProjectContext = createContext<ProjectStore | null>(null);

function normalizeStoredProject(value: WorldProject): WorldProject {
  const emptyCeremony = { structure: [], notes: '', readings: [], vows: [], traditions: [], menu: '', drinks: '', cake: '', firstDance: '' };
  const emptyLogistics = { accommodations: [], shuttles: [], parking: '', accessibility: '', weatherFallback: '', emergencyContacts: [], packing: [] };
  return {
    ...value,
    timeline: Array.isArray(value.timeline) ? value.timeline : [],
    tables: Array.isArray(value.tables) ? value.tables : [],
    communications: Array.isArray(value.communications) ? value.communications : [],
    tasks: (Array.isArray(value.tasks) ? value.tasks : []).map(task => ({ ...task, priority: task.priority || 'normale', status: task.status || 'a_faire', phase: task.phase || '1-3m' })),
    guests: (Array.isArray(value.guests) ? value.guests : []).map(guest => ({ ...guest, attendance: guest.attendance || { ceremony: true, cocktail: true, dinner: true, brunch: false }, rsvp: guest.rsvp || 'en_attente', role: guest.role || 'invite' })),
    providers: (Array.isArray(value.providers) ? value.providers : []).map(provider => ({ ...provider, status: provider.status || 'recherche' })),
    payments: Array.isArray(value.payments) ? value.payments : [],
    documents: Array.isArray(value.documents) ? value.documents : [],
    media: Array.isArray(value.media) ? value.media : [],
    messages: Array.isArray(value.messages) ? value.messages : [],
    ceremony: { ...emptyCeremony, ...(value.ceremony || {}) },
    music: Array.isArray(value.music) ? value.music : [],
    team: Array.isArray(value.team) ? value.team : [],
    memories: Array.isArray(value.memories) ? value.memories : [],
    messageTemplates: Array.isArray(value.messageTemplates) ? value.messageTemplates : [],
    messageLogs: Array.isArray(value.messageLogs) ? value.messageLogs : [],
    guestsCount: value.guestsCount ?? { value: null, confidence: 'manquant' },
    budget: value.budget ?? { value: null, confidence: 'manquant' },
    city: value.city ?? { value: null, confidence: 'manquant' },
    venue: value.venue ?? { value: null, confidence: 'manquant' },
    logistics: { ...emptyLogistics, ...(value.logistics || {}) },
    missing: Array.isArray(value.missing) ? value.missing : [],
  };
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<WorldProject | null>(() => {
    try {
      const saved = localStorage.getItem('aime-project');
      return saved ? normalizeStoredProject(JSON.parse(saved) as WorldProject) : null;
    } catch {
      return null;
    }
  });

  const [intentionText, setIntentionTextState] = useState('');
  const [draft, setDraft] = useState<Partial<WorldProject> | null>(null);

  useEffect(() => {
    if (project) {
      localStorage.setItem('aime-project', JSON.stringify(project));
    } else {
      localStorage.removeItem('aime-project');
    }
  }, [project]);

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
      const newProject = createInitialProject(draft, intentionText);
      setProject(newProject);
      setDraft(null);
      setIntentionTextState('');
    }
  }, [draft, intentionText]);

  const createWeddingDemo = useCallback(() => {
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

  return (
    <ProjectContext.Provider value={{
      project,
      draft,
      intentionText,
      hasProject: project !== null,
      setIntentionText,
      commitDraft,
      createWeddingDemo,
      clearProject,
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
