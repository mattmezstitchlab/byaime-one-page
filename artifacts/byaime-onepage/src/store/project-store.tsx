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
  return {
    ...value,
    timeline: Array.isArray(value.timeline) ? value.timeline : [],
    tasks: Array.isArray(value.tasks) ? value.tasks : [],
    guests: Array.isArray(value.guests) ? value.guests : [],
    tables: Array.isArray(value.tables) ? value.tables : [],
    providers: Array.isArray(value.providers) ? value.providers : [],
    payments: Array.isArray(value.payments) ? value.payments : [],
    documents: Array.isArray(value.documents) ? value.documents : [],
    communications: Array.isArray(value.communications) ? value.communications : [],
    media: Array.isArray(value.media) ? value.media : [],
    messages: Array.isArray(value.messages) ? value.messages : [],
    guestsCount: value.guestsCount ?? { value: null, confidence: 'manquant' },
    budget: value.budget ?? { value: null, confidence: 'manquant' },
    city: value.city ?? { value: null, confidence: 'manquant' },
    venue: value.venue ?? { value: null, confidence: 'manquant' },
    logistics: value.logistics ?? { accommodations: [], shuttles: [] },
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
