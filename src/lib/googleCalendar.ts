import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

async function getEmployeeToken(employeeId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'employee_google_tokens', employeeId));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.expiresAt && data.expiresAt < Date.now()) {
    const refreshed = await refreshToken(data.refreshToken, data.clientId);
    if (refreshed) {
      await setDoc(doc(db, 'employee_google_tokens', employeeId), {
        ...data,
        accessToken: refreshed.access_token,
        expiresAt: Date.now() + refreshed.expires_in * 1000,
      }, { merge: true });
      return refreshed.access_token;
    }
    return null;
  }
  return data.accessToken || null;
}

async function refreshToken(refreshToken: string, clientId: string) {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getClientId(): Promise<string | null> {
  const snap = await getDoc(doc(db, 'settings', 'global'));
  return snap.exists() ? snap.data().googleClientId || null : null;
}

export async function authorizeGoogleCalendar(employeeId: string): Promise<boolean> {
  const clientId = await getClientId();
  if (!clientId) throw new Error('Brak Google Client ID w ustawieniach');

  return new Promise((resolve) => {
    const redirectUri = window.location.origin;
    const scope = 'https://www.googleapis.com/auth/calendar.events';

    const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${encodeURIComponent(employeeId)}&` +
      `include_granted_scopes=true`;

    const popup = window.open(url, 'google-auth', 'width=500,height=600,left=200,top=100');

    const interval = setInterval(async () => {
      try {
        if (popup?.closed) { clearInterval(interval); resolve(false); return; }
        const hash = popup?.location?.hash;
        if (hash && hash.includes('access_token')) {
          clearInterval(interval);
          popup?.close();
          const params = new URLSearchParams(hash.slice(1));
          const accessToken = params.get('access_token');
          const expiresIn = parseInt(params.get('expires_in') || '3600');
          if (accessToken) {
            await setDoc(doc(db, 'employee_google_tokens', employeeId), {
              accessToken,
              expiresAt: Date.now() + expiresIn * 1000,
              clientId,
              connectedAt: new Date().toISOString(),
            }, { merge: true });
            await setDoc(doc(db, 'employees', employeeId), {
              googleCalendarConnected: true,
            }, { merge: true });
            resolve(true);
          } else { resolve(false); }
        }
      } catch { /* popup jeszcze ładuje */ }
    }, 500);
  });
}

export async function disconnectGoogleCalendar(employeeId: string): Promise<void> {
  await setDoc(doc(db, 'employee_google_tokens', employeeId), {
    accessToken: null, expiresAt: 0,
  }, { merge: true });
  await setDoc(doc(db, 'employees', employeeId), {
    googleCalendarConnected: false,
  }, { merge: true });
}

export async function createCalendarEvent(
  employeeId: string,
  event: GoogleCalendarEvent
): Promise<string | null> {
  const token = await getEmployeeToken(employeeId);
  if (!token) return null;
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.id || null;
}

export async function updateCalendarEvent(
  employeeId: string,
  eventId: string,
  event: GoogleCalendarEvent
): Promise<boolean> {
  const token = await getEmployeeToken(employeeId);
  if (!token) return false;
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }
  );
  return res.ok;
}

export async function deleteCalendarEvent(
  employeeId: string,
  eventId: string
): Promise<boolean> {
  const token = await getEmployeeToken(employeeId);
  if (!token) return false;
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  );
  return res.ok || res.status === 404;
}

export function buildCalendarEvent(appointment: {
  date: string;
  duration: number;
  clientName: string;
  serviceName?: string;
}): GoogleCalendarEvent {
  const start = new Date(appointment.date);
  const end = new Date(start.getTime() + appointment.duration * 60000);
  return {
    summary: `${appointment.serviceName || 'Wizyta'} — ${appointment.clientName}`,
    description: [
      `Klient: ${appointment.clientName}`,
      appointment.serviceName ? `Zabieg: ${appointment.serviceName}` : '',
      `Czas trwania: ${appointment.duration} min`,
    ].filter(Boolean).join('\n'),
    start: { dateTime: start.toISOString(), timeZone: 'Europe/Warsaw' },
    end: { dateTime: end.toISOString(), timeZone: 'Europe/Warsaw' },
  };
}
