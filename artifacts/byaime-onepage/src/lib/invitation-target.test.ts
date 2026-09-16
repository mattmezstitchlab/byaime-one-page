import { expect, it } from "vitest";
import { invitationTarget } from "./invitation-target";
const token = "11111111-2222-4333-8444-555555555555";
it("extracts only a known invitation path, never an external redirect or a guessed name", () => {
  expect(invitationTarget(` https://byaime.fr/rsvp/${token} `)).toEqual({
    kind: "rsvp",
    token,
  });
  expect(invitationTarget(`/invite/${token}`)).toEqual({
    kind: "collaboration",
    token,
  });
  expect(invitationTarget(token)).toEqual({ kind: "rsvp", token });
  for (const v of [
    "Jean Dupont",
    "javascript:alert(1)",
    `/admin/${token}`,
    `https://byaime.fr/rsvp/${token}/evil`,
    "",
  ])
    expect(invitationTarget(v)).toBeNull();
});
