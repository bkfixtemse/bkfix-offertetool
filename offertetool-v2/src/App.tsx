import { useEffect, useState } from 'react';
import { LoginGate } from './features/shell/LoginGate';
import { RolluikForm } from './features/calculators/RolluikForm';
import { ScreenForm } from './features/calculators/ScreenForm';
import { KnikarmForm } from './features/calculators/KnikarmForm';
import { VerandaForm } from './features/calculators/VerandaForm';
import { BedieningForm } from './features/calculators/BedieningForm';
import { OfferPanel } from './features/offer/OfferPanel';
import { HistoryTab } from './features/history/HistoryTab';
import { useAuth, opstellerNaam } from './store/authStore';
import { startSettingsSync } from './store/settingsStore';
import { startArticlesSync } from './store/articlesStore';
import { useOffer } from './store/offerStore';
import { SettingsTab } from './features/settings/SettingsTab';
import { tlHandleCallback } from './teamleader/oauth';

const TABS = [
  { k: 'rolluik', t: 'Rolluik' },
  { k: 'screen', t: 'Screen' },
  { k: 'knikarm', t: 'Knikarmscherm' },
  { k: 'veranda', t: 'Veranda/Pergola' },
  { k: 'bediening', t: '📱 Afstandsbediening' },
  { k: 'historie', t: '📜 Historie', right: true },
  { k: 'instellingen', t: '⚙ Instellingen' },
] as const;
type TabKey = typeof TABS[number]['k'];

export default function App() {
  const [tab, setTab] = useState<TabKey>('rolluik');
  const [tlMsg, setTlMsg] = useState('');
  const { user, logout } = useAuth();

  const editTarget = useOffer((s) => s.editTarget);
  const cancelEdit = useOffer((s) => s.cancelEdit);
  const persist = useOffer((s) => s.persist);
  const items = useOffer((s) => s.items);
  const klantNaam = useOffer((s) => s.klantNaam);
  const hiddenCost = useOffer((s) => s.hiddenCost);
  const werkuren = useOffer((s) => s.werkuren);
  const draftFinalized = useOffer((s) => s.draftFinalized);

  useEffect(() => {
    tlHandleCallback()
      .then((ok) => { if (ok) setTlMsg('✓ Verbonden met Teamleader'); })
      .catch((e) => setTlMsg(`Teamleader-koppeling mislukt: ${e.message}`));
  }, []);

  useEffect(() => { if (user) { startSettingsSync(); startArticlesSync(); } }, [user]);

  // Item bewerken → spring naar zijn tab (los artikel blijft in het offertepaneel)
  useEffect(() => {
    if (editTarget && editTarget.kind !== 'artikel') setTab(editTarget.kind);
  }, [editTarget?.id]);

  // Auto-bewaren: 1,5s na de laatste wijziging, zolang er items zijn en de offerte
  // nog niet definitief is (definitief bewaard/geëxporteerd = bevroren, niet stil overschrijven)
  useEffect(() => {
    if (!user || items.length === 0 || draftFinalized) return;
    const h = setTimeout(() => { persist(opstellerNaam(user)).catch(() => {}); }, 1500);
    return () => clearTimeout(h);
  }, [items, klantNaam, hiddenCost, werkuren, user, draftFinalized]);

  // Van tab wisselen annuleert een lopende bewerking
  const onTab = (k: TabKey) => { cancelEdit(); setTab(k); };

  const editKey = editTarget?.id ?? 'new';

  return (
    <LoginGate>
      <div className="app">
        <div className="topbar">
          <h1>BKfix Offertetool</h1>
          <span className="badge ok">● Firebase</span>
          <div className="spacer" />
          <span style={{ fontSize: 12, color: 'var(--tx3)' }}>✍ {opstellerNaam(user)}</span>
          <button className="linkbtn" onClick={logout}>Afmelden</button>
        </div>
        {tlMsg && <div className={`alert ${tlMsg.startsWith('✓') ? 'info' : 'err'}`}>{tlMsg}</div>}
        <div className="tabs">
          {TABS.map((tb) => (
            <button key={tb.k} className={`tab ${tab === tb.k ? 'active' : ''} ${'right' in tb && tb.right ? 'right' : ''}`}
              onClick={() => onTab(tb.k)}>{tb.t}</button>
          ))}
        </div>
        {tab === 'historie' ? (
          <HistoryTab goToOffer={() => setTab('rolluik')} />
        ) : tab === 'instellingen' ? (
          <SettingsTab />
        ) : (
          <div className="layout">
            <div>
              {tab === 'rolluik' && <RolluikForm key={`rolluik-${editKey}`} />}
              {tab === 'screen' && <ScreenForm key={`screen-${editKey}`} />}
              {tab === 'knikarm' && <KnikarmForm key={`knikarm-${editKey}`} />}
              {tab === 'veranda' && <VerandaForm key={`veranda-${editKey}`} />}
              {tab === 'bediening' && <BedieningForm key={`bediening-${editKey}`} />}
            </div>
            <OfferPanel />
          </div>
        )}
      </div>
    </LoginGate>
  );
}
