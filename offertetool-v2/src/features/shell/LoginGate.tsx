import { useState, type ReactNode } from 'react';
import { useAuth } from '../../store/authStore';

export function LoginGate({ children }: { children: ReactNode }) {
  const { user, loading, error, login } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  if (loading) return <div className="login"><div className="box"><p>Laden…</p></div></div>;
  if (user) return <>{children}</>;

  return (
    <div className="login">
      <div className="box">
        <h1>BKfix Offertetool</h1>
        <p>Meld aan met je bedrijfsaccount</p>
        <form onSubmit={(e) => { e.preventDefault(); login(email, pw); }}>
          <div className="fld"><label>E-mailadres</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
          <div className="fld"><label>Wachtwoord</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          {error && <div className="alert err">{error}</div>}
          <button className="btn" style={{ width: '100%' }} type="submit">Aanmelden</button>
        </form>
      </div>
    </div>
  );
}
