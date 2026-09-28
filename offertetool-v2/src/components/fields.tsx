import { useState, type ReactNode } from 'react';

export const fmt = (n: number, d = 2) =>
  isFinite(n) ? n.toLocaleString('nl-BE', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';

export function Sec({ title, children }: { title: string; children: ReactNode }) {
  return <div className="sec"><h3>{title}</h3>{children}</div>;
}

/** "1,5" en "1.5" zijn hetzelfde getal; punten naast een komma zijn duizendtallen. */
function naarGetal(tekst: string): number {
  const t = tekst.includes(',') ? tekst.replace(/\./g, '').replace(',', '.') : tekst;
  const n = parseFloat(t);
  return isFinite(n) ? n : 0;
}

/**
 * Getalveld, maar een gewoon tekstvak. Met <input type="number"> kon je de "1" van een aantal
 * niet wissen om er een ander getal in te tikken: leegmaken gaf 0, het formulier zette dat
 * meteen terug op 1 en je typte tegen die 1 aan. Daarom houdt het veld vast wat je intikt
 * zolang het focus heeft, en telt de berekende waarde pas weer als je eruit gaat.
 */
export function Num({ label, value, onChange, min, hint }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; hint?: string;
}) {
  const [getypt, setGetypt] = useState<string | null>(null);
  const toon = getypt ?? (value ? String(value) : '');
  // Een minteken heeft enkel zin waar negatief mag; in een maat of een aantal is het een typfout.
  const toegelaten = min !== undefined && min >= 0 ? /[^\d.,]/g : /[^\d.,-]/g;

  const typ = (tekst: string) => {
    const schoon = tekst.replace(toegelaten, '');
    setGetypt(schoon);
    onChange(naarGetal(schoon));
  };

  return (
    <div className="fld">
      <label>{label}</label>
      {/* Leeg blijft leeg: het formulier beslist zelf of het 0 of een minimum wordt. */}
      <input type="text" inputMode="decimal" value={toon}
        onChange={(e) => typ(e.target.value)} onBlur={() => setGetypt(null)} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Sel({ label, value, onChange, options, disabled, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { v: string; t: string }[] | string[]; disabled?: boolean; hint?: string;
}) {
  const opts = options.map((o) => (typeof o === 'string' ? { v: o, t: o } : o));
  return (
    <div className="fld">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {opts.map((o) => <option key={o.v} value={o.v}>{o.t}</option>)}
      </select>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Txt({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="fld">
      <label>{label}</label>
      <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Chk({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>{label}</span>
    </label>
  );
}
