# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

BKfix Offertetool: a React SPA for calculating and quoting roller shutters (rolluiken), screens,
knikarmschermen, veranda/pergola, glazen schuifwanden and terrasoverkappingen. The whole app lives
in `offertetool-v2/` — React + TypeScript + Vite + Zustand, with Firebase for login, Firestore and
hosting. Deployed at `https://offertetool-134c5.web.app` (Firebase project `offertetool-134c5`).

The single-file PWA that preceded it (root `index.html`, GitHub Pages) was removed on 28-09-2026;
its price tables live on, verified, in `src/data/*.json`. Look in git history if you ever need it.

## Commands

All from `offertetool-v2/`:

```bash
npm install
npm run dev            # vite dev server
npm test               # vitest, ~293 tests — run this before every commit
npm run build          # tsc -b && vite build
npx firebase-tools deploy --only hosting   # deploy (hosting only, never the Firestore rules)
```

`crypto.subtle` (login hashing) needs HTTPS or localhost, so use the dev server — opening a built
file over `file://` breaks login.

## Architecture

```
offertetool-v2/src/
  calc/        pure rekenkernen — no React, no Firebase, fully unit-tested
  data/        price tables as JSON, with the source noted per block
  components/  fields.tsx (Num/Sel/Txt/Chk), ResultCard, KleurSelect
  features/
    calculators/   one form per product tab
    offer/         the running offer (items, totals, werkuren, hidden cost)
    history/       saved offers
    settings/      shared settings (margins, discounts), synced via Firestore
    shell/         LoginGate
  store/       zustand: offerStore, settingsStore, articlesStore, authStore
  teamleader/  OAuth, API, quote payload and the HTML product descriptions
  excel/       bestelbon generation (exceljs; templates in public/bestelformulieren)
  firebase/    app, offers, articles, settings
```

The layering matters: a form reads its own `useState`, calls a `calc*()` function, and renders the
`CalcResult`. Calculation code never touches React or Firebase, which is why it can be tested
directly. Keep it that way.

### Tabs and their calc modules

| Tab | Form | Calc |
|-----|------|------|
| Rolluik | `RolluikForm` | `calc/rolluik.ts` |
| Screen | `ScreenForm` | `calc/screen.ts` |
| Knikarmscherm | `KnikarmForm` | `calc/knikarm.ts` |
| Veranda/Pergola | `VerandaForm` | `calc/veranda.ts` |
| Glaswand | `GlaswandForm` | `calc/glaswand.ts` + `glaswandAdvies.ts` + `glaswandStaat.ts` |
| Overkappingen | `OverkappingForm` → Pinela or `EsOverkappingForm` | `calc/deponti.ts`, `calc/essystems.ts`, `calc/overkapping.ts` |
| Deponti | `DepontiForm` | `calc/deponti.ts` (Fiano Louvre + onderdelen) |
| Afstandsbediening | `BedieningForm` | `calc/afstandsbediening.ts` |

The Overkappingen tab carries two brands behind one merk selector. Both share
`GlaswandenEronder` + `berekenWanden`, so a wall calculated under an overkapping is the exact same
wall when you reopen it in the Glaswand tab.

## The pricing formula

One formula for every product, in `calc/shared.ts`:

```
productAankoop = productSubtotal × (1 − allroundKorting)
verkoop        = productAankoop ÷ (1 − bkfixMarge)
aankoop        = productAankoop + bedieningAankoop + vasteAankoop
uwVerkoop      = verkoop − eenmaligeKorting + plaatsing + bedieningVerkoop + vasteVerkoop
```

Per-supplier discounts: Allround 50% (40% on pergola/serre), ES Systems 40% on everything,
Deponti 0% (their dealer list *is* the purchase price). BKfix margin 20% by default.

Two amounts bypass the margin because they have an agreed customer price, installation included:
**bedieningen** (a Tahoma costs €260 and sells at €375) and **vaste regels** like steel-look
glasroeden (€48 purchase, €200 per glass panel to the customer). Those land in `aankoop` and
`uwVerkoop` separately — never in `productSubtotal`.

`PrijsRegel.netto` marks a line that is already a purchase price, so no supplier discount comes
off it again.

## Working agreements

- **Dutch** — code comments, commit messages, UI text, customer-facing text. This file is the
  exception because it was written in English.
- **Never guess a price.** Look it up in the list, the manual, a real order or a rekenblad. If a
  gap remains, say literally in the code that it is a derivation or a guess, what it rests on and
  how to confirm it. The `_`-prefixed keys in the JSON data are exactly for that.
- **Prices live in the JSON data, never in the logic.** Every block carries its source
  (`_bron`, `blz`).
- **Golden tests must keep passing.** They check real supplier orders and BKfix rekenbladen
  cell for cell; if one breaks, the change is wrong until proven otherwise.
- **Commit, push, merge and deploy only when asked** — permission counts once, per time.
- Every larger change gets an adversarial review and a test per confirmed finding.

## Data and storage

Firestore: `offers/*` (saved quotes, last 300), `articles/*` (article library),
`settings/global` and `settings/teamleader` (shared settings, synced live).
Teamleader OAuth tokens are kept in `localStorage` under `tl_*`.
Offer items are written with `JSON.parse(JSON.stringify(...))`, which drops `undefined` fields —
Firestore rejects those.
