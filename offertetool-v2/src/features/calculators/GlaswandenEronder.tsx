import type { ReactNode } from 'react';
import type { OverkappingZijde, WandenStatus, WandKeuze, ZijdeId } from '../../calc/overkapping';
import { GEEN_WAND } from '../../calc/overkapping';
import { Chk, fmt, Num } from '../../components/fields';

/**
 * Het blok "Glaswanden eronder": per open zijde een voorstel in Deponti Fiano én ES75, met ★ bij
 * de laagste klantprijs. Gedeeld door de Pinela- en de ES Systems-overkapping, zodat een wand in
 * beide tabs exact dezelfde wand is.
 */
export function GlaswandenEronder({
  zijden, wanden, setWand, status, onderkantGoot, setOnderkantGoot, toonAantal, aantal,
  hoogteFout, hoogteHint, melding,
}: {
  zijden: OverkappingZijde[];
  wanden: Record<ZijdeId, WandKeuze>;
  setWand: (id: ZijdeId, p: Partial<WandKeuze>) => void;
  status: WandenStatus;
  onderkantGoot: number;
  setOnderkantGoot: (n: number) => void;
  toonAantal: boolean;
  aantal: number;
  hoogteFout: string[];
  hoogteHint: string;
  /** Extra waarschuwing boven de zijden (bv. gekoppelde overkappingen). */
  melding?: ReactNode;
}) {
  return (
    <>
      <div className="grid2">
        <Num label="Hoogte onder de goot (mm) — dagmaat hoogte glaswand" value={onderkantGoot} min={0}
          onChange={setOnderkantGoot} hint={hoogteHint} />
      </div>
      {hoogteFout.map((m) => <div key={m} className="alert warn" style={{ marginTop: 6 }}>{m}</div>)}
      {melding}
      {zijden.map((z) => {
        const w = wanden[z.id] ?? GEEN_WAND;
        const v = status.voorstellen[z.id];
        const keuze = w.merk || v?.goedkoopste || '';
        return (
          <div key={z.id} style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
            <Chk label={`Glaswand aan de ${z.label.toLowerCase()} (langs de ${z.langs})`} value={w.aan}
              onChange={(aan) => setWand(z.id, { aan })} />
            {w.aan && (
              <>
                <div className="grid2" style={{ marginTop: 6 }}>
                  <Num label="Dagmaat breedte (mm)" value={w.dagmaat > 0 ? w.dagmaat : (z.dagmaat ?? 0)} min={0}
                    onChange={(dagmaat) => setWand(z.id, { dagmaat })}
                    hint={z.dagmaat != null ? `Tussen de staanders: ${z.uitleg}` : z.uitleg} />
                  {toonAantal && (
                    <Num label="Aantal wanden aan deze zijde" value={status.aantalVan(z.id)} min={1}
                      onChange={(a) => setWand(z.id, { aantal: Math.max(1, Math.floor(a || 1)) })}
                      hint={`Standaard één per overkapping (${aantal})`} />
                  )}
                </div>
                {v && (
                  <div style={{ overflowX: 'auto', marginTop: 6 }}>
                    <table className="det">
                      <thead>
                        <tr>
                          <th>Merk</th><th>Beste indeling</th><th className="r">Overlap</th>
                          <th className="r">Inkoop</th><th className="r">Klantprijs</th><th />
                        </tr>
                      </thead>
                      <tbody>
                        {[v.deponti, v.es].map((o) => (
                          <tr key={o.merk} style={o.beste && o.r.ok ? undefined : { color: 'var(--tx3)' }}>
                            <td>{o.merk === v.goedkoopste ? '★ ' : ''}{o.merk === 'Deponti' ? 'Deponti Fiano' : 'ES75'}</td>
                            <td title={o.r.warnings.join(' · ') || undefined}>
                              {o.beste ? `${o.beste.titel} (${o.beste.panelen.join(' · ')})` : o.reden || 'niet mogelijk'}
                            </td>
                            <td className="r">{o.beste && o.beste.panelen.length > 1 ? o.beste.overlap : '—'}</td>
                            <td className="r">{o.beste && o.r.ok ? `€${fmt(o.r.aankoop)}` : ''}</td>
                            <td className="r">{o.beste && o.r.ok ? `€${fmt(o.r.uwVerkoop)}` : ''}</td>
                            <td>
                              {o.beste && o.r.ok ? (keuze === o.merk
                                ? <span className="badge ok">gekozen</span>
                                : <button className="btn ghost sm" type="button" onClick={() => setWand(z.id, { merk: o.merk })}>Kies</button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(() => {
                      const g = status.gekozen(z.id);
                      const info = g ? [g.nota, ...g.r.warnings].filter(Boolean) : [];
                      return info.length > 0 && (
                        <div className="alert warn" style={{ marginTop: 6 }}>
                          {g!.merk === 'Deponti' ? 'Deponti Fiano' : 'ES75'}: {info.join(' · ')}
                        </div>
                      );
                    })()}
                    <div className="hint" style={{ marginTop: 4 }}>
                      ★ = laagste klantprijs (glasset met €800 plaatsing, zonder opties). Na het toevoegen verfijn je de
                      wand (meenemers, handgrepen, kleur) in de Glaswand-tab; transport zit al bij de overkapping.
                      {w.merk && <> <button className="btn ghost sm" type="button" onClick={() => setWand(z.id, { merk: '' })}>Terug naar de goedkoopste</button></>}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
