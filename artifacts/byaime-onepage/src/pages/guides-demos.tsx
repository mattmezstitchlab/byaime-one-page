import { type ReactNode } from "react";
import {
  ActionPillFakeUI, BudgetFakeUI, CeremonyFakeUI, CreateMondeFakeUI, DayofFakeUI, DocumentsFakeUI,
  GraphFakeUI, GuestsFakeUI, InfosFakeUI, MeFakeUI, MemoriesFakeUI,
  MessagesFakeUI, MusicFakeUI, ProfileFakeUI, ProfileTimelineFakeUI, ProvidersFakeUI, RolesFakeUI,
  GuidanceFakeUI, IntentionFakeUI,
  RsvpInviteFakeUI, SeatingFakeUI, SynthesisFakeUI, TasksFakeUI, ThanksFakeUI, TimelineFakeUI, WorldFakeUI,
} from "./guides-fake-uis";
import type { Locale } from "@/lib/i18n";

export type DemoStep = {
  label: string;
  content: string;
  ui: ReactNode;
  cursor: { x: number; y: number };
  /** Traductions anglaises ; en leur absence, le français s'affiche. */
  labelEn?: string;
  contentEn?: string;
};

export type DemoCategory = "comprendre" | "organiser" | "jour-j" | "apres";

export type DemoConfig = {
  id: string;
  title: string;
  description: string;
  category: DemoCategory;
  titleEn?: string;
  descriptionEn?: string;
  steps: DemoStep[];
};

export const DEMO_CATEGORIES: { id: DemoCategory; label: string; labelEn: string }[] = [
  { id: "comprendre", label: "Comprendre AIME", labelEn: "Understanding AIME" },
  { id: "organiser", label: "Organiser le mariage", labelEn: "Planning the wedding" },
  { id: "jour-j", label: "Le Jour J", labelEn: "The big day" },
  { id: "apres", label: "Après & vous", labelEn: "After & you" },
];

export function demoCategoryLabel(id: DemoCategory, locale: Locale): string {
  const category = DEMO_CATEGORIES.find(item => item.id === id);
  if (!category) return id;
  return locale === "en" ? category.labelEn : category.label;
}

export function demoTitle(demo: DemoConfig, locale: Locale): string {
  return locale === "en" && demo.titleEn ? demo.titleEn : demo.title;
}

export function demoDescription(demo: DemoConfig, locale: Locale): string {
  return locale === "en" && demo.descriptionEn ? demo.descriptionEn : demo.description;
}

export function demoStepLabel(step: DemoStep, locale: Locale): string {
  return locale === "en" && step.labelEn ? step.labelEn : step.label;
}

export function demoStepContent(step: DemoStep, locale: Locale): string {
  return locale === "en" && step.contentEn ? step.contentEn : step.content;
}

export const DEMOS: DemoConfig[] = [
  /* ——— Comprendre AIME ——— */
  {
    id: "architecture",
    title: "Un seul système, plusieurs réalités",
    description: "Votre vie n'est pas une succession de tableaux de bord jetables. Découvrez comment le Profil et le Monde interagissent durablement.",
    titleEn: "One system, several realities",
    descriptionEn: "Your life is not a series of disposable dashboards. See how the Profile and the World work together over time.",
    category: "comprendre",
    steps: [
      {
        label: "Profil", content: "Votre identité durable. Une projection unique qui réunit ce qui vous concerne à travers tous les Mondes.",
        labelEn: "Profile", contentEn: "Your lasting identity. A single projection that brings together everything about you across every World.", ui: <ProfileFakeUI />, cursor: { x: 15, y: 30 },
      },
      {
        label: "Monde", content: "L'espace collaboratif et privé. C'est ici que s'organise l'événement avec les rôles stricts et les outils dédiés.",
        labelEn: "World", contentEn: "The private, collaborative space. This is where the event is organized, with strict roles and dedicated tools.", ui: <WorldFakeUI />, cursor: { x: 50, y: 50 },
      },
    ],
  },
  {
    id: "creation",
    title: "Créer un Monde",
    description: "Le point de départ d'une nouvelle réalité organisée, de l'intention à l'espace prêt à l'emploi.",
    titleEn: "Creating a World",
    descriptionEn: "The starting point of a newly organized reality, from intention to a ready-to-use space.",
    category: "comprendre",
    steps: [
      {
        label: "L'impulsion", content: "Initiez un nouveau projet depuis votre interface globale grâce au bouton universel +.",
        labelEn: "The impulse", contentEn: "Start a new project from your global interface using the universal + button.", ui: <CreateMondeFakeUI step={0} />, cursor: { x: 50, y: 50 },
      },
      {
        label: "Configuration", content: "Définissez le contexte. Le Monde est créé en privé et sa publication reste un choix du propriétaire.",
        labelEn: "Setup", contentEn: "Define the context. The World is created privately, and publishing remains the owner's choice.", ui: <CreateMondeFakeUI step={1} />, cursor: { x: 50, y: 70 },
      },
      {
        label: "Confirmation", content: "Le Monde est prêt. Un espace dédié à ce projet s'ouvre à vous.",
        labelEn: "Confirmation", contentEn: "The World is ready. A dedicated space for this project opens up for you.", ui: <CreateMondeFakeUI step={2} />, cursor: { x: 50, y: 80 },
      },
    ],
  },
  {
    id: "intention",
    title: "La première phrase du mariage",
    description: "Cinq questions sur l'accueil suffisent à ouvrir un Monde déjà structuré : date, lieu, invités, budget, ambiance.",
    titleEn: "The wedding’s first sentence",
    descriptionEn: "Five questions on the home page open an already structured World: date, place, guests, budget and mood.",
    category: "comprendre",
    steps: [
      {
        label: "Une question à la fois", content: "Le champ du haut ne réclame pas un formulaire : une information, même approximative. AIME la note telle quelle, avec son statut.",
        labelEn: "One question at a time", contentEn: "The top field isn't asking for a form: a single piece of information, even approximate. AIME notes it as-is, with its status.", ui: <IntentionFakeUI step={0} />, cursor: { x: 52, y: 55 },
      },
      {
        label: "Cinq réponses", content: "Date, ville, convives, enveloppe, ambiance. Rien n'est perdu : la saisie est conservée sur cet appareil, même sans compte.",
        labelEn: "Five answers", contentEn: "Date, city, guests, budget, mood. Nothing is lost: your input is kept on this device, even without an account.", ui: <IntentionFakeUI step={1} />, cursor: { x: 50, y: 38 },
      },
      {
        label: "Un Monde ouvert", content: "La phrase produite devient le Monde. Timeline, invités et finances naissent déjà reliés, à confirmer à votre rythme.",
        labelEn: "An open World", contentEn: "The resulting sentence becomes the World. Timeline, guests and finances are born already linked, to be confirmed at your pace.", ui: <IntentionFakeUI step={2} />, cursor: { x: 50, y: 70 },
      },
    ],
  },
  {
    id: "roles",
    title: "Les Rôles et Frontières",
    description: "Quatre rôles font varier les actions disponibles et masquent les informations d’organisation sensibles.",
    titleEn: "Roles & boundaries",
    descriptionEn: "Four roles change the available actions and hide sensitive planning information.",
    category: "comprendre",
    steps: [
      {
        label: "Propriétaire", content: "Le créateur du Monde. Lui seul voit les finances et peut publier ou supprimer cet espace.",
        labelEn: "Owner", contentEn: "The World’s creator. Only they see finances and can publish or delete the space.", ui: <RolesFakeUI role="owner" />, cursor: { x: 20, y: 30 },
      },
      {
        label: "Planificateur", content: "Un co-pilote qui organise les éléments partagés, les accès et les documents sans voir les finances ni disposer des actions réservées au propriétaire.",
        labelEn: "Planner", contentEn: "A co-pilot who organizes shared items, access and documents, without seeing finances or using owner-only actions.", ui: <RolesFakeUI role="planner" />, cursor: { x: 40, y: 40 },
      },
      {
        label: "Proche (Famille)", content: "Un rôle de collaboration sur le programme et la logistique partagés, sans finances, documents ni Moments privés.",
        labelEn: "Loved one (family)", contentEn: "A collaborative role on the shared program and logistics, without finances, documents or private Moments.", ui: <RolesFakeUI role="family" />, cursor: { x: 60, y: 50 },
      },
      {
        label: "Invité", content: "Un accès en lecture au Monde dont les informations d’organisation sensibles sont masquées. Le lien RSVP personnel reste un parcours séparé.",
        labelEn: "Guest", contentEn: "Read-only access to the World, with sensitive planning information hidden. The personal RSVP link remains a separate journey.", ui: <RolesFakeUI role="viewer" />, cursor: { x: 80, y: 60 },
      },
    ],
  },
  {
    id: "ai-plus-me",
    title: "AI · + · ME",
    description: "Le centre de contrôle cinématique d'AIME, accessible depuis n'importe quel écran.",
    titleEn: "AI · + · ME",
    descriptionEn: "AIME’s cinematic control center, reachable from any screen.",
    category: "comprendre",
    steps: [
      {
        label: "Comprendre", content: "Demandez à l'AI de vérifier un horaire, d'analyser un conflit ou de rédiger une relance sans agir à votre place.",
        labelEn: "Understand", contentEn: "Ask AI to check a time, analyze a conflict or draft a follow-up, without acting in your place.", ui: <ActionPillFakeUI focus="ai" />, cursor: { x: 42, y: 88 },
      },
      {
        label: "Créer", content: "Le bouton + centralise toute création ou liaison de donnée dans le Monde actif de façon contextuelle.",
        labelEn: "Create", contentEn: "The + button centralizes every data creation or link within the active World, contextually.", ui: <ActionPillFakeUI focus="plus" />, cursor: { x: 50, y: 88 },
      },
      {
        label: "Contrôler", content: "ME est votre espace souverain. Gérez vos accès, votre sécurité, vos exports et passez d'un Monde à l'autre.",
        labelEn: "Control", contentEn: "ME is your sovereign space. Manage access, security, exports and switch between Worlds.", ui: <ActionPillFakeUI focus="me" />, cursor: { x: 58, y: 88 },
      },
    ],
  },
  {
    id: "guidance",
    title: "AIME vous guide à chaque écran",
    description: "Une puce dans le chrome de chaque panneau, un onglet « Me guider » dans le panneau AI : l'agent connaît l'architecture et l'état réel du Monde.",
    titleEn: "AIME guides you on every screen",
    descriptionEn: "A chip on every panel’s frame, a “Guide me” tab in the AI panel: the agent knows the architecture and the World’s real state.",
    category: "comprendre",
    steps: [
      {
        label: "Ici", content: "Chaque panneau porte « Expliquer cet écran » : à quoi sert cet endroit, ce qu'on y fait, l'erreur classique à éviter.",
        labelEn: "Here", contentEn: "Every panel carries “Explain this screen”: what this place is for, what you do there, the classic mistake to avoid.", ui: <GuidanceFakeUI step={0} />, cursor: { x: 84, y: 13 },
      },
      {
        label: "Ensuite", content: "L'onglet « Me guider » liste ce qui bloque vraiment — date non confirmée, réponses en attente, aucune table — et le bouton qui y va.",
        labelEn: "Next", contentEn: "The “Guide me” tab lists what’s truly blocking — unconfirmed date, pending replies, no tables — and the button that takes you there.", ui: <GuidanceFakeUI step={1} />, cursor: { x: 50, y: 46 },
      },
      {
        label: "Sous la main", content: "Une question en français ordinaire, et AIME répond par un écran qui existe, sans jamais inventer de bouton. Tout reste dans le navigateur.",
        labelEn: "At hand", contentEn: "An ordinary question in plain English, and AIME answers with a screen that exists, never inventing a button. Everything stays in the browser.", ui: <GuidanceFakeUI step={2} />, cursor: { x: 40, y: 24 },
      },
    ],
  },
  {
    id: "graph",
    title: "Le Graphe de visibilité",
    description: "Le même Monde, vu selon les frontières de chaque rôle — rien n'est caché derrière une statistique.",
    titleEn: "The visibility graph",
    descriptionEn: "The same World, seen through each role’s boundaries — nothing is hidden behind a statistic.",
    category: "comprendre",
    steps: [
      {
        label: "Le graphe", content: "Chaque Moment est relié aux personnes, documents, paiements et décisions qu'il mobilise.",
        labelEn: "The graph", contentEn: "Every Moment is linked to the people, documents, payments and decisions it involves.", ui: <GraphFakeUI step={0} />, cursor: { x: 40, y: 46 },
      },
      {
        label: "Changer de rôle", content: "Vu comme un invité, les finances et les documents disparaissent : chacun ne voit que sa part.",
        labelEn: "Switch role", contentEn: "Seen as a guest, finances and documents disappear: everyone only sees their share.", ui: <GraphFakeUI step={1} />, cursor: { x: 78, y: 12 },
      },
      {
        label: "Agir", content: "Cliquez un élément visible pour l'ouvrir directement dans son panneau.",
        labelEn: "Act", contentEn: "Click a visible item to open it directly in its panel.", ui: <GraphFakeUI step={2} />, cursor: { x: 72, y: 46 },
      },
    ],
  },

  /* ——— Organiser le mariage ——— */
  {
    id: "timeline",
    title: "La Timeline",
    description: "Tous les Moments du mariage sur une seule ligne de temps, de la première idée au Jour J.",
    titleEn: "The Timeline",
    descriptionEn: "Every wedding Moment on a single timeline, from the first idea to the big day.",
    category: "organiser",
    steps: [
      {
        label: "Trois phases", content: "Avant, Le Jour J puis Après : le Monde traverse ces trois temps et chaque Moment trouve sa place sur une seule ligne.",
        labelEn: "Three phases", contentEn: "Before, the big day, then after: the World moves through these three times and every Moment finds its place on a single line.", ui: <TimelineFakeUI step={0} />, cursor: { x: 28, y: 62 },
      },
      {
        label: "Les Moments", content: "Un Moment porte un horaire, un lieu, un responsable et un statut — et se relie aux personnes, documents et décisions.",
        labelEn: "Moments", contentEn: "A Moment carries a time, a place, an owner and a status — and links to people, documents and decisions.", ui: <TimelineFakeUI step={1} />, cursor: { x: 28, y: 76 },
      },
      {
        label: "Changer de vue", content: "Depuis la barre du Monde, basculez entre la vue chronologique, la Musique et les Infos pratiques.",
        labelEn: "Change view", contentEn: "From the World bar, switch between the chronological view, Music and practical info.", ui: <TimelineFakeUI step={2} />, cursor: { x: 82, y: 12 },
      },
    ],
  },
  {
    id: "guests",
    title: "Invités & RSVP",
    description: "Liste des invités, réponses, régimes et besoins — chacun relié au Monde.",
    titleEn: "Guests & RSVP",
    descriptionEn: "Guest list, replies, diets and needs — each one linked to the World.",
    category: "organiser",
    steps: [
      {
        label: "La liste", content: "Tous les invités réunis : groupes, régimes et besoins importants.",
        labelEn: "The list", contentEn: "All guests together: groups, diets and important needs.", ui: <GuestsFakeUI step={0} />, cursor: { x: 40, y: 58 },
      },
      {
        label: "Les réponses", content: "Suivez qui vient, qui hésite, qui décline — les statuts RSVP se mettent à jour.",
        labelEn: "Replies", contentEn: "Track who is coming, who is unsure, who declines — RSVP statuses update live.", ui: <GuestsFakeUI step={1} />, cursor: { x: 62, y: 48 },
      },
      {
        label: "Le lien RSVP", content: "Chaque invité reçoit un lien personnel pour répondre sans accéder au Monde.",
        labelEn: "The RSVP link", contentEn: "Each guest receives a personal link to reply without accessing the World.", ui: <GuestsFakeUI step={2} />, cursor: { x: 50, y: 62 },
      },
    ],
  },
  {
    id: "budget",
    title: "Budget & finances",
    description: "Dépenses, paiements et engagements réunis pour garder le cap — visibles selon le rôle.",
    titleEn: "Budget & finances",
    descriptionEn: "Expenses, payments and commitments together to stay on track — visible according to role.",
    category: "organiser",
    steps: [
      {
        label: "La vision", content: "Dépenses, paiements et engagements réunis pour garder le cap.",
        labelEn: "The overview", contentEn: "Expenses, payments and commitments together to stay on track.", ui: <BudgetFakeUI step={0} />, cursor: { x: 60, y: 38 },
      },
      {
        label: "Les paiements", content: "Chaque paiement relié à un prestataire et à son échéance.",
        labelEn: "Payments", contentEn: "Every payment linked to a vendor and its due date.", ui: <BudgetFakeUI step={1} />, cursor: { x: 50, y: 62 },
      },
      {
        label: "Réservé", content: "Seuls le Propriétaire et le Planificateur voient les finances.",
        labelEn: "Restricted", contentEn: "Only the Owner and the Planner can see finances.", ui: <BudgetFakeUI step={2} />, cursor: { x: 50, y: 82 },
      },
    ],
  },
  {
    id: "providers",
    title: "Prestataires",
    description: "Centralisez les professionnels engagés et ceux encore recherchés.",
    titleEn: "Vendors",
    descriptionEn: "Bring together the professionals you’ve booked and the ones still to find.",
    category: "organiser",
    steps: [
      {
        label: "Contacts", content: "Centralisez les professionnels engagés et ceux encore recherchés.",
        labelEn: "Contacts", contentEn: "Bring together booked professionals and the ones still being sought.", ui: <ProvidersFakeUI step={0} />, cursor: { x: 40, y: 56 },
      },
      {
        label: "Décisions", content: "Tracez les choix validés et les prochaines actions.",
        labelEn: "Decisions", contentEn: "Track validated choices and next actions.", ui: <ProvidersFakeUI step={1} />, cursor: { x: 70, y: 70 },
      },
      {
        label: "À trouver", content: "Le compteur du Monde rappelle ce qu'il reste à trouver.",
        labelEn: "To find", contentEn: "The World’s counter reminds you what’s still missing.", ui: <ProvidersFakeUI step={2} />, cursor: { x: 70, y: 84 },
      },
    ],
  },
  {
    id: "tasks",
    title: "Tâches",
    description: "Ce qu'il reste à préparer, classé et daté — la progression du Monde avance avec vous.",
    titleEn: "Tasks",
    descriptionEn: "What’s left to prepare, organized and dated — the World’s progress moves with you.",
    category: "organiser",
    steps: [
      {
        label: "Préparer", content: "Ce qu'il reste à faire, classé et daté.",
        labelEn: "Prepare", contentEn: "What’s left to do, organized and dated.", ui: <TasksFakeUI step={0} />, cursor: { x: 34, y: 74 },
      },
      {
        label: "La complétion", content: "La progression du Monde avance avec vos validations.",
        labelEn: "Completion", contentEn: "The World’s progress advances as you check things off.", ui: <TasksFakeUI step={1} />, cursor: { x: 70, y: 84 },
      },
    ],
  },
  {
    id: "documents",
    title: "Documents & AIME LOCAL",
    description: "Les fichiers privés du Monde, et l'import depuis votre dossier local.",
    titleEn: "Documents & AIME LOCAL",
    descriptionEn: "The World’s private files, and import from your local folder.",
    category: "organiser",
    steps: [
      {
        label: "Privés", content: "Les fichiers du Monde restent privés, servis sans cache public.",
        labelEn: "Private", contentEn: "The World’s files stay private, served without public caching.", ui: <DocumentsFakeUI step={0} />, cursor: { x: 40, y: 56 },
      },
      {
        label: "AIME LOCAL", content: "Importez depuis votre dossier local en reliant vos fichiers au Monde.",
        labelEn: "AIME LOCAL", contentEn: "Import from your local folder by linking your files to the World.", ui: <DocumentsFakeUI step={1} />, cursor: { x: 60, y: 66 },
      },
      {
        label: "Accès", content: "Les droits dépendent du rôle, les transferts passent par un jeton court et signé.",
        labelEn: "Access", contentEn: "Rights depend on the role; transfers use a short, signed token.", ui: <DocumentsFakeUI step={2} />, cursor: { x: 40, y: 84 },
      },
    ],
  },
  {
    id: "messages",
    title: "Messages",
    description: "Invitations et relances : préparés une fois, envoyés seulement après confirmation.",
    titleEn: "Messages",
    descriptionEn: "Invitations and follow-ups: prepared once, sent only after confirmation.",
    category: "organiser",
    steps: [
      {
        label: "Modèles", content: "Préparez vos invitations et relances une fois, réutilisez-les.",
        labelEn: "Templates", contentEn: "Prepare your invitations and follow-ups once, then reuse them.", ui: <MessagesFakeUI step={0} />, cursor: { x: 40, y: 56 },
      },
      {
        label: "Confirmation", content: "Aucun message ne part sans votre confirmation explicite.",
        labelEn: "Confirmation", contentEn: "No message goes out without your explicit confirmation.", ui: <MessagesFakeUI step={1} />, cursor: { x: 70, y: 72 },
      },
      {
        label: "Suivi", content: "Chaque envoi reste relié à son Moment et à ses destinataires.",
        labelEn: "Tracking", contentEn: "Every send stays linked to its Moment and recipients.", ui: <MessagesFakeUI step={2} />, cursor: { x: 40, y: 84 },
      },
    ],
  },
  {
    id: "music",
    title: "Musique",
    description: "Chaque morceau se relie aux Moments — la projection sonore de la Timeline.",
    titleEn: "Music",
    descriptionEn: "Every track links to Moments — the Timeline’s soundtrack.",
    category: "organiser",
    steps: [
      {
        label: "Reliée", content: "Chaque morceau se relie à un ou plusieurs Moments.",
        labelEn: "Linked", contentEn: "Every track links to one or more Moments.", ui: <MusicFakeUI step={0} />, cursor: { x: 40, y: 56 },
      },
      {
        label: "Pas une playlist", content: "La destination « Musique » est la projection sonore de la Timeline.",
        labelEn: "Not a playlist", contentEn: "The “Music” area is the Timeline’s soundtrack, not a plain playlist.", ui: <MusicFakeUI step={1} />, cursor: { x: 50, y: 82 },
      },
    ],
  },
  {
    id: "seating",
    title: "Plan de table",
    description: "Tables, capacités et placements — le plan se met à jour en direct.",
    titleEn: "Seating chart",
    descriptionEn: "Tables, capacities and seats — the chart updates live.",
    category: "organiser",
    steps: [
      {
        label: "Les tables", content: "Tables, capacités et placements réunis.",
        labelEn: "Tables", contentEn: "Tables, capacities and seating in one place.", ui: <SeatingFakeUI step={0} />, cursor: { x: 30, y: 52 },
      },
      {
        label: "Placer", content: "Déplacez chaque invité à sa table.",
        labelEn: "Seat", contentEn: "Move each guest to their table.", ui: <SeatingFakeUI step={1} />, cursor: { x: 70, y: 60 },
      },
    ],
  },
  {
    id: "ceremony",
    title: "Cérémonie & réception",
    description: "Le déroulé, les lectures, les vœux et le menu du Jour J.",
    titleEn: "Ceremony & reception",
    descriptionEn: "The run sheet, readings, vows and menu of the big day.",
    category: "organiser",
    steps: [
      {
        label: "Le déroulé", content: "Structure numérotée du Jour J.",
        labelEn: "Run sheet", contentEn: "A numbered structure for the big day.", ui: <CeremonyFakeUI step={0} />, cursor: { x: 40, y: 58 },
      },
      {
        label: "Lectures & vœux", content: "Textes et vœux de chacun, conservés au même endroit.",
        labelEn: "Readings & vows", contentEn: "Everyone’s texts and vows, kept in one place.", ui: <CeremonyFakeUI step={1} />, cursor: { x: 40, y: 66 },
      },
      {
        label: "Le menu", content: "Menu, boissons, gâteau, première danse.",
        labelEn: "The menu", contentEn: "Menu, drinks, cake, first dance.", ui: <CeremonyFakeUI step={2} />, cursor: { x: 40, y: 66 },
      },
    ],
  },
  {
    id: "synthesis",
    title: "La Synthèse du Monde",
    description: "Budget, progression, invités et alertes réunis en un coup d'œil.",
    titleEn: "The World overview",
    descriptionEn: "Budget, progress, guests and alerts at a single glance.",
    category: "organiser",
    steps: [
      {
        label: "La salle de contrôle", content: "Budget engagé, progression, invités, prestataires : tout ce qui avance au même endroit.",
        labelEn: "Control room", contentEn: "Committed budget, progress, guests, vendors: everything moving, in one place.", ui: <SynthesisFakeUI step={0} />, cursor: { x: 30, y: 42 },
      },
      {
        label: "Les alertes", content: "AIME détecte les conflits de planning et vous les montre avant qu'ils ne posent problème.",
        labelEn: "Alerts", contentEn: "AIME detects scheduling conflicts and shows them before they become problems.", ui: <SynthesisFakeUI step={1} />, cursor: { x: 50, y: 88 },
      },
      {
        label: "Ouvrir", content: "Chaque carte ouvre directement le panneau correspondant.",
        labelEn: "Open", contentEn: "Each card opens its matching panel directly.", ui: <SynthesisFakeUI step={2} />, cursor: { x: 50, y: 90 },
      },
    ],
  },

  /* ——— Le Jour J ——— */
  {
    id: "dayof",
    title: "La Régie du Jour J",
    description: "Le programme opérationnel en direct, avec chaque responsable.",
    titleEn: "The big-day control desk",
    descriptionEn: "The live operational program, with each person in charge.",
    category: "jour-j",
    steps: [
      {
        label: "En direct", content: "Le programme opérationnel, minute par minute.",
        labelEn: "Live", contentEn: "The operational program, minute by minute.", ui: <DayofFakeUI step={0} />, cursor: { x: 40, y: 60 },
      },
      {
        label: "Les rôles", content: "Chaque responsable connaît sa mission.",
        labelEn: "Roles", contentEn: "Each person in charge knows their mission.", ui: <DayofFakeUI step={1} />, cursor: { x: 40, y: 76 },
      },
    ],
  },
  {
    id: "infos",
    title: "Infos pratiques invités",
    description: "Accès, parking, météo — les informations utiles aux personnes concernées.",
    titleEn: "Practical info for guests",
    descriptionEn: "Access, parking, weather — useful information for the people concerned.",
    category: "jour-j",
    steps: [
      {
        label: "Utiles", content: "Accès, parking, hébergement, météo.",
        labelEn: "Useful", contentEn: "Access, parking, accommodation, weather.", ui: <InfosFakeUI step={0} />, cursor: { x: 40, y: 58 },
      },
      {
        label: "Publiques", content: "Ces informations sont rendues visibles aux personnes concernées.",
        labelEn: "Public", contentEn: "This information is made visible to the people concerned.", ui: <InfosFakeUI step={1} />, cursor: { x: 40, y: 82 },
      },
    ],
  },
  {
    id: "rsvp-invite",
    title: "Le parcours invité (RSVP)",
    description: "Répondre, consulter son programme et proposer un morceau — sans accéder au Monde.",
    titleEn: "The guest journey (RSVP)",
    descriptionEn: "Reply, view your personal program and suggest a song — without accessing the World.",
    category: "jour-j",
    steps: [
      {
        label: "Sans accès", content: "L'invité répond sans jamais entrer dans le Monde.",
        labelEn: "No access", contentEn: "The guest replies without ever entering the World.", ui: <RsvpInviteFakeUI step={0} />, cursor: { x: 40, y: 58 },
      },
      {
        label: "Sa participation", content: "Programme personnel, musique et souvenirs.",
        labelEn: "Their participation", contentEn: "Personal program, music and memories.", ui: <RsvpInviteFakeUI step={1} />, cursor: { x: 40, y: 72 },
      },
      {
        label: "Confirmé", content: "Votre réponse a bien été enregistrée.",
        labelEn: "Confirmed", contentEn: "Your reply has been saved.", ui: <RsvpInviteFakeUI step={2} />, cursor: { x: 40, y: 84 },
      },
    ],
  },

  /* ——— Après & vous ——— */
  {
    id: "memories",
    title: "Souvenirs & médias",
    description: "Photos et vidéos partagées avec consentement, reliées au Monde.",
    titleEn: "Memories & media",
    descriptionEn: "Photos and videos shared with consent, linked to the World.",
    category: "apres",
    steps: [
      {
        label: "Partager", content: "Photos et vidéos avec consentement.",
        labelEn: "Share", contentEn: "Photos and videos, with consent.", ui: <MemoriesFakeUI step={0} />, cursor: { x: 34, y: 52 },
      },
      {
        label: "Consentement", content: "Chaque média passe par une modération avant visibilité.",
        labelEn: "Consent", contentEn: "Every piece of media goes through moderation before it becomes visible.", ui: <MemoriesFakeUI step={1} />, cursor: { x: 40, y: 74 },
      },
      {
        label: "Après", content: "Les souvenirs restent reliés au Monde, bien après le Jour J.",
        labelEn: "After", contentEn: "Memories stay linked to the World, long after the big day.", ui: <MemoriesFakeUI step={2} />, cursor: { x: 40, y: 82 },
      },
    ],
  },
  {
    id: "thanks",
    title: "Remerciements & actualités",
    description: "Les mots après le mariage, et les nouvelles partagées aux invités.",
    titleEn: "Thank-you notes & updates",
    descriptionEn: "The words after the wedding, and news shared with guests.",
    category: "apres",
    steps: [
      {
        label: "Les mots", content: "Préparez vos remerciements.",
        labelEn: "The words", contentEn: "Prepare your thank-you notes.", ui: <ThanksFakeUI step={0} />, cursor: { x: 40, y: 56 },
      },
      {
        label: "Actualités", content: "Partagez des nouvelles avec les invités, à votre rythme.",
        labelEn: "Updates", contentEn: "Share news with guests, at your own pace.", ui: <ThanksFakeUI step={1} />, cursor: { x: 40, y: 82 },
      },
    ],
  },
  {
    id: "profile",
    title: "Votre Profil",
    description: "Votre histoire durable : Timeline, Le Fil et publication, à travers tous les Mondes.",
    titleEn: "Your Profile",
    descriptionEn: "Your lasting story: Timeline, the Feed and publishing, across every World.",
    category: "apres",
    steps: [
      {
        label: "La Timeline", content: "Votre histoire durable, à travers tous les Mondes.",
        labelEn: "The Timeline", contentEn: "Your lasting story, across every World.", ui: <ProfileTimelineFakeUI step={0} />, cursor: { x: 18, y: 58 },
      },
      {
        label: "Le Fil", content: "Le flux de vos Moments, à vous.",
        labelEn: "The Feed", contentEn: "The stream of your Moments, yours.", ui: <ProfileTimelineFakeUI step={1} />, cursor: { x: 46, y: 58 },
      },
      {
        label: "Publier", content: "Vous choisissez ce qui devient public.",
        labelEn: "Publish", contentEn: "You choose what becomes public.", ui: <ProfileTimelineFakeUI step={2} />, cursor: { x: 76, y: 58 },
      },
    ],
  },
  {
    id: "me",
    title: "ME, votre espace",
    description: "Identité, sécurité, exports et apparence — vous gardez la maîtrise.",
    titleEn: "ME, your space",
    descriptionEn: "Identity, security, exports and appearance — you stay in control.",
    category: "apres",
    steps: [
      {
        label: "Le compte", content: "Identité, accès et sécurité.",
        labelEn: "The account", contentEn: "Identity, access and security.", ui: <MeFakeUI step={0} />, cursor: { x: 40, y: 52 },
      },
      {
        label: "Les exports", content: "Téléchargez vos données, supprimez votre compte.",
        labelEn: "Exports", contentEn: "Download your data, delete your account.", ui: <MeFakeUI step={1} />, cursor: { x: 40, y: 68 },
      },
      {
        label: "La maîtrise", content: "Vous gardez la maîtrise de l'identité, des droits et de la confidentialité.",
        labelEn: "Control", contentEn: "You keep control of identity, rights and privacy.", ui: <MeFakeUI step={2} />, cursor: { x: 40, y: 82 },
      },
    ],
  },
];
