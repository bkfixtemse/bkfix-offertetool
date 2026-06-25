import { useEffect, useState } from 'react';
import { calcArtikel } from '../../calc/artikel';
import { genId, useOffer } from '../../store/offerStore';
import { useArticles } from '../../store/articlesStore';
import { deleteArticle, saveArticle } from '../../firebase/articles';
import { Chk, Num, Sec, Txt } from '../../components/fields';

const EMPTY = { description: '', aantal: 1, verkoop: 0, aankoop: 0 };
type Form = typeof EMPTY;

/** Los artikel toevoegen/bewerken + artikelbibliotheek (kokers, accessoires …). */
export function LooseArticle() {
  const { add, replace, editTarget, cancelEdit } = useOffer();
  const library = useArticles((s) => s.list);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Form>(EMPTY);
  const [saveLib, setSaveLib] = useState(false);

  const editing = editTarget?.kind === 'artikel';

  // Open + vul in wanneer een bestaand artikel bewerkt wordt
  useEffect(() => {
    if (editing) { setF(editTarget!.input as Form); setSaveLib(false); setOpen(true); }
  }, [editTarget?.id]);

  const u = (p: Partial<Form>) => setF({ ...f, ...p });
  const close = () => { setOpen(false); setF(EMPTY); setSaveLib(false); if (editing) cancelEdit(); };

  const r = calcArtikel(f);

  const bevestig = async () => {
    if (!r.ok) return;
    if (editing && editTarget) replace(editTarget.id, r, 'artikel', f);
    else add(r, 'artikel', f);
    if (saveLib && f.description.trim()) {
      try {
        await saveArticle({ id: genId(), description: f.description.trim(), verkoop: f.verkoop, aankoop: f.aankoop });
      } catch {
        alert('Artikel toegevoegd aan de offerte, maar bewaren in de bibliotheek mislukte. Probeer later opnieuw.');
      }
    }
    close();
  };

  if (!open) {
    return (
      <button className="btn sec2 sm" style={{ width: '100%', marginTop: 8 }} onClick={() => { setF(EMPTY); setOpen(true); }}>
        + Los artikel toevoegen
      </button>
    );
  }

  return (
    <Sec title={editing ? 'Artikel bewerken' : 'Los artikel'}>
      {library.length > 0 && !editing && (
        <div className="fld" style={{ marginBottom: 8 }}>
          <label>Kies uit bibliotheek</label>
          <select value="" onChange={(e) => {
            const a = library.find((x) => x.id === e.target.value);
            if (a) setF({ ...f, description: a.description, verkoop: a.verkoop, aankoop: a.aankoop });
          }}>
            <option value="">— nieuw artikel —</option>
            {library.map((a) => <option key={a.id} value={a.id}>{a.description} (€{a.verkoop})</option>)}
          </select>
        </div>
      )}
      <Txt label="Omschrijving *" value={f.description} placeholder="bv. Aluminium koker 100×100"
        onChange={(description) => u({ description })} />
      <div className="grid3" style={{ marginTop: 8 }}>
        <Num label="Aantal" value={f.aantal} min={1} onChange={(aantal) => u({ aantal: aantal || 1 })} />
        <Num label="Verkoopprijs (€/st)" value={f.verkoop} onChange={(verkoop) => u({ verkoop })} />
        <Num label="Aankoopprijs (€/st)" value={f.aankoop} onChange={(aankoop) => u({ aankoop })} />
      </div>
      {!editing && <div style={{ marginTop: 6 }}><Chk label="Bewaren in artikelbibliotheek" value={saveLib} onChange={setSaveLib} /></div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn sm" disabled={!r.ok} onClick={bevestig}>{editing ? '✓ Opslaan' : '+ Toevoegen'}</button>
        <button className="btn sec2 sm" onClick={close}>Annuleren</button>
      </div>

      {library.length > 0 && !editing && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 12, color: 'var(--tx3)', cursor: 'pointer' }}>Bibliotheek beheren ({library.length})</summary>
          {library.map((a) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0' }}>
              <span>{a.description} — €{a.verkoop} / aankoop €{a.aankoop}</span>
              <button className="linkbtn" style={{ color: 'var(--red)' }} onClick={() => deleteArticle(a.id).catch(() => {})}>verwijder</button>
            </div>
          ))}
        </details>
      )}
    </Sec>
  );
}
