import { useState } from 'react';
import {
  calcGlaswand, glaswandKleuren, glaswandOpties, kiesRaillengte,
  DEPONTI_BREEDTES, DEPONTI_GLASSOORTEN, DEPONTI_HOOGTES, ES_BREEDTES,
  GLASWAND_MERKEN, type GlaswandExtra, type GlaswandMerk, type GlaswandOptieKeuze,
  type GlaswandPaneel,
} from '../../calc/glaswand';
import { GLASWAND_MERK, GLASWAND_VOORBEREIDING_TARIEF } from '../../data/constants';
import { Chk, Num, Sec, Sel, Txt } from '../../components/fields';
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
    return et?.kind === 'glaswand' ? { ...DEFAULT, ...(et.input as Partial<State>) } : DEFAULT;
  });
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
    });
  };

  const optieLijst = glaswandOpties(s.merk);
  const setOptie = (i: number, p: Partial<GlaswandOptieKeuze>) =>
    u({ opties: s.opties.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  const setExtra = (i: number, p: Partial<GlaswandExtra>) =>
    u({ extraLijnen: s.extraLijnen.map((o, j) => (j === i ? { ...o, ...p } : o)) });
  const setPaneel = (i: number, p: Partial<GlaswandPaneel>) =>
    u({ paneelVerdeling: s.paneelVerdeling.map((o, j) => (j === i ? { ...o, ...p } : o)) });

  const mix = s.paneelModus === 'mix';
  const mixPanelen = s.paneelVerdeling.reduce((t, r) => t + (Math.floor(r.aantal) || 0), 0);
  const mixRest = s.paneelVerdeling.some((r) => !(r.breedte > 0));

  const r = calcGlaswand({
    ...s,
    paneelModus: s.paneelModus === 'standaard' ? 'standaard' : 'maatwerk',
    paneelVerdeling: mix ? s.paneelVerdeling : undefined,
    kleur: { select: s.kleurSelect === 'andere' ? 'andere' : s.kleurSelect, custom: s.kleurCustom },
    bediening: { bed1: '', bed2: '' },
    vrijeOpties: [],
    marges: {
      allroundKorting: s.kortingPct / 100,
      bkfixMarge: s.margePct / 100,
      eenmaligeKorting: s.korting,
    },
  });

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
            <>ES75: prijs per wand volgens het <b>aantal rails</b> (1–6) — afmetingen bepalen de prijs niet.
              Standaard glasbreedtes {ES_BREEDTES.join(' / ')}mm · dagmaat helder 2000–2700mm,
              getint 2000–2500mm (per 50mm) · glashoogte = dagmaat − 100mm · inkoop = lijst − 40%.</>
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
            <Num label="Gemeten dagmaat breedte (mm) *" value={s.dagmaatBreedte} onChange={(v) => u({ dagmaatBreedte: v })} />
            <Num label={isES ? 'Inbouwhoogte / dagmaat (mm) *' : 'Inbouwhoogte (mm) *'}
              value={s.dagmaatHoogte} onChange={(v) => u({ dagmaatHoogte: v })}
              hint={isES ? 'Vloer tot onderkant goot' : 'Onderzijde onderprofiel tot bovenzijde bovenprofiel'} />
            <Num label="Koker links (mm)" value={s.kokerLinks} onChange={(v) => u({ kokerLinks: v })} />
            <Num label="Koker midden (mm)" value={s.kokerMidden} onChange={(v) => u({ kokerMidden: v })} />
            <Num label="Koker rechts (mm)" value={s.kokerRechts} onChange={(v) => u({ kokerRechts: v })} />
          </div>
        </Sec>

        <Sec title="Panelen">
          <div className="grid2">
            {mix ? (
              <Num label={isES ? 'Aantal panelen = aantal rails' : 'Aantal panelen'}
                value={mixPanelen} min={0} onChange={() => {}}
                hint="Volgt uit de glasmaten hieronder" />
            ) : (
              <Num label={isES ? 'Aantal panelen = aantal rails *' : 'Aantal panelen *'}
                value={s.aantalPanelen} min={1} onChange={(v) => u({ aantalPanelen: v || 1 })} />
            )}
            <Sel label="Glasmaat" value={s.paneelModus} onChange={(m) => u({ paneelModus: m as any })}
              options={[
                { v: 'standaard', t: 'Standaardbreedte (overlap volgt)' },
                { v: 'maatwerk', t: 'Maatwerk (overlap kiezen)' },
                { v: 'mix', t: 'Mix & match (verschillende maten)' },
              ]} />
            {s.paneelModus === 'standaard' && (
              <Sel label="Paneelbreedte (mm)" value={String(s.paneelBreedte)}
                onChange={(v) => u({ paneelBreedte: Number(v) })} options={breedtes.map(String)} />
            )}
            {(s.paneelModus === 'maatwerk' || (mix && mixRest)) && (
              <Num label="Gewenste overlap (mm)" value={s.overlap} min={0}
                onChange={(v) => u({ overlap: v })} hint="Gebruikelijk 30 tot 70mm" />
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
          {mix && (
            <div style={{ marginTop: 10 }}>
              <div className="alert info">
                Eén rij per glasmaat. Laat de breedte op 0 staan om dat paneel de rest van de opening
                te laten opvullen — zo zet je één maatwerkglas in een verder standaard wand.
                {isES && ' Zit er één afwijkende maat in, dan gaat de hele set aan het maatwerktarief.'}
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
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
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
              onClick={() => u({ opties: [...s.opties, { id: 'meenemer', aantal: s.aantalPanelen }] })}>
              + meenemers ({s.aantalPanelen})
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
