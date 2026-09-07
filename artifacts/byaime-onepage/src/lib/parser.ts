import { WorldProject, fact } from './types';

export function parseIntention(text: string): Partial<WorldProject> {
  const lower = text.toLowerCase();
  
  // Year / Date parsing
  let pivotDate = new Date();
  pivotDate.setFullYear(pivotDate.getFullYear() + 1); // Default to next year
  let pivotConfidence: "deduit" | "confirme" = "deduit";
  
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

  // Guests
  let guests = null;
  let guestsConf: "deduit" | "confirme" | "manquant" = "manquant";
  const guestsMatch = text.match(/(\d{2,4})\s*(?:invit|convive|personne)/i);
  if (guestsMatch) {
    guests = parseInt(guestsMatch[1]);
    guestsConf = "confirme";
  }

  // Budget
  let budget = null;
  let budgetConf: "deduit" | "confirme" | "manquant" = "manquant";
  const budgetMatch = text.match(/(\d{1,3}(?:[.,\s]?\d{3})*)\s*(?:€|euros|euro|k€|k)/i);
  if (budgetMatch) {
    let raw = budgetMatch[1].replace(/[.,\s]/g, '');
    budget = parseInt(raw);
    if (budgetMatch[0].toLowerCase().includes('k')) budget *= 1000;
    budgetConf = "confirme";
  }

  // City / Venue
  let city = null;
  let cityConf: "deduit" | "confirme" | "manquant" = "manquant";
  const cityMatch = text.match(/\b(?:à|a|près de|proche de)\s+([A-Z][A-Za-z\s-]+)\b/);
  if (cityMatch && cityMatch[1].trim().length > 2) {
    city = cityMatch[1].trim();
    cityConf = "confirme";
  }

  // Universe detection
  let universe = "Événement";
  if (/(mariage|marier|épouser)/i.test(text)) universe = "Mariage";
  else if (/(anniversaire)/i.test(text)) universe = "Anniversaire";
  else if (/(séminaire|seminaire|entreprise|team building)/i.test(text)) universe = "Entreprise";
  else if (/(voyage|vacances|retraite)/i.test(text)) universe = "Voyage";

  // Generate a title
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
    guests: fact(guests, guestsConf),
    budget: fact(budget, budgetConf),
    city: fact(city, cityConf),
  };
}

export function createInitialProject(draft: Partial<WorldProject>, intentionText: string): WorldProject {
  const pivotTime = draft.pivot?.value || Date.now() + 31536000000;
  return {
    id: Math.random().toString(36).substring(2, 9),
    title: draft.title || "Projet",
    subtitle: intentionText,
    universe: draft.universe || "Général",
    pivot: draft.pivot || fact(pivotTime, "deduit"),
    city: draft.city || fact(null, "manquant"),
    venue: draft.venue || fact(null, "manquant"),
    guests: draft.guests || fact(null, "manquant"),
    budget: draft.budget || fact(null, "manquant"),
    timeline: [
      {
        id: "t1",
        time: Date.now(),
        kind: "intention",
        title: "L'intention",
        detail: intentionText,
        status: "execute",
        confidence: "confirme",
        phase: "avant",
        universe: draft.universe || "Général"
      },
      {
        id: "t2",
        time: pivotTime,
        kind: "jalon",
        title: "Le Jour J",
        status: "prepare",
        confidence: "deduit",
        phase: "pendant",
        universe: draft.universe || "Général"
      }
    ],
    providers: [
      { id: "p1", role: "Lieu de réception", status: "a_rechercher", confidence: "manquant" },
      { id: "p2", role: "Restauration", status: "a_rechercher", confidence: "manquant" }
    ],
    participants: [],
    documents: [],
    payments: [],
    media: [],
    messages: [],
    missing: []
  };
}
