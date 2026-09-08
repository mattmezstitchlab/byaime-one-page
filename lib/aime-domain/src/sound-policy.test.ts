import { describe, expect, it } from "vitest";
import {
  evaluateSoundAction,
  evaluateSoundPublication,
  type SoundAuthenticatedPrincipal,
  type SoundAuthorizationDirectory,
  type SoundDecisionScope,
} from "./sound-authorization";
import type {
  SoundCollaborationSpace,
  SoundDecision,
  SoundDecisionEvidence,
  SoundPublicationRecord,
  SoundSpaceMember,
  SoundSpaceVote,
  SoundUsageDecision,
} from "./sound-policy";

const NOW = "2026-09-08T00:00:00.000Z";
const contribution = {
  kind: "sound_contribution" as const,
  id: "contribution-1",
};
const memberRef = (id: string) => ({
  kind: "sound_space_member" as const,
  id,
});
const principal = (cardId: string): SoundAuthenticatedPrincipal => ({
  authenticationSubject: `auth:${cardId}`,
  authenticationSessionId: `session:${cardId}`,
  authenticatedAt: NOW,
});

type DirectoryFixtures = {
  space: SoundCollaborationSpace;
  members: readonly SoundSpaceMember[];
  evidence?: SoundDecisionEvidence;
  publication?: SoundPublicationRecord;
  decision?: SoundDecision;
  usageDecision?: SoundUsageDecision;
};

function directoryFor(
  fixtures: DirectoryFixtures,
): SoundAuthorizationDirectory {
  const matchingMember = (
    spaceId: string,
    cardId: string,
  ): SoundSpaceMember | null =>
    fixtures.members.find(
      (member) =>
        member.space.id === spaceId &&
        member.card.id === cardId &&
        member.status === "active",
    ) ?? null;

  return {
    verifyAndResolvePrincipalCard: async (value) => {
      if (!value.authenticationSubject.startsWith("auth:")) return null;
      return {
        kind: "card",
        id: value.authenticationSubject.slice("auth:".length),
      };
    },
    getSpace: async (reference) =>
      reference.id === fixtures.space.id ? fixtures.space : null,
    findActiveMember: async (space, card) =>
      matchingMember(space.id, card.id),
    resolveCapabilityContext: async () => ({}),
    findMemberAtRevision: async (space, card) =>
      matchingMember(space.id, card.id),
    listActiveMembersAtRevision: async (space) =>
      fixtures.members.filter(
        (member) =>
          member.space.id === space.id && member.status === "active",
      ),
    getPersistedDecisionEvidence: async () => fixtures.evidence ?? null,
    getPublicationRecord: async (reference) =>
      fixtures.publication?.id === reference.id
        ? fixtures.publication
        : null,
    getDecision: async (reference) =>
      fixtures.decision?.id === reference.id ? fixtures.decision : null,
    getUsageDecision: async (reference) =>
      fixtures.usageDecision?.id === reference.id
        ? fixtures.usageDecision
        : null,
  };
}

const privateSpace: SoundCollaborationSpace = {
  id: "private-space",
  home: { kind: "card", id: "card-1" },
  title: "Mémoire privée",
  purpose: "archive",
  mode: "private",
  policy: {
    visibility: "private",
    joining: "owner_only",
    contribution: "owner_only",
    decision: "owner",
    publication: "disabled",
    actionsByRole: {
      owner: ["sound.view", "sound.contribute", "sound.publish"],
      contributor: ["sound.view", "sound.contribute"],
    },
    requiresReasonForRejection: true,
  },
  policyVersion: 1,
  policyFingerprint: "private-policy-v1",
  currentPartitionRevision: 1,
  createdBy: { kind: "card", id: "card-1" },
  createdAt: NOW,
  updatedAt: NOW,
};

const privateOwner: SoundSpaceMember = {
  id: "private-owner",
  space: { kind: "sound_space", id: privateSpace.id },
  card: { kind: "card", id: "card-1" },
  role: "owner",
  status: "active",
};

describe("trusted sound membership authorization", () => {
  it("lets the resolved private owner view without a world role", async () => {
    const decision = await evaluateSoundAction(
      {
        action: "sound.view",
        space: { kind: "sound_space", id: privateSpace.id },
        principal: principal("card-1"),
      },
      directoryFor({ space: privateSpace, members: [privateOwner] }),
    );
    expect(decision.allowed).toBe(true);
  });

  it("rejects a forged principal that has no persisted membership", async () => {
    const decision = await evaluateSoundAction(
      {
        action: "sound.view",
        space: { kind: "sound_space", id: privateSpace.id },
        principal: principal("attacker"),
      },
      directoryFor({ space: privateSpace, members: [privateOwner] }),
    );
    expect(decision.allowed).toBe(false);
  });

  it("rejects a membership resolver returning a member from another space", async () => {
    const directory = directoryFor({
      space: privateSpace,
      members: [privateOwner],
    });
    const forgedDirectory: SoundAuthorizationDirectory = {
      ...directory,
      findActiveMember: async () => ({
        ...privateOwner,
        space: { kind: "sound_space", id: "another-space" },
      }),
    };
    const decision = await evaluateSoundAction(
      {
        action: "sound.view",
        space: { kind: "sound_space", id: privateSpace.id },
        principal: principal("card-1"),
      },
      forgedDirectory,
    );
    expect(decision.allowed).toBe(false);
  });

  it("does not let actionsByRole override owner-only contribution", async () => {
    const contributor: SoundSpaceMember = {
      id: "private-contributor",
      space: { kind: "sound_space", id: privateSpace.id },
      card: { kind: "card", id: "card-2" },
      role: "contributor",
      status: "active",
    };
    const decision = await evaluateSoundAction(
      {
        action: "sound.contribute",
        space: { kind: "sound_space", id: privateSpace.id },
        principal: principal("card-2"),
      },
      directoryFor({
        space: privateSpace,
        members: [privateOwner, contributor],
      }),
    );
    expect(decision.allowed).toBe(false);
  });
});

type CollectiveDecisionRule =
  | { decision: "threshold_vote"; voteThreshold: number }
  | { decision: "consensus" }
  | {
      decision: "external_authority";
      externalAuthority: { kind: "card"; id: string };
    };

function collectiveSpace(
  rule: CollectiveDecisionRule,
): SoundCollaborationSpace {
  return {
    id: "collective-space",
    home: { kind: "world", id: "world-1" },
    title: "Partition collective",
    purpose: "curation",
    mode: "collaborative",
    policy: {
      visibility: "world",
      joining: "request",
      contribution: "approved_members",
      publication: "explicit_decision",
      actionsByRole: {
        owner: ["sound.decide"],
        reviewer: ["sound.view", "sound.vote", "sound.decide"],
        contributor: ["sound.vote"],
      },
      requiresReasonForRejection: true,
      ...rule,
    },
    policyVersion: 1,
    policyFingerprint: "collective-policy-v1",
    currentPartitionRevision: 3,
    createdBy: { kind: "card", id: "card-1" },
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const decisionScope: SoundDecisionScope = {
  contribution,
  partitionRevision: 3,
};

const reviewer = (
  id: string,
  cardId: string,
  role: SoundSpaceMember["role"] = "reviewer",
): SoundSpaceMember => ({
  id,
  space: { kind: "sound_space", id: "collective-space" },
  card: { kind: "card", id: cardId },
  role,
  status: "active",
});

const persistedVote = (
  memberId: string,
  value: SoundSpaceVote["value"],
  overrides: Partial<SoundSpaceVote> = {},
): SoundSpaceVote => ({
  space: { kind: "sound_space", id: "collective-space" },
  contribution,
  partitionRevision: 3,
  member: memberRef(memberId),
  value,
  castAt: NOW,
  ...overrides,
});

describe("persisted collective decision evidence", () => {
  it("rejects forged votes and accepts the real threshold snapshot", async () => {
    const space = collectiveSpace({
      decision: "threshold_vote",
      voteThreshold: 2 / 3,
    });
    const members = [
      reviewer("reviewer-1", "card-1"),
      reviewer("reviewer-2", "card-2"),
      reviewer("reviewer-3", "card-3"),
    ];
    const request = {
      action: "sound.decide" as const,
      space: { kind: "sound_space" as const, id: space.id },
      principal: principal("card-1"),
      decision: decisionScope,
    };
    const forgedEvidence: SoundDecisionEvidence = {
      kind: "threshold_vote",
      space: request.space,
      contribution,
      partitionRevision: 3,
      votes: [
        persistedVote("reviewer-1", "approve"),
        persistedVote("forged-member", "approve"),
      ],
      capturedAt: NOW,
    };
    expect(
      (
        await evaluateSoundAction(
          request,
          directoryFor({ space, members, evidence: forgedEvidence }),
        )
      ).allowed,
    ).toBe(false);

    const validEvidence: SoundDecisionEvidence = {
      ...forgedEvidence,
      votes: [
        persistedVote("reviewer-1", "approve"),
        persistedVote("reviewer-2", "approve"),
      ],
    };
    expect(
      (
        await evaluateSoundAction(
          request,
          directoryFor({ space, members, evidence: validEvidence }),
        )
      ).allowed,
    ).toBe(true);
  });

  it("rejects cross-space or cross-revision votes", async () => {
    const space = collectiveSpace({
      decision: "threshold_vote",
      voteThreshold: 1 / 2,
    });
    const members = [
      reviewer("reviewer-1", "card-1"),
      reviewer("reviewer-2", "card-2"),
    ];
    const evidence: SoundDecisionEvidence = {
      kind: "threshold_vote",
      space: { kind: "sound_space", id: space.id },
      contribution,
      partitionRevision: 3,
      votes: [
        persistedVote("reviewer-1", "approve", {
          partitionRevision: 2,
        }),
      ],
      capturedAt: NOW,
    };
    const result = await evaluateSoundAction(
      {
        action: "sound.decide",
        space: { kind: "sound_space", id: space.id },
        principal: principal("card-1"),
        decision: decisionScope,
      },
      directoryFor({ space, members, evidence }),
    );
    expect(result.allowed).toBe(false);
  });

  it("requires the deciding member to be eligible to vote", async () => {
    const space = collectiveSpace({
      decision: "threshold_vote",
      voteThreshold: 1,
    });
    const owner = reviewer("owner-1", "owner-card", "owner");
    const voter = reviewer("voter-1", "voter-card", "contributor");
    const evidence: SoundDecisionEvidence = {
      kind: "threshold_vote",
      space: { kind: "sound_space", id: space.id },
      contribution,
      partitionRevision: 3,
      votes: [persistedVote("voter-1", "approve")],
      capturedAt: NOW,
    };
    const result = await evaluateSoundAction(
      {
        action: "sound.decide",
        space: { kind: "sound_space", id: space.id },
        principal: principal("owner-card"),
        decision: decisionScope,
      },
      directoryFor({ space, members: [owner, voter], evidence }),
    );
    expect(result.allowed).toBe(false);
  });

  it("requires every eligible member and no objection for consensus", async () => {
    const space = collectiveSpace({ decision: "consensus" });
    const members = [
      reviewer("reviewer-1", "card-1"),
      reviewer("reviewer-2", "card-2"),
    ];
    const baseEvidence: SoundDecisionEvidence = {
      kind: "consensus",
      space: { kind: "sound_space", id: space.id },
      contribution,
      partitionRevision: 3,
      responses: [
        persistedVote("reviewer-1", "approve"),
        persistedVote("reviewer-2", "object"),
      ],
      capturedAt: NOW,
    };
    const request = {
      action: "sound.decide" as const,
      space: { kind: "sound_space" as const, id: space.id },
      principal: principal("card-1"),
      decision: decisionScope,
    };
    expect(
      (
        await evaluateSoundAction(
          request,
          directoryFor({ space, members, evidence: baseEvidence }),
        )
      ).allowed,
    ).toBe(false);
    expect(
      (
        await evaluateSoundAction(
          request,
          directoryFor({
            space,
            members,
            evidence: {
              ...baseEvidence,
              responses: [
                persistedVote("reviewer-1", "approve"),
                persistedVote("reviewer-2", "approve"),
              ],
            },
          }),
        )
      ).allowed,
    ).toBe(true);
  });

  it("accepts only the persisted configured external authority", async () => {
    const space = collectiveSpace({
      decision: "external_authority",
      externalAuthority: { kind: "card", id: "authority-card" },
    });
    const wrong = reviewer("reviewer-1", "card-1");
    const authority = reviewer("authority-member", "authority-card");
    const evidence: SoundDecisionEvidence = {
      kind: "external_authority",
      space: { kind: "sound_space", id: space.id },
      contribution,
      partitionRevision: 3,
      authority: { kind: "card", id: "authority-card" },
      evidence: {
        kind: "document",
        label: "Mandat vérifié",
        reference: "document:mandate-1",
      },
      verifiedAt: NOW,
    };
    const request = {
      action: "sound.decide" as const,
      space: { kind: "sound_space" as const, id: space.id },
      decision: decisionScope,
    };
    expect(
      (
        await evaluateSoundAction(
          { ...request, principal: principal("card-1") },
          directoryFor({
            space,
            members: [wrong, authority],
            evidence,
          }),
        )
      ).allowed,
    ).toBe(false);
    expect(
      (
        await evaluateSoundAction(
          { ...request, principal: principal("authority-card") },
          directoryFor({
            space,
            members: [wrong, authority],
            evidence,
          }),
        )
      ).allowed,
    ).toBe(true);
  });
});

const publicationSpace: SoundCollaborationSpace = {
  id: "publication-space",
  home: { kind: "world", id: "world-1" },
  title: "Publication approuvée",
  purpose: "publication",
  mode: "collaborative",
  policy: {
    visibility: "world",
    joining: "request",
    contribution: "approved_members",
    decision: "owner",
    publication: "explicit_decision",
    actionsByRole: {
      owner: ["sound.view", "sound.decide", "sound.publish"],
      moderator: ["sound.publish"],
    },
    requiresReasonForRejection: true,
  },
  policyVersion: 1,
  policyFingerprint: "publication-policy-v1",
  currentPartitionRevision: 2,
  createdBy: { kind: "card", id: "owner-card" },
  createdAt: NOW,
  updatedAt: NOW,
};
const publicationOwner: SoundSpaceMember = {
  id: "publication-owner",
  space: { kind: "sound_space", id: publicationSpace.id },
  card: { kind: "card", id: "owner-card" },
  role: "owner",
  status: "active",
};
const publicationModerator: SoundSpaceMember = {
  id: "publication-moderator",
  space: { kind: "sound_space", id: publicationSpace.id },
  card: { kind: "card", id: "moderator-card" },
  role: "moderator",
  status: "active",
};
const publicationDecision: SoundDecision = {
  id: "decision-1",
  space: { kind: "sound_space", id: publicationSpace.id },
  contribution,
  outcome: "approved",
  decidedBy: { kind: "card", id: publicationOwner.card.id },
  policySnapshot: publicationSpace.policy,
  policyFingerprint: publicationSpace.policyFingerprint,
  authorizationEvidence: {
    kind: "owner",
    space: { kind: "sound_space", id: publicationSpace.id },
    contribution,
    partitionRevision: 2,
    member: memberRef(publicationOwner.id),
  },
  partitionRevision: 2,
  decidedAt: NOW,
};
const publicationUsageDecision: SoundUsageDecision = {
  id: "usage-1",
  subject: { kind: "sound_item", id: "sound-1" },
  usage: "publish",
  context: {
    actor: { kind: "card", id: publicationOwner.card.id },
    world: { kind: "world", id: "world-1" },
    audience: "public",
  },
  outcome: "allowed",
  reasons: ["Droits et consentements vérifiés."],
  consideredRights: [],
  consideredConsents: [],
  consideredProviderPolicies: [],
  status: "active",
  decidedAt: NOW,
  validUntil: "2026-12-31T23:59:59.999Z",
  version: 1,
};
const publicationRecord: SoundPublicationRecord = {
  id: "publication-1",
  space: { kind: "sound_space", id: publicationSpace.id },
  subject: { kind: "sound_item", id: "sound-1" },
  partitionRevision: 2,
  policyFingerprint: publicationSpace.policyFingerprint,
  approval: {
    decision: { kind: "sound_decision", id: publicationDecision.id },
    outcome: "approved",
    decidedAt: NOW,
  },
  authorization: {
    usageDecision: {
      kind: "sound_usage_decision",
      id: publicationUsageDecision.id,
    },
    usage: "publish",
    decisionOutcome: "allowed",
    decisionStatus: "active",
    contextFingerprint: "publication-context",
    validationStage: "publication",
    validatedAt: NOW,
    validUntil: "2026-12-31T23:59:59.999Z",
  },
  exposure: "metadata_only",
  dataLevel: "public",
  fieldAllowlist: ["title", "kind"],
  status: "active",
  publishedBy: { kind: "card", id: publicationOwner.card.id },
  publishedAt: NOW,
};
const publicationRequest = {
  record: {
    kind: "sound_publication_record" as const,
    id: publicationRecord.id,
  },
  expectedSubject: publicationRecord.subject,
  expectedPartitionRevision: 2,
  expectedContextFingerprint: "publication-context",
  at: "2026-10-01T00:00:00.000Z",
};

describe("trusted publication authorization", () => {
  const fixtures: DirectoryFixtures = {
    space: publicationSpace,
    members: [publicationOwner, publicationModerator],
    publication: publicationRecord,
    decision: publicationDecision,
    usageDecision: publicationUsageDecision,
  };

  it("refuses a publishing role without a persisted publication record", async () => {
    const result = await evaluateSoundAction(
      {
        action: "sound.publish",
        space: { kind: "sound_space", id: publicationSpace.id },
        principal: principal(publicationOwner.card.id),
      },
      directoryFor(fixtures),
    );
    expect(result.allowed).toBe(false);
  });

  it("rejects a different authenticated member publishing the owner's record", async () => {
    const result = await evaluateSoundAction(
      {
        action: "sound.publish",
        space: { kind: "sound_space", id: publicationSpace.id },
        principal: principal(publicationModerator.card.id),
        publication: publicationRequest,
      },
      directoryFor(fixtures),
    );
    expect(result.allowed).toBe(false);
  });

  it("allows only the resolved publisher with matching persisted decisions", async () => {
    const result = await evaluateSoundAction(
      {
        action: "sound.publish",
        space: { kind: "sound_space", id: publicationSpace.id },
        principal: principal(publicationOwner.card.id),
        publication: publicationRequest,
      },
      directoryFor(fixtures),
    );
    expect(result).toMatchObject({
      allowed: true,
      requiresConfirmation: true,
    });
  });

  it("rejects expired, mismatched, or fabricated publication evidence", async () => {
    expect(
      (
        await evaluateSoundPublication(
          { kind: "sound_space", id: publicationSpace.id },
          { ...publicationRequest, at: "2027-01-01T00:00:00.000Z" },
          directoryFor(fixtures),
        )
      ).allowed,
    ).toBe(false);
    expect(
      (
        await evaluateSoundPublication(
          { kind: "sound_space", id: publicationSpace.id },
          { ...publicationRequest, expectedPartitionRevision: 1 },
          directoryFor(fixtures),
        )
      ).allowed,
    ).toBe(false);
    expect(
      (
        await evaluateSoundPublication(
          { kind: "sound_space", id: publicationSpace.id },
          publicationRequest,
          directoryFor({
            ...fixtures,
            decision: {
              ...publicationDecision,
              authorizationEvidence: {
                ...publicationDecision.authorizationEvidence,
                member: memberRef("forged-member"),
              },
            },
          }),
        )
      ).allowed,
    ).toBe(false);
  });
});