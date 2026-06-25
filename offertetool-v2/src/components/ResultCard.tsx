import type { CalcResult, ProductKind } from '../calc/types';
import { useOffer } from '../store/offerStore';
import { fmt } from './fields';

/** Resultaatkaart onder elk formulier: fouten, KPI's, prijsopbouw, toevoegen/opslaan-knop. */
export function ResultCard({ r, kind, input }: { r: CalcResult; kind: ProductKind; input: unknown }) {
  const add = useOffer((s) => s.add);
  const replace = useOffer((s) => s.replace);
  const editTarget = useOffer((s) => s.editTarget);
  const cancelEdit = useOffer((s) => s.cancelEdit);
  const editing = editTarget?.kind === kind;

  const marge = r.uwVerkoop - r.aankoop - r.plaatsingTotaal;
  const margePct = r.uwVerkoop > 0 ? (marge / r.uwVerkoop) * 100 : 0;

  const opslaan = () => {
    if (editing && editTarget) replace(editTarget.id, r, kind, input);
    else add(r, kind, input);
  };

  return (
    <div className="panel" style={{ marginTop: 12 }}>
      {editing && <div className="alert info">✎ Je bewerkt een bestaand item. Klik "Wijzigingen opslaan" om te vervangen.</div>}
      {r.errors.length > 0 && (
        <div className="alert err"><b>Fout:</b><ul style={{ paddingLeft: 18 }}>{r.errors.map((e) => <li key={e}>{e}</li>)}</ul></div>
      )}
      {r.warnings.length > 0 && (
        <div className="alert warn"><b>Let op:</b><ul style={{ paddingLeft: 18 }}>{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>
      )}
      {r.ok && (
        <>
          <div className="kpis">
            <div className="kpi"><div className="l">Adviesprijs</div><div className="v">€{fmt(r.productSubtotal)}</div></div>
            <div className="kpi g"><div className="l">Uw verkoop</div><div className="v">€{fmt(r.uwVerkoop)}</div></div>
            <div className="kpi a"><div className="l">Aankoop</div><div className="v">€{fmt(r.aankoop)}</div></div>
            <div className="kpi"><div className="l">Marge</div><div className="v">€{fmt(marge)} <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>({fmt(margePct, 1)}%)</span></div></div>
          </div>
          {r.bestelmaat && (
            <div className="pline"><span>Bestelmaat (fabrikant)</span><b>{r.bestelmaat.b}×{r.bestelmaat.h}mm</b></div>
          )}
          {r.calculatiemaat && (
            <div className="pline"><span>Calculatiemaat (prijsopzoeking)</span><b>{r.calculatiemaat.b}×{r.calculatiemaat.h}mm</b></div>
          )}
          {r.regels.map((p, i) => (
            <div className="pline" key={i}><span>{p.label}</span><b>€{fmt(p.bedrag)}</b></div>
          ))}
          <div className="pline"><span>Plaatsing</span><b>€{fmt(r.plaatsingTotaal)}</b></div>
          {r.bedieningTotaal > 0 && <div className="pline"><span>Bediening</span><b>€{fmt(r.bedieningTotaal)}</b></div>}
          {editing ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn" style={{ flex: 1 }} onClick={opslaan}>✓ Wijzigingen opslaan</button>
              <button className="btn sec2" onClick={cancelEdit}>Annuleren</button>
            </div>
          ) : (
            <button className="btn" style={{ width: '100%', marginTop: 10 }} onClick={opslaan}>+ Toevoegen aan offerte</button>
          )}
        </>
      )}
    </div>
  );
}
