import { useState } from 'react';
import { calcKnikarm, KNIKARM_TYPES } from '../../calc/knikarm';
import { Chk, Num, Sec, Sel, Txt } from '../../components/fields';
import { KleurSelect } from '../../components/KleurSelect';
import { ResultCard } from '../../components/ResultCard';
import { useOffer } from '../../store/offerStore';
import { KA_BEREIK, KA_DOEK, KA_GEVEL, KA_LED, KA_MUURSTEUN, KA_VERDIEPING, margesVoor } from './common';

const DEFAULT = {
  type: 'Pisano 230', aantal: 1, breedte: 0, uitval: 0,
  verdieping: '0', bereik: 'Goed', gevel: 'baksteen', muursteun: '', muurstripJa: false,
  doek: 'standaard', led: 'Nee', kleur: { select: '', custom: '' },
  typeBediening: 'Sunea IO', motorkabelUitvoering: '', bedieningskant: '', volantType: '',
  doekAfwerking: '', volantHoogte: '', varioVolant: false, ledUitvoering: '', verlengdeSteunen: '', doekCode: '',
  korting: 0, opmerkingen: '',
};
type State = typeof DEFAULT;

export function KnikarmForm() {
  const [s, set] = useState<State>(() => {
    const et = useOffer.getState().editTarget;
    return et?.kind === 'knikarm' ? { ...DEFAULT, ...(et.input as Partial<State>) } : DEFAULT;
  });
  const u = (p: Partial<typeof s>) => set({ ...s, ...p });
  const stripKan = s.type === 'Pisano 230' || s.type.startsWith('Gaudi');

  const r = calcKnikarm({
    ...s, bediening: { bed1: '', bed2: '' },
    vrijeOpties: [], marges: margesVoor('standaard', s.korting),
  });

  return (
    <>
      <div className="panel">
        <h2>Knikarmscherm configureren</h2>
        <div className="alert info">Breedte afgerond op 250mm (Gaudi 400 &gt;7000mm: 500mm) · uitval op 500mm.</div>
        <Sec title="Type & afmetingen">
          <div className="grid2">
            <Sel label="Type *" value={s.type} onChange={(type) => u({ type })} options={KNIKARM_TYPES} />
            <Num label="Aantal" value={s.aantal} min={1} onChange={(a) => u({ aantal: a || 1 })} />
            <Num label="Breedte (mm) *" value={s.breedte} onChange={(breedte) => u({ breedte })} />
            <Num label="Uitval (mm) *" value={s.uitval} onChange={(uitval) => u({ uitval })} />
          </div>
        </Sec>
        <Sec title="Montage & opties">
          <div className="grid2">
            <Sel label="Verdieping" value={s.verdieping} onChange={(verdieping) => u({ verdieping })} options={KA_VERDIEPING} />
            <Sel label="Bereikbaarheid" value={s.bereik} onChange={(bereik) => u({ bereik })} options={KA_BEREIK} />
            <Sel label="Type gevel" value={s.gevel} onChange={(gevel) => u({ gevel })} options={KA_GEVEL} />
            <Sel label="Muursteun" value={s.muursteun} onChange={(muursteun) => u({ muursteun })}
              options={KA_MUURSTEUN.map((m) => ({ v: m, t: m || '(standaard)' }))} />
            <Sel label="Doek" value={s.doek} onChange={(doek) => u({ doek })} options={KA_DOEK} />
            <Sel label="LED verlichting" value={s.led} onChange={(led) => u({ led })} options={KA_LED} />
            {stripKan && <Chk label="Universele muurstrip (€125/m)" value={s.muurstripJa} onChange={(muurstripJa) => u({ muurstripJa })} />}
          </div>
        </Sec>
        <Sec title="Bestelspecificaties (Allround-bestelbon)">
          <div className="grid3">
            <Sel label="Type bediening" value={s.typeBediening} onChange={(typeBediening) => u({ typeBediening })}
              options={['Sunea IO', 'Orea WT', 'Orea 50 RTS', 'Handmatig (oogwindwerk)'].map((v) => ({ v, t: v }))} />
            <Sel label="Motorkabel uitvoering" value={s.motorkabelUitvoering} onChange={(motorkabelUitvoering) => u({ motorkabelUitvoering })}
              options={['', 'Standaard', '5m1 wit', '10m1 wit', '5m1 zwart'].map((v) => ({ v, t: v || '(n.v.t.)' }))} />
            <Sel label="Bedieningskant" value={s.bedieningskant} onChange={(bedieningskant) => u({ bedieningskant })}
              options={['', 'LNB (links onder)', 'RNB (rechts onder)'].map((v) => ({ v, t: v || '(n.v.t.)' }))} />
            <Sel label="Volant" value={s.volantType} onChange={(volantType) => u({ volantType })}
              options={['', 'Gegolfd', 'Recht'].map((v) => ({ v, t: v || '(geen)' }))} />
            <Sel label="Doekafwerking" value={s.doekAfwerking} onChange={(doekAfwerking) => u({ doekAfwerking })}
              options={['', 'Standaard', 'Gestikt', 'Verlijmd'].map((v) => ({ v, t: v || '(n.v.t.)' }))} />
            <Txt label="Volanthoogte (mm)" value={s.volantHoogte} placeholder="standaard 250" onChange={(volantHoogte) => u({ volantHoogte })} />
            <Sel label="LED-uitvoering" value={s.ledUitvoering} onChange={(ledUitvoering) => u({ ledUitvoering })}
              options={['', 'Standaard', 'IO ontvanger'].map((v) => ({ v, t: v || '(n.v.t.)' }))} />
            <Sel label="Verlengde steunen" value={s.verlengdeSteunen} onChange={(verlengdeSteunen) => u({ verlengdeSteunen })}
              options={['', 'Nee', 'Ja 50 cm', 'Ja 80 cm'].map((v) => ({ v, t: v || '(n.v.t.)' }))} />
            <Txt label="Kleurcode doek" value={s.doekCode} onChange={(doekCode) => u({ doekCode })} />
          </div>
          <div style={{ marginTop: 8 }}>
            <Chk label="Vario volant" value={s.varioVolant} onChange={(varioVolant) => u({ varioVolant })} />
          </div>
        </Sec>
        <Sec title="Kleur & korting">
          <div className="grid2">
            <KleurSelect label="Kleur frame" value={s.kleur} onChange={(kleur) => u({ kleur })}
              pisano={s.type === 'Pisano 230'} />
          </div>
          <div className="grid2" style={{ marginTop: 10 }}>
            <Num label="Eenmalige korting (€)" value={s.korting} onChange={(korting) => u({ korting })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Txt label="Opmerkingen" value={s.opmerkingen} onChange={(opmerkingen) => u({ opmerkingen })} />
          </div>
        </Sec>
      </div>
      {(s.breedte > 0 && s.uitval > 0) && <ResultCard r={r} kind="knikarm" input={s} />}
    </>
  );
}
