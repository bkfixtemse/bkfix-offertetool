import { useMemo, useState } from 'react';
import {
  calcEsOverkapping, esArtikel, esDakM2, esMarges, esModel, esOnderdeelGroepen,
  ES_KORTING, ES_MARGE, ES_MODELLEN, ES_PLAATSING,
  type EsExtra, type EsKeuze,
} from '../../calc/essystems';
import {
  berekenWanden, hoogteMeldingen, zijdenVan, GEEN_WAND, type WandKeuze, type ZijdeId,
} from '../../calc/overkapping';
import { GLASWAND_VOORBEREIDING_TARIEF } from '../../data/constants';
import { fmt, Num, Sec, Sel, Txt } from '../../components/fields';
import { ResultCard } from '../../components/ResultCard';
import { useOffer } from '../../store/offerStore';
import { GlaswandenEronder } from './GlaswandenEronder';

export const ES_DEFAULT = {
  /** Waaraan een bewaard item herkent in welk formulier het hoort. */
  merk: 'ES Systems',
  model: ES_MODELLEN[0],
  aantal: 1,
  breedte: 0,
  uitval: 0,
  ruimteBreedte: 0,
  ruimteUitval: 0,
  kleur: '',
  opties: [] as EsKeuze[],
  onderdelen: [] as EsKeuze[],
  extraLijnen: [] as EsExtra[],
  plaatsingPerStuk: ES_PLAATSING as number,
  voorbereidingPersonen: 0,
  voorbereidingUren: 0,
  voorbereidingTarief: GLASWAND_VOORBEREIDING_TARIEF,
  margePct: ES_MARGE * 100,
  korting: 0,
  opmerkingen: '',
  /** Gemeten hoogte van de vloer tot de onderkant van de goot = dagmaat hoogte van de glaswanden. */
  onderkantGoot: 0,
  wanden: {
    voor: { ...GEEN_WAND }, achter: { ...GEEN_WAND }, links: { ...GEEN_WAND }, rechts: { ...GEEN_WAND },
  } as Record<ZijdeId, WandKeuze>,
};
type State = typeof ES_DEFAULT;

/** Alle losse artikelen van deze lijst in één keuzelijst, met de groep ervoor. */
function artikelKeuzes(lijst: string) {
  return esOnderdeelGroepen(lijst as 'Comfortline Plus' | 'Black').flatMap((g) =>
    g.artikelen.map((a) => ({ v: a.id, t: `${g.groep} — ${a.label} (€${a.prijs} / ${a.eenheid})` })));
}

export function EsOverkapping() {
  const [s, set] = useState<State>(() => {
    const et = useOffer.getState().editTarget;
    return et?.kind === 'overkapping' && (et.input as Partial<State>)?.merk === ES_DEFAULT.merk
      ? { ...ES_DEFAULT, ...(et.input as Partial<State>) } : ES_DEFAULT;
  });
  const u = (p: Partial<State>) => set({ ...s, ...p });
  const add = useOffer((st) => st.add);
  const replace = useOffer((st) => st.replace);
  const editTarget = useOffer((st) => st.editTarget);
  const cancelEdit = useOffer((st) => st.cancelEdit);
  const bewerken = editTarget?.kind === 'overkapping';
  const [melding, setMelding] = useState('');

  const m = esModel(s.model);
  const r = calcEsOverkapping({ ...s, marges: esMarges(s.margePct, s.korting) });
  const m2 = esDakM2(s.breedte, s.uitval);

  // ---- Wanden ----
  // Bij het bewerken blijven de wanden erbuiten: die staan als eigen glaswand-items op de offerte.
  const zijden = bewerken || !m ? []
    : zijdenVan(s.breedte, s.uitval, m.montage, m.vrijeOpeningAftrek,
      `twee palen van ${m.paal.breedte}`,
      'muuraanbouw: zelf nameten, van de muur tot de paal (ES geeft hier geen maat)');
  const toonAantal = s.aantal > 1;
  const setWand = (id: ZijdeId, p: Partial<WandKeuze>) =>
    u({ wanden: { ...s.wanden, [id]: { ...s.wanden[id], ...p } } });
  const sleutel = JSON.stringify([
    zijden.filter((z) => s.wanden[z.id]?.aan).map((z) => [z.id, s.wanden[z.id].dagmaat, s.wanden[z.id].aantal]),
    s.onderkantGoot, s.model, s.breedte, s.uitval, s.aantal, toonAantal,
  ]);
  const wanden = useMemo(() => berekenWanden({
    zijden, wanden: s.wanden, onderkantGoot: s.onderkantGoot, uitval: s.uitval, aantal: s.aantal,
    titel: `Onder ${s.model} ${s.breedte} × ${s.uitval}`, toonAantal,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [sleutel]);
  const { actief, gekozen } = wanden;
  // ES noemt geen maximale doorloophoogte: enkel de glaswand zelf begrenst de hoogte.
  const hoogteFout = actief.length > 0 ? hoogteMeldingen(s.onderkantGoot, null) : [];

  /** Van model wisselen: de maat, kleur, opties en wanden horen bij het model. */
  const wisselModel = (model: string) => u({
    model, breedte: 0, uitval: 0, kleur: '', opties: [], wanden: ES_DEFAULT.wanden,
    // De onderdelen horen bij de lijst; van Comfortline naar Black is dat een andere lijst.
    onderdelen: esModel(model)?.lijst === m?.lijst ? s.onderdelen : [],
  });

  const toevoegen = () => {
    setMelding('');
    if (bewerken && editTarget) {
      replace(editTarget.id, r, 'overkapping', s);
      return;
    }
    add(r, 'overkapping', s);
    let n = 0;
    for (const z of actief) {
      const g = gekozen(z.id);
      if (g && g.beste && g.r.ok) { add(g.r, 'glaswand', g.staat); n += 1; }
    }
    setMelding(`✓ Toegevoegd: de overkapping${n ? ` en ${n} glaswand${n > 1 ? 'en' : ''}` : ''}.`);
  };
  const kanToevoegen = r.ok && wanden.fouten.length === 0 && hoogteFout.length === 0;

  return (
    <>
      <div className="panel">
        <h2>ES Systems overkapping</h2>
        <div className="alert info">
          Comfortline Plus en Black (prijslijsten januari 2026). De lijst is brutoprijs: inkoop = lijst − {ES_KORTING * 100}%,
          marge standaard {ES_MARGE * 100}%. Enkel de maten uit de lijst; de breedte loopt over de buitenkant van de palen.
        </div>

        <Sec title="Model & aantal">
          <div className="grid2">
            <Sel label="Model *" value={s.model} onChange={wisselModel} options={ES_MODELLEN} />
            <Num label="Aantal identieke overkappingen" value={s.aantal} min={1}
              onChange={(a) => u({
                aantal: Math.max(1, Math.floor(a || 1)),
                wanden: Object.fromEntries(Object.entries(s.wanden)
                  .map(([id, w]) => [id, { ...w, aantal: 0 }])) as Record<ZijdeId, WandKeuze>,
              })} />
          </div>
          {m && (
            <div className="hint" style={{ marginTop: 6 }}>
              {m.titel} — {m.montage === 'vrij' ? 'vrijstaand' : 'muuraanbouw'}, palen {m.paal.label}.
              (Prijslijst {m.lijst} 2026, blz. {m.blz})
            </div>
          )}
        </Sec>

        {m && (
          <Sec title="Maat (enkel de maten uit de lijst)">
            <div className="grid2">
              <Num label="Beschikbare breedte (mm, optioneel)" value={s.ruimteBreedte} min={0}
                onChange={(ruimteBreedte) => u({ ruimteBreedte })} hint="Maten die passen worden groen" />
              <Num label="Beschikbare uitval (mm, optioneel)" value={s.ruimteUitval} min={0}
                onChange={(ruimteUitval) => u({ ruimteUitval })} />
            </div>
            <div style={{ overflowX: 'auto', marginTop: 8 }}>
              <table className="det">
                <thead>
                  <tr>
                    <th>Breedte \ uitval</th>
                    {m.rijen.map((k) => <th key={k} className="r">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {m.kolommen.map((breedte) => (
                    <tr key={breedte}>
                      <td><b>{breedte}</b><br /><span className="hint">{m.palen[String(breedte)]} palen · {m.vakken[String(breedte)]} vakken</span></td>
                      {m.rijen.map((uitval) => {
                        const prijs = m.prijzen[String(uitval)]?.[String(breedte)];
                        const isGekozen = s.breedte === breedte && s.uitval === uitval;
                        // Past deze maat in de opgegeven ruimte? Dan krijgt de knop de groene stijl.
                        const past = (!s.ruimteBreedte || breedte <= s.ruimteBreedte)
                          && (!s.ruimteUitval || uitval <= s.ruimteUitval);
                        const markeer = (s.ruimteBreedte > 0 || s.ruimteUitval > 0) && past;
                        if (typeof prijs !== 'number') return <td key={uitval} className="r" style={{ color: 'var(--tx3)' }}>—</td>;
                        return (
                          <td key={uitval} className="r">
                            <button type="button" className={`btn sm${markeer ? ' past' : ''}${isGekozen ? ' gekozen' : ''}`}
                              title={`Lijstprijs €${fmt(prijs, 0)}${m.xlLigger.includes(uitval) ? ' — versterkte XL-ligger inbegrepen' : ''}`
                                + `${markeer ? ' (past in de ruimte)' : ''}`}
                              onClick={() => u({
                                breedte, uitval,
                                // Een ingetikte dagmaat hoort bij de vorige maat: opnieuw de vrije opening volgen.
                                wanden: Object.fromEntries(Object.entries(s.wanden)
                                  .map(([id, w]) => [id, { ...w, dagmaat: 0 }])) as Record<ZijdeId, WandKeuze>,
                              })}>
                              €{fmt(prijs, 0)}{m.xlLigger.includes(uitval) ? ' ᴸ' : ''}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="hint" style={{ marginTop: 6 }}>
              {s.breedte && s.uitval
                ? <>Gekozen: <b>{s.breedte} × {s.uitval}mm</b> (buitenkant palen), {m.palen[String(s.breedte)]} palen, dak {fmt(m2, 2)} m². Prijzen = lijstprijs vóór korting.</>
                : <>Klik een prijs aan om die maat te kiezen. ᴸ = versterkte (XL) ligger inbegrepen.</>}
            </div>
          </Sec>
        )}

        {m && (
          <Sec title="Kleur">
            <div className="grid2">
              <Sel label="Kleur *" value={s.kleur} onChange={(kleur) => u({ kleur })}
                options={[{ v: '', t: '(kies)' }, ...m.kleuren.map((k) => ({ v: k, t: k }))]}
                hint="Niet-standaardkleuren doet ES op aanvraag, enkel in structuurlak — als extra lijn toevoegen" />
            </div>
          </Sec>
        )}

        {m && (
          <Sec title="Opties">
            {s.opties.map((o, i) => {
              const def = m.opties.find((x) => x.id === o.id);
              return (
                <div className="grid2" key={i} style={{ marginBottom: 6 }}>
                  <Sel label={`Optie ${i + 1}`} value={o.id}
                    onChange={(id) => u({ opties: s.opties.map((x, j) => (j === i ? { ...x, id } : x)) })}
                    options={[{ v: '', t: '(kies)' }, ...m.opties.map((x) => ({
                      v: x.id, t: `${x.label} — €${x.prijs} / ${x.eenheid}`,
                    }))]} />
                  <Num label={`Aantal${def ? ` (${def.eenheid})` : ''}`} value={o.aantal} min={0}
                    onChange={(aantal) => u({ opties: s.opties.map((x, j) => (j === i ? { ...x, aantal } : x)) })}
                    hint={def?.eenheid === 'm²' && m2 > 0 ? `Dak is ${fmt(m2, 2)} m²` : undefined} />
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn ghost" type="button" onClick={() => u({ opties: [...s.opties, { id: '', aantal: 1 }] })}>+ optie</button>
              {m2 > 0 && (
                <button className="btn ghost" type="button"
                  onClick={() => u({ opties: [...s.opties, { id: '', aantal: Math.round(m2 * 100) / 100 }] })}>
                  + optie per m² ({fmt(m2, 2)})
                </button>
              )}
              {s.opties.length > 0 && (
                <button className="btn ghost" type="button" onClick={() => u({ opties: s.opties.slice(0, -1) })}>− laatste</button>
              )}
            </div>
          </Sec>
        )}

        {m && (
          <Sec title="Losse onderdelen (profielen, palen, zijwanden, LED)">
            {s.onderdelen.map((o, i) => {
              const a = esArtikel(o.id);
              return (
                <div className="grid2" key={i} style={{ marginBottom: 6 }}>
                  <Sel label={`Onderdeel ${i + 1}`} value={o.id}
                    onChange={(id) => u({ onderdelen: s.onderdelen.map((x, j) => (j === i ? { ...x, id } : x)) })}
                    options={[{ v: '', t: '(kies)' }, ...artikelKeuzes(m.lijst)]} />
                  <Num label={`Aantal${a ? ` (${a.eenheid})` : ''}`} value={o.aantal} min={0}
                    onChange={(aantal) => u({ onderdelen: s.onderdelen.map((x, j) => (j === i ? { ...x, aantal } : x)) })} />
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost" type="button" onClick={() => u({ onderdelen: [...s.onderdelen, { id: '', aantal: 1 }] })}>+ onderdeel</button>
              {s.onderdelen.length > 0 && (
                <button className="btn ghost" type="button" onClick={() => u({ onderdelen: s.onderdelen.slice(0, -1) })}>− laatste</button>
              )}
            </div>
            <div className="hint" style={{ marginTop: 6 }}>
              Zijspie, zijwand, aluminium planchetten en LED staan hierbij. De LED-pagina's zijn in
              beide lijsten identiek.
            </div>
          </Sec>
        )}

        <Sec title="Extra lijnen (niet in de lijst)">
          {s.extraLijnen.map((e, i) => (
            <div className="grid2" key={i} style={{ marginBottom: 6 }}>
              <Txt label={`Omschrijving ${i + 1}`} value={e.omschrijving}
                onChange={(omschrijving) => u({ extraLijnen: s.extraLijnen.map((x, j) => (j === i ? { ...x, omschrijving } : x)) })} />
              <Num label="Inkoop (€)" value={e.bedrag}
                onChange={(bedrag) => u({ extraLijnen: s.extraLijnen.map((x, j) => (j === i ? { ...x, bedrag } : x)) })} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" type="button" onClick={() => u({ extraLijnen: [...s.extraLijnen, { omschrijving: '', bedrag: 0 }] })}>+ lijn</button>
            {s.extraLijnen.length > 0 && (
              <button className="btn ghost" type="button" onClick={() => u({ extraLijnen: s.extraLijnen.slice(0, -1) })}>− laatste</button>
            )}
          </div>
          <div className="hint" style={{ marginTop: 6 }}>
            Het bedrag is de inkoopprijs en krijgt geen korting meer — bv. een kleur op aanvraag.
          </div>
        </Sec>

        <Sec title="Plaatsing, marge & korting">
          <div className="grid2">
            <Num label="Plaatsing per overkapping (€)" value={s.plaatsingPerStuk} min={0}
              onChange={(plaatsingPerStuk) => u({ plaatsingPerStuk })} hint={`Standaard €${ES_PLAATSING}`} />
            <Num label="BKfix marge (%)" value={s.margePct} min={0} onChange={(margePct) => u({ margePct })} />
            <Num label="Eenmalige korting (€)" value={s.korting} onChange={(korting) => u({ korting })} />
            <Num label="Voorbereidende werken — man" value={s.voorbereidingPersonen} min={0}
              onChange={(voorbereidingPersonen) => u({ voorbereidingPersonen })} />
            <Num label="Voorbereidende werken — uur" value={s.voorbereidingUren} min={0}
              onChange={(voorbereidingUren) => u({ voorbereidingUren })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Txt label="Opmerkingen" value={s.opmerkingen} onChange={(opmerkingen) => u({ opmerkingen })} />
          </div>
        </Sec>

        {m && s.breedte > 0 && s.uitval > 0 && (
          <Sec title="Glaswanden eronder">
            {bewerken ? (
              <div className="hint">Je bewerkt een bestaande overkapping. De glaswanden die erbij horen, pas je aan in de Glaswand-tab.</div>
            ) : (
              <GlaswandenEronder
                zijden={zijden} wanden={s.wanden} setWand={setWand} status={wanden}
                onderkantGoot={s.onderkantGoot} setOnderkantGoot={(onderkantGoot) => u({ onderkantGoot })}
                toonAantal={toonAantal} aantal={s.aantal} hoogteFout={hoogteFout}
                hoogteHint={'Gemeten van de vloer tot de onderkant van de goot. ES noemt geen maximale '
                  + 'doorloophoogte; de glaswand zelf bepaalt wat kan (ES75 tot 2700mm, Fiano volgens de compensatietabel).'} />
            )}
          </Sec>
        )}
      </div>

      {s.breedte > 0 && s.uitval > 0 && (
        <>
          <ResultCard r={r} kind="overkapping" input={s} zonderKnop />
          <div className="panel" style={{ marginTop: 12 }}>
            {wanden.fouten.map((f) => <div key={f} className="alert err">{f}</div>)}
            {r.ok && actief.length > 0 && wanden.fouten.length === 0 && hoogteFout.length === 0 && (
              <div className="pline"><span>Klantprijs overkapping + {actief.length} glaswand{actief.length > 1 ? 'en' : ''}</span>
                <b>€{fmt(r.uwVerkoop + wanden.totaal)}</b></div>
            )}
            {melding && <div className="alert info">{melding}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn" style={{ flex: 1 }} type="button" disabled={!kanToevoegen} onClick={toevoegen}>
                {bewerken ? '✓ Wijzigingen opslaan (overkapping)'
                  : `+ Toevoegen aan offerte${actief.length ? `: overkapping + ${actief.length} glaswand${actief.length > 1 ? 'en' : ''}` : ''}`}
              </button>
              {bewerken && <button className="btn sec2" type="button" onClick={cancelEdit}>Annuleren</button>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
