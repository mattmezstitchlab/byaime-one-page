import { WorldProject, fact } from './types';
import { normalizeProject } from './project-migration';

export function parseIntention(text: string): Partial<WorldProject> {
  const lower = text.toLowerCase();
  
  let pivotDate = new Date();
  pivotDate.setFullYear(pivotDate.getFullYear() + 1); 
  let pivotConfidence: "deduit" | "confirme" | "manquant" = "deduit";
  
  const yearMatch = text.match(/\b(202\d|203\d)\b/);
  if (yearMatch) {
    pivotDate.setFullYear(parseInt(yearMatch[1]));
    pivotConfidence = "confirme";
  }
  const monthMatch = text.match(/\b(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\b/i);
  if (monthMatch) {
    const months = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
    const normalizedMonth = monthMatch[1].toLowerCase().replace('é', 'e').replace('û', 'u');
    const mIdx = months.indexOf(normalizedMonth);
    if (mIdx >= 0) pivotDate.setMonth(mIdx);
    pivotConfidence = "confirme";
  }

  let guests = null;
  let guestsConf: "deduit" | "confirme" | "manquant" = "manquant";
  const guestsMatch = text.match(/(\d{2,4})\s*(?:invit|convive|personne)/i);
  if (guestsMatch) {
    guests = parseInt(guestsMatch[1]);
    guestsConf = "confirme";
  }

  let budget = null;
  let budgetConf: "deduit" | "confirme" | "manquant" = "manquant";
  const budgetMatch = text.match(/(\d{1,3}(?:[.,\s]?\d{3})*)\s*(?:€|euros|euro|k€|k)/i);
  if (budgetMatch) {
    let raw = budgetMatch[1].replace(/[.,\s]/g, '');
    budget = parseInt(raw);
    if (budgetMatch[0].toLowerCase().includes('k')) budget *= 1000;
    budgetConf = "confirme";
  }

  let city = null;
  let cityConf: "deduit" | "confirme" | "manquant" = "manquant";
  const cityMatch = text.match(/\b(?:à|a|près de|proche de)\s+([A-Z][A-Za-z\s-]+)\b/);
  if (cityMatch && cityMatch[1].trim().length > 2) {
    city = cityMatch[1].trim();
    cityConf = "confirme";
  }

  let universe = "Événement";
  if (/(mariage|marier|épouser)/i.test(text)) universe = "Mariage";
  else if (/(anniversaire)/i.test(text)) universe = "Anniversaire";
  else if (/(séminaire|seminaire|entreprise|team building)/i.test(text)) universe = "Entreprise";
  else if (/(voyage|vacances|retraite)/i.test(text)) universe = "Voyage";

  let title = "Nouveau Projet";
  const coupleMatch = text.match(/\b([A-Z][a-z]+)\s+(?:et|&)\s+([A-Z][a-z]+)\b/);
  if (coupleMatch) {
    title = `${coupleMatch[1]} & ${coupleMatch[2]}`;
  } else if (universe === "Mariage") {
    title = "Notre Mariage";
  } else if (universe !== "Événement") {
    title = universe;
  }

  return {
    schemaVersion: 2,
    title,
    universe,
    pivot: fact(pivotDate.getTime(), pivotConfidence),
    guestsCount: fact(guests, guestsConf),
    budget: fact(budget, budgetConf),
    city: fact(city, cityConf),
  };
}

export function createInitialProject(draft: Partial<WorldProject>, intentionText: string): WorldProject {
  const pivotTime = draft.pivot?.value || Date.now() + 31536000000;
  const isWedding = draft.universe === "Mariage";
  
  return normalizeProject({
    schemaVersion: 2,
    id: Math.random().toString(36).substring(2, 9),
    title: draft.title || "Projet",
    subtitle: intentionText,
    universe: draft.universe || "Général",
    pivot: draft.pivot || fact(pivotTime, "deduit"),
    city: draft.city || fact(null, "manquant"),
    venue: draft.venue || fact(null, "manquant"),
    guestsCount: draft.guestsCount || fact(null, "manquant"),
    budget: draft.budget || fact(null, "manquant"),
    
    // Day-of Timeline + Milestones
    timeline: [
      { id: "t1", time: Date.now() - 86400000, kind: "intention" as const, title: "L'intention posée", detail: intentionText, status: "execute" as const, confidence: "confirme" as const, phase: "avant" as const, universe: draft.universe || "Général", provenance: "real" as const, visibility: "equipe" as const, relations: [], dependencyIds: [], resources: [], propagation: { state: "none" as const } },
      { id: "t2", time: pivotTime - 90*86400000, kind: "jalon" as const, title: "Envoi des invitations", status: "prepare" as const, confidence: "deduit" as const, phase: "avant" as const, universe: draft.universe || "Général", durationMinutes: 60, provenance: "suggested" as const, visibility: "equipe" as const, relations: [{ kind: "task" as const, id: "tk9" }, { kind: "message" as const, id: "ml1" }], dependencyIds: [], resources: [], propagation: { state: "none" as const } },
      { id: "t3", time: pivotTime, kind: "jalon" as const, title: "Le Jour J", status: "prepare" as const, confidence: "deduit" as const, phase: "pendant" as const, universe: draft.universe || "Général", provenance: "suggested" as const, visibility: "equipe" as const, relations: [{ kind: "provider" as const, id: "p1" }], dependencyIds: ["t2"], resources: [], propagation: { state: "none" as const } },
      ...(isWedding ? [
        { id: "dj1", time: pivotTime + 10*3600000, durationMinutes: 180, kind: "evenement" as const, title: "Préparatifs", detail: "Coiffure et maquillage", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage", relations: [{ kind: "team" as const, id: "tm2" }], resources: ["Suite préparatifs"] },
        { id: "dj2", time: pivotTime + 14.5*3600000, kind: "evenement" as const, title: "First Look", detail: "Découverte des tenues", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage" },
        { id: "dj3", time: pivotTime + 16*3600000, durationMinutes: 90, kind: "evenement" as const, title: "Cérémonie", location: "Mairie / Domaine", detail: "Échange des vœux", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage", relations: [{ kind: "guest" as const, id: "g1", role: "lecture" }, { kind: "provider" as const, id: "p3" }, { kind: "music" as const, id: "m2" }], resources: ["Espace cérémonie"], dependencyIds: ["dj1"] },
        { id: "dj4", time: pivotTime + 18*3600000, kind: "evenement" as const, title: "Cocktail", detail: "Musique live et photos de groupe", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage" },
        { id: "dj5", time: pivotTime + 20.5*3600000, durationMinutes: 120, kind: "evenement" as const, title: "Dîner", detail: "Entrée en salle", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage", relations: [{ kind: "provider" as const, id: "p2" }, { kind: "table" as const, id: "tb1" }, { kind: "guest" as const, id: "g1" }], resources: ["Salle de réception"] },
        { id: "dj6", time: pivotTime + 23*3600000, durationMinutes: 30, kind: "evenement" as const, title: "Ouverture du bal", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage", relations: [{ kind: "provider" as const, id: "p4" }, { kind: "music" as const, id: "m3" }], resources: ["Piste de danse"] },
        { id: "after1", time: pivotTime + 2*86400000, durationMinutes: 30, kind: "message" as const, title: "Remerciements", status: "prepare" as const, confidence: "suggere" as const, phase: "apres" as const, universe: "Mariage", relations: [{ kind: "message" as const, id: "mt3" }, { kind: "memory" as const, id: "mm3" }], provenance: "suggested" as const },
      ] : [])
    ].sort((a, b) => a.time - b.time),

    tasks: isWedding ? [
      { id: "tk1", title: "Définir le budget global", phase: "12m+", status: "termine", priority: "haute" },
      { id: "tk2", title: "Trouver le lieu de réception", phase: "12m+", status: "en_cours", priority: "haute", owner: "Les deux", dueDate: pivotTime - 300 * 86400000 },
      { id: "tk3", title: "Créer la liste d'invités préliminaire", phase: "12m+", status: "en_cours", priority: "normale", owner: "Élise", dueDate: pivotTime - 270 * 86400000 },
      { id: "tk4", title: "Réserver le photographe", phase: "6-12m", status: "a_faire", priority: "haute", owner: "Paul", dueDate: pivotTime - 240 * 86400000 },
      { id: "tk5", title: "Choisir le traiteur", phase: "6-12m", status: "a_faire", priority: "haute" },
      { id: "tk6", title: "Envoyer les Save the Date", phase: "6-12m", status: "a_faire", priority: "normale" },
      { id: "tk7", title: "Choisir la robe / le costume", phase: "6-12m", status: "a_faire", priority: "haute" },
      { id: "tk8", title: "Planifier la cérémonie laïque", phase: "3-6m", status: "a_faire", priority: "normale" },
      { id: "tk9", title: "Envoyer les faire-part", phase: "3-6m", status: "a_faire", priority: "haute" },
      { id: "tk10", title: "Finaliser le plan de table", phase: "1-3m", status: "a_faire", priority: "haute", owner: "Élise", dueDate: pivotTime - 30 * 86400000 },
    ] : [],

    guests: isWedding ? [
      { id: "g1", name: "Sophie Martin", role: "temoin", rsvp: "confirme", dietary: "Végétarien", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: true } },
      { id: "g2", name: "Lucas Dubois", role: "temoin", rsvp: "confirme", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: true } },
      { id: "g3", name: "Marie Laurent", role: "famille", householdId: "h2", adults: 1, children: 0, plusOne: false, invitationSent: true, rsvp: "en_attente", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
      { id: "g4", name: "Jean Laurent", role: "famille", householdId: "h2", adults: 1, children: 0, plusOne: false, invitationSent: true, rsvp: "en_attente", dietary: "Sans gluten", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
      { id: "g5", name: "Hugo Bernard", role: "invite", rsvp: "confirme", tableId: "tb1", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
      { id: "g6", name: "Camille Petit", role: "invite", rsvp: "decline", attendance: { ceremony: false, cocktail: false, dinner: false, brunch: false } },
    ] : [],

    tables: isWedding ? [
      { id: "tb1", name: "Table d'Honneur", capacity: 8 },
      { id: "tb2", name: "Table Famille", capacity: 10 },
      { id: "tb3", name: "Table Amis", capacity: 10 },
    ] : [],

    providers: isWedding ? [
      { id: "p1", category: "lieu", role: "Lieu de réception", name: "Château de la Tour", status: "reserve", amountCents: 450000, paidCents: 150000, nextAction: "Visite technique prévue le mois prochain" },
      { id: "p2", category: "traiteur", role: "Traiteur", status: "devis", amountCents: 850000, nextAction: "Validation du menu dégustation" },
      { id: "p3", category: "photo", role: "Photographe", name: "Studio Lumière", status: "contacte" },
      { id: "p4", category: "musique", role: "DJ", status: "recherche" },
      { id: "p5", category: "fleuriste", role: "Fleuriste", status: "recherche" },
    ] : [],

    payments: isWedding ? [
      { id: "pay1", label: "Acompte Lieu", amountCents: 150000, at: Date.now() - 30*86400000, state: "paye", providerId: "p1" },
      { id: "pay2", label: "Solde Lieu", amountCents: 300000, at: pivotTime - 30*86400000, state: "du", providerId: "p1" },
    ] : [],

    documents: isWedding ? [
      { id: "d1", title: "Contrat de location", kind: "contrat", providerId: "p1", at: Date.now() - 30*86400000 },
      { id: "d2", title: "Devis Traiteur (Option 1)", kind: "devis", providerId: "p2", at: Date.now() - 5*86400000 },
      { id: "d3", title: "Brochure Photographe", kind: "autre", providerId: "p3", at: Date.now() - 2*86400000 },
    ] : [],

    communications: isWedding ? [
      { id: "c1", subject: "Save the Date", type: "invitation", status: "brouillon", audience: "Tous les invités" },
      { id: "c2", subject: "Demande de devis DJ", type: "info", status: "envoye", sentAt: Date.now() - 2*86400000, audience: "Prestataires potentiels" },
    ] : [],

    logistics: {
      accommodations: isWedding ? [
        { id: "a1", name: "Hôtel du Centre", capacity: 20, booked: 12, address: "15 Rue Principale" }
      ] : [],
      shuttles: isWedding ? [
        { id: "s1", route: "Domaine -> Hôtels", departure: "02:00", capacity: 50 },
        { id: "s2", route: "Domaine -> Hôtels", departure: "04:00", capacity: 50 },
      ] : [],
      parking: isWedding ? "Parking visiteurs à 250 m du domaine. Navette PMR sur demande." : "",
      accessibility: isWedding ? "Accès de plain-pied à la salle, rampe côté jardin, chambre PMR à réserver." : "",
      weatherFallback: isWedding ? "Repli du cocktail sous la verrière. Prévoir 40 chaises supplémentaires." : "",
      emergencyContacts: isWedding ? [
        { id: "ec1", name: "Claire Martin", phone: "06 42 18 73 20", role: "Coordination jour J" },
        { id: "ec2", name: "Domaine de la Tour", phone: "03 20 54 18 90", role: "Lieu" }
      ] : [],
      packing: isWedding ? [
        { id: "pk1", label: "Urne et livre d'or", done: false },
        { id: "pk2", label: "Alliances", done: false },
        { id: "pk3", label: "Kit retouches et urgence", done: true },
        { id: "pk4", label: "Signalétique et plans de table", done: false }
      ] : []
    },

    ceremony: isWedding ? {
      structure: ["Accueil des invités", "Entrée des mariés", "Lecture de Sophie", "Échange des vœux", "Échange des alliances", "Signature", "Sortie"],
      notes: "Une cérémonie laïque courte, intime et lumineuse. Prévoir un pupitre et deux chaises pour les témoins.",
      readings: [{ id: "r1", title: "Lecture à choisir", reader: "Sophie Martin", text: "À compléter avec un texte qui vous ressemble." }],
      vows: [{ id: "v1", person: "Élise", text: "" }, { id: "v2", person: "Paul", text: "" }],
      traditions: ["Échange des alliances", "Discours des témoins"],
      menu: "Entrée fraîche · plat végétal ou volaille · dessert de saison",
      drinks: "Champagne à l'arrivée, vins du domaine, bar sans alcool",
      cake: "Pièce montée aux fruits rouges",
      firstDance: "À choisir"
    } : { structure: [], notes: "", readings: [], vows: [], traditions: [], menu: "", drinks: "", cake: "", firstDance: "" },
    music: isWedding ? [
      { id: "m1", moment: "Entrée des mariés", title: "À choisir", artist: "", status: "a_choisir", provenance: "demo", timelineEventIds: [] },
      { id: "m2", moment: "Cérémonie · sortie", title: "Home", artist: "Edward Sharpe & The Magnetic Zeros", status: "valide", provenance: "demo", timelineEventIds: ["dj3"] },
      { id: "m3", moment: "Ouverture du bal", title: "À choisir", artist: "", status: "a_choisir", provenance: "demo", timelineEventIds: ["dj6"] },
      { id: "m4", moment: "Fin de soirée", title: "Playlist libre", artist: "", status: "valide", notes: "Prévoir un set dansant, sans obligation de décennie.", provenance: "demo", timelineEventIds: [] }
    ] : [],
    team: isWedding ? [
      { id: "tm1", name: "Élise & Paul", role: "Couple", contact: "", responsibilities: ["Décisions finales", "Vœux", "Invités"] },
      { id: "tm2", name: "Claire Martin", role: "Coordination jour J", contact: "06 42 18 73 20", responsibilities: ["Run sheet", "Prestataires", "Urgences"] },
      { id: "tm3", name: "Sophie Martin", role: "Témoin", contact: "", responsibilities: ["Lecture", "Livre d'or", "Kit urgence"] }
    ] : [],
    memories: isWedding ? [
      { id: "mm1", kind: "shot", title: "Portraits des grands-parents", owner: "Photographe", status: "a_faire" },
      { id: "mm2", kind: "shot", title: "Photo de groupe complète", owner: "Claire", status: "a_faire" },
      { id: "mm3", kind: "album", title: "Choisir les photos de l'album", owner: "Les deux", status: "a_faire" },
      { id: "mm4", kind: "rappel", title: "Anniversaire de mariage · 1 an", owner: "AIME", status: "a_faire" }
    ] : [],
    messageTemplates: isWedding ? [
      { id: "mt1", title: "Relance RSVP", type: "rappel", body: "Bonjour, petit rappel pour confirmer votre présence avant le 15 juin. À très vite !" },
      { id: "mt2", title: "Informations pratiques", type: "pratique", body: "Retrouvez ici les horaires, l'adresse, le parking et les navettes." },
      { id: "mt3", title: "Merci pour votre présence", type: "remerciement", body: "Merci d'avoir partagé cette journée avec nous. Votre présence nous a beaucoup touchés." }
    ] : [],
    messageLogs: isWedding ? [
      { id: "ml1", templateId: "mt1", recipient: "Marie Laurent", sentAt: Date.now() - 3 * 86400000, status: "simule", note: "Envoi local simulé" }
    ] : [],
    media: [],
    messages: [],
    missing: isWedding ? ["Adresse définitive du lieu", "Choix de la musique d'entrée", "Texte des vœux"] : []
  });
}