import { useLocalStorage } from '../hooks/use-local-storage';

export type TimelineEvent = {
  id: string;
  year: number;
  title: string;
  universe: string;
};

export function useAppStore() {
  const [selectedUniverse, setSelectedUniverse] = useLocalStorage<string>('aime-selected-universe', '');
  const [timelineEvents, setTimelineEvents] = useLocalStorage<TimelineEvent[]>('aime-timeline', [
    { id: '1', year: new Date().getFullYear(), title: 'Votre projet commence ici', universe: 'AIME' }
  ]);
  const [currentQuestion, setCurrentQuestion] = useLocalStorage<string>('aime-current-question', '');

  const addTimelineEvent = (event: Omit<TimelineEvent, 'id'>) => {
    setTimelineEvents(prev => [...prev, { ...event, id: Math.random().toString(36).substring(7) }]);
  };

  const removeTimelineEvent = (id: string) => {
    setTimelineEvents(prev => prev.filter(e => e.id !== id));
  };

  return {
    selectedUniverse,
    setSelectedUniverse,
    timelineEvents,
    addTimelineEvent,
    removeTimelineEvent,
    currentQuestion,
    setCurrentQuestion,
  };
}
