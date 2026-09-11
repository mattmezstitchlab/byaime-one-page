import { useState } from "react";
import { Compass } from "lucide-react";
import { CenteredBlock } from "./CenteredBlock";
import { AimeGuide } from "./AimeGuide";
import type { AimeScreenId } from "@/lib/aime-architecture";

/*
 * Les écrans publics que l'invité découvre sans compte (réponse d'invitation,
 * droit de collaboration) n'ont pas de barre de commande. Cette bulle leur donne
 * le même agent que l'espace privé : elle explique l'écran et propose les
 * actions qui existent vraiment, sans saisir ni envoyer quoi que ce soit.
 */
export function AimePublicGuide({
  screen,
  testId,
  label = "Une question ?",
}: {
  screen: AimeScreenId;
  testId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={testId}
        className="fixed bottom-5 right-5 z-[80] inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-background/85 px-4 py-2 text-[11px] uppercase tracking-[.16em] text-foreground/70 shadow-lg backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Compass aria-hidden className="h-3.5 w-3.5" />
        {label}
      </button>
      {open && (
        <CenteredBlock
          eyebrow="AIME · + · ME"
          title="Guide de lecture"
          description="Ce que cet écran attend de vous, et où aller ensuite."
          onClose={() => setOpen(false)}
          showGuideHint={false}
          size="md"
          testId={`${testId}-panel`}
        >
          <AimeGuide project={null} fallbackScreen={screen} onJumped={() => setOpen(false)} />
        </CenteredBlock>
      )}
    </>
  );
}
