import { useParams } from "wouter";
import { getGetPublicReportQueryKey, useGetPublicReport } from "@workspace/api-client-react";
import { CoupleReport } from "@/components/CoupleReport";

/*
 * L'URL que le planner envoie aux mariés : /bilan/:projectId.
 *
 * Page publique, autonome, même ivoire que la vitrine et le rapport. Elle ne
 * montre que ce que le serveur a projeté — et le serveur ne projette que si
 * `publicProfile.shareReport` est posé : ici, on ne décide rien, on affiche.
 * Pas de partage → une page vide qui ne révèle rien du mariage.
 */

const serif = {
  fontFamily:
    "'Didot', 'Bodoni MT', 'Playfair Display', 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
} as const;

export function BilanPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId || "";
  const { data, isLoading } = useGetPublicReport(projectId, {
    query: { queryKey: getGetPublicReportQueryKey(projectId), retry: false, enabled: Boolean(projectId) },
  });

  return (
    <main data-testid="bilan-page" className="min-h-[100dvh] bg-[#FFFFFF] text-[#171410] antialiased">
      {isLoading ? (
        <p className="flex min-h-[100dvh] items-center justify-center text-[11px] uppercase tracking-[0.3em] text-[#8A8375]">
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
          <p className="text-[11px] uppercase tracking-[0.38em] text-[#8A8375]">La cerise sur le gâteau</p>
          <h1 className="mt-6 text-3xl text-[#171410] sm:text-4xl" style={serif}>
            Ce bilan n&rsquo;est pas partagé.
          </h1>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-[#6F6A61]">
            Votre wedding architect n&rsquo;a pas encore ouvert cette page.
            Rien de ce mariage n&rsquo;est visible ici.
          </p>
        </div>
      )}
    </main>
  );
}
