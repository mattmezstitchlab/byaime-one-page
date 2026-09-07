import { useState } from "react";
import { FileText, Folder } from "lucide-react";
import CausalPanel from "@/components/aime/CausalPanel";
import WeatherPanel from "@/components/aime/WeatherPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PROVIDER_STATUS_LABEL, type WorldProject } from "@/lib/aime/world/types";
import {
  PanelBar,
  PROJECT_PANEL_LABEL,
  type ProjectPanelKey,
} from "@/components/aime/project/ProjectPanels";

/**
 * Les mêmes volets que la page projet, mais lus dans le monde lui-même.
 * Aucune écriture : c'est la version consultation (démo, page partagée).
 */
export function WorldPanelDock({
  project,
  panel,
  onPanel,
}: {
  project: WorldProject;
  panel: ProjectPanelKey | undefined;
  onPanel: (panel: ProjectPanelKey | undefined) => void;
}) {
  return (
    <>
      <PanelBar current={panel} onPick={onPanel} />
      <Sheet open={!!panel} onOpenChange={(v) => !v && onPanel(undefined)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          <SheetHeader className="sticky top-0 z-10 border-b border-hairline bg-background px-5 py-4 text-left">
            <SheetTitle className="pr-8 text-[18px]">
              {panel ? PROJECT_PANEL_LABEL[panel] : ""}
            </SheetTitle>
            <p className="text-[12px] text-muted-foreground">Démonstration en lecture seule</p>
          </SheetHeader>
          <div className="px-5 py-6">{panel && <WorldPanel project={project} panel={panel} />}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Intro({ children }: { children: string }) {
  return <p className="text-[15px] leading-relaxed text-muted-foreground">{children}</p>;
}

function Row({
  title,
  detail,
  right,
}: {
  title: string;
  detail?: string | undefined;
  right?: string | undefined;
}) {
  return (
    <li className="flex items-baseline justify-between gap-4 py-3">
      <span>
        <span className="text-[15px]">{title}</span>
        {detail ? <span className="block text-[13px] text-muted-foreground">{detail}</span> : null}
      </span>
      {right ? <span className="shrink-0 text-[13px] text-muted-foreground">{right}</span> : null}
    </li>
  );
}

/** Les montants du monde sont en centimes. */
const euros = (cents: number) => `${Math.round(cents / 100).toLocaleString("fr-FR")} €`;

const day = (ms: number) =>
  new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function WorldPanel({ project, panel }: { project: WorldProject; panel: ProjectPanelKey }) {
  if (panel === "personnes")
    return (
      <div>
        <Intro>Les places du projet et les personnes qui les tiennent.</Intro>
        <ul className="mt-4 divide-y">
          {project.providers.map((p) => (
            <Row
              key={p.id}
              title={p.name ?? p.role}
              detail={p.name ? `${p.role}${p.city ? ` · ${p.city}` : ""}` : p.role}
              right={PROVIDER_STATUS_LABEL[p.status]}
            />
          ))}
          {project.people.map((p) => (
            <Row key={p.id} title={p.name} detail={p.role} />
          ))}
        </ul>
      </div>
    );

  if (panel === "argent") {
    const paid = project.payments
      .filter((p) => p.state === "paye")
      .reduce((s, p) => s + p.amountCents, 0);
    const due = project.payments
      .filter((p) => p.state === "du")
      .reduce((s, p) => s + p.amountCents, 0);
    return (
      <div>
        <Intro>Ce qui est réglé, ce qui reste à régler.</Intro>
        <p className="mt-3 text-[14px]">
          Réglé {euros(paid)} · Reste {euros(due)}
        </p>
        <ul className="mt-4 divide-y">
          {project.payments.map((p) => (
            <Row
              key={p.id}
              title={p.label}
              detail={day(p.at)}
              right={`${euros(p.amountCents)} · ${p.state === "paye" ? "payé" : "dû"}`}
            />
          ))}
        </ul>
      </div>
    );
  }

  if (panel === "documents") return <WorldDocuments project={project} />;


  if (panel === "jourj")
    return (
      <div>
        <Intro>Le déroulé du jour, heure par heure, et ce que dit le ciel.</Intro>
        <div className="mt-6">
          <WeatherPanel
            city={project.city.value ?? project.venue.value ?? undefined}
            startsAt={new Date(project.pivot.value).toISOString()}
          />
        </div>
        <ul className="mt-6 divide-y">
          {project.tracks.map((t) => (
            <Row
              key={t.id}
              title={`${t.title} — ${t.artist}`}
              detail={t.dedicace ?? t.moment}
              right={`${String(Math.floor(t.offsetH % 24)).padStart(2, "0")} h`}
            />
          ))}
        </ul>
      </div>
    );

  return (
    <div>
      <Intro>Prévenir au lieu de guérir : ce qui bouge, et ce qui bougera ensuite.</Intro>
      <div className="mt-6">
        <CausalPanel universeSlug={project.universe} roleSlug="organisateur" />
      </div>
    </div>
  );
}

/**
 * Les documents comme partout ailleurs : des dossiers à gauche, la pièce
 * ouverte à droite. En démonstration, tout est en lecture seule.
 */
function WorldDocuments({ project }: { project: WorldProject }) {
  const groups = new Map<string, typeof project.documents>();
  for (const d of project.documents) {
    const list = groups.get(d.kind) ?? [];
    list.push(d);
    groups.set(d.kind, list);
  }
  const [openId, setOpenId] = useState<string | null>(project.documents[0]?.id ?? null);
  const current = project.documents.find((d) => d.id === openId) ?? null;

  return (
    <div>
      <Intro>Devis, contrats et factures rangés dans leurs dossiers.</Intro>
      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <nav aria-label="Dossiers" className="rounded-md border border-hairline p-2">
          {[...groups.entries()].map(([kind, docs]) => (
            <div key={kind} className="mb-2 last:mb-0">
              <p className="flex items-center gap-2 px-2 py-1 text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                <Folder className="h-3.5 w-3.5" strokeWidth={1.75} />
                {kind} · {docs.length}
              </p>
              <ul>
                {docs.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(d.id)}
                      className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-[13px] transition ${
                        openId === d.id ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <FileText
                        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0">
                        <span className="block truncate">{d.title}</span>
                        <span className="block text-[12px] text-muted-foreground">{day(d.at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <article className="rounded-md border border-hairline p-4">
          {current ? (
            <>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {current.kind}
              </p>
              <h3 className="mt-1 text-[16px] font-medium">{current.title}</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {day(current.at)}
                {current.amountCents ? ` · ${euros(current.amountCents)}` : ""}
              </p>
              <div className="mt-4 grid aspect-[3/4] w-full place-items-center rounded-md bg-muted text-[12px] text-muted-foreground">
                Aperçu du document — démonstration
              </div>
            </>
          ) : (
            <p className="text-[13px] text-muted-foreground">Choisissez une pièce à gauche.</p>
          )}
        </article>
      </div>
    </div>
  );
}
