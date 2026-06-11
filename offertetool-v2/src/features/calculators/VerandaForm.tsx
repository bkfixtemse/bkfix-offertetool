import { useState } from 'react';
import { calcVeranda, VERANDA_TYPES } from '../../calc/veranda';
import { PERGOLA_TYPES, VERANDA_STEUNEN } from '../../data/constants';
import { useSettings } from '../../store/settingsStore';
import verandaData from '../../data/veranda.json';
import { Num, Sec, Sel, Txt } from '../../components/fields';
import { KleurSelect } from '../../components/KleurSelect';
import { ResultCard } from '../../components/ResultCard';
import { BEDIENINGEN, BEREIK_ALG, margesVoor, VR_DOEK, VR_GEVEL } from './common';

export function VerandaForm() {
  const [s, set] = useState({
    type: VERANDA_TYPES[0], aantal: 1, breedte: 0, uitval: 0,
    motor: 'Sunea io' as 'Sunea io' | 'Orea WT', steun: 'Geen', steunAantal: 0,
    mkabel: '' as '' | 'ja' | 'nee', gevel: '', doek: '', bereik: '', led: '',
    kleur: { select: '', custom: '' }, bed1: '', bed2: '', korting: 0, opmerkingen: '',
  });
  const u = (p: Partial<typeof s>) => set({ ...s, ...p });
  const meta = (verandaData as any).meta[s.type];
  const isVolant = s.type === 'Vinci 250+ volant';
  const inst = useSettings((st) => st.s);

  const r = calcVeranda({
    ...s, extras: [], bediening: { bed1: s.bed1, bed2: s.bed2 },
    vrijeOpties: [], marges: margesVoor('pergola', s.korting),
    plaatsingVast: PERGOLA_TYPES.includes(s.type) ? inst.plaatsingPergola : inst.plaatsingSerre,
  });

  return (
    <>
      <div className="panel">
        <h2>Veranda / Pergola configureren</h2>
        <div className="alert info">
          Vinci: raster 500mm (min. 1500×2000) · Stilo: 250mm (min. 1000×1500) · Allround korting 40% (*-producten).
          {meta && <> — Max {meta.max_width}×{meta.max_uitval}mm, kast {meta.kast_hoogte}mm.</>}
        </div>
        <Sec title="Type & afmetingen">
          <div className="grid2">
            <Sel label="Type *" value={s.type} onChange={(type) => u({ type, led: '' })} options={VERANDA_TYPES} />
            <Num label="Aantal" value={s.aantal} min={1} onChange={(a) => u({ aantal: a || 1 })} />
            <Num label="Breedte (mm) *" value={s.breedte} onChange={(breedte) => u({ breedte })} />
            <Num label="Uitval (mm) *" value={s.uitval} onChange={(uitval) => u({ uitval })} />
          </div>
        </Sec>
        <Sec title="Opties">
          <div className="grid2">
            <Sel label="Motor" value={s.motor} onChange={(m) => u({ motor: m as any })}
              options={[{ v: 'Sunea io', t: 'Sunea io (standaard)' }, { v: 'Orea WT', t: 'Orea WT (−€60)' }]} />
            <Sel label="Afwijkende motorkabel" value={s.mkabel} onChange={(m) => u({ mkabel: m as any })}
              options={[{ v: '', t: 'Nee' }, { v: 'ja', t: 'Ja (+€35)' }]} />
            <Sel label="Vervangende montagesteun" value={s.steun} onChange={(steun) => u({ steun })}
              options={Object.keys(VERANDA_STEUNEN)} />
            <Num label="Aantal te vervangen steunen" value={s.steunAantal} min={0} onChange={(steunAantal) => u({ steunAantal })} />
            <Sel label="Type gevel" value={s.gevel} onChange={(gevel) => u({ gevel })}
              options={VR_GEVEL.map((g) => ({ v: g, t: g || '(geen)' }))} />
            <Sel label="Doek groep" value={s.doek} onChange={(doek) => u({ doek })}
              options={VR_DOEK.map((d) => ({ v: d, t: d || '(geen)' }))} />
            <Sel label="Bereikbaarheid" value={s.bereik} onChange={(bereik) => u({ bereik })}
              options={['', ...BEREIK_ALG].map((b) => ({ v: b, t: b || '(geen)' }))} />
            {isVolant && (
              <Sel label="LED / volant" value={s.led} onChange={(led) => u({ led })}
                options={['', 'LED verlichting', 'Vario volant', 'led + Vario volant'].map((l) => ({ v: l, t: l || '(geen)' }))} />
            )}
          </div>
        </Sec>
        <Sec title="Kleur, bediening & korting">
          <div className="grid2">
            <KleurSelect label="Kleur frame" value={s.kleur} onChange={(kleur) => u({ kleur })} />
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
      {(s.breedte > 0 && s.uitval > 0) && <ResultCard r={r} />}
    </>
  );
}
