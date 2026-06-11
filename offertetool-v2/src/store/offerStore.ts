import { create } from 'zustand';
import type { CalcResult, OfferItem } from '../calc/types';

export interface Werkuren { tarief: number; uren: number; personen: number }

interface OfferState {
  items: OfferItem[];
  klantNaam: string;
  hiddenCost: number;
  werkuren: Werkuren;
  add: (r: CalcResult) => void;
  remove: (id: string) => void;
  clear: () => void;
  setKlant: (v: string) => void;
  setHidden: (v: number) => void;
  setWerkuren: (w: Partial<Werkuren>) => void;
  load: (items: OfferItem[], klant: string, hidden: number, werkuren: Werkuren) => void;
}

export const genId = () => Math.random().toString(36).slice(2, 10);

export const useOffer = create<OfferState>((set) => ({
  items: [],
  klantNaam: '',
  hiddenCost: 0,
  werkuren: { tarief: 230, uren: 0, personen: 2 },
  add: (r) => set((s) => ({ items: [...s.items, { ...r, id: genId() }] })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clear: () => set({ items: [], klantNaam: '', hiddenCost: 0, werkuren: { tarief: 230, uren: 0, personen: 2 } }),
  setKlant: (klantNaam) => set({ klantNaam }),
  setHidden: (hiddenCost) => set({ hiddenCost }),
  setWerkuren: (w) => set((s) => ({ werkuren: { ...s.werkuren, ...w } })),
  load: (items, klantNaam, hiddenCost, werkuren) => set({ items, klantNaam, hiddenCost, werkuren }),
}));

export interface OfferTotals {
  verkoop: number; aankoop: number; werkurenKost: number; subtotaal: number; btw: number; totaal: number;
}

export function offerTotals(items: OfferItem[], hiddenCost: number, w: Werkuren): OfferTotals {
  const verkoop = items.reduce((s, i) => s + i.uwVerkoop, 0) + hiddenCost;
  const aankoop = items.reduce((s, i) => s + i.aankoop, 0);
  const werkurenKost = w.tarief * w.uren * w.personen;
  const subtotaal = verkoop + werkurenKost;
  const btw = subtotaal * 0.06;
  return { verkoop, aankoop, werkurenKost, subtotaal, btw, totaal: subtotaal + btw };
}
