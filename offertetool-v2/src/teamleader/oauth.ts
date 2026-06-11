/** Teamleader OAuth — token-uitwisseling via bestaande Cloudflare Worker. */
const TL_AUTH_URL = 'https://focus.teamleader.eu/oauth2/authorize';
const TOKEN_URL = 'https://offertetool.bkfixtemse.workers.dev/';

const LS = {
  access: 'tl_access_token', refresh: 'tl_refresh_token', expiry: 'tl_token_expiry',
  clientId: 'tl_client_id', clientSecret: 'tl_client_secret',
};

export const tlIsConnected = () => !!localStorage.getItem(LS.access);
export const tlClientId = () => localStorage.getItem(LS.clientId) ?? '';

export function tlStartAuth(clientId: string, clientSecret: string) {
  localStorage.setItem(LS.clientId, clientId);
  localStorage.setItem(LS.clientSecret, clientSecret);
  const redirect = window.location.origin + window.location.pathname;
  window.location.href = `${TL_AUTH_URL}?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirect)}`;
}

function storeTokens(d: { access_token: string; refresh_token?: string; expires_in?: number }) {
  localStorage.setItem(LS.access, d.access_token);
  if (d.refresh_token) localStorage.setItem(LS.refresh, d.refresh_token);
  if (d.expires_in) localStorage.setItem(LS.expiry, String(Date.now() + d.expires_in * 1000));
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(data.error_description ?? 'Token-uitwisseling mislukt');
  storeTokens(data);
}

/** Verwerk ?code= na redirect. Retourneert true als er een code verwerkt werd. */
export async function tlHandleCallback(): Promise<boolean> {
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) return false;
  await tokenRequest({
    grant_type: 'authorization_code',
    code,
    client_id: tlClientId(),
    client_secret: localStorage.getItem(LS.clientSecret) ?? '',
    redirect_uri: window.location.origin + window.location.pathname,
  });
  window.history.replaceState({}, '', window.location.pathname);
  return true;
}

export async function tlRefreshToken() {
  const refresh = localStorage.getItem(LS.refresh);
  if (!refresh) throw new Error('Geen refresh token — maak opnieuw verbinding');
  await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refresh,
    client_id: tlClientId(),
    client_secret: localStorage.getItem(LS.clientSecret) ?? '',
  });
}

export function tlDisconnect() {
  [LS.access, LS.refresh, LS.expiry].forEach((k) => localStorage.removeItem(k));
}

export async function tlAccessToken(): Promise<string> {
  const expiry = parseInt(localStorage.getItem(LS.expiry) ?? '0');
  if (expiry && Date.now() > expiry - 60_000) await tlRefreshToken();
  const t = localStorage.getItem(LS.access);
  if (!t) throw new Error('Niet verbonden met Teamleader');
  return t;
}
