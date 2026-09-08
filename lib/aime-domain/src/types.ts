export type EntityId = string;

export type EntityKind =
  | "card"
  | "world"
  | "place"
  | "moment"
  | "emotion"
  | "resource"
  | "document"
  | "media"
  | "sound_item"
  | "sound_sequence"
  | "sound_sequence_entry"
  | "sound_folder"
  | "sound_folder_membership"
  | "sound_tag"
  | "sound_tag_membership"
  | "sound_media_asset"
  | "sound_media_binding"
  | "sound_provider_mapping"
  | "sound_provider_policy"
  | "sound_rights_statement"
  | "sound_consent_statement"
  | "sound_usage_decision"
  | "sound_publication_record"
  | "sound_space"
  | "sound_space_member"
  | "sound_contribution"
  | "sound_decision"
  | "sound_partition"
  | "sound_playback_plan"
  | "sound_playback_grant"
  | "sound_playback_session"
  | "sound_playback_command"
  | "sound_playback_event"
  | "proposal"
  | "lab_board";

export type CardKind =
  | "person"
  | "organization"
  | "company"
  | "association"
  | "artist"
  | "professional"
  | "place"
  | "service"
  | "resource";

export type WorldAccessRole =
  | "owner"
  | "admin"
  | "editor"
  | "contributor"
  | "commenter"
  | "viewer";

export type SoundAccessRole =
  | "owner"
  | "curator"
  | "contributor"
  | "commenter"
  | "reviewer"
  | "moderator"
  | "operator"
  | "viewer";

export type LegacyProjectRole = "owner" | "planner" | "family" | "viewer";

export type SocialRelation =
  | "owner"
  | "card_admin"
  | "connected"
  | "follower"
  | "invited"
  | "visitor"
  | "blocked";

export type DataLevel =
  | "public"
  | "network"
  | "world"
  | "operations"
  | "financial"
  | "private"
  | "exact_location"
  | "moderation";

export type Capability =
  | "card.view"
  | "card.follow"
  | "card.contact"
  | "card.edit"
  | "card.location.exact.read"
  | "card.location.exact.edit"
  | "world.view"
  | "world.edit"
  | "world.join.request"
  | "world.invite"
  | "world.manage_members"
  | "world.manage_modules"
  | "world.publish"
  | "world.export"
  | "world.delete"
  | "moment.create"
  | "moment.edit"
  | "document.upload"
  | "document.read"
  | "document.analyze"
  | "proposal.validate"
  | "resource.offer"
  | "resource.request"
  | "payment.read"
  | "payment.manage"
  | "media.publish"
  | "sound.view"
  | "sound.contribute"
  | "sound.comment"
  | "sound.vote"
  | "sound.review"
  | "sound.decide"
  | "sound.publish"
  | "sound.control_session"
  | "sound.manage_rights"
  | "sound.moderate"
  | "moderation.review";

export type SpecializedPermission =
  | "modules.manage"
  | "members.invite"
  | "world.delete"
  | "world.export"
  | "proposal.validate"
  | "documents.operations.read"
  | "documents.financial.read"
  | "documents.private.read"
  | "payments.read"
  | "payments.manage"
  | "locations.exact.read"
  | "locations.exact.edit"
  | "media.publish"
  | "sound.decide"
  | "sound.publish"
  | "sound.control_session"
  | "sound.manage_rights"
  | "sound.moderate"
  | "moderation.review";

export type CapabilityContext = {
  authenticated: boolean;
  worldRole?: WorldAccessRole;
  soundRole?: SoundAccessRole;
  socialRelation?: SocialRelation;
  subjectOwned?: boolean;
  ownsContribution?: boolean;
  dataLevel?: DataLevel;
  permissions?: ReadonlySet<SpecializedPermission>;
  contactAllowed?: boolean;
  worldPublic?: boolean;
  subjectPublic?: boolean;
};

export type CapabilityDecision = {
  allowed: boolean;
  reason: string;
  requiresAuthentication?: boolean;
  requiresConfirmation?: boolean;
};

export type UniversalReference<K extends EntityKind = EntityKind> = {
  kind: K;
  id: EntityId;
};

export type UniversalRelation = {
  id: EntityId;
  from: UniversalReference;
  to: UniversalReference;
  kind: string;
  visibility: DataLevel;
  validFrom?: string;
  validUntil?: string;
  source?: UniversalReference;
};

export type WorldMembership = {
  id: EntityId;
  worldId: EntityId;
  cardId: EntityId;
  accessRole: WorldAccessRole;
  businessRole?: string;
  status: "invited" | "active" | "declined" | "removed";
};

export type MapSubject = {
  ref: UniversalReference;
  label: string;
  summary?: string;
  imageUrl?: string;
  locationLevel: Exclude<DataLevel, "financial" | "moderation">;
  latitude?: number;
  longitude?: number;
  city?: string;
  primaryCapability?: Capability;
};

/**
 * Trace left by a read adapter. The legacy identifier is searchable and
 * auditable, but must never be used as the canonical entity reference.
 */
export type LegacyTrace = {
  source: "world_project_json" | "supabase";
  entityKind: string;
  legacyId: EntityId;
};

export type AuthorizedMapSubject = MapSubject & {
  worldRef: UniversalReference<"world">;
  legacy?: LegacyTrace;
  capabilities: Partial<Record<Capability, CapabilityDecision>>;
};

export type NetworkProjection = {
  generatedAt: string;
  subjects: AuthorizedMapSubject[];
  relations: UniversalRelation[];
};