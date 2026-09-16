import { useEffect } from "react";
import { useLocation } from "wouter";
import { useProject } from "@/store/project-store";
import {
  MIN_INTENTION_LENGTH,
  readIntentionDraft,
  clearIntentionDraft,
} from "@/lib/intention-draft";
import { trackEvent } from "@/lib/analytics";
import { Oneboarding } from "@/components/oneboarding/Oneboarding";

/*
 * L'accueil ne propose plus un choix d'architecture.
 *
 * Auparavant, la porte d'entrée demandait de trancher entre « Voir ma carte »,
 * « Créer un mariage » et « Outils avancés » — c'est-à-dire de comprendre
 * BYAIME avant de commencer. Il reste une seule promesse : *votre identité, une
 * seule fois*. Tout le reste (rôle, activité, mariage, présence) est demandé
 * ensuite, dans le même parcours, par `components/oneboarding/Oneboarding`.
 *
 * Le tunnel « Créer un mariage » n'a pas disparu : il est devenu l'une des cinq
 * étapes de ce parcours. Il n'y a donc plus deux systèmes de navigation, et
 * `composer.step` (« Question X sur 5 ») n'a plus qu'un seul cadre — `StepFlow`.
 *
 * `composeIntention` reste exportée d'ici pour compatibilité, mais elle vit
 * désormais dans `lib/wedding-answers.ts` : la phrase est une représentation
 * humaine, plus le transport des données.
 */
export { composeIntention } from "@/lib/wedding-answers";

export function LandingComposer({ signedIn = false }: { signedIn?: boolean }) {
  const [, navigate] = useLocation();
  const { createProjectFromIntention, setIntentionText } = useProject();

  /* Une intention déjà posée avant la création du compte reprend la main : une
     seule fois à l'ouverture, jamais ensuite. */
  useEffect(() => {
    if (!signedIn) return;
    const savedDraft = readIntentionDraft();
    if (!savedDraft || savedDraft.trim().length < MIN_INTENTION_LENGTH) return;
    const intention = savedDraft.trim();
    trackEvent("landing_intention_resumed", { facts: "draft" });
    setIntentionText(intention);
    if (createProjectFromIntention(intention)) {
      clearIntentionDraft();
      navigate("/user-portal");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="landing-composer" className="mx-auto w-full max-w-2xl text-left">
      <Oneboarding signedIn={signedIn} />
    </div>
  );
}
