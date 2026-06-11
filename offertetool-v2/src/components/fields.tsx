import type { ReactNode } from 'react';

export const fmt = (n: number, d = 2) =>
  isFinite(n) ? n.toLocaleString('nl-BE', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';

export function Sec({ title, children }: { title: string; children: ReactNode }) {
  return <div className="sec"><h3>{title}</h3>{children}</div>;
}

export function Num({ label, value, onChange, min, step, hint }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; step?: number; hint?: string;
}) {
  return (
    <div className="fld">
      <label>{label}</label>
      <input type="number" value={value || ''} min={min} step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
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
