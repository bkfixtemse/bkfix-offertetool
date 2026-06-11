/**
 * Per-product HTML-omschrijvingen voor de Teamleader-offerte.
 * 1:1 geport uit de oude tool (zelfde stramien); calculatie-/bestelmaten
 * staan er bewust NIET in (interne maten).
 */
import { KNIKARM_TYPE_INFO, VERANDA_TYPE_INFO } from '../data/constants';
import { kleurLabel } from '../calc/shared';
import type { OfferItem } from '../calc/types';

const UL = '<ul style="margin:4px 0;padding-left:18px">';
const UL2 = '<ul style="margin:2px 0;padding-left:16px">';

function rolluikDesc(it: OfferItem): string {
  const d = it.detail;
  const isSolar = !!d.isSolar;
  const frameKleur = kleurLabel(it.kleur) || String(d.kleurOmkasting || '') || 'standaard wit (RAL 9016)';
  const lamelKleur = String(d.lamelKleur || '') || frameKleur;
  const onderlat = String(d.onderlat || 'Design onderlat');
  let h = UL;
  h += `<li>Dagmaat: ${it.breedte}×${it.hoogte}mm</li>`;
  h += `<li>Plaatsing: ${String(d.plaatsing).toUpperCase()}</li>`;
  h += `<li>Kleur:${UL2}<li>Keuze uit 206 standaardkleuren</li><li>Gekozen kleur: <strong>${frameKleur}</strong></li></ul></li>`;
  h += `<li>Geleiders:${UL2}<li>${d.geleider || 'Standaard: HTF 53×22mm'}</li><li>Kleur: <strong>${frameKleur}</strong></li></ul></li>`;
  h += `<li>Lamel:${UL2}<li>${d.lamel === 'hardschuim' ? 'Hardschuim lamel' : 'L-lamel: 42×9.3mm'}</li><li>Kleur: <strong>${lamelKleur}</strong></li></ul></li>`;
  const motorLabel = String(d.motor || 'Standaard: SOMFY S&SO RS100 IO');
  h += `<li>Motor:${UL2}`;
  if (isSolar) h += `<li>${motorLabel}${UL2}<li>max afmetingen: 3500×2800mm</li><li>minimum kastmaat: 180mm</li></ul></li>`;
  else h += `<li>${motorLabel}</li>`;
  h += '</ul></li>';
  h += `<li>Kast:${UL2}<li>${d.kasttype || 'Standaard: afgeschuind 45°'}</li><li>Kleur omkasting: <strong>${frameKleur}</strong></li></ul></li>`;
  h += `<li>Onderlat:${UL2}<li>${onderlat}</li><li>Kleur: <strong>${frameKleur}</strong></li></ul></li>`;
  if (it.opmerkingen) h += `<li>Opmerkingen: ${it.opmerkingen}</li>`;
  return h + '</ul>';
}

function screenDesc(it: OfferItem): string {
  const d = it.detail;
  const isSolar = !!d.isSolar;
  const kleur = kleurLabel(it.kleur);
  const title = isSolar ? 'Solar zipscreen op maat:' : 'Zipscreen op maat:';
  let h = `<p><strong>${title}</strong></p>${UL}`;
  h += `<li>Dagmaten:${UL2}<li>Breedte: <strong>${it.breedte}mm</strong></li><li>Hoogte: <strong>${it.hoogte}mm</strong></li></ul></li>`;
  h += `<li>Plaatsing: <strong>${d.plaatsing === 'odd' ? 'op de dag (ODD)' : 'in de dag (IDD)'}</strong></li>`;
  const omk = d.omkasting === 'afgerond'
    ? 'Afgeronde geëxtrudeerde omkasting (109×103mm)'
    : isSolar ? 'Rechte omkasting 103×103mm' : 'Rechte geëxtrudeerde omkasting (103×103mm)';
  h += `<li>Omkasting: <strong>${omk}</strong></li>`;
  if (d.borenJa) h += '<li>Geleiders geboord</li>';
  if (d.zonnepaneelJa) h += '<li>Extern zonnepaneel</li>';
  h += `<li>Kleur:${UL2}<li>193 standaard RAL-kleuren en 14 structuurlakkleuren</li><li>RAL: <strong>${kleur || '—'}</strong></li></ul></li>`;
  h += `<li>Geleiders:${UL2}<li>${d.geleider || 'standaard Nova zip geleiders - 40×29mm'}</li></ul></li>`;
  h += `<li>Onderlijst:${UL2}<li>${d.onderlatHoog ? 'hoge verzwaarde onderlat' : 'voorzien van benodigde verzwaring (afhankelijk van afmetingen)'}</li></ul></li>`;
  h += `<li>Doek:${UL2}<li>${d.doek && d.doek !== 'standaard' ? d.doek : 'Sergé doek uit standaardcollectie'}</li></ul></li>`;
  h += `<li>Motor:${UL2}`;
  if (isSolar) {
    h += `<li>${d.motor || 'Somfy RS100 SOLAR IO buismotor'}</li>`;
    h += '<li>Aansturing op zonne-energie — geen stroomkabel vereist. Batterij en zonnepaneel inbegrepen.</li>';
  } else h += `<li>${d.motor || 'Somfy Maestria IO buismotor'}</li>`;
  h += '</ul></li>';
  const bed = [it.bediening.bed1, it.bediening.bed2].filter(Boolean).join(' + ');
  if (bed) h += `<li>Bediening: <strong>${bed}</strong></li>`;
  if (it.opmerkingen) h += `<li>Opmerkingen: ${it.opmerkingen}</li>`;
  return h + '</ul>';
}

function knikarmDesc(it: OfferItem): string {
  const d = it.detail;
  const kleur = kleurLabel(it.kleur);
  const info = KNIKARM_TYPE_INFO[it.type] ?? { title: `Knikarmscherm '${it.type}'`, motor: 'Somfy Sunea IO motor', doekLabel: 'Acryldoek uit de Allround acrylcollectie', muurOpties: true };
  let h = `<p><strong>${info.title}</strong></p>`;
  if (info.sub) h += `<p>${info.sub.replace(/\n/g, '<br>')}</p>`;
  h += UL;
  h += `<li>Afmetingen:${UL2}<li>Breedte: <strong>${it.breedte}mm</strong></li><li>Uitval: <strong>${it.uitval}mm</strong></li></ul></li>`;
  if (d.armen) h += `<li>Aantal armen: <strong>${d.armen}</strong></li>`;
  h += `<li>Montage:${UL2}<li>${d.gevel || 'standaard muurmontage'}</li>`;
  if (info.muurOpties && !d.muursteun) h += '<li>Meerprijs op plafondmontage</li>';
  if (d.muursteun) h += `<li>Muursteun: <strong>${d.muursteun}</strong></li>`;
  if (d.muurstripJa) h += '<li>Universele muurstrip</li>';
  if (d.verdieping && d.verdieping !== '0') h += `<li>Verdieping: <strong>${d.verdieping}</strong></li>`;
  h += '</ul></li>';
  h += `<li>Motor:${UL2}<li>${info.motor}</li></ul></li>`;
  h += `<li>Doek:${UL2}<li>${d.doek && d.doek !== 'standaard' ? d.doek : info.doekLabel}</li></ul></li>`;
  h += `<li>Kast:${UL2}`;
  if (it.type === 'Pisano 230') {
    h += '<li>Standaardkleuren: RAL 9001, RAL 9010 of RAL 7016 SL (inbegrepen)</li><li>Meerprijs op alle andere RAL-kleuren</li>';
  } else h += '<li>Keuze uit de Allround kleurencollectie</li>';
  if (kleur) h += `<li>Gekozen kleur: <strong>${kleur}</strong></li>`;
  h += '</ul></li>';
  if (d.led && d.led !== 'Nee') h += `<li>Verlichting: <strong>${d.led}</strong></li>`;
  const bed = [it.bediening.bed1, it.bediening.bed2].filter(Boolean).join(' + ');
  if (bed) h += `<li>Bediening: <strong>${bed}</strong></li>`;
  if (it.opmerkingen) h += `<li>Opmerkingen: ${it.opmerkingen}</li>`;
  return h + '</ul>';
}

function verandaDesc(it: OfferItem): string {
  const d = it.detail;
  const kleur = kleurLabel(it.kleur);
  const info = VERANDA_TYPE_INFO[it.type] ?? { title: `Pergola/Veranda '${it.type}'`, motor: 'Somfy Sunea io' };
  let h = `<p><strong>${info.title}</strong></p>`;
  if (info.sub) h += `<p>${info.sub}</p>`;
  h += UL;
  h += `<li>Afmetingen:${UL2}<li>Breedte: <strong>${it.breedte}mm</strong></li><li>Uitval: <strong>${it.uitval}mm</strong></li></ul></li>`;
  h += `<li>Motor:${UL2}<li>Somfy ${d.motor || info.motor}</li>`;
  if (d.mkabel === 'ja') h += '<li>Afwijkende motorkabel</li>';
  h += '</ul></li>';
  if (d.doek) h += `<li>Doek:${UL2}<li>${d.doek}</li></ul></li>`;
  if (d.led) h += `<li>LED / volant:${UL2}<li><strong>${d.led}</strong></li></ul></li>`;
  h += `<li>Kleur frame:${UL2}<li>Keuze uit de Allround kleurencollectie</li><li>Meerprijs op alle andere RAL-kleuren</li>`;
  if (kleur) h += `<li>Gekozen kleur: <strong>${kleur}</strong></li>`;
  h += '</ul></li>';
  if (d.gevel) h += `<li>Type gevel: <strong>${d.gevel}</strong></li>`;
  if (d.extras) h += `<li>Extra opties: ${d.extras}</li>`;
  const bed = [it.bediening.bed1, it.bediening.bed2].filter(Boolean).join(' + ');
  if (bed) h += `<li>Bediening: <strong>${bed}</strong></li>`;
  if (it.opmerkingen) h += `<li>Opmerkingen: ${it.opmerkingen}</li>`;
  return h + '</ul>';
}

/** Route naar de juiste omschrijving; nooit leeg (TL-API eis). */
export function tlDescription(it: OfferItem): string {
  let desc = '';
  switch (it.product) {
    case 'Rolluik': desc = rolluikDesc(it); break;
    case 'Screen': desc = screenDesc(it); break;
    case 'Knikarmscherm': desc = knikarmDesc(it); break;
    case 'Veranda': desc = verandaDesc(it); break;
    case 'Afstandsbediening': desc = `${it.type} (draadloze zender)`; break;
  }
  if (!desc.trim()) {
    const dm = it.hoogte ? `${it.breedte}×${it.hoogte}mm` : it.uitval ? `${it.breedte}×${it.uitval}mm` : '';
    desc = [it.product, it.type, dm].filter(Boolean).join(' - ') || it.product;
  }
  return desc;
}
