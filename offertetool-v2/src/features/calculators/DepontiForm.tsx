import { useState } from 'react';
import {
  calcLouvre, calcOnderdelen, depontiMarges, louvreKlasse, onderdeelArtikel,
  GRILLO_WERKENDE_HOOGTE, LOUVRE_HOOGTE, LOUVRE_KLEUREN, LOUVRE_OPTIES, ONDERDEEL_GROEPEN,
  type DepontiExtra, type DepontiOptieKeuze, type OnderdeelRegel,
} from '../../calc/deponti';
import { kiesRaillengte } from '../../calc/glaswand';
import { DEPONTI, GLASWAND_VOORBEREIDING_TARIEF } from '../../data/constants';
import { Chk, fmt, Num, Sec, Sel, Txt } from '../../components/fields';
import { ResultCard } from '../../components/ResultCard';
import { useOffer } from '../../store/offerStore';

type Soort = 'louvre' | 'onderdelen';

const DEFAULT = {
  soort: 'louvre' as Soort,
  aantal: 1,
  // ---- Fiano Louvre ----
  aantalPanelen: 3,
  inbouwhoogte: 0,
  dagmaatBreedte: 0,
  rail: '' as '' | 'met' | 'zonder',
  sporen: 0,
  louvreKleurFrame: '',
  louvreKleurLamel: '',
  louvreOpties: [] as DepontiOptieKeuze[],
  plaatsingLouvrePerPaneel: DEPONTI.plaatsingLouvrePerPaneel as number,
  // ---- Onderdelen ----
  omschrijving: '',
  regels: [] as OnderdeelRegel[],
  plaatsingOnderdelen: 0,
  // ---- Gemeenschappelijk ----
  /** Transport dealer €160 per levering — BKfix rekent het altijd (21-09-2026). */
  transport: true,
  extraLijnen: [] as DepontiExtra[],
  voorbereidingPersonen: 0,
  voorbereidingUren: 0,
  voorbereidingTarief: GLASWAND_VOORBEREIDING_TARIEF,
  margePct: DEPONTI.marge * 100,
  korting: 0,
  opmerkingen: '',
};
type State = typeof DEFAULT;

const SOORTEN: { v: Soort; t: string }[] = [
  { v: 'louvre', t: 'Fiano Louvre (schuivende louvrepanelen)' },
  { v: 'onderdelen', t: 'Onderdelen: Grillo, louvres, zijspie/zijwand, LED, Lumassina, Combi-Groove, screens' },
];

export function DepontiForm() {
  const [s, set] = useState<State>(() => {
    const et = useOffer.getState().editTarget;
    return et?.kind === 'deponti' ? { ...DEFAULT, ...(et.input as Partial<State>) } : DEFAULT;
  });
  const u = (p: Partial<State>) => set({ ...s, ...p });
  const marges = depontiMarges(s.margePct, s.korting);
  const vb = {
    voorbereidingPersonen: s.voorbereidingPersonen, voorbereidingUren: s.voorbereidingUren,
    voorbereidingTarief: s.voorbereidingTarief,
  };

  const r = s.soort === 'louvre'
      ? calcLouvre({
        aantal: s.aantal, aantalPanelen: s.aantalPanelen, inbouwhoogte: s.inbouwhoogte,
        dagmaatBreedte: s.dagmaatBreedte, rail: s.rail, sporen: s.sporen,
        kleurFrame: s.louvreKleurFrame, kleurLamel: s.louvreKleurLamel, opties: s.louvreOpties, transport: s.transport,
        extraLijnen: s.extraLijnen, plaatsingPerPaneel: s.plaatsingLouvrePerPaneel, ...vb, marges, opmerkingen: s.opmerkingen,
      })
      : calcOnderdelen({
        omschrijving: s.omschrijving, regels: s.regels, extraLijnen: s.extraLijnen, transport: s.transport,
        plaatsingVast: s.plaatsingOnderdelen, ...vb, marges, opmerkingen: s.opmerkingen,
      });

  // Enkel de velden van de gekozen soort gaan mee in het offerte-item (en terug bij bewerken).
  const input: Partial<State> = { ...s };

  const toonResultaat = s.soort === 'louvre' ? s.inbouwhoogte > 0 && s.aantalPanelen > 0
    : s.regels.length > 0 || s.extraLijnen.length > 0;

  return (
    <>
      <div className="panel">
        <h2>Deponti configureren</h2>
        <div className="alert info">
          STERDealer-prijslijst 2026: de dealerlijst is de inkoopprijs (geen korting) · marge standaard {DEPONTI.marge * 100}% ·
          de Pinela-overkappingen zitten in de tab Overkappingen, de Fiano-glaswand in de tab Glaswand (merk Deponti).
        </div>
        <Sec title="Product">
          <Sel label="Wat wil je berekenen?" value={s.soort} onChange={(v) => u({ soort: v as Soort })} options={SOORTEN} />
        </Sec>

        {s.soort === 'louvre' && <LouvreVelden s={s} u={u} />}
        {s.soort === 'onderdelen' && <OnderdelenVelden s={s} u={u} />}

        <Sec title="Transport">
          <Chk label="Transport dealer — €160 per levering (standaard aan)" value={s.transport}
            onChange={(transport) => u({ transport })} />
        </Sec>

        <Sec title="Extra (niet in de prijslijst)">
          <div className="alert info">
            Voor stukken zonder prijs in de lijst 2026 (bv. een koker, een extra staander, lakwerk). Het bedrag is de inkoopprijs.
          </div>
          {s.extraLijnen.map((e, i) => (
            <div className="grid2" key={i} style={{ marginBottom: 6 }}>
              <Txt label={`Omschrijving ${i + 1}`} value={e.omschrijving}
                onChange={(omschrijving) => u({ extraLijnen: s.extraLijnen.map((x, j) => (j === i ? { ...x, omschrijving } : x)) })} />
              <Num label="Inkoop (€)" value={e.bedrag}
                onChange={(bedrag) => u({ extraLijnen: s.extraLijnen.map((x, j) => (j === i ? { ...x, bedrag } : x)) })} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" type="button"
              onClick={() => u({ extraLijnen: [...s.extraLijnen, { omschrijving: '', bedrag: 0 }] })}>+ extra lijn</button>
            {s.extraLijnen.length > 0 && (
              <button className="btn ghost" type="button" onClick={() => u({ extraLijnen: s.extraLijnen.slice(0, -1) })}>− laatste</button>
            )}
          </div>
        </Sec>

        <Sec title="Voorbereidende werken">
          <div className="grid2">
            <Num label="Aantal man" value={s.voorbereidingPersonen} min={0} onChange={(voorbereidingPersonen) => u({ voorbereidingPersonen })} />
            <Num label="Aantal uur" value={s.voorbereidingUren} min={0} onChange={(voorbereidingUren) => u({ voorbereidingUren })} />
            <Num label="Uurtarief (€)" value={s.voorbereidingTarief} min={0} onChange={(voorbereidingTarief) => u({ voorbereidingTarief })} />
          </div>
        </Sec>

        <Sec title="Marge & korting">
          <div className="grid2">
            <Num label="BKfix marge (%)" value={s.margePct} min={0} onChange={(margePct) => u({ margePct })}
              hint="Deponti-rekenbladen 2026: 20% op de inkoop" />
            <Num label="Eenmalige korting (€)" value={s.korting} onChange={(korting) => u({ korting })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Txt label="Opmerkingen" value={s.opmerkingen} onChange={(opmerkingen) => u({ opmerkingen })} />
          </div>
        </Sec>
      </div>
      {toonResultaat && <ResultCard r={r} kind="deponti" input={input} />}
    </>
  );
}

type VeldProps = { s: State; u: (p: Partial<State>) => void };

// ======================================================================================
// Fiano Louvre
// ======================================================================================

function LouvreVelden({ s, u }: VeldProps) {
  const klasse = s.inbouwhoogte ? louvreKlasse(s.inbouwhoogte) : undefined;
  const sporen = s.sporen || s.aantalPanelen;
  const W = s.dagmaatBreedte > 0 ? s.dagmaatBreedte : s.aantalPanelen * 1040;
  const rail = s.rail === 'met' ? kiesRaillengte(sporen, W) : null;
  const setOptie = (i: number, p: Partial<DepontiOptieKeuze>) =>
    u({ louvreOpties: s.louvreOpties.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  return (
    <>
      <Sec title="Fiano Louvre">
        <div className="alert info">
          Schuivende louvrepanelen, frame 1040mm breed. Prijs per paneel volgens de inbouwhoogte
          ({LOUVRE_HOOGTE.min}–{LOUVRE_HOOGTE.max}mm, per 50mm). De lijst zegt niet of de Fiano-rail apart
          besteld moet worden: kies het hieronder bewust.
        </div>
        <div className="grid2">
          <Num label="Aantal identieke wanden" value={s.aantal} min={1} onChange={(a) => u({ aantal: Math.max(1, Math.floor(a || 1)) })} />
          <Num label="Aantal panelen *" value={s.aantalPanelen} min={1}
            onChange={(v) => u({ aantalPanelen: Math.max(0, Math.floor(v)) })}
            hint={s.dagmaatBreedte > 0 ? `${s.aantalPanelen} × 1040mm = ${s.aantalPanelen * 1040}mm aan frames` : undefined} />
          <Num label="Inbouwhoogte (mm) *" value={s.inbouwhoogte} min={0} onChange={(inbouwhoogte) => u({ inbouwhoogte })}
            hint={klasse ? `${klasse.label} — €${klasse.prijs} per paneel` : `${LOUVRE_HOOGTE.min} tot ${LOUVRE_HOOGTE.max}mm`} />
          <Num label="Dagmaat breedte (mm, optioneel)" value={s.dagmaatBreedte} min={0}
            onChange={(dagmaatBreedte) => u({ dagmaatBreedte })} hint="Enkel om de overlap en de rail te bepalen" />
          <Sel label="Fiano-rail *" value={s.rail} onChange={(v) => u({ rail: v as State['rail'] })}
            options={[{ v: '', t: '(kies)' }, { v: 'met', t: 'Met Fiano-rail (meerekenen)' }, { v: 'zonder', t: 'Zonder rail (bestaand / niet nodig)' }]}
            hint={s.rail === 'met' ? (rail ? `${sporen} sporen × ${rail}mm` : 'Geen passende rail') : undefined} />
          {s.rail === 'met' && (
            <Num label="Aantal sporen (0 = zoals panelen)" value={s.sporen} min={0} onChange={(v) => u({ sporen: v })} />
          )}
          <Sel label="Framekleur" value={s.louvreKleurFrame} onChange={(louvreKleurFrame) => u({ louvreKleurFrame })}
            options={[{ v: '', t: '(kies)' }, ...LOUVRE_KLEUREN.filter((k) => !/Eik/.test(k)).map((k) => ({ v: k, t: k }))]} />
          <Sel label="Lamelkleur" value={s.louvreKleurLamel} onChange={(louvreKleurLamel) => u({ louvreKleurLamel })}
            options={[{ v: '', t: 'zoals het frame' }, ...LOUVRE_KLEUREN.map((k) => ({ v: k, t: k }))]} />
        </div>
      </Sec>
      <Sec title="Opties (Fiano-onderdelen)">
        {s.louvreOpties.map((o, i) => (
          <div className="grid2" key={i} style={{ marginBottom: 6 }}>
            <Sel label={`Optie ${i + 1}`} value={o.id} onChange={(id) => setOptie(i, { id })}
              options={[{ v: '', t: '(kies)' }, ...LOUVRE_OPTIES.map((x) => ({ v: x.id, t: `${x.label} — €${x.prijs} / ${x.eenheid}` }))]} />
            <Num label="Aantal" value={o.aantal} min={0} onChange={(aantal) => setOptie(i, { aantal })} />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" type="button" onClick={() => u({ louvreOpties: [...s.louvreOpties, { id: '', aantal: 1 }] })}>+ optie</button>
          {s.louvreOpties.length > 0 && (
            <button className="btn ghost" type="button" onClick={() => u({ louvreOpties: s.louvreOpties.slice(0, -1) })}>− laatste</button>
          )}
        </div>
      </Sec>
      <Sec title="Plaatsing">
        <div className="grid2">
          <Num label="Plaatsing per Louvre-paneel (€)" value={s.plaatsingLouvrePerPaneel} min={0}
            onChange={(plaatsingLouvrePerPaneel) => u({ plaatsingLouvrePerPaneel })}
            hint="Rekenblad 3864: €250 per Louvre (bij 2827 zat hij in de plaatsing van de glaswand)" />
        </div>
      </Sec>
    </>
  );
}

// ======================================================================================
// Onderdelen
// ======================================================================================

function OnderdelenVelden({ s, u }: VeldProps) {
  const [groep, setGroep] = useState(ONDERDEEL_GROEPEN[0].groep);
  const [grilloHoogte, setGrilloHoogte] = useState(0);
  const g = ONDERDEEL_GROEPEN.find((x) => x.groep === groep)!;
  const setRegel = (i: number, p: Partial<OnderdeelRegel>) =>
    u({ regels: s.regels.map((x, j) => (j === i ? { ...x, ...p } : x)) });

  return (
    <>
      <Sec title="Onderdelen">
        <div className="grid2">
          <Txt label="Omschrijving op de offerte (optioneel)" value={s.omschrijving}
            onChange={(omschrijving) => u({ omschrijving })} placeholder="bv. Grillo-wand links" />
        </div>
        {s.regels.map((rg, i) => {
          const a = onderdeelArtikel(rg.artikel);
          return (
            <div className="grid2" key={i} style={{ marginBottom: 6, alignItems: 'end' }}>
              <div className="fld">
                <label>Artikel {i + 1}</label>
                <div style={{ padding: '8px 0', fontWeight: 600 }}>
                  {a ? `${a.label} — €${fmt(a.prijs)}` : `Onbekend artikel (${rg.artikel})`}
                </div>
                {a && <div className="hint">{a.groep}</div>}
              </div>
              <Num label="Aantal" value={rg.aantal} min={0} onChange={(aantal) => setRegel(i, { aantal })} />
              {a && a.kleuren.length > 0 ? (
                <Sel label="Kleur" value={rg.kleur} onChange={(kleur) => setRegel(i, { kleur })}
                  options={[{ v: '', t: '(geen / n.v.t.)' }, ...a.kleuren.map((k) => ({ v: k, t: k }))]} />
              ) : (
                <Txt label="Kleur (optioneel)" value={rg.kleur} onChange={(kleur) => setRegel(i, { kleur })} />
              )}
              <div>
                <button className="btn ghost sm" type="button"
                  onClick={() => u({ regels: s.regels.filter((_, j) => j !== i) })}>verwijderen</button>
              </div>
            </div>
          );
        })}
      </Sec>
      <Sec title="Artikel toevoegen">
        <div className="grid2">
          <Sel label="Groep" value={groep} onChange={setGroep}
            options={ONDERDEEL_GROEPEN.map((x) => ({ v: x.groep, t: `${x.groep} (blz. ${x.blz})` }))} />
        </div>
        {g.info && <div className="hint" style={{ margin: '4px 0 8px' }}>{g.info}</div>}
        {g.groep === 'Grillo panelen' && (
          <div className="grid2">
            <Num label="Hoogte Grillo-wand (mm) — hulp" value={grilloHoogte} min={0} onChange={setGrilloHoogte}
              hint={grilloHoogte > 0
                ? `${Math.ceil(grilloHoogte / GRILLO_WERKENDE_HOOGTE)} schuttingdelen per vak (werkende hoogte ${GRILLO_WERKENDE_HOOGTE}mm)`
                : `Werkende hoogte ${GRILLO_WERKENDE_HOOGTE}mm per schuttingdeel`} />
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {g.artikelen.map((a) => (
            <button key={a.id} className="btn ghost sm" type="button"
              onClick={() => u({
                regels: [...s.regels, {
                  artikel: a.id,
                  aantal: g.groep === 'Grillo panelen' && grilloHoogte > 0 && /schuttingdeel/.test(a.label)
                    ? Math.ceil(grilloHoogte / GRILLO_WERKENDE_HOOGTE) : 1,
                  kleur: '',
                }],
              })}>
              + {a.label} (€{fmt(a.prijs)})
            </button>
          ))}
        </div>
      </Sec>
      <Sec title="Plaatsing">
        <div className="grid2">
          <Num label="Plaatsing (€, voor deze regel)" value={s.plaatsingOnderdelen} min={0}
            onChange={(plaatsingOnderdelen) => u({ plaatsingOnderdelen })}
            hint="Rekenblad 3962: zijspie €340 per stuk" />
        </div>
      </Sec>
    </>
  );
}
