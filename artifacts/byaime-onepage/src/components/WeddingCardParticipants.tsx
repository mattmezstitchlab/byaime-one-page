import { professionalConfig } from "@workspace/aime-domain";
import type { WorldProject } from "@/lib/types";

/** Read model from membership → card. No local participant profile copies. */
export function WeddingCardParticipants({
  participants,
}: {
  participants: NonNullable<WorldProject["cardParticipants"]>;
}) {
  if (!participants.length) return null;
  return (
    <details className="mx-4 mt-3 rounded-xl border border-foreground/15 p-3 text-sm">
      <summary className="cursor-pointer">
        Cartes liées à ce mariage ({participants.length})
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
                  {
                    {
                      present: "Présent",
                      absent: "Absent",
                      peut_etre: "Peut-être",
                      en_attente: "À confirmer",
                    }[p.rsvp]
                  }{" "}
                  · {p.moments.join(", ")}
                </p>
                {functioning.map((f, i) => (
                  <details key={`${f.profileId}:${i}`} className="mt-1 text-xs">
                    <summary className="cursor-pointer">
                      Fonctionnement · {f.profession}
                    </summary>
                    {Object.entries(f.parameters).map(([key, value]) => (
                      <p key={key}>
                        {professionalConfig(f.profession).fields.find(
                          (field) => field.key === key,
                        )?.label ?? key}{" "}
                        : {value}
                      </p>
                    ))}
                    <p>Disponibilité : {f.availability}</p>
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
