export const DIMENSIONS = [
  "Humanité",
  "Finance",
  "Économie",
  "Fiscalité",
  "Argent public",
  "Précarité",
  "Mobilité",
  "Environnement"
] as const;

export type WorldDimension = typeof DIMENSIONS[number];

export type WorldEventFilter = {
  dimension?: WorldDimension[];
  continent?: string;
  country?: string;
  location?: string;
};

export type WorldEvent = {
  id: string;
  type: string;
  dimension: WorldDimension;
  category: string;
  timestamp: number;
  startDate?: number;
  endDate?: number;
  location?: string;
  country?: string;
  continent?: string;
  coordinates?: [number, number]; // [longitude, latitude]
  value?: number;
  unit?: string;
  source: string;
  sourceUrl?: string;
  reliability: "haute" | "moyenne" | "faible" | "simulation";
  updatedAt: number;
  title: string;
  description?: string;
  relations?: { id: string; label: string }[];
};

export interface DataProvider {
  id: string;
  name: string;
  dimension: WorldDimension | "all";
  fetchEvents(timeRange: [number, number], filter?: WorldEventFilter): Promise<WorldEvent[]>;
  subscribe(callback: (event: WorldEvent) => void, options?: { range?: [number, number], filter?: WorldEventFilter }): () => void;
}
