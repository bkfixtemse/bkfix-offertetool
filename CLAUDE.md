# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

BKfix Offertetool is a single-file PWA (`index.html`, ~2600 lines) for calculating and quoting roller shutters (rolluiken), screens, knikarmschermen and veranda/pergola installations. Deployed on GitHub Pages at `https://bkfixtemse.github.io/bkfix-offertetool/`.

## Deployment

```bash
git add index.html
git commit -m "..."
git push origin main   # GitHub Pages auto-deploys from main
```

## Local preview

```bash
npx serve -p 3456 .
# then open http://localhost:3456/index.html
```

`crypto.subtle` (used for login hashing) requires HTTPS or localhost — a local server is required, opening the file directly via `file://` will break login.

## Architecture

Everything lives in `index.html`. Script execution order matters:

1. **`const DATA = {...}`** — inline JSON price tables (~line 1). Keys follow the pattern `PREFIX_H_<height>` → `PREFIX_B_<width>`, e.g. `EL_H_1500` → `EL_B_2000`. Prefixes: `EL_` Ecoroll-L, `RL_` Rollex-L, `EM_` Ecoroll-M, `RM_` Rollex-M, `N83_`/`N120_`/`N150_` screens, `KA_` knikarm, `VP_` veranda.
2. **Utility functions** — `$()`, `fmt()`, `ceil()`, `el()`, `recalcCurrentProduct()` (~line 277)
3. **Calc functions** — `calcRolluik()`, `calcScreen()`, `calcKnikarm()`, `calcVeranda()` — read DOM inputs, compute prices, call `showResult(item)` and set `state.currentItem`
4. **Render functions** — `renderRolluik()`, `renderScreen()`, etc. — write innerHTML into the product panel; each ends with `applyFieldVis(prod)`
5. **Offer / TL / Tabs** — `addItemToOffer()`, `renderOffer()`, Teamleader OAuth + API (~line 1468), `activateTab()`
6. **⚠️ Init calls** (`renderRolluik(); renderOffer(); tlInit();`) — must stay **after** `const ADMIN`, `const CONFIG`, `const FIELD_VIS` are declared (currently ~line 1922). Moving them earlier causes a ReferenceError that breaks the entire script including login.
7. **Login IIFE** — SHA-256 hash check, sets `sessionStorage 'az_auth'`
8. **ADMIN / CONFIG / FIELD_VIS** — `const` declarations for localStorage-backed storage objects (~line 1866)
9. **Beheer render functions** — `renderBeheer()`, `renderVelden()`, `renderInstellingen()`, etc.

## Key patterns

**Price lookup** (rolluik example):
```js
const prefix = {Ecoroll_L:'EL_', ...}[type];
const heightKey = `${prefix}H_${hCeil}`;   // note: no underscore between prefix and H
const basePrice = DATA.rolluik.prices[type][heightKey][`${prefix}B_${bCeil}`];
```

**Bestelmaat (order dimensions)** — always round up to nearest 100mm via `ceil(n, 100)`. For all rolluiken: `bestB = effectiefB + 110` (geleiders), `bestH = effectiefH + kasthoogte` (Solar: fixed 180mm, others: `getKasthoogte(type, h)`). IDD placement does NOT change dimensions but makes `kastPrice = 0`.

**CONFIG / FIELD_VIS** — persist to localStorage. `CONFIG.data` merges defaults with saved overrides. `FIELD_VIS.data` controls which form groups are visible; `applyFieldVis(prod)` reads it and toggles `.vis-hidden` on `[data-vis-grp]` elements.

**`state.currentItem`** — set by each `calc*()` function; used by `addItemToOffer()`. Contains all computed prices plus `errors[]` and `warnings[]`.

**Pricing formula**:
```
aankoop = productSubtotal × (1 - marge)      // marge default 50%
verkoop = aankoop / (1 - bkfixMarge)         // bkfixMarge default 20%
uwVerkoop = verkoop - korting + plaatsingTotaal + bediening
```

## localStorage keys

| Key | Contents |
|-----|----------|
| `bkfix_articles` | Artikel bibliotheek (Beheer) |
| `bkfix_cust_prods` | Custom product tabs |
| `bkfix_tl_tmpl` | Teamleader offerte templates |
| `bkfix_settings` | App settings |
| `bkfix_config` | CONFIG overrides (rekenparameters) |
| `bkfix_field_vis` | FIELD_VIS overrides (veld zichtbaarheid) |
| `tl_*` | Teamleader OAuth tokens and state |
