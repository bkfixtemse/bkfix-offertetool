import { describe, expect, it } from 'vitest';
import { buildQuotationPayload } from '../../teamleader/payload';
import { tlDescription } from '../../teamleader/descriptions';
import { calcRolluik } from '../rolluik';
import type { OfferItem } from '../types';

const M50 = { allroundKorting: 0.5, bkfixMarge: 0.2, eenmaligeKorting: 0 };
const mk = (over: Partial<Parameters<typeof calcRolluik>[0]> = {}): OfferItem => ({
  ...calcRolluik({
    type: 'Ecoroll_L', aantal: 1, breedte: 2000, hoogte: 1500, plaatsing: 'idd',
    geleider: '', kasttype: 'afgeschuind 45°', motor: '', mkabel: '', lamel: 'standaard',
    lamelKleur: '', koppelen: '', bereik: 'Goed', onderlat: 'Design onderlat',
    borenJa: false, zonnepaneelJa: false, kleur: { select: '', custom: '' }, kleurOmkasting: '',
    bediening: { bed1: '', bed2: '' }, opmerkingen: '', vrijeOpties: [], marges: M50, ...over,
  }),
  id: 'x1', kind: 'rolluik' as const, input: {},
});

describe('TL payload', () => {
  it('werkuren + verborgen kost onzichtbaar verdeeld — som klopt exact', () => {
    const items = [mk(), mk({ breedte: 2500 })];
    const p = buildQuotationPayload(items, 'deal', 'tax', '', 100, { tarief: 230, uren: 2, personen: 2 });
    const totaalLijnen = p.grouped_lines[0].line_items.reduce((s, l) => s + l.unit_price.amount * l.quantity, 0);
    const verwacht = items.reduce((s, i) => s + i.uwVerkoop, 0) + 100 + 230 * 2 * 2;
    expect(totaalLijnen).toBeCloseTo(verwacht, 1);
    expect(p.grouped_lines[0].line_items.some((l) => l.description.includes('Werkuren'))).toBe(false);
  });
  it('Amy-wandzender wordt aparte lijn, hoofdprijs verlaagd', () => {
    const it = mk({ bediening: { bed1: 'Amy 1 io', bed2: '' } });
    const p = buildQuotationPayload([it], 'deal', 'tax', '', 0, { tarief: 230, uren: 0, personen: 2 });
    const lines = p.grouped_lines[0].line_items;
    expect(lines).toHaveLength(2);
    expect(lines[1].description).toContain('Amy 1 io');
    expect(lines[0].unit_price.amount + lines[1].unit_price.amount).toBeCloseTo(it.uwVerkoop, 1);
  });
  it('aankoopprijs gaat mee als purchase_unit_price', () => {
    const it = mk();
    const p = buildQuotationPayload([it], 'deal', 'tax', '', 0, { tarief: 230, uren: 0, personen: 2 });
    expect(p.grouped_lines[0].line_items[0].purchase_unit_price?.amount).toBeCloseTo(it.aankoop, 1);
  });
  it('extended_description nooit leeg + bevat dagmaat', () => {
    const it = mk();
    const d = tlDescription(it);
    expect(d.length).toBeGreaterThan(50);
    expect(d).toContain('2000×1500mm');
    expect(d).toContain('IDD');
  });
});
