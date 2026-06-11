import opties from '../../data/opties.json';
import { useSettings } from '../../store/settingsStore';
import type { Marges } from '../../calc/types';

const o = opties as any;

export const BEDIENINGEN = ['', ...Object.keys(o.algemene.bediening)];
export const BEREIK_ALG = Object.keys(o.algemene.bereikbaarheid);
export const RL_GELEIDERS = ['', ...Object.keys(o.rolluik_extras.geleiders)];
export const RL_KASTTYPES = Object.keys(o.rolluik_extras.kast_types);
export const RL_MOTOREN = ['', ...Object.keys(o.rolluik_extras.motoren)];
export const RL_KOPPELEN = ['', ...Object.keys(o.rolluik_extras.koppelen)];
export const RL_LAMELKLEUREN = Object.keys(o.rolluik_extras.lamel_colors);
export const SC_GELEIDERS = ['', ...Object.keys(o.screen_extras.geleiders).filter((k: string) => k !== 'standaard')];
export const SC_MOTOREN = ['', ...Object.keys(o.screen_extras.motoren)];
export const SC_BEREIK = Object.keys(o.screen_extras.bereikbaarheid);
export const SC_DOEK = Object.keys(o.screen_extras.doek_groep);
export const KA_VERDIEPING = Object.keys(o.knikarm_extras.verdieping);
export const KA_BEREIK = Object.keys(o.knikarm_extras.bereikbaarheid);
export const KA_GEVEL = Object.keys(o.knikarm_extras.type_gevel);
export const KA_MUURSTEUN = ['', ...Object.keys(o.knikarm_extras.muursteun)];
export const KA_DOEK = Object.keys(o.knikarm_extras.doek);
export const KA_LED = Object.keys(o.knikarm_extras.verlichting);
export const VR_GEVEL = ['', ...Object.keys(o.algemene.type_gevel)];
export const VR_DOEK = ['', ...Object.keys(o.algemene.doekgroep)];

/** Marges uit de gedeelde instellingen (Instellingen-tab, gesynct via Firestore). */
export const margesVoor = (product: 'pergola' | 'standaard', korting = 0): Marges => {
  const s = useSettings.getState().s;
  return {
    allroundKorting: (product === 'pergola' ? s.kortingPergola : s.kortingStandaard) / 100,
    bkfixMarge: s.bkfixMarge / 100,
    eenmaligeKorting: korting,
  };
};
