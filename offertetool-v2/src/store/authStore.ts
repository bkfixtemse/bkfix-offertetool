import { create } from 'zustand';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth } from '../firebase/app';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string;
  login: (email: string, pw: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: '',
  login: async (email, pw) => {
    set({ error: '' });
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
    } catch {
      set({ error: 'Ongeldig e-mailadres of wachtwoord.' });
    }
  },
  logout: () => signOut(auth),
}));

onAuthStateChanged(auth, (user) => useAuth.setState({ user, loading: false }));

/** Opsteller-naam = deel vóór @ van het e-mailadres. */
export const opstellerNaam = (u: User | null) => u?.email?.split('@')[0] ?? 'Onbekend';
