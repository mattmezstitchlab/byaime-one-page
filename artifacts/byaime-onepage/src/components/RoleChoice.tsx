import { useState, type ReactNode } from "react";
import { ArrowLeft, Heart, Mail, Store, Users } from "lucide-react";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/*
 * Le choix de rôle arrive APRÈS la confirmation de la carte — c'est un
 * routage, pas un onboarding : chaque porte mène à un mécanisme qui existe
 * déjà (Monde, lien RSVP, lien prestataire, espace agence). Invité et
 * prestataire n'ont rien à saisir ici : ils vivent derrière un lien personnel,
 * on le leur dit au lieu d'inventer un parcours.
 */
export function RoleChoice({ signedIn, onBack }: { signedIn: boolean; onBack: () => void }) {
  const { t } = useI18n();
  const [, navigate] = useLocation();
  const [note, setNote] = useState<string | null>(null);

  const pick = (role: "couple" | "guest" | "provider" | "planner") => {
    setNote(null);
    trackEvent("role_chosen", { role, signedIn });
    switch (role) {
      case "couple":
        navigate(signedIn ? "/user-portal" : "/creation");
        return;
      case "planner":
        navigate(signedIn ? "/admin" : "/connexion?returnTo=%2Fadmin");
        return;
      case "guest":
        setNote(t("role.guest.note"));
        return;
      case "provider":
        setNote(t("role.provider.note"));
        return;
    }
  };

  return (
    <div
      data-testid="role-choice"
      className="overflow-hidden rounded-[2rem] border border-white/15 bg-[#171410] p-6 text-white sm:p-8"
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[12.5px] text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {t("role.back")}
      </button>
      <h3 className="mt-3 text-[20px] font-medium">{t("role.title")}</h3>
      <p className="mt-2 text-[13.5px] font-light leading-relaxed text-white/65">{t("role.subtitle")}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <RoleCard
          testId="role-couple"
          icon={<Heart className="h-4 w-4" aria-hidden />}
          label={t("role.couple")}
          description={t("role.couple.desc")}
          onClick={() => pick("couple")}
        />
        <RoleCard
          testId="role-guest"
          icon={<Mail className="h-4 w-4" aria-hidden />}
          label={t("role.guest")}
          description={t("role.guest.desc")}
          onClick={() => pick("guest")}
        />
        <RoleCard
          testId="role-provider"
          icon={<Store className="h-4 w-4" aria-hidden />}
          label={t("role.provider")}
          description={t("role.provider.desc")}
          onClick={() => pick("provider")}
        />
        <RoleCard
          testId="role-planner"
          icon={<Users className="h-4 w-4" aria-hidden />}
          label={t("role.planner")}
          description={t("role.planner.desc")}
          onClick={() => pick("planner")}
        />
      </div>

      {note && (
        <p role="status" data-testid="role-note" className="mt-5 rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-[13px] leading-relaxed text-white/75">
          {note}
        </p>
      )}
    </div>
  );
}

function RoleCard({
  testId,
  icon,
  label,
  description,
  onClick,
}: {
  testId: string;
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="rounded-2xl border border-white/15 bg-white/[0.05] p-4 text-left transition hover:border-white/40 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      <span className="inline-flex items-center gap-2 text-[14.5px] font-medium">
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/[0.07]">
          {icon}
        </span>
        {label}
      </span>
      <span className={cn("mt-2 block text-[12.5px] leading-relaxed text-white/55")}>{description}</span>
    </button>
  );
}
