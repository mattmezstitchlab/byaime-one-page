import type { WorldFocusRequest } from "./world-focus";

/**
 * Cartographie de l'architecture d'AIME, destinée à l'agent de guidage.
 *
 * Ce fichier est la seule source de vérité « pédagogique » de l'app : il décrit
 * ce qu'est chaque écran, ce qu'on y fait réellement et où l'on va ensuite. Il est
 * volontairement aligné sur le code :
 *  - les identifiants de panneaux viennent de `WEDDING_PANEL_LABELS`
 *    (`lib/wedding-navigation.ts`) ;
 *  - les sauts d'écran passent par `WorldFocusRequest` (`lib/world-focus.ts`) ;
 *  - un test (`aime-architecture.test.ts`) échoue si un panneau ou une vue
 *    apparaissent dans le code sans entrée ici, ou si une entrée promet un saut
 *    vers un panneau inexistant.
 */

export type AimeScreenId =
  | "home"
  | "portal"
  | "portal:me"
  | "portal:world-settings"
  | "portal:invite"
  | "profile"
  | "guides"
  | "creation"
  | "rsvp"
  | "invite"
  | "public-profile"
  | "legal"
  | "phase:avant"
  | "phase:pendant"
  | "phase:apres"
  | "view:chronological"
  | "view:public-info"
  | "view:day-of"
  | "view:person"
  | "view:provider"
  | "view:music"
  | "view:logistics"
  | "view:collaborative"
  | "view:memories"
  | "panel:planning"
  | "panel:guests"
  | "panel:providers"
  | "panel:dayof"
  | "panel:sections"
  | "panel:seating"
  | "panel:budget"
  | "panel:documents"
  | "panel:ceremony"
  | "panel:music"
  | "panel:logistics"
  | "panel:messages"
  | "panel:team"
  | "panel:memories"
  | "panel:contributions"
  | "panel:thanks"
  | "panel:film"
  | "panel:honeymoon";

export type AimeScreenAction = {
  label: string;
  detail: string;
  /** Saut réel dans l'app (panneau, vue, phase) via la demande de focus du Monde. */
  focus?: WorldFocusRequest;
  /** Lien simple vers une route publique ou privée. */
  href?: string;
  /** Événement de l'app qui ouvre un panneau du portail (`aime:open-me`, …). */
  emit?: string;
};

export type AimeScreen = {
  id: AimeScreenId;
  label: string;
  /** Où l'on est, dans les mots du produit. */
  where: string;
  /** À quoi sert l'écran. */
  purpose: string;
  /** Ce que l'on y fait concrètement. */
  does: string[];
  /** Pièges et habitudes qui font gagner du temps. */
  mistakes: string[];
  actions: AimeScreenAction[];
  /** Écrans qui prolongent naturellement celui-ci. */
  related: AimeScreenId[];
  /** Termes recherchables par l'agent. */
  keywords: string[];
};

const goToPanel = (panel: string, extra: Partial<WorldFocusRequest> = {}): AimeScreenAction => ({
  label: "Ouvrir ce panneau",
  detail: "AIME vous y emmène, dans la phase en cours.",
  focus: { panel, ...extra },
});

export const AIME_MODEL: { title: string; body: string }[] = [
  {
    title: "Un Monde, pas un formulaire",
    body: "Un Monde est le projet d'un événement : une date pivot, une ville, un lieu, une enveloppe, un nombre d'invités, puis tout ce qui en découle. Les six premières informations saisies sur l'accueil deviennent la première version du Monde, avec un niveau de confiance pour chacune.",
  },
  {
    title: "La Timeline est la source, les panneaux sont des projections",
    body: "Les Moments (la Timeline) portent les horaires, leur visibilité et leurs relations. Un invité, une table, un prestataire, une tâche, un document, un morceau ou un souvenir est relié à un Moment : chaque panneau n'est qu'une lecture de ces liens, jamais un silot séparé. C'est pour ça qu'un Moment modifié se retrouve partout à la fois.",
  },
  {
    title: "Confiance, pas saisie forcée",
    body: "Chaque information porte un état : confirmé, déduit, suggéré, à confirmer, manquant. AIME peut déduire (« un samedi de juin, donc plutôt fin d'après-midi pour la cérémonie ») sans jamais l'écrire comme une vérité : ce qui reste à confirmer se voit, et se valide d'un geste.",
  },
  {
    title: "Trois phases, un même Monde",
    body: "Avant, Le Jour J, Après. La navigation, les panneaux mis en avant et le vocabulaire suivent la phase déduite de la date pivot. Rien n'est supprimé entre les phases : seul ce qui est utile change de place.",
  },
  {
    title: "Rôles et frontières",
    body: "Propriétaire, planificateur, proche, invité. Les capacités (gérer, éditer l'opérationnel, voir les finances, toucher aux documents privés) déterminent ce que chacun voit : la synthèse du Monde et le graphe de visibilité servent à vérifier ces frontières avant de partager.",
  },
  {
    title: "Les personnes extérieures passent par des liens",
    body: "Chaque invité et chaque prestataire peut recevoir un lien personnel (RSVP, dépôt de photos, envoi de messages) : ces liens sont générés côté serveur et révocables. C'est par là qu'arrivent les réponses, les médias et les mots des invités, sans jamais donner accès au Monde entier.",
  },
];

export const AIME_SCREENS: Record<AimeScreenId, AimeScreen> = {
  home: {
    id: "home",
    label: "Accueil",
    where: "La page qui présente AIME à tout le monde, connecté comme non connecté.",
    purpose: "Donner à comprendre en trente secondes ce qu'est un Monde, puis permettre de commencer sans compte.",
    does: [
      "La capsule de saisie, tout en haut : une information à la fois, et AIME compose la phrase de votre mariage.",
      "Un aperçu produit, quatre atouts et les trois étapes du parcours.",
      "Le brouillon saisi ici est conservé : il vous attend après la création du compte.",
    ],
    mistakes: [
      "Essayer de tout dire d'un coup : la capsule accepte une phrase libre, mais une information à la fois suffit.",
      "Croire qu'un compte est nécessaire pour tester : la saisie reste possible avant, et rien n'est envoyé.",
    ],
    actions: [
      { label: "Créer mon espace", detail: "Ouvre la création de compte ; votre phrase sera reprise.", href: "/creation" },
      { label: "Comprendre avant", detail: "Vingt-trois démonstrations animées du fonctionnement réel.", href: "/guides" },
    ],
    related: ["guides", "creation", "portal"],
    keywords: ["accueil", "home", "commencer", "champ", "saisir", "présentation", "première fois"],
  },
  portal: {
    id: "portal",
    label: "Monde",
    where: "L'écran central de votre espace : le Monde actif, ses trois phases et ses panneaux.",
    purpose: "Tenir tout le mariage au même endroit, du premier mot écrit à la dernière photo reçue.",
    does: [
      "La barre du Monde : phase, vue, synthèse, recherche, graphe de visibilité, aperçu invité.",
      "Le hero du Monde : compte à rebours, résumé des informations et de leur niveau de confiance.",
      "Les panneaux s'ouvrent par-dessus, avec un fil d'Ariane qui ramène à l'écran d'où on est parti.",
    ],
    mistakes: [
      "Vouloir remplir les panneaux dans l'ordre : la Timeline d'abord, les panneaux se remplissent tout seuls derrière.",
      "Oublier de confirmer ce qui est « suggéré » : AIME ne présente jamais une déduction comme une vérité, il faut la valider.",
    ],
    actions: [
      { label: "Synthèse du Monde", detail: "Budget engagé, progression, invités, prestataires, alertes.", focus: { overview: true } },
      { label: "Voir tous les panneaux", detail: "La liste complète, y compris ceux du Jour J et d'après.", focus: { panel: "sections" } },
    ],
    related: ["view:chronological", "phase:avant", "panel:guests", "panel:planning"],
    keywords: ["monde", "portail", "tableau de bord", "accueil privé", "espace", "où suis-je"],
  },
  "portal:me": {
    id: "portal:me",
    label: "Votre compte personnel",
    where: "Portail privé, panneau ouvert par le bouton « Moi ».",
    purpose: "Rappeler ce que le compte contient, séparément du Monde du mariage.",
    does: [
      "Identité du compte, Monde actif, thème clair ou sombre, sortie de session.",
      "Les données du mariage n'habitent pas ici : elles appartiennent au Monde en cours.",
    ],
    mistakes: ["Chercher ici la date du Jour J ou l'enveloppe : cela se règle dans les réglages du Monde."],
    actions: [
      { label: "Ouvrir les réglages du Monde", detail: "Date, ville, lieu, enveloppe.", emit: "aime:open-world-settings" },
      { label: "Revenir à la Timeline", detail: "Le centre du Monde.", focus: { view: "chronological" } },
    ],
    related: ["portal", "profile"],
    keywords: ["compte", "moi", "profil", "connexion", "thème", "apparence", "déconnexion", "session"],
  },
  "portal:world-settings": {
    id: "portal:world-settings",
    label: "Réglages du Monde",
    where: "Portail privé, panneau des informations structurantes du Monde en cours.",
    purpose: "Poser les faits que tout le Monde suit : date pivot, ville, lieu, enveloppe, nom.",
    does: [
      "Confirmer la date du Jour J, la ville, le lieu et le budget : le statut passe de « déduit » à « confirmé ».",
      "Renommer le Monde, régler son ouverture, supprimer le Monde quand il n'est plus utile.",
      "Déclencher les contrôles de cohérence sur ce qui vient de changer.",
    ],
    mistakes: [
      "Croire que changer la date d'un Moment déplace le Jour J : le pivot se règle ici.",
      "Confirmer une date approximative : tant qu'un prestataire ne l'a pas validée, mieux vaut la laisser « à confirmer ».",
    ],
    actions: [
      { label: "Ouvrir les réglages du Monde", detail: "Date, ville, lieu, enveloppe.", emit: "aime:open-world-settings" },
      { label: "Vérifier ce qui reste à confirmer", detail: "Faits déduits ou manquants.", focus: { overview: true } },
    ],
    related: ["portal", "panel:sections", "panel:documents"],
    keywords: ["réglages", "monde", "paramètres", "date", "pivot", "ville", "lieu", "budget", "nom", "ouverture", "visibilité", "supprimer"],
  },
  "portal:invite": {
    id: "portal:invite",
    label: "Inviter à collaborer",
    where: "Portail privé, panneau d'invitation des personnes qui travaillent dans le Monde.",
    purpose: "Donner accès à la bonne personne, avec le niveau qui lui suffit.",
    does: [
      "Choisir le rôle demandé : AIME affiche les capacités réelles avant l'envoi.",
      "Un code par personne, révocable ; inviter ne rend jamais le Monde public.",
    ],
    mistakes: ["Diffuser un seul code à tout le groupe : les dépôts et les réponses ne seraient plus attribuables."],
    actions: [
      { label: "Ouvrir l'invitation", detail: "Rôle demandé, capacités, message.", emit: "aime:open-collaboration-invite" },
      { label: "Voir les rôles et capacités", detail: "Qui peut faire quoi.", focus: { panel: "team" } },
    ],
    related: ["profile", "panel:team", "view:collaborative"],
    keywords: ["inviter", "collaborer", "collaboration", "code", "accès", "rôle", "partager", "e-mail"],
  },
  profile: {
    id: "profile",
    label: "Profil",
    where: "Votre écran de compte : identité, histoire, archives et projection du Monde actif.",
    purpose: "Décider de ce que les autres voient de vous, sans que le Profil ne devienne un deuxième outil d'organisation.",
    does: [
      "Identité et histoire : ce que les invités découvrent.",
      "Publication du profil, réglage de ce qui est visible depuis le Monde actif.",
      "Suppression de compte et export de vos données.",
    ],
    mistakes: [
      "Confondre publier le profil et publier le Monde : ce sont deux réglages séparés.",
      "Publier le profil avec les coordonnées personnelles : vérifiez la visibilité avant.",
    ],
    actions: [
      { label: "Gérer mon compte", detail: "Ouvre l'écran de profil.", href: "/profile" },
      { label: "Voir comme un invité", detail: "Ce que la page publique laisse voir.", focus: { view: "public-info" } },
    ],
    related: ["public-profile", "portal"],
    keywords: ["profil", "compte", "identité", "histoire", "archives", "supprimer", "mot de passe"],
  },
  guides: {
    id: "guides",
    label: "Guides",
    where: "Vingt-trois démonstrations animées, groupées par thème, qui rejouent l'app écran par écran.",
    purpose: "Comprendre le modèle (Monde, Moments, rôles, RSVP) avant de saisir quoi que ce soit.",
    does: [
      "Quatre thèmes : comprendre AIME, organiser le mariage, le Jour J, après & vous.",
      "Chaque démo est animée, rejouable, et montre le vrai comportement de l'app.",
      "Ouverte à tous, sans compte, et indexée par les moteurs.",
    ],
    mistakes: ["Chercher une démo d'un écran qui n'existe pas encore : la liste des démos suit le code, pas l'inverse."],
    actions: [{ label: "Ouvrir les guides", detail: "Aucun compte nécessaire.", href: "/guides" }],
    related: ["home", "portal"],
    keywords: ["guide", "tutoriel", "démo", "apprendre", "comment ça marche", "aide"],
  },
  creation: {
    id: "creation",
    label: "Création du compte",
    where: "L'écran de création de compte (et de connexion) d'AIME.",
    purpose: "Ouvrir l'espace privé en gardant la phrase saisie sur l'accueil.",
    does: [
      "Formulaire géré par le service d'authentification, avec les thèmes et le français d'AIME.",
      "Votre phrase d'intention est conservée dans le navigateur et reprise automatiquement après la connexion.",
      "Le logo de l'écran renvoie à l'accueil.",
    ],
    mistakes: [
      "Refermer l'onglet en pensant avoir perdu sa phrase : elle reste dans le brouillon local.",
      "Créer un deuxième compte pour la même personne : les liens d'invitation sont rattachés au compte.",
    ],
    actions: [
      { label: "Créer mon espace", detail: "Formulaire de création de compte.", href: "/creation" },
      { label: "Me connecter", detail: "Si le compte existe déjà.", href: "/connexion" },
    ],
    related: ["home", "portal"],
    keywords: ["inscription", "compte", "connexion", "créer", "email", "mot de passe"],
  },
  rsvp: {
    id: "rsvp",
    label: "Réponse d'invité",
    where: "La page publique qu'un invité ouvre depuis son lien personnel.",
    purpose: "Recueillir la réponse, le nombre de personnes, les besoins alimentaires et les morceaux demandés.",
    does: [
      "Réponse oui/non, accompagnants, régime et allergies, mot pour les mariés.",
      "Demandes musicales quand le volet musique est ouvert.",
      "La réponse remonte immédiatement dans le panneau Invités du Monde.",
    ],
    mistakes: [
      "Envoyer le lien générique plutôt que le lien personnel : c'est lui qui porte l'identité de l'invité.",
      "Oublier de relancer les réponses « en attente » : le suivi se fait dans le panneau Invités.",
    ],
    actions: [{ label: "Suivre les réponses", detail: "Statuts, relances, besoins des personnes.", focus: { panel: "guests" } }],
    related: ["panel:guests", "invite", "panel:messages"],
    keywords: ["rsvp", "réponse", "invité", "lien", "accomppagnant", "allergies", "régime"],
  },
  invite: {
    id: "invite",
    label: "Invitation",
    where: "Le lien d'invitation d'une personne, ouvrant sa page dédiée.",
    purpose: "Donner accès à ce qui la concerne, sans ouvrir le Monde.",
    does: [
      "Accepter l'invitation, déposer des photos, répondre aux questions posées.",
      "Chaque lien est révocable depuis le panneau concerné.",
    ],
    mistakes: ["Partager un lien nominatif dans un groupe : il est personnel, révoquez-le si nécessaire."],
    actions: [{ label: "Gérer les liens", detail: "Invitations, dépôts de photos, relances.", focus: { panel: "messages" } }],
    related: ["rsvp", "panel:guests", "panel:memories"],
    keywords: ["invitation", "lien", "token", "déposer", "accepter"],
  },
  "public-profile": {
    id: "public-profile",
    label: "Page publique",
    where: "La page visible par les invités, hors espace privé.",
    purpose: "Raconter l'histoire et donner les informations utiles, sans exposer l'organisation.",
    does: [
      "Histoire du couple, informations publiques du Moment, compte à rebours.",
      "Ce qui reste privé (finances, documents, notes) n'apparaît jamais ici.",
    ],
    mistakes: ["Compter sur cette page pour la régie du Jour J : les horaires opérationnels restent privés."],
    actions: [{ label: "Que voient les invités ?", detail: "Rejoue la navigation avec les capacités d'un invité.", focus: { view: "public-info" } }],
    related: ["profile", "view:public-info"],
    keywords: ["public", "page invité", "partager", "histoire"],
  },
  legal: {
    id: "legal",
    label: "Conditions & confidentialité",
    where: "Les deux pages légales du pilote.",
    purpose: "Dire ce qui est conservé, pourquoi, et comment chaque personne garde la maîtrise de ses données.",
    does: [
      "Version datée, centralisée dans une constante du code.",
      "Choix d'apparence disponible, comme sur le reste du site.",
    ],
    mistakes: ["Oublier de changer la date de version après une modification du texte : elle est centralisée, un seul endroit."],
    actions: [
      { label: "Conditions", detail: "Les règles du pilote.", href: "/conditions" },
      { label: "Confidentialité", detail: "Données, durées, suppression.", href: "/confidentialite" },
    ],
    related: ["profile"],
    keywords: ["legal", "conditions", "confidentialité", "données", "rgpd", "suppression"],
  },
  "phase:avant": {
    id: "phase:avant",
    label: "Avant",
    where: "La période de préparation, du premier mot écrit jusqu'à la veille.",
    purpose: "Décider, engager, rassurer : tout ce qui doit être réglé avant le Jour J.",
    does: [
      "Navigation mise sur la Timeline, les personnes, les prestataires, les tâches, les documents, les finances et la musique.",
      "Les tâches portent une fenêtre (12 mois et plus, 6-12, 3-6, 1-3 mois) et une priorité.",
    ],
    mistakes: ["Attendre le devis signé pour noter une information : la saisir en « à confirmer » vaut mieux que de l'oublier."],
    actions: [
      { label: "Rester dans la phase Avant", detail: "Le Monde revient sur cette phase.", focus: { phase: "avant" } },
      { label: "Les tâches en attente", detail: "Ce qu'il reste à décider et à valider.", focus: { panel: "planning" } },
    ],
    related: ["panel:planning", "panel:providers", "panel:guests"],
    keywords: ["avant", "préparation", "en amont", "avant le jour j"],
  },
  "phase:pendant": {
    id: "phase:pendant",
    label: "Le Jour J",
    where: "Le jour même : le Monde bascule en mode régie.",
    purpose: "Tenir le programme, informer les bonnes personnes, encaisser les imprévus.",
    does: [
      "La Timeline s'affiche en direct, avec l'événement en cours et la suite.",
      "La régie, les infos pratiques, le plan de table, les contributions et la musique prennent le devant.",
      "Décaler un Moment calcule les dépendances touchées et prépare le message aux personnes concernées.",
    ],
    mistakes: ["Décaler un Moment sans regarder l'impact : AIME liste les dépendances et les conflits avant d'appliquer.", "Oublier les contacts d'urgence dans la logistique, le seul endroit où on les cherche à 20 h."],
    actions: [
      { label: "Ouvrir la régie", detail: "Le programme opérationnel du jour.", focus: { panel: "dayof" } },
      { label: "Vérifier les conflits d'horaires", detail: "La synthèse liste les Moments qui se chevauchent.", focus: { overview: true } },
    ],
    related: ["panel:dayof", "view:day-of", "panel:logistics"],
    keywords: ["jour j", "pendant", "le jour même", "déroulé", "régie"],
  },
  "phase:apres": {
    id: "phase:apres",
    label: "Après",
    where: "Après le mariage : archives, remerciements, souvenirs et voyage.",
    purpose: "Ne rien perdre de ce qui est remonté, et remercier.",
    does: [
      "Photos et vidéos déposées par les invités et le photographe, par album.",
      "Remerciements : qui n'a pas encore reçu de mot, ce qui reste à écrire.",
      "Voyage de noces et archive du Monde.",
    ],
    mistakes: ["Laisser les remerciements sans statut : la liste se suit ici, pas dans les messages.", "Ne pas archiver le Monde : il reste modifiable, donc ouvert aux modifications par erreur."],
    actions: [
      { label: "Photos & vidéos", detail: "Tout ce qui est remonté.", focus: { panel: "memories" } },
      { label: "Remerciements", detail: "À écrire, à envoyer.", focus: { panel: "thanks" } },
    ],
    related: ["panel:memories", "panel:thanks", "panel:film"],
    keywords: ["après", "remerciements", "albums", "photos", "archive", "voyage"],
  },
  "view:chronological": {
    id: "view:chronological",
    label: "Timeline",
    where: "Tous les Moments du mariage, dans leur ordre vivant.",
    purpose: "La colonne vertébrale du Monde : chaque Moment porte horaires, visibilité et relations.",
    does: [
      "Un Moment = un créneau, une phase (avant / pendant / après), une visibilité, des entités reliées.",
      "Le menu d'un Moment liste ce qui y est relié et permet d'ouvrir le panneau correspondant.",
      "La vue « personnes » et la vue « prestataires » sont des filtres de la même Timeline.",
    ],
    mistakes: ["Créer un Moment par invité : on relie les personnes à un Moment, on ne duplique pas le Moment.", "Écrire une information dans deux Moments différents : préférez le Moment parent, la projection suffira."],
    actions: [
      { label: "Revenir à la Timeline", detail: "La vue complète du Monde.", focus: { view: "chronological" } },
      { label: "Graphe de visibilité", detail: "Qui voit quoi, Moment par Moment.", focus: { graph: true } },
    ],
    related: ["view:day-of", "panel:guests", "panel:ceremony"],
    keywords: ["timeline", "moments", "programme", "déroulé", "horaires", "calendrier"],
  },
  "view:public-info": {
    id: "view:public-info",
    label: "Infos pratiques",
    where: "La vue des informations utiles aux personnes concernées.",
    purpose: "Ce qu'un invité doit savoir, sans ouvrir l'envers du décor.",
    does: [
      "N'y figurent que les Moments en visibilité « audience ».",
      "Le bouton « aperçu invité » rejoue la navigation avec les capacités d'un invité.",
    ],
    mistakes: ["Mettre un Moment en public puis le regretter : l'aperçu invité permet de vérifier avant de partager."],
    actions: [
      { label: "Voir comme un invité", detail: "Rejoue la navigation avec les capacités du rôle invité.", focus: { view: "public-info" } },
      { label: "Compléter la logistique", detail: "Accès, transports, hébergements.", focus: { panel: "logistics" } },
    ],
    related: ["public-profile", "panel:logistics", "view:person"],
    keywords: ["infos pratiques", "public", "invité voit", "adresse", "plan"],
  },
  "view:day-of": {
    id: "view:day-of",
    label: "Timeline en direct",
    where: "Le Jour J, au fil de la journée.",
    purpose: "Savoir ce qui se passe maintenant et ce qui vient.",
    does: [
      "Seuls les Moments de la phase « pendant », avec l'événement en cours et le suivant.",
      "Le compte à rebours et l'avancement se mettent à jour tant que le Jour J est ouvert.",
    ],
    mistakes: ["Compter sur la vue seule pour prévenir les retards : le message aux personnes concernées se prépare depuis le Moment."],
    actions: [{ label: "Ouvrir la régie", detail: "Qui fait quoi, et à quelle heure.", focus: { panel: "dayof" } }],
    related: ["phase:pendant", "panel:dayof", "panel:music"],
    keywords: ["direct", "jour j", "en cours", "maintenant", "retard"],
  },
  "view:person": {
    id: "view:person",
    label: "Par personne",
    where: "La Timeline filtrée sur ce qui regarde une personne.",
    purpose: "Répondre à « qu'est-ce que cette personne fait, et où ? ».",
    does: [
      "Rassemble les Moments reliés à l'invité, ses réponses et ses besoins.",
      "Sert aussi à vérifier qu'un proche n'a rien à faire à une heure donnée.",
    ],
    mistakes: ["Chercher ici les informations financières : elles relèvent des capacités, pas de la personne."],
    actions: [{ label: "Ouvrir la liste des invités", detail: "Statuts, relances, besoins.", focus: { panel: "guests" } }],
    related: ["panel:guests", "panel:seating", "view:person"],
    keywords: ["personne", "par invité", "qui fait quoi", "programme d'une personne"],
  },
  "view:provider": {
    id: "view:provider",
    label: "Par prestataire",
    where: "La Timeline filtrée sur les interventions des professionnels.",
    purpose: "Vérifier les heures d'arrivée, de départ et ce dont il dépend.",
    does: [
      "Chaque prestation reliée à un Moment : horaires, accès, contacts.",
      "Le panneau Prestataires garde le suivi commercial (statut, devis, acompte).",
    ],
    mistakes: ["Oublier de relier l'intervention d'un prestataire au Moment : sans lien, la régie ne la voit pas."],
    actions: [{ label: "Ouvrir les prestataires", detail: "Statut, montants, prochaine action.", focus: { panel: "providers" } }],
    related: ["panel:providers", "view:day-of"],
    keywords: ["prestataire", "fournisseur", "intervention", "horaires prestataire", "dépendance"],
  },
  "view:music": {
    id: "view:music",
    label: "Musique",
    where: "La projection sonore des Moments.",
    purpose: "Savoir quel morceau tourne à quel Moment, et ce qui reste à choisir.",
    does: [
      "Un morceau est relié à un ou plusieurs Moments, avec un statut « à choisir » ou « validé ».",
      "Les morceaux peuvent être vérifiés depuis une bibliothèque externe (titre, artiste, durée, lien d'écoute).",
    ],
    mistakes: ["Valider un morceau sans vérifier ses métadonnées : une recherche ambiguë sur le moment de la première danse, c'est le mal de crâne le jour même."],
    actions: [{ label: "Ouvrir la musique", detail: "Morceaux reliés, statut, notes.", focus: { panel: "music" } }],
    related: ["panel:music", "view:day-of"],
    keywords: ["musique", "morceau", "playlist", "première danse", "dj", "son"],
  },
  "view:logistics": {
    id: "view:logistics",
    label: "Vue Logistique",
    where: "La vue logistique de la Timeline.",
    purpose: "Les Moments qui impliquent des déplacements, des accès ou des créneaux techniques.",
    does: ["Navettes, installation, démontage, accès et stationnement apparaissent ici quand ils sont reliés."],
    mistakes: ["Séparer l'installation du prestataire et son créneau : reliez-les au même Moment."],
    actions: [{ label: "Ouvrir la logistique", detail: "Accès, transports, hébergements, contacts d'urgence.", focus: { panel: "logistics" } }],
    related: ["panel:logistics", "view:provider"],
    keywords: ["logistique", "navette", "stationnement", "accès", "installation", "démontage"],
  },
  "view:collaborative": {
    id: "view:collaborative",
    label: "Vue collaborative",
    where: "La Timeline partagée avec les personnes qui préparent avec vous.",
    purpose: "Voir ce que chacun a à faire, sans se marcher dessus.",
    does: ["Filtre les Moments selon les rôles et responsabilités de l'équipe."],
    mistakes: ["Tout faire passer par le compte du propriétaire : une responsabilité attribuée vaut mieux qu'un rappel oral."],
    actions: [{ label: "Ouvrir l'équipe", detail: "Responsabilités et coordination.", focus: { panel: "team" } }],
    related: ["panel:team", "view:person"],
    keywords: ["collaboratif", "équipe", "partager la préparation", "témoins"],
  },
  "view:memories": {
    id: "view:memories",
    label: "Souvenirs",
    where: "Les Moments qui ont produit des images et des mots.",
    purpose: "Retrouver ce qui a été déposé, Moment par Moment.",
    does: ["Les médias déposés par les invités et le photographe sont reliés aux Moments concernés."],
    mistakes: ["Attendre l'album complet pour archiver : chaque dépôt trouve sa place tout de suite."],
    actions: [{ label: "Ouvrir Photos & vidéos", detail: "Ce qui est arrivé, ce qui manque.", focus: { panel: "memories" } }],
    related: ["panel:memories", "phase:apres"],
    keywords: ["souvenirs", "photos", "vidéos", "média", "album"],
  },
  "panel:planning": {
    id: "panel:planning",
    label: "Tâches",
    where: "Ce qu'il reste à préparer et à valider.",
    purpose: "Transformer les décisions en choses à faire, avec une échéance et un responsable.",
    does: [
      "Une tâche a une fenêtre (12 mois et plus, 6-12, 3-6, 1-3 mois, Jour J, après), un statut et une priorité.",
      "Les tâches peuvent dépendre les unes des autres : une dépendance non résolue bloque visuellement la suite.",
      "Un échéancier se relie à un Moment pour rester cohérent avec le programme.",
    ],
    mistakes: ["Une liste de trente tâches sans responsable : mieux vaut six tâches confiées.", "Ne pas indiquer la dépendance : on se met à envoyer les faire-part avant d'avoir la date."],
    actions: [
      { label: "Voir ce qui reste", detail: "Les tâches non terminées, par fenêtre.", focus: { panel: "planning" } },
      { label: "Voir l'échéancier dans la Timeline", detail: "Les tâches à leur date.", focus: { view: "chronological" } },
    ],
    related: ["panel:providers", "panel:budget", "view:chronological"],
    keywords: ["tâches", "to do", "checklist", "liste de choses à faire", "échéances", "retard"],
  },
  "panel:guests": {
    id: "panel:guests",
    label: "Liste des invités",
    where: "Les personnes conviées, leurs réponses et leurs besoins.",
    purpose: "Tenir la liste au propre, du premier nom à la dernière réponse.",
    does: [
      "Une ligne = une personne ; le foyer (adultes, enfants, accompagnant) porte le nombre réel de couverts.",
      "Statut RSVP : en attente, confirmé, décliné. Le total des couverts en découle.",
      "Besoins alimentaires et rôle (marié, témoin, famille, invité, enfant) servent au plan de table et au traiteur.",
      "Les liens personnels d'invitation et de réponse se génèrent et se révoquent ici.",
    ],
    mistakes: [
      "Compter les lignes au lieu des couverts : un foyer avec deux enfants vaut quatre places.",
      "Saisir à la main les réponses : elles remontent du lien d'invitation, donc le lien doit être le bon.",
    ],
    actions: [
      { label: "Qui n'a pas répondu ?", detail: "Relancer les réponses en attente.", focus: { panel: "guests" } },
      { label: "Préparer les relances", detail: "Modèles et envois.", focus: { panel: "messages" } },
      { label: "Placer les gens", detail: "Capacité des tables et placement.", focus: { panel: "seating" } },
    ],
    related: ["panel:seating", "rsvp", "panel:messages", "panel:ceremony"],
    keywords: ["invités", "liste", "rsvp", "réponses", "couverts", "enfants", "accompagnant", "allergies", "régime", "relancer"],
  },
  "panel:seating": {
    id: "panel:seating",
    label: "Plan de table",
    where: "Les tables, leurs capacités et le placement.",
    purpose: "Placer tout le monde sans surprise le jour de l'ouverture des portes.",
    does: [
      "Une table a une capacité ; le placement la remplit, les dépassements sont signalés.",
      "Les besoins alimentaires suivent la personne, donc le placement les donne au traiteur.",
      "On place à partir des réponses, pas des intentions.",
    ],
    mistakes: ["Placer avant d'avoir les réponses : on recommence deux fois.", "Séparer un foyer sans raison : les enfants comptent dans la table des parents."],
    actions: [
      { label: "Ouvrir le plan de table", detail: "Tables, capacités, placements.", focus: { panel: "seating" } },
      { label: "Vérifier les réponses", detail: "Qui est confirmé.", focus: { panel: "guests" } },
    ],
    related: ["panel:guests", "panel:ceremony", "panel:dayof"],
    keywords: ["plan de table", "tables", "placement", "placé", "capacité", "carré"],
  },
  "panel:providers": {
    id: "panel:providers",
    label: "Prestataires",
    where: "Les professionnels engagés ou encore recherchés.",
    purpose: "Ne rien laisser en suspend : qui est sûr, qui reste à décider, ce que ça coûte.",
    does: [
      "Un prestataire suit un pipeline : recherche, contacté, rencontre, devis, réservé.",
      "Il porte un montant, un acompte, ce qui est payé et une prochaine action datée.",
      "Chaque catégorie (lieu, traiteur, photo, vidéo, fleuriste, musique, officiant, tenue, beauté, papeterie, transport, hébergement) peut être vide volontairement.",
    ],
    mistakes: ["Réserver sans déposer le contrat : le document se relie au prestataire.", "Ne pas noter la prochaine action : un prestataire « devis reçu » sans date devient un angle mort."],
    actions: [
      { label: "Ouvrir les prestataires", detail: "Statuts, montants, prochaine action.", focus: { panel: "providers" } },
      { label: "Vérifier les engagements financiers", detail: "Ce qui est engagé face à l'enveloppe.", focus: { panel: "budget" } },
      { label: "Préparer le planning d'un prestataire", detail: "Demande formulée en langage naturel.", focus: { panel: "providers" } },
    ],
    related: ["panel:budget", "panel:documents", "view:provider"],
    keywords: ["prestataire", "fournisseur", "devis", "réserver", "traiteur", "photographe", "fleuriste", "hébergement", "contact"],
  },
  "panel:budget": {
    id: "panel:budget",
    label: "Finances",
    where: "Budget, engagements, paiements et échéances.",
    purpose: "Savoir ce qui est engagé et ce qui reste à sortir, sans tableur à côté.",
    does: [
      "L'enveloppe est une information à confirmer comme les autres : sans elle, pas de reste possible.",
      "Un paiement est payé ou dû, avec une échéance et une catégorie.",
      "Les montants des prestataires alimentent l'engagé : on ne les ressaisit pas ici.",
    ],
    mistakes: ["Payer un acompte sans l'enregistrer : l'engagé reste faux.", "Confier les finances à un rôle qui n'y a pas accès : la visibilité se vérifie dans le graphe."],
    actions: [
      { label: "Ouvrir les finances", detail: "Enveloppe, engagé, payé, à venir.", focus: { panel: "budget" } },
      { label: "Vérifier qui voit les finances", detail: "Graphe de visibilité par rôle.", focus: { graph: true } },
    ],
    related: ["panel:providers", "panel:documents", "panel:contributions"],
    keywords: ["budget", "argent", "dépenses", "paiement", "acompte", "devis", "coût", "échéance", "finances"],
  },
  "panel:documents": {
    id: "panel:documents",
    label: "Documents",
    where: "Les fichiers privés reliés à ce Monde.",
    purpose: "Retrouver un contrat ou un devis au moment où on en a besoin.",
    does: [
      "Un document a une nature (devis, contrat, facture, autre), une date et un prestataire optionnel.",
      "Le dépôt passe par un stockage objet privé ; rien n'est public.",
      "Seuls les rôles autorisés y accèdent.",
    ],
    mistakes: ["Nommer un fichier « scan0003.pdf » : reliez-le au prestataire et datez-le.", "Attendre la signature pour archiver : le devis vaut trace."],
    actions: [{ label: "Ouvrir les documents", detail: "Devis, contrats, factures.", focus: { panel: "documents" } }],
    related: ["panel:providers", "panel:budget"],
    keywords: ["documents", "contrat", "facture", "devis", "papier", "signature", "fichier"],
  },
  "panel:ceremony": {
    id: "panel:ceremony",
    label: "Cérémonie & réception",
    where: "Le déroulé, les lectures, le menu et les détails de la fête.",
    purpose: "Que la cérémonie ressemble à ce qu'on a décidé, et que le traiteur ait le bon nombre.",
    does: [
      "Structure de la cérémonie, notes, traditions.",
      "Lectures et vœux, avec la personne qui les porte.",
      "Menu, boissons, gâteau, première danse.",
    ],
    mistakes: ["Oublier de relier les restrictions alimentaires : elles viennent de la liste des invités, il faut les relire dans le menu.", "Écrire les vœux dans une note personnelle : ici, ils sont partagés avec le célébrant."],
    actions: [
      { label: "Ouvrir la cérémonie", detail: "Structure, lectures, vœux, menu.", focus: { panel: "ceremony" } },
      { label: "Relire les besoins des invités", detail: "Allergies et régimes.", focus: { panel: "guests" } },
    ],
    related: ["panel:guests", "panel:music", "view:chronological"],
    keywords: ["cérémonie", "vœux", "lectures", "menu", "traiteur", "gâteau", "première danse", "déroulé"],
  },
  "panel:music": {
    id: "panel:music",
    label: "Morceaux reliés",
    where: "La liste des morceaux et les Moments où ils jouent.",
    purpose: "Que la bande-son soit prête, vérifiée et transmissible au DJ.",
    does: [
      "Un morceau est « à choisir » ou « validé », avec des notes.",
      "Les métadonnées peuvent être vérifiées depuis une bibliothèque externe (titre, artiste, durée, lien).",
      "Le lien avec les Moments rend la musique exportable avec le programme.",
    ],
    mistakes: ["Garder un titre « à choisir » jusqu'à la veille.", "Ne pas noter l'interdit : une liste noire évite les mauvaises surprises."],
    actions: [{ label: "Ouvrir la musique", detail: "Morceaux, statuts, Moments reliés.", focus: { panel: "music" } }],
    related: ["view:music", "panel:ceremony", "panel:dayof"],
    keywords: ["musique", "morceau", "playlist", "dj", "son", "première danse", "entrée"],
  },
  "panel:dayof": {
    id: "panel:dayof",
    label: "Régie du Jour J",
    where: "Le programme opérationnel du mariage, en direct.",
    purpose: "Que chacun sache quoi faire, quand, et qui prévenir si ça glisse.",
    does: [
      "Le fil des Moments du jour, l'événement en cours et le suivant.",
      "Décaler un Moment propose l'application aux dépendances et prépare le message aux personnes concernées.",
      "Les responsabilités de l'équipe et les contacts d'urgence sont à portée de main.",
    ],
    mistakes: ["Décaler sans prévenir : la proposition liste qui est concerné, envoyez le message.", "Charger la régie d'informations personnelles : ce qui est privé reste privé."],
    actions: [
      { label: "Ouvrir la régie", detail: "Le jour, minute par minute.", focus: { panel: "dayof" } },
      { label: "Voir les conflits d'horaires", detail: "Alertes de la synthèse du Monde.", focus: { overview: true } },
    ],
    related: ["phase:pendant", "view:day-of", "panel:team", "panel:logistics"],
    keywords: ["régie", "jour j", "horaires", "décaler", "retard", "programme du jour", "imprévu"],
  },
  "panel:logistics": {
    id: "panel:logistics",
    label: "Logistique",
    where: "Accès, transports, hébergements et plan B.",
    purpose: "Que personne ne soit bloqué à la porte, sans voiture ou sans chambre.",
    does: [
      "Hébergements avec capacité et réservations.",
      "Navettes : parcours, horaires de départ, capacité.",
      "Stationnement, accessibilité, plan B météo, contacts d'urgence et liste de ce qu'il faut apporter.",
    ],
    mistakes: ["Oublier l'accessibilité : une information qui regarde tout le monde.", "Ne pas prévoir de plan B météo quand une partie est en extérieur."],
    actions: [{ label: "Ouvrir la logistique", detail: "Accès, navettes, hébergements, urgences.", focus: { panel: "logistics" } }],
    related: ["view:logistics", "panel:providers", "panel:dayof"],
    keywords: ["logistique", "navette", "bus", "hébergement", "hôtel", "parking", "accès", "pluie", "secours", "téléphone"],
  },
  "panel:messages": {
    id: "panel:messages",
    label: "Messages",
    where: "Ce qui a été envoyé aux personnes concernées.",
    purpose: "Communiquer une fois, proprement, et savoir qui a reçu quoi.",
    does: [
      "Des modèles réutilisables (changement d'horaire, remerciement, relance RSVP).",
      "Un envoi est préparé à partir des personnes réellement concernées par le Moment touché.",
      "L'historique des envois reste consultable.",
    ],
    mistakes: ["Écrire un message pour chaque personne : un modèle et une liste de destinataires suffisent.", "Envoyer avant de confirmer le nouvel horaire : la régie d'abord, le message ensuite."],
    actions: [
      { label: "Ouvrir les messages", detail: "Modèles et historique.", focus: { panel: "messages" } },
      { label: "Relancer les RSVP", detail: "Les personnes en attente.", focus: { panel: "guests" } },
    ],
    related: ["panel:guests", "rsvp", "panel:thanks"],
    keywords: ["message", "email", "envoyer", "relance", "modèle", "communication", "faire-part"],
  },
  "panel:team": {
    id: "panel:team",
    label: "Équipe",
    where: "Les responsabilités et la coordination.",
    purpose: "Que quelqu'un d'autre que vous sache quoi faire.",
    does: [
      "Une personne, un rôle, un contact, une liste de responsabilités.",
      "La coordination du Jour J s'appuie sur cette liste.",
    ],
    mistakes: ["Tout garder pour soi : une responsabilité non attribuée sera portée par vous le jour même."],
    actions: [{ label: "Ouvrir l'équipe", detail: "Rôles, contacts, responsabilités.", focus: { panel: "team" } }],
    related: ["panel:dayof", "panel:logistics", "view:collaborative"],
    keywords: ["équipe", "témoins", "demoiselles", "garçons", "responsabilités", "coordination", "qui fait quoi"],
  },
  "panel:memories": {
    id: "panel:memories",
    label: "Photos & vidéos",
    where: "Les images et vidéos à préserver.",
    purpose: "Récupérer, trier et garder ce qui a été pris.",
    does: [
      "Ce que dépose le photographe et ce que déposent les invités via leurs liens.",
      "Un état par élément : à faire, en cours, terminé.",
      "Les médias peuvent être reliés à un Moment.",
    ],
    mistakes: ["Ne pas révoquer les liens de dépôt après coup : la collecte doit avoir une fin."],
    actions: [{ label: "Ouvrir les médias", detail: "Albums, dépôts, état.", focus: { panel: "memories" } }],
    related: ["panel:film", "phase:apres", "invite"],
    keywords: ["photos", "vidéos", "images", "album", "photographe", "dépôt", "médias", "rappel"],
  },
  "panel:contributions": {
    id: "panel:contributions",
    label: "Contributions",
    where: "Les contributions liées à cette célébration.",
    purpose: "Suivre ce qui est offert ou partagé, sans collecter d'argent ici.",
    does: ["Ce que chacun apporte, et l'état de la contribution."],
    mistakes: ["Confondre contribution et paiement de facture : les deux suivent des panneaux différents."],
    actions: [{ label: "Ouvrir les contributions", detail: "Ce qui est apporté par qui.", focus: { panel: "contributions" } }],
    related: ["panel:budget", "panel:thanks"],
    keywords: ["contribution", "cagnotte", "cadeau", "apporter", "participer"],
  },
  "panel:thanks": {
    id: "panel:thanks",
    label: "Remerciements",
    where: "Les mots de remerciement après le mariage.",
    purpose: "Ne rien oublier, et ne rien écrire deux fois.",
    does: ["Un état par personne ou par foyer, avec le texte préparé.", "La liste de ce qui reste à envoyer se suit ici."],
    mistakes: ["Écrire les remerciements avant d'avoir les réponses définitives aux absents : la liste bouge encore."],
    actions: [{ label: "Ouvrir les remerciements", detail: "À écrire, à envoyer, envoyés.", focus: { panel: "thanks" } }],
    related: ["panel:messages", "phase:apres", "panel:guests"],
    keywords: ["remerciements", "remercier", "carte", "mot", "after"],
  },
  "panel:film": {
    id: "panel:film",
    label: "Film du Jour J",
    where: "Le film et les séquences du mariage.",
    purpose: "Préparer le montage, pas seulement stocker des fichiers.",
    does: ["Les séquences prévues, ce qui a été tourné, et l'avancement."],
    mistakes: ["Demander une séquence sans l'avoir reliée à un Moment : le vidéaste suit le programme, pas vos intentions."],
    actions: [{ label: "Ouvrir le film", detail: "Séquences et avancement.", focus: { panel: "film" } }],
    related: ["panel:memories", "panel:dayof", "panel:providers"],
    keywords: ["film", "vidéo", "montage", "séquences", "drone", "teaser"],
  },
  "panel:honeymoon": {
    id: "panel:honeymoon",
    label: "Voyage de noces",
    where: "Les informations du voyage de noces.",
    purpose: "Ne pas laisser la seule chose agréable de l'après passer à la trappe.",
    does: ["Étapes, réservations et documents du voyage."],
    mistakes: ["Attendre le dernier Moment du Jour J pour réserver : les prix bougent plus vite que la fatigue."],
    actions: [{ label: "Ouvrir le voyage", detail: "Étapes, réservations, documents.", focus: { panel: "honeymoon" } }],
    related: ["phase:apres", "panel:documents"],
    keywords: ["voyage", "noces", "lune de miel", "vol", "hôtel", "réserver"],
  },
  "panel:sections": {
    id: "panel:sections",
    label: "Toutes les sections",
    where: "La liste complète des panneaux du Monde, y compris hors de la phase en cours.",
    purpose: "Trouver un panneau que la navigation de phase ne met pas en avant.",
    does: ["Tous les panneaux sont accessibles ici, avec ce qu'ils contiennent."],
    mistakes: ["Chercher un panneau d'après-mariage pendant la phase Avant : il est là, mais dans toutes les sections."],
    actions: [{ label: "Ouvrir toutes les sections", detail: "La liste complète.", focus: { panel: "sections" } }],
    related: ["portal", "panel:planning"],
    keywords: ["sections", "tous les panneaux", "où est le panneau", "liste des écrans"],
  },
};

const ACCENTS = new Map("àáâãäåæçèéêëìíîïðñòóôõöùúûüýÿŒœ".split("").map((char, i) => [char, "aaaaaaaceeeeeiiiinsooooooouuuuyyyOo"[i]]));

/** Comparaison robuste : sans accent, sans casse, sans ponctuation. */
export function normalizeAimeText(value: string): string {
  return value
    .toLocaleLowerCase("fr")
    .split("")
    .map(char => ACCENTS.get(char) ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getAimeScreen(id: AimeScreenId): AimeScreen {
  return AIME_SCREENS[id];
}

/** Les libellés des panneaux suivent le code : cette table sert de traduction inverse. */
const LABEL_LOOKUP: Array<[string, AimeScreenId]> = Object.values(AIME_SCREENS).flatMap(screen => {
  const entries: Array<[string, AimeScreenId]> = [[screen.label, screen.id]];
  if (screen.id.startsWith("panel:")) entries.push([screen.label.toLowerCase(), screen.id]);
  return entries;
});

export function findAimeScreenByLabel(label: string | null | undefined): AimeScreen | undefined {
  if (!label) return undefined;
  const needle = normalizeAimeText(label);
  if (!needle) return undefined;
  const exact = LABEL_LOOKUP.find(([candidate]) => normalizeAimeText(candidate) === needle);
  if (exact) return AIME_SCREENS[exact[1]];
  const partial = LABEL_LOOKUP.find(([candidate]) => {
    const hay = normalizeAimeText(candidate);
    return hay.length > 4 && (needle.includes(hay) || hay.includes(needle));
  });
  return partial ? AIME_SCREENS[partial[1]] : undefined;
}

export type AimeScreenMatch = { screen: AimeScreen; score: number };

/** Recherche plein-texte simple et déterministe sur le vocabulaire de l'app. */
export function searchAimeScreens(query: string, limit = 5): AimeScreenMatch[] {
  const words = normalizeAimeText(query).split(" ").filter(word => word.length > 2);
  if (!words.length) return [];
  const matches: AimeScreenMatch[] = [];
  for (const screen of Object.values(AIME_SCREENS)) {
    const haystack = {
      label: normalizeAimeText(screen.label),
      keywords: screen.keywords.map(normalizeAimeText),
      does: screen.does.map(normalizeAimeText),
      where: normalizeAimeText(screen.where),
    };
    let score = 0;
    for (const word of words) {
      if (haystack.label.includes(word)) score += 6;
      if (haystack.keywords.some(keyword => keyword === word || keyword.includes(word))) score += 4;
      if (haystack.where.includes(word)) score += 2;
      if (haystack.does.some(line => line.includes(word))) score += 2;
    }
    if (score > 0) matches.push({ screen, score });
  }
  return matches.sort((a, b) => b.score - a.score || a.screen.label.localeCompare(b.screen.label, "fr")).slice(0, limit);
}

/** Résumé d'architecture injectable (prompt, aide en ligne, docs). */
export function architectureBrief(): string {
  const screens = Object.values(AIME_SCREENS)
    .map(screen => `- ${screen.label} (${screen.id}) : ${screen.purpose}`)
    .join("\n");
  const model = AIME_MODEL.map(entry => `${entry.title} — ${entry.body}`).join("\n");
  return `${model}\n\nÉcrans :\n${screens}`;
}
