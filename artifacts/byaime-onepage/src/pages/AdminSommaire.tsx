import { Link } from "wouter";
import { buildAdminPlan } from "@/lib/admin-plan";
import { sitePath } from "@/lib/site-path";
import { focusWorld } from "@/lib/world-focus";
import { useProject } from "@/store/project-store";
import type { WeddingNavigationItem } from "@/lib/wedding-navigation";

/*
 * Le back-office remis dans l'ordre : une page blanche, aérée, qui liste
 * tout le Monde comme un rétroplanning — concevoir, Jour J, après — avec une
 * ligne par entrée : son libellé, sa description, et un clic qui ouvre la
 * bonne vue dans le portail. Construite depuis `buildAdminPlan`, filtrée par rôle.
 *
 * C'est le lien « Admin » de la landing : il rend l'app lisible sans
 * avoir à découvrir les icônes du rail ni les dossiers.
 */

/* Couleurs et serif de titrage : les jetons `--agency-*` partagés avec la
 * vitrine et le bilan (index.css). Plus de constante recopiée ici. */

function openItem(item: WeddingNavigationItem): void {
  const destination = item.destination;
  if (destination.kind === "route") {
    window.location.assign(destination.href);
    return;
  }
  focusWorld({
    route: "/user-portal",
    ...(destination.kind === "panel" ? { panel: destination.panel } : { view: destination.view }),
  });
  window.location.assign(sitePath("/user-portal"));
}

export function AdminSommairePage() {
  const { currentRole } = useProject();
  const plan = buildAdminPlan(currentRole ?? "owner");

  return (
    <main data-testid="admin-page" className="min-h-[100dvh] bg-[var(--agency-paper)] px-6 py-16 text-[var(--agency-ink)] antialiased">
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <p className="text-[11px] uppercase tracking-[0.38em] text-[var(--agency-eyebrow)]">Back-office</p>
          <h1 className="agency-serif mt-6 text-4xl leading-tight sm:text-5xl">
            Le rétroplanning
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--agency-body)]">
            Tout le mariage, remis dans l&rsquo;ordre : chaque ligne ouvre la bonne vue du
            Monde. Rien n&rsquo;est caché, tout est expliqué.
          </p>
        </header>

        {plan.sections.map((section, sectionIndex) => (
          <section key={section.id} className="mt-16">
            <h2 className="text-[11px] uppercase tracking-[0.38em] text-[var(--agency-eyebrow)]">
              {sectionIndex + 1}. {section.title}
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--agency-body)]">{section.hint}</p>
            <ul className="mt-6">
              {section.items.map(item => (
                <li key={item.id} className="border-t border-[var(--agency-hairline)]">
                  <button
                    onClick={() => openItem(item)}
                    className="flex w-full items-baseline gap-5 py-4 text-left transition-colors hover:bg-[var(--agency-paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]"
                  >
                    <span className="text-[16px] text-[var(--agency-ink)]">{item.label}</span>
                    <span className="ml-auto max-w-[46%] text-right text-[12px] leading-snug text-[var(--agency-eyebrow)]">
                      {item.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-16">
          <h2 className="text-[11px] uppercase tracking-[0.38em] text-[var(--agency-eyebrow)]">Hors du Monde</h2>
          <ul className="mt-6">
            <li className="border-t border-[var(--agency-hairline)]">
              <Link href="/" className="flex w-full items-baseline gap-5 py-4 transition-colors hover:bg-[var(--agency-paper)]">
                <span className="text-[16px]">Accueil du site</span>
                <span className="ml-auto text-[12px] text-[var(--agency-eyebrow)]">La page unique que voient vos futurs mariés.</span>
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
