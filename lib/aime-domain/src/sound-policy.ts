import type {
  Capability,
  DataLevel,
  EntityId,
  SoundAccessRole,
  UniversalReference,
  WorldAccessRole,
} from "./types";
import type {
  SoundHomeReference,
  SoundItemReference,
  SoundMediaBindingReference,
  SoundSequenceReference,
} from "./sound-core";

export type SoundMediaAssetReference =
  UniversalReference<"sound_media_asset">;
export type SoundProviderMappingReference =
  UniversalReference<"sound_provider_mapping">;
export type SoundProviderPolicyReference =
  UniversalReference<"sound_provider_policy">;
export type SoundRightsStatementReference =
  UniversalReference<"sound_rights_statement">;
export type SoundConsentStatementReference =
  UniversalReference<"sound_consent_statement">;
export type SoundUsageDecisionReference =
  UniversalReference<"sound_usage_decision">;
export type SoundPublicationRecordReference =
  UniversalReference<"sound_publication_record">;
export type SoundSpaceReference = UniversalReference<"sound_space">;
export type SoundSpaceMemberReference =
  UniversalReference<"sound_space_member">;
export type SoundContributionReference =
  UniversalReference<"sound_contribution">;
export type SoundPartitionReference = UniversalReference<"sound_partition">;

export type SoundMediaAsset = {
  id: EntityId;
  soundItem: SoundItemReference;
  home: SoundHomeReference;
  owner: UniversalReference<"card">;
  mediaType: "audio";
  origin: "upload" | "recording" | "import" | "generated" | "archive";
  storage: {
    adapter: string;
    objectId: string;
  };
  mimeType: string;
  byteSize?: number;
  durationMs?: number;
  sampleRateHz?: number;
  channels?: number;
  checksum?: {
    algorithm: "sha256";
    value: string;
  };
  originalAsset?: SoundMediaAssetReference;
  derivativeOf?: SoundMediaAssetReference;
  visibility: DataLevel;
  retentionUntil?: string;
  createdAt: string;
  updatedAt: string;
};

export type SoundProviderCapability =
  | "search"
  | "metadata"
  | "deep_link"
  | "embed"
  | "preview"
  | "playback"
  | "user_library"
  | "live_stream";

export type SoundProviderAvailability =
  | "unknown"
  | "available"
  | "unavailable"
  | "removed"
  | "restricted"
  | "authorization_required"
  | "subscription_required";

export type SoundProviderMapping = {
  id: EntityId;
  soundItem: SoundItemReference;
  providerKey: string;
  externalId: string;
  externalKind: "work" | "recording" | "release" | "episode" | "video" | "stream";
  metadataSnapshot: {
    title: string;
    contributors?: readonly string[];
    versionLabel?: string;
    durationMs?: number;
    artworkUrl?: string;
  };
  identifiers?: readonly {
    scheme: "isrc" | "iswc" | "mbid" | "ean" | "upc" | `custom:${string}`;
    value: string;
  }[];
  observedAt: string;
  observedBy: "human" | "integration" | "import";
  territory?: string;
  storefront?: string;
  confidence?: number;
  availability: SoundProviderAvailability;
  capabilities: readonly SoundProviderCapability[];
  deepLinkUrl?: string;
  replacedBy?: SoundProviderMappingReference;
};

export type SoundProviderPolicyObservation = {
  id: EntityId;
  providerKey: string;
  mapping?: SoundProviderMappingReference;
  useCase:
    | "private_listening"
    | "event_playback"
    | "public_playback"
    | "embed"
    | "synchronization"
    | "publication";
  outcome: "allowed" | "denied" | "unknown" | "requires_review";
  accountRequirement?: "none" | "sign_in" | "subscription" | "specific_plan";
  territory?: string;
  observedAt: string;
  validUntil?: string;
  source?: UniversalReference<"document">;
  notes?: readonly string[];
};

export type SoundPolicySubjectReference = UniversalReference<
  | "sound_item"
  | "sound_media_asset"
  | "sound_media_binding"
  | "sound_provider_mapping"
  | "sound_sequence"
>;

export type SoundRightsCategory =
  | "copyright"
  | "neighboring_rights"
  | "performance"
  | "venue_license"
  | "synchronization"
  | "archive_access"
  | "cultural_protocol"
  | "other";

export type SoundRightsUsage =
  | "identify"
  | "store"
  | "open_external"
  | "preview"
  | "play_private"
  | "play_event"
  | "broadcast"
  | "embed"
  | "publish"
  | "synchronize"
  | "transcribe"
  | "translate"
  | "derive";

type SoundValidatedUsageAuthorizationBase<U extends SoundRightsUsage> = {
  usageDecision: SoundUsageDecisionReference;
  usage: U;
  decisionOutcome: "allowed";
  decisionStatus: "active";
  contextFingerprint: string;
  validatedAt: string;
  validUntil?: string;
};

export type SoundValidatedUsageAuthorization<
  U extends SoundRightsUsage = SoundRightsUsage,
> = SoundValidatedUsageAuthorizationBase<U> &
  (
    | {
        validationStage: "planning" | "publication";
        session?: never;
        sessionRevision?: never;
        sessionState?: never;
      }
    | {
        validationStage: "execution";
        session: UniversalReference<"sound_playback_session">;
        sessionRevision: number;
        sessionState: "ready" | "running" | "paused" | "degraded";
      }
  );

export type SoundRightsStatement = {
  id: EntityId;
  subject: SoundPolicySubjectReference;
  category: SoundRightsCategory;
  assertedBy: UniversalReference<"card">;
  rightsHolder?: UniversalReference<"card">;
  basis:
    | "owned"
    | "licensed"
    | "permission"
    | "public_domain_assertion"
    | "exception_assertion"
    | "unknown";
  usages: readonly SoundRightsUsage[];
  territories?: readonly string[];
  audience: DataLevel;
  context?: UniversalReference<"world" | "moment" | "place">;
  status: "asserted" | "verified" | "expired" | "withdrawn" | "disputed";
  validFrom?: string;
  validUntil?: string;
  evidence?: readonly UniversalReference<"document">[];
  supersedes?: SoundRightsStatementReference;
  createdAt: string;
};

export type SoundConsentScope =
  | "record"
  | "identify"
  | "store"
  | "play"
  | "transcribe"
  | "translate"
  | "share"
  | "publish"
  | "synchronize"
  | "derive";

export type SoundConsentStatement = {
  id: EntityId;
  subject: SoundPolicySubjectReference;
  affectedParty: UniversalReference<"card">;
  grantedBy?: UniversalReference<"card">;
  authority:
    | "self"
    | "guardian"
    | "delegate"
    | "collective"
    | "community_protocol"
    | "unknown";
  scopes: readonly SoundConsentScope[];
  audience: DataLevel;
  territories?: readonly string[];
  context?: UniversalReference<"world" | "moment" | "place">;
  status: "granted" | "refused" | "withdrawn" | "expired" | "requires_review";
  recordedAt: string;
  expiresAt?: string;
  evidence?: readonly UniversalReference<"document">[];
  supersedes?: SoundConsentStatementReference;
};

export type SoundUsageDecision = {
  id: EntityId;
  subject: SoundPolicySubjectReference;
  usage: SoundRightsUsage;
  context: {
    actor?: UniversalReference<"card">;
    world?: UniversalReference<"world">;
    moment?: UniversalReference<"moment">;
    place?: UniversalReference<"place">;
    session?: UniversalReference<"sound_playback_session">;
    audience: DataLevel;
    territory?: string;
    storefront?: string;
  };
  outcome: "allowed" | "denied" | "unknown" | "requires_review";
  reasons: readonly string[];
  consideredRights: readonly SoundRightsStatementReference[];
  consideredConsents: readonly SoundConsentStatementReference[];
  consideredProviderPolicies: readonly SoundProviderPolicyReference[];
  status: "active" | "expired" | "withdrawn" | "superseded";
  decidedAt: string;
  validUntil?: string;
  withdrawnAt?: string;
  withdrawnBy?: UniversalReference<"card">;
  supersedes?: SoundUsageDecisionReference;
  version: number;
};

export type SoundPublicationSubjectReference = UniversalReference<
  | "sound_item"
  | "sound_media_asset"
  | "sound_media_binding"
  | "sound_sequence"
  | "sound_folder"
  | "sound_tag"
>;

export type SoundPublicationRecord = {
  id: EntityId;
  space: SoundSpaceReference;
  subject: SoundPublicationSubjectReference;
  partitionRevision: number;
  policyFingerprint: string;
  approval: {
    decision: UniversalReference<"sound_decision">;
    outcome: "approved";
    decidedAt: string;
  };
  authorization: SoundValidatedUsageAuthorization<"publish"> & {
    validationStage: "publication";
  };
  exposure: "metadata_only" | "external_link" | "preview" | "full_media";
  dataLevel: "public" | "network";
  fieldAllowlist: readonly string[];
  status: "active" | "withdrawn" | "superseded";
  publishedBy: UniversalReference<"card">;
  publishedAt: string;
  withdrawnAt?: string;
  withdrawalReason?: string;
  supersedes?: SoundPublicationRecordReference;
};

export const SOUND_SPACE_MODES = [
  "private",
  "event",
  "collaborative",
  "world",
] as const;

export type SoundSpaceMode = (typeof SOUND_SPACE_MODES)[number];
export type SoundSpaceRole = SoundAccessRole;
export type SoundAction = Extract<Capability, `sound.${string}`>;

type SoundSpacePolicyBase = {
  actionsByRole: Partial<Record<SoundSpaceRole, readonly SoundAction[]>>;
  requiresReasonForRejection: boolean;
};

type SoundOwnerDecisionRule = {
  decision: "owner";
  voteThreshold?: never;
  externalAuthority?: never;
};

type SoundReviewerDecisionRule = {
  decision: "reviewers";
  voteThreshold?: never;
  externalAuthority?: never;
};

type SoundThresholdDecisionRule = {
  decision: "threshold_vote";
  voteThreshold: number;
  externalAuthority?: never;
};

type SoundConsensusDecisionRule = {
  decision: "consensus";
  voteThreshold?: never;
  externalAuthority?: never;
};

type SoundExternalAuthorityDecisionRule = {
  decision: "external_authority";
  voteThreshold?: never;
  externalAuthority: UniversalReference<"card">;
};

type SoundDecisionRule =
  | SoundOwnerDecisionRule
  | SoundReviewerDecisionRule
  | SoundThresholdDecisionRule
  | SoundConsensusDecisionRule
  | SoundExternalAuthorityDecisionRule;

export type SoundPrivateSpacePolicy = SoundSpacePolicyBase & {
  visibility: "private";
  joining: "owner_only";
  contribution: "owner_only";
  publication: "disabled";
} & SoundOwnerDecisionRule;

export type SoundEventSpacePolicy = SoundSpacePolicyBase & {
  visibility: "private" | "world" | "operations";
  joining: "invite_only" | "request";
  contribution: "members" | "approved_members";
  publication: "disabled" | "explicit_decision";
} & (
    | SoundOwnerDecisionRule
    | SoundReviewerDecisionRule
    | SoundExternalAuthorityDecisionRule
  );

export type SoundCollaborativeSpacePolicy = SoundSpacePolicyBase & {
  visibility: "private" | "network" | "world";
  joining: "invite_only" | "request" | "open";
  contribution: "members" | "approved_members" | "public_proposals";
  publication: "disabled" | "explicit_decision";
} & SoundDecisionRule;

export type SoundWorldSpacePolicy = SoundSpacePolicyBase & {
  visibility: "network" | "public";
  joining: "request" | "open";
  contribution: "approved_members" | "public_proposals";
  publication: "moderated";
} & SoundDecisionRule;

export type SoundSpacePolicy =
  | SoundPrivateSpacePolicy
  | SoundEventSpacePolicy
  | SoundCollaborativeSpacePolicy
  | SoundWorldSpacePolicy;

type SoundCollaborationSpaceBase = {
  id: EntityId;
  home: SoundHomeReference;
  title: string;
  purpose: "curation" | "recording" | "archive" | "performance" | "publication";
  policyVersion: number;
  policyFingerprint: string;
  currentPartitionRevision: number;
  createdBy: UniversalReference<"card">;
  createdAt: string;
  updatedAt: string;
};

export type SoundCollaborationSpace = SoundCollaborationSpaceBase &
  (
    | {
        mode: "private";
        policy: SoundPrivateSpacePolicy;
      }
    | {
        mode: "event";
        home: UniversalReference<"world">;
        scope: {
          moments: readonly [
            UniversalReference<"moment">,
            ...UniversalReference<"moment">[],
          ];
          startsAt?: string;
          endsAt?: string;
        };
        policy: SoundEventSpacePolicy;
      }
    | {
        mode: "collaborative";
        policy: SoundCollaborativeSpacePolicy;
      }
    | {
        mode: "world";
        policy: SoundWorldSpacePolicy;
      }
  );

export type SoundSpaceMember = {
  id: EntityId;
  space: SoundSpaceReference;
  card: UniversalReference<"card">;
  role: SoundSpaceRole;
  inheritedWorldRole?: WorldAccessRole;
  status: "invited" | "active" | "declined" | "removed";
  joinedAt?: string;
};

export type SoundSpaceVote = {
  space: SoundSpaceReference;
  contribution: SoundContributionReference;
  partitionRevision: number;
  member: SoundSpaceMemberReference;
  value: "approve" | "reject" | "abstain" | "object";
  castAt: string;
};

export type SoundExternalAuthorityEvidence = {
  kind: "document" | "registry" | "attestation";
  label: string;
  reference: string;
};

type SoundDecisionEvidenceScope = {
  space: SoundSpaceReference;
  contribution: SoundContributionReference;
  partitionRevision: number;
};

export type SoundDecisionEvidence = SoundDecisionEvidenceScope &
  (
  | {
      kind: "owner";
      member: SoundSpaceMemberReference;
    }
  | {
      kind: "reviewers";
      member: SoundSpaceMemberReference;
    }
  | {
      kind: "threshold_vote";
      votes: readonly SoundSpaceVote[];
      capturedAt: string;
    }
  | {
      kind: "consensus";
      responses: readonly SoundSpaceVote[];
      capturedAt: string;
    }
  | {
      kind: "external_authority";
      authority: UniversalReference<"card">;
      evidence: SoundExternalAuthorityEvidence;
      verifiedAt: string;
    }
  );

export type SoundContributionKind =
  | "proposal"
  | "comment"
  | "reaction"
  | "vote"
  | "objection"
  | "correction";

export type SoundContributionSubjectReference = UniversalReference<
  | "sound_item"
  | "sound_media_binding"
  | "sound_sequence"
  | "sound_folder"
  | "sound_tag"
>;

export type SoundContribution = {
  id: EntityId;
  space: SoundSpaceReference;
  subject: SoundContributionSubjectReference;
  kind: SoundContributionKind;
  author: UniversalReference<"card">;
  body?: string;
  reaction?: string;
  value?: number;
  visibility: DataLevel;
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "accepted"
    | "rejected"
    | "withdrawn"
    | "superseded";
  supersedes?: SoundContributionReference;
  createdAt: string;
  submittedAt?: string;
};

export type SoundDecision = {
  id: EntityId;
  space: SoundSpaceReference;
  contribution: SoundContributionReference;
  outcome: "approved" | "rejected" | "changes_requested" | "withdrawn";
  decidedBy: UniversalReference<"card">;
  reason?: string;
  policySnapshot: SoundSpacePolicy;
  policyFingerprint: string;
  authorizationEvidence: SoundDecisionEvidence;
  partitionRevision: number;
  decidedAt: string;
};

export type SoundPartition = {
  id: EntityId;
  space: SoundSpaceReference;
  revision: number;
  soundItems: readonly SoundItemReference[];
  sequences: readonly SoundSequenceReference[];
  bindings: readonly SoundMediaBindingReference[];
  rights: readonly SoundRightsStatementReference[];
  consents: readonly SoundConsentStatementReference[];
  approvedDecisions: readonly UniversalReference<"sound_decision">[];
  publicationRecords: readonly SoundPublicationRecordReference[];
};