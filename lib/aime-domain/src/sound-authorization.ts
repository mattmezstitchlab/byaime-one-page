import { evaluateCapability } from "./capabilities";
import type {
  CapabilityContext,
  CapabilityDecision,
  DataLevel,
  UniversalReference,
} from "./types";
import type {
  SoundAction,
  SoundCollaborationSpace,
  SoundContributionReference,
  SoundDecision,
  SoundDecisionEvidence,
  SoundPublicationRecord,
  SoundPublicationRecordReference,
  SoundPublicationSubjectReference,
  SoundSpaceMember,
  SoundSpaceMemberReference,
  SoundSpaceReference,
  SoundUsageDecision,
  SoundUsageDecisionReference,
} from "./sound-policy";

const allow = (
  reason: string,
  requiresConfirmation = false,
): CapabilityDecision => ({
  allowed: true,
  reason,
  requiresConfirmation: requiresConfirmation || undefined,
});

const deny = (reason: string): CapabilityDecision => ({
  allowed: false,
  reason,
});

export type SoundAuthenticatedPrincipal = {
  authenticationSubject: string;
  authenticationSessionId: string;
  authenticatedAt: string;
};

export type SoundDecisionScope = {
  contribution: SoundContributionReference;
  partitionRevision: number;
};

export type SoundPublicationValidationRequest = {
  record: SoundPublicationRecordReference;
  expectedSubject: SoundPublicationSubjectReference;
  expectedPartitionRevision: number;
  expectedContextFingerprint: string;
  at: string;
};

export type SoundActionAuthorizationRequest = {
  action: SoundAction;
  space: SoundSpaceReference;
  principal: SoundAuthenticatedPrincipal;
  decision?: SoundDecisionScope;
  publication?: SoundPublicationValidationRequest;
};

/**
 * Server-side trust boundary. Implementations must resolve verified auth and
 * persisted records; request-body roles, memberships, votes, and contexts are
 * never valid inputs for these methods.
 */
export interface SoundAuthorizationDirectory {
  verifyAndResolvePrincipalCard(
    principal: SoundAuthenticatedPrincipal,
  ): Promise<UniversalReference<"card"> | null>;
  getSpace(
    space: SoundSpaceReference,
  ): Promise<SoundCollaborationSpace | null>;
  findActiveMember(
    space: SoundSpaceReference,
    card: UniversalReference<"card">,
  ): Promise<SoundSpaceMember | null>;
  resolveCapabilityContext(
    space: SoundSpaceReference,
    card: UniversalReference<"card">,
    action: SoundAction,
  ): Promise<Omit<CapabilityContext, "authenticated" | "soundRole">>;
  findMemberAtRevision(
    space: SoundSpaceReference,
    card: UniversalReference<"card">,
    partitionRevision: number,
  ): Promise<SoundSpaceMember | null>;
  listActiveMembersAtRevision(
    space: SoundSpaceReference,
    partitionRevision: number,
  ): Promise<readonly SoundSpaceMember[]>;
  getPersistedDecisionEvidence(
    space: SoundSpaceReference,
    scope: SoundDecisionScope,
  ): Promise<SoundDecisionEvidence | null>;
  getPublicationRecord(
    record: SoundPublicationRecordReference,
  ): Promise<SoundPublicationRecord | null>;
  getDecision(
    decision: UniversalReference<"sound_decision">,
  ): Promise<SoundDecision | null>;
  getUsageDecision(
    decision: SoundUsageDecisionReference,
  ): Promise<SoundUsageDecision | null>;
}

const sameReference = (
  left: { kind: string; id: string },
  right: { kind: string; id: string },
): boolean => left.kind === right.kind && left.id === right.id;

const memberIds = (
  members: readonly SoundSpaceMemberReference[],
): Set<string> => new Set(members.map((member) => member.id));

const hasDuplicateMembers = (
  members: readonly SoundSpaceMemberReference[],
): boolean => memberIds(members).size !== members.length;

function evaluateScopedView(
  member: SoundSpaceMember,
  level: DataLevel,
  context: Omit<CapabilityContext, "authenticated" | "soundRole">,
): CapabilityDecision {
  if (context.socialRelation === "blocked") {
    return deny("Lecture indisponible en raison d’un blocage.");
  }
  if (level === "financial" || level === "exact_location") {
    return deny("Ce niveau de données exige une permission spécialisée hors de l’espace sonore.");
  }
  if (
    (level === "operations" || level === "moderation") &&
    member.role !== "owner" &&
    member.role !== "operator" &&
    member.role !== "moderator"
  ) {
    return deny("Ce niveau opérationnel exige un rôle sonore dédié.");
  }
  return allow("Le principal authentifié est membre actif et la politique autorise la lecture.");
}

function membersEligibleToVote(
  space: SoundCollaborationSpace,
  activeMembers: readonly SoundSpaceMember[],
): readonly SoundSpaceMember[] {
  return activeMembers.filter(
    (member) =>
      member.status === "active" &&
      member.space.id === space.id &&
      (space.policy.actionsByRole[member.role] ?? []).includes("sound.vote"),
  );
}

function validateEvidenceScope(
  space: SoundCollaborationSpace,
  scope: SoundDecisionScope,
  evidence: SoundDecisionEvidence,
): CapabilityDecision | null {
  if (
    evidence.space.id !== space.id ||
    !sameReference(evidence.contribution, scope.contribution) ||
    evidence.partitionRevision !== scope.partitionRevision ||
    scope.partitionRevision !== space.currentPartitionRevision
  ) {
    return deny("La preuve de décision ne correspond pas à cet espace, cette contribution ou cette révision.");
  }
  return null;
}

function validatePersistedVotes(
  space: SoundCollaborationSpace,
  scope: SoundDecisionScope,
  evidence: Extract<
    SoundDecisionEvidence,
    { kind: "threshold_vote" | "consensus" }
  >,
  activeMembers: readonly SoundSpaceMember[],
  decidingMember: SoundSpaceMember,
): {
  decision?: CapabilityDecision;
  eligibleMembers: readonly SoundSpaceMember[];
} {
  const eligibleMembers = membersEligibleToVote(space, activeMembers);
  const eligibleIds = new Set(eligibleMembers.map((member) => member.id));
  const votes = evidence.kind === "threshold_vote"
    ? evidence.votes
    : evidence.responses;
  const voteMembers = votes.map((vote) => vote.member);

  if (
    eligibleMembers.length === 0 ||
    hasDuplicateMembers(voteMembers) ||
    !eligibleIds.has(decidingMember.id)
  ) {
    return {
      decision: deny("Les personnes éligibles ou l’autorité de décision ne correspondent pas aux membres actifs."),
      eligibleMembers,
    };
  }
  if (
    votes.some(
      (vote) =>
        vote.space.id !== space.id ||
        !sameReference(vote.contribution, scope.contribution) ||
        vote.partitionRevision !== scope.partitionRevision ||
        !eligibleIds.has(vote.member.id),
    )
  ) {
    return {
      decision: deny("Un vote est forgé, hors espace, hors contribution, hors révision ou émis par un membre non éligible."),
      eligibleMembers,
    };
  }
  return { eligibleMembers };
}

function evaluateThresholdDecision(
  space: SoundCollaborationSpace & {
    policy: SoundCollaborationSpace["policy"] & {
      decision: "threshold_vote";
      voteThreshold: number;
    };
  },
  scope: SoundDecisionScope,
  evidence: SoundDecisionEvidence,
  activeMembers: readonly SoundSpaceMember[],
  decidingMember: SoundSpaceMember,
): CapabilityDecision {
  if (evidence.kind !== "threshold_vote") {
    return deny("Une décision par seuil exige des votes persistés.");
  }
  const scopeFailure = validateEvidenceScope(space, scope, evidence);
  if (scopeFailure) return scopeFailure;
  if (space.policy.voteThreshold <= 0 || space.policy.voteThreshold > 1) {
    return deny("Le seuil de vote doit être supérieur à zéro et inférieur ou égal à un.");
  }
  const validation = validatePersistedVotes(
    space,
    scope,
    evidence,
    activeMembers,
    decidingMember,
  );
  if (validation.decision) return validation.decision;

  const approvals = evidence.votes.filter(
    (vote) => vote.value === "approve",
  ).length;
  if (approvals / validation.eligibleMembers.length < space.policy.voteThreshold) {
    return deny("Le seuil d’approbation des membres actifs éligibles n’est pas atteint.");
  }
  return allow("Le seuil d’approbation des membres actifs éligibles est atteint.", true);
}

function evaluateConsensusDecision(
  space: SoundCollaborationSpace,
  scope: SoundDecisionScope,
  evidence: SoundDecisionEvidence,
  activeMembers: readonly SoundSpaceMember[],
  decidingMember: SoundSpaceMember,
): CapabilityDecision {
  if (evidence.kind !== "consensus") {
    return deny("Une décision par consensus exige des réponses persistées.");
  }
  const scopeFailure = validateEvidenceScope(space, scope, evidence);
  if (scopeFailure) return scopeFailure;
  const validation = validatePersistedVotes(
    space,
    scope,
    evidence,
    activeMembers,
    decidingMember,
  );
  if (validation.decision) return validation.decision;

  const approvals = new Set(
    evidence.responses
      .filter((response) => response.value === "approve")
      .map((response) => response.member.id),
  );
  const hasObjection = evidence.responses.some(
    (response) =>
      response.value === "object" || response.value === "reject",
  );
  if (
    hasObjection ||
    validation.eligibleMembers.some((member) => !approvals.has(member.id))
  ) {
    return deny("Le consensus de tous les membres actifs éligibles n’est pas établi.");
  }
  return allow("Tous les membres actifs éligibles ont approuvé sans objection.", true);
}

function evaluateDecision(
  space: SoundCollaborationSpace,
  member: SoundSpaceMember,
  scope: SoundDecisionScope,
  evidence: SoundDecisionEvidence,
  activeMembers: readonly SoundSpaceMember[],
): CapabilityDecision {
  const scopeFailure = validateEvidenceScope(space, scope, evidence);
  if (scopeFailure) return scopeFailure;

  if (space.policy.decision === "owner") {
    return member.role === "owner" &&
      evidence.kind === "owner" &&
      evidence.member.id === member.id
      ? allow("Le propriétaire actif de l’espace porte cette décision.", true)
      : deny("La décision exige une preuve persistée liée au propriétaire actif.");
  }
  if (space.policy.decision === "reviewers") {
    return (member.role === "owner" || member.role === "reviewer") &&
      evidence.kind === "reviewers" &&
      evidence.member.id === member.id
      ? allow("Une personne active chargée de la revue porte cette décision.", true)
      : deny("La décision exige une preuve persistée liée à une personne chargée de la revue.");
  }
  if (space.policy.decision === "threshold_vote") {
    return evaluateThresholdDecision(
      space as SoundCollaborationSpace & {
        policy: SoundCollaborationSpace["policy"] & {
          decision: "threshold_vote";
          voteThreshold: number;
        };
      },
      scope,
      evidence,
      activeMembers,
      member,
    );
  }
  if (space.policy.decision === "consensus") {
    return evaluateConsensusDecision(
      space,
      scope,
      evidence,
      activeMembers,
      member,
    );
  }

  return evidence.kind === "external_authority" &&
    member.card.id === space.policy.externalAuthority.id &&
    evidence.authority.id === space.policy.externalAuthority.id
    ? allow("L’autorité externe active configurée porte cette décision.", true)
    : deny("La décision exige la preuve persistée de l’autorité externe configurée.");
}

function evaluateResolvedSoundAction(input: {
  action: SoundAction;
  space: SoundCollaborationSpace;
  member: SoundSpaceMember;
  context: Omit<CapabilityContext, "authenticated" | "soundRole">;
  decision?: {
    scope: SoundDecisionScope;
    evidence: SoundDecisionEvidence;
    activeMembers: readonly SoundSpaceMember[];
  };
  publicationDecision?: CapabilityDecision;
}): CapabilityDecision {
  const {
    action,
    space,
    member,
    context,
    decision,
    publicationDecision,
  } = input;

  if (member.space.id !== space.id || member.status !== "active") {
    return deny("Le principal authentifié n’est pas membre actif de cet espace.");
  }
  const configuredActions = space.policy.actionsByRole[member.role] ?? [];
  if (!configuredActions.includes(action)) {
    return deny("La politique de cet espace n’accorde pas cette action.");
  }
  if (action === "sound.view") {
    return evaluateScopedView(
      member,
      context.dataLevel ?? space.policy.visibility,
      context,
    );
  }

  const universal = evaluateCapability(action, {
    ...context,
    authenticated: true,
    soundRole: member.role,
  });
  if (!universal.allowed) return universal;

  if (
    action === "sound.contribute" &&
    space.policy.contribution === "owner_only" &&
    member.role !== "owner"
  ) {
    return deny("Seul le propriétaire peut contribuer dans cet espace.");
  }
  if (action === "sound.publish") {
    if (space.policy.publication === "disabled") {
      return deny("La publication est désactivée dans cet espace.");
    }
    if (
      space.policy.publication === "moderated" &&
      member.role !== "owner" &&
      member.role !== "moderator"
    ) {
      return deny("Une publication mondiale exige une modération.");
    }
    return publicationDecision?.allowed
      ? publicationDecision
      : deny(
        publicationDecision?.reason ??
          "Une publication exige une décision approuvée et une autorisation d’usage vérifiable.",
      );
  }
  if (action === "sound.decide") {
    return decision
      ? evaluateDecision(
        space,
        member,
        decision.scope,
        decision.evidence,
        decision.activeMembers,
      )
      : deny("Une décision exige des preuves persistées pour la révision active.");
  }
  return universal;
}

async function resolvePublicationDecision(
  space: SoundCollaborationSpace,
  request: SoundPublicationValidationRequest,
  directory: SoundAuthorizationDirectory,
): Promise<{
  decision: CapabilityDecision;
  record?: SoundPublicationRecord;
}> {
  const record = await directory.getPublicationRecord(request.record);
  if (!record) return { decision: deny("Enregistrement de publication introuvable.") };
  if (record.status !== "active" || record.withdrawnAt) {
    return {
      decision: deny("Cet enregistrement de publication n’est pas actif."),
      record,
    };
  }
  if (
    record.space.id !== space.id ||
    !sameReference(record.subject, request.expectedSubject)
  ) {
    return {
      decision: deny("La publication ne correspond pas au sujet ou à l’espace demandé."),
      record,
    };
  }
  if (
    record.partitionRevision !== request.expectedPartitionRevision ||
    record.partitionRevision !== space.currentPartitionRevision
  ) {
    return {
      decision: deny("La publication ne correspond pas à la révision active de la Partition."),
      record,
    };
  }

  const [decision, usageDecision] = await Promise.all([
    directory.getDecision(record.approval.decision),
    directory.getUsageDecision(record.authorization.usageDecision),
  ]);
  if (!decision || !usageDecision) {
    return {
      decision: deny("La décision éditoriale ou la décision d’usage est introuvable."),
      record,
    };
  }
  if (
    record.policyFingerprint !== space.policyFingerprint ||
    decision.policyFingerprint !== space.policyFingerprint ||
    decision.policySnapshot.decision !== space.policy.decision ||
    decision.policySnapshot.publication !== space.policy.publication ||
    decision.partitionRevision !== record.partitionRevision
  ) {
    return {
      decision: deny("La politique ayant autorisé la publication n’est plus la politique active."),
      record,
    };
  }
  if (
    record.approval.decision.id !== decision.id ||
    record.approval.outcome !== "approved" ||
    decision.outcome !== "approved" ||
    decision.space.id !== space.id ||
    record.approval.decidedAt !== decision.decidedAt
  ) {
    return {
      decision: deny("L’approbation ne correspond pas à une décision persistée de cet espace."),
      record,
    };
  }

  const [decisionAuthority, publisher, activeMembers] = await Promise.all([
    directory.findMemberAtRevision(
      record.space,
      decision.decidedBy,
      record.partitionRevision,
    ),
    directory.findMemberAtRevision(
      record.space,
      record.publishedBy,
      record.partitionRevision,
    ),
    directory.listActiveMembersAtRevision(
      record.space,
      record.partitionRevision,
    ),
  ]);
  if (
    !decisionAuthority ||
    !publisher ||
    decisionAuthority.card.id !== decision.decidedBy.id ||
    publisher.card.id !== record.publishedBy.id
  ) {
    return {
      decision: deny("L’autorité de décision ou de publication n’appartient pas au snapshot de membres."),
      record,
    };
  }

  const decisionAuthorization = evaluateDecision(
    space,
    decisionAuthority,
    {
      contribution: decision.contribution,
      partitionRevision: decision.partitionRevision,
    },
    decision.authorizationEvidence,
    activeMembers,
  );
  if (!decisionAuthorization.allowed) {
    return {
      decision: deny(
        `La décision liée à la publication n’est pas valide : ${decisionAuthorization.reason}`,
      ),
      record,
    };
  }
  if (
    record.authorization.usageDecision.id !== usageDecision.id ||
    record.authorization.usage !== "publish" ||
    record.authorization.decisionOutcome !== "allowed" ||
    record.authorization.decisionStatus !== "active" ||
    record.authorization.validationStage !== "publication" ||
    record.authorization.contextFingerprint !==
      request.expectedContextFingerprint ||
    usageDecision.usage !== "publish" ||
    usageDecision.outcome !== "allowed" ||
    usageDecision.status !== "active" ||
    !sameReference(usageDecision.subject, record.subject) ||
    usageDecision.context.actor?.id !== record.publishedBy.id ||
    usageDecision.context.audience !== record.dataLevel
  ) {
    return {
      decision: deny("La décision d’usage ne correspond pas au sujet, à l’acteur ou au contexte publié."),
      record,
    };
  }
  if (
    space.home.kind === "world" &&
    usageDecision.context.world?.id !== space.home.id
  ) {
    return {
      decision: deny("La décision d’usage ne correspond pas au Monde de l’espace sonore."),
      record,
    };
  }
  if (
    (record.authorization.validUntil &&
      record.authorization.validUntil <= request.at) ||
    (usageDecision.validUntil && usageDecision.validUntil <= request.at)
  ) {
    return {
      decision: deny("La décision d’usage liée à cette publication a expiré."),
      record,
    };
  }
  return {
    decision: allow("Publication active, approuvée et autorisée dans ce contexte.", true),
    record,
  };
}

export async function evaluateSoundAction(
  request: SoundActionAuthorizationRequest,
  directory: SoundAuthorizationDirectory,
): Promise<CapabilityDecision> {
  const [card, space] = await Promise.all([
    directory.verifyAndResolvePrincipalCard(request.principal),
    directory.getSpace(request.space),
  ]);
  if (!card) return deny("Le principal authentifié ne correspond à aucune Card.");
  if (!space) return deny("Espace sonore introuvable.");

  const [member, context] = await Promise.all([
    directory.findActiveMember(request.space, card),
    directory.resolveCapabilityContext(
      request.space,
      card,
      request.action,
    ),
  ]);
  if (!member || member.card.id !== card.id || member.space.id !== space.id) {
    return deny("Le principal authentifié n’est pas membre actif de cet espace.");
  }

  let decision:
    | {
        scope: SoundDecisionScope;
        evidence: SoundDecisionEvidence;
        activeMembers: readonly SoundSpaceMember[];
      }
    | undefined;
  if (request.action === "sound.decide") {
    if (!request.decision) {
      return deny("Une décision exige une contribution et une révision explicites.");
    }
    const [evidence, activeMembers] = await Promise.all([
      directory.getPersistedDecisionEvidence(request.space, request.decision),
      directory.listActiveMembersAtRevision(
        request.space,
        request.decision.partitionRevision,
      ),
    ]);
    if (!evidence) return deny("Aucune preuve de décision persistée n’est disponible.");
    decision = {
      scope: request.decision,
      evidence,
      activeMembers,
    };
  }

  let publicationDecision: CapabilityDecision | undefined;
  if (request.action === "sound.publish") {
    if (!request.publication) {
      return deny("Une publication exige un enregistrement persistant explicite.");
    }
    const publication = await resolvePublicationDecision(
      space,
      request.publication,
      directory,
    );
    if (
      publication.record &&
      publication.record.publishedBy.id !== card.id
    ) {
      return deny("Le principal authentifié n’est pas la personne qui publie.");
    }
    publicationDecision = publication.decision;
  }

  return evaluateResolvedSoundAction({
    action: request.action,
    space,
    member,
    context,
    decision,
    publicationDecision,
  });
}

export async function evaluateSoundPublication(
  spaceReference: SoundSpaceReference,
  request: SoundPublicationValidationRequest,
  directory: SoundAuthorizationDirectory,
): Promise<CapabilityDecision> {
  const space = await directory.getSpace(spaceReference);
  if (!space) return deny("Espace sonore introuvable.");
  return (await resolvePublicationDecision(space, request, directory)).decision;
}