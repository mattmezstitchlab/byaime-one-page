import type {
  EntityId,
  UniversalReference,
} from "./types";
import type {
  SoundItem,
  SoundMediaBinding,
} from "./sound-core";
import type {
  SoundProviderMapping,
} from "./sound-policy";

export type LegacyMusicTrackSnapshot = {
  id: string;
  moment: string;
  title: string;
  artist: string;
  status: "a_choisir" | "valide";
  notes?: string;
  timelineEventIds?: readonly string[];
  provenance?: "real" | "demo" | "suggested" | "integration";
  external?: {
    provider: string;
    externalId: string;
    verifiedAt: number;
  };
};

export type LegacyTimelineMusicRelation = {
  momentId: string;
  musicTrackId: string;
  role?: string;
};

export type SoundLegacyMigrationIssue = {
  code:
    | "missing_moment"
    | "link_only_on_track"
    | "link_only_on_timeline"
    | "conflicting_links"
    | "unknown_provider_availability"
    | "user_content_marked_demo";
  trackId: string;
  momentIds?: readonly string[];
  message: string;
  requiresReview: boolean;
};

export type SoundLegacyMigrationInput = {
  world: UniversalReference<"world">;
  migratedBy: UniversalReference<"card">;
  migratedAt: string;
  tracks: readonly LegacyMusicTrackSnapshot[];
  timelineRelations: readonly LegacyTimelineMusicRelation[];
};

export type SoundLegacyIdMap = {
  legacyTrackId: string;
  soundItemId: EntityId;
};

export type SoundLegacyReadOnlyProjection = {
  generatedFromPartitionRevision: number;
  readOnly: true;
  tracks: readonly LegacyMusicTrackSnapshot[];
  timelineRelations: readonly LegacyTimelineMusicRelation[];
};

export type SoundLegacyMigrationOutput = {
  items: readonly SoundItem[];
  bindings: readonly SoundMediaBinding[];
  providerMappings: readonly SoundProviderMapping[];
  idMap: readonly SoundLegacyIdMap[];
  issues: readonly SoundLegacyMigrationIssue[];
  legacyProjection: SoundLegacyReadOnlyProjection;
};

export interface SoundLegacyMusicCompatibility {
  migrate(input: SoundLegacyMigrationInput): SoundLegacyMigrationOutput;
  projectLegacy(input: {
    partitionRevision: number;
    items: readonly SoundItem[];
    bindings: readonly SoundMediaBinding[];
    mappings: readonly SoundProviderMapping[];
  }): SoundLegacyReadOnlyProjection;
}