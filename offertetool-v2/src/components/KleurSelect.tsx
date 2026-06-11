import { KLEURENCOLLECTIE, KLEUR_MEERPRIJS, PISANO_RAL_MEERPRIJS, PISANO_STD_KLEUREN } from '../data/constants';
import type { KleurKeuze } from '../calc/types';
import { Txt } from './fields';

const ral = (r: string) => (r.startsWith('DB') ? r : `RAL ${r}`);

/** Kleurdropdown met Allround-collectie. pisano=true → 3 std gratis, rest +€140. */
export function KleurSelect({ label, value, onChange, pisano }: {
  label: string; value: KleurKeuze; onChange: (k: KleurKeuze) => void; pisano?: boolean;
}) {
  const extra = pisano ? ` (+€${PISANO_RAL_MEERPRIJS})` : '';
  return (
    <>
      <div className="fld">
        <label>{label}</label>
        <select value={value.select} onChange={(e) => onChange({ ...value, select: e.target.value })}>
          <option value="">— standaard (wit) —</option>
          {pisano && (
            <optgroup label="STANDAARD (inbegrepen)">
              {PISANO_STD_KLEUREN.map((k) => <option key={k} value={k}>{k}</option>)}
            </optgroup>
          )}
          <optgroup label={`GLAD${extra}`}>
            {KLEURENCOLLECTIE.glad.filter((r) => !pisano || !PISANO_STD_KLEUREN.includes(ral(r)))
              .map((r) => <option key={`g${r}`} value={ral(r)}>{ral(r)}</option>)}
          </optgroup>
          <optgroup label={`FIJN STRUCTUUR (SL)${extra}`}>
            {KLEURENCOLLECTIE.structuur.filter((r) => !pisano || !PISANO_STD_KLEUREN.includes(`${ral(r)} SL`))
              .map((r) => <option key={`s${r}`} value={`${ral(r)} SL`}>{ral(r)} SL</option>)}
          </optgroup>
          <optgroup label={`METALLIC (SM)${extra}`}>
            {KLEURENCOLLECTIE.metallic.map((r) => <option key={`m${r}`} value={`${ral(r)} SM`}>{ral(r)} SM</option>)}
          </optgroup>
          <option value="andere">🎨 Andere kleur / poedercoating (+€{KLEUR_MEERPRIJS})</option>
        </select>
      </div>
      {value.select === 'andere' && (
        <Txt label="Omschrijving andere kleur" value={value.custom} placeholder="bv. RAL 6005 mat"
          onChange={(custom) => onChange({ ...value, custom })} />
      )}
    </>
  );
}
