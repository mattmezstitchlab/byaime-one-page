import type {
  DataLevel,
  EntityId,
  UniversalReference,
} from "./types";
import type {
  SoundFailurePolicy,
  SoundGainIntent,
  SoundItemKind,
  SoundItemReference,
  SoundMediaBindingReference,
  SoundSequenceEntry,
  SoundSequenceReference,
  SoundSyncIntent,
  SoundTransitionIntent,
  SoundTriggerIntent,
} from "./sound-core";
import type {
  SoundMediaAssetReference,
  SoundProviderAvailability,
  SoundProviderCapability,
  SoundProviderMapping,
  SoundProviderMappingReference,
  SoundRightsUsage,
  SoundSpaceReference,
  SoundUsageDecision,
  SoundUsageDecisionReference,
  SoundValidatedUsageAuthorization,
} from "./sound-policy";

export type SoundSearchQuery = {
  text: string;
  kinds?: readonly SoundItemKind[];
  territory?: string;
  storefront?: string;
  limit?: number;
};

export type SoundSearchResult = {
  providerKey: string;
  externalId: string;
  externalKind: SoundProviderMapping["externalKind"];
  title: string;
  contributors?: readonly string[];
  versionLabel?: string;
  durationMs?: number;
  artworkUrl?: string;
  identifiers?: SoundProviderMapping["identifiers"];
  availability: SoundProviderAvailability;
  capabilities: readonly SoundProviderCapability[];
  deepLinkUrl?: string;
  observedAt: string;
};

export type SoundPlaybackContext = {
  actor: UniversalReference<"card">;
  world?: UniversalReference<"world">;
  moment?: UniversalReference<"moment">;
  place?: UniversalReference<"place">;
  audience: DataLevel;
  territory?: string;
  storefront?: string;
  deviceKind?: string;
  useCase:
    | "private_listening"
    | "event_playback"
    | "public_playback"
    | "embed"
    | "synchronization";
};

export type SoundExecutableUsage = Extract<
  SoundRightsUsage,
  | "open_external"
  | "preview"
  | "play_private"
  | "play_event"
  | "broadcast"
  | "embed"
  | "synchronize"
>;

export type SoundPlanningAuthorization =
  SoundValidatedUsageAuthorization<SoundExecutableUsage> & {
    validationStage: "planning";
  };

export type SoundExecutionAuthorization =
  SoundValidatedUsageAuthorization<SoundExecutableUsage> & {
    validationStage: "execution";
  };

type SoundPlaybackAssessmentBase = {
  mapping: SoundProviderMappingReference;
  capabilities: readonly SoundProviderCapability[];
  reasons: readonly string[];
  observedAt: string;
  validUntil?: string;
};

export type SoundPlaybackAssessment = SoundPlaybackAssessmentBase &
  (
    | {
        status: "playable" | "deep_link_only";
        authorization: SoundPlanningAuthorization;
      }
    | {
        status:
          | "unavailable"
          | "authorization_required"
          | "subscription_required"
          | "territory_unknown"
          | "rights_review_required";
        authorization?: never;
      }
  );

export type SoundPlaybackGrantReference =
  UniversalReference<"sound_playback_grant">;

export type SoundPlaybackGrant = {
  id: EntityId;
  providerKey: string;
  mapping: SoundProviderMappingReference;
  session: UniversalReference<"sound_playback_session">;
  actor: UniversalReference<"card">;
  capability: "preview" | "embed" | "playback" | "live_stream";
  authorization: SoundExecutionAuthorization;
  deviceId?: string;
  territory?: string;
  issuedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "revoked";
};

export type SoundPlaybackGrantRequest = {
  mapping: SoundProviderMappingReference;
  session: UniversalReference<"sound_playback_session">;
  context: SoundPlaybackContext;
  capability: SoundPlaybackGrant["capability"];
};

export interface SoundProviderAdapter {
  readonly providerKey: string;
  readonly capabilities: readonly SoundProviderCapability[];
  search(query: SoundSearchQuery): Promise<readonly SoundSearchResult[]>;
  resolve(
    externalId: string,
    context: Pick<SoundPlaybackContext, "territory" | "storefront">,
  ): Promise<SoundSearchResult>;
  assessPlayback(
    mapping: SoundProviderMapping,
    context: SoundPlaybackContext,
  ): Promise<SoundPlaybackAssessment>;
  requestPlaybackGrant?(
    request: SoundPlaybackGrantRequest,
  ): Promise<SoundPlaybackGrant>;
}

export type SoundAuthorizationFailureCode =
  | "decision_subject_mismatch"
  | "decision_usage_mismatch"
  | "decision_not_allowed"
  | "decision_not_active"
  | "decision_expired"
  | "context_mismatch"
  | "session_mismatch"
  | "session_state_not_executable";

export type SoundPlanAuthorizationRequest = {
  decision: SoundUsageDecision;
  requestedSubject: SoundUsageDecision["subject"];
  requestedUsage: SoundExecutableUsage;
  context: SoundPlaybackContext;
  at: string;
};

export type SoundExecutionAuthorizationRequest =
  SoundPlanAuthorizationRequest & {
    session: {
      ref: UniversalReference<"sound_playback_session">;
      state: "ready" | "running" | "paused" | "degraded";
      revision: number;
    };
  };

export type SoundAuthorizationFailure = {
  outcome: "denied";
  codes: readonly SoundAuthorizationFailureCode[];
  reasons: readonly string[];
};

export type SoundPlanAuthorizationResult =
  | {
      outcome: "allowed";
      authorization: SoundPlanningAuthorization;
    }
  | SoundAuthorizationFailure;

export type SoundExecutionAuthorizationResult =
  | {
      outcome: "allowed";
      authorization: SoundExecutionAuthorization;
    }
  | SoundAuthorizationFailure;

export interface SoundExecutionAuthorizer {
  validateForPlan(
    request: SoundPlanAuthorizationRequest,
  ): Promise<SoundPlanAuthorizationResult>;
  validateForExecution(
    request: SoundExecutionAuthorizationRequest,
  ): Promise<SoundExecutionAuthorizationResult>;
}

export type SoundResolvedSource =
  | {
      kind: "asset";
      asset: SoundMediaAssetReference;
      authorization: SoundPlanningAuthorization;
    }
  | {
      kind: "provider";
      mapping: SoundProviderMappingReference;
      assessment: SoundPlaybackAssessment;
    }
  | {
      kind: "silence";
    }
  | {
      kind: "live";
      label?: string;
      authorization: SoundPlanningAuthorization;
    }
  | {
      kind: "unresolved";
      reasons: readonly string[];
    };

export type SoundPlaybackPlanEntry = {
  id: EntityId;
  sequenceEntryId: SoundSequenceEntry["id"];
  soundItem: SoundItemReference;
  binding?: SoundMediaBindingReference;
  positionKey: string;
  source: SoundResolvedSource;
  durationMs?: number;
  plannedStartOffsetMs?: number;
  sourceFragment?: SoundSequenceEntry["sourceFragment"];
  transitionToNext?: SoundTransitionIntent;
  gain?: SoundGainIntent;
  trigger: SoundTriggerIntent;
  sync?: SoundSyncIntent;
  failurePolicy: SoundFailurePolicy;
};

export type SoundPlaybackPlan = {
  id: EntityId;
  sequence: SoundSequenceReference;
  space: SoundSpaceReference;
  partitionRevision: number;
  context: SoundPlaybackContext;
  entries: readonly SoundPlaybackPlanEntry[];
  warnings: readonly string[];
  generatedAt: string;
  validUntil?: string;
};

export type SoundControllerLease = {
  holder: UniversalReference<"card">;
  deviceId: string;
  fencingToken: number;
  acquiredAt: string;
  expiresAt: string;
};

export type SoundPlaybackSessionState =
  | "preparing"
  | "ready"
  | "running"
  | "paused"
  | "degraded"
  | "ended"
  | "aborted";

export type SoundPlaybackSession = {
  id: EntityId;
  world: UniversalReference<"world">;
  space: SoundSpaceReference;
  sequence: SoundSequenceReference;
  plan: UniversalReference<"sound_playback_plan">;
  partitionRevision: number;
  pendingPartitionRevision?: number;
  host: UniversalReference<"card">;
  controllerLease?: SoundControllerLease;
  state: SoundPlaybackSessionState;
  audience: DataLevel;
  clockEpoch?: string;
  currentPlanEntryId?: EntityId;
  revision: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
};

export type SoundPlaybackCommandType =
  | "prepare"
  | "start"
  | "pause"
  | "resume"
  | "seek"
  | "skip"
  | "stop"
  | "apply_partition_revision";

type SoundPlaybackCommandBase = {
  id: EntityId;
  session: UniversalReference<"sound_playback_session">;
  actor: UniversalReference<"card">;
  deviceId: string;
  targetPlanEntryId?: EntityId;
  offsetMs?: number;
  partitionRevision?: number;
  expectedSessionRevision: number;
  fencingToken: number;
  idempotencyKey: string;
  issuedAt: string;
};

export type SoundPlaybackCommand = SoundPlaybackCommandBase &
  (
    | {
        type: "start" | "resume" | "seek";
        authorization: SoundExecutionAuthorization;
      }
    | {
        type: Exclude<SoundPlaybackCommandType, "start" | "resume" | "seek">;
        authorization?: never;
      }
  );

export type SoundPlaybackCommandReference =
  UniversalReference<"sound_playback_command">;

export type SoundPlaybackEventType =
  | "session_started"
  | "session_paused"
  | "session_resumed"
  | "session_ended"
  | "entry_queued"
  | "entry_resolved"
  | "play_requested"
  | "play_started"
  | "play_paused"
  | "play_resumed"
  | "play_stopped"
  | "play_completed"
  | "play_skipped"
  | "cue_fired"
  | "transition_started"
  | "transition_completed"
  | "transition_degraded"
  | "grant_denied"
  | "grant_expired"
  | "grant_revoked"
  | "provider_error"
  | "device_lost"
  | "sync_drift"
  | "operator_override";

export type SoundPlaybackEvent = {
  id: EntityId;
  session: UniversalReference<"sound_playback_session">;
  planEntryId?: EntityId;
  commandId?: EntityId;
  type: SoundPlaybackEventType;
  actor?: UniversalReference<"card">;
  deviceId?: string;
  serverOccurredAt: string;
  clientObservedAt?: string;
  sessionRevision: number;
  idempotencyKey?: string;
  errorCode?: string;
  details?: Readonly<Record<string, string | number | boolean | null>>;
};

export type SoundPlaybackEventReference =
  UniversalReference<"sound_playback_event">;

export type SoundClientObservation = {
  session: UniversalReference<"sound_playback_session">;
  planEntryId?: EntityId;
  deviceId: string;
  observedAt: string;
  positionMs?: number;
  readyState: "unknown" | "loading" | "ready" | "buffering" | "failed";
  estimatedDriftMs?: number;
  canSeek: boolean;
};

export type SoundPartitionImpact = {
  id: EntityId;
  changed: UniversalReference<
    "moment" | "sound_item" | "sound_media_binding" | "sound_sequence"
  >;
  affectedBindings: readonly SoundMediaBindingReference[];
  affectedSequences: readonly SoundSequenceReference[];
  affectedSessions: readonly UniversalReference<"sound_playback_session">[];
  affectedPeople: readonly UniversalReference<"card">[];
  invalidatedUsageDecisions: readonly SoundUsageDecisionReference[];
  warnings: readonly string[];
  requiresConfirmation: true;
};

export type SoundNotificationIntent = {
  id: EntityId;
  purpose:
    | "partition_changed"
    | "review_requested"
    | "decision_recorded"
    | "rights_changed"
    | "consent_changed"
    | "live_incident";
  recipient: UniversalReference<"card">;
  dataLevel: DataLevel;
  subject: UniversalReference<
    | "sound_item"
    | "sound_media_binding"
    | "sound_sequence"
    | "sound_playback_session"
  >;
  reasonCodes: readonly string[];
  deduplicationKey: string;
  createdAt: string;
};