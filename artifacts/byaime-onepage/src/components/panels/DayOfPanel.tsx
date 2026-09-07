import { useProject } from '@/store/project-store';
import { UniversalTimeline } from '../UniversalTimeline';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function DayOfPanel() {
  const { project } = useProject();
  if (!project) return null;

  const dayOfEvents = project.timeline.filter(e => e.phase === 'pendant').sort((a, b) => a.time - b.time);

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="text-center mb-8">
        <h4 className="text-2xl font-display font-light">Le Déroulé du Jour J</h4>
        <p className="text-white/50 text-sm mt-2">
          {format(project.pivot.value, 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
      </div>
      
      <UniversalTimeline events={dayOfEvents} />
    </div>
  );
}
