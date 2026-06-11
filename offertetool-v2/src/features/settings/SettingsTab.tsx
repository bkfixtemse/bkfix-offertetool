import { useEffect, useState } from 'react';
import { useSettings } from '../../store/settingsStore';
import { Num, Sec } from '../../components/fields';
import type { GlobalSettings } from '../../firebase/settings';

export function SettingsTab() {
  const { s, save } = useSettings();
  const [form, setForm] = useState<GlobalSettings>(s);
  const [msg, setMsg] = useState('');
  useEffect(() => setForm(s), [s]);
  const u = (p: Partial<GlobalSettings>) => setForm({ ...form, ...p });

  return (
    <div className="panel" style={{ maxWidth: 640 }}>
      <h2>⚙ Instellingen</h2>
      <div className="alert info">
        Deze instellingen gelden voor iedereen en syncen automatisch naar alle PC's.
        Maatrasters en catalogusprijzen zijn bewust níét instelbaar — die volgen de Allround-prijslijst.
      </div>
      <Sec title="Marges & kortingen">
        <div className="grid3">
          <Num label="Allround korting % (rolluik/screen/knikarm)" value={form.kortingStandaard}
            onChange={(kortingStandaard) => u({ kortingStandaard })} />
          <Num label="Allround korting % (pergola/serre *)" value={form.kortingPergola}
            onChange={(kortingPergola) => u({ kortingPergola })} />
          <Num label="BKfix marge %" value={form.bkfixMarge} onChange={(bkfixMarge) => u({ bkfixMarge })} />
        </div>
        <div className="hint" style={{ marginTop: 6 }}>
          Formule: aankoop = subtotaal × (1 − korting) · verkoop = aankoop ÷ (1 − BKfix-marge).
        </div>
      </Sec>
      <Sec title="Plaatsing veranda/pergola">
        <div className="grid2">
          <Num label="Serrezonwering (€ vast) — Stilo, Vinci 150/250/300" value={form.plaatsingSerre}
            onChange={(plaatsingSerre) => u({ plaatsingSerre })} />
          <Num label="Pergola met staanders (€ vast) — met zip, + volant, 450" value={form.plaatsingPergola}
            onChange={(plaatsingPergola) => u({ plaatsingPergola })} />
        </div>
      </Sec>
      <Sec title="Werkuren">
        <div className="grid3">
          <Num label="Standaard uurtarief (€/u)" value={form.uurtarief} onChange={(uurtarief) => u({ uurtarief })} />
        </div>
      </Sec>
      <button className="btn" onClick={() => save(form).then(() => { setMsg('✓ Opgeslagen en gesynct'); setTimeout(() => setMsg(''), 2500); })}>
        💾 Opslaan
      </button>
      {msg && <span style={{ marginLeft: 10, color: 'var(--green)', fontWeight: 600 }}>{msg}</span>}
    </div>
  );
}
