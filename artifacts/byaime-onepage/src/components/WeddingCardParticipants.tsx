import { professionalConfig } from "@workspace/aime-domain";
import { useI18n } from "@/lib/i18n";
import type { WorldProject } from "@/lib/types";

/** Read model from membership → card. No local participant profile copies. */
export function WeddingCardParticipants({
  participants,
}: {
  participants: NonNullable<WorldProject["cardParticipants"]>;
}) {
  const { t } = useI18n();
  const rsvpLabel: Record<string, string> = {
    present: t("cardBanner.present"),
    absent: t("cardBanner.absent"),
    peut_etre: t("cardBanner.maybe"),
    en_attente: t("cardBanner.pending"),
  };
  if (!participants.length) return null;
  return (
    <details className="mx-4 mt-3 rounded-xl border border-foreground/15 p-3 text-sm">
      <summary className="cursor-pointer">
        {t("cardBanner.title", { count: participants.length })}
      </summary>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {participants.map(
          ({ userId, card, participation: p, functioning = [] }) => (
            <li key={userId} className="flex items-start gap-3">
              {card.photoUrl && (
                <img
                  src={card.photoUrl}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-medium">
                  {card.firstName} {card.lastName}
                </p>
                <p>
                  {card.profession} · {p.roles.join(", ")}
                </p>
                <p className="text-xs opacity-70">
                  {rsvpLabel[p.rsvp]}{" "}
                  · {p.moments.join(", ")}
                </p>
                {functioning.map((f, i) => (
                  <details key={`${f.profileId}:${i}`} className="mt-1 text-xs">
                    <summary className="cursor-pointer">
                      {t("cardBanner.functioning", { profession: f.profession })}
                    </summary>
                    {Object.entries(f.parameters).map(([key, value]) => (
                      <p key={key}>
                        {professionalConfig(f.profession).fields.find(
                          (field) => field.key === key,
                        )?.label ?? key}{" "}
                        : {value}
                      </p>
                    ))}
                    <p>{t("cardBanner.availability", { value: f.availability })}</p>
                    {f.errors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </details>
                ))}
                {p.arrival && (
                  <p className="text-xs">
                    {new Date(p.arrival).toLocaleString()} →{" "}
                    {new Date(p.departure).toLocaleString()}
                  </p>
                )}
              </div>
            </li>
          ),
        )}
      </ul>
    </details>
  );
}
