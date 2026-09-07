import { NavBar } from '@/components/NavBar';
import { HeroSection } from '@/components/HeroSection';
import { ConceptSection } from '@/components/ConceptSection';
import { UniversesSection } from '@/components/UniversesSection';
import { TimelineSection } from '@/components/TimelineSection';
import { BottomBar } from '@/components/BottomBar';

export function Home() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground pb-20 selection:bg-white/20 selection:text-white">
      <NavBar />
      
      <main>
        <HeroSection />
        <ConceptSection />
        <UniversesSection />
        <TimelineSection />
      </main>
      
      <BottomBar />
    </div>
  );
}
