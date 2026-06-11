// Eenmalige extractie van de geverifieerde prijstabellen uit de oude index.html.
// De DATA-blob is cel-voor-cel geverifieerd tegen de Allround catalogus 2026 (mei) —
// dit script kopieert die bytes 1:1 naar JSON-modules zodat er géén transcriptiefouten
// kunnen ontstaan. Draai met: npm run extract-data
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OLD_HTML = join(here, '..', '..', 'index.html');
const OUT = join(here, '..', 'src', 'data');

const html = readFileSync(OLD_HTML, 'utf8');
const marker = 'const DATA = ';
const start = html.indexOf(marker);
if (start < 0) throw new Error('const DATA niet gevonden in oude index.html');

// Brace-match het object
let i = html.indexOf('{', start);
let depth = 0, j = i, inStr = false, esc = false;
for (; j < html.length; j++) {
  const ch = html[j];
  if (inStr) {
    if (esc) esc = false;
    else if (ch === '\\') esc = true;
    else if (ch === '"') inStr = false;
    continue;
  }
  if (ch === '"') inStr = true;
  else if (ch === '{') depth++;
  else if (ch === '}') { depth--; if (depth === 0) { j++; break; } }
}
const blob = html.substring(i, j);
const DATA = JSON.parse(blob);

mkdirSync(OUT, { recursive: true });

const files = {
  'rolluik.json': DATA.rolluik,
  'screens.json': DATA.screens,
  'knikarm.json': DATA.knikarm,
  'veranda.json': DATA.veranda,
  'opties.json': DATA.opties,
};

let totalCells = 0;
for (const [name, obj] of Object.entries(files)) {
  const json = JSON.stringify(obj, null, 1);
  writeFileSync(join(OUT, name), json);
  // verificatie: herlees en deep-equal
  const back = JSON.parse(readFileSync(join(OUT, name), 'utf8'));
  if (JSON.stringify(back) !== JSON.stringify(obj)) {
    throw new Error(`VERIFICATIE GEFAALD voor ${name}`);
  }
  const cells = JSON.stringify(obj).match(/:\d+(\.\d+)?/g)?.length ?? 0;
  totalCells += cells;
  console.log(`${name}: OK (${cells} numerieke waarden)`);
}

// Steekproef-verificatie van catalogus-geverifieerde gouden waarden
const assert = (cond, msg) => { if (!cond) throw new Error('GOUDEN WAARDE FOUT: ' + msg); };
assert(DATA.veranda.types['Vinci 250 met zip'].prices.V_250UZ_3000.V_250BZ_4500 === 4572, 'Vinci 250 zip 4500x3000 = 4572');
assert(DATA.veranda.types['Stilo 103 onderliggend'].prices.S_103U_1500.S_103B_1000 === 1596, 'Stilo 103 1000x1500 = 1596');
assert(DATA.screens.prices['Nova solar 103'].S103_H_1600.S103_B_1000 === 1099, 'Nova solar H1600 B1000 = 1099');
assert(DATA.rolluik.prices.Ecoroll_L.EL_H_2600.EL_B_1000 === 853, 'Ecoroll_L 2600x1000 = 853 (gefixte rij)');
assert(DATA.knikarm['Pisano 230'].prices.PIU_1500.PI_2250 === 1724, 'Pisano u1500 b2250 = 1724 (mei-prijs)');
assert(DATA.knikarm['Gaudi 400'].prices.G4U_1500.G4_7500 === 5881, 'Gaudi 400 u1500 b7500 = 5881 (brede sectie)');
console.log(`\nAlle gouden waarden OK. Totaal ${totalCells} numerieke waarden geëxtraheerd.`);
