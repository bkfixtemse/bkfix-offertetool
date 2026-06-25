import { useState } from 'react';
import { calcScreen, SCREEN_TYPES } from '../../calc/screen';
import { Chk, Num, Sec, Sel, Txt } from '../../components/fields';
import { KleurSelect } from '../../components/KleurSelect';
import { ResultCard } from '../../components/ResultCard';
import { useOffer } from '../../store/offerStore';
import { BEDIENINGEN, margesVoor, SC_BEREIK, SC_DOEK, SC_GELEIDERS, SC_MOTOREN } from './common';

const DEFAULT = {
  type: 'Nova 83', aantal: 1, breedte: 0, hoogte: 0, plaatsing: 'idd' as 'idd' | 'odd',
  geleider: '', onderlatHoog: false, borenJa: false, omkasting: 'recht' as 'recht' | 'afgerond',
  motor: '', zonnepaneelJa: false, bereik: 'Goed', doek: 'standaard', koppelen: '' as '' | 'ja' | 'nee',
  kleur: { select: '', custom: '' }, bed1: '', bed2: '', korting: 0, opmerkingen: '',
};
type State = typeof DEFAULT;

export function ScreenForm() {
  const [s, set] = useState<State>(() => {
    const et = useOffer.getState().editTarget;
    return et?.kind === 'screen' ? { ...DEFAULT, ...(et.input as Partial<State>) } : DEFAULT;
  });
  const u = (p: Partial<typeof s>) => set({ ...s, ...p });
  const isSolar = s.type === 'Nova solar 103';

  const r = calcScreen({
    ...s, bediening: { bed1: s.bed1, bed2: s.bed2 },
    vrijeOpties: [], marges: margesVoor('standaard', s.korting),
  });

  return (
    <>
      <div className="panel">
        <h2>Screen configureren</h2>
        <Sec title="Type & afmetingen">
          <div className="grid3">
            <Sel label="Type *" value={s.type} onChange={(type) => u({ type })} options={SCREEN_TYPES} />
            <Num label="Aantal" value={s.aantal} min={1} onChange={(a) => u({ aantal: a || 1 })} />
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
              options={SC_GELEIDERS.map((g) => ({ v: g, t: g || 'standaard Nova zip' }))} />
            <Sel label="Omkasting" value={s.omkasting} onChange={(o) => u({ omkasting: o as any })}
              options={[{ v: 'recht', t: 'Recht' }, { v: 'afgerond', t: 'Afgerond' }]} />
            <Sel label="Motor" value={isSolar ? 'RS100 Solar io' : s.motor} disabled={isSolar}
              onChange={(motor) => u({ motor })}
              options={SC_MOTOREN.map((m) => ({ v: m, t: m || 'Maestria io (standaard)' }))}
              hint={isSolar ? 'Nova solar: vast RS100 Solar io' : undefined} />
            <Sel label="Doek groep" value={s.doek} onChange={(doek) => u({ doek })} options={SC_DOEK} />
            <Sel label="Koppelen" value={s.koppelen} onChange={(k) => u({ koppelen: k as any })}
              options={[{ v: '', t: 'Nee' }, { v: 'ja', t: 'Ja (+€90)' }]} />
            <Sel label="Bereikbaarheid" value={s.bereik} onChange={(bereik) => u({ bereik })} options={SC_BEREIK} />
            <Chk label="Hoge verzwaarde onderlat (+€15)" value={s.onderlatHoog} onChange={(onderlatHoog) => u({ onderlatHoog })} />
            <Chk label="Geleiders boren (+€12)" value={s.borenJa} onChange={(borenJa) => u({ borenJa })} />
            {isSolar && <Chk label="Extern zonnepaneel (+€70)" value={s.zonnepaneelJa} onChange={(zonnepaneelJa) => u({ zonnepaneelJa })} />}
          </div>
        </Sec>
        <Sec title="Kleur, bediening & korting">
          <div className="grid2">
            <KleurSelect label="RAL-kleur" value={s.kleur} onChange={(kleur) => u({ kleur })} />
          </div>
          <div className="grid3" style={{ marginTop: 10 }}>
            <Sel label="Bediening 1" value={s.bed1} onChange={(bed1) => u({ bed1 })}
              options={BEDIENINGEN.map((b) => ({ v: b, t: b || '(geen)' }))} />
            <Sel label="Bediening 2" value={s.bed2} onChange={(bed2) => u({ bed2 })}
              options={BEDIENINGEN.map((b) => ({ v: b, t: b || '(geen)' }))} />
            <Num label="Eenmalige korting (€)" value={s.korting} onChange={(korting) => u({ korting })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Txt label="Opmerkingen" value={s.opmerkingen} onChange={(opmerkingen) => u({ opmerkingen })} />
          </div>
        </Sec>
      </div>
      {(s.breedte > 0 && s.hoogte > 0) && <ResultCard r={r} kind="screen" input={s} />}
    </>
  );
}
