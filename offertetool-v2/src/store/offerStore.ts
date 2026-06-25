import { create } from 'zustand';
import type { CalcResult, OfferItem, ProductKind } from '../calc/types';
import { saveOffer, type SavedOffer } from '../firebase/offers';

export interface Werkuren { tarief: number; uren: number; personen: number }

const DEFAULT_WERKUREN: Werkuren = { tarief: 230, uren: 0, personen: 2 };

interface OfferState {
  items: OfferItem[];
  klantNaam: string;
  hiddenCost: number;
  werkuren: Werkuren;

  // Bewerken
  editTarget: OfferItem | null;

  // Auto-save / draft
  draftId: string | null;
  draftFinalized: boolean;   // true zodra handmatig bewaard of geëxporteerd
  draftTlId: string | null;

  add: (r: CalcResult, kind: ProductKind, input: unknown) => void;
  replace: (id: string, r: CalcResult, kind: ProductKind, input: unknown) => void;
  remove: (id: string) => void;
  clear: () => void;
  setKlant: (v: string) => void;
  setHidden: (v: number) => void;
  setWerkuren: (w: Partial<Werkuren>) => void;
  load: (o: Pick<SavedOffer, 'items' | 'klantNaam' | 'hiddenCost' | 'werkuren' | 'id' | 'status' | 'tlQuotationId'>) => void;

  startEdit: (item: OfferItem) => void;
  cancelEdit: () => void;

  /** Bewaar de huidige offerte als draft-doc (auto of definitief). */
  persist: (opsteller: string, opts?: { finalize?: boolean; tlQuotationId?: string | null }) => Promise<string | null>;
}

export const genId = () => Math.random().toString(36).slice(2, 10);

export const useOffer = create<OfferState>((set, get) => ({
  items: [],
  klantNaam: '',
  hiddenCost: 0,
  werkuren: { ...DEFAULT_WERKUREN },
  editTarget: null,
  draftId: null,
  draftFinalized: false,
  draftTlId: null,

  add: (r, kind, input) =>
    set((s) => ({ items: [...s.items, { ...r, id: genId(), kind, input }] })),

  replace: (id, r, kind, input) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...r, id, kind, input } : i)),
      editTarget: null,
    })),

  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  clear: () => set({
    items: [], klantNaam: '', hiddenCost: 0, werkuren: { ...DEFAULT_WERKUREN },
    editTarget: null, draftId: null, draftFinalized: false, draftTlId: null,
  }),

  setKlant: (klantNaam) => set({ klantNaam }),
  setHidden: (hiddenCost) => set({ hiddenCost }),
  setWerkuren: (w) => set((s) => ({ werkuren: { ...s.werkuren, ...w } })),

  load: (o) => set({
    items: o.items, klantNaam: o.klantNaam, hiddenCost: o.hiddenCost, werkuren: o.werkuren,
    editTarget: null,
    draftId: o.id, draftFinalized: o.status === 'definitief', draftTlId: o.tlQuotationId,
  }),

  startEdit: (item) => set({ editTarget: item }),
  cancelEdit: () => set({ editTarget: null }),

  persist: async (opsteller, opts = {}) => {
    const st = get();
    if (st.items.length === 0) return null;
    const draftId = st.draftId ?? genId();
    const draftFinalized = st.draftFinalized || !!opts.finalize;
    const draftTlId = opts.tlQuotationId !== undefined ? opts.tlQuotationId : st.draftTlId;
    set({ draftId, draftFinalized, draftTlId });

    const t = offerTotals(st.items, st.hiddenCost, st.werkuren);
    const offer: SavedOffer = {
      id: draftId,
      date: new Date().toISOString(),
      opsteller,
      klantNaam: st.klantNaam || '—',
      tlQuotationId: draftTlId,
      items: st.items,
      hiddenCost: st.hiddenCost,
      werkuren: st.werkuren,
      totaalVerkoop: t.verkoop,
      totaalAankoop: t.aankoop,
      status: draftFinalized ? 'definitief' : 'concept',
    };
    await saveOffer(offer);
    return draftId;
  },
}));

export interface OfferTotals {
  verkoop: number;          // omzet producten (incl. verborgen kost)
  aankoop: number;          // totale aankoop producten
  werkurenKost: number;
  subtotaal: number;        // excl. BTW
  btw: number;
  totaal: number;           // incl. BTW
  werkelijkeWinst: number;  // totale marge = omzet − aankoop (productmarge + plaatsing)
  winstPct: number;         // totale marge / omzet × 100
}

export function offerTotals(items: OfferItem[], hiddenCost: number, w: Werkuren): OfferTotals {
  const verkoop = items.reduce((s, i) => s + i.uwVerkoop, 0) + hiddenCost;
  const aankoop = items.reduce((s, i) => s + i.aankoop, 0);
  const werkurenKost = w.tarief * w.uren * w.personen;
  const subtotaal = verkoop + werkurenKost;
  const btw = subtotaal * 0.06;
  // Totale marge = productmarge + plaatsing. Plaatsing zit al in uwVerkoop, dus omzet − aankoop.
  // Werkuren worden apart aan de klant aangerekend (aan kostprijs) en tellen niet als marge.
  const werkelijkeWinst = verkoop - aankoop;
  const winstPct = verkoop > 0 ? (werkelijkeWinst / verkoop) * 100 : 0;
  return { verkoop, aankoop, werkurenKost, subtotaal, btw, totaal: subtotaal + btw, werkelijkeWinst, winstPct };
}
