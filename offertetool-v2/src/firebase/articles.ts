/** Artikelbibliotheek: herbruikbare losse artikelen (kokers, accessoires …), gesynct. */
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from './app';

export interface SavedArticle {
  id: string;
  description: string;
  verkoop: number;
  aankoop: number;
}

export async function saveArticle(a: SavedArticle): Promise<void> {
  await setDoc(doc(db, 'articles', a.id), JSON.parse(JSON.stringify(a)));
}

export async function deleteArticle(id: string): Promise<void> {
  await deleteDoc(doc(db, 'articles', id));
}

export function watchArticles(cb: (a: SavedArticle[]) => void) {
  const q = query(collection(db, 'articles'), orderBy('description'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => d.data() as SavedArticle)),
    () => cb([]));
}
