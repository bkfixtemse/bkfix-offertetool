import { useState } from 'react';
import { BEDIENING_TYPES, calcAfstandsbediening } from '../../calc/afstandsbediening';
import opties from '../../data/opties.json';
import { Num, Sec, Sel, Txt } from '../../components/fields';
import { ResultCard } from '../../components/ResultCard';

export function BedieningForm() {
  const [s, set] = useState({ type: BEDIENING_TYPES[0], aantal: 1, korting: 0, opmerkingen: '' });
  const u = (p: Partial<typeof s>) => set({ ...s, ...p });
  const prijzen = (opties as any).algemene.bediening as Record<string, number>;

  const r = calcAfstandsbediening({ type: s.type, aantal: s.aantal, eenmaligeKorting: s.korting, opmerkingen: s.opmerkingen });

  return (
    <>
      <div className="panel">
        <h2>Afstandsbediening / zender</h2>
        <div className="alert info">Verkoop = vaste lijstprijs · aankoop = catalogus × 0,6 (40% Allround korting).</div>
        <Sec title="Keuze">
          <div className="grid3">
            <Sel label="Type *" value={s.type} onChange={(type) => u({ type })}
              options={BEDIENING_TYPES.map((b) => ({ v: b, t: `${b} (€${prijzen[b]})` }))} />
            <Num label="Aantal" value={s.aantal} min={1} onChange={(a) => u({ aantal: a || 1 })} />
            <Num label="Eenmalige korting (€)" value={s.korting} onChange={(korting) => u({ korting })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Txt label="Opmerkingen" value={s.opmerkingen} onChange={(opmerkingen) => u({ opmerkingen })} />
          </div>
        </Sec>
      </div>
      <ResultCard r={r} />
    </>
  );
}
