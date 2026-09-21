import { useMemo, useState } from 'react';
import {
  calcGlaswand, glaswandKleuren, glaswandOpties, kiesRaillengte,
  DEPONTI_BREEDTES, DEPONTI_GLASSOORTEN, DEPONTI_HOOGTES, ES_BREEDTES,
  GLASWAND_MERKEN, type GlaswandExtra, type GlaswandMerk, type GlaswandOptieKeuze,
  type GlaswandPaneel,
} from '../../calc/glaswand';
import {
  bepaalIndeling, glaswandOptiesVoorAantal, glaswandOverzicht, indelingNaarInvoer, migreerIndeling,
  type AdviesInstelling, type AdviesOptie, type GlaswandOverzicht, type IndelingKeuze,
} from '../../calc/glaswandAdvies';
import type { GlaswandInput } from '../../calc/glaswand';
import { GLASWAND_MERK, GLASWAND_VOORBEREIDING_TARIEF } from '../../data/constants';
import { Chk, fmt, Num, Sec, Sel, Txt } from '../../components/fields';
import { ResultCard } from '../../components/ResultCard';
import { useOffer } from '../../store/offerStore';

const DEFAULT = {
  merk: 'ES Systems' as GlaswandMerk,
  aantal: 1,
  dagmaatBreedte: 0, dagmaatHoogte: 0,
  kokerLinks: 0, kokerMidden: 0, kokerRechts: 0,
  aantalPanelen: 3,
  paneelModus: 'maatwerk' as 'standaard' | 'maatwerk' | 'mix',
  paneelBreedte: 900,
  paneelVerdeling: [] as GlaswandPaneel[],
  /** auto = altijd de beste mogelijkheid · vast = zelf aangeklikt · eigen = glasmaten zelf ingegeven */
  keuze: 'auto' as IndelingKeuze,
  overlap: 30,
  steellook: false,
  glas: 'helder' as 'helder' | 'getint',
  sporen: 0,
  raillengte: 0,
  glassoort: 'standaard',
  sluiting: 'geen' as 'geen' | 'zij' | 'midden',
  kleurSelect: '', kleurCustom: '',
  opties: [] as GlaswandOptieKeuze[],
  extraLijnen: [] as GlaswandExtra[],
  kortingPct: 40, margePct: 20,
  plaatsingVast: 800,
  voorbereidingPersonen: 0, voorbereidingUren: 0, voorbereidingTarief: GLASWAND_VOORBEREIDING_TARIEF,
  korting: 0, opmerkingen: '',
};
type State = typeof DEFAULT;

export function GlaswandForm() {
  const [s, set] = useState<State>(() => {
    const et = useOffer.getState().editTarget;
    // Een item van voor de keuze bestond, opent als 'vast': het rekent dan exact zoals toen.
    return et?.kind === 'glaswand' ? { ...DEFAULT, ...migreerIndeling(et.input as Partial<State>) } : DEFAULT;
  });
  const [toonAlle, setToonAlle] = useState(false);
  const u = (p: Partial<State>) => set({ ...s, ...p });
  const isES = s.merk === 'ES Systems';

  /** Van merk wisselen zet de bijhorende korting/marge én wist merk-specifieke keuzes. */
  const wisselMerk = (merk: GlaswandMerk) => {
    const cfg = GLASWAND_MERK[merk];
    set({
      ...s, merk,
      kortingPct: cfg.korting * 100,
      margePct: cfg.marge * 100,
      plaatsingVast: cfg.plaatsingVast,
      paneelBreedte: merk === 'Deponti' ? 980 : 900,
      opties: [], extraLijnen: [], kleurSelect: '', kleurCustom: '', sporen: 0, raillengte: 0,
      // steel-look, sluiting en maatwerkglassoort zijn Deponti-velden: bij ES zijn ze onzichtbaar,
      // dus ze mogen niet blijven staan wanneer je van merk wisselt.
      steellook: false, sluiting: 'geen', glassoort: 'standaard',
      // Ook de indeling is merkgebonden (andere standaardmaten). Een zelf gekozen of zelf ingegeven
      // indeling van het ene merk mag niet doorlopen in het andere: begin opnieuw bij de beste.
      keuze: 'auto', paneelModus: 'maatwerk', paneelVerdeling: [],
    });
  };

  const optieLijst = glaswandOpties(s.merk);
  const setOptie = (i: number, p: Partial<GlaswandOptieKeuze>) =>
    u({ opties: s.opties.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  const setExtra = (i: number, p: Partial<GlaswandExtra>) =>
    u({ extraLijnen: s.extraLijnen.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  const setPaneel = (i: number, p: Partial<GlaswandPaneel>) =>
    u({ paneelVerdeling: s.paneelVerdeling.map((o, j) => (j === i ? { ...o, ...p } : o)) });

  // Bij ES geef je de glasmaten enkel zelf in als je daar uitdrukkelijk voor kiest; bij Deponti
  // (geparkeerd) blijft de oude keuze tussen standaard, maatwerk en mix bestaan.
  const eigen = isES ? s.keuze === 'eigen' : s.paneelModus === 'mix';
  const mixPanelen = s.paneelVerdeling.reduce((t, r) => t + (Math.floor(r.aantal) || 0), 0);
  const mixRest = s.paneelVerdeling.some((r) => !(r.breedte > 0));

  // Alles behalve de indeling. Zowel de berekening als de voorstellen vertrekken hiervan.
  const basisInvoer: GlaswandInput = {
    ...s,
    ...indelingNaarInvoer({
      paneelModus: s.paneelModus, aantalPanelen: s.aantalPanelen, paneelBreedte: s.paneelBreedte,
      paneelVerdeling: s.paneelVerdeling, overlap: s.overlap,
    }),
    kleur: { select: s.kleurSelect === 'andere' ? 'andere' : s.kleurSelect, custom: s.kleurCustom },
    bediening: { bed1: '', bed2: '' },
    vrijeOpties: [],
    marges: {
      allroundKorting: s.kortingPct / 100,
      bkfixMarge: s.margePct / 100,
      eenmaligeKorting: s.korting,
    },
  };

  // Alle mogelijkheden voor het gekozen aantal panelen. Hangt enkel af van de opening, het aantal,
  // de overlap, het glas en de marges.
  const deps = [isES, s.dagmaatBreedte, s.dagmaatHoogte, s.kokerLinks, s.kokerMidden, s.kokerRechts,
    s.overlap, s.glas, s.kortingPct, s.margePct, s.plaatsingVast];
  const perAantal = useMemo(
    () => (isES ? glaswandOptiesVoorAantal(basisInvoer, s.aantalPanelen) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, s.aantalPanelen],
  );
  const overzicht = useMemo(
    () => (isES ? glaswandOverzicht(basisInvoer) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  // De indeling waarmee gerekend wordt: bij ES volgens de keuze (standaard: automatisch de beste),
  // bij Deponti rechtstreeks uit de velden.
  const instelling: AdviesInstelling = isES
    ? bepaalIndeling(s, perAantal)
    : {
      paneelModus: s.paneelModus, aantalPanelen: s.aantalPanelen, paneelBreedte: s.paneelBreedte,
      paneelVerdeling: s.paneelVerdeling, overlap: s.overlap,
    };
  const invoer: GlaswandInput = { ...basisInvoer, ...indelingNaarInvoer(instelling) };
  const r = calcGlaswand(invoer);
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
   * Een maat wijzigen die bepaalt welke mogelijkheden er zijn. Stond er een zelf gekozen indeling,
   * dan kiest de tool opnieuw de beste — de oude keuze past niet meer bij de nieuwe maten.
   */
  const wijzigMaat = (p: Partial<State>) =>
    u({ ...p, ...(isES && s.keuze === 'vast' ? { keuze: 'auto' as IndelingKeuze } : {}) });

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
  const sporen = s.sporen || s.aantalPanelen;
  const autoRail = !isES ? kiesRaillengte(sporen, Number(r.calculatiemaat?.b ?? 0)) : null;
  const breedtes = isES ? ES_BREEDTES : DEPONTI_BREEDTES;

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
            <>Deponti Fiano: <b>stuklijst</b> = panelen × paneelprijs + rail + opties; de dealerlijst is de
              inkoopprijs. Paneelbreedtes {DEPONTI_BREEDTES.join(' / ')}mm · hoogtes {DEPONTI_HOOGTES.join(' / ')}mm ·
              let op: niet elke rail bestaat in elke lengte.</>
          )}
        </div>

        <Sec title="Merk & opening">
          <div className="grid2">
            <Sel label="Merk *" value={s.merk} onChange={(m) => wisselMerk(m as GlaswandMerk)} options={GLASWAND_MERKEN} />
            <Num label="Aantal identieke wanden" value={s.aantal} min={1} onChange={(a) => u({ aantal: a || 1 })} />
            <Num label="Gemeten dagmaat breedte (mm) *" value={s.dagmaatBreedte} onChange={(v) => wijzigMaat({ dagmaatBreedte: v })} />
            <Num label={isES ? 'Inbouwhoogte / dagmaat (mm) *' : 'Inbouwhoogte (mm) *'}
              value={s.dagmaatHoogte} onChange={(v) => u({ dagmaatHoogte: v })}
              hint={isES ? 'Vloer tot onderkant goot' : 'Onderzijde onderprofiel tot bovenzijde bovenprofiel'} />
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
            {isES ? (
              <Num label="Gewenste overlap (mm)" value={s.overlap} min={0}
                onChange={(v) => wijzigMaat({ overlap: v })} hint="Gebruikelijk 30 tot 70mm" />
            ) : (
              <>
                <Sel label="Glasmaat" value={s.paneelModus}
                  onChange={(m) => u({
                    paneelModus: m as any,
                    // De keuzelijst toont altijd een maat; de berekening moet dezelfde gebruiken.
                    ...(m === 'standaard' && !breedtes.includes(s.paneelBreedte) ? { paneelBreedte: breedtes[0] } : {}),
                  })}
                  options={[
                    { v: 'standaard', t: 'Standaardbreedte (overlap volgt)' },
                    { v: 'maatwerk', t: 'Maatwerk (overlap kiezen)' },
                    { v: 'mix', t: 'Mix & match (verschillende maten)' },
                  ]} />
                {s.paneelModus === 'standaard' && (
                  <Sel label="Paneelbreedte (mm)" value={String(s.paneelBreedte)}
                    onChange={(v) => u({ paneelBreedte: Number(v) })} options={breedtes.map(String)} />
                )}
                {(s.paneelModus === 'maatwerk' || (eigen && mixRest)) && (
                  <Num label="Gewenste overlap (mm)" value={s.overlap} min={0}
                    onChange={(v) => u({ overlap: v })} hint="Gebruikelijk 30 tot 70mm" />
                )}
              </>
            )}
            {isES && (
              <Sel label="Glastype" value={s.glas} onChange={(g) => u({ glas: g as any })}
                options={[{ v: 'helder', t: 'Helder' }, { v: 'getint', t: 'Getint' }]} />
            )}
            {!isES && s.paneelModus === 'maatwerk' && (
              <Sel label="Maatwerkglas" value={s.glassoort} onChange={(glassoort) => u({ glassoort })}
                options={DEPONTI_GLASSOORTEN} />
            )}
            {!isES && (
              <>
                <Num label="Aantal sporen (0 = zoals panelen)" value={s.sporen} min={0}
                  onChange={(v) => u({ sporen: v })} />
                <Num label="Raillengte (mm, 0 = automatisch)" value={s.raillengte} min={0}
                  onChange={(v) => u({ raillengte: v })}
                  hint={autoRail ? `Automatisch: ${autoRail}mm` : 'Geen passende rail gevonden'} />
                <Sel label="Sluiting" value={s.sluiting} onChange={(v) => u({ sluiting: v as any })}
                  options={[
                    { v: 'geen', t: 'Geen' },
                    { v: 'zij', t: 'Zijsluiting (−85mm)' },
                    { v: 'midden', t: 'Middensluiting (−85mm)' },
                  ]} />
              </>
            )}
          </div>

          {isES && !eigen && (
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
                {isES && ' Zit er een afwijkende maat tussen, dan gaat alleen dat glas aan het maatwerktarief.'}
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
                <button className="btn ghost" type="button"
                  onClick={() => u({ paneelVerdeling: [...s.paneelVerdeling, { breedte: breedtes[0], aantal: 1 }] })}>
                  + standaardmaat
                </button>
                <button className="btn ghost" type="button"
                  onClick={() => u({ paneelVerdeling: [...s.paneelVerdeling, { breedte: 0, aantal: 1 }] })}>
                  + paneel dat de rest opvult
                </button>
                {s.paneelVerdeling.length > 0 && (
                  <button className="btn ghost" type="button"
                    onClick={() => u({ paneelVerdeling: s.paneelVerdeling.slice(0, -1) })}>− laatste</button>
                )}
                {isES && (
                  <button className="btn ghost" type="button" onClick={naarVoorstellen}>
                    Terug naar de voorstellen
                  </button>
                )}
              </div>
            </div>
          )}
          {!isES && (
            <div style={{ marginTop: 10 }}>
              <Chk label="Steel-look glasroeden (−20mm breedte, 30mm overlap)" value={s.steellook}
                onChange={(steellook) => u({ steellook })} />
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
              <td title={o.breed ? 'Breder dan de breedste standaardmaat — bevestigen bij ES' : undefined}>
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
