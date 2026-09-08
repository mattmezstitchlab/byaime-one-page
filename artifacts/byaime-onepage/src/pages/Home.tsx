import { useProject } from '@/store/project-store';
import { ComposerHero } from '@/components/ComposerHero';
import { ProjectStage } from '@/components/ProjectStage';

function AppContent() {
  const { hasProject } = useProject();

  return (
    <div data-testid="portal" className="h-full w-full bg-background text-foreground font-sans antialiased selection:bg-foreground/20 selection:text-foreground">
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
