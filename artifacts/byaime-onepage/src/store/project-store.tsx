import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { WorldProject, TimelineEvent, Provider, Participant, Payment, Document, Media } from '../lib/types';
import { parseIntention, createInitialProject } from '../lib/parser';

type ProjectStore = {
  project: WorldProject | null;
  draft: Partial<WorldProject> | null;
  intentionText: string;
  hasProject: boolean;
  
  setIntentionText: (text: string) => void;
  commitDraft: () => void;
  clearProject: () => void;
  
  updateProject: (updates: Partial<WorldProject>) => void;
  
  // Timeline Actions
  addTimelineEvent: (event: Omit<TimelineEvent, 'id'>) => void;
  updateTimelineEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  removeTimelineEvent: (id: string) => void;
  
  // Generic entity actions
  addProvider: (provider: Omit<Provider, 'id'>) => void;
  addParticipant: (participant: Omit<Participant, 'id'>) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => void;
};

const ProjectContext = createContext<ProjectStore | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<WorldProject | null>(() => {
    try {
      const saved = localStorage.getItem('aime-project');
      return saved ? JSON.parse(saved) : null;
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

  const clearProject = useCallback(() => {
    setProject(null);
    setDraft(null);
    setIntentionTextState('');
  }, []);

  const updateProject = useCallback((updates: Partial<WorldProject>) => {
    setProject(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const addTimelineEvent = useCallback((event: Omit<TimelineEvent, 'id'>) => {
    setProject(prev => prev ? {
      ...prev,
      timeline: [...prev.timeline, { ...event, id: Math.random().toString(36).substring(2) }].sort((a, b) => a.time - b.time)
    } : null);
  }, []);

  const updateTimelineEvent = useCallback((id: string, updates: Partial<TimelineEvent>) => {
    setProject(prev => prev ? {
      ...prev,
      timeline: prev.timeline.map(e => e.id === id ? { ...e, ...updates } : e).sort((a, b) => a.time - b.time)
    } : null);
  }, []);

  const removeTimelineEvent = useCallback((id: string) => {
    setProject(prev => prev ? {
      ...prev,
      timeline: prev.timeline.filter(e => e.id !== id)
    } : null);
  }, []);

  const addProvider = useCallback((provider: Omit<Provider, 'id'>) => {
    setProject(prev => prev ? {
      ...prev,
      providers: [...prev.providers, { ...provider, id: Math.random().toString(36).substring(2) }]
    } : null);
  }, []);

  const addParticipant = useCallback((participant: Omit<Participant, 'id'>) => {
    setProject(prev => prev ? {
      ...prev,
      participants: [...prev.participants, { ...participant, id: Math.random().toString(36).substring(2) }]
    } : null);
  }, []);

  const addPayment = useCallback((payment: Omit<Payment, 'id'>) => {
    setProject(prev => prev ? {
      ...prev,
      payments: [...prev.payments, { ...payment, id: Math.random().toString(36).substring(2) }]
    } : null);
  }, []);

  return (
    <ProjectContext.Provider value={{
      project,
      draft,
      intentionText,
      hasProject: project !== null,
      setIntentionText,
      commitDraft,
      clearProject,
      updateProject,
      addTimelineEvent,
      updateTimelineEvent,
      removeTimelineEvent,
      addProvider,
      addParticipant,
      addPayment
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
