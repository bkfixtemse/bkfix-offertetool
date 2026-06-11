/** Gedeelde instellingen (gesynct over alle PC's). */
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './app';

export interface TlSettings {
  savedLayouts: { id: string; name: string }[];
  defaultTaxRateId: string;
}

/** Globale rekeninstellingen (percentages als geheel getal, bv. 50 = 50%). */
export interface GlobalSettings {
  kortingStandaard: number;   // Allround korting rolluik/screen/knikarm
  kortingPergola: number;     // Allround korting pergola/serre (*-producten)
  bkfixMarge: number;         // BKfix marge %
  uurtarief: number;          // standaard werkuren-uurtarief €
  plaatsingSerre: number;     // vaste plaatsing serrezonwering (Stilo, Vinci 150/250/300)
  plaatsingPergola: number;   // vaste plaatsing pergola met staanders (zip/volant/450)
}

export const DEFAULT_GLOBAL: GlobalSettings = {
  kortingStandaard: 50, kortingPergola: 40, bkfixMarge: 20, uurtarief: 230,
  plaatsingSerre: 350, plaatsingPergola: 850,
};

const GLOBAL_DOC = doc(db, 'settings', 'global');

export async function saveGlobalSettings(s: GlobalSettings) {
  await setDoc(GLOBAL_DOC, JSON.parse(JSON.stringify(s)));
}

export function watchGlobalSettings(cb: (s: GlobalSettings) => void) {
  return onSnapshot(GLOBAL_DOC, (snap) => {
    cb({ ...DEFAULT_GLOBAL, ...(snap.data() ?? {}) });
  });
}

const TL_DOC = doc(db, 'settings', 'teamleader');

export async function saveTlSettings(s: TlSettings) {
  await setDoc(TL_DOC, JSON.parse(JSON.stringify(s)));
}

export function watchTlSettings(cb: (s: TlSettings) => void) {
  return onSnapshot(TL_DOC, (snap) => {
    const d = snap.data();
    cb({ savedLayouts: d?.savedLayouts ?? [], defaultTaxRateId: d?.defaultTaxRateId ?? '' });
  });
}
