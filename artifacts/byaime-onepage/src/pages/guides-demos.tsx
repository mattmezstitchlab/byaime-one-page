import { type ReactNode } from "react";
import {
  ActionPillFakeUI, BudgetFakeUI, CeremonyFakeUI, CreateMondeFakeUI, DayofFakeUI, DocumentsFakeUI,
  GuestsFakeUI, InfosFakeUI, LaboratoryFakeUI, LaboratoryTutoFakeUI, MeFakeUI, MemoriesFakeUI,
  MessagesFakeUI, MusicFakeUI, ProfileFakeUI, ProfileTimelineFakeUI, ProvidersFakeUI, RolesFakeUI,
  RsvpInviteFakeUI, SeatingFakeUI, TasksFakeUI, ThanksFakeUI, TimelineFakeUI, WorldFakeUI,
} from "./guides-fake-uis";

export type DemoStep = {
  label: string;
  content: string;
  ui: ReactNode;
  cursor: { x: number; y: number };
};

export type DemoCategory = "comprendre" | "organiser" | "jour-j" | "apres";

export type DemoConfig = {
  id: string;
  title: string;
  description: string;
  category: DemoCategory;
  steps: DemoStep[];
};

export const DEMO_CATEGORIES: { id: DemoCategory; label: string }[] = [
  { id: "comprendre", label: "Comprendre AIME" },
  { id: "organiser", label: "Organiser le mariage" },
  { id: "jour-j", label: "Le Jour J" },
  { id: "apres", label: "Après & vous" },
];

export const DEMOS: DemoConfig[] = [
  /* ——— Comprendre AIME ——— */
  {
    id: "architecture",
    title: "Un seul système, plusieurs réalités",
    description: "Votre vie n'est pas une succession de tableaux de bord jetables. Découvrez comment Profil, Monde et Laboratoire interagissent durablement.",
    category: "comprendre",
    steps: [
      { label: "Profil", content: "Votre identité durable. Une projection unique qui réunit ce qui vous concerne à travers tous les Mondes.", ui: <ProfileFakeUI />, cursor: { x: 15, y: 30 } },
      { label: "Monde", content: "L'espace collaboratif et privé. C'est ici que s'organise l'événement avec les rôles stricts et les outils dédiés.", ui: <WorldFakeUI />, cursor: { x: 50, y: 50 } },
      { label: "Laboratoire", content: "Le recueil de vos retours volontaires, reliés à leur contexte, pour faire évoluer AIME sans mélanger vos données et vos remarques.", ui: <LaboratoryFakeUI />, cursor: { x: 85, y: 70 } },
    ],
  },
  {
    id: "creation",
    title: "Créer un Monde",
    description: "Le point de départ d'une nouvelle réalité organisée, de l'intention à l'espace prêt à l'emploi.",
    category: "comprendre",
    steps: [
      { label: "L'impulsion", content: "Initiez un nouveau projet depuis votre interface globale grâce au bouton universel +.", ui: <CreateMondeFakeUI step={0} />, cursor: { x: 50, y: 50 } },
      { label: "Configuration", content: "Définissez le contexte. Le Monde est créé en privé et sa publication reste un choix du propriétaire.", ui: <CreateMondeFakeUI step={1} />, cursor: { x: 50, y: 70 } },
      { label: "Confirmation", content: "Le Monde est prêt. Un espace dédié à ce projet s'ouvre à vous.", ui: <CreateMondeFakeUI step={2} />, cursor: { x: 50, y: 80 } },
    ],
  },
  {
    id: "roles",
    title: "Les Rôles et Frontières",
    description: "Quatre rôles font varier les actions disponibles et masquent les informations d’organisation sensibles.",
    category: "comprendre",
    steps: [
      { label: "Propriétaire", content: "Le créateur du Monde. Lui seul voit les finances et peut publier ou supprimer cet espace.", ui: <RolesFakeUI role="owner" />, cursor: { x: 20, y: 30 } },
      { label: "Planificateur", content: "Un co-pilote qui organise les éléments partagés, les accès et les documents sans voir les finances ni disposer des actions réservées au propriétaire.", ui: <RolesFakeUI role="planner" />, cursor: { x: 40, y: 40 } },
      { label: "Proche (Famille)", content: "Un rôle de collaboration sur le programme et la logistique partagés, sans finances, documents ni Moments privés.", ui: <RolesFakeUI role="family" />, cursor: { x: 60, y: 50 } },
      { label: "Invité", content: "Un accès en lecture au Monde dont les informations d’organisation sensibles sont masquées. Le lien RSVP personnel reste un parcours séparé.", ui: <RolesFakeUI role="viewer" />, cursor: { x: 80, y: 60 } },
    ],
  },
  {
    id: "ai-plus-me",
    title: "AI · + · ME",
    description: "Le centre de contrôle cinématique d'AIME, accessible depuis n'importe quel écran.",
    category: "comprendre",
    steps: [
      { label: "Comprendre", content: "Demandez à l'AI de vérifier un horaire, d'analyser un conflit ou de rédiger une relance sans agir à votre place.", ui: <ActionPillFakeUI focus="ai" />, cursor: { x: 42, y: 88 } },
      { label: "Créer", content: "Le bouton + centralise toute création ou liaison de donnée dans le Monde actif de façon contextuelle.", ui: <ActionPillFakeUI focus="plus" />, cursor: { x: 50, y: 88 } },
      { label: "Contrôler", content: "ME est votre espace souverain. Gérez vos accès, votre sécurité, vos exports et passez d'un Monde à l'autre.", ui: <ActionPillFakeUI focus="me" />, cursor: { x: 58, y: 88 } },
    ],
  },

  /* ——— Organiser le mariage ——— */
  {
    id: "timeline",
    title: "La Timeline",
    description: "Tous les Moments du mariage sur une seule ligne de temps, de la première idée au Jour J.",
    category: "organiser",
    steps: [
      { label: "Trois phases", content: "Avant, Le Jour J puis Après : le Monde traverse ces trois temps et chaque Moment trouve sa place sur une seule ligne.", ui: <TimelineFakeUI step={0} />, cursor: { x: 28, y: 62 } },
      { label: "Les Moments", content: "Un Moment porte un horaire, un lieu, un responsable et un statut — et se relie aux personnes, documents et décisions.", ui: <TimelineFakeUI step={1} />, cursor: { x: 28, y: 76 } },
      { label: "Changer de vue", content: "Depuis la barre du Monde, basculez entre la vue chronologique, la Musique et les Infos pratiques.", ui: <TimelineFakeUI step={2} />, cursor: { x: 82, y: 12 } },
    ],
  },
  {
    id: "guests",
    title: "Invités & RSVP",
    description: "Liste des invités, réponses, régimes et besoins — chacun relié au Monde.",
    category: "organiser",
    steps: [
      { label: "La liste", content: "Tous les invités réunis : groupes, régimes et besoins importants.", ui: <GuestsFakeUI step={0} />, cursor: { x: 40, y: 58 } },
      { label: "Les réponses", content: "Suivez qui vient, qui hésite, qui décline — les statuts RSVP se mettent à jour.", ui: <GuestsFakeUI step={1} />, cursor: { x: 62, y: 48 } },
      { label: "Le lien RSVP", content: "Chaque invité reçoit un lien personnel pour répondre sans accéder au Monde.", ui: <GuestsFakeUI step={2} />, cursor: { x: 50, y: 62 } },
    ],
  },
  {
    id: "budget",
    title: "Budget & finances",
    description: "Dépenses, paiements et engagements réunis pour garder le cap — visibles selon le rôle.",
    category: "organiser",
    steps: [
      { label: "La vision", content: "Dépenses, paiements et engagements réunis pour garder le cap.", ui: <BudgetFakeUI step={0} />, cursor: { x: 60, y: 38 } },
      { label: "Les paiements", content: "Chaque paiement relié à un prestataire et à son échéance.", ui: <BudgetFakeUI step={1} />, cursor: { x: 50, y: 62 } },
      { label: "Réservé", content: "Seuls le Propriétaire et le Planificateur voient les finances.", ui: <BudgetFakeUI step={2} />, cursor: { x: 50, y: 82 } },
    ],
  },
  {
    id: "providers",
    title: "Prestataires",
    description: "Centralisez les professionnels engagés et ceux encore recherchés.",
    category: "organiser",
    steps: [
      { label: "Contacts", content: "Centralisez les professionnels engagés et ceux encore recherchés.", ui: <ProvidersFakeUI step={0} />, cursor: { x: 40, y: 56 } },
      { label: "Décisions", content: "Tracez les choix validés et les prochaines actions.", ui: <ProvidersFakeUI step={1} />, cursor: { x: 70, y: 70 } },
      { label: "À trouver", content: "Le compteur du Monde rappelle ce qu'il reste à trouver.", ui: <ProvidersFakeUI step={2} />, cursor: { x: 70, y: 84 } },
    ],
  },
  {
    id: "tasks",
    title: "Tâches",
    description: "Ce qu'il reste à préparer, classé et daté — la progression du Monde avance avec vous.",
    category: "organiser",
    steps: [
      { label: "Préparer", content: "Ce qu'il reste à faire, classé et daté.", ui: <TasksFakeUI step={0} />, cursor: { x: 34, y: 74 } },
      { label: "La complétion", content: "La progression du Monde avance avec vos validations.", ui: <TasksFakeUI step={1} />, cursor: { x: 70, y: 84 } },
    ],
  },
  {
    id: "documents",
    title: "Documents & AIME LOCAL",
    description: "Les fichiers privés du Monde, et l'import depuis votre dossier local.",
    category: "organiser",
    steps: [
      { label: "Privés", content: "Les fichiers du Monde restent privés, servis sans cache public.", ui: <DocumentsFakeUI step={0} />, cursor: { x: 40, y: 56 } },
      { label: "AIME LOCAL", content: "Importez depuis votre dossier local en reliant vos fichiers au Monde.", ui: <DocumentsFakeUI step={1} />, cursor: { x: 60, y: 66 } },
      { label: "Accès", content: "Les droits dépendent du rôle, les transferts passent par un jeton court et signé.", ui: <DocumentsFakeUI step={2} />, cursor: { x: 40, y: 84 } },
    ],
  },
  {
    id: "messages",
    title: "Messages",
    description: "Invitations et relances : préparés une fois, envoyés seulement après confirmation.",
    category: "organiser",
    steps: [
      { label: "Modèles", content: "Préparez vos invitations et relances une fois, réutilisez-les.", ui: <MessagesFakeUI step={0} />, cursor: { x: 40, y: 56 } },
      { label: "Confirmation", content: "Aucun message ne part sans votre confirmation explicite.", ui: <MessagesFakeUI step={1} />, cursor: { x: 70, y: 72 } },
      { label: "Suivi", content: "Chaque envoi reste relié à son Moment et à ses destinataires.", ui: <MessagesFakeUI step={2} />, cursor: { x: 40, y: 84 } },
    ],
  },
  {
    id: "music",
    title: "Musique",
    description: "Chaque morceau se relie aux Moments — la projection sonore de la Timeline.",
    category: "organiser",
    steps: [
      { label: "Reliée", content: "Chaque morceau se relie à un ou plusieurs Moments.", ui: <MusicFakeUI step={0} />, cursor: { x: 40, y: 56 } },
      { label: "Pas une playlist", content: "La destination « Musique » est la projection sonore de la Timeline.", ui: <MusicFakeUI step={1} />, cursor: { x: 50, y: 82 } },
    ],
  },
  {
    id: "seating",
    title: "Plan de table",
    description: "Tables, capacités et placements — le plan se met à jour en direct.",
    category: "organiser",
    steps: [
      { label: "Les tables", content: "Tables, capacités et placements réunis.", ui: <SeatingFakeUI step={0} />, cursor: { x: 30, y: 52 } },
      { label: "Placer", content: "Déplacez chaque invité à sa table.", ui: <SeatingFakeUI step={1} />, cursor: { x: 70, y: 60 } },
    ],
  },
  {
    id: "ceremony",
    title: "Cérémonie & réception",
    description: "Le déroulé, les lectures, les vœux et le menu du Jour J.",
    category: "organiser",
    steps: [
      { label: "Le déroulé", content: "Structure numérotée du Jour J.", ui: <CeremonyFakeUI step={0} />, cursor: { x: 40, y: 58 } },
      { label: "Lectures & vœux", content: "Textes et vœux de chacun, conservés au même endroit.", ui: <CeremonyFakeUI step={1} />, cursor: { x: 40, y: 66 } },
      { label: "Le menu", content: "Menu, boissons, gâteau, première danse.", ui: <CeremonyFakeUI step={2} />, cursor: { x: 40, y: 66 } },
    ],
  },

  /* ——— Le Jour J ——— */
  {
    id: "dayof",
    title: "La Régie du Jour J",
    description: "Le programme opérationnel en direct, avec chaque responsable.",
    category: "jour-j",
    steps: [
      { label: "En direct", content: "Le programme opérationnel, minute par minute.", ui: <DayofFakeUI step={0} />, cursor: { x: 40, y: 60 } },
      { label: "Les rôles", content: "Chaque responsable connaît sa mission.", ui: <DayofFakeUI step={1} />, cursor: { x: 40, y: 76 } },
    ],
  },
  {
    id: "infos",
    title: "Infos pratiques invités",
    description: "Accès, parking, météo — les informations utiles aux personnes concernées.",
    category: "jour-j",
    steps: [
      { label: "Utiles", content: "Accès, parking, hébergement, météo.", ui: <InfosFakeUI step={0} />, cursor: { x: 40, y: 58 } },
      { label: "Publiques", content: "Ces informations sont rendues visibles aux personnes concernées.", ui: <InfosFakeUI step={1} />, cursor: { x: 40, y: 82 } },
    ],
  },
  {
    id: "rsvp-invite",
    title: "Le parcours invité (RSVP)",
    description: "Répondre, consulter son programme et proposer un morceau — sans accéder au Monde.",
    category: "jour-j",
    steps: [
      { label: "Sans accès", content: "L'invité répond sans jamais entrer dans le Monde.", ui: <RsvpInviteFakeUI step={0} />, cursor: { x: 40, y: 58 } },
      { label: "Sa participation", content: "Programme personnel, musique et souvenirs.", ui: <RsvpInviteFakeUI step={1} />, cursor: { x: 40, y: 72 } },
      { label: "Confirmé", content: "Votre réponse a bien été enregistrée.", ui: <RsvpInviteFakeUI step={2} />, cursor: { x: 40, y: 84 } },
    ],
  },

  /* ——— Après & vous ——— */
  {
    id: "memories",
    title: "Souvenirs & médias",
    description: "Photos et vidéos partagées avec consentement, reliées au Monde.",
    category: "apres",
    steps: [
      { label: "Partager", content: "Photos et vidéos avec consentement.", ui: <MemoriesFakeUI step={0} />, cursor: { x: 34, y: 52 } },
      { label: "Consentement", content: "Chaque média passe par une modération avant visibilité.", ui: <MemoriesFakeUI step={1} />, cursor: { x: 40, y: 74 } },
      { label: "Après", content: "Les souvenirs restent reliés au Monde, bien après le Jour J.", ui: <MemoriesFakeUI step={2} />, cursor: { x: 40, y: 82 } },
    ],
  },
  {
    id: "thanks",
    title: "Remerciements & actualités",
    description: "Les mots après le mariage, et les nouvelles partagées aux invités.",
    category: "apres",
    steps: [
      { label: "Les mots", content: "Préparez vos remerciements.", ui: <ThanksFakeUI step={0} />, cursor: { x: 40, y: 56 } },
      { label: "Actualités", content: "Partagez des nouvelles avec les invités, à votre rythme.", ui: <ThanksFakeUI step={1} />, cursor: { x: 40, y: 82 } },
    ],
  },
  {
    id: "profile",
    title: "Votre Profil",
    description: "Votre histoire durable : Timeline, Le Fil et publication, à travers tous les Mondes.",
    category: "apres",
    steps: [
      { label: "La Timeline", content: "Votre histoire durable, à travers tous les Mondes.", ui: <ProfileTimelineFakeUI step={0} />, cursor: { x: 18, y: 58 } },
      { label: "Le Fil", content: "Le flux de vos Moments, à vous.", ui: <ProfileTimelineFakeUI step={1} />, cursor: { x: 46, y: 58 } },
      { label: "Publier", content: "Vous choisissez ce qui devient public.", ui: <ProfileTimelineFakeUI step={2} />, cursor: { x: 76, y: 58 } },
    ],
  },
  {
    id: "laboratory",
    title: "Le Laboratoire",
    description: "Un problème, une idée, une remarque — reliés à leur contexte et suivis.",
    category: "apres",
    steps: [
      { label: "Retours", content: "Un problème, une idée, une remarque — reliés à leur contexte.", ui: <LaboratoryTutoFakeUI step={0} />, cursor: { x: 40, y: 52 } },
      { label: "Contexte", content: "Chaque retour garde la trace du Monde et de l'écran d'où il vient.", ui: <LaboratoryTutoFakeUI step={1} />, cursor: { x: 40, y: 68 } },
      { label: "Suivi", content: "Reçu → En cours → Résolu : votre retour reste visible.", ui: <LaboratoryTutoFakeUI step={2} />, cursor: { x: 50, y: 82 } },
    ],
  },
  {
    id: "me",
    title: "ME, votre espace",
    description: "Identité, sécurité, exports et apparence — vous gardez la maîtrise.",
    category: "apres",
    steps: [
      { label: "Le compte", content: "Identité, accès et sécurité.", ui: <MeFakeUI step={0} />, cursor: { x: 40, y: 52 } },
      { label: "Les exports", content: "Téléchargez vos données, supprimez votre compte.", ui: <MeFakeUI step={1} />, cursor: { x: 40, y: 68 } },
      { label: "La maîtrise", content: "Vous gardez la maîtrise de l'identité, des droits et de la confidentialité.", ui: <MeFakeUI step={2} />, cursor: { x: 40, y: 82 } },
    ],
  },
];
