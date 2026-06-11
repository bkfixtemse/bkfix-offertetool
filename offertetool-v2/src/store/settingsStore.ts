import { create } from 'zustand';
import { DEFAULT_GLOBAL, saveGlobalSettings, watchGlobalSettings, type GlobalSettings } from '../firebase/settings';

interface SettingsState {
  s: GlobalSettings;
  save: (p: Partial<GlobalSettings>) => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  s: DEFAULT_GLOBAL,
  save: async (p) => {
    const next = { ...get().s, ...p };
    set({ s: next });
    await saveGlobalSettings(next);
  },
}));

let started = false;
/** Start de realtime sync (1×, na login). */
export function startSettingsSync() {
  if (started) return;
  started = true;
  watchGlobalSettings((s) => useSettings.setState({ s }));
}
