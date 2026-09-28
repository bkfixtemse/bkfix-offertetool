import { useMemo, useState } from 'react';
import {
  calcPinela, depontiMarges, PINELA_OPTIES, PINELA_SCREENS, PINELA_TYPES, pinelaType,
  type DepontiExtra, type DepontiOptieKeuze, type PinelaMontage,
} from '../../calc/deponti';
import {
  berekenWanden, hoogteMeldingen, overkappingZijden, wandenMogelijk,
  GEEN_WAND, MAX_ONDERKANT_GOOT, type WandKeuze, type ZijdeId,
} from '../../calc/overkapping';
import { DEPONTI, GLASWAND_VOORBEREIDING_TARIEF } from '../../data/constants';
import { Chk, fmt, Num, Sec, Sel, Txt } from '../../components/fields';
import { ResultCard } from '../../components/ResultCard';
import { useOffer } from '../../store/offerStore';
import { GlaswandenEronder } from './GlaswandenEronder';
import { EsOverkapping, ES_DEFAULT } from './EsOverkappingForm';

const DEFAULT = {
  type: 'Pinela Delight',
  aantal: 1,
  breedte: 0,
  uitval: 0,
  ruimteBreedte: 0,
  ruimteUitval: 0,
  montage: 'muur' as PinelaMontage,
  kleurFrame: '',
  kleurFrameCustom: '',
  kleurLamel: '',
  screensBreedte: 0,
  screensUitval: 0,
  opties: [] as DepontiOptieKeuze[],
  plaatsingPerStuk: DEPONTI.plaatsingPinela as number,
  plaatsingPerScreen: DEPONTI.plaatsingScreen as number,
  plaatsingPerKoppelset: DEPONTI.plaatsingKoppelset as number,
  /** Transport dealer €160 per levering — BKfix rekent het altijd (21-09-2026). */
  transport: true,
  extraLijnen: [] as DepontiExtra[],
  voorbereidingPersonen: 0,
  voorbereidingUren: 0,
  voorbereidingTarief: GLASWAND_VOORBEREIDING_TARIEF,
  margePct: DEPONTI.marge * 100,
  korting: 0,
  opmerkingen: '',
  // ---- Glaswanden eronder ----
  /** Gemeten hoogte van de vloer tot de onderkant van de goot: de dagmaat hoogte van de glaswanden. */
  onderkantGoot: MAX_ONDERKANT_GOOT as number,
  wanden: {
    voor: { ...GEEN_WAND }, achter: { ...GEEN_WAND }, links: { ...GEEN_WAND }, rechts: { ...GEEN_WAND },
  } as Record<ZijdeId, WandKeuze>,
};
type State = typeof DEFAULT;

function PinelaOverkapping() {
  const [s, set] = useState<State>(() => {
    const et = useOffer.getState().editTarget;
    return et?.kind === 'overkapping' ? { ...DEFAULT, ...(et.input as Partial<State>) } : DEFAULT;
  });
  const u = (p: Partial<State>) => set({ ...s, ...p });
  const add = useOffer((st) => st.add);
  const replace = useOffer((st) => st.replace);
  const editTarget = useOffer((st) => st.editTarget);
  const cancelEdit = useOffer((st) => st.cancelEdit);
  const bewerken = editTarget?.kind === 'overkapping';
  const [melding, setMelding] = useState('');

  const t = pinelaType(s.type);
  const r = calcPinela({
    ...s,
    voorbereidingPersonen: s.voorbereidingPersonen, voorbereidingUren: s.voorbereidingUren,
    voorbereidingTarief: s.voorbereidingTarief, marges: depontiMarges(s.margePct, s.korting),
  });

  // ---- Wanden ----
  // Bij het bewerken van een bestaande overkapping blijven de wanden erbuiten: die staan als eigen
  // glaswand-items op de offerte en worden in de Glaswand-tab aangepast.
  const zijden = bewerken ? [] : overkappingZijden(s.type, s.breedte, s.uitval, s.montage);
  const gekoppeld = s.opties.some((k) => k.aantal > 0 && PINELA_OPTIES.find((o) => o.id === k.id)?.koppelset);
  /** Het aantal per zijde is enkel zichtbaar (en telt enkel) bij meerdere of gekoppelde overkappingen. */
  const toonAantal = s.aantal > 1 || gekoppeld;
  const setWand = (id: ZijdeId, p: Partial<WandKeuze>) =>
    u({ wanden: { ...s.wanden, [id]: { ...s.wanden[id], ...p } } });

  const sleutel = JSON.stringify([
    zijden.filter((z) => s.wanden[z.id]?.aan).map((z) => [z.id, s.wanden[z.id].dagmaat, s.wanden[z.id].aantal]),
    s.onderkantGoot, s.type, s.breedte, s.uitval, s.montage, s.aantal, toonAantal,
  ]);
  const wanden = useMemo(() => berekenWanden({
    zijden, wanden: s.wanden, onderkantGoot: s.onderkantGoot, uitval: s.uitval, aantal: s.aantal,
    titel: `Onder ${s.type} ${s.breedte} × ${s.uitval}`, toonAantal,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [sleutel]);
  const { actief, gekozen, aantalVan } = wanden;
  const wandFouten = wanden.fouten;
  const hoogteFout = actief.length > 0 ? hoogteMeldingen(s.onderkantGoot) : [];
  // Onder elke koppeling staat een staander (handleidingen Tilt/Delight): daar, binnen onder het dak,
  // komt geen buitenwand. Gekoppelde systemen hebben dus minder wanden dan aantal × zijden.
  const koppelMelding = gekoppeld && s.aantal > 1 && actief.some((z) => !(s.wanden[z.id]?.aantal > 0));
  /** De aantallen zoals ze nu staan uitdrukkelijk bevestigen (ook als ze al juist stonden). */
  const bevestigAantallen = () => u({
    wanden: Object.fromEntries(Object.entries(s.wanden).map(([id, w]) =>
      [id, actief.some((z) => z.id === id) ? { ...w, aantal: aantalVan(id as ZijdeId) } : w])) as Record<ZijdeId, WandKeuze>,
  });
  const totaalWanden = wanden.totaal;

  /** Van type wisselen: de maat, kleur en wanden horen bij het type. */
  const wisselType = (type: string) => u({
    type, breedte: 0, uitval: 0, kleurFrame: '', kleurFrameCustom: '', kleurLamel: '',
    ...(pinelaType(type)?.screens ? {} : { screensBreedte: 0, screensUitval: 0 }),
    wanden: DEFAULT.wanden,
  });

  const toevoegen = () => {
    setMelding('');
    if (bewerken && editTarget) {
      // Opslaan beëindigt de bewerking: het formulier begint daarna opnieuw (zoals in de andere tabs).
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
  const kanToevoegen = r.ok && wandFouten.length === 0 && hoogteFout.length === 0;

  return (
    <>
      <div className="panel">
        <h2>Overkapping configureren</h2>
        <div className="alert info">
          Deponti Pinela-familie (lijst 2026 blz. 20-25). De dealerlijst is de inkoopprijs · marge standaard {DEPONTI.marge * 100}%.
          Onder een Delight, Tilt of Deluxe Plus bereken je meteen de glaswanden: de maat volgt uit de overkapping,
          telkens in Deponti Fiano én ES75 naast elkaar.
        </div>

        <Sec title="Type & montage">
          <div className="grid2">
            <Sel label="Type *" value={s.type} onChange={wisselType} options={PINELA_TYPES} />
            <Num label="Aantal identieke overkappingen" value={s.aantal} min={1}
              onChange={(a) => u({
                aantal: Math.max(1, Math.floor(a || 1)),
                // Een ander aantal overkappingen: de wanden per zijde volgen opnieuw dat aantal.
                wanden: Object.fromEntries(Object.entries(s.wanden)
                  .map(([id, w]) => [id, { ...w, aantal: 0 }])) as Record<ZijdeId, WandKeuze>,
              })} />
            <Sel label="Montage" value={s.montage} onChange={(m) => u({ montage: m as PinelaMontage, wanden: DEFAULT.wanden })}
              options={[{ v: 'muur', t: 'Muurmontage — 2 staanders' }, { v: 'vrij', t: 'Vrijstaand — 4 staanders' }]}
              hint="Zelfde prijs in de lijst (so91234: vrijstaand = tabelprijs)" />
          </div>
          {t && (
            <div className="hint" style={{ marginTop: 6 }}>
              {t.omschrijving} LED: {t.led || 'niet inbegrepen'}. (Prijslijst 2026 blz. {t.blz})
            </div>
          )}
        </Sec>

        {t && (
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
                    {t.kolommen.map((k) => <th key={k} className="r">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {t.rijen.map((rij) => (
                    <tr key={rij}>
                      <td><b>{rij}</b>{t.lamellen?.rij?.[String(rij)] ? ` (#${t.lamellen.rij[String(rij)]})` : ''}</td>
                      {t.kolommen.map((k) => {
                        const prijs = t.prijzen[String(rij)]?.[String(k)];
                        const isGekozen = s.breedte === rij && s.uitval === k;
                        const past = (!s.ruimteBreedte || rij <= s.ruimteBreedte) && (!s.ruimteUitval || k <= s.ruimteUitval);
                        if (typeof prijs !== 'number') return <td key={k} className="r" style={{ color: 'var(--tx3)' }}>—</td>;
                        return (
                          <td key={k} className="r">
                            <button type="button" className={`btn sm ${isGekozen ? '' : 'ghost'}`}
                              style={!isGekozen && (s.ruimteBreedte || s.ruimteUitval) && past
                                ? { borderColor: 'var(--green)', color: 'var(--green)' } : undefined}
                              title={`Inkoop €${fmt(prijs, 0)} — klik om te kiezen`}
                              onClick={() => u({
                                breedte: rij, uitval: k,
                                // Een ingetikte dagmaat hoort bij de vorige maat: opnieuw de vrije opening volgen.
                                wanden: Object.fromEntries(Object.entries(s.wanden)
                                  .map(([id, w]) => [id, { ...w, dagmaat: 0 }])) as Record<ZijdeId, WandKeuze>,
                              })}>
                              €{fmt(prijs, 0)}
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
                ? <>Gekozen: <b>{s.breedte} × {s.uitval}mm</b> (buitenkant staanders), {s.montage === 'vrij' ? 4 : 2} staanders. Prijzen = inkoop.</>
                : 'Klik een prijs aan om die maat te kiezen. (#..) = aantal lamellen.'}
            </div>
          </Sec>
        )}

        {t && (
          <Sec title="Kleur">
            <div className="grid2">
              {/* Deponti levert de Pinela enkel in deze structuurkleuren: geen kleur op aanvraag.
                  'Andere kleur' blijft enkel staan zolang een oude offerte die nog bevat. */}
              <Sel label="Framekleur" value={s.kleurFrame} onChange={(kleurFrame) => u({ kleurFrame })}
                options={[{ v: '', t: '(kies)' }, ...t.kleuren.map((k) => ({ v: k, t: k })),
                  ...(s.kleurFrame === 'andere' ? [{ v: 'andere', t: 'Andere kleur (oude offerte)' }] : [])]}
                hint="Enkel deze kleuren — Deponti doet de Pinela niet op aanvraag" />
              {s.kleurFrame === 'andere' && (
                <Txt label="Welke kleur" value={s.kleurFrameCustom} onChange={(kleurFrameCustom) => u({ kleurFrameCustom })} />
              )}
              {t.lamelKleurApart && (
                <Sel label="Lamelkleur" value={s.kleurLamel} onChange={(kleurLamel) => u({ kleurLamel })}
                  options={[{ v: '', t: 'zoals het frame' },
                    ...(t.lamelKleuren ?? []).map((k) => ({ v: k, t: k })),
                    // Een bewaarde offerte kan nog een combinatie bevatten die nu niet meer kan.
                    ...(s.kleurLamel && !(t.lamelKleuren ?? []).includes(s.kleurLamel)
                      ? [{ v: s.kleurLamel, t: `${s.kleurLamel} (oude offerte)` }] : [])]}
                  hint="Zoals het frame of witte lamellen" />
              )}
            </div>
          </Sec>
        )}

        {t?.screens && (
          <Sec title="Screens (per overkapping)">
            <div className="grid2">
              <Num label="Screens voorzijde (langs de breedte)" value={s.screensBreedte} min={0}
                onChange={(v) => u({ screensBreedte: Math.max(0, Math.floor(v)) })}
                hint={PINELA_SCREENS.breedte[String(s.breedte)] ? `${PINELA_SCREENS.breedte[String(s.breedte)].maat} — €${PINELA_SCREENS.breedte[String(s.breedte)].prijs}` : s.breedte ? `Geen screen voor breedte ${s.breedte}` : ''} />
              <Num label="Screens zijkant (langs de uitval)" value={s.screensUitval} min={0}
                onChange={(v) => u({ screensUitval: Math.max(0, Math.floor(v)) })}
                hint={PINELA_SCREENS.uitval[String(s.uitval)] ? `${PINELA_SCREENS.uitval[String(s.uitval)].maat} — €${PINELA_SCREENS.uitval[String(s.uitval)].prijs}` : s.uitval ? `Geen screen voor uitval ${s.uitval}` : ''} />
            </div>
            <div className="hint">Doek antraciet, Somfy IO, tot 2,5m onderkant goot.</div>
          </Sec>
        )}

        <Sec title="Opties">
          {s.opties.map((o, i) => {
            const def = PINELA_OPTIES.find((x) => x.id === o.id);
            return (
              <div className="grid2" key={i} style={{ marginBottom: 6 }}>
                <Sel label={`Optie ${i + 1}`} value={o.id}
                  onChange={(id) => u({ opties: s.opties.map((x, j) => (j === i ? { ...x, id } : x)) })}
                  options={[{ v: '', t: '(kies)' }, ...PINELA_OPTIES.map((x) => ({
                    v: x.id, t: `${x.label} — €${x.prijs} / ${x.eenheid}${x.perStuk ? ' (per overkapping)' : ' (voor de hele regel)'}`,
                  }))]}
                  hint={def?.bron} />
                <Num label="Aantal" value={o.aantal} min={0}
                  onChange={(aantal) => u({ opties: s.opties.map((x, j) => (j === i ? { ...x, aantal } : x)) })} />
              </div>
            );
          })}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn ghost" type="button" onClick={() => u({ opties: [...s.opties, { id: '', aantal: 1 }] })}>+ optie</button>
            <button className="btn ghost" type="button"
              onClick={() => u({ opties: [...s.opties, { id: 'montagevoet', aantal: s.montage === 'vrij' ? 4 : 2 }] })}>
              + montagevoeten ({s.montage === 'vrij' ? 4 : 2} per overkapping)
            </button>
            <button className="btn ghost" type="button"
              onClick={() => u({ opties: [...s.opties, { id: s.montage === 'vrij' ? 'koppelset_vrij2' : 'koppelset_muur2', aantal: 1 }] })}>
              + koppelset 2 systemen
            </button>
            {s.opties.length > 0 && (
              <button className="btn ghost" type="button" onClick={() => u({ opties: s.opties.slice(0, -1) })}>− laatste</button>
            )}
          </div>
          <div className="hint" style={{ marginTop: 6 }}>
            Bij koppelen crediteerde Deponti in 2026 €50 per hoekstaander die wegvalt (2 bij muurmontage, 4 bij
            vrijstaand) — vraag het in de opmerking van de order en voeg de creditering hier toe.
          </div>
          <div style={{ marginTop: 8 }}>
            <Chk label="Transport dealer — €160 per levering (standaard aan)" value={s.transport} onChange={(transport) => u({ transport })} />
          </div>
        </Sec>

        <Sec title="Plaatsing, marge & korting">
          <div className="grid2">
            <Num label="Plaatsing per overkapping (€)" value={s.plaatsingPerStuk} min={0}
              onChange={(plaatsingPerStuk) => u({ plaatsingPerStuk })} hint="Rekenbladen 2026: meestal €2.500" />
            <Num label="Plaatsing per screen (€)" value={s.plaatsingPerScreen} min={0}
              onChange={(plaatsingPerScreen) => u({ plaatsingPerScreen })} hint="Rekenbladen: €230 / €400" />
            <Num label="Plaatsing per koppelset (€)" value={s.plaatsingPerKoppelset} min={0}
              onChange={(plaatsingPerKoppelset) => u({ plaatsingPerKoppelset })} hint="Rekenblad 3450: €150" />
            <Num label="BKfix marge (%)" value={s.margePct} min={0} onChange={(margePct) => u({ margePct })} />
            <Num label="Eenmalige korting (€)" value={s.korting} onChange={(korting) => u({ korting })} />
            <Num label="Voorbereidende werken — man" value={s.voorbereidingPersonen} min={0} onChange={(voorbereidingPersonen) => u({ voorbereidingPersonen })} />
            <Num label="Voorbereidende werken — uur" value={s.voorbereidingUren} min={0} onChange={(voorbereidingUren) => u({ voorbereidingUren })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Txt label="Opmerkingen" value={s.opmerkingen} onChange={(opmerkingen) => u({ opmerkingen })} />
          </div>
        </Sec>

        {t && s.breedte > 0 && s.uitval > 0 && (
          <Sec title="Glaswanden eronder">
            {!wandenMogelijk(s.type) ? (
              <div className="hint">De lijst 2026 noemt geen glaswand als optie bij de {s.type}.</div>
            ) : bewerken ? (
              <div className="hint">Je bewerkt een bestaande overkapping. De glaswanden die erbij horen, pas je aan in de Glaswand-tab.</div>
            ) : (
              <GlaswandenEronder
                zijden={zijden} wanden={s.wanden} setWand={setWand} status={wanden}
                onderkantGoot={s.onderkantGoot} setOnderkantGoot={(onderkantGoot) => u({ onderkantGoot })}
                toonAantal={toonAantal} aantal={s.aantal} hoogteFout={hoogteFout}
                hoogteHint={`Gemeten van de vloer tot de onderkant van de goot; maximaal ${MAX_ONDERKANT_GOOT}mm doorloophoogte (Deponti). `
                  + 'Fiano: de tool kiest de standaardhoogte die erin past (compensatietabel Deponti).'}
                melding={koppelMelding && (
                  <div className="alert warn" style={{ marginTop: 6 }}>
                    Gekoppelde systemen: onder elke koppeling staat een staander, en daar (binnen onder het dak) komt geen
                    buitenwand. Zet per zijde het aantal wanden dat echt nodig is.{' '}
                    <button className="btn ghost sm" type="button" onClick={bevestigAantallen}>De aantallen kloppen</button>
                  </div>
                )}
              />
            )}
          </Sec>
        )}
      </div>

      {s.breedte > 0 && s.uitval > 0 && (
        <>
          <ResultCard r={r} kind="overkapping" input={s} zonderKnop />
          <div className="panel" style={{ marginTop: 12 }}>
            {wandFouten.map((f) => <div key={f} className="alert err">{f}</div>)}
            {/* Enkel een totaal als elke aangevinkte wand een geldige prijs heeft: anders klopt het niet. */}
            {r.ok && actief.length > 0 && wandFouten.length === 0 && hoogteFout.length === 0 && (
              <div className="pline"><span>Klantprijs overkapping + {actief.length} glaswand{actief.length > 1 ? 'en' : ''}</span>
                <b>€{fmt(r.uwVerkoop + totaalWanden)}</b></div>
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

/**
 * De tab Overkappingen: twee merken naast elkaar. Deponti (Pinela-familie) en ES Systems
 * (Comfortline Plus en Black) hebben elk hun eigen prijsraster en opties, maar delen het blok
 * met de glaswanden eronder. Een bewaard item onthoudt zijn merk, zodat het in het juiste
 * formulier heropent.
 */
export function OverkappingForm() {
  const editTarget = useOffer((s) => s.editTarget);
  const bewerken = editTarget?.kind === 'overkapping';
  const [merk, setMerk] = useState<'Deponti' | 'ES Systems'>(
    () => ((editTarget?.input as { merk?: string } | undefined)?.merk === ES_DEFAULT.merk
      ? 'ES Systems' : 'Deponti'),
  );
  return (
    <>
      <div className="panel">
        <Sec title="Merk">
          <div className="grid2">
            <Sel label="Merk *" value={merk} onChange={(v) => setMerk(v as 'Deponti' | 'ES Systems')}
              options={[
                { v: 'Deponti', t: 'Deponti — Pinela-familie' },
                { v: 'ES Systems', t: 'ES Systems — Comfortline Plus & Black' },
              ]}
              disabled={bewerken}
              hint={bewerken ? 'Je bewerkt een bestaand item: het merk ligt vast.' : undefined} />
          </div>
        </Sec>
      </div>
      {merk === 'Deponti' ? <PinelaOverkapping /> : <EsOverkapping />}
    </>
  );
}
