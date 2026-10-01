import { Fragment, useEffect, useState } from 'react';
import { deleteOffer, watchOffers, type SavedOffer } from '../../firebase/offers';
import { useOffer } from '../../store/offerStore';
import { fmt } from '../../components/fields';
import { itemSecties, itemTitel } from '../../calc/itemOverzicht';
import type { OfferItem } from '../../calc/types';

/** Alles van één item, zoals het bewaard is. Enkel lezen: niets hiervan raakt de lopende offerte. */
function ItemDetail({ it }: { it: OfferItem }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', margin: '2px 0 8px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{itemTitel(it)}</div>
      <div className="itemdetail">
        {itemSecties(it).map((sec) => (
          <div key={sec.titel}>
            <div className="l">{sec.titel}</div>
            {(sec.rijen ?? []).map(([label, waarde]) => (
              <div className="pline" key={label}><span>{label}</span><b>{waarde}</b></div>
            ))}
            {(sec.punten ?? []).length > 0 && (
              <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--tx2)' }}>
                {(sec.punten ?? []).map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HistoryTab({ goToOffer }: { goToOffer: () => void }) {
  const [offers, setOffers] = useState<SavedOffer[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [zoek, setZoek] = useState('');
  const [err, setErr] = useState('');
  const load = useOffer((s) => s.load);

  useEffect(() => watchOffers(setOffers, (e) => setErr(e.message)), []);

  // Detail wordt live uit de realtime lijst afgeleid → volgt auto-bewaarde updates
  const detail = offers.find((o) => o.id === detailId) ?? null;

  const list = offers.filter((o) => {
    const q = zoek.toLowerCase();
    return !q || o.klantNaam.toLowerCase().includes(q) || o.opsteller.toLowerCase().includes(q)
      || o.items.some((i) => `${i.product} ${i.type}`.toLowerCase().includes(q));
  });

  const dt = (iso: string) => new Date(iso).toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' });

  if (detail) {
    const d = detail;
    let totV = 0, totA = 0, totP = 0;
    const toggle = (n: number) => setOpen((vorig) => {
      const uit = new Set(vorig);
      if (uit.has(n)) uit.delete(n); else uit.add(n);
      return uit;
    });
    const allesOpen = open.size === d.items.length && d.items.length > 0;
    return (
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <button className="btn sec2 sm" onClick={() => { setDetailId(null); setOpen(new Set()); }}>‹ Terug</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn sec2 sm"
              onClick={() => setOpen(allesOpen ? new Set() : new Set(d.items.map((_, n) => n)))}>
              {allesOpen ? '⌃ Alles dichtklappen' : '⌄ Alle details tonen'}
            </button>
            <button className="btn sm" onClick={() => { load(d); goToOffer(); }}>✏ Laden & bewerken</button>
            <button className="btn danger sm" onClick={() => {
              if (confirm('Offerte verwijderen?')) { deleteOffer(d.id); setDetailId(null); }
            }}>🗑 Verwijderen</button>
          </div>
        </div>
        <h2>{d.klantNaam}</h2>
        <div style={{ color: 'var(--tx3)', fontSize: 13, marginBottom: 12 }}>
          {dt(d.date)} · door {d.opsteller}{d.tlQuotationId ? ` · TL: ${d.tlQuotationId}` : ''}
        </div>
        <div className="hint" style={{ marginBottom: 6 }}>
          Klik een regel open om alles van dat item terug te zien — maten, opties, bestelspecificaties en de
          prijsopbouw zoals ze toen berekend zijn. Bekijken verandert niets: de offerte blijft ongemoeid.
        </div>
        <table className="det">
          <thead><tr><th>#</th><th>Product</th><th>Maat</th><th>Aant.</th>
            <th className="r">Aankoop</th><th className="r">Plaatsing</th><th className="r">Verkoop</th><th className="r">Marge</th></tr></thead>
          <tbody>
            {d.items.map((i, n) => {
              totV += i.uwVerkoop; totA += i.aankoop; totP += i.plaatsingTotaal;
              return (
                <Fragment key={n}>
                <tr onClick={() => toggle(n)} style={{ cursor: 'pointer' }}
                  title={open.has(n) ? 'Dichtklappen' : 'Alles van dit item tonen'}>
                  <td>{open.has(n) ? '⌄' : '›'} {n + 1}</td>
                  <td><b>{i.product}</b><br /><span style={{ color: 'var(--tx3)', fontSize: 11 }}>{i.type}</span></td>
                  <td>{i.breedte}×{i.hoogte ?? i.uitval}</td>
                  <td>{i.aantal}</td>
                  <td className="r" style={{ color: 'var(--amber)' }}>€{fmt(i.aankoop)}</td>
                  <td className="r">€{fmt(i.plaatsingTotaal)}</td>
                  <td className="r" style={{ color: 'var(--green)', fontWeight: 600 }}>€{fmt(i.uwVerkoop)}</td>
                  <td className="r">€{fmt(i.uwVerkoop - i.aankoop - i.plaatsingTotaal)}
                    <span style={{ color: 'var(--tx3)', fontSize: 11 }}> ({i.uwVerkoop > 0 ? fmt((i.uwVerkoop - i.aankoop - i.plaatsingTotaal) / i.uwVerkoop * 100, 1) : 0}%)</span></td>
                </tr>
                {open.has(n) && <tr><td colSpan={8} style={{ padding: 0 }}><ItemDetail it={i} /></td></tr>}
                </Fragment>
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
        <div className="hist-card" key={o.id} onClick={() => setDetailId(o.id)}>
          <div>
            <div className="t">{o.klantNaam}
              {o.status === 'concept' && <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, marginLeft: 8 }}>● concept (auto)</span>}
            </div>
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
