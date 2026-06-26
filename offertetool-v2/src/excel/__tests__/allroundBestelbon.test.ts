import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { calcRolluik } from '../../calc/rolluik';
import { calcScreen } from '../../calc/screen';
import { calcKnikarm } from '../../calc/knikarm';
import type { OfferItem } from '../../calc/types';
import { fillProductSheet, SJABLONEN } from '../allroundBestelbon';

const M = { allroundKorting: 0.5, bkfixMarge: 0.2, eenmaligeKorting: 0 };
const wrap = (r: any): OfferItem => ({ ...r, id: 'x', kind: 'rolluik', input: {} });

async function loadSheet(bestand: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(readFileSync(`public/bestelformulieren/${bestand}`) as any);
  return wb.worksheets[0];
}

describe('Allround-bestelbon (exacte sjabloon-vulling)', () => {
  let rolluikWs: any, screenWs: any, knikarmWs: any;

  beforeAll(async () => {
    const rolluik = wrap(calcRolluik({
      type: 'Ecoroll_L', aantal: 3, breedte: 2000, hoogte: 1500, plaatsing: 'idd',
      geleider: 'HTF', kasttype: 'afgeschuind 45°', motor: 'Somfy Oximo io', mkabel: '', lamel: 'standaard',
      lamelKleur: 'kwartsgrijs_43', koppelen: '', bereik: 'Goed', onderlat: 'Design onderlat',
      borenJa: false, zonnepaneelJa: false, kleur: { select: '', custom: '' }, kleurOmkasting: 'RAL 9016',
      bediening: { bed1: '', bed2: '' }, opmerkingen: 'testnota', vrijeOpties: [], marges: M,
      bedieningskant: 'Rechts', handBediening: 'Band binnen', kabeluitvoer: 'Kapsteun',
      motorkabelUitvoering: '5m1 wit', geleiderRechts: 'HTF-67', voorborenZijde: 'Links',
    }));
    rolluikWs = await loadSheet('rolluik.xltx');
    fillProductSheet(rolluikWs, SJABLONEN.Rolluik, [rolluik], 'Klant A');

    const screen = wrap(calcScreen({
      type: 'Nova 103', aantal: 1, breedte: 1200, hoogte: 2000, plaatsing: 'odd',
      geleider: 'Nova zip +20', onderlatHoog: false, borenJa: false, omkasting: 'afgerond',
      motor: 'Maestria io', zonnepaneelJa: false, bereik: 'Goed', doek: 'standaard', koppelen: '',
      kleur: { select: 'RAL 7016 SL', custom: '' }, bediening: { bed1: '', bed2: '' }, opmerkingen: '',
      vrijeOpties: [], marges: M, standaardZip: 'Zip', kabeluitvoer: 'Kapsteun', motorzijde: 'Links',
      voorzijdeDoek: 'A', doekCode: '0202', motorkabelUitvoering: 'Standaard', voorborenZijde: 'Beide',
    }));
    screenWs = await loadSheet('screen.xltx');
    fillProductSheet(screenWs, SJABLONEN.Screen, [screen], 'Klant B');

    const knikarm = wrap(calcKnikarm({
      type: 'Pisano 230', aantal: 1, breedte: 4000, uitval: 3000, verdieping: '0', bereik: 'Goed',
      gevel: 'baksteen', muursteun: '', muurstripJa: false, doek: 'standaard', led: 'Nee',
      kleur: { select: 'RAL 9001', custom: '' }, bediening: { bed1: '', bed2: '' }, opmerkingen: '',
      vrijeOpties: [], marges: M, typeBediening: 'Orea WT', bedieningskant: 'RNB (rechts onder)',
      volantType: 'Recht', verlengdeSteunen: 'Ja 50 cm', varioVolant: true, ledUitvoering: 'IO ontvanger',
      doekCode: 'Soltis 86', doekAfwerking: 'Gestikt',
    }));
    knikarmWs = await loadSheet('knikarm.xltx');
    fillProductSheet(knikarmWs, SJABLONEN.Knikarmscherm, [knikarm], 'Klant C');
  });

  it('rolluik: maten, type, kleur pantser en specs in de juiste cellen', () => {
    expect(rolluikWs.getCell('E10').value).toBe(3);
    expect(rolluikWs.getCell('E11').value).toBe(2000);
    expect(rolluikWs.getCell('E12').value).toBe(1500);
    expect(rolluikWs.getCell('E13').value).toBe('Ecoroll L 42mm lamel');
    expect(rolluikWs.getCell('E15').value).toBe('Afgeschuind');
    expect(rolluikWs.getCell('E18').value).toBe('HTF');
    expect(rolluikWs.getCell('E19').value).toBe('HTF-67');
    expect(rolluikWs.getCell('E20').value).toBe('43 Kwartsgrijs');
    expect(rolluikWs.getCell('E22').value).toBe('Band binnen');
    expect(rolluikWs.getCell('E24').value).toBe('Kapsteun');
    expect(rolluikWs.getCell('E25').value).toBe('Rechts');
    expect(rolluikWs.getCell('E26').value).toBe('ja');     // voorboren links
    expect(rolluikWs.getCell('E27').value).toBe('Nee');    // voorboren rechts
    expect(rolluikWs.getCell('E6').value).toBe('Klant A');
  });

  it('screen: standaard/zip, omkasting, montage, kabeluitvoer in juiste cellen', () => {
    expect(screenWs.getCell('E10').value).toBe(1);
    expect(screenWs.getCell('E13').value).toBe('Zip');
    expect(screenWs.getCell('E14').value).toBe('Afgerond');
    expect(screenWs.getCell('E19').value).toBe('Kapsteun');
    expect(screenWs.getCell('E20').value).toBe('Links');
    expect(screenWs.getCell('E22').value).toBe('A');
    expect(screenWs.getCell('E25').value).toBe('Op de dag');
  });

  it('knikarm: type bediening, volant, extra-opties (LED IO / vario) in juiste cellen', () => {
    expect(knikarmWs.getCell('E11').value).toBe(4000);
    expect(knikarmWs.getCell('E12').value).toBe(3000);
    expect(knikarmWs.getCell('E15').value).toBe('Orea WT');
    expect(knikarmWs.getCell('E17').value).toBe('RNB (rechts onder)');
    expect(knikarmWs.getCell('E19').value).toBe('Recht');
    expect(knikarmWs.getCell('E21').value).toBe('Ja 50 cm');
    expect(knikarmWs.getCell('E35').value).toBe('X');   // LED IO ontvanger
    expect(knikarmWs.getCell('E36').value).toBe('X');   // Vario volant
  });

  it('opmaak blijft behouden (merges + logo-media)', () => {
    expect(Object.keys(rolluikWs._merges || {}).length).toBeGreaterThan(20);
    expect(rolluikWs.workbook.media.length).toBeGreaterThan(0);
  });
});
