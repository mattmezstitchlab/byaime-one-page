import { Link } from "wouter";
import { buildAdminPlan } from "@/lib/admin-plan";
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

const serif = {
  fontFamily:
    "'Didot', 'Bodoni MT', 'Playfair Display', 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
} as const;

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
  window.location.assign("/user-portal");
}

export function AdminSommairePage() {
  const { currentRole } = useProject();
  const plan = buildAdminPlan(currentRole ?? "owner");

  return (
    <main data-testid="admin-page" className="min-h-[100dvh] bg-[#FBFAF8] px-6 py-16 text-[#171410] antialiased">
      <div className="mx-auto max-w-3xl">
        <header className="text-center">
          <p className="text-[11px] uppercase tracking-[0.38em] text-[#8A8375]">Back-office</p>
          <h1 className="mt-6 text-4xl leading-tight sm:text-5xl" style={serif}>
            Le rétroplanning
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[#6F6A61]">
            Tout le mariage, remis dans l&rsquo;ordre : chaque ligne ouvre la bonne vue du
            Monde. Rien n&rsquo;est caché, tout est expliqué.
          </p>
        </header>

        {plan.sections.map((section, sectionIndex) => (
          <section key={section.id} className="mt-16">
            <h2 className="text-[11px] uppercase tracking-[0.38em] text-[#8A8375]">
              {sectionIndex + 1}. {section.title}
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[#6F6A61]">{section.hint}</p>
            <ul className="mt-6">
              {section.items.map(item => (
                <li key={item.id} className="border-t border-[#E6E1D8]">
                  <button
                    onClick={() => openItem(item)}
                    className="flex w-full items-baseline gap-5 py-4 text-left transition-colors hover:bg-[#F5F2EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171410]"
                  >
                    <span className="text-[16px] text-[#171410]">{item.label}</span>
                    <span className="ml-auto max-w-[46%] text-right text-[12px] leading-snug text-[#8A8375]">
                      {item.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-16">
          <h2 className="text-[11px] uppercase tracking-[0.38em] text-[#8A8375]">Hors du Monde</h2>
          <ul className="mt-6">
            <li className="border-t border-[#E6E1D8]">
              <Link href="/profile" className="flex w-full items-baseline gap-5 py-4 transition-colors hover:bg-[#F5F2EC]">
                <span className="text-[16px]">Bilan et page des mariés</span>
                <span className="ml-auto text-[12px] text-[#8A8375]">Le livrable vertical, et son partage.</span>
              </Link>
            </li>
            <li className="border-t border-[#E6E1D8]">
              <Link href="/agence" className="flex w-full items-baseline gap-5 py-4 transition-colors hover:bg-[#F5F2EC]">
                <span className="text-[16px]">Vitrine de l&rsquo;agence</span>
                <span className="ml-auto text-[12px] text-[#8A8375]">Ce que voient vos futurs mariés.</span>
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
