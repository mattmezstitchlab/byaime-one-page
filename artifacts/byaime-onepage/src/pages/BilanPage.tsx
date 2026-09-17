import { useParams } from "wouter";
import { getGetPublicReportQueryKey, useGetPublicReport } from "@workspace/api-client-react";
import { CoupleReport } from "@/components/CoupleReport";
import { SiteFooter } from "@/components/SiteChrome";
import { AGENCY_IDENTITY } from "@/lib/agency-identity";
import { useRouteMeta } from "@/lib/page-meta";
import { BODY, EYEBROW, LEAD, TITLE } from "@/lib/site-design";
import { cn } from "@/lib/utils";

/*
 * L'URL que le planner envoie aux mariés : /bilan/:projectId.
 *
 * Page publique, autonome, même blanc que la vitrine et le rapport. Elle ne
 * montre que ce que le serveur a projeté — et le serveur ne projette que si
 * `publicProfile.shareReport` est posé : ici, on ne décide rien, on affiche.
 * Pas de partage → une page vide qui ne révèle rien du mariage.
 *
 * `noindex, nofollow` : cette URL est un lien que le planner envoie à UN couple,
 * pas une page à faire indexer. Elle porte le budget, les invités et les
 * documents d'un mariage réel ; `robots.txt` l'interdit aussi aux robots
 * (§2.10 du plan). La directive est réécrite à chaque changement de route par
 * `applyRouteMeta`, elle ne déborde donc jamais sur la vitrine.
 */

const { brand } = AGENCY_IDENTITY;

export function BilanPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId || "";
  const { data, isLoading } = useGetPublicReport(projectId, {
    query: { queryKey: getGetPublicReportQueryKey(projectId), retry: false, enabled: Boolean(projectId) },
  });

  useRouteMeta({
    title: data?.title ? `${data.title} — ${brand}` : `Bilan — ${brand}`,
    description: "Le bilan de votre mariage, présenté automatiquement : déroulé du Jour J, budget, invités, tâches et documents.",
    robots: "noindex, nofollow",
  });

  return (
    <main data-testid="bilan-page" className="min-h-[100dvh] bg-[var(--agency-paper)] text-[var(--agency-ink)] antialiased">
      {isLoading ? (
        <p className={cn(EYEBROW, "flex min-h-[100dvh] items-center justify-center")}>
          Ouverture du bilan
        </p>
      ) : data ? (
        <CoupleReport
          rapport={data.rapport}
          title={data.title}
          subtitle={data.subtitle}
          currency={data.currency}
        />
      ) : (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
          <p className={cn(EYEBROW, "tracking-[0.38em]")}>{brand}</p>
          <h1 className={cn(TITLE, "mt-6 text-3xl sm:text-4xl")}>
            Ce bilan n&rsquo;est pas partagé.
          </h1>
          <p className={cn(LEAD, "mt-5 max-w-md text-sm", BODY)}>
            Votre organisateur n&rsquo;a pas encore ouvert cette page.
            Rien de ce mariage n&rsquo;est visible ici.
          </p>
        </div>
      )}
      {/*
        Une URL publique porte l'identité de l'agence et ses textes légaux. Pas
        de barre de navigation : le bilan s'ouvre depuis un lien envoyé aux
        mariés, il n'est pas une page à parcourir.
      */}
      <SiteFooter />
    </main>
  );
}
