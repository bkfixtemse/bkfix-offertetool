import { useMemo, useState } from 'react';
import {
  calcPinela, depontiMarges, PINELA_OPTIES, PINELA_SCREENS, PINELA_TYPES, pinelaType,
  type DepontiExtra, type DepontiOptieKeuze, type PinelaMontage,
} from '../../calc/deponti';
import {
  hoogteMeldingen, MAX_ONDERKANT_GOOT, overkappingZijden, wandenMogelijk, wandMaatFout, wandVoorstellen,
  type WandVoorstel, type WandVoorstellen, type ZijdeId,
} from '../../calc/overkapping';
import type { GlaswandMerk } from '../../calc/glaswand';
import { DEPONTI, GLASWAND_VOORBEREIDING_TARIEF } from '../../data/constants';
import { Chk, fmt, Num, Sec, Sel, Txt } from '../../components/fields';
import { ResultCard } from '../../components/ResultCard';
import { useOffer } from '../../store/offerStore';

interface WandKeuze {
  aan: boolean;
  /** Gemeten/gewenste dagmaat breedte; 0 = de voorgestelde vrije opening gebruiken. */
  dagmaat: number;
  /** '' = het goedkoopste merk. */
  merk: '' | GlaswandMerk;
  /** Aantal wanden aan deze zijde; 0 = één per overkapping (het aantal identieke overkappingen). */
  aantal: number;
}

const GEEN_WAND: WandKeuze = { aan: false, dagmaat: 0, merk: '', aantal: 0 };

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

export function OverkappingForm() {
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
  const zijden = overkappingZijden(s.type, s.breedte, s.uitval, s.montage);
  // Bij het bewerken van een bestaande overkapping blijven de wanden erbuiten: die staan als eigen
  // glaswand-items op de offerte en worden in de Glaswand-tab aangepast.
  const actief = bewerken ? [] : zijden.filter((z) => s.wanden[z.id]?.aan);
  const maatVan = (id: ZijdeId) => {
    const z = zijden.find((x) => x.id === id);
    return s.wanden[id]?.dagmaat > 0 ? s.wanden[id].dagmaat : (z?.dagmaat ?? 0);
  };
  const gekoppeld = s.opties.some((k) => k.aantal > 0 && PINELA_OPTIES.find((o) => o.id === k.id)?.koppelset);
  /** Het aantal per zijde is enkel zichtbaar (en telt enkel) bij meerdere of gekoppelde overkappingen. */
  const toonAantal = s.aantal > 1 || gekoppeld;
  const aantalVan = (id: ZijdeId) => (toonAantal && s.wanden[id]?.aantal > 0 ? s.wanden[id].aantal : s.aantal);
  const sleutel = JSON.stringify(actief.map((z) => [z.id, maatVan(z.id), aantalVan(z.id)]))
    + `|${s.onderkantGoot}|${s.type}|${s.breedte}x${s.uitval}`;
  const voorstellen = useMemo(() => {
    const uit: Partial<Record<ZijdeId, WandVoorstellen>> = {};
    for (const z of actief) {
      const b = maatVan(z.id);
      if (b > 0 && s.onderkantGoot > 0) {
        uit[z.id] = wandVoorstellen(
          b, s.onderkantGoot, `Onder ${s.type} ${s.breedte} × ${s.uitval} — ${z.label.toLowerCase()}`, aantalVan(z.id),
        );
      }
    }
    return uit;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleutel]);
  const gekozen = (id: ZijdeId): WandVoorstel | null => {
    const v = voorstellen[id];
    if (!v) return null;
    const merk = s.wanden[id].merk || v.goedkoopste;
    return merk === 'ES Systems' ? v.es : merk === 'Deponti' ? v.deponti : null;
  };
  const setWand = (id: ZijdeId, p: Partial<WandKeuze>) =>
    u({ wanden: { ...s.wanden, [id]: { ...s.wanden[id], ...p } } });

  const wandFouten: string[] = [];
  for (const z of actief) {
    const b = maatVan(z.id);
    const maatFout = b > 0 ? wandMaatFout(z, b, s.uitval) : '';
    if (!(b > 0)) wandFouten.push(`${z.label}: vul de dagmaat in`);
    else if (maatFout) wandFouten.push(maatFout);
    else {
      const g = gekozen(z.id);
      // Zonder hoogte is er nog geen voorstel: dat meldt hoogteMeldingen al, niet "geen glaswand".
      if (!g) { if (s.onderkantGoot > 0) wandFouten.push(`${z.label}: geen geschikte glaswand in ${b}mm`); }
      // Een zelf gekozen merk dat na een maatwijziging niet meer past: nooit stil een onmogelijke wand toevoegen.
      else if (!g.beste) wandFouten.push(`${z.label} (${g.merk}): ${g.reden}`);
      else if (!g.r.ok) wandFouten.push(`${z.label}: ${g.r.errors.join(' · ')}`);
    }
  }
  const hoogteFout = actief.length > 0 ? hoogteMeldingen(s.onderkantGoot) : [];
  // Onder elke koppeling staat een staander (handleidingen Tilt/Delight): daar, binnen onder het dak,
  // komt geen buitenwand. Gekoppelde systemen hebben dus minder wanden dan aantal × zijden.
  const koppelMelding = gekoppeld && s.aantal > 1 && actief.some((z) => !(s.wanden[z.id]?.aantal > 0));
  /** De aantallen zoals ze nu staan uitdrukkelijk bevestigen (ook als ze al juist stonden). */
  const bevestigAantallen = () => u({
    wanden: Object.fromEntries(Object.entries(s.wanden).map(([id, w]) =>
      [id, actief.some((z) => z.id === id) ? { ...w, aantal: aantalVan(id as ZijdeId) } : w])) as Record<ZijdeId, WandKeuze>,
  });
  const totaalWanden = actief.reduce((t2, z) => t2 + (gekozen(z.id)?.r.uwVerkoop ?? 0), 0);

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
              <Sel label="Framekleur" value={s.kleurFrame} onChange={(kleurFrame) => u({ kleurFrame })}
                options={[{ v: '', t: '(kies)' }, ...t.kleuren.map((k) => ({ v: k, t: k })), { v: 'andere', t: 'Andere kleur (op aanvraag)' }]} />
              {s.kleurFrame === 'andere' && (
                <Txt label="Welke kleur" value={s.kleurFrameCustom} onChange={(kleurFrameCustom) => u({ kleurFrameCustom })} />
              )}
              {t.lamelKleurApart && (
                <Sel label="Lamelkleur" value={s.kleurLamel} onChange={(kleurLamel) => u({ kleurLamel })}
                  options={[{ v: '', t: 'zoals het frame' }, ...t.kleuren.map((k) => ({ v: k, t: k }))]}
                  hint="Combinaties frame/lamel zijn mogelijk (lijst 2026)" />
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
              <>
                <div className="grid2">
                  <Num label="Hoogte onder de goot (mm) — dagmaat hoogte glaswand" value={s.onderkantGoot} min={0}
                    onChange={(onderkantGoot) => u({ onderkantGoot })}
                    hint={`Gemeten van de vloer tot de onderkant van de goot; maximaal ${MAX_ONDERKANT_GOOT}mm doorloophoogte (Deponti). `
                      + 'Fiano: de tool kiest de standaardhoogte die erin past (compensatietabel Deponti).'} />
                </div>
                {hoogteFout.map((m) => <div key={m} className="alert warn" style={{ marginTop: 6 }}>{m}</div>)}
                {koppelMelding && (
                  <div className="alert warn" style={{ marginTop: 6 }}>
                    Gekoppelde systemen: onder elke koppeling staat een staander, en daar (binnen onder het dak) komt geen
                    buitenwand. Zet per zijde het aantal wanden dat echt nodig is.{' '}
                    <button className="btn ghost sm" type="button" onClick={bevestigAantallen}>De aantallen kloppen</button>
                  </div>
                )}
                {zijden.map((z) => {
                  const w = s.wanden[z.id] ?? GEEN_WAND;
                  const v = voorstellen[z.id];
                  const keuze = w.merk || v?.goedkoopste || '';
                  return (
                    <div key={z.id} style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                      <Chk label={`Glaswand aan de ${z.label.toLowerCase()} (langs de ${z.langs})`} value={w.aan}
                        onChange={(aan) => setWand(z.id, { aan })} />
                      {w.aan && (
                        <>
                          <div className="grid2" style={{ marginTop: 6 }}>
                            <Num label="Dagmaat breedte (mm)" value={w.dagmaat > 0 ? w.dagmaat : (z.dagmaat ?? 0)} min={0}
                              onChange={(dagmaat) => setWand(z.id, { dagmaat })}
                              hint={z.dagmaat != null ? `Tussen de staanders: ${z.uitleg}` : z.uitleg} />
                            {toonAantal && (
                              <Num label="Aantal wanden aan deze zijde" value={aantalVan(z.id)} min={1}
                                onChange={(a) => setWand(z.id, { aantal: Math.max(1, Math.floor(a || 1)) })}
                                hint={`Standaard één per overkapping (${s.aantal})`} />
                            )}
                          </div>
                          {v && (
                            <div style={{ overflowX: 'auto', marginTop: 6 }}>
                              <table className="det">
                                <thead>
                                  <tr>
                                    <th>Merk</th><th>Beste indeling</th><th className="r">Overlap</th>
                                    <th className="r">Inkoop</th><th className="r">Klantprijs</th><th />
                                  </tr>
                                </thead>
                                <tbody>
                                  {[v.deponti, v.es].map((o) => (
                                    <tr key={o.merk} style={o.beste && o.r.ok ? undefined : { color: 'var(--tx3)' }}>
                                      <td>{o.merk === v.goedkoopste ? '★ ' : ''}{o.merk === 'Deponti' ? 'Deponti Fiano' : 'ES75'}</td>
                                      <td title={o.r.warnings.join(' · ') || undefined}>
                                        {o.beste ? `${o.beste.titel} (${o.beste.panelen.join(' · ')})` : o.reden || 'niet mogelijk'}
                                      </td>
                                      <td className="r">{o.beste && o.beste.panelen.length > 1 ? o.beste.overlap : '—'}</td>
                                      <td className="r">{o.beste && o.r.ok ? `€${fmt(o.r.aankoop)}` : ''}</td>
                                      <td className="r">{o.beste && o.r.ok ? `€${fmt(o.r.uwVerkoop)}` : ''}</td>
                                      <td>
                                        {o.beste && o.r.ok ? (keuze === o.merk
                                          ? <span className="badge ok">gekozen</span>
                                          : <button className="btn ghost sm" type="button" onClick={() => setWand(z.id, { merk: o.merk })}>Kies</button>
                                        ) : null}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {(() => {
                                const g = gekozen(z.id);
                                const info = g ? [g.nota, ...g.r.warnings].filter(Boolean) : [];
                                return info.length > 0 && (
                                  <div className="alert warn" style={{ marginTop: 6 }}>
                                    {g!.merk === 'Deponti' ? 'Deponti Fiano' : 'ES75'}: {info.join(' · ')}
                                  </div>
                                );
                              })()}
                              <div className="hint" style={{ marginTop: 4 }}>
                                ★ = laagste klantprijs (glasset met €800 plaatsing, zonder opties). Na het toevoegen verfijn je de
                                wand (meenemers, handgrepen, kleur) in de Glaswand-tab; transport zit al bij de overkapping.
                                {w.merk && <> <button className="btn ghost sm" type="button" onClick={() => setWand(z.id, { merk: '' })}>Terug naar de goedkoopste</button></>}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </>
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
