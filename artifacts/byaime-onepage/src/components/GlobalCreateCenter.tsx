import { useEffect, useState } from "react";
import { CalendarDays, ClipboardList, FileText, Plus, Users } from "lucide-react";
import { useLocation } from "wouter";
import { CenteredBlock } from "@/components/CenteredBlock";
import { UNIVERSAL_CREATE_ACTIONS, type UniversalCreateActionId } from "@/lib/universal/create-actions";
import type { PrivateDestinationId } from "@/lib/private-navigation";
import { useProject } from "@/store/project-store";

const actionIcons = {
  person: Users,
  moment: CalendarDays,
  task: ClipboardList,
  "document-media": FileText,
} satisfies Partial<Record<UniversalCreateActionId, typeof Users>>;

const contextCopy: Record<PrivateDestinationId, string> = {
  profile: "Le Profil reste votre projection personnelle. Les nouvelles informations sont créées dans le Monde actif, puis apparaissent ici lorsqu’elles vous concernent.",
  world: "Ajoutez une information dans le Monde actif. AIME ouvre directement l’espace opérationnel qui peut réellement l’enregistrer.",
};

export function GlobalCreateCenter({ destination }: { destination: PrivateDestinationId }) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { project, canEdit, currentRole } = useProject();

  useEffect(() => {
    const openCreate = () => setOpen(true);
    window.addEventListener("aime:open-create", openCreate);
    return () => window.removeEventListener("aime:open-create", openCreate);
  }, []);

  if (!open) return null;

  const availableActions = UNIVERSAL_CREATE_ACTIONS.filter(
    action => action.availableInCurrentProject && action.id in actionIcons,
  );
  const openAction = (id: UniversalCreateActionId) => {
    if (destination === "world") {
      window.dispatchEvent(new CustomEvent<UniversalCreateActionId>("aime:open-create-target", { detail: id }));
    } else {
      navigate(`/user-portal?create=${id}`);
    }
    setOpen(false);
  };

  return (
    <CenteredBlock
      eyebrow="+ · Créer ou relier"
      title={project ? `Ajouter dans ${project.title}` : "Créer votre premier Monde"}
      description={project ? contextCopy[destination] : "Un Monde réunit les Moments, les personnes et les informations qui donnent vie à votre projet."}
      onClose={() => setOpen(false)}
      size="lg"
      leading={<span className="mt-3 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground text-background"><Plus className="h-5 w-5" /></span>}
    >
      {!project ? (
        <button
          type="button"
          onClick={() => {
            navigate("/user-portal");
            setOpen(false);
          }}
          className="w-full rounded-2xl bg-foreground px-5 py-4 text-sm font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Commencer un Monde
        </button>
      ) : (
        <>
          {!canEdit && <p className="mb-5 rounded-xl border border-foreground/10 bg-foreground/[.035] p-4 text-xs leading-relaxed text-foreground/55">Votre rôle actuel permet de consulter ce Monde, mais pas d’y créer de nouvelles informations.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {availableActions.map(action => {
              const Icon = actionIcons[action.id as keyof typeof actionIcons];
              const canUse = canEdit && (action.id !== "document-media" || currentRole === "owner" || currentRole === "planner");
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={!canUse}
                  onClick={() => openAction(action.id)}
                  className="group flex min-h-32 items-start gap-4 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-5 text-left transition hover:border-foreground/25 hover:bg-foreground/[.07] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-foreground/5 text-foreground/55 transition group-hover:bg-foreground group-hover:text-background"><Icon className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-sm font-medium text-foreground/80">{action.label}</span>
                    <span className="mt-2 block text-xs font-light leading-relaxed text-foreground/45">{action.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-6 text-[10px] uppercase tracking-[.15em] text-foreground/35">Ces actions ne publient rien automatiquement et respectent vos droits dans ce Monde.</p>
        </>
      )}
    </CenteredBlock>
  );
}