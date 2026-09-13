import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import {
  dispooComposerUrl,
  dispooSearchUrl,
  type DispooPlacement,
} from "@/lib/partner-links";

/**
 * Passerelle vers dispoo : un bandeau aéré (eyebrow, titre, une phrase, un
 * appel) qui envoie vers la recherche de professionnels ou vers le compositeur
 * de journée, avec les UTM stables du pont byaime ↔ dispoo. Le clic est mesuré
 * pour que chaque emplacement prouve sa valeur des deux côtés.
 */
export function DispooBanner({
  variant,
  placement,
  query,
  city,
}: {
  variant: "providers" | "composer";
  placement: DispooPlacement;
  query?: string;
  city?: string;
}) {
  const { t } = useI18n();
  const href = variant === "providers"
    ? dispooSearchUrl(placement, { query, city })
    : dispooComposerUrl(placement);

  return (
    <section
      data-testid={`dispoo-banner-${variant}`}
      className="overflow-hidden rounded-3xl border border-border bg-foreground/[0.03] p-6 md:p-8"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-foreground/50">
        {t("dispoo.banner.eyebrow")}
      </p>
      <h2 className="mt-3 font-display text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        {t(`dispoo.banner.${variant}.title`)}
      </h2>
      <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-foreground/65">
        {t(`dispoo.banner.${variant}.text`)}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        data-testid={`dispoo-banner-${variant}-cta`}
        onClick={() => trackEvent("dispoo_outbound_click", { placement, variant })}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t(`dispoo.banner.${variant}.cta`)}
        <ArrowUpRight aria-hidden className="h-4 w-4" />
      </a>
    </section>
  );
}
