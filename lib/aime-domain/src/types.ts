export type EntityId = string;

export type EntityKind =
  | "card"
  | "world"
  | "place"
  | "moment"
  | "resource"
  | "document"
  | "media"
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
  | "moderation.review";

export type CapabilityContext = {
  authenticated: boolean;
  worldRole?: WorldAccessRole;
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

export type UniversalReference = {
  kind: EntityKind;
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