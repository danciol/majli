import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole: string;
}

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: string; error?: string }) => void;
            error_callback?: (error: unknown) => void;
          }) => { requestAccessToken: (overrides?: { prompt?: string }) => void };
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Nie udało się załadować biblioteki Google'));
    document.head.appendChild(script);
  });
}

// --- Service Account JWT flow ---

let _saTokenCache: { token: string; expiresAt: number } | null = null;

async function getServiceAccount(): Promise<Record<string, string> | null> {
  const snap = await getDoc(doc(db, 'settings', 'global'));
  if (!snap.exists()) return null;
  const raw = snap.data().serviceAccountKey;
  if (!raw) return null;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { return null; }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function toBase64url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let str = '';
  bytes.forEach(b => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getServiceAccountToken(): Promise<string | null> {
  if (_saTokenCache && _saTokenCache.expiresAt > Date.now() + 60_000) return _saTokenCache.token;
  const sa = await getServiceAccount();
  if (!sa?.private_key || !sa?.client_email) return null;
  try {
    const enc = new TextEncoder();
    const now = Math.floor(Date.now() / 1000);
    const headerB64 = toBase64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
    const payloadB64 = toBase64url(enc.encode(JSON.stringify({
      iss: sa.client_email, scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
    })));
    const signingInput = `${headerB64}.${payloadB64}`;
    const key = await crypto.subtle.importKey(
      'pkcs8', pemToArrayBuffer(sa.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput));
    const jwt = `${signingInput}.${toBase64url(sig)}`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth2:grant-type:jwt-bearer', assertion: jwt }),
    });
    if (!res.ok) return null;
    const { access_token, expires_in } = await res.json();
    if (!access_token) return null;
    _saTokenCache = { token: access_token, expiresAt: Date.now() + (expires_in ?? 3600) * 1000 };
    return access_token;
  } catch { return null; }
}

// ---

async function getSalonToken(): Promise<string | null> {
  const saToken = await getServiceAccountToken();
  if (saToken) return saToken;
  // fallback: stored OAuth token
  const snap = await getDoc(doc(db, 'settings', 'global'));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.googleTokenExpiry && data.googleTokenExpiry < Date.now()) return null;
  return data.googleAccessToken || null;
}

async function getClientId(): Promise<string | null> {
  const snap = await getDoc(doc(db, 'settings', 'global'));
  return snap.exists() ? snap.data().googleClientId || null : null;
}

export async function silentRefreshSalonToken(): Promise<boolean> {
  const clientId = await getClientId();
  if (!clientId) return false;
  try {
    await loadGisScript();
  } catch { return false; }

  return new Promise((resolve) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar',
      callback: async (response) => {
        if (response.error || !response.access_token) { resolve(false); return; }
        const expiresIn = parseInt(response.expires_in || '3600');
        await setDoc(doc(db, 'settings', 'global'), {
          googleAccessToken: response.access_token,
          googleTokenExpiry: Date.now() + expiresIn * 1000,
          googleConnected: true,
        }, { merge: true });
        resolve(true);
      },
      error_callback: () => resolve(false),
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export async function authorizeSalonAccount(): Promise<boolean> {
  const clientId = await getClientId();
  if (!clientId) throw new Error('Brak Google Client ID w ustawieniach');

  await loadGisScript();

  return new Promise((resolve) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar',
      callback: async (response) => {
        if (response.error || !response.access_token) { resolve(false); return; }
        const expiresIn = parseInt(response.expires_in || '3600');
        await setDoc(doc(db, 'settings', 'global'), {
          googleAccessToken: response.access_token,
          googleTokenExpiry: Date.now() + expiresIn * 1000,
          googleConnected: true,
          googleConnectedAt: new Date().toISOString(),
        }, { merge: true });
        resolve(true);
      },
      error_callback: () => resolve(false),
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export async function disconnectSalonAccount(): Promise<void> {
  const snap = await getDoc(doc(db, 'settings', 'global'));
  if (snap.exists()) {
    const token = snap.data().googleAccessToken;
    if (token && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(token, () => {});
    }
  }
  await setDoc(doc(db, 'settings', 'global'), {
    googleAccessToken: null,
    googleTokenExpiry: 0,
    googleConnected: false,
  }, { merge: true });
}

export async function listCalendars(): Promise<GoogleCalendarListEntry[]> {
  const token = await getSalonToken();
  if (!token) return [];
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []).filter((c: GoogleCalendarListEntry) =>
    c.accessRole === 'owner' || c.accessRole === 'writer'
  );
}

export async function createCalendarEvent(calendarId: string, event: GoogleCalendarEvent): Promise<string | null> {
  const token = await getSalonToken();
  if (!token) return null;
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) return null;
  return (await res.json()).id || null;
}

export async function updateCalendarEvent(calendarId: string, eventId: string, event: GoogleCalendarEvent): Promise<boolean> {
  const token = await getSalonToken();
  if (!token) return false;
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  return res.ok;
}

export async function deleteCalendarEvent(calendarId: string, eventId: string): Promise<boolean> {
  const token = await getSalonToken();
  if (!token) return false;
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok || res.status === 404;
}

export function buildCalendarEvent(appointment: {
  date: string;
  duration: number;
  clientName: string;
  clientPhone?: string;
  serviceName?: string;
  notes?: string;
}): GoogleCalendarEvent {
  const start = new Date(appointment.date);
  const end = new Date(start.getTime() + appointment.duration * 60000);
  const descParts = [
    `Klient: ${appointment.clientName}`,
    appointment.clientPhone ? `Tel: ${appointment.clientPhone}` : '',
    appointment.serviceName ? `Zabieg: ${appointment.serviceName}` : '',
    `Czas trwania: ${appointment.duration} min`,
    appointment.notes ? `Uwagi: ${appointment.notes}` : '',
  ].filter(Boolean);
  return {
    summary: `${appointment.serviceName || 'Wizyta'} — ${appointment.clientName}`,
    description: descParts.join('\n'),
    start: { dateTime: start.toISOString(), timeZone: 'Europe/Warsaw' },
    end: { dateTime: end.toISOString(), timeZone: 'Europe/Warsaw' },
  };
}
