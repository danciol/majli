import { Appointment, Service } from '@/data/services';
import { v4Fallback } from './icsUtils';

function parseICSDate(value: string): Date | null {
  const clean = value.replace(/[^0-9T]/g, '').replace('T', '');
  if (clean.length < 8) return null;
  const y = parseInt(clean.slice(0, 4));
  const m = parseInt(clean.slice(4, 6)) - 1;
  const d = parseInt(clean.slice(6, 8));
  const h = clean.length >= 10 ? parseInt(clean.slice(8, 10)) : 0;
  const min = clean.length >= 12 ? parseInt(clean.slice(10, 12)) : 0;
  const s = clean.length >= 14 ? parseInt(clean.slice(12, 14)) : 0;
  if (value.endsWith('Z')) return new Date(Date.UTC(y, m, d, h, min, s));
  return new Date(y, m, d, h, min, s);
}

function unfoldLines(text: string): string {
  return text.replace(/\r?\n[ \t]/g, '');
}

/** Try to extract phone number, service name, and client name from a SUMMARY string */
export function parseSummary(
  summary: string,
  knownServices: Service[]
): { clientName: string; clientPhone: string; serviceName: string; serviceId: string } {
  let text = summary.trim();
  let clientPhone = '';
  let serviceName = '';
  let serviceId = '';

  // Extract phone number (9+ digits, optionally with +, spaces, dashes)
  const phoneRegex = /(\+?\d[\d\s\-]{7,}\d)/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    clientPhone = phoneMatch[1].replace(/[\s\-]/g, '');
    text = text.replace(phoneMatch[0], '').trim();
  }

  // Try to match a known service name (longest match first)
  const sortedServices = [...knownServices].sort((a, b) => b.name.length - a.name.length);
  for (const svc of sortedServices) {
    const idx = text.toLowerCase().indexOf(svc.name.toLowerCase());
    if (idx !== -1) {
      serviceName = svc.name;
      serviceId = svc.id;
      text = (text.slice(0, idx) + text.slice(idx + svc.name.length)).trim();
      break;
    }
  }

  // Clean up remaining text as client name
  const clientName = text.replace(/\s+/g, ' ').replace(/^[\s,\-·]+|[\s,\-·]+$/g, '').trim() || 'Klient';

  return { clientName, clientPhone, serviceName, serviceId };
}

export function parseICSFile(icsContent: string, knownServices: Service[] = [], employeeId = ''): Partial<Appointment>[] {
  const unfolded = unfoldLines(icsContent);
  const lines = unfolded.split(/\r?\n/);
  const events: Partial<Appointment>[] = [];

  let inEvent = false;
  let current: Record<string, string> = {};

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
    } else if (line === 'END:VEVENT' && inEvent) {
      inEvent = false;
      const dtStart = current['DTSTART'] || current['DTSTART;VALUE=DATE'];
      const dtEnd = current['DTEND'] || current['DTEND;VALUE=DATE'];

      if (dtStart) {
        const startDate = parseICSDate(dtStart);
        const endDate = dtEnd ? parseICSDate(dtEnd) : null;

        if (startDate) {
          const duration = endDate
            ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
            : 60;

          const rawSummary = current['SUMMARY'] || '';
          const parsed = parseSummary(rawSummary, knownServices);

          events.push({
            id: v4Fallback(),
            clientName: parsed.clientName,
            clientPhone: parsed.clientPhone,
            clientEmail: current['ORGANIZER']?.replace('mailto:', '') || '',
            date: startDate.toISOString(),
            duration: Math.max(duration, 15),
            status: 'confirmed',
            notes: [
              current['DESCRIPTION'],
              current['LOCATION'] ? `Lokalizacja: ${current['LOCATION']}` : '',
              parsed.serviceName && !parsed.serviceId ? `Usługa: ${parsed.serviceName}` : '',
            ].filter(Boolean).join('\n') || undefined,
            googleCalendarEventId: current['UID'] || undefined,
            serviceId: parsed.serviceId,
            employeeId,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } else if (inEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx);
        const value = line.slice(colonIdx + 1);
        const baseKey = key.split(';')[0];
        current[key] = value;
        if (key !== baseKey) current[baseKey] = value;
      }
    }
  }

  return events;
}
