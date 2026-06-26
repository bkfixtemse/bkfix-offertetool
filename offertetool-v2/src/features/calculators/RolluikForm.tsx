import { useState } from 'react';
import { calcRolluik, ROLLUIK_TYPES } from '../../calc/rolluik';
import { Chk, Num, Sec, Sel, Txt } from '../../components/fields';
import { KleurSelect } from '../../components/KleurSelect';
import { ResultCard } from '../../components/ResultCard';
import { useOffer } from '../../store/offerStore';
import { BEREIK_ALG, margesVoor, RL_GELEIDERS, RL_KASTTYPES, RL_KOPPELEN, RL_LAMELKLEUREN, RL_MOTOREN } from './common';

/** "diepzwart_90" → "Diepzwart 90", "db703_18" → "DB703 18". */
const lamelLabel = (k: string) =>
  k.replace(/_(\d+)$/, ' $1').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()).replace(/^Db703/, 'DB703');

const DEFAULT = {
  type: 'Ecoroll_L', aantal: 1, breedte: 0, hoogte: 0, plaatsing: 'idd' as 'idd' | 'odd',
  geleider: '', kasttype: 'afgeschuind 45°', motor: '', mkabel: '' as '' | 'ja' | 'nee',
  lamel: 'standaard' as 'standaard' | 'hardschuim', lamelKleur: RL_LAMELKLEUREN[0] ?? '',
  koppelen: '', bereik: 'Goed', onderlat: 'Design onderlat',
  borenJa: false, zonnepaneelJa: false,
  kleur: { select: '', custom: '' }, kleurOmkasting: '',
  bedieningskant: '', handBediening: '', motorkabelUitvoering: '', kabeluitvoer: '',
  geleiderRechts: '', voorborenZijde: '',
  korting: 0, opmerkingen: '',
};
type State = typeof DEFAULT;

export function RolluikForm() {
  const [s, set] = useState<State>(() => {
    const et = useOffer.getState().editTarget;
    return et?.kind === 'rolluik' ? { ...DEFAULT, ...(et.input as Partial<State>) } : DEFAULT;
  });
  const u = (p: Partial<State>) => set({ ...s, ...p });
  const isSolar = s.motor.toLowerCase().includes('solar');

  const r = calcRolluik({
    ...s, kleur: s.kleur, bediening: { bed1: '', bed2: '' },
    vrijeOpties: [], marges: margesVoor('standaard', s.korting),
  });

  return (
    <>
      <div className="panel">
        <h2>Rolluik configureren</h2>
        <Sec title="Type & afmetingen">
          <div className="grid3">
            <Sel label="Type *" value={s.type} onChange={(type) => u({ type })}
              options={ROLLUIK_TYPES.map((t) => ({ v: t, t: t.replace(/_/g, '-') }))} />
            <Num label="Aantal" value={s.aantal} min={1} onChange={(aantal) => u({ aantal: aantal || 1 })} />
            <Sel label="Plaatsing *" value={s.plaatsing} onChange={(p) => u({ plaatsing: p as any })}
              options={[{ v: 'idd', t: 'In de dag (IDD)' }, { v: 'odd', t: 'Op de dag (ODD)' }]} />
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <Num label="Breedte dagmaat (mm) *" value={s.breedte} onChange={(breedte) => u({ breedte })} />
            <Num label="Hoogte dagmaat (mm) *" value={s.hoogte} onChange={(hoogte) => u({ hoogte })} />
          </div>
        </Sec>
        <Sec title="Techniek">
          <div className="grid2">
            <Sel label="Geleider" value={s.geleider} onChange={(geleider) => u({ geleider })}
              options={RL_GELEIDERS.map((g) => ({ v: g, t: g || 'standaard (inbegrepen)' }))} />
            <Sel label="Omkasting" value={s.kasttype} onChange={(kasttype) => u({ kasttype })} options={RL_KASTTYPES} />
            <Sel label="Motor" value={s.motor} onChange={(motor) => u({ motor })}
              options={RL_MOTOREN.map((m) => ({ v: m, t: m || 'RS100 io (standaard)' }))} />
            <Sel label="Afwijkende motorkabel" value={s.mkabel} onChange={(m) => u({ mkabel: m as any })}
              options={[{ v: '', t: 'Nee' }, { v: 'ja', t: 'Ja (+€35)' }]} />
            <Sel label="Koppelen" value={s.koppelen} onChange={(koppelen) => u({ koppelen })}
              options={RL_KOPPELEN.map((k) => ({ v: k, t: k || '(niet koppelen)' }))} />
            <Sel label="Bereikbaarheid" value={s.bereik} onChange={(bereik) => u({ bereik })} options={BEREIK_ALG} />
            <Chk label="Geleiders boren (+€12)" value={s.borenJa} onChange={(borenJa) => u({ borenJa })} />
            {isSolar && <Chk label="Extern zonnepaneel (+€70)" value={s.zonnepaneelJa} onChange={(zonnepaneelJa) => u({ zonnepaneelJa })} />}
          </div>
        </Sec>
        <Sec title="Lamel & kleur">
          <div className="grid2">
            <Sel label="Soort lamel" value={s.lamel} onChange={(l) => u({ lamel: l as any })}
              options={[{ v: 'standaard', t: 'Standaard' }, { v: 'hardschuim', t: 'Hardschuim (€119/m²)' }]} />
            <Sel label="Kleur lamel" value={s.lamelKleur} onChange={(lamelKleur) => u({ lamelKleur })}
              options={RL_LAMELKLEUREN.map((k) => ({ v: k, t: lamelLabel(k) }))} />
            <Sel label="Onderlat" value={s.onderlat} onChange={(onderlat) => u({ onderlat })}
              options={['Design onderlat', 'Vlakke onderlat']} />
            <Txt label="Kleur omkasting (vrij)" value={s.kleurOmkasting} placeholder="bv. RAL 9016"
              onChange={(kleurOmkasting) => u({ kleurOmkasting })} />
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <KleurSelect label="RAL-kleur (omkasting/geleiders/onderlat)" value={s.kleur} onChange={(kleur) => u({ kleur })} />
          </div>
        </Sec>
        <Sec title="Bestelspecificaties (Allround-bestelbon)">
          <div className="grid3">
            <Sel label="Bedieningskant" value={s.bedieningskant} onChange={(bedieningskant) => u({ bedieningskant })}
              options={['', 'Rechts', 'Links'].map((v) => ({ v, t: v || '(n.v.t.)' }))} />
            <Sel label="Handmatige bediening" value={s.handBediening} onChange={(handBediening) => u({ handBediening })}
              options={['', 'Band binnen', 'Mono binnen', 'Band buiten', 'Oogwindwerk buiten'].map((v) => ({ v, t: v || '(geen)' }))} />
            <Sel label="Motorkabel uitvoering" value={s.motorkabelUitvoering} onChange={(motorkabelUitvoering) => u({ motorkabelUitvoering })}
              options={['', 'Standaard', 'Werkstekker', '5m1 wit', '10m1 wit', '5m1 zwart'].map((v) => ({ v, t: v || '(n.v.t.)' }))} />
            <Sel label="Kabeluitvoer" value={s.kabeluitvoer} onChange={(kabeluitvoer) => u({ kabeluitvoer })}
              options={['', 'Standaard', 'Kapsteun', 'Geleider', 'Bovenuit', 'Voorkap', 'Niet uitvoeren'].map((v) => ({ v, t: v || '(n.v.t.)' }))} />
            <Sel label="Voorboren zijde" value={s.voorborenZijde} onChange={(voorborenZijde) => u({ voorborenZijde })}
              options={['', 'Beide', 'Links', 'Rechts'].map((v) => ({ v, t: v || '(n.v.t.)' }))} />
            <Txt label="Geleider rechts (indien afwijkend)" value={s.geleiderRechts} placeholder="bv. HTF-67"
              onChange={(geleiderRechts) => u({ geleiderRechts })} />
          </div>
        </Sec>
        <Sec title="Korting & opmerkingen">
          <div className="grid2">
            <Num label="Eenmalige korting (€)" value={s.korting} onChange={(korting) => u({ korting })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Txt label="Opmerkingen" value={s.opmerkingen} onChange={(opmerkingen) => u({ opmerkingen })} />
          </div>
        </Sec>
      </div>
      {(s.breedte > 0 && s.hoogte > 0) && <ResultCard r={r} kind="rolluik" input={s} />}
    </>
  );
}
