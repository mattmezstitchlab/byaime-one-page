const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** Only extract a token for same-origin API calls; never follow a pasted external URL. */
export function invitationTarget(
  value: string,
): { kind: "rsvp" | "collaboration"; token: string } | null {
  const v = value.trim();
  if (new RegExp(`^${uuid}$`, "i").test(v)) return { kind: "rsvp", token: v };
  try {
    const url = new URL(v, "https://byaime.fr");
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const match = url.pathname.match(
      new RegExp(`^/(rsvp|invite)/(${uuid})/?$`, "i"),
    );
    return match
      ? {
          kind: match[1].toLowerCase() === "rsvp" ? "rsvp" : "collaboration",
          token: match[2],
        }
      : null;
  } catch {
    return null;
  }
}
