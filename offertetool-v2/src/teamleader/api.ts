import { tlAccessToken, tlDisconnect, tlRefreshToken } from './oauth';

const TL_BASE = 'https://api.focus.teamleader.eu';

export async function tlCall<T = any>(endpoint: string, body: object = {}, retried = false): Promise<T> {
  const token = await tlAccessToken();
  const res = await fetch(`${TL_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401 && !retried) {
    try { await tlRefreshToken(); return tlCall(endpoint, body, true); }
    catch { tlDisconnect(); throw new Error('Sessie verlopen. Maak opnieuw verbinding met Teamleader.'); }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.errors?.[0]?.title ?? data.errors?.[0]?.detail ?? JSON.stringify(data);
    throw new Error(`Teamleader API (${res.status}): ${msg}`);
  }
  return data;
}

export interface TlDeal { id: string; title: string }
export async function searchDeals(term: string): Promise<TlDeal[]> {
  const d = await tlCall('deals.list', { filter: { term }, page: { size: 15 } });
  return (d.data ?? []).map((x: any) => ({ id: x.id, title: x.title }));
}

export interface TlTaxRate { id: string; description: string; rate: number }
export async function listTaxRates(): Promise<TlTaxRate[]> {
  const d = await tlCall('taxRates.list', {});
  return (d.data ?? []).map((x: any) => ({ id: x.id, description: x.description, rate: x.rate }));
}
