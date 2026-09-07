import { useProject } from '@/store/project-store';
import { ComposerHero } from '@/components/ComposerHero';
import { ProjectStage } from '@/components/ProjectStage';
import { PortalControls } from '@/components/PortalControls';

function AppContent() {
  const { hasProject } = useProject();

  return (
    <div data-testid="portal" className="min-h-screen w-full bg-black text-white font-sans antialiased selection:bg-white/20 selection:text-white">
      <PortalControls />
      {!hasProject ? (
        <ComposerHero />
      ) : (
        <ProjectStage />
      )}
    </div>
  );
}

export function Home() {
  return <AppContent />;
}
