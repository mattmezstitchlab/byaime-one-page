import type {
  DataLevel,
  EntityId,
  UniversalReference,
} from "./types";

export const SOUND_ITEM_KINDS = [
  "music",
  "voice",
  "message",
  "ambience",
  "silence",
  "live",
  "archive",
] as const;

export type SoundItemKind = (typeof SOUND_ITEM_KINDS)[number];
export type SoundLifecycle = "draft" | "active" | "archived" | "withdrawn";
export type SoundItemReference = UniversalReference<"sound_item">;
export type SoundSequenceReference = UniversalReference<"sound_sequence">;
export type SoundSequenceEntryReference =
  UniversalReference<"sound_sequence_entry">;
export type SoundFolderReference = UniversalReference<"sound_folder">;
export type SoundTagReference = UniversalReference<"sound_tag">;
export type SoundMediaBindingReference =
  UniversalReference<"sound_media_binding">;
export type SoundHomeReference = UniversalReference<"world" | "card">;

export type SoundProvenance = {
  origin: "human" | "import" | "integration" | "generated" | "demo";
  assertedBy?: UniversalReference<"card">;
  source?: UniversalReference;
  observedAt: string;
  confidence?: number;
  note?: string;
};

export type SoundExternalIdentifier = {
  scheme: "isrc" | "iswc" | "mbid" | "ean" | "upc" | `custom:${string}`;
  value: string;
  identifies: "work" | "recording" | "release" | "episode" | "stream";
};

export type SoundFragment = {
  startMs: number;
  endMs?: number;
};

type SoundItemBase = {
  id: EntityId;
  home: SoundHomeReference;
  title: string;
  summary?: string;
  lifecycle: SoundLifecycle;
  visibility: DataLevel;
  language?: string;
  identifiers?: readonly SoundExternalIdentifier[];
  provenance: SoundProvenance;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SoundItem = SoundItemBase &
  (
    | {
        kind: "silence";
        durationMs: number;
      }
    | {
        kind: Exclude<SoundItemKind, "silence">;
        durationMs?: number;
      }
  );

export type SoundTagNamespace =
  | "genre"
  | "emotion"
  | "mood"
  | "theme"
  | "activity"
  | "culture"
  | "technique"
  | `custom:${string}`;

export type SoundTag = {
  id: EntityId;
  home: SoundHomeReference;
  namespace: SoundTagNamespace;
  slug: string;
  label: string;
  description?: string;
  aliases?: readonly string[];
  parent?: SoundTagReference;
  visibility: DataLevel;
  createdAt: string;
  updatedAt: string;
};

export type SoundTaggedItem = {
  id: EntityId;
  soundItem: SoundItemReference;
  tag: SoundTagReference;
  assertedBy: UniversalReference<"card">;
  confidence?: number;
  createdAt: string;
};

export type SoundTaggedItemReference =
  UniversalReference<"sound_tag_membership">;

export type SoundFolder = {
  id: EntityId;
  home: SoundHomeReference;
  title: string;
  description?: string;
  parent?: SoundFolderReference;
  visibility: DataLevel;
  createdBy: UniversalReference<"card">;
  createdAt: string;
  updatedAt: string;
};

export type SoundFolderMemberReference = UniversalReference<
  "sound_item" | "sound_sequence" | "sound_folder"
>;

export type SoundFolderMembership = {
  id: EntityId;
  folder: SoundFolderReference;
  member: SoundFolderMemberReference;
  positionKey: string;
  addedBy: UniversalReference<"card">;
  addedAt: string;
};

export type SoundFolderMembershipReference =
  UniversalReference<"sound_folder_membership">;

export type SoundSemanticRelationKind =
  | "sound.belongs_to_world"
  | "sound.features_person"
  | "sound.performed_by"
  | "sound.spoken_by"
  | "sound.dedicated_to"
  | "sound.recorded_at"
  | "sound.evokes_emotion"
  | "sound.about"
  | "sound.created_for"
  | "sound.derived_from"
  | "sound.cites"
  | `sound.custom:${string}`;

export type SoundSemanticTargetReference = UniversalReference<
  | "card"
  | "world"
  | "place"
  | "moment"
  | "emotion"
  | "sound_item"
  | "document"
  | "media"
  | "sound_media_asset"
>;

export type SoundSemanticRelation = {
  id: EntityId;
  from: SoundItemReference;
  to: SoundSemanticTargetReference;
  kind: SoundSemanticRelationKind;
  role?: string;
  visibility: DataLevel;
  provenance: SoundProvenance;
  validFrom?: string;
  validUntil?: string;
};

export type SoundBindingRole =
  | "primary"
  | "entrance"
  | "exit"
  | "underscoring"
  | "narration"
  | "message"
  | "memory"
  | "ambience"
  | "accessibility"
  | "silence"
  | `custom:${string}`;

export type SoundMomentAnchor =
  | {
      kind: "at_start";
      offsetMs?: number;
    }
  | {
      kind: "at_end";
      offsetMs?: number;
    }
  | {
      kind: "within_moment";
      startsAtOffsetMs: number;
      endsAtOffsetMs?: number;
    }
  | {
      kind: "operator_cue";
      label?: string;
    };

export type SoundMediaBinding = {
  id: EntityId;
  world: UniversalReference<"world">;
  soundItem: SoundItemReference;
  moment: UniversalReference<"moment">;
  role: SoundBindingRole;
  soundFragment?: SoundFragment;
  anchor: SoundMomentAnchor;
  visibility: DataLevel;
  audience?: readonly UniversalReference<"card">[];
  lifecycle: "draft" | "active" | "retired";
  createdBy: UniversalReference<"card">;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type SoundTransitionKind =
  | "cut"
  | "gap"
  | "fade"
  | "crossfade"
  | "duck"
  | `custom:${string}`;

export type SoundTransitionIntent = {
  kind: SoundTransitionKind;
  durationMs?: number;
  gapMs?: number;
  curve?: "linear" | "equal_power" | "logarithmic";
  fallback: "cut" | "gap" | "stop_and_ask";
};

export type SoundGainIntent = {
  baseGainDb?: number;
  targetLufs?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  ducking?: {
    amountDb: number;
    attackMs: number;
    releaseMs: number;
  };
};

export type SoundTriggerIntent =
  | {
      kind: "operator";
      label?: string;
    }
  | {
      kind: "after_previous";
      delayMs?: number;
    }
  | {
      kind: "session_clock";
      offsetMs: number;
    }
  | {
      kind: "moment_signal";
      signal: string;
      delayMs?: number;
      requiresOperatorConfirmation: boolean;
    };

export type SoundSyncLevel =
  | "none"
  | "coordinated"
  | "device_local"
  | "media_bound";

export type SoundSyncIntent = {
  level: SoundSyncLevel;
  groupId?: EntityId;
  offsetMs?: number;
  driftToleranceMs?: number;
};

export type SoundFailurePolicy = {
  onUnavailable:
    | "stop_and_ask"
    | "wait_for_operator"
    | "skip_to_next_approved"
    | "insert_silence";
  retry?: {
    maxAttempts: number;
    backoffMs: number;
  };
  timeoutMs?: number;
  silenceDurationMs?: number;
};

export type SoundSequencePurpose =
  | "soundtrack"
  | "radio_program"
  | "story"
  | "podcast"
  | "ceremony"
  | "event"
  | "art"
  | "memory"
  | "rehearsal"
  | `custom:${string}`;

export type SoundSequence = {
  id: EntityId;
  home: SoundHomeReference;
  title: string;
  description?: string;
  purpose: SoundSequencePurpose;
  status: "draft" | "in_review" | "approved" | "archived";
  visibility: DataLevel;
  defaultTransition?: SoundTransitionIntent;
  createdBy: UniversalReference<"card">;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

export type SoundSequenceEntry = {
  id: EntityId;
  sequence: SoundSequenceReference;
  soundItem: SoundItemReference;
  binding?: SoundMediaBindingReference;
  positionKey: string;
  enabled: boolean;
  sourceFragment?: SoundFragment;
  transitionToNext?: SoundTransitionIntent;
  gain?: SoundGainIntent;
  trigger: SoundTriggerIntent;
  sync?: SoundSyncIntent;
  failurePolicy: SoundFailurePolicy;
  note?: string;
  createdBy: UniversalReference<"card">;
  createdAt: string;
  updatedAt: string;
  version: number;
};