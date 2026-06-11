/** Gedeelde instellingen (gesynct over alle PC's). */
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './app';

export interface TlSettings {
  savedLayouts: { id: string; name: string }[];
  defaultTaxRateId: string;
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
