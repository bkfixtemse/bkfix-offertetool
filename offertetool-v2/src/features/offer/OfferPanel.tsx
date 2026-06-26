import { useEffect, useState } from 'react';
import { offerTotals, useOffer } from '../../store/offerStore';
import { useAuth, opstellerNaam } from '../../store/authStore';
import { fmt, Num } from '../../components/fields';
import { LooseArticle } from './LooseArticle';
import { listTaxRates, searchDeals, tlCall, type TlDeal, type TlTaxRate } from '../../teamleader/api';
import { tlClientId, tlDisconnect, tlIsConnected, tlStartAuth } from '../../teamleader/oauth';
import { buildQuotationPayload } from '../../teamleader/payload';
import { downloadBestelbon } from '../../excel/bestelbon';
import { genAllroundBestelbonnen, SJABLONEN } from '../../excel/allroundBestelbon';
import { saveTlSettings, watchTlSettings, type TlSettings } from '../../firebase/settings';

export function OfferPanel() {
  const { items, klantNaam, hiddenCost, werkuren, draftId, remove, clear, setKlant, setHidden, setWerkuren, startEdit, persist } = useOffer();
  const user = useAuth((s) => s.user);
  const opsteller = opstellerNaam(user);
  const t = offerTotals(items, hiddenCost, werkuren);

  const [connected, setConnected] = useState(tlIsConnected());
  const [clientId, setClientId] = useState(tlClientId());
  const [clientSecret, setClientSecret] = useState('');
  const [dealTerm, setDealTerm] = useState('');
  const [deals, setDeals] = useState<TlDeal[]>([]);
  const [deal, setDeal] = useState<TlDeal | null>(null);
  const [taxRates, setTaxRates] = useState<TlTaxRate[]>([]);
  const [taxRateId, setTaxRateId] = useState('');
  const [tlSet, setTlSet] = useState<TlSettings>({ savedLayouts: [], defaultTaxRateId: '' });
  const [layoutId, setLayoutId] = useState('');
  const [newLayout, setNewLayout] = useState({ id: '', name: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => watchTlSettings((s) => {
    setTlSet(s);
    if (s.defaultTaxRateId && !taxRateId) setTaxRateId(s.defaultTaxRateId);
  }), []);

  useEffect(() => { if (connected) listTaxRates().then(setTaxRates).catch(() => {}); }, [connected]);

  useEffect(() => {
    if (!connected || dealTerm.length < 2) { setDeals([]); return; }
    const h = setTimeout(() => searchDeals(dealTerm).then(setDeals).catch(() => {}), 350);
    return () => clearTimeout(h);
  }, [dealTerm, connected]);

  async function exporteer() {
    if (!deal) { setMsg('Selecteer eerst een deal'); return; }
    if (!taxRateId) { setMsg('Selecteer een BTW-tarief'); return; }
    setBusy(true); setMsg('');
    try {
      const payload = buildQuotationPayload(items, deal.id, taxRateId, layoutId, hiddenCost, werkuren);
      const res = await tlCall('quotations.create', payload);
      const qid = res.data?.id ?? null;
      await persist(opsteller, { finalize: true, tlQuotationId: qid });
      downloadBestelbon(items, klantNaam || deal.title);
      await saveTlSettings({ ...tlSet, defaultTaxRateId: taxRateId });
      setMsg(`✓ Offerte aangemaakt in Teamleader (${deal.title})`);
    } catch (e: any) {
      setMsg(`Export mislukt: ${e.message}`);
    } finally { setBusy(false); }
  }

  async function genBestelbonnen() {
    setMsg('');
    try {
      const namen = await genAllroundBestelbonnen(items, klantNaam);
      const rest = items.filter((it) => !SJABLONEN[it.product]); // veranda/bediening/artikel
      if (rest.length) downloadBestelbon(rest, klantNaam);
      setMsg(namen.length
        ? `✓ ${namen.length} Allround-bestelbon(nen) gedownload${rest.length ? ' + 1 algemene' : ''}`
        : '✓ Bestelbon gedownload');
    } catch (e: any) {
      setMsg(`Bestelbon mislukt: ${e.message}`);
    }
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2>Offerte</h2>
        {draftId && items.length > 0 && <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ automatisch bewaard</span>}
      </div>
      <div className="fld" style={{ marginBottom: 10 }}>
        <label>Klant</label>
        <input value={klantNaam} placeholder="Naam klant" onChange={(e) => setKlant(e.target.value)} />
      </div>

      {items.length === 0
        ? <div style={{ color: 'var(--tx3)', textAlign: 'center', padding: 18 }}>Nog geen items op offerte</div>
        : items.map((it) => (
          <div className="offer-item" key={it.id}>
            <div className="hd">
              <span className="nm">{it.product} {it.type}</span>
              <span className="pr">€{fmt(it.uwVerkoop)}</span>
            </div>
            <div className="meta">
              {it.aantal}×{it.breedte ? ` · ${it.breedte}×${it.hoogte ?? it.uitval}mm` : ''} · aankoop €{fmt(it.aankoop)}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="btn sec2 sm" onClick={() => startEdit(it)}>✎ Bewerken</button>
              <button className="btn danger sm" onClick={() => remove(it.id)}>Verwijder</button>
            </div>
          </div>
        ))}

      <LooseArticle />

      <div className="sec" style={{ marginTop: 12 }}>
        <h3>Verborgen kost & werkuren</h3>
        <Num label="Verborgen kost (€) — onzichtbaar verdeeld" value={hiddenCost} onChange={setHidden} />
        <div className="grid3" style={{ marginTop: 8 }}>
          <Num label="Uurtarief (€)" value={werkuren.tarief} onChange={(tarief) => setWerkuren({ tarief })} />
          <Num label="Uren" value={werkuren.uren} step={0.5} onChange={(uren) => setWerkuren({ uren })} />
          <Num label="Personen" value={werkuren.personen} min={1} onChange={(personen) => setWerkuren({ personen })} />
        </div>
        <div className="hint" style={{ marginTop: 4 }}>Werkuren verschijnen niet als aparte lijn op de offerte.</div>
      </div>

      {items.length > 0 && (
        <div className="totals">
          <div className="pline"><span>Producten</span><b>€{fmt(t.verkoop)}</b></div>
          {t.werkurenKost > 0 && <div className="pline"><span>Werkuren (intern)</span><b>€{fmt(t.werkurenKost)}</b></div>}
          <div className="pline"><span>Subtotaal excl. BTW</span><b>€{fmt(t.subtotaal)}</b></div>
          <div className="pline"><span>BTW 6%</span><b>€{fmt(t.btw)}</b></div>
          <div className="pline" style={{ color: 'var(--amber)' }}><span>Totale aankoop</span><b>€{fmt(t.aankoop)}</b></div>
          <div className="grand"><span>Totaal incl. BTW</span><span>€{fmt(t.totaal)}</span></div>

          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 12px', marginTop: 10 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#047857', letterSpacing: '.4px', fontWeight: 700 }}>
              Totale marge (product + plaatsing)
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>
              €{fmt(t.werkelijkeWinst)} <span style={{ fontSize: 13, fontWeight: 700 }}>({fmt(t.winstPct, 1)}%)</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx3)' }}>omzet − aankoop · werkuren worden apart aangerekend (aan kostprijs)</div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn sec2 sm" onClick={() => persist(opsteller, { finalize: true }).then(() => setMsg('✓ Definitief bewaard'))}>💾 Bewaren</button>
            <button className="btn sec2 sm" onClick={genBestelbonnen}>📄 Bestelbon</button>
            <button className="btn danger sm" onClick={() => { if (confirm('Offerte wissen? (de auto-bewaarde versie blijft in de historie)')) clear(); }}>Nieuw</button>
          </div>
        </div>
      )}

      <div className="sec" style={{ marginTop: 12 }}>
        <h3>Teamleader</h3>
        {!connected ? (
          <>
            <div className="fld"><label>Client ID</label>
              <input value={clientId} onChange={(e) => setClientId(e.target.value)} /></div>
            <div className="fld" style={{ marginTop: 8 }}><label>Client Secret</label>
              <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} /></div>
            <button className="btn sm" style={{ marginTop: 8 }} disabled={!clientId}
              onClick={() => tlStartAuth(clientId, clientSecret)}>Verbinden met Teamleader</button>
          </>
        ) : (
          <>
            <div className="fld"><label>Deal zoeken</label>
              <input value={deal ? deal.title : dealTerm} placeholder="Typ om te zoeken…"
                onChange={(e) => { setDeal(null); setDealTerm(e.target.value); }} /></div>
            {deals.length > 0 && !deal && (
              <div style={{ border: '1px solid var(--line)', borderRadius: 8, marginTop: 4, maxHeight: 150, overflow: 'auto' }}>
                {deals.map((d) => (
                  <div key={d.id} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}
                    onClick={() => { setDeal(d); setDeals([]); }}>{d.title}</div>
                ))}
              </div>
            )}
            <div className="grid2" style={{ marginTop: 8 }}>
              <div className="fld"><label>BTW-tarief</label>
                <select value={taxRateId} onChange={(e) => setTaxRateId(e.target.value)}>
                  <option value="">— kies —</option>
                  {taxRates.map((r) => <option key={r.id} value={r.id}>{r.description} ({r.rate}%)</option>)}
                </select></div>
              <div className="fld"><label>Layout</label>
                <select value={layoutId} onChange={(e) => setLayoutId(e.target.value)}>
                  <option value="">(geen layout)</option>
                  {tlSet.savedLayouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select></div>
            </div>
            <details style={{ marginTop: 6 }}>
              <summary style={{ fontSize: 12, color: 'var(--tx3)', cursor: 'pointer' }}>Layout-ID toevoegen</summary>
              <div className="grid2" style={{ marginTop: 6 }}>
                <input placeholder="Layout UUID" value={newLayout.id} onChange={(e) => setNewLayout({ ...newLayout, id: e.target.value })} />
                <input placeholder="Naam" value={newLayout.name} onChange={(e) => setNewLayout({ ...newLayout, name: e.target.value })} />
              </div>
              <button className="btn sec2 sm" style={{ marginTop: 6 }} disabled={!newLayout.id}
                onClick={() => {
                  const s = { ...tlSet, savedLayouts: [...tlSet.savedLayouts, { id: newLayout.id.trim(), name: newLayout.name.trim() || newLayout.id.trim() }] };
                  saveTlSettings(s); setNewLayout({ id: '', name: '' });
                }}>Opslaan</button>
            </details>
            <button className="btn" style={{ width: '100%', marginTop: 10 }} disabled={busy || items.length === 0}
              onClick={exporteer}>{busy ? 'Exporteren…' : '⬆ Exporteer naar Teamleader'}</button>
            <button className="linkbtn" style={{ marginTop: 6 }} onClick={() => { tlDisconnect(); setConnected(false); }}>
              Verbinding verbreken
            </button>
          </>
        )}
        {msg && <div className={`alert ${msg.startsWith('✓') ? 'info' : 'err'}`} style={{ marginTop: 8 }}>{msg}</div>}
      </div>
    </div>
  );
}
