import { create } from 'zustand';
import { watchArticles, type SavedArticle } from '../firebase/articles';

interface ArticlesState { list: SavedArticle[] }

export const useArticles = create<ArticlesState>(() => ({ list: [] }));

let started = false;
/** Start realtime sync van de artikelbibliotheek (1×, na login). */
export function startArticlesSync() {
  if (started) return;
  started = true;
  watchArticles((list) => useArticles.setState({ list }));
}
