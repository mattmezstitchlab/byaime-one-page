import { ProjectProvider, useProject } from '@/store/project-store';
import { ComposerHero } from '@/components/ComposerHero';
import { ProjectStage } from '@/components/ProjectStage';

function AppContent() {
  const { hasProject } = useProject();

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans antialiased selection:bg-white/20 selection:text-white">
      {!hasProject ? (
        <ComposerHero />
      ) : (
        <ProjectStage />
      )}
    </div>
  );
}

export function Home() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}
