import { useEffect, useState } from 'react';
import { deleteOffer, watchOffers, type SavedOffer } from '../../firebase/offers';
import { useOffer } from '../../store/offerStore';
import { fmt } from '../../components/fields';

export function HistoryTab({ goToOffer }: { goToOffer: () => void }) {
  const [offers, setOffers] = useState<SavedOffer[]>([]);
  const [detail, setDetail] = useState<SavedOffer | null>(null);
  const [zoek, setZoek] = useState('');
  const [err, setErr] = useState('');
  const load = useOffer((s) => s.load);

  useEffect(() => watchOffers(setOffers, (e) => setErr(e.message)), []);

  const list = offers.filter((o) => {
    const q = zoek.toLowerCase();
    return !q || o.klantNaam.toLowerCase().includes(q) || o.opsteller.toLowerCase().includes(q)
      || o.items.some((i) => `${i.product} ${i.type}`.toLowerCase().includes(q));
  });

  const dt = (iso: string) => new Date(iso).toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' });

  if (detail) {
    const d = detail;
    let totV = 0, totA = 0, totP = 0;
    return (
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <button className="btn sec2 sm" onClick={() => setDetail(null)}>‹ Terug</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sm" onClick={() => {
              load(d.items, d.klantNaam, d.hiddenCost, d.werkuren); goToOffer();
            }}>✏ Laden & bewerken</button>
            <button className="btn danger sm" onClick={() => {
              if (confirm('Offerte verwijderen?')) { deleteOffer(d.id); setDetail(null); }
            }}>🗑 Verwijderen</button>
          </div>
        </div>
        <h2>{d.klantNaam}</h2>
        <div style={{ color: 'var(--tx3)', fontSize: 13, marginBottom: 12 }}>
          {dt(d.date)} · door {d.opsteller}{d.tlQuotationId ? ` · TL: ${d.tlQuotationId}` : ''}
        </div>
        <table className="det">
          <thead><tr><th>#</th><th>Product</th><th>Maat</th><th>Aant.</th>
            <th className="r">Aankoop</th><th className="r">Plaatsing</th><th className="r">Verkoop</th><th className="r">Marge</th></tr></thead>
          <tbody>
            {d.items.map((i, n) => {
              totV += i.uwVerkoop; totA += i.aankoop; totP += i.plaatsingTotaal;
              return (
                <tr key={n}>
                  <td>{n + 1}</td>
                  <td><b>{i.product}</b><br /><span style={{ color: 'var(--tx3)', fontSize: 11 }}>{i.type}</span></td>
                  <td>{i.breedte}×{i.hoogte ?? i.uitval}</td>
                  <td>{i.aantal}</td>
                  <td className="r" style={{ color: 'var(--amber)' }}>€{fmt(i.aankoop)}</td>
                  <td className="r">€{fmt(i.plaatsingTotaal)}</td>
                  <td className="r" style={{ color: 'var(--green)', fontWeight: 600 }}>€{fmt(i.uwVerkoop)}</td>
                  <td className="r">€{fmt(i.uwVerkoop - i.aankoop - i.plaatsingTotaal)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr style={{ fontWeight: 700 }}>
            <td colSpan={4}>Totalen</td>
            <td className="r">€{fmt(totA)}</td><td className="r">€{fmt(totP)}</td>
            <td className="r">€{fmt(totV)}</td><td className="r">€{fmt(totV - totA - totP)}</td>
          </tr></tfoot>
        </table>
        {d.hiddenCost > 0 && <div className="pline" style={{ marginTop: 8 }}><span>Verborgen kost</span><b>€{fmt(d.hiddenCost)}</b></div>}
        <div className="totals"><div className="grand"><span>Totaal verkoop</span><span>€{fmt(d.totaalVerkoop)}</span></div></div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>📜 Offertehistorie</h2>
        <input style={{ maxWidth: 260 }} placeholder="🔍 Zoek klant / opsteller / product"
          value={zoek} onChange={(e) => setZoek(e.target.value)} />
      </div>
      {err && <div className="alert err">{err}</div>}
      {list.length === 0 && <div style={{ color: 'var(--tx3)', textAlign: 'center', padding: 30 }}>
        {zoek ? 'Geen resultaten.' : 'Nog geen offertes opgeslagen.'}</div>}
      {list.map((o) => (
        <div className="hist-card" key={o.id} onClick={() => setDetail(o)}>
          <div>
            <div className="t">{o.klantNaam}</div>
            <div className="s">{dt(o.date)} · ✍ {o.opsteller} · {o.items.length} artikel(s)
              {o.tlQuotationId ? ' · TL ✓' : ''}</div>
            <div className="s">{o.items.slice(0, 4).map((i) => `${i.product} ${i.type}`).join(' · ')}{o.items.length > 4 ? ' …' : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="amt">€{fmt(o.totaalVerkoop)}</div>
            <div className="s" style={{ color: 'var(--amber)' }}>aankoop €{fmt(o.totaalAankoop)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
