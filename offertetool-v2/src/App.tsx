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
import { tlHandleCallback } from './teamleader/oauth';

const TABS = [
  { k: 'rolluik', t: 'Rolluik' },
  { k: 'screen', t: 'Screen' },
  { k: 'knikarm', t: 'Knikarmscherm' },
  { k: 'veranda', t: 'Veranda/Pergola' },
  { k: 'bediening', t: '📱 Afstandsbediening' },
  { k: 'historie', t: '📜 Historie', right: true },
] as const;
type TabKey = typeof TABS[number]['k'];

export default function App() {
  const [tab, setTab] = useState<TabKey>('rolluik');
  const [tlMsg, setTlMsg] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    tlHandleCallback()
      .then((ok) => { if (ok) setTlMsg('✓ Verbonden met Teamleader'); })
      .catch((e) => setTlMsg(`Teamleader-koppeling mislukt: ${e.message}`));
  }, []);

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
          {TABS.map((t) => (
            <button key={t.k} className={`tab ${tab === t.k ? 'active' : ''} ${'right' in t && t.right ? 'right' : ''}`}
              onClick={() => setTab(t.k)}>{t.t}</button>
          ))}
        </div>
        {tab === 'historie' ? (
          <HistoryTab goToOffer={() => setTab('rolluik')} />
        ) : (
          <div className="layout">
            <div>
              {tab === 'rolluik' && <RolluikForm />}
              {tab === 'screen' && <ScreenForm />}
              {tab === 'knikarm' && <KnikarmForm />}
              {tab === 'veranda' && <VerandaForm />}
              {tab === 'bediening' && <BedieningForm />}
            </div>
            <OfferPanel />
          </div>
        )}
      </div>
    </LoginGate>
  );
}
