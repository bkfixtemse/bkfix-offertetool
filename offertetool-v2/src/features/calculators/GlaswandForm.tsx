import { useMemo, useState } from 'react';
import {
  calcGlaswand, depontiStandaardBreedtes, glaswandKleuren, glaswandOpties, kiesRaillengte,
  DEPONTI_BREEDTES, DEPONTI_GLASSOORTEN, DEPONTI_HOOGTES, ES_BREEDTES,
  GLASWAND_MERKEN, type GlaswandExtra, type GlaswandMerk, type GlaswandOptieKeuze,
  type GlaswandPaneel,
} from '../../calc/glaswand';
import {
  bepaalIndeling, glaswandOptiesVoorAantal, glaswandOverzicht, indelingNaarInvoer, migreerIndeling, INDELING_VERSIE,
  type AdviesInstelling, type AdviesOptie, type GlaswandOverzicht, type IndelingKeuze,
} from '../../calc/glaswandAdvies';
import type { GlaswandInput } from '../../calc/glaswand';
import {
  berekenGlaswandStaat, glaswandBasisInvoer, wijzigMaatStaat, wisselMerkStaat, GLASWAND_DEFAULT, type GlaswandStaat,
} from '../../calc/glaswandStaat';
import { GLASWAND_MERK, GLASWAND_VOORBEREIDING_TARIEF } from '../../data/constants';
import { Chk, fmt, Num, Sec, Sel, Txt } from '../../components/fields';
import { ResultCard } from '../../components/ResultCard';
import { useOffer } from '../../store/offerStore';

// De toestand en hoe ze naar de rekenkern gaat, staan in calc/glaswandStaat.ts: de wanden onder een
// overkapping rekenen daarmee exact zoals deze tab.
const DEFAULT = GLASWAND_DEFAULT;
type State = GlaswandStaat;

export function GlaswandForm() {
  const [s, set] = useState<State>(() => {
    const et = useOffer.getState().editTarget;
    // Een item van voor de keuze bestond, opent als 'vast': het rekent dan exact zoals toen.
    return et?.kind === 'glaswand' ? { ...DEFAULT, ...migreerIndeling(et.input as Partial<State>) } : DEFAULT;
  });
  const [toonAlle, setToonAlle] = useState(false);
  const u = (p: Partial<State>) => set({ ...s, ...p });
  const isES = s.merk === 'ES Systems';

  /**
   * Van merk wisselen zet de bijhorende korting/marge én wist merk-specifieke keuzes. Een wand die
   * bij een overkapping hoort, krijgt geen eigen transport: dat staat al op de overkapping.
   */
  const wisselMerk = (merk: GlaswandMerk) => set(wisselMerkStaat(s, merk));

  const optieLijst = glaswandOpties(s.merk);
  const setOptie = (i: number, p: Partial<GlaswandOptieKeuze>) =>
    u({ opties: s.opties.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  const setExtra = (i: number, p: Partial<GlaswandExtra>) =>
    u({ extraLijnen: s.extraLijnen.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  const setPaneel = (i: number, p: Partial<GlaswandPaneel>) =>
    u({ paneelVerdeling: s.paneelVerdeling.map((o, j) => (j === i ? { ...o, ...p } : o)) });

  // De glasmaten geef je enkel zelf in als je daar uitdrukkelijk voor kiest — voor beide merken.
  const eigen = s.keuze === 'eigen';
  const mixPanelen = s.paneelVerdeling.reduce((t, r) => t + (Math.floor(r.aantal) || 0), 0);
  const mixRest = s.paneelVerdeling.some((r) => !(r.breedte > 0));

  // Alles behalve de indeling. Zowel de berekening als de voorstellen vertrekken hiervan.
  const basisInvoer: GlaswandInput = glaswandBasisInvoer(s);

  // Alle mogelijkheden voor het gekozen aantal panelen. Hangt enkel af van het merk, de opening, het
  // aantal, de overlap, het glas, steel-look en sluiting (Deponti: breedte en overlap) en de marges.
  const deps = [s.merk, s.dagmaatBreedte, s.dagmaatHoogte, s.kokerLinks, s.kokerMidden, s.kokerRechts,
    s.overlap, s.glas, s.glassoort, s.steellook, s.sluiting, s.sporen, s.raillengte, s.kleurSelect, s.kleurCustom,
    s.kortingPct, s.margePct, s.plaatsingVast];
  const perAantal = useMemo(
    () => glaswandOptiesVoorAantal(basisInvoer, s.aantalPanelen),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, s.aantalPanelen],
  );
  const overzicht = useMemo(
    () => glaswandOverzicht(basisInvoer),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  // De indeling waarmee gerekend wordt, volgens de keuze (standaard: automatisch de beste).
  const { instelling, r } = berekenGlaswandStaat(s, perAantal);
  /** Het aantal panelen waarmee de berekening echt rekent. */
  const panelen = Number(r.detail.aantalPanelen) || 0;
  // Vergelijk gesorteerd: dezelfde panelen in een andere rijvolgorde zijn dezelfde indeling.
  const huidig = String(r.detail.panelenLijst || '').split(',').filter(Boolean).map(Number).sort((a, b) => a - b);
  const inGebruik = (o: AdviesOptie) =>
    huidig.join(',') === [...o.panelen].sort((a, b) => a - b).join(',')
    && (huidig.length <= 1 || Number(r.detail.overlap) === o.overlap);
  /** De eerste acht, plus de rij die in gebruik is als die verder in de lijst staat. */
  const zichtbaar = (() => {
    const alle = perAantal?.opties ?? [];
    if (toonAlle || alle.length <= 8) return alle;
    const eerste = alle.slice(0, 8);
    const gebruikt = alle.find(inGebruik);
    return gebruikt && !eerste.includes(gebruikt) ? [...eerste, gebruikt] : eerste;
  })();
  /** Een ander aantal panelen kiezen: de tool neemt daarvoor automatisch de beste. */
  const kiesAantal = (n: number) => { setToonAlle(false); u({ aantalPanelen: n, keuze: 'auto' }); };
  /**
   * Een voorstel toepassen. Maatwerk- en mixvoorstellen hebben geen standaardbreedte (0); die mag
   * de gekozen standaardbreedte niet overschrijven, anders toont "Standaardbreedte" daarna 900
   * terwijl er maatwerk gerekend wordt.
   */
  const pasToe = (o: AdviesOptie) =>
    u({ ...o.instelling, paneelBreedte: o.instelling.paneelBreedte || s.paneelBreedte, keuze: 'vast' });

  /**
   * Een maat wijzigen die bepaalt welke mogelijkheden er zijn. Een zelf gekozen indeling blijft staan
   * zolang ze met de nieuwe maten nog een mogelijkheid is (bij ES veranderen hoogte en glastype de
   * mogelijkheden niet); anders kiest de tool opnieuw de beste.
   */
  const wijzigMaat = (p: Partial<State>) => u(wijzigMaatStaat(s, p));

  /** Naar "eigen indeling": vertrek van de indeling die nu gebruikt wordt. */
  const naarEigen = () => u({
    keuze: 'eigen',
    paneelModus: 'mix',
    paneelVerdeling: instelling.paneelModus === 'mix' ? instelling.paneelVerdeling
      : instelling.paneelModus === 'standaard'
        ? [{ breedte: instelling.paneelBreedte, aantal: instelling.aantalPanelen }]
        : [{ breedte: 0, aantal: instelling.aantalPanelen }],
  });
  const naarVoorstellen = () =>
    u({ keuze: 'auto', aantalPanelen: Math.max(1, mixPanelen || s.aantalPanelen) });

  const voorbereidingKost = s.voorbereidingPersonen * s.voorbereidingUren * s.voorbereidingTarief;
  // Het werkelijke aantal panelen van de berekening (bij een eigen indeling volgt dat uit de rijen).
  const sporen = s.sporen || panelen;
  const autoRail = !isES ? kiesRaillengte(sporen, Number(r.calculatiemaat?.b ?? 0)) : null;
  // Bij Deponti hangt "standaard" af van de hoogte en het glas (640 bestaat niet in 2350, gekleurd
  // glas is altijd maatwerk) — dezelfde regel als de rekenkern.
  const breedtes = isES ? ES_BREEDTES : depontiStandaardBreedtes(s.dagmaatHoogte, s.glassoort);

  return (
    <>
      <div className="panel">
        <h2>Glazen schuifwand configureren</h2>
        <div className="alert info">
          {isES ? (
            <>ES75: prijs per wand volgens het <b>aantal rails</b> (1–6) — de afmetingen bepalen de prijs niet.
              Standaard glasbreedtes {ES_BREEDTES.join(' / ')}mm, andere breedtes zijn maatwerkglas ·
              één prijs tot dagmaat 2700mm, daarboven op aanvraag bij ES · glashoogte = dagmaat − 100mm ·
              inkoop = lijst − 40%.</>
          ) : (
            <>Deponti Fiano (lijst 2026): <b>per paneel</b> + rail + opties; de dealerlijst is de inkoopprijs.
              Standaardpanelen {DEPONTI_BREEDTES.join(' / ')}mm op inbouwhoogte {DEPONTI_HOOGTES.join(' / ')}mm ·
              ander glas is maatwerk: glasbreedte × inbouwhoogte × m²-prijs · glas = inbouwhoogte − 85mm ·
              niet elke rail bestaat in elke lengte.</>
          )}
        </div>

        {s.transportBijOverkapping && (
          <div className="hint">Deze wand hoort bij een overkapping: het transport staat op de overkapping.</div>
        )}
        <Sec title="Merk & opening">
          <div className="grid2">
            <Sel label="Merk *" value={s.merk} onChange={(m) => wisselMerk(m as GlaswandMerk)} options={GLASWAND_MERKEN} />
            <Num label="Aantal identieke wanden" value={s.aantal} min={1} onChange={(a) => u({ aantal: a || 1 })} />
            <Num label="Gemeten dagmaat breedte (mm) *" value={s.dagmaatBreedte} onChange={(v) => wijzigMaat({ dagmaatBreedte: v })} />
            <Num label={isES ? 'Inbouwhoogte / dagmaat (mm) *' : 'Inbouwhoogte (mm) *'}
              value={s.dagmaatHoogte} onChange={(v) => wijzigMaat({ dagmaatHoogte: v, gemetenHoogte: 0 })}
              hint={s.gemetenHoogte > 0
                ? `Gemeten onder de goot: ${s.gemetenHoogte}mm${!isES && s.dagmaatHoogte !== s.gemetenHoogte
                  ? ` → Fiano-standaardhoogte ${s.dagmaatHoogte}mm (compensatietabel Deponti)` : ''}`
                : isES ? 'Vloer tot onderkant goot'
                : `Onderzijde onderprofiel tot bovenzijde bovenprofiel — standaard: ${DEPONTI_HOOGTES.join(' / ')}. `
                  + 'Gemeten dagmaat? Standaardhoogte H past van H − 20 tot H + 25mm (handleiding Fiano).'} />
            <Num label="Koker links (mm)" value={s.kokerLinks} onChange={(v) => wijzigMaat({ kokerLinks: v })} />
            <Num label="Koker midden (mm)" value={s.kokerMidden} onChange={(v) => wijzigMaat({ kokerMidden: v })} />
            <Num label="Koker rechts (mm)" value={s.kokerRechts} onChange={(v) => wijzigMaat({ kokerRechts: v })} />
          </div>
        </Sec>

        <Sec title="Panelen">
          <div className="grid2">
            {eigen ? (
              // Geen invoerveld: bij een eigen indeling volgt het aantal uit de rijen hieronder.
              <div className="fld">
                <label>{isES ? 'Aantal panelen = aantal rails' : 'Aantal panelen'}</label>
                <div style={{ padding: '8px 0', fontWeight: 700 }}>
                  {mixPanelen} {mixPanelen === 1 ? 'paneel' : 'panelen'}
                </div>
                <div className="hint">Volgt uit de glasmaten hieronder</div>
              </div>
            ) : (
              <Num label={isES ? 'Aantal panelen = aantal rails *' : 'Aantal panelen *'}
                value={s.aantalPanelen} min={1} onChange={(v) => wijzigMaat({ aantalPanelen: Math.max(0, Math.floor(v)) })} />
            )}
            {(!eigen || mixRest) && (
              <Num label="Gewenste overlap (mm)" value={!isES && s.steellook ? 30 : s.overlap} min={0}
                onChange={(v) => wijzigMaat({ overlap: v })}
                hint={!isES && s.steellook ? 'Steel-look werkt met 30mm overlap' : 'Gebruikelijk 30 tot 70mm'} />
            )}
            {isES && (
              <Sel label="Glastype" value={s.glas} onChange={(g) => wijzigMaat({ glas: g as any })}
                options={[{ v: 'helder', t: 'Helder' }, { v: 'getint', t: 'Getint' }]} />
            )}
            {!isES && (
              <>
                <Sel label="Glas" value={s.glassoort} onChange={(glassoort) => wijzigMaat({ glassoort })}
                  options={DEPONTI_GLASSOORTEN.map((g) => ({
                    v: g,
                    t: g === 'standaard' ? 'Helder (standaardpanelen of maatwerk)' : `${g[0].toUpperCase()}${g.slice(1)} (altijd maatwerk)`,
                  }))} />
                <Num label="Aantal sporen (0 = zoals panelen)" value={s.sporen} min={0}
                  onChange={(v) => u({ sporen: v })} />
                <Num label="Raillengte (mm, 0 = automatisch)" value={s.raillengte} min={0}
                  onChange={(v) => u({ raillengte: v })}
                  hint={/brut/i.test(s.kleurSelect === 'andere' ? s.kleurCustom : s.kleurSelect)
                    ? 'Brut: altijd de brute rail van 7100mm'
                    : autoRail ? `Automatisch: ${autoRail}mm` : 'Geen passende rail gevonden'} />
                <Sel label="Sluiting" value={s.sluiting} onChange={(v) => wijzigMaat({ sluiting: v as any })}
                  options={[
                    { v: 'geen', t: 'Geen' },
                    { v: 'zij', t: 'Zijsluiting (−85mm)' },
                    { v: 'midden', t: 'Middensluiting (−85mm)' },
                  ]} />
              </>
            )}
          </div>

          {!eigen && (
            perAantal && overzicht && s.dagmaatBreedte > 0 && s.dagmaatHoogte > 0 ? (
              <div style={{ marginTop: 12 }}>
                {overzicht.beste ? (
                  <BesteOptie o={overzicht.beste} waarom={overzicht.waarom} actief={inGebruik(overzicht.beste)}
                    gebruik={() => kiesAantal(overzicht.beste!.panelen.length)} />
                ) : (
                  <div className="alert warn">{overzicht.waarom}</div>
                )}

                <h4 style={{ margin: '14px 0 6px' }}>Beste per aantal panelen</h4>
                <PerAantalTabel overzicht={overzicht} gekozen={s.aantalPanelen} kies={kiesAantal} />

                {s.aantalPanelen < 1 ? (
                  <div className="hint" style={{ marginTop: 10 }}>Vul het aantal panelen in.</div>
                ) : (<>
                <h4 style={{ margin: '14px 0 6px' }}>
                  Alle mogelijkheden met {perAantal.aantal} {perAantal.aantal === 1 ? 'paneel' : 'panelen'} op {perAantal.wandBreedte} mm
                </h4>
                {perAantal.opties.length === 0 ? (
                  <div className="alert warn">{perAantal.reden}</div>
                ) : (
                  <>
                    <div className="hint" style={{ marginBottom: 6 }}>
                      {s.keuze === 'auto' ? (
                        <>★ De beste mogelijkheid is automatisch gekozen. Klik een andere aan om die te gebruiken.</>
                      ) : (
                        <>Zelf gekozen.{' '}
                          <button className="btn ghost sm" type="button" onClick={() => u({ keuze: 'auto' })}>
                            Terug naar de beste
                          </button>
                        </>
                      )}
                    </div>
                    <AdviesTabel opties={zichtbaar} inGebruik={inGebruik} gebruik={pasToe} beste={perAantal.beste} />
                    {perAantal.opties.length > 8 && (
                      <button className="btn ghost sm" type="button" style={{ marginTop: 6 }}
                        onClick={() => setToonAlle(!toonAlle)}>
                        {toonAlle ? 'Minder tonen' : `Toon alle ${perAantal.opties.length} mogelijkheden`}
                      </button>
                    )}
                  </>
                )}
                </>)}
                <div style={{ marginTop: 8 }}>
                  <button className="btn ghost sm" type="button" onClick={naarEigen}>
                    Glasmaten zelf ingeven
                  </button>
                </div>
                <div className="hint" style={{ marginTop: 8 }}>
                  {overzicht.criterium} Prijzen zijn voor de glasset met plaatsing, zonder opties.
                  Vrije doorgang = de wandbreedte min het breedste paneel, met alles naar één kant geschoven.
                </div>
              </div>
            ) : (
              <div className="hint" style={{ marginTop: 10 }}>
                Vul de dagmaat breedte en hoogte in; dan verschijnen hier alle mogelijkheden.
              </div>
            )
          )}

          {eigen && (
            <div style={{ marginTop: 10 }}>
              <div className="alert info">
                Eén rij per glasmaat. Laat de breedte op 0 staan om dat paneel de rest van de opening
                te laten opvullen — zo zet je één maatwerkglas in een verder standaard wand.
                {isES
                  ? ' Zit er een afwijkende maat tussen, dan gaat alleen dat glas aan het maatwerktarief.'
                  : ' Zit er een afwijkende maat tussen, dan gaat alleen dat glas aan de m²-prijs.'}
              </div>
              {s.paneelVerdeling.map((rij, i) => (
                <div className="grid2" key={i} style={{ marginBottom: 6 }}>
                  <Num label={`Glasmaat ${i + 1} — breedte (mm)`} value={rij.breedte} min={0}
                    onChange={(breedte) => setPaneel(i, { breedte })}
                    hint={rij.breedte > 0
                      ? (breedtes.includes(rij.breedte) ? 'standaardmaat' : 'maatwerkmaat')
                      : 'vult de rest van de opening op'} />
                  <Num label="Aantal" value={rij.aantal} min={0}
                    onChange={(aantal) => setPaneel(i, { aantal })} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                {breedtes.length > 0 && (
                  <button className="btn ghost" type="button"
                    onClick={() => u({ paneelVerdeling: [...s.paneelVerdeling, { breedte: breedtes[0], aantal: 1 }] })}>
                    + standaardmaat
                  </button>
                )}
                <button className="btn ghost" type="button"
                  onClick={() => u({ paneelVerdeling: [...s.paneelVerdeling, { breedte: 0, aantal: 1 }] })}>
                  + paneel dat de rest opvult
                </button>
                {s.paneelVerdeling.length > 0 && (
                  <button className="btn ghost" type="button"
                    onClick={() => u({ paneelVerdeling: s.paneelVerdeling.slice(0, -1) })}>− laatste</button>
                )}
                <button className="btn ghost" type="button" onClick={naarVoorstellen}>
                  Terug naar de voorstellen
                </button>
              </div>
            </div>
          )}
          {!isES && (
            <div style={{ marginTop: 10 }}>
              <Chk label="Steel-look glasroeden (−20mm breedte, 30mm overlap)" value={s.steellook}
                onChange={(steellook) => wijzigMaat({ steellook, ...(steellook ? { overlap: 30 } : {}) })} />
            </div>
          )}
        </Sec>

        <Sec title="Kleur">
          <div className="grid2">
            <Sel label="Profielkleur" value={s.kleurSelect} onChange={(kleurSelect) => u({ kleurSelect })}
              options={[{ v: '', t: '(kies)' }, ...glaswandKleuren(s.merk).map((k) => ({ v: k, t: k })),
                { v: 'andere', t: 'Andere kleur (prijs op aanvraag)' }]} />
            {s.kleurSelect === 'andere' && (
              <Txt label="Welke kleur" value={s.kleurCustom} onChange={(kleurCustom) => u({ kleurCustom })}
                placeholder="bv. RAL 7037 structuur" />
            )}
          </div>
        </Sec>

        <Sec title="Opties">
          {s.opties.map((o, i) => (
            <div className="grid2" key={i} style={{ marginBottom: 6 }}>
              <Sel label={`Optie ${i + 1}`} value={o.id} onChange={(id) => setOptie(i, { id })}
                options={[{ v: '', t: '(kies)' },
                  ...optieLijst.map((x) => ({
                    v: x.id,
                    t: `${x.label} — €${x.prijs} / ${x.eenheid}`
                      + (x.reserve ? '  ⚠ zit al in het settarief' : '')
                      + (x.perWand === false ? '  (per project)' : ''),
                  }))]} />
              <Num label="Aantal" value={o.aantal} min={0} onChange={(aantal) => setOptie(i, { aantal })} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn ghost" type="button"
              onClick={() => u({ opties: [...s.opties, { id: '', aantal: 1 }] })}>+ optie</button>
            <button className="btn ghost" type="button"
              onClick={() => u({ opties: [...s.opties, { id: 'meenemer', aantal: panelen }] })}>
              + meenemers ({panelen})
            </button>
            {s.opties.length > 0 && (
              <button className="btn ghost" type="button"
                onClick={() => u({ opties: s.opties.slice(0, -1) })}>− laatste</button>
            )}
          </div>
        </Sec>

        <Sec title="Extra (niet in de prijslijst)">
          <div className="alert info">
            Voor stukken waar de leverancier geen tarief voor publiceert — bijvoorbeeld een slot of
            lakwerk in een afwijkende RAL. Kies of het bedrag de inkoopprijs is, of een lijstprijs
            waar de korting nog af moet.
          </div>
          {s.extraLijnen.map((e, i) => (
            <div className="grid2" key={i} style={{ marginBottom: 6 }}>
              <Txt label={`Omschrijving ${i + 1}`} value={e.omschrijving}
                onChange={(omschrijving) => setExtra(i, { omschrijving })} placeholder="bv. slot, lakwerk RAL 7037st" />
              <Num label="Bedrag (€)" value={e.bedrag} onChange={(bedrag) => setExtra(i, { bedrag })} />
              <Sel label="Bedrag is" value={e.netto ? 'netto' : 'lijst'}
                onChange={(v) => setExtra(i, { netto: v === 'netto' })}
                options={[
                  { v: 'netto', t: 'Inkoopprijs (geen korting)' },
                  { v: 'lijst', t: `Lijstprijs (−${Math.round(s.kortingPct)}% korting)` },
                ]} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button className="btn ghost" type="button"
              onClick={() => u({ extraLijnen: [...s.extraLijnen, { omschrijving: '', bedrag: 0, netto: true }] })}>
              + extra lijn
            </button>
            {s.extraLijnen.length > 0 && (
              <button className="btn ghost" type="button"
                onClick={() => u({ extraLijnen: s.extraLijnen.slice(0, -1) })}>− laatste</button>
            )}
          </div>
        </Sec>

        <Sec title="Plaatsing & voorbereidende werken">
          <div className="alert info">
            Plaatsing is een vast bedrag per wand, ongeacht het aantal sporen. Het variabele werk vul je in
            als voorbereidende werken — dat geldt voor deze regel in totaal, niet per wand.
            {voorbereidingKost > 0 && (
              <> Nu: {s.voorbereidingPersonen} × {s.voorbereidingUren}u × €{s.voorbereidingTarief}
                {' '}= <b>€{voorbereidingKost.toFixed(2)}</b>.</>
            )}
          </div>
          <div className="grid2">
            <Num label="Plaatsing per wand (€)" value={s.plaatsingVast} min={0}
              onChange={(plaatsingVast) => u({ plaatsingVast })} hint={`${s.aantal} × €${s.plaatsingVast}`} />
            <Num label="Voorbereidende werken — aantal man" value={s.voorbereidingPersonen} min={0}
              onChange={(voorbereidingPersonen) => u({ voorbereidingPersonen })} />
            <Num label="Voorbereidende werken — aantal uur" value={s.voorbereidingUren} min={0}
              onChange={(voorbereidingUren) => u({ voorbereidingUren })} />
            <Num label="Uurtarief (€)" value={s.voorbereidingTarief} min={0}
              onChange={(voorbereidingTarief) => u({ voorbereidingTarief })} />
          </div>
        </Sec>

        <Sec title="Marge & korting">
          <div className="alert info">
            Marges volgen het merk: {s.merk} = {GLASWAND_MERK[s.merk].korting * 100}% inkoopkorting en{' '}
            {GLASWAND_MERK[s.merk].marge * 100}% marge. Beide blijven aanpasbaar.
          </div>
          <div className="grid2">
            <Num label="Inkoopkorting (%)" value={s.kortingPct} min={0} onChange={(kortingPct) => u({ kortingPct })} />
            <Num label="BKfix marge (%)" value={s.margePct} min={0} onChange={(margePct) => u({ margePct })} />
            <Num label="Eenmalige korting (€)" value={s.korting} onChange={(korting) => u({ korting })} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Txt label="Opmerkingen" value={s.opmerkingen} onChange={(opmerkingen) => u({ opmerkingen })} />
          </div>
        </Sec>
      </div>
      {s.dagmaatBreedte > 0 && s.dagmaatHoogte > 0 && <ResultCard r={r} kind="glaswand" input={s} />}
    </>
  );
}

/** Controle zoals je ze op papier zou maken: som van het glas min de overlappen = wandbreedte. */
function controleTekst(o: AdviesOptie) {
  if (o.panelen.length === 1) {
    const speling = o.wandBreedte - o.panelen[0];
    return `1 paneel van ${o.panelen[0]}mm in ${o.wandBreedte}mm (${speling}mm speling) ${o.controleKlopt ? '✓' : '⚠'}`;
  }
  const som = o.panelen.reduce((t, b) => t + b, 0);
  const naden = Math.max(0, o.panelen.length - 1);
  const exact = o.controle === o.wandBreedte;
  const teken = !o.controleKlopt ? '⚠' : exact ? '✓' : '✓ (afronding)';
  return `${som} − ${naden}×${o.overlap} = ${o.controle}mm ${teken}`;
}

function BesteOptie({ o, waarom, actief, gebruik }: {
  o: AdviesOptie; waarom: string; actief: boolean; gebruik: () => void;
}) {
  return (
    <div style={{
      marginTop: 10, padding: '12px 14px', borderRadius: 10,
      border: '2px solid var(--green)', background: 'var(--bg2, #f6fef9)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase' }}>
        ★ Beste optie
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, margin: '4px 0' }}>{o.titel}</div>
      <div className="pline"><span>Paneelbreedtes</span><b>{o.panelen.join(' · ')} mm</b></div>
      <div className="pline"><span>Overlap</span><b>{o.panelen.length > 1 ? `${o.overlap} mm` : '—'}</b></div>
      <div className="pline"><span>Controle</span><b>{controleTekst(o)}</b></div>
      <div className="pline"><span>Vrije doorgang ±</span><b>{o.doorgang} mm</b></div>
      <div className="pline"><span>Inkoop glasset</span><b>€{fmt(o.aankoop)}</b></div>
      <div className="pline"><span>Klantprijs (zonder opties)</span><b>€{fmt(o.verkoop)}</b></div>
      <div style={{ fontSize: 13, margin: '6px 0' }}>{waarom}</div>
      {o.meldingen.length > 0 && (
        <div className="hint">{o.meldingen.join(' · ')}</div>
      )}
      {actief ? (
        <span className="badge ok" style={{ display: 'inline-block', marginTop: 6 }}>✓ in gebruik</span>
      ) : (
        <button className="btn sm" type="button" style={{ marginTop: 6 }} onClick={gebruik}>Gebruik deze</button>
      )}
    </div>
  );
}

function AdviesTabel({ opties, inGebruik, gebruik, beste }: {
  opties: AdviesOptie[]; inGebruik: (o: AdviesOptie) => boolean; gebruik: (o: AdviesOptie) => void;
  beste?: AdviesOptie | null;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="det">
        <thead>
          <tr>
            <th>Indeling</th>
            <th>Paneelbreedtes (mm)</th>
            <th className="r">Overlap</th>
            <th>Controle</th>
            <th className="r">Doorgang</th>
            <th className="r">Inkoop</th>
            <th className="r">Klantprijs</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {opties.map((o, i) => (
            <tr key={i} style={o.mogelijk ? undefined : { color: 'var(--tx3)' }}>
              <td title={o.breed ? 'Breder dan de breedste standaardmaat — bevestigen bij de leverancier' : undefined}>
                {o === beste ? '★ ' : ''}{o.titel}{o.breed ? ' ⚠' : ''}
              </td>
              <td>{o.panelen.join(' · ')}</td>
              <td className="r">{o.panelen.length > 1 ? o.overlap : '—'}</td>
              <td>{o.mogelijk ? controleTekst(o) : ''}</td>
              <td className="r">{o.mogelijk ? o.doorgang : ''}</td>
              <td className="r">{o.mogelijk ? `€${fmt(o.aankoop)}` : ''}</td>
              <td className="r">{o.mogelijk ? `€${fmt(o.verkoop)}` : ''}</td>
              <td>
                {!o.mogelijk ? (
                  <span className="badge err" title={o.reden}>niet mogelijk</span>
                ) : inGebruik(o) ? (
                  <span className="badge ok">✓ in gebruik</span>
                ) : (
                  <button className="btn ghost sm" type="button" onClick={() => gebruik(o)}
                    title={o.meldingen.join(' · ') || undefined}>
                    Gebruik{o.krap ? ' ⚠' : ''}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {opties.some((o) => !o.mogelijk) && (
        <div className="hint" style={{ marginTop: 4 }}>
          {opties.filter((o) => !o.mogelijk).map((o) => `${o.panelen.length} panelen: ${o.reden}`).join(' · ')}
        </div>
      )}
    </div>
  );
}

function PerAantalTabel({ overzicht, gekozen, kies }: {
  overzicht: GlaswandOverzicht; gekozen: number; kies: (n: number) => void;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="det">
        <thead>
          <tr>
            <th>Panelen</th>
            <th>Beste indeling</th>
            <th className="r">Overlap</th>
            <th className="r">Inkoop</th>
            <th className="r">Klantprijs</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {overzicht.perAantal.map((p) => {
            const o = p.beste;
            return (
              <tr key={p.aantal} style={o ? undefined : { color: 'var(--tx3)' }}>
                <td>{o === overzicht.beste ? '★ ' : ''}{p.aantal}</td>
                <td title={o?.meldingen.join(' · ') || p.reden || undefined}>
                  {o ? <>{o.titel}{o.breed || o.krap ? ' ⚠' : ''}</> : 'niet mogelijk'}
                </td>
                <td className="r">{o && o.panelen.length > 1 ? o.overlap : '—'}</td>
                <td className="r">{o ? `€${fmt(o.aankoop)}` : ''}</td>
                <td className="r">{o ? `€${fmt(o.verkoop)}` : ''}</td>
                <td>
                  {p.aantal === gekozen ? (
                    <span className="badge ok">getoond</span>
                  ) : o ? (
                    <button className="btn ghost sm" type="button" onClick={() => kies(p.aantal)}>Toon</button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
