/** Offertehistorie: één Firestore-doc per offerte (geen clobbering), realtime. */
import {
  collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc,
} from 'firebase/firestore';
import { db } from './app';
import type { OfferItem } from '../calc/types';
import type { Werkuren } from '../store/offerStore';

export interface SavedOffer {
  id: string;
  date: string;          // ISO
  opsteller: string;
  klantNaam: string;
  tlQuotationId: string | null;
  items: OfferItem[];
  hiddenCost: number;
  werkuren: Werkuren;
  totaalVerkoop: number;
  totaalAankoop: number;
}

export async function saveOffer(offer: SavedOffer): Promise<void> {
  // Firestore verdraagt geen undefined → strip via JSON
  await setDoc(doc(db, 'offers', offer.id), JSON.parse(JSON.stringify(offer)));
}

export async function deleteOffer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'offers', id));
}

export function watchOffers(cb: (offers: SavedOffer[]) => void, onError?: (e: Error) => void) {
  const q = query(collection(db, 'offers'), orderBy('date', 'desc'), limit(300));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as SavedOffer));
  }, (e) => onError?.(e));
}
