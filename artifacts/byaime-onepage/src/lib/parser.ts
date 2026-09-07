import { WorldProject, fact } from './types';

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
  
  return {
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
      { id: "t1", time: Date.now() - 86400000, kind: "intention" as const, title: "L'intention posée", detail: intentionText, status: "execute" as const, confidence: "confirme" as const, phase: "avant" as const, universe: draft.universe || "Général" },
      { id: "t2", time: pivotTime - 90*86400000, kind: "jalon" as const, title: "Envoi des invitations", status: "prepare" as const, confidence: "deduit" as const, phase: "avant" as const, universe: draft.universe || "Général" },
      { id: "t3", time: pivotTime, kind: "jalon" as const, title: "Le Jour J", status: "prepare" as const, confidence: "deduit" as const, phase: "pendant" as const, universe: draft.universe || "Général" },
      ...(isWedding ? [
        { id: "dj1", time: pivotTime + 10*3600000, kind: "evenement" as const, title: "Préparatifs", detail: "Coiffure et maquillage", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage" },
        { id: "dj2", time: pivotTime + 14.5*3600000, kind: "evenement" as const, title: "First Look", detail: "Découverte des tenues", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage" },
        { id: "dj3", time: pivotTime + 16*3600000, kind: "evenement" as const, title: "Cérémonie", location: "Mairie / Domaine", detail: "Échange des vœux", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage" },
        { id: "dj4", time: pivotTime + 18*3600000, kind: "evenement" as const, title: "Cocktail", detail: "Musique live et photos de groupe", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage" },
        { id: "dj5", time: pivotTime + 20.5*3600000, kind: "evenement" as const, title: "Dîner", detail: "Entrée en salle", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage" },
        { id: "dj6", time: pivotTime + 23*3600000, kind: "evenement" as const, title: "Ouverture du bal", status: "prepare" as const, confidence: "suggere" as const, phase: "pendant" as const, universe: "Mariage" },
      ] : [])
    ].sort((a, b) => a.time - b.time),

    tasks: isWedding ? [
      { id: "tk1", title: "Définir le budget global", phase: "12m+", status: "termine", priority: "haute" },
      { id: "tk2", title: "Trouver le lieu de réception", phase: "12m+", status: "en_cours", priority: "haute" },
      { id: "tk3", title: "Créer la liste d'invités préliminaire", phase: "12m+", status: "en_cours", priority: "normale" },
      { id: "tk4", title: "Réserver le photographe", phase: "6-12m", status: "a_faire", priority: "haute" },
      { id: "tk5", title: "Choisir le traiteur", phase: "6-12m", status: "a_faire", priority: "haute" },
      { id: "tk6", title: "Envoyer les Save the Date", phase: "6-12m", status: "a_faire", priority: "normale" },
      { id: "tk7", title: "Choisir la robe / le costume", phase: "6-12m", status: "a_faire", priority: "haute" },
      { id: "tk8", title: "Planifier la cérémonie laïque", phase: "3-6m", status: "a_faire", priority: "normale" },
      { id: "tk9", title: "Envoyer les faire-part", phase: "3-6m", status: "a_faire", priority: "haute" },
      { id: "tk10", title: "Finaliser le plan de table", phase: "1-3m", status: "a_faire", priority: "haute" },
    ] : [],

    guests: isWedding ? [
      { id: "g1", name: "Sophie Martin", role: "temoin", rsvp: "confirme", dietary: "Végétarien", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: true } },
      { id: "g2", name: "Lucas Dubois", role: "temoin", rsvp: "confirme", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: true } },
      { id: "g3", name: "Marie Laurent", role: "famille", rsvp: "en_attente", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
      { id: "g4", name: "Jean Laurent", role: "famille", rsvp: "en_attente", dietary: "Sans gluten", attendance: { ceremony: true, cocktail: true, dinner: true, brunch: false } },
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
      ] : []
    },

    missing: []
  };
}