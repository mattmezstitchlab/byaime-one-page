const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** Only extract a token for same-origin API calls; never follow a pasted external URL. */
export function invitationTarget(
  value: string,
): { kind: "rsvp" | "collaboration" | "attestation"; token: string } | null {
  const v = value.trim();
  if (new RegExp(`^${uuid}$`, "i").test(v)) return { kind: "rsvp", token: v };
  try {
    const url = new URL(v, "https://byaime.fr");
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const match = url.pathname.match(
      new RegExp(`^/(rsvp|invite|attestation)/(${uuid})/?$`, "i"),
    );
    if (!match) return null;
    const kind = match[1].toLowerCase();
    return {
      kind: kind === "rsvp" ? "rsvp" : kind === "attestation" ? "attestation" : "collaboration",
      token: match[2],
    };
  } catch {
    return null;
  }
}
