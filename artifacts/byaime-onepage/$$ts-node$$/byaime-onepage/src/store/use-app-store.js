import { useLocalStorage } from '../hooks/use-local-storage';
export function useAppStore() {
    const [selectedUniverse, setSelectedUniverse] = useLocalStorage('aime-selected-universe', '');
    const [timelineEvents, setTimelineEvents] = useLocalStorage('aime-timeline', [
        { id: '1', year: new Date().getFullYear(), title: 'Votre projet commence ici', universe: 'AIME' }
    ]);
    const [currentQuestion, setCurrentQuestion] = useLocalStorage('aime-current-question', '');
    const addTimelineEvent = (event) => {
        setTimelineEvents(prev => [...prev, { ...event, id: Math.random().toString(36).substring(7) }]);
    };
    const removeTimelineEvent = (id) => {
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
//# sourceMappingURL=use-app-store.js.map