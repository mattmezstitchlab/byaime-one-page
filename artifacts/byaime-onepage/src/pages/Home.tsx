import { useProject } from '@/store/project-store';
import { PortalOnboarding } from '@/components/PortalOnboarding';
import { ProjectStage } from '@/components/ProjectStage';

function AppContent() {
  const { hasProject } = useProject();

  return (
    <div data-testid="portal" className="aime-world-surface h-full w-full bg-background text-foreground font-sans antialiased selection:bg-foreground/20 selection:text-foreground">
      {!hasProject ? (
        <PortalOnboarding />
      ) : (
        <ProjectStage />
      )}
    </div>
  );
}

export function Home() {
  return <AppContent />;
}
